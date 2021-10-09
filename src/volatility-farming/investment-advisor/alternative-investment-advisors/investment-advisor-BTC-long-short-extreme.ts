
// this is a slightly opinionated (long) investment advisor
// it serves edcucational purposes and shall inspire friends to implement different strategies and apply them within this network
// https://www.math3d.org/2cj0XobI 

import { sleep } from "https://deno.land/x/sleep@v1.2.0/mod.ts";
import { FinancialCalculator } from "../../../utility-boxes/financial-calculator.ts";
import { VFLogger } from "../../../utility-boxes/logger.ts";
import { IPersistenceService } from "../../volatility-farmer/persistency/interfaces.ts";
import { IInvestmentAdvisor, InvestmentAdvice, InvestmentOption, Action, InvestmentDecisionBase, IPosition } from "../interfaces.ts";


export class InvestmentAdvisorBTCLongShortExtreme implements IInvestmentAdvisor {

    private currentInvestmentAdvices: InvestmentAdvice[] = []
    private lastAdviceDate: Date = new Date()
    private oPNLClosingLimit = 54
    private longShortDeltaInPercent = 0
    private liquidityLevel = 0
    private addingPointLong = 0
    private addingPointShort = 0
    private closingPointLong = 0
    private closingPointShort = 0
    private pnlLong = 0
    private pnlShort = 0
    private longPosition: IPosition | undefined
    private shortPosition: IPosition | undefined
    private minimumLLForNarrowingDownDiffPNL = 11


    private investmentOptions: InvestmentOption[] = [
        {
            pair: "BTCUSDT",
            minTradingAmount: 0.001
        }
    ]


    public constructor(private apiKey: string, private mongoService: IPersistenceService | undefined) { }


    public getInvestmentOptions(): InvestmentOption[] {
        return this.investmentOptions
    }


    public async getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        this.longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(investmentDecisionBase.positions)
        this.liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20

        this.longPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]
        this.shortPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell')[0]

        this.addingPointLong = this.getAddingPointLong()
        this.addingPointShort = this.getAddingPointShort()
        this.closingPointLong = this.getClosingPointLong()
        this.closingPointShort = this.getClosingPointShort()


        this.pnlLong = FinancialCalculator.getPNLOfPositionInPercent(this.longPosition)
        this.pnlShort = FinancialCalculator.getPNLOfPositionInPercent(this.shortPosition)


        for (const investmentOption of this.investmentOptions) {
            for (const move of Object.values(Action)) {
                await sleep(0.1)
                await this.deriveInvestmentAdvice(investmentOption, move, investmentDecisionBase)

            }

        }

        return this.currentInvestmentAdvices

    }


    protected async deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action, investmentDecisionBase: InvestmentDecisionBase): Promise<void> {


        if (move === Action.PAUSE) { // here just to ensure the following block is executed only once

            await this.deriveSpecialCaseMoves(investmentOption, this.longShortDeltaInPercent, investmentDecisionBase, this.longPosition, this.shortPosition)

        } else if (this.longPosition !== undefined && this.shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            await this.deriveStandardMoves(investmentOption, this.longShortDeltaInPercent, move, this.longPosition, this.shortPosition)

        }

    }


    protected async deriveSpecialCaseMoves(investmentOption: InvestmentOption, lsd: number, investmentDecisionBase: InvestmentDecisionBase, longPosition: any, shortPosition: any): Promise<void> {


        let overallPNL = 0
        try {
            overallPNL = FinancialCalculator.getOverallPNLInPercent(longPosition, shortPosition)
        } catch (error) {
            console.log(error.message)
        }

        if (investmentDecisionBase.accountInfo.result.USDT.equity < investmentDecisionBase.minimumReserve || this.liquidityLevel === 0 || overallPNL > this.oPNLClosingLimit) {
            await this.checkCloseAll(investmentOption, investmentDecisionBase, this.liquidityLevel, overallPNL, longPosition, shortPosition)

        } else if (longPosition !== undefined && shortPosition !== undefined && this.liquidityLevel > this.minimumLLForNarrowingDownDiffPNL &&
            (shortPosition.data.unrealised_pnl < 0 && longPosition.data.unrealised_pnl < 0 ||
                (shortPosition.data.unrealised_pnl > 1 && longPosition.data.unrealised_pnl > 1 && this.isPreviousAdviceOlderThanXMinutes(3)))) {

            await this.narrowingDownDiffPNL(investmentOption)

        } else {
            await this.checkSetup(longPosition, shortPosition, investmentOption)

        }

    }


    protected isPreviousAdviceOlderThanXMinutes(minutes: number): boolean {

        const refDate = new Date();

        refDate.setMinutes(refDate.getMinutes() - minutes);

        if (this.lastAdviceDate < refDate) {
            return true
        }

        return false
    }


    protected amIFarAwayFromAnyRegularMove(): boolean {

        const addingPointLongDelta = this.pnlLong - this.addingPointLong

        const addingPointShortDelta = this.pnlShort - this.addingPointShort

        const closingPointLongDelta = this.pnlLong - this.closingPointLong

        const closingPointShortDelta = this.pnlShort - this.closingPointShort

        const minDelta = 40

        const result = (Math.abs(addingPointLongDelta) > minDelta &&
            Math.abs(addingPointShortDelta) > minDelta &&
            Math.abs(closingPointLongDelta) > minDelta &&
            Math.abs(closingPointShortDelta) > minDelta)

        if (result) {

            return this.isPreviousAdviceOlderThanXMinutes(3)

        }

        return false

    }


    protected async deriveStandardMoves(investmentOption: InvestmentOption, lsd: number, move: Action, longPosition: any, shortPosition: any): Promise<void> {

        switch (move) {

            case Action.BUY: {

                const message = `adding point long: ${this.addingPointLong.toFixed(2)} (${this.pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlLong < this.addingPointLong || (this.amIFarAwayFromAnyRegularMove() &&
                    (this.longPosition !== undefined && this.shortPosition !== undefined &&
                        this.longPosition.data.size < this.shortPosition.data.size))) {
                    let factor = Math.floor(Math.abs(lsd) / 10)
                    if (factor < 1) factor = 1
                    const amount = investmentOption.minTradingAmount * factor
                    const reason = `we enhance our ${investmentOption.pair} long position by ${amount}`
                    this.addInvestmentAdvice(Action.BUY, amount, investmentOption.pair, reason)
                }

                break

            }

            case Action.SELL: {

                const message = `adding point short: ${this.addingPointShort.toFixed(2)} (${this.pnlShort})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlShort < this.addingPointShort || (this.amIFarAwayFromAnyRegularMove() &&
                    (this.longPosition !== undefined && this.shortPosition !== undefined &&
                        this.shortPosition.data.size < this.longPosition.data.size))) {

                    let factor = Math.floor(Math.abs(lsd) / 10)
                    if (factor < 1) factor = 1
                    const amount = investmentOption.minTradingAmount * factor
                    const reason = `we enhance our ${investmentOption.pair} short position by ${amount}`
                    this.addInvestmentAdvice(Action.SELL, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break
            }

            case Action.REDUCELONG: {

                const message = `closing point long: ${this.closingPointLong.toFixed(2)} (${this.pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlLong > this.closingPointLong && longPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} long position to realize ${this.pnlLong}% profits`
                    this.addInvestmentAdvice(Action.REDUCELONG, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            case Action.REDUCESHORT: {

                const message = `closing point short: ${this.closingPointShort.toFixed(2)} (${this.pnlShort})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlShort > this.closingPointShort && shortPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} short position to realize ${this.pnlShort}% profits`
                    this.addInvestmentAdvice(Action.REDUCESHORT, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            default: throw new Error(`you detected an interesting situation`)

        }
    }


    protected async checkSetup(longPosition: any, shortPosition: any, investmentOption: InvestmentOption): Promise<void> {
        if (longPosition === undefined) {

            const investmentAdvice: InvestmentAdvice = {
                action: Action.BUY,
                amount: investmentOption.minTradingAmount,
                pair: investmentOption.pair,
                reason: `we open a ${investmentOption.pair} long position to play the game`
            }

            this.currentInvestmentAdvices.push(investmentAdvice)

        }

        if (shortPosition === undefined) {

            const investmentAdvice: InvestmentAdvice = {
                action: Action.SELL,
                amount: investmentOption.minTradingAmount,
                pair: investmentOption.pair,
                reason: `we open a ${investmentOption.pair} short position to play the game`
            }

            this.currentInvestmentAdvices.push(investmentAdvice)

        }

    }


    protected async checkCloseAll(investmentOption: InvestmentOption, investmentDecisionBase: InvestmentDecisionBase, liquidityLevel: number, overallPNL: number, longPosition: any, shortPosition: any): Promise<void> {

        let specificmessage = ""

        if (investmentDecisionBase.accountInfo.result.USDT.equity < investmentDecisionBase.minimumReserve) {
            specificmessage = "an equity drop"
        } else if (liquidityLevel === 0) {
            specificmessage = "a liquidity crisis"

        } else if (overallPNL > this.oPNLClosingLimit) {
            specificmessage = `an overall PNL of ${overallPNL}`
        }

        const investmentAdvice: InvestmentAdvice = {
            action: Action.REDUCELONG,
            amount: longPosition.data.size,
            pair: investmentOption.pair,
            reason: `we close ${longPosition.data.size} ${investmentOption.pair} long due to ${specificmessage}`
        }

        this.currentInvestmentAdvices.push(investmentAdvice)

        const investmentAdvice2: InvestmentAdvice = {
            action: Action.REDUCESHORT,
            amount: shortPosition.data.size,
            pair: investmentOption.pair,
            reason: `we close ${longPosition.data.size} ${investmentOption.pair} short due to ${specificmessage}`
        }

        this.currentInvestmentAdvices.push(investmentAdvice2)

        if (overallPNL <= this.oPNLClosingLimit) {
            const investmentAdvice3: InvestmentAdvice = {
                action: Action.PAUSE,
                amount: 0,
                pair: '',
                reason: `we pause the game due to ${specificmessage}`
            }

            this.currentInvestmentAdvices.push(investmentAdvice3)
        }
    }


    protected async narrowingDownDiffPNL(investmentOption: InvestmentOption): Promise<void> {

        const investmentAdvice: InvestmentAdvice = {
            action: Action.BUY,
            amount: investmentOption.minTradingAmount,
            pair: investmentOption.pair,
            reason: `we enhance both positions to narrow down the diff pnl`
        }

        this.currentInvestmentAdvices.push(investmentAdvice)

        const investmentAdvice2: InvestmentAdvice = {
            action: Action.SELL,
            amount: investmentOption.minTradingAmount,
            pair: investmentOption.pair,
            reason: `we enhance both positions to narrow down the diff pnl`
        }

        this.currentInvestmentAdvices.push(investmentAdvice2)

    }


    protected addInvestmentAdvice(action: Action, amount: number, pair: string, reason: string) {

        const investmentAdvice: InvestmentAdvice = {
            action,
            amount,
            pair,
            reason
        }

        this.currentInvestmentAdvices.push(investmentAdvice)

        this.lastAdviceDate = new Date()

    }

    protected getAddingPointLong(): number {

        let aPL = (this.longShortDeltaInPercent < 0) ?
            -11 :
            (Math.abs(this.longShortDeltaInPercent) * -4) - 11

        if (this.isPreviousAdviceOlderThanXMinutes(4)) {
            aPL = aPL / this.liquidityLevel
        }

        return aPL

    }


    protected getAddingPointShort(): number {

        let aPS = (this.longShortDeltaInPercent < 0) ?
            (Math.abs(this.longShortDeltaInPercent) * -7) - 11 :
            - 11

        if (this.isPreviousAdviceOlderThanXMinutes(5)) {
            aPS = aPS / this.liquidityLevel
        }

        return aPS

    }


    protected getClosingPointLong(): number {

        return (this.longShortDeltaInPercent < 0) ?
            Math.abs(this.longShortDeltaInPercent) * 7 + 45 :
            45

    }


    protected getClosingPointShort(): number {

        return (this.longShortDeltaInPercent > 0) ?
            this.longShortDeltaInPercent * 7 + 36 :
            36

    }

}