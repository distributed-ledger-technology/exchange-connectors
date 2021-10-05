

import { InvestmentDecisionBase, InvestmentAdvisor } from "../investment-advisor/investment-advisor.ts"
import { Action, IInvestmentAdvisor, InvestmentAdvice } from "../investment-advisor/interfaces.ts"
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts"
import { BybitConnector } from "../../bybit/bybit-connector.ts"
import { AccountInfoSchema, DealSchema, LogSchema } from "./persistency/interfaces.ts"
import { MongoService } from "./persistency/mongo-service.ts"
import { sleep, sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep@v1.2.0/mod.ts";

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
    private investmentAdvisor: IInvestmentAdvisor



    public constructor(private apiKey: string, private apiSecret: string, minimumReserve: number, exchangeConnector?: IExchangeConnector, dbConnectionURL?: string, investmentAdvisor?: IInvestmentAdvisor) {

        if (exchangeConnector === undefined) { // giving the possibility for constructor dependency injection 
            this.exchangeConnector = new BybitConnector(apiKey, apiSecret)
        } else {
            this.exchangeConnector = exchangeConnector
        }

        if (dbConnectionURL !== undefined) {

            try {
                this.mongoService = new MongoService(dbConnectionURL)
            } catch (error) {
                console.log(`shit happened wrt database: ${error.message}`)
            }

        }

        if (investmentAdvisor === undefined) { // giving the possibility for constructor dependency injection 
            this.investmentAdvisor = new InvestmentAdvisor(this.apiKey, this.mongoService)
        } else {
            this.investmentAdvisor = investmentAdvisor
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

        VolatilityFarmer.activeProcesses.push(this.activeProcess)

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

            if (this.activeProcess.iterationCounter % 2000) {
                await MongoService.deleteOldLogEntries(this.mongoService, this.apiKey)
            }

            if (this.activeProcess.pauseCounter > 0) {

                await this.pause()

            } else {
                await sleepRandomAmountOfSeconds(0, intervalLengthInSeconds - 2, false)
                await this.playTheGame()
            }

        }, intervalLengthInSeconds * 1000)

    }

    protected async playTheGame(): Promise<void> {

        await this.collectFundamentals()

        const investmentAdvices = await this.getInvestmentAdvices()
        await sleep(0.1)
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

            const message = `*********** minReserve ${this.activeProcess.minimumReserve.toFixed(2)} - equity: ${this.accountInfo.result.USDT.equity.toFixed(2)} - oPNL: ${this.accountInfoCash.overallUnrealizedPNL.toFixed(2)} ***********`
            console.log(message)

            const log: LogSchema = {
                _id: { $oid: "" },
                apiKey: this.apiKey,
                utcTime: new Date().toISOString(),
                message,
            }

            await MongoService.saveLog(this.mongoService, log)

        }

        await MongoService.saveAccountInfoCash(this.mongoService, this.accountInfoCash)
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

        const message = `applying ${investmentAdvices.length} investment advices`
        console.log(message)

        const log: LogSchema = {
            _id: { $oid: "" },
            apiKey: this.apiKey,
            utcTime: new Date().toISOString(),
            message,
        }

        await MongoService.saveLog(this.mongoService, log)


        for (const investmentAdvice of investmentAdvices) {
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

            const log: LogSchema = {
                _id: { $oid: "" },
                apiKey: this.apiKey,
                utcTime: new Date().toISOString(),
                message: JSON.stringify(r),
            }

            await MongoService.saveLog(this.mongoService, log)

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


                await MongoService.saveDeal(this.mongoService, deal)

            }

            if (investmentAdvice.action === Action.PAUSE) {
                this.activeProcess.pauseCounter = 1000
            }

        }

    }



    protected async pause(): Promise<void> {

        if (this.activeProcess.pauseCounter === 1000) {

            this.accountInfo = await this.exchangeConnector.getFuturesAccountData()
            this.positions = await this.exchangeConnector.getPositions()

            this.accountInfoCash.equity = this.accountInfo.result.USDT.equity
            this.accountInfoCash.avaliableBalance = this.accountInfo.result.USDT.available_balance

            this.accountInfoCash.longPositionSize = 0
            this.accountInfoCash.shortPositionSize = 0

        }

        this.activeProcess.pauseCounter--

        const message = `pauseCounter: ${this.activeProcess.pauseCounter}`
        console.log(message)

        const log: LogSchema = {
            _id: { $oid: "" },
            apiKey: this.apiKey,
            utcTime: new Date().toISOString(),
            message,
        }

        await MongoService.saveLog(this.mongoService, log)


        if (this.activeProcess.pauseCounter === 0) {
            this.activeProcess.minimumReserve = this.accountInfo.result.USDT.equity * 0.9
        }

    }


    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 4) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

