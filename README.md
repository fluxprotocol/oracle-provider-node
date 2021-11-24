# oracle-provider-node
Provider node for pushing and settling data requests for first-party price feeds on EVM chains

## Usage

### Pre-requisites

First, deploy a `FluxPriceFeed.sol` contract by [cloning the `price-feeds-evm` repository and following the README](https://github.com/fluxprotocol/price-feeds-evm), saving your contract address to use here. Alternatively, leave the default `appconfig.json` contract address to test your API sources without deploying a new contract, using a contract we deployed to Aurora with access control removed.

### Set-up

```bash
git clone https://github.com/fluxprotocol/oracle-provider-node
cd oracle-provider-node/
npm install
cp .env.example .env # add private key
nano appconfig.json # populate with contract address, API sources, network, and interval
```

In `appconfig.json`, each price pair is mapped to a single contract and can have any number of sources. The node will push the result of the last source that returns an answer, throwing out sources that do not respond.

### Running

To run:

```bash
npm run start
```

## Configuring `appconfig.json`

|Key|Type|Description|
|---|---|---|
|networks|Network[]|An array of network configuration. (Explained below)
|pairs|Pair[]|An array of pricing pairs with there sources (Explained below)

### Network

Configuration for a specific network. Currently two types are supported. `evm` and `near`. You can use each network type multiple types to combine for example Avalanche, Polygon and Ethereum.

### evm

|Key|Type|Description|
|---|---|---|
|type|"evm"|Lets the node know this is an EVM type chain|
|networkId|string|A custom ID that you fill in. This will be used to connect pairs to a specific network configuration. Can be anything you want to identify the configuration|
|privateKeyEnvKey|string|The name of the env variable where the private key is stored.|
|chainId|number|The chain id of the EVM chain. (1 = Ethereum)|
|rpc|string|The URL to the Ethereum compatible RPC|

Example:

```JSON
{
    "networks": [
        {
            "type": "evm",
            "networkId": "aurora",
            "privateKeyEnvKey": "AURORA_PRIVATE_KEY",
            "chainId": 1313161554,
            "rpc": "https://mainnet.aurora.dev"
        }
    ]
}
```

### near

|Key|Type|Description|
|---|---|---|
|type|"near"|Lets the node know this is an EVM type chain|
|networkId|string|A custom ID that you fill in. This will be used to connect pairs to a specific network configuration. Can be anything you want to identify the configuration|
|credentialsStorePathEnvKey|string|The name of the env variable where the credentials are stored. Not required if you are using `privateKeyEnvKey`|
|privateKeyEnvKey|string|The name of the env variable where the private key is stored. Not required if you are using `credentialsStorePathEnvKey`|
|networkType|string|Whether this network is "testnet" or "mainnet"|
|rpc|string|The URL to the Ethereum compatible RPC|
|accountId|string|The accountId coupled with the privateKey/credentials|

Example:

```JSON
{
    "networks": [
        {
            "type": "near",
            "networkId": "near-testnet",
            "credentialsStorePathEnvKey": "NEAR_CREDENTIALS_STORE_PATH",
            "networkType": "testnet",
            "rpc": "https://rpc.testnet.near.org",
            "maxGas": "300000000000000",
            "accountId": "franklinwaller2.testnet",
            "storageDeposit": "300800000000000000000000"
        }
    ]
}
```

## Pairs

Pairs include information for a specific pair such as which sources to fetch from, how often and where to post them.

|Key|Type|Description|
|---|---|---|
|description|string | undefined| Optional description tag in other to identify what pair this is.|
|pair|string|Info about the pair. Should be something like "ETH / USD". This info will also be posted on chain depending on the network.
|contractAddress|string| Which address to post the answers to.
|sources|Source[]|An array of sources. More on that below.
|interval|number|Interval between updates.|
|networkId|string|The id of the network in your `"networks"` configuration.|
|defaultDecimals|number|If there are no decimals configured, the node will use and submit a number containing this many decimals.|

### Source

Information containing where to fetch data. Uses the [jsonpath-rust](https://github.com/besok/jsonpath-rust) package for finding values using keys.

|Key|Type|Description|
|---|---|---|
|source_path|string|Path to the number value. Uses [jsonpath-rust](https://github.com/besok/jsonpath-rust) for finding values.|
|end_point|string|The URL to a JSON API|

Example:

```JSON
{
    "pairs": [
        {
            "description": "ETH / USD for NEAR",
            "pair": "ETH / USD",
            "contractAddress": "fpo1.franklinwaller2.testnet",
            "sources": [
                {
                    "source_path": "market_data.current_price.usd",
                    "end_point": "https://api.coingecko.com/api/v3/coins/ethereum"
                }
            ],
            "interval": 5000,
            "networkId": "near-testnet",
            "defaultDecimals": 6
        }
    ]
}
```
