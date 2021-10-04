

import { InvestmentDecisionBase, InvestmentAdvisor } from "../investment-advisor/investment-advisor.ts"
import { Action, InvestmentAdvice } from "../investment-advisor/interfaces.ts"
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts"
import { BybitConnector } from "../../bybit/bybit-connector.ts"
import { DealSchema } from "./persistency/interfaces.ts"
import { MongoService } from "./persistency/mongo-service.ts"


export interface IActiveProcess {
    apiKey: string,
    exchangeConnector: IExchangeConnector,
    intervalId: number,
    iterationCounter: number
    pauseCounter: number
    minimumReserve: number
    pair: string
    tradingAmount: number
}


export class AssetManager {

    public static activeProcesses: IActiveProcess[] = []

    private activeProcess: IActiveProcess
    private exchangeConnector: IExchangeConnector
    private accountInfo: any // shall be defined properly as soon as we have a long term dex connected
    private positions: any[] = [] // shall be defined properly as soon as we have a long term dex connected
    private minimumReserve: number = 0
    private investmentDecisionBase: InvestmentDecisionBase | undefined
    private mongoService: MongoService | undefined


    public constructor(private apiKey: string, private apiSecret: string, minimumReserve: number, exchangeConnector?: IExchangeConnector) {

        if (exchangeConnector === undefined) { // giving the possibility for constructor dependency injection 
            this.exchangeConnector = new BybitConnector(apiKey, apiSecret)
        } else {
            this.exchangeConnector = exchangeConnector
        }

        this.activeProcess = {
            apiKey,
            exchangeConnector: this.exchangeConnector,
            intervalId: 0,
            iterationCounter: 0,
            pauseCounter: 0,
            minimumReserve,
            pair: 'BTCUSDT',
            tradingAmount: 0.001
        }

        AssetManager.activeProcesses.push(this.activeProcess)

    }


    public async optimizeInvestments(intervalLengthInSeconds: number): Promise<void> {

        this.checkParameters(intervalLengthInSeconds)

        this.activeProcess.intervalId = setInterval(async () => {

            this.activeProcess.iterationCounter++

            if (this.activeProcess.pauseCounter > 0) {
                this.activeProcess.pauseCounter--
            } else {
                await this.playTheGame()
            }

        }, intervalLengthInSeconds * 1000)

    }


    private async playTheGame(): Promise<void> {

        await this.collectFundamentals()

        const investmentAdvices = await this.getInvestmentAdvices()

        await this.applyInvestmentAdvices(investmentAdvices)

    }


    protected async collectFundamentals() {

        this.accountInfo = await this.exchangeConnector.getFuturesAccountData()
        console.log(this.accountInfo)
        this.positions = await this.exchangeConnector.getPositions()

        if (this.activeProcess.iterationCounter === 1) {
            console.log(`setting minimumReserve to ${this.accountInfo.result.USDT.equity * 0.9}`)
            this.minimumReserve = this.accountInfo.result.USDT.equity * 0.9
        }
    }

    protected async getInvestmentAdvices(): Promise<InvestmentAdvice[]> {

        this.investmentDecisionBase = {
            accountInfo: this.accountInfo,
            positions: this.positions,
            minimumReserve: this.minimumReserve
        }

        const investmentAdvisor = new InvestmentAdvisor()

        return investmentAdvisor.getInvestmentAdvices(this.investmentDecisionBase)

    }


    protected async applyInvestmentAdvices(investmentAdvices: InvestmentAdvice[]): Promise<void> {

        for (const investmentAdvice of investmentAdvices) {
            console.log(`applying investment advice: ${investmentAdvice}`)

            if (investmentAdvice.action === Action.PAUSE) {
                this.activeProcess.pauseCounter = 1000
            } else {

                let r

                if (investmentAdvice.action === Action.BUY) {

                    r = await this.activeProcess.exchangeConnector.buyFuture(investmentAdvice.pair, investmentAdvice.amount, false)

                } else if (investmentAdvice.action === Action.SELL) {

                    r = await this.activeProcess.exchangeConnector.sellFuture(investmentAdvice.pair, investmentAdvice.amount, false)

                } else if (investmentAdvice.action === Action.REDUCELONG) {

                    r = await this.activeProcess.exchangeConnector.sellFuture(investmentAdvice.pair, investmentAdvice.amount, true)

                } else if (investmentAdvice.action === Action.REDUCESHORT) {

                    r = await this.activeProcess.exchangeConnector.buyFuture(investmentAdvice.pair, investmentAdvice.amount, true)

                }

                console.log(r)

                if (r.ret_code === 0) {

                    const deal: DealSchema = {
                        _id: { $oid: "" },
                        apiKey: this.activeProcess.apiKey,
                        utcTime: new Date().toISOString(),
                        action: investmentAdvice.action,
                        reduceOnly: false,
                        reason: investmentAdvice.reason,
                        asset: investmentAdvice.pair,
                        equityBeforeThisDeal: this.accountInfo.result.USDT.equity
                    }


                    try {
                        if (this.mongoService !== undefined) {
                            await this.mongoService.saveDeal(deal)
                        }
                    } catch (error) {
                        console.log("shit happened wrt database")
                    }

                }
            }
        }

    }

    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 2) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

