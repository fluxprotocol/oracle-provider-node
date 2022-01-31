import Big from "big.js";
import database from "../services/DatabaseService";
import { Block } from "./Block";
import { BridgeChainId } from "./BridgeChainId";

export interface OracleRequest {
    requestId: Big;
    toNetwork: {
        bridgeChainId: BridgeChainId;
        type: "evm" | "near";
    };
    fromOracleAddress: string;
    toContractAddress: string;
    confirmationsRequired: Big;
    confirmations: Big;
    /** The block the request is from */
    block: Block;
    args: string[];
    type: "request"
}

export interface OracleRequestWavepoint {
    block: number;
    completed: boolean;
}

export async function findRequestWavepointInDatabase(request: OracleRequest) {
    const tableName = database.createOracleTableName(request.block.network.bridgeChainId, request.fromOracleAddress);
    const id = createOracleRequestId(request);

    const doc = await database.findDocumentById<OracleRequestWavepoint>(tableName, id);

    return doc;
}

export async function createRequestWavepointInDatabase(request: OracleRequest, completed: boolean) {
    const tableName = database.createOracleTableName(request.block.network.bridgeChainId, request.fromOracleAddress);
    const id = createOracleRequestId(request);

    await database.createOrUpdateDocument(tableName, id, {
        block: request.block.number,
        completed,
    } as OracleRequestWavepoint);
}

export function createOracleRequestId(request: OracleRequest) {
    return `${request.requestId.toString()}_${request.fromOracleAddress}_${request.block.network.bridgeChainId}_${request.toNetwork.bridgeChainId}`;
}
