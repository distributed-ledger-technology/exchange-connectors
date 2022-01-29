
// import Client from 'https://cdn.skypack.dev/@dydxprotocol/v3-client' // see issue

// import dydxprotocolPerpetual from 'https://cdn.skypack.dev/@dydxprotocol/perpetual';
import "https://deno.land/x/dotenv/load.ts";

import { Request } from 'https://deno.land/x/request@1.3.2/mod.ts'

export class DyDxConnector {

    private client: any
    private baseURL = "https://api.stage.dydx.exchange"

    public constructor() {

        const walletPrivateKey = Deno.env.get("PRIVATEKEYFORDYDXINTERACTION")
        // this.client = new Client(
        //     'host',
        //     {
        //         apiTimeout: 3000,
        //         starkPrivateKey: '01234abcd...',
        //     },
        // );

    }

    public async getPositions(walletAddress: string): Promise<any> {
        const url = `${this.baseURL}/v3/positions?ethereumAddress=${walletAddress}`

        const result = await Request.get(url)

        return result

    }

    public async getAccountData(walletAddress: string): Promise<any> {
        const url = `${this.baseURL}/v3/accounts?ethereumAddress=${walletAddress}`

        const result = await Request.get(url)

        return result

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