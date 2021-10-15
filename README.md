# Exchange Connectors

This module provides a range of Exchange Connectors. 

This shall support the emergence of perfect markets by simplifying market access.

## Centralized Exchanges (CEXes)
### Bybit General Interaction
See also the [Bybit Example Client](https://github.com/michael-spengler/exchange-connectors/blob/main/src/bybit/usage-example-client.ts) and 
[Bybit Connector](https://github.com/michael-spengler/exchange-connectors/blob/main/src/bybit/bybit-connector.ts) for more usage examples.

```ts 

import { IExchangeConnector } from "https://deno.land/x/exchange_connectors/mod-bybit.ts"
import { BybitConnector } from "https://deno.land/x/exchange_connectors/mod-bybit.ts"

export class ExampleClient {

    private exchangeConnector: IExchangeConnector

    public constructor(private apiKey: string, private apiSecret: string) {
        this.exchangeConnector = new BybitConnector(apiKey, apiSecret)
    }

    public async showUsageExamples(): Promise<void> {
        const accountInfo = await this.exchangeConnector.getFuturesAccountData()
        console.log(accountInfo)
        const positions = await this.exchangeConnector.getPositions()
        console.log(positions)
    }
}

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]

const exampleClient = new ExampleClient(apiKey, apiSecret)

await exampleClient.showUsageExamples()

```

### Bybit Usage Example: Volatility Farming
#### Via Deno (need to keep the terminal open)

```sh

deno run --unstable --allow-net https://deno.land/x/exchange_connectors/src/volatility-farming/volatility-farmer/start-volatility-farmer.ts <yourByBitAPIKey> <yourByBitAPISecret> <yourMongoDBUser> <yourMongoDBPassword> InvestmentAdvisorBTCLongShortExtreme BybitConnector MongoService

```

#### Via PM2 (in the background)

```sh

pm2 start -n "volatility-farming" --interpreter="deno" --interpreter-args="run --unstable --allow-net" https://deno.land/x/exchange_connectors/src/volatility-farming/volatility-farmer/start-volatility-farmer.ts -- <yourByBitAPIKey> <yourByBitAPISecret> <yourMongoDBUser> <yourMongoDBPassword> InvestmentAdvisorBTCLongShortExtreme BybitConnector MongoService 

```


## Decentralized Exchanges (DEXes)
Under Construction  
Shall we use the web3 deno module (is web3 ready for deno?)?


### Uniswap

### FYX
https://yfx.io


