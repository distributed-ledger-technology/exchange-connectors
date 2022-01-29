
// import Client from 'https://cdn.skypack.dev/@dydxprotocol/v3-client';
import { Request } from 'https://deno.land/x/request@1.3.2/mod.ts'

export class DyDxConnector {
    private client: any
    private baseURL = "https://api.stage.dydx.exchange"

    public async getMarketData(): Promise<any> {

        const url = `${this.baseURL}/v3/markets`

        const result = await Request.get(url)

        return result

    }

    public constructor() {
    }

    public getBalance(testWallet: string): number {
        return 0
    }



}