import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Batch, Network, Request } from "../../models/AppConfig";
import IProvider from "../IProvider";
import { EvmConfig, parseEvmConfig, validateEvmConfig } from "./EvmConfig";
import { EvmPairInfo, createPriceFeedContract, fetchOracleRequests, createOracleContract, listenForEvents } from "./EvmContract";
import logger from '../../services/LoggerService';
import { resolveSources } from '../../vm';
import { getBlockByNumber, getLatestBlock } from "./EvmRpcService";
import { debouncedInterval } from "../../services/TimerUtils";
import NetworkQueue from "../../services/NetworkQueue";
import { Block } from "../../models/Block";
import RequestConfirmationsDelayer from "../../services/RequestConfirmationsDelayer";
import { ResolveRequest } from "../../models/ResolveRequest";
import { OracleRequest } from "../../models/OracleRequest";


class EvmProvider extends IProvider {
    static type = 'evm';

    currentBlock: Block | null = null;
    wallet: Wallet;
    config: EvmConfig;
    pairInfo: Map<string, EvmPairInfo> = new Map();
    queues: NetworkQueue[] = [];
    delayer: RequestConfirmationsDelayer = new RequestConfirmationsDelayer();

    constructor(networkConfig: Network) {
        super(networkConfig);
        validateEvmConfig(networkConfig, process.env);

        this.config = parseEvmConfig(networkConfig, process.env);
        this.wallet = new Wallet(this.config.privateKey, new JsonRpcProvider(this.config.rpc));
        logger.info(`[${networkConfig.networkId}] Using address: ${this.wallet.address}`);
    }

    async init(queues: NetworkQueue[]) {
        this.queues = queues;
        // Used for checking how many confirmations a certain request has
        debouncedInterval(async () => {
            this.currentBlock = await getLatestBlock(this.config);

            logger.debug(`[${this.networkConfig.type}-${this.networkConfig.chainId}] Fetched block #${this.currentBlock?.number}`);

            if (this.currentBlock) {
                this.delayer.setBlock(this.currentBlock);
            }
        }, this.config.blockPollingInterval);
    }

    onRequests(callback: (requests: OracleRequest) => any): void {
        this.delayer.onRequestReady(callback);
    }

    async startFetching(oracleContract: string): Promise<void> {
        if (!this.config.wssRpc) {
            return;
        }

        listenForEvents(this.config, oracleContract, (requests) => {
            requests.forEach(r => this.delayer.addRequest(r));
        });
    }

    async getBlockByTag(tag: string | number): Promise<Block | null> {
        return getBlockByNumber(tag, this.config);
    }

    async resolvePair(pair: Request): Promise<string | null> {
        try {
            let pairInfo = this.pairInfo.get(pair.contractAddress);

            if (!pairInfo) {
                pairInfo = await createPriceFeedContract(pair, this.wallet);
                this.pairInfo.set(pair.contractAddress, pairInfo);
            }

            const answer = await resolveSources(pairInfo);
            if (!answer) return null;

            await pairInfo.contract.transmit(answer);

            return answer;
        } catch (error: any) {
            logger.error(`[${pair.networkId}] Could not resolve ${pair.pair} - ${error.toString()}`);
            return null;
        }
    }

    async resolveRequest(oracleContractAddress: string, request: OracleRequest): Promise<string | null> {
        const contract = createOracleContract(oracleContractAddress, this.wallet);

        const dstNetworkAddress = request.toContractAddress;
        const srcChainId = request.block.network.bridgeChainId;
        const blockHash = request.block.hash;
        const confirmations = request.confirmations.toString();
        const receiptRoot = request.block.receiptsRoot;

        await contract.proceedUpdateBlockHeader(dstNetworkAddress, srcChainId, blockHash, confirmations, receiptRoot);

        return `b${blockHash}-r${receiptRoot}`;
    }

    async resolveBatch(batch: Batch): Promise<string | null> {
        let result: (string|null)[] = [];

        for await (const pair of batch.pairs) {
            result.push(await this.resolvePair(pair));
        }

        return result.join(',');
    }
}

export default EvmProvider;
