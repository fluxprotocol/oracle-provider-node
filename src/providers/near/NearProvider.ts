import { Account } from "near-api-js";
import { Batch, createPairId, NearNetwork, Network, Pair } from "../../models/AppConfig";
import IProvider from "../IProvider";
import logger from '../../services/LoggerService';
import { connectToNear, getAccount, isTransactionFailure, validateNearConfig } from "./NearConnectService";
import { resolveSources } from "../../vm";
import { BN } from "bn.js";
import { createNearActionForPair, createPair, getDecimalsForPair, pushDataOnPair } from "./NearPairService";
import { Action } from "near-api-js/lib/transaction";

export default class NearProvider extends IProvider {
    static type = 'near';
    account?: Account;
    nearConfig: NearNetwork;

    constructor(networkConfig: Network) {
        super(networkConfig);

        validateNearConfig(networkConfig);

        this.nearConfig = networkConfig as NearNetwork;
    }

    async init() {
        if (this.networkConfig.type !== 'near') {
            throw new Error('Type should be near');
        }

        const near = await connectToNear(this.networkConfig);
        this.account = await getAccount(near, this.networkConfig.accountId ?? '');
    }

    async resolveBatch(batch: Batch): Promise<string | null> {
        try {
            if (!this.account) {
                logger.error(`[${batch.networkId}] No logged in account found`);
                return null;
            }

            const answers: string[] = [];

            const actions = await Promise.all(batch.pairs.map(async (pair) => {
                const decimalsInfo = await getDecimalsForPair(pair, this.account!);
                const answer = await resolveSources({
                    ...pair,
                    decimals: decimalsInfo.decimals,
                });

                if (!answer) return null;

                if (!decimalsInfo.pairExists) {
                    const created = await createPair({
                        ...pair,
                        decimals: decimalsInfo.decimals,
                    }, answer, this.nearConfig, this.account!);

                    if (!created) return null;
                }

                answers.push(`"${pair.pair}->${answer}"`);

                return createNearActionForPair({
                    ...pair,
                    decimals: decimalsInfo.decimals,
                }, answer, this.nearConfig, batch.pairs.length);
            }));

            // @ts-ignore
            const txOutcome = await this.account.signAndSendTransaction({
                receiverId: batch.contractAddress,
                actions: actions.filter(action => action !== null) as Action[],
            });

            if (isTransactionFailure(txOutcome)) {
                logger.error(`[${createPairId(batch)}] Something went wrong during updating of price`);
                return null;
            }

            return answers.join(',');
        } catch (error: any) {
            logger.error(`[${batch.networkId}] Could not resolve batch ${createPairId(batch)} - ${error.toString()}`);
            return null;
        }
    }
}
