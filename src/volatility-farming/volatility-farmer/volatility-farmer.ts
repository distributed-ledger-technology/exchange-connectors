

import { InvestmentDecisionBase, InvestmentAdvisor } from "../investment-advisor/investment-advisor.ts"
import { Action, InvestmentAdvice } from "../investment-advisor/interfaces.ts"
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts"
import { BybitConnector } from "../../bybit/bybit-connector.ts"
import { AccountInfoSchema, DealSchema } from "./persistency/interfaces.ts"
import { MongoService } from "./persistency/mongo-service.ts"
import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

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


export class VolatilityFarmer {

    public static activeProcesses: IActiveProcess[] = []

    private activeProcess: IActiveProcess
    private exchangeConnector: IExchangeConnector
    private accountInfo: any // shall be defined properly as soon as we have a long term dex connected
    private positions: any[] = [] // shall be defined properly as soon as we have a long term dex connected
    private investmentDecisionBase: InvestmentDecisionBase | undefined
    private mongoService: MongoService | undefined
    private accountInfoCash: AccountInfoSchema
    private investmentAdvisor: InvestmentAdvisor



    public constructor(private apiKey: string, private apiSecret: string, minimumReserve: number, exchangeConnector?: IExchangeConnector, dbConnectionURL?: string) {

        if (exchangeConnector === undefined) { // giving the possibility for constructor dependency injection 
            this.exchangeConnector = new BybitConnector(apiKey, apiSecret)
        } else {
            this.exchangeConnector = exchangeConnector
        }

        this.investmentAdvisor = new InvestmentAdvisor()

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

        VolatilityFarmer.activeProcesses.push(this.activeProcess)

        if (dbConnectionURL !== undefined) {

            try {
                this.mongoService = new MongoService(dbConnectionURL)
            } catch (error) {
                console.log(`shit happened wrt database: ${error.message}`)
            }

        }

        this.accountInfoCash = {
            _id: { $oid: "" },
            apiKey,
            equity: 0,
            avaliableBalance: 0,
            longPositionSize: 0,
            longPositionPNLInPercent: 0,
            shortPositionSize: 0,
            shortPositionPNLInPercent: 0,
            longShortDeltaInPercent: 0,
            overallUnrealizedPNL: 0,
            botStatus: 'active'
        }

    }


    public async optimizeInvestments(intervalLengthInSeconds: number): Promise<void> {

        this.checkParameters(intervalLengthInSeconds)

        this.activeProcess.intervalId = setInterval(async () => {

            this.activeProcess.iterationCounter++

            if (this.activeProcess.pauseCounter > 0) {
                this.activeProcess.pauseCounter--
                if (this.activeProcess.pauseCounter === 0) {
                    this.activeProcess.minimumReserve = this.accountInfo.result.USDT.equity * 0.9
                }
            } else {
                await sleepRandomAmountOfSeconds(0, intervalLengthInSeconds - 1, false)
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
        this.positions = await this.exchangeConnector.getPositions()

        if (this.activeProcess.iterationCounter === 1 || this.activeProcess.iterationCounter % 5000 === 0) {
            console.log(`setting minimumReserve to ${this.accountInfo.result.USDT.equity * 0.9}`)
            this.activeProcess.minimumReserve = this.accountInfo.result.USDT.equity * 0.9
        }

        const longPosition = this.positions.filter((p: any) => p.data.side === 'Buy')[0]
        const shortPosition = this.positions.filter((p: any) => p.data.side === 'Sell')[0]

        this.accountInfoCash.equity = this.accountInfo.result.USDT.equity
        this.accountInfoCash.avaliableBalance = this.accountInfo.result.USDT.available_balance
        if (longPosition !== undefined && shortPosition !== undefined) {
            this.accountInfoCash.longPositionSize = longPosition.data.size
            this.accountInfoCash.shortPositionSize = shortPosition.data.size
            this.accountInfoCash.longPositionPNLInPercent = this.investmentAdvisor.getPNLOfPositionInPercent(longPosition)
            this.accountInfoCash.shortPositionPNLInPercent = this.investmentAdvisor.getPNLOfPositionInPercent(shortPosition)
            this.accountInfoCash.overallUnrealizedPNL = this.investmentAdvisor.getOverallPNLInPercent(longPosition, shortPosition)
            this.accountInfoCash.longShortDeltaInPercent = this.investmentAdvisor.getLongShortDeltaInPercent(this.positions)

            console.log(`minR ${this.activeProcess.minimumReserve} - e: ${this.accountInfo.result.USDT.equity}`)
        }

        try {
            if (this.mongoService !== undefined) {
                await this.mongoService.updateAccountInfo(this.accountInfoCash)
            }
        } catch (error) {
            console.log(`shit happened wrt database: ${error.message}`)
        }
    }

    protected async getInvestmentAdvices(): Promise<InvestmentAdvice[]> {

        this.investmentDecisionBase = {
            accountInfo: this.accountInfo,
            positions: this.positions,
            minimumReserve: this.activeProcess.minimumReserve
        }

        return this.investmentAdvisor.getInvestmentAdvices(this.investmentDecisionBase)

    }


    protected async applyInvestmentAdvices(investmentAdvices: InvestmentAdvice[]): Promise<void> {

        console.log(`applying ${investmentAdvices.length} investment advices`)

        for (const investmentAdvice of investmentAdvices) {

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
                        action: investmentAdvice.action.toString(),
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
                        console.log(`shit happened wrt database: ${error.message}`)
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
