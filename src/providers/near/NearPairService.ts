import { BN } from "bn.js";
import { Account, transactions } from "near-api-js";
import { Action } from "near-api-js/lib/transaction";
import { DEFAULT_DECIMALS } from "../../config";
import { NearNetwork, Pair } from "../../models/AppConfig";
import PairInfo from "../../models/PairInfo";
import cache from "../../services/CacheUtils";
import logger from '../../services/LoggerService';
import { isTransactionFailure } from "./NearConnectService";

const DEFAULT_MAX_GAS = '300000000000000';
const DEFAULT_STORAGE_DEPOSIT = '300800000000000000000000';

export interface TransactionViewOptions {
    methodName: string;
    args?: object;
}

export interface TransactionCallOptions extends TransactionViewOptions {
    gas: string;
    amount: string;
}

export interface TransactionOption {
    receiverId: string;
    transactionOptions: TransactionCallOptions[];
}

export async function getDecimalsForPair(pair: Pair, account: Account): Promise<{ pairExists: boolean, decimals: number }> {
    try {
        const info = await cache(`${pair.contractAddress}-${pair.pair}`, async () => {
            const priceEntry = await account.viewFunction(pair.contractAddress, 'get_entry', {
                provider: account.accountId,
                pair: pair.pair,
            });

            return {
                decimals: priceEntry.decimals,
                pairExists: true,
            }
        });

        return info;
    } catch (error) {
        // Provider does not exist at all. We need to create the pair.
        const defaultDecimals = pair.defaultDecimals ?? DEFAULT_DECIMALS;
        logger.info(`[${pair.contractAddress}] No pair found for ${pair.pair}, creating one with ${defaultDecimals} decimals`);

        return {
            decimals: defaultDecimals,
            pairExists: false,
        };
    }
}

export async function createPair(pair: PairInfo, price: string, nearConfig: NearNetwork, account: Account) {
    try {
        await account.functionCall({
            methodName: 'create_pair',
            contractId: pair.contractAddress,
            args: {
                pair: pair.pair,
                decimals: pair.defaultDecimals,
                initial_price: price,
            },
            gas: new BN(nearConfig.maxGas ?? DEFAULT_MAX_GAS),
            attachedDeposit: new BN(nearConfig.storageDeposit ?? DEFAULT_STORAGE_DEPOSIT),
        });

        return true;
    } catch (error) {
        logger.warn(`[${pair.contractAddress}] Pair could not be created, ${pair.pair}: ${error}`);
        return false;
    }
}

export function createNearActionForPair(pair: PairInfo, price: string, nearConfig: NearNetwork, totalPairsInBatch: number): Action {
    const gas = new BN(nearConfig.maxGas ?? DEFAULT_MAX_GAS);

    return transactions.functionCall('push_data', {
        pair: pair.pair,
        price,
    }, gas.div(new BN(totalPairsInBatch)), new BN('0'));
}

export async function pushDataOnPair(pair: PairInfo, price: string, pairExists: boolean, nearConfig: NearNetwork, account: Account): Promise<boolean> {
    // Creating the pair


    try {
        const transactionOutcome = await account.functionCall({
            contractId: pair.contractAddress,
            methodName: 'push_data',
            args: {
                pair: pair.pair,
                price,
            },
            gas: new BN(nearConfig.maxGas ?? DEFAULT_MAX_GAS),
            attachedDeposit: new BN(nearConfig.storageDeposit ?? DEFAULT_STORAGE_DEPOSIT),
        });

        if (isTransactionFailure(transactionOutcome)) {
            logger.error(`[${pair.contractAddress}] Something went wrong during updating of price ${pair.pair}`);
            return false;
        }

        return true;
    } catch (error) {
        logger.error(`[${pair.contractAddress}] Could not push data for pair ${pair.pair}: ${error}`);
        return false;
    }
}
