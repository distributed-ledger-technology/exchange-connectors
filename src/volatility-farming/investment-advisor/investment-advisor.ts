
// https://www.math3d.org/2cj0XobI 

import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption } from "./interfaces.ts"
import { InvestmentCalculator } from "./investment-calculator.ts"
import { ToolBox } from "../asset-manager/tool-box.ts"

export interface InvestmentDecisionBase {
    accountInfo: any,
    positions: any,
    minimumReserve: number
    // longShortDeltaInPercent: number,
    // liquidityLevel: number,
    // unrealizedProfitsLong: number
    // unrealizedProfitsShort: number
}

export interface IPosition {
    data: {
        side: string,
        size: number,
        position_value: number,
        leverage: number,
        unrealised_pnl: number,

    }
}

export interface IAccountInfo {
    result: {
        USDT: {
            available_balance: number,
            equity: number
        }
    }
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
            console.log("ups")
            console.log(Object.values(Action))
            for (const move of Object.values(Action)) {

                this.deriveInvestmentAdvice(investmentOption, move, investmentDecisionBase)

            }

        }

        return this.currentInvestmentAdvices

    }

    protected deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action, investmentDecisionBase: InvestmentDecisionBase): void {

        const longShortDeltaInPercent = this.getLongShortDeltaInPercent(investmentDecisionBase.positions)
        const liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20

        console.log(`liquidityLevel: ${liquidityLevel}`)
        const longPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]
        const shortPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell')[0]

        if (move === Action.PAUSE) { // here just to ensure the following block is executed once

            console.log("hey")
            console.log(investmentDecisionBase.accountInfo.result.USDT.equity)
            console.log(investmentDecisionBase.minimumReserve)
            if (investmentDecisionBase.accountInfo.result.USDT.equity < investmentDecisionBase.minimumReserve || liquidityLevel === 0) {


                const investmentAdvice: InvestmentAdvice = {
                    action: Action.REDUCELONG,
                    amount: longPosition.data.size,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.REDUCESHORT,
                    amount: longPosition.data.size,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice2)

                const investmentAdvice3: InvestmentAdvice = {
                    action: Action.PAUSE,
                    amount: 0,
                    pair: '',
                }

                this.currentInvestmentAdvices.push(investmentAdvice3)

            }

            if (longPosition === undefined) {

                const investmentAdvice: InvestmentAdvice = {
                    action: Action.BUY,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

            }


            if (shortPosition === undefined) {

                const investmentAdvice: InvestmentAdvice = {
                    action: Action.SELL,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

            }

            if (longPosition !== undefined && shortPosition !== undefined && shortPosition.data.unrealised_pnl < 0 && longPosition.data.unrealised_pnl < 0 && liquidityLevel > 10) {
                const investmentAdvice: InvestmentAdvice = {
                    action: Action.BUY,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.SELL,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                }

                this.currentInvestmentAdvices.push(investmentAdvice2)
            }

        } else if (longPosition !== undefined && shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            console.log(`move ${move}`)

            switch (move) {
                case Action.BUY: {

                    let addingPointLong = this.investmentCalculator.getAddingPointLong(longShortDeltaInPercent, liquidityLevel)

                    if (this.getPNLOfPositionInPercent(longPosition) < addingPointLong) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.BUY,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)

                    }

                    break

                }


                case Action.SELL: {

                    let addingPointShort = this.investmentCalculator.getAddingPointShort(longShortDeltaInPercent, liquidityLevel)

                    if (this.getPNLOfPositionInPercent(shortPosition) < addingPointShort) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.SELL,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)

                    }

                    break
                }


                case Action.REDUCELONG: {

                    let closingPointLong = this.investmentCalculator.getClosingPointLong(longShortDeltaInPercent)

                    console.log(`closingPointLong: ${closingPointLong}`)

                    if (this.getPNLOfPositionInPercent(longPosition) > closingPointLong) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCELONG,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)
                    }

                    break

                }


                case Action.REDUCESHORT: {

                    // console.log(`calculating closing point for move ${move} with ${investmentDecisionBase.liquidityLevel} ${investmentDecisionBase.longShortDeltaInPercent}`)

                    let closingPointShort = this.investmentCalculator.getClosingPointShort(longShortDeltaInPercent)

                    console.log(`closingPointShort: ${closingPointShort} --> ${this.getPNLOfPositionInPercent(shortPosition)}`)

                    if (this.getPNLOfPositionInPercent(shortPosition) > closingPointShort) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCESHORT,
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

    private getLongShortDeltaInPercent(positions: any[]): number {

        const sumOfLongValues = this.getSumOfValues('Buy', positions)
        const sumOfShortValues = this.getSumOfValues('Sell', positions)

        const deltaLongShort = Number((sumOfLongValues - sumOfShortValues).toFixed(2))
        const totalOpenPositionValue = Number((sumOfLongValues + sumOfShortValues).toFixed(2))

        let deltaLongShortInPercent = deltaLongShort * 100 / totalOpenPositionValue

        // console.log(`calculating deltaLongShortInPercent = ${deltaLongShort} * 100 / ${totalOpenPositionValue}`)

        return deltaLongShortInPercent

    }


    private getSumOfValues(side: string, activePositions: any[]): number {

        let sum = 0

        const positions = activePositions.filter((p: any) => p.data.side === side)

        for (const position of positions) {
            sum = sum + position.data.position_value
        }

        return sum

    }


    private getPNLOfPositionInPercent(position: any): number {

        return Number((position.data.unrealised_pnl * 100 / (position.data.position_value / position.data.leverage)).toFixed(2))

    }

}