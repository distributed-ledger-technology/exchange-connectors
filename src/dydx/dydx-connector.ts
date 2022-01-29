
// import Client from 'https://cdn.skypack.dev/@dydxprotocol/v3-client';
import { Request } from 'https://deno.land/x/request@1.3.2/mod.ts'

export class DyDxConnector {
    private client: any
    private baseURL = "https://api.stage.dydx.exchange"

    public constructor() {
    }

    public async checkUserExists(walletAddress: string): Promise<boolean> {
        const url = `${this.baseURL}/v3/users/exists?ethereumAddress=${walletAddress}`

        const result = await Request.get(url)

        return (result as any).exists
    }


    public async getMarketData(): Promise<any> {

        const url = `${this.baseURL}/v3/markets`

        const result = await Request.get(url)

        return result

    }


    public getBalance(testWallet: string): number {
        return 0
    }



}