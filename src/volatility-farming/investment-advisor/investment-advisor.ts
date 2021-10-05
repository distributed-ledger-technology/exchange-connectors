
// this is a slightly opinionated (long) investment advisor
// it serves edcucational purposes and shall inspire friends to implement different strategies and apply them within this network
// https://www.math3d.org/2cj0XobI 

import { LogSchema } from "../volatility-farmer/persistency/interfaces.ts";
import { MongoService } from "../volatility-farmer/persistency/mongo-service.ts";
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


    public constructor(private apiKey: string, private mongoService: MongoService | undefined) { }


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
                    reason: `it seems we shall close ${longPosition.data.size} ${investmentOption.pair} long due to ${specificmessage}`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.REDUCESHORT,
                    amount: shortPosition.data.size,
                    pair: investmentOption.pair,
                    reason: `it seems we shall close ${longPosition.data.size} ${investmentOption.pair} short due to ${specificmessage}`
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
                    reason: `it seems we shall enhance both positions to narrow down the diff pnl`
                }

                this.currentInvestmentAdvices.push(investmentAdvice)

                const investmentAdvice2: InvestmentAdvice = {
                    action: Action.SELL,
                    amount: investmentOption.minTradingAmount,
                    pair: investmentOption.pair,
                    reason: `it seems we shall enhance both positions to narrow down the diff pnl`
                }

                this.currentInvestmentAdvices.push(investmentAdvice2)
            }

        } else if (longPosition !== undefined && shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            switch (move) {
                case Action.BUY: {

                    let addingPointLong = this.getAddingPointLong(longShortDeltaInPercent, liquidityLevel)
                    let pnlLong = this.getPNLOfPositionInPercent(longPosition)

                    const message = `adding point long: ${addingPointLong.toFixed(2)} (${pnlLong})`
                    console.log(message)

                    const log: LogSchema = {
                        _id: { $oid: "" },
                        apiKey: this.apiKey,
                        utcTime: new Date().toISOString(),
                        message,
                    }

                    void MongoService.saveLog(this.mongoService, log)

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

                    const message = `adding point short: ${addingPointShort.toFixed(2)} (${pnlShort})`
                    console.log(message)

                    const log: LogSchema = {
                        _id: { $oid: "" },
                        apiKey: this.apiKey,
                        utcTime: new Date().toISOString(),
                        message,
                    }

                    void MongoService.saveLog(this.mongoService, log)

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
                    const message = `closing point long: ${closingPointLong.toFixed(2)} (${pnlLong})`
                    console.log(message)

                    const log: LogSchema = {
                        _id: { $oid: "" },
                        apiKey: this.apiKey,
                        utcTime: new Date().toISOString(),
                        message,
                    }

                    void MongoService.saveLog(this.mongoService, log)

                    if (pnlLong > closingPointLong && longPosition.data.size > investmentOption.minTradingAmount) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCELONG,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall reduce our ${investmentOption.pair} long position to realize ${pnlLong}% profits`
                        }

                        this.currentInvestmentAdvices.push(investmentAdvice)
                    }

                    break

                }


                case Action.REDUCESHORT: {

                    let closingPointShort = this.getClosingPointShort(longShortDeltaInPercent)
                    let pnlShort = this.getPNLOfPositionInPercent(shortPosition)
                    const message = `closing point short: ${closingPointShort.toFixed(2)} (${pnlShort})`
                    console.log(message)

                    const log: LogSchema = {
                        _id: { $oid: "" },
                        apiKey: this.apiKey,
                        utcTime: new Date().toISOString(),
                        message,
                    }

                    void MongoService.saveLog(this.mongoService, log)

                    if (pnlShort > closingPointShort && shortPosition.data.size > investmentOption.minTradingAmount) {

                        const investmentAdvice: InvestmentAdvice = {
                            action: Action.REDUCESHORT,
                            amount: investmentOption.minTradingAmount,
                            pair: investmentOption.pair,
                            reason: `it seems we shall reduce our ${investmentOption.pair} short position to realize ${pnlShort}% profits`
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

        let aPL = (Math.abs(longShortDeltaInPercent) * -4) - 7

        return aPL

    }


    protected getAddingPointShort(longShortDeltaInPercent: number, liquidityLevel: number): number {

        let aPS = (Math.abs(longShortDeltaInPercent) * -7) - 11

        return aPS

    }


    protected getClosingPointLong(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent <= -10) ?
            Math.abs(longShortDeltaInPercent) * 7 + 36 :
            36

    }


    protected getClosingPointShort(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent >= 10) ?
            Math.abs(longShortDeltaInPercent) * 7 + 36 :
            36

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