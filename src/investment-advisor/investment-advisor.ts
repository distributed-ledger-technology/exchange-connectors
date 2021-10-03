
// https://www.math3d.org/2cj0XobI 

import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption } from "./interfaces.ts"
import { InvestmentCalculator } from "./investment-calculator.ts"

export interface InvestmentDecisionBase {
    longShortDeltaInPercent: number,
    liquidityLevel: number,
    unrealizedProfitsLong: number
    unrealizedProfitsShort: number
}


const investmentOptions: InvestmentOption[] = [
    {
        pair: "BTCUSDT",
        minTradingAmount: 0.001
    }
]

export class InvestmentAdvisor implements IInvestmentAdvisor {

    private currentInvestmentAdvices: InvestmentAdvice[] = []

    private investmentCalculator: InvestmentCalculator


    public constructor() {
        this.investmentCalculator = new InvestmentCalculator()
    }


    public getInvestmentAdvices(investmentDecisionBase: any): InvestmentAdvice[] {

        this.currentInvestmentAdvices = []

        for (const investmentOption of investmentOptions) {

            for (const move of Object.values(Action)) {

                this.deriveInvestmentAdvice(investmentOption, move, investmentDecisionBase)

            }

        }

        return this.currentInvestmentAdvices

    }

    protected deriveInvestmentAdvice(investmentOption: InvestmentOption, move: string, investmentDecisionBase: InvestmentDecisionBase): void {

        switch (move) {

            case Action.BUY: {

                let addingPointLong = this.investmentCalculator.getAddingPointLong(investmentDecisionBase)

                if (investmentDecisionBase.unrealizedProfitsLong < addingPointLong) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: move,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)

                }

                break

            }


            case Action.SELL: {

                let addingPointShort = this.investmentCalculator.getAddingPointShort(investmentDecisionBase)

                if (investmentDecisionBase.unrealizedProfitsShort < addingPointShort) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: move,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)

                }

                break
            }


            case Action.REDUCELONG: {

                let closingPointLong = this.investmentCalculator.getClosingPointLong(investmentDecisionBase)

                if (investmentDecisionBase.unrealizedProfitsLong > closingPointLong) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: move,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)
                }

                break

            }


            case Action.REDUCESHORT: {

                console.log(`calculating closing point for move ${move} with ${investmentDecisionBase.liquidityLevel} ${investmentDecisionBase.longShortDeltaInPercent}`)

                let closingPointShort = this.investmentCalculator.getClosingPointShort(investmentDecisionBase)

                if (investmentDecisionBase.unrealizedProfitsShort > closingPointShort) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: move,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)

                }

                break

            }


            default: throw new Error(`you detected an interesting situation`)
        }

    }

}