import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption } from "./interfaces.ts"



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

                let addingPointLong = (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170)

                if (investmentDecisionBase.longShortDeltaInPercent > 0) {
                    addingPointLong = addingPointLong - Math.pow(investmentDecisionBase.longShortDeltaInPercent, 1.3)
                }
                console.log(addingPointLong)

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

                let addingPointShort = (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170)

                if (investmentDecisionBase.longShortDeltaInPercent < 0) {
                    addingPointShort = addingPointShort - ((Math.pow(investmentDecisionBase.longShortDeltaInPercent, 2) / 20))
                }

                console.log(addingPointShort)

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

                console.log(`calculating closing point for move ${move} with ${investmentDecisionBase.liquidityLevel}^1.7 - 170 - ${investmentDecisionBase.longShortDeltaInPercent}^2 / 20`)
                // const addingPointLong = (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170) - Math.pow(investmentDecisionBase.longShortDeltaInPercent, 1.3)
                // console.log(addingPointLong)

                // if (investmentDecisionBase.unrealizedProfitsLong < addingPointLong) {
                //     const investmentAdvice: InvestmentAdvice = {
                //         action: move,
                //         amount: investmentOption.tradingAmount,
                //         pair: investmentOption.pair,
                //     }

                //     this.currentInvestmentAdvices.push(investmentAdvice)
                // }
                break

            }

            case Action.REDUCESHORT: {
                const addingPointLong = (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170) - Math.pow(investmentDecisionBase.longShortDeltaInPercent, 1.3)
                // console.log(addingPointLong)

                // if (investmentDecisionBase.unrealizedProfitsLong < addingPointLong) {
                //     const investmentAdvice: InvestmentAdvice = {
                //         action: move,
                //         amount: investmentOption.tradingAmount,
                //         pair: investmentOption.pair,
                //     }

                //     // this.currentInvestmentAdvices.push(investmentAdvice)
                // }
                break
            }
            default: throw new Error(`you detected an interesting situation`)
        }

    }
}