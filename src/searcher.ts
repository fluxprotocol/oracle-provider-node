import AppConfig from "./models/AppConfig";
import { OracleRequest } from "./models/OracleRequest";
import database from "./services/DatabaseService";
import logger from "./services/LoggerService";
import NetworkQueue from "./services/NetworkQueue";

function findQueueForRequest(request: OracleRequest, queues: NetworkQueue[]) {
    return queues.find((queue) => {
        if (request.toNetwork.type !== queue.provider.networkConfig.type) {
            return false;
        }

        if (request.toNetwork.bridgeChainId !== queue.provider.networkConfig.bridgeChainId) {
            return false;
        }

        return true;
    });
}

function findOriginQueueForRequest(request: OracleRequest, queues: NetworkQueue[]) {
    return queues.find((queue) => {
        if (request.block.network.type !== queue.provider.networkConfig.type) {
            return false;
        }

        if (request.block.network.bridgeChainId !== queue.provider.networkConfig.bridgeChainId) {
            return false;
        }

        return true;
    });
}

export async function searchRequests(appConfig: AppConfig, queues: NetworkQueue[]) {
    async function onRequest(request: OracleRequest) {
        const destinationQueue = findQueueForRequest(request, queues);
        const originQueue = findOriginQueueForRequest(request, queues);

        if (!destinationQueue) {
            logger.error(`[${request.block.network.type}-${request.block.network.bridgeChainId}] Could not find network ${request.toNetwork.type} with chain id ${request.toNetwork.bridgeChainId}`);
            return;
        }

        if (!originQueue) {
            logger.error(`[${request.block.network.type}-${request.block.network.bridgeChainId}] Could not find network ${request.block.network.type} with chain id ${request.block.network.bridgeChainId}`);
            return;
        }

        const requestBlock = await originQueue.provider.getBlockByTag(request.block.number);

        if (requestBlock?.hash !== request.block.hash) {
            logger.error(`[${request.block.network.type}-${request.block.network.bridgeChainId}] Will not submit block since there was a fork`);
            return;
        }

        destinationQueue.add(request);
    }

    appConfig.requestListeners?.map((listenerConfig) => {
        const fromQueue = queues.find(queue => queue.id === listenerConfig.networkId);
        if (!fromQueue) {
            throw new Error(`Could not find provider for ${listenerConfig.networkId}`);
        }

        fromQueue.provider.onRequests(onRequest);
        return fromQueue.provider.startFetching(listenerConfig.contractAddress, listenerConfig.interval);
    });
}
