import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/abstract-provider';
import { WebSocketProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { Signer, utils } from 'ethers';
import Big from 'big.js';
import { createPairId, Request } from '../../models/AppConfig';
import { BridgeChainId } from '../../models/BridgeChainId';
import { OracleRequest } from '../../models/OracleRequest';
import PairInfo from '../../models/PairInfo';
import logger from '../../services/LoggerService';
import { EvmConfig } from './EvmConfig';
import { getBlockByNumber, getLatestBlock } from './EvmRpcService';
import fluxAbi from './FluxPriceFeed.json';
import layerZeroAbi from './FluxLayerZeroOracle.json';
import { sleep } from '../../services/TimerUtils';
import web3 from 'web3';

export interface EvmPairInfo extends PairInfo {
    contract: Contract;
}

export async function createPriceFeedContract(pair: Request, wallet: Wallet): Promise<EvmPairInfo> {
    const contract = new Contract(pair.contractAddress, fluxAbi.abi, wallet.provider);
    const decimals = await contract.decimals();

    logger.info(`[${createPairId(pair)}] - Using decimals: ${decimals}`);

    return {
        ...pair,
        contract: contract.connect(wallet),
        decimals,
    };
}

export function createOracleContract(oracleContract: string, wallet: Signer | Provider) {
    return new Contract(oracleContract, layerZeroAbi, wallet);
}

interface ContractRequest {
    chainId: number;
    layerZeroContract: string;
    confirmations: string;
    requestedAtBlock: string;
}

export async function fetchOracleRequests(oracleContract: string, evmConfig: EvmConfig, wallet: Wallet): Promise<OracleRequest[]> {
    try {
        // Do some fetching
        const contract = createOracleContract(oracleContract, wallet);
        const requests: ContractRequest[] = await contract.requests();

        // TODO: This should ofcourse be the block from the request itself.
        const block = await getLatestBlock(evmConfig);

        if (!block) {
            throw new Error('Could not find block');
        }

        return [
            {
                requestId: new Big(1),
                confirmationsRequired: new Big(10),
                confirmations: new Big(0),
                args: [],
                toNetwork: {
                    bridgeChainId: BridgeChainId.AuroraMainnet,
                    type: 'evm',
                },
                block,
                toContractAddress: '0x00000',
                fromOracleAddress: '0x00000',
                type: 'request',
            }
        ];
    } catch (error) {
        logger.error(`[fetchOracleRequests] ${oracleContract} ${error}`);
        return [];
    }
}

export async function listenForEvents(config: EvmConfig, address: string, onRequests: (requests: OracleRequest[]) => void) {
    try {
        if (!config.wssRpc) {
            throw new Error(`Config option wssRpc is required`);
        }

        const provider = new WebSocketProvider(config.wssRpc, {
            chainId: config.chainId,
            name: config.chainId.toString(),

        });

        const wallet = new Wallet(config.privateKey, provider);

        const layerZeroInterface = new utils.Interface(layerZeroAbi);
        const oracleContract = createOracleContract(address, provider);

        const topic = layerZeroInterface.getEventTopic('NotifyOracleOfBlock');

        const wssProvider = new web3.providers.WebsocketProvider(config.wssRpc);
        const w3 = new web3(wssProvider);

        // @ts-ignore
        const cont = new w3.eth.Contract(layerZeroAbi, address);

        cont.events.NotifyOracleOfBlock().on('data', async (event: any) => {
            const requestsPromises: Promise<OracleRequest | null>[] = [event].map(async (tx) => {
                const blockNum = parseInt(tx.blockNumber);
                await sleep(2000);
                const block = await getBlockByNumber(tx.blockHash, config, 'blockHash');

                if (tx.event !== 'NotifyOracleOfBlock') {
                    return null;
                }

                if (!block) {
                    logger.error(`[listenForEvent] Could not find block ${blockNum} for chainId: ${config.chainId}`);
                    return null;
                }

                const request: OracleRequest = {
                    requestId: new Big(0),
                    block,
                    args: [],
                    confirmationsRequired: new Big(tx.returnValues.requiredBlockConfirmations),
                    confirmations: new Big(0),
                    fromOracleAddress: address,
                    toContractAddress: tx.returnValues.layerZeroContract,
                    toNetwork: {
                        type: 'evm',
                        bridgeChainId: Number(tx.returnValues.chainId),
                    },
                    type: 'request',
                };

                return request;
            });

            const requests = await Promise.all(requestsPromises);
            onRequests(requests.filter(r => r !== null) as OracleRequest[]);
        });
        // console.log('[] topic -> ', topic);
        // oracleContract.on({
        //     address: address,
        //     topics: [topic],
        // }, (params) => {
        //     console.log('[HEYOOOO] params -> ', params);
        // })

        // await provider._subscribe('logs', ['logs', {
        //     address,
        // }], async (transactions: any[]) => {
        //     const requestsPromises: Promise<OracleRequest | null>[] = transactions.map(async (tx) => {
        //         const log = layerZeroInterface.parseLog(tx);
        //         const blockNum = parseInt(tx.blockNumber);
        //         await sleep(2000);
        //         const block = await getBlockByNumber(tx.blockHash, config, 'blockHash');

        //         console.log('[] log -> ', log);

        //         if (log.name !== 'NotifyOracleOfBlock') {
        //             return null;
        //         }

        //         if (!block) {
        //             logger.error(`[listenForEvent] Could not find block ${blockNum} for chainId: ${config.chainId}`);
        //             return null;
        //         }

        //         const request: OracleRequest = {
        //             requestId: new Big(0),
        //             block,
        //             args: [],
        //             confirmationsRequired: new Big(log.args.requiredBlockConfirmations.toString()),
        //             confirmations: new Big(0),
        //             fromOracleAddress: address,
        //             toContractAddress: log.args.layerZeroContract,
        //             toNetwork: {
        //                 type: 'evm',
        //                 bridgeChainId: log.args.chainId,
        //             },
        //             type: 'request',
        //         };

        //         return request;
        //     });

        //     const requests = await Promise.all(requestsPromises);
        //     onRequests(requests.filter(r => r !== null) as OracleRequest[]);
        // });
    } catch (error) {
        logger.error(`[listenForEvents] ${error}`);
    }
}
