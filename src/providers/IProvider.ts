import { Pair } from "../models/AppConfig";

export default interface IProvider {
    id: string;
    init(): Promise<void>;
    resolvePair(pair: Pair): Promise<string | null>;
}
