import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import Big from 'big.js';
import { createPairId, Request } from '../../models/AppConfig';
import { BridgeChainId } from '../../models/BridgeChainId';
import { OracleRequest } from '../../models/OracleRequest';
import PairInfo from '../../models/PairInfo';
import logger from '../../services/LoggerService';
import { EvmConfig } from './EvmConfig';
import { getLatestBlock } from './EvmRpcService';
import fluxAbi from './FluxPriceFeed.json';

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

export function createOracleContract(oracleContract: string, wallet: Wallet) {
    return new Contract(oracleContract, [], wallet.provider);
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
                confirmationsRequired: 10,
                confirmations: 0,
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
