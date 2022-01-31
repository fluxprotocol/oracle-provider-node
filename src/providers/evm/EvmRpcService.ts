import { JsonRpcProvider } from "@ethersproject/providers";
import Big from "big.js";
import { Block } from "../../models/Block";
import logger from "../../services/LoggerService";
import { EvmConfig } from "./EvmConfig";

export interface EvmBlock {
    blockNumber: number;
    receiptRoot: string;
    hash: string;
}

export async function getBlockByNumber(number: number | string, config: EvmConfig, type: 'blockTag' | 'blockHash' = 'blockTag'): Promise<Block | null> {
    try {
        const provider = new JsonRpcProvider(config.rpc);
        let blockId = number;

        if (type === 'blockHash' && typeof blockId === 'string') {
            if (!blockId.startsWith('0x')) {
                blockId = `0x${blockId}`;
            }
        }

        if (type === 'blockTag') {
            blockId = '0x' + Number(blockId).toString(16);
        }


        const block = await provider.perform('getBlock', {
            [type]: blockId,
        });

        if (!block) {
            return null;
        }

        return {
            number: parseInt(block.number).toString(),
            hash: block.hash,
            receiptsRoot: block.receiptsRoot,
            network: {
                bridgeChainId: config.bridgeChainId,
                type: 'evm',
            },
        };
    } catch (error) {
        logger.error('[getBlockByNumber]', error);
        return null;
    }
}

export async function getLatestBlock(config: EvmConfig): Promise<Block | null> {
    try {
        const provider = new JsonRpcProvider(config.rpc);
        const currentBlock = await provider.getBlockNumber();

        return getBlockByNumber(currentBlock, config);
    } catch (error) {
        logger.error('[getLatestBlock]', error);
        return null;
    }
}

