

import { Action, IInvestmentAdvisor, InvestmentAdvice, InvestmentDecisionBase } from "../investment-advisor/interfaces.ts"
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts"
import { AccountInfoSchema, DealSchema, IPersistenceService } from "./persistency/interfaces.ts"
import { MongoService } from "./persistency/mongo-service.ts"
import { sleep } from "https://deno.land/x/sleep@v1.2.0/mod.ts";
import { VFLogger } from "../../utility-boxes/logger.ts";
import { FinancialCalculator } from "../../utility-boxes/financial-calculator.ts";

export interface IActiveProcess {
    apiKey: string,
    exchangeConnector: IExchangeConnector,
    intervalId: number,
    iterationCounter: number
    pair: string
    tradingAmount: number
}


export class VolatilityFarmer {

    public static activeProcesses: IActiveProcess[] = []

    private activeProcess: IActiveProcess
    private accountInfo: any // shall be defined properly as soon as we have a long term dex connected
    private positions: any[] = [] // shall be defined properly as soon as we have a long term dex connected
    private investmentDecisionBase: InvestmentDecisionBase | undefined
    private accountInfoCash: AccountInfoSchema
    private liquidityLevel = 0
    private pair = ""
    private longTermStabilityHaven = "ETHUSDT"



    public constructor(private apiKey: string, private apiSecret: string, private exchangeConnector: IExchangeConnector, private investmentAdvisor: IInvestmentAdvisor, private mongoService: IPersistenceService | undefined) {

        this.pair = this.investmentAdvisor.getInvestmentOptions()[0].pair

        this.activeProcess = {
            apiKey,
            exchangeConnector: this.exchangeConnector,
            intervalId: 0,
            iterationCounter: 0,
            pair: this.pair,
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
            longETHPositionSize: 0,
            botStatus: 'active',
            strategy: this.investmentAdvisor.constructor.name
        }

    }


    public async farm(intervalLengthInSeconds: number): Promise<void> {

        this.checkParameters(intervalLengthInSeconds)

        this.activeProcess.intervalId = setInterval(async () => {

            this.activeProcess.iterationCounter++

            if (this.activeProcess.iterationCounter % 2000 === 0) {
                await MongoService.deleteOldLogEntries(this.mongoService, this.apiKey)
                await MongoService.deleteOldDealEntries(this.mongoService, this.apiKey)
            }


            try {

                await this.playTheGame()

            } catch (error) {

                console.log(error.message)

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
        if (!(this.accountInfo.result.USDT.equity > 0)) throw new Error(`r u kidding me?`) // also in case the exchange api delivers shit

        this.positions = await this.exchangeConnector.getPositions()

        const longPosition = this.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === this.pair)[0]
        const shortPosition = this.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === this.pair)[0]

        const stabilityPosition = this.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === `${this.longTermStabilityHaven}`)[0]

        this.accountInfoCash.equity = this.accountInfo.result.USDT.equity
        this.accountInfoCash.avaliableBalance = this.accountInfo.result.USDT.available_balance
        this.accountInfoCash.longPositionSize = (longPosition === undefined) ? 0 : longPosition.data.size
        this.accountInfoCash.shortPositionSize = (shortPosition === undefined) ? 0 : shortPosition.data.size

        this.accountInfoCash.stabilityPositionSize = (stabilityPosition === undefined) ? 0 : stabilityPosition.data.size
        this.accountInfoCash.stabilityPositionPNL = FinancialCalculator.getPNLOfPositionInPercent(stabilityPosition)

        this.accountInfoCash.longPositionPNLInPercent =
            this.accountInfoCash.shortPositionPNLInPercent = FinancialCalculator.getPNLOfPositionInPercent(shortPosition)
        this.accountInfoCash.overallUnrealizedPNL = FinancialCalculator.getOverallPNLInPercent(longPosition, shortPosition)
        this.accountInfoCash.longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(this.positions, this.pair)
        this.accountInfoCash.strategy = this.investmentAdvisor.constructor.name
        this.liquidityLevel = (this.accountInfo.result.USDT.available_balance / this.accountInfo.result.USDT.equity) * 20

        const message = `*********** equity: ${this.accountInfo.result.USDT.equity.toFixed(2)} - ll: ${this.liquidityLevel.toFixed(2)} - oPNL: ${this.accountInfoCash.overallUnrealizedPNL.toFixed(2)} ***********`

        await VFLogger.log(message, this.apiKey, this.mongoService)

        await MongoService.saveAccountInfoCash(this.mongoService, this.accountInfoCash)

    }


    protected async getInvestmentAdvices(): Promise<InvestmentAdvice[]> {

        this.investmentDecisionBase = {
            accountInfo: this.accountInfo,
            positions: this.positions,
        }

        return this.investmentAdvisor.getInvestmentAdvices(this.investmentDecisionBase)

    }


    protected async applyInvestmentAdvices(investmentAdvices: InvestmentAdvice[]): Promise<void> {

        const message = `applying ${investmentAdvices.length} investment advices`

        await VFLogger.log(message, this.apiKey, this.mongoService)

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

            await VFLogger.log(r, this.apiKey, this.mongoService)

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

        }

    }



    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 4) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

