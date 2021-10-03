export class ExchangeConnectorTestDouble {


    public getAccountId(): string {
        return "test double string"
    }

    public getPositions(): Promise<any> {
        return Promise.resolve([])
    }

    public getFuturesAccountData(): Promise<any> {
        return Promise.resolve({})
    }

    public transferUSDT(fromAccountType: string, toAccountType: string, amount: number, coin: string, transferId: string): Promise<any> {
        return Promise.resolve({})
    }

    public setLeverage(symbol: string, leverage: number): Promise<void> {
        return Promise.resolve()
    }

    public buyFuture(pair: string, amount: number, reduceOnly: boolean): Promise<any> {
        return Promise.resolve({})
    }

    public sellFuture(pair: string, amount: number, reduceOnly: boolean): Promise<any> {
        return Promise.resolve({})
    }

}