
// https://www.math3d.org/2cj0XobI 

import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption } from "./interfaces.ts"

export interface InvestmentDecisionBase {
    accountInfo: any,
    positions: any,
    minimumReserve: number
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


    public constructor() { }


    public getInvestmentAdvices(investmentDecisionBase: any): InvestmentAdvice[] {

        this.currentInvestmentAdvices = []

        for (const investmentOption of investmentOptions) {
            for (const move of Object.values(Action)) {

                this.deriveInvestmentAdvice(investmentOption, move, investmentDecisionBase)

            }

        }

        return this.currentInvestmentAdvices

    }

    public getPNLOfPositionInPercent(position: any): number {

        return Number((position.data.unrealised_pnl * 100 / (position.data.position_value / position.data.leverage)).toFixed(2))

    }

    public getOverallPNLInPercent(longPosition: any, shortPosition: any) {

        let absolutePNL = longPosition.data.unrealised_pnl + shortPosition.data.unrealised_pnl

        let absoluteValue = longPosition.data.position_value + shortPosition.data.position_value

        return absolutePNL * 100 / (absoluteValue / longPosition.data.leverage)

    }

    public getLongShortDeltaInPercent(positions: any[]): number {

        const sumOfLongValues = this.getSumOfValues('Buy', positions)
        const sumOfShortValues = this.getSumOfValues('Sell', positions)

        const deltaLongShort = Number((sumOfLongValues - sumOfShortValues).toFixed(2))
        const totalOpenPositionValue = Number((sumOfLongValues + sumOfShortValues).toFixed(2))

        let deltaLongShortInPercent = deltaLongShort * 100 / totalOpenPositionValue

        return deltaLongShortInPercent

    }


    protected deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action, investmentDecisionBase: InvestmentDecisionBase): void {

        const longShortDeltaInPercent = this.getLongShortDeltaInPercent(investmentDecisionBase.positions)
        const liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20

        const longPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]
        const shortPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell')[0]

        if (move === Action.PAUSE) { // here just to ensure the following block is executed only once

            let overallPNL = 0
            try {
                overallPNL = this.getOverallPNLInPercent(longPosition, shortPosition)
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
                    reason: `it seems we shall close ${investmentOption.pair} long due to ${specificmessage}`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.REDUCESHORT,
                    amount: longPosition.data.size,
                    pair: investmentOption.pair,
                    reason: `it seems we shall close ${investmentOption.pair} short due to ${specificmessage}`
                }

                this.currentInvestmentAdvices.push(investmentAdvice2)

                if (overallPNL <= 36) {
                    const investmentAdvice3: InvestmentAdvice = {
                        action: Action.PAUSE,
                        amount: 0,
                        pair: '',
                        reason: `it seems we shall pause the game due to ${specificmessage}`
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice3)
                }

            }

            if (longPosition === undefined) {

                const investmentAdvice: InvestmentAdvice = {
                    action: Action.BUY,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                    reason: `it seems we shall open a ${investmentOption.pair} long position to play the game`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

            }


            if (shortPosition === undefined) {

                const investmentAdvice: InvestmentAdvice = {
                    action: Action.SELL,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                    reason: `it seems we shall open a ${investmentOption.pair} short position to play the game`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

            }

            if (longPosition !== undefined && shortPosition !== undefined && shortPosition.data.unrealised_pnl < 0 && longPosition.data.unrealised_pnl < 0 && liquidityLevel > 10) {
                const investmentAdvice: InvestmentAdvice = {
                    action: Action.BUY,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                    reason: `it seems we shall enhance our ${investmentOption.pair} long position to narrow down the diff pnl`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.SELL,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                    reason: `it seems we shall enhance our ${investmentOption.pair} short position to narrow down the diff pnl`
                }

                this.currentInvestmentAdvices.push(investmentAdvice2)
            }

        } else if (longPosition !== undefined && shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            switch (move) {
                case Action.BUY: {

                    let addingPointLong = this.getAddingPointLong(longShortDeltaInPercent, liquidityLevel)
                    let pnlLong = this.getPNLOfPositionInPercent(longPosition)

                    console.log(`aPL: ${addingPointLong.toFixed(2)} (${pnlLong})`)

                    if (pnlLong < addingPointLong) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.BUY,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall enhance our ${investmentOption.pair} long position due to a great price`
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)

                    }

                    break

                }


                case Action.SELL: {


                    let addingPointShort = this.getAddingPointShort(longShortDeltaInPercent, liquidityLevel)
                    let pnlShort = this.getPNLOfPositionInPercent(shortPosition)

                    console.log(`aPS: ${addingPointShort.toFixed(2)} (${pnlShort})`)

                    if (pnlShort < addingPointShort) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.SELL,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall enhance our ${investmentOption.pair} short position due to a great price`
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)

                    }

                    break
                }


                case Action.REDUCELONG: {

                    let closingPointLong = this.getClosingPointLong(longShortDeltaInPercent)
                    let pnlLong = this.getPNLOfPositionInPercent(longPosition)

                    console.log(`cPL: ${closingPointLong.toFixed(2)} (${pnlLong})`)

                    if (pnlLong > closingPointLong && longPosition.data.size > investmentOption.minTradingAmount) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCELONG,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall reduce our ${investmentOption.pair} long position to realize some profits`
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)
                    }

                    break

                }


                case Action.REDUCESHORT: {

                    let closingPointShort = this.getClosingPointShort(longShortDeltaInPercent)
                    let pnlShort = this.getPNLOfPositionInPercent(shortPosition)

                    console.log(`cPS: ${closingPointShort.toFixed(2)} (${pnlShort})`)

                    if (pnlShort > closingPointShort && shortPosition.data.size > investmentOption.minTradingAmount) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCESHORT,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall reduce our ${investmentOption.pair} short position to realize some profits`
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)

                    }

                    break

                }

                default: throw new Error(`you detected an interesting situation`)

            }
        }

    }


    protected getAddingPointLong(longShortDeltaInPercent: number, liquidityLevel: number): number {

        let aPL = (longShortDeltaInPercent > 0) ?
            (Math.pow(liquidityLevel, 1.7) - 170) - Math.pow(longShortDeltaInPercent, 1.3) :
            (Math.pow(liquidityLevel, 1.7) - 170)

        let slightlyOpinionatedAPL = aPL + 4 // we are in general long for crypto :)

        return slightlyOpinionatedAPL

    }


    protected getAddingPointShort(longShortDeltaInPercent: number, liquidityLevel: number): number {

        return (longShortDeltaInPercent < 0) ?
            (Math.pow(liquidityLevel, 1.7) - 170) - ((Math.pow(longShortDeltaInPercent, 2) / 20)) :
            (Math.pow(liquidityLevel, 1.7) - 170)

    }


    protected getClosingPointLong(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent <= -10) ?
            (Math.log((1 / Math.pow(longShortDeltaInPercent, 5)))) + 24 :
            24

    }


    protected getClosingPointShort(longShortDeltaInPercent: number): number {

        const magic = Math.pow(longShortDeltaInPercent, 5)
        // console.log(`${magic}`)

        return (longShortDeltaInPercent >= 10) ?
            (Math.log((1 / -magic))) + 24 :
            24

    }

    private getSumOfValues(side: string, activePositions: any[]): number {

        let sum = 0

        const positions = activePositions.filter((p: any) => p.data.side === side)

        for (const position of positions) {
            sum = sum + position.data.position_value
        }

        return sum

    }




}