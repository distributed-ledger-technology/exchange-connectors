
// this is a slightly opinionated (long) investment advisor
// it serves edcucational purposes and shall inspire friends to implement different strategies and apply them within this network
// https://www.math3d.org/2cj0XobI 

import { LogSchema } from "../volatility-farmer/persistency/interfaces.ts";
import { MongoService } from "../volatility-farmer/persistency/mongo-service.ts";
import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption, InvestmentDecisionBase, IPosition } from "./interfaces.ts"
import { sleep } from "https://deno.land/x/sleep@v1.2.0/mod.ts";
import { FinancialCalculator } from "../../utility-boxes/financial-calculator.ts";
import { VFLogger } from "../../utility-boxes/logger.ts";



const investmentOptions: InvestmentOption[] = [
    {
        pair: "BTCUSDT",
        minTradingAmount: 0.001
    }
]

export class InvestmentAdvisor implements IInvestmentAdvisor {

    private currentInvestmentAdvices: InvestmentAdvice[] = []


    public constructor(private apiKey: string, private mongoService: MongoService | undefined) { }


    public async getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        // console.log(investmentDecisionBase)
        for (const investmentOption of investmentOptions) {
            for (const move of Object.values(Action)) {
                await sleep(0.05)
                await this.deriveInvestmentAdvice(investmentOption, move, investmentDecisionBase)

            }

        }

        return this.currentInvestmentAdvices

    }

    protected async deriveSpecialCaseMoves(investmentOption: InvestmentOption, lsd: number, investmentDecisionBase: InvestmentDecisionBase, longPosition: any, shortPosition: any, liquidityLevel: number): Promise<void> {

        let overallPNL = 0
        try {
            overallPNL = FinancialCalculator.getOverallPNLInPercent(longPosition, shortPosition)
        } catch (error) {
            // this error can occor when there are no appropriate positions open ... can be ignored
        }

        if (investmentDecisionBase.accountInfo.result.USDT.equity < investmentDecisionBase.minimumReserve || liquidityLevel === 0 || overallPNL > 36) {

            let specificmessage = ""

            if (investmentDecisionBase.accountInfo.result.USDT.equity < investmentDecisionBase.minimumReserve) {
                specificmessage = "an equity drop"
            } else if (liquidityLevel === 0) {
                specificmessage = "a liquidity crisis"

            } else if (overallPNL > 36) {
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

            if (overallPNL <= 36) {
                const investmentAdvice3: InvestmentAdvice = {
                    action: Action.PAUSE,
                    amount: 0,
                    pair: '',
                    reason: `we pause the game due to ${specificmessage}`
                }

                this.currentInvestmentAdvices.push(investmentAdvice3)
            }

        } else if (longPosition !== undefined && shortPosition !== undefined && shortPosition.data.unrealised_pnl < 0 && longPosition.data.unrealised_pnl < 0 && liquidityLevel > 10) {
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

        } else if (lsd < -70 && liquidityLevel > 17 && longPosition !== undefined && shortPosition !== undefined) {

            const investmentAdvice: InvestmentAdvice = {
                action: Action.SELL,
                amount: shortPosition.data.size * 3,
                pair: investmentOption.pair,
                reason: `we boost the loosing position to get out of that shit quickly :)`
            }

            this.currentInvestmentAdvices.push(investmentAdvice)

        } else {

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

    }


    protected async deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action, investmentDecisionBase: InvestmentDecisionBase): Promise<void> {

        // console.log(investmentDecisionBase.positions)
        const longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(investmentDecisionBase.positions)
        const liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20

        const longPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]
        const shortPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell')[0]

        console.log(`longShortDeltaInPercent : ${longShortDeltaInPercent}`)

        if (move === Action.PAUSE) { // here just to ensure the following block is executed only once

            await this.deriveSpecialCaseMoves(investmentOption, longShortDeltaInPercent, investmentDecisionBase, longPosition, shortPosition, liquidityLevel)

        } else if (longPosition !== undefined && shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            await this.deriveStandardMoves(investmentOption, longShortDeltaInPercent, move, longPosition, shortPosition, liquidityLevel)

        }

    }

    protected async deriveStandardMoves(investmentOption: InvestmentOption, lsd: number, move: Action, longPosition: any, shortPosition: any, liquidityLevel: number): Promise<void> {

        switch (move) {

            case Action.BUY: {

                let addingPointLong = this.getAddingPointLong(lsd, liquidityLevel)
                let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longPosition)

                const message = `adding point long: ${addingPointLong.toFixed(2)} (${pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (pnlLong < addingPointLong) {
                    const reason = `we enhance our ${investmentOption.pair} long position due to a great price`
                    this.addInvestmentAdvice(Action.BUY, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            case Action.SELL: {

                let addingPointShort = this.getAddingPointShort(lsd, liquidityLevel)
                let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortPosition)

                const message = `adding point short: ${addingPointShort.toFixed(2)} (${pnlShort})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (pnlShort < addingPointShort) {
                    const reason = `we enhance our ${investmentOption.pair} short position due to a great price`
                    this.addInvestmentAdvice(Action.SELL, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break
            }

            case Action.REDUCELONG: {

                let closingPointLong = this.getClosingPointLong(lsd)
                let pnlLong = FinancialCalculator.getPNLOfPositionInPercent(longPosition)

                const message = `closing point long: ${closingPointLong.toFixed(2)} (${pnlLong})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (pnlLong > closingPointLong && longPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} long position to realize ${pnlLong}% profits`
                    this.addInvestmentAdvice(Action.REDUCELONG, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            case Action.REDUCESHORT: {

                let closingPointShort = this.getClosingPointShort(lsd)
                let pnlShort = FinancialCalculator.getPNLOfPositionInPercent(shortPosition)

                const message = `closing point short: ${closingPointShort.toFixed(2)} (${pnlShort})`
                await VFLogger.log(message, this.apiKey, this.mongoService)

                if (pnlShort > closingPointShort && shortPosition.data.size > investmentOption.minTradingAmount) {
                    const reason = `we reduce our ${investmentOption.pair} short position to realize ${pnlShort}% profits`
                    this.addInvestmentAdvice(Action.REDUCESHORT, investmentOption.minTradingAmount, investmentOption.pair, reason)
                }

                break

            }

            default: throw new Error(`you detected an interesting situation`)

        }
    }

    protected addInvestmentAdvice(action: Action, amount: number, pair: string, reason: string) {

        const investmentAdvice: InvestmentAdvice = {
            action,
            amount,
            pair,
            reason
        }

        this.currentInvestmentAdvices.push(investmentAdvice)
    }

    protected getAddingPointLong(longShortDeltaInPercent: number, liquidityLevel: number): number {

        let aPL = (longShortDeltaInPercent < 0) ?
            -11 :
            (Math.abs(longShortDeltaInPercent) * -4) - 11

        return aPL

    }


    protected getAddingPointShort(longShortDeltaInPercent: number, liquidityLevel: number): number {

        let aPS = (longShortDeltaInPercent < 0) ?
            (Math.abs(longShortDeltaInPercent) * -7) - 11 :
            - 11

        return aPS

    }


    protected getClosingPointLong(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent < 0) ?
            Math.abs(longShortDeltaInPercent) * 7 + 36 :
            36

    }


    protected getClosingPointShort(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent > 0) ?
            longShortDeltaInPercent * 7 + 36 :
            36

    }

}