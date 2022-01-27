import { createPairId } from "../models/AppConfig";
import { Block } from "../models/Block";
import { OracleRequest } from "../models/OracleRequest";
import logger from "./LoggerService";

type Callback = (request: OracleRequest) => any;

export default class RequestConfirmationsDelayer {
    requests: Map<string, OracleRequest> = new Map();
    currentBlock?: Block;
    callback: Callback = () => {};

    setBlock(block: Block) {
        this.currentBlock = block;

        this.requests.forEach((request) => {
            const confirmations = block.number - request.block.number;

            logger.debug(`[${request.block.network.type}-${request.block.network.bridgeChainId}] Request confirmed ${confirmations}/${request.confirmationsRequired}`);

            if (confirmations >= request.confirmationsRequired) {
                this.requests.delete(createPairId(request));
                request.confirmations = confirmations;
                this.callback(request);
            }
        });
    }

    addRequest(request: OracleRequest) {
        this.requests.set(createPairId(request), request);
    }

    onRequestReady(callback: Callback) {
        this.callback = callback;
    }
}
