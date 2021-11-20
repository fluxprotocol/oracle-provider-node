# oracle-provider-node
Provider node for pushing and settling data requests for first-party price feeds on EVM chains

## Usage

### Pre-requisites

First, deploy a `FluxPriceFeed.sol` contract by [following this link to the `price-feeds-evm` repository](https://github.com/fluxprotocol/price-feeds-evm). Be sure to save the deployed contract address to use it with this node.

### Set-up

```bash
git clone https://github.com/fluxprotocol/oracle-provider-node
cd oracle-provider-node/
npm install
cp .env.example .env # add private key
nano appconfig.json # populate with contract address, API sources, and interval
```

In `appconfig.json`, each price pair is mapped to a single contract and can have any number of sources. The node will push the result of the last source that returns an answer, throwing out sources that do not respond.

### Running

To run:

```bash
npm run start
```
