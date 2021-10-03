export interface IExchangeConnector {

    getAccountId(): string

    getPositions(): Promise<any>

    getFuturesAccountData(): Promise<any>

    transferUSDT(fromAccountType: string, toAccountType: string, amount: number, coin: string, transferId: string): Promise<any>

    setLeverage(symbol: string, leverage: number): Promise<void>

    buyFuture(pair: string, amount: number, reduceOnly: boolean): Promise<any>

    sellFuture(pair: string, amount: number, reduceOnly: boolean): Promise<any>

}