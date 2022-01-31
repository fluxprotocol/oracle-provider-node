import { Batch, Network, Request } from "../models/AppConfig";
import { Block } from "../models/Block";
import { OracleRequest } from "../models/OracleRequest";
import { ResolveRequest } from "../models/ResolveRequest";
import NetworkQueue from "../services/NetworkQueue";
export default class IProvider {
    static type = "iprovider";
    networkId: string;

    constructor(public networkConfig: Network) {
        this.networkId = networkConfig.networkId ?? 'iprovider';
    }

    init(queues: NetworkQueue[]): Promise<void> { return Promise.resolve() };
    onRequests(callback: (request: OracleRequest) => any) { throw new Error('Not Implemented') }
    startFetching(oracleContract: string, interval: number): Promise<void> { throw new Error('Not implemented') }
    getBlockByTag(tag: string | number): Promise<Block | null> { throw new Error('Not implemented') }

    resolveRequest(oracleContractAddress: string, request: OracleRequest): Promise<string | null> { throw new Error('Not implemented') }
    resolvePair(pair: Request): Promise<string | null> { throw new Error('Not implemented'); }
    resolveBatch(batch: Batch): Promise<string | null> { throw new Error('Batching is not supported by this provider'); }
}
