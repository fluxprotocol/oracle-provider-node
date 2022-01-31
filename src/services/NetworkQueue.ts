import Big from "big.js";
import { Batch, createPairId, isOracleRequest, isResolve } from "../models/AppConfig";
import { createRequestWavepointInDatabase, OracleRequest } from "../models/OracleRequest";
import { ResolveRequest } from "../models/ResolveRequest";
import IProvider from "../providers/IProvider";
import logger from './LoggerService';


export default class NetworkQueue {
    queue: (Batch | OracleRequest | ResolveRequest)[] = [];
    processingIds: Set<string> = new Set();
    intervalId?: NodeJS.Timer;
    public id: string;
    networkQueues: NetworkQueue[] = [];

    constructor(public provider: IProvider) {
        this.id = provider.networkId;
    }

    setNetworkQueues(networkQueues: NetworkQueue[]) {
        this.networkQueues = networkQueues;
    }

    has(item: Batch | OracleRequest | ResolveRequest): boolean {
        const id = createPairId(item);
        const inQueue = this.queue.some(x => createPairId(x) === id);

        if (inQueue) return true;

        return this.processingIds.has(id);
    }

    add(item: Batch | OracleRequest | ResolveRequest) {
        if (this.has(item)) return;
        this.queue.push(item);
        logger.debug(`[${this.id}] Added "${createPairId(item)}" to queue`);
    }

    start() {
        this.intervalId = setInterval(async () => {
            // We are processing something
            // We need to wait for the transaction to complete, otherwise
            // we could run into nonce issues.
            if (this.processingIds.size > 0) return;

            const pair = this.queue.shift();
            if (!pair) return;

            const id = createPairId(pair)
            this.processingIds.add(id);

            logger.debug(`[${this.id}] Processing ${id}`);

            let answer: string | null = null;

            if (isOracleRequest(pair)) {
                answer = await this.provider.resolveRequest(this.provider.networkConfig.oracleContractAddress, pair);
                // Finding the origin queue to send back a request to mark the request as done
                // const originQueue = this.networkQueues.find(q => q.provider.networkConfig.type === pair.block.network.type && q.provider.networkConfig.bridgeChainId === pair.block.network.bridgeChainId);

                // const resolveRequest: ResolveRequest = {
                //     requestId: pair.requestId,
                //     type: 'resolve',
                // };

                // originQueue?.add(resolveRequest);
            } else if (isResolve(pair)) {
                // Just sending a resolve mark back to
                // await this.provider.markAsResolved(this.provider.networkConfig.oracleContractAddress, pair);
            } else {
                answer = await this.provider.resolveBatch(pair);
            }

            logger.debug(`[${this.id}] Completed processing "${id}" with answer ${answer}`);
            this.processingIds.delete(id);
        }, 100);
    }

    stop() {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = undefined;
    }
}
