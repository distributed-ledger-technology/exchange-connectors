
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