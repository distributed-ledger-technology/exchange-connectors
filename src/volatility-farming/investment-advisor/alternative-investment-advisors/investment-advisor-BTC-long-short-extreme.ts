
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

        this.longPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === this.investmentOptions[0].pair)[0]
        this.shortPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === this.investmentOptions[0].pair)[0]

        this.addingPointLong = this.getAddingPointLong()
        this.addingPointShort = this.getAddingPointShort()
        this.closingPointLong = this.getClosingPointLong()
        this.closingPointShort = this.getClosingPointShort()


        this.pnlLong = FinancialCalculator.getPNLOfPositionInPercent(this.longPosition)
        this.pnlShort = FinancialCalculator.getPNLOfPositionInPercent(this.shortPosition)


        for (const investmentOption of this.investmentOptions) {
            for (const move of Object.values(Action)) {
                await sleep(0.1)
                await this.deriveInvestmentAdvice(investmentOption, move)
            }

        }

        return this.currentInvestmentAdvices

    }


    protected async deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action): Promise<void> {


        if (move === Action.PAUSE) { // here just to ensure the following block is executed only once

            this.deriveSpecialMoves(investmentOption)

        } else if (this.longPosition !== undefined && this.shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            await this.deriveStandardMoves(investmentOption, move)

        }

    }


    protected deriveSpecialMoves(investmentOption: InvestmentOption): void {

        let overallPNL = 0
        try {
            overallPNL = FinancialCalculator.getOverallPNLInPercent(this.longPosition, this.shortPosition)
        } catch (error) {
            console.log(error.message)
        }

        this.oPNLClosingLimit = Math.round(Math.random() * (81 - 56) + 56)

        if (this.liquidityLevel === 0) {

            this.closeAll(investmentOption, "a liquidity crisis")

        } else if (overallPNL > this.oPNLClosingLimit) {

            this.closeAll(investmentOption, `an overall PNL of ${overallPNL}`)

        } else if (this.longPosition !== undefined && this.shortPosition !== undefined &&
            this.liquidityLevel > this.minimumLLForNarrowingDownDiffPNL &&
            (this.shortPosition.data.unrealised_pnl < 0 && this.longPosition.data.unrealised_pnl < 0)) {

            this.narrowDownDiffPNL(investmentOption)

        } else {

            this.checkSetup(investmentOption)

        }

    }


    protected isPreviousAdviceOlderThanXMinutes(minutes: number): boolean {

        const refDate = new Date();

        refDate.setMinutes(refDate.getMinutes() - minutes);

        if (this.lastAdviceDate < refDate) {
            const message = `lastAdviceDate :${this.lastAdviceDate} vs. refDate: ${refDate}`
            console.log(message)
            return true
        }

        return false
    }


    protected amIFarAwayFromAnyRegularMove(): boolean {

        const addingPointLongDelta = this.pnlLong - this.addingPointLong

        const addingPointShortDelta = this.pnlShort - this.addingPointShort

        const closingPointLongDelta = this.pnlLong - this.closingPointLong

        const closingPointShortDelta = this.pnlShort - this.closingPointShort

        const minDelta = 50

        const result = (Math.abs(addingPointLongDelta) > minDelta &&
            Math.abs(addingPointShortDelta) > minDelta &&
            Math.abs(closingPointLongDelta) > minDelta &&
            Math.abs(closingPointShortDelta) > minDelta)

        if (result) {

            return this.isPreviousAdviceOlderThanXMinutes(20)

        }

        return false

    }


    protected async deriveStandardMoves(investmentOption: InvestmentOption, move: Action): Promise<void> {

        switch (move) {

            case Action.BUY: {

                const message = `adding point long: ${this.addingPointLong.toFixed(2)} (${this.pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlLong < this.addingPointLong || (this.amIFarAwayFromAnyRegularMove() &&
                    (this.longPosition !== undefined && this.shortPosition !== undefined &&
                        this.longPosition.data.size < this.shortPosition.data.size))) {
                    let factor = Math.floor(Math.abs(this.longShortDeltaInPercent) / 10)
                    if (factor < 1) factor = 1
                    const amount = Number((investmentOption.minTradingAmount * factor).toFixed(3))
                    const reason = `we enhance our ${investmentOption.pair} long position (at a pnl of: ${this.pnlLong}%) by ${amount}`
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

                    let factor = Math.floor(Math.abs(this.longShortDeltaInPercent) / 10)
                    if (factor < 1) factor = 1
                    const amount = Number((investmentOption.minTradingAmount * factor).toFixed(3))
                    const reason = `we enhance our ${investmentOption.pair} short position (at a pnl of: ${this.pnlShort}%) by ${amount}`
                    this.addInvestmentAdvice(Action.SELL, amount, investmentOption.pair, reason)
                }

                break
            }

            case Action.REDUCELONG: {

                const message = `closing point long: ${this.closingPointLong.toFixed(2)} (${this.pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlLong > this.closingPointLong && this.longPosition !== undefined && this.longPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} long position to realize ${this.pnlLong}% profits`
                    this.addInvestmentAdvice(Action.REDUCELONG, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            case Action.REDUCESHORT: {

                const message = `closing point short: ${this.closingPointShort.toFixed(2)} (${this.pnlShort})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (this.pnlShort > this.closingPointShort && this.shortPosition !== undefined && this.shortPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} short position to realize ${this.pnlShort}% profits`
                    this.addInvestmentAdvice(Action.REDUCESHORT, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            default: throw new Error(`you detected an interesting situation`)

        }
    }


    protected checkSetup(investmentOption: InvestmentOption): void {
        if (this.longPosition === undefined) {

            this.addInvestmentAdvice(Action.BUY, investmentOption.minTradingAmount, investmentOption.pair, `we open a ${investmentOption.pair} long position to play the game`)

        }

        if (this.shortPosition === undefined) {

            this.addInvestmentAdvice(Action.SELL, investmentOption.minTradingAmount, investmentOption.pair, `we open a ${investmentOption.pair} short position to play the game`)

        }

    }


    protected closeAll(investmentOption: InvestmentOption, specificmessage: string): void {

        if (this.longPosition !== undefined) {

            this.addInvestmentAdvice(Action.REDUCELONG, Number((this.longPosition.data.size).toFixed(3)), investmentOption.pair, `we close ${this.longPosition.data.size} ${investmentOption.pair} long due to ${specificmessage}`)
        }

        if (this.shortPosition !== undefined) {

            this.addInvestmentAdvice(Action.REDUCESHORT, Number((this.shortPosition.data.size).toFixed(3)), investmentOption.pair, `we close ${this.shortPosition.data.size} ${investmentOption.pair} short due to ${specificmessage}`)

        }

    }


    protected narrowDownDiffPNL(investmentOption: InvestmentOption): void {

        this.addInvestmentAdvice(Action.BUY, investmentOption.minTradingAmount, investmentOption.pair, `we enhance both positions to narrow down the diff pnl (at a long pnl of: ${this.pnlLong}%)`)
        this.addInvestmentAdvice(Action.SELL, investmentOption.minTradingAmount, investmentOption.pair, `we enhance both positions to narrow down the diff pnl (at a short pnl of: ${this.pnlShort}%)`)

    }


    protected addInvestmentAdvice(action: Action, amount: number, pair: string, reason: string): void {

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

        if (this.isPreviousAdviceOlderThanXMinutes(7)) {
            aPL = aPL / this.liquidityLevel
        }

        return aPL

    }


    protected getAddingPointShort(): number {

        let aPS = (this.longShortDeltaInPercent < 0) ?
            (Math.abs(this.longShortDeltaInPercent) * -7) - 11 :
            - 11

        if (this.isPreviousAdviceOlderThanXMinutes(10)) {
            aPS = aPS / this.liquidityLevel
        }

        return aPS

    }


    protected getClosingPointLong(): number {

        let cPL = (this.longShortDeltaInPercent < 0) ?
            Math.abs(this.longShortDeltaInPercent) * 7 + 45 :
            45

        if (this.liquidityLevel < 3) {
            cPL = cPL / (10 - this.liquidityLevel)
        }

        return cPL

    }


    protected getClosingPointShort(): number {

        let cPS = (this.longShortDeltaInPercent > 0) ?
            this.longShortDeltaInPercent * 7 + 36 :
            36

        if (this.liquidityLevel < 3) {
            cPS = cPS / (10 - this.liquidityLevel)
        }

        return cPS
    }

}