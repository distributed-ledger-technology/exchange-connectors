import { IExchangeConnector } from "../interfaces/exchange-connector-interface.ts"
import { BybitConnector } from "./bybit-connector.ts"


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


const apiKey = Deno.args[0] // can't provide you example data here as I can't judge your trading / gambling skills :)
const apiSecret = Deno.args[1] // can't provide you example data here as I can't judge your trading / gambling skills :)

const exampleClient = new ExampleClient(apiKey, apiSecret)

await exampleClient.showUsageExamples()
