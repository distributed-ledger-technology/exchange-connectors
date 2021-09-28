# Exchange Connectors

This module provides a range of Exchange Connectors. 

This shall support the emergence of perfect markets by simplifying market access.

## Centralized Exchanges (CEXes)
### Bybit
See also the [Bybit Example Client](https://github.com/michael-spengler/exchange-connectors/blob/main/src/bybit/usage-example-client.ts) and 
[Bybit Connector](https://github.com/michael-spengler/exchange-connectors/blob/main/src/bybit/bybit-connector.ts) for more usage examples.

```ts 

import { IExchangeConnector } from "https://deno.land/x/exchange_connectors/mod-bybit.ts"
import { BybitConnector } from "https://deno.land/x/exchange_connectors/mod-bybit.ts"

export class ExampleClient {

    private exchangeConnector: IExchangeConnector

    public constructor(private aPIKey: string, private aPISecret: string) {
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


## Decentralized Exchanges (CEXes)
Under Construction

### FYX
https://yfx.io

Shall we use web3 (ready for deno?)?
