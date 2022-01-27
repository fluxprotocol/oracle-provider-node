import { BridgeChainId } from "./BridgeChainId";
import { OracleRequest } from "./OracleRequest";
import { ResolveRequest } from "./ResolveRequest";
import { SourceInfo } from "./SourceInfo";


export interface PushRequest {
    description: string;
    pair: string;
    contractAddress: string;
    sources: SourceInfo[];
    interval: number;
    networkId: string;
    defaultDecimals?: number;
    type: "push";
}

export type Request = PushRequest;

export interface Batch {
    pairs: Request[];
    contractAddress: string;
    description: string;
    interval: number;
    networkId: string;
}

export interface OracleAddress {
    contractAddress: string;
    type: 'layerzero';
}

export interface BlockBridigingNetwork {
    bridgeChainId: BridgeChainId;
    oracleContractAddress: string;
}


export interface EvmNetwork extends BlockBridigingNetwork {
    type: "evm";
    networkId?: string;
    privateKeyEnvKey?: string;
    chainId?: number;
    rpc?: string;
    blockPollingInterval?: number;
}

export interface NearNetwork extends BlockBridigingNetwork {
    type: "near";
    networkId?: string;
    credentialsStorePathEnvKey?: string;
    privateKeyEnvKey?: string;
    networkType?: string;
    rpc?: string;
    chainId?: number;
    accountId?: string;
    maxGas?: string;
    storageDeposit?: string;
}


export type Network = EvmNetwork | NearNetwork;

export interface RequestListenerConfig {
    contractAddress: string;
    networkId: string;
    interval: number;
}

export default interface AppConfig {
    pairs?: Request[];
    batches?: Batch[];
    networks?: Network[];
    requestListeners?: RequestListenerConfig[];
}

export function isOracleRequest(item: Request | Batch | OracleRequest | ResolveRequest): item is OracleRequest {
    if (isBatch(item)) {
        return false;
    }

    return item.type === 'request';
}

export function isBatch(pair: Request | Batch | OracleRequest | ResolveRequest): pair is Batch {
    return pair.hasOwnProperty('pairs');
}

export function isResolve(item: Request | Batch | OracleRequest | ResolveRequest): item is ResolveRequest {
    if (isBatch(item)) {
        return false;
    }

    return item.type === 'resolve';
}

export function createPairId(pair: Request | Batch | OracleRequest | ResolveRequest) {
    if (isResolve(pair)) {
        return `${pair.type}-${pair.requestId.toString()}`;
    }


    if (isBatch(pair)) {
        return `${pair.networkId}-${pair.description}-${pair.pairs[0].pair}-${pair.interval}`;
    }


    if (isOracleRequest(pair)) {
        return `${pair.toContractAddress}-${pair.block.number}-${pair.confirmationsRequired}-${pair.toNetwork.bridgeChainId}-${pair.block.network.bridgeChainId}`;
    }

    return `${pair.networkId}-${pair.pair}-${pair.contractAddress}`;
}
