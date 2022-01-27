import AppConfig from "./models/AppConfig";
import { createOracleRequestId, createRequestWavepointInDatabase, findRequestWavepointInDatabase, OracleRequest } from "./models/OracleRequest";
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

export async function searchRequests(appConfig: AppConfig, queues: NetworkQueue[]) {
    // Since this is just a POC we are going to attach the database here..
    // We will rewrite the FPO soon...

    const oracleAddresses: string[] = [];

    appConfig.networks?.forEach((network) => {
        oracleAddresses.push(database.createOracleTableName(network.bridgeChainId, network.oracleContractAddress));
    });

    await database.startDatabase('./', 'fpo_db', oracleAddresses);

    async function onRequest(request: OracleRequest) {
        const queue = findQueueForRequest(request, queues);
        if (!queue) {
            logger.error(`[${request.block.network.type}-${request.block.network.bridgeChainId}] Could not find network ${request.toNetwork.type} with chain id ${request.toNetwork.bridgeChainId}`);
            return;
        }

        const wavePoint = await findRequestWavepointInDatabase(request);

        if (wavePoint) {
            // We already synced this block. No need to do any actions
            if (wavePoint.block === request.block.number) {
                return;
            }

            if (wavePoint.completed) {
                return;
            }
        }

        await createRequestWavepointInDatabase(request, false);
        queue.add(request);
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
