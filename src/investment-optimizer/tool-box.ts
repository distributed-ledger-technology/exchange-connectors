import { IExchangeConnector } from "../interfaces/exchange-connector-interface.ts"
import { IActiveProcess } from "./investment-optimizer.ts"
import { DealSchema } from "./persistency/interfaces.ts"
import { MongoService } from "./persistency/mongo-service.ts"

export class ToolBox {

    private mongoService: MongoService | undefined

    public constructor(private activeProcess: IActiveProcess) {

    }

    private async buyFuture(pair: string, amount: number, reduceOnly: boolean, reason: string, accountInfo: any): Promise<void> {

        const r = await this.activeProcess.exchangeConnector.buyFuture(pair, amount, reduceOnly)
        console.log(r)

        if (r.ret_code === 0 && reason !== '') {

            const deal: DealSchema = {
                _id: { $oid: "" },
                apiKey: this.activeProcess.apiKey,
                utcTime: new Date().toISOString(),
                side: 'Buy',
                reduceOnly: false,
                reason: reason,
                asset: pair,
                equityBeforeThisDeal: accountInfo.result.USDT.equity
            }


            try {
                if (this.mongoService !== undefined) {
                    await this.mongoService.saveDeal(deal)
                }
            } catch (error) {
                console.log("shit happened wrt database")
            }

        }

    }


    private async sellFuture(pair: string, amount: number, reduceOnly: boolean, reason: string, accountInfo: any): Promise<void> {

        const r = await this.activeProcess.exchangeConnector.sellFuture(pair, amount, reduceOnly)
        console.log(r)

        if (r.ret_code === 0 && reason !== '') {

            const deal: DealSchema = {
                _id: { $oid: "" },
                apiKey: this.activeProcess.apiKey,
                utcTime: new Date().toISOString(),
                side: 'Sell',
                reduceOnly: false,
                reason: reason,
                asset: pair,
                equityBeforeThisDeal: accountInfo.result.USDT.equity

            }

            try {
                if (this.mongoService !== undefined) {
                    await this.mongoService.saveDeal(deal)
                }
            } catch (error) {
                console.log("shit happened wrt database")
            }



        }

    }


    private getIsLowestSinceX(value: number, array: number[]) {
        let counter = 0

        for (const e of array) {
            if (value > e) {
                return counter
            }

            counter += 1
        }

        return counter
    }


    private getIsHighestSinceX(value: number, array: number[]) {
        let counter = 0

        for (const e of array) {
            if (value < e) {
                return counter
            }

            counter += 1
        }

        return counter
    }


    public getOverallPNLInPercent(positions: any[]) {

        let absolutePNL = 0
        let absoluteValue = 0
        let leverage = 0

        for (const position of positions) {
            if (leverage === 0) {
                leverage = position.data.leverage
            } else if (leverage !== position.data.leverage) {
                throw new Error(`I can't calculate the overall PNL when you give me position with different leverages atm.`)
            }
            absolutePNL = absolutePNL + position.data.unrealised_pnl
            absoluteValue = absoluteValue + position.data.position_value
        }

        return absolutePNL * 100 / (absoluteValue / leverage)

    }


    private async closePosition(position: any, reason: string, accountInfo: any) {


        if (position !== undefined && position.data.side === 'Sell') {

            console.log(`I buy back short sold ${position.data.size} ${position.data.symbol} in close Positions`)

            await this.buyFuture(position.data.symbol, position.data.size, true, reason, accountInfo)

        } else if (position !== undefined && position.data.side === 'Buy') {

            console.log(`I sell ${position.data.size} ${position.data.symbol} from existing long position in close Positions`)

            await this.sellFuture(position.data.symbol, position.data.size, true, reason, accountInfo)

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


    private async addToPosition(position: any, reason: string, factor = 1, accountInfo: any): Promise<void> {

        if (position.data.side === 'Sell') {

            console.log(`I short sell more of ${position.data.symbol}`)

            await this.sellFuture(position.data.symbol, Number((this.activeProcess.tradingAmount * factor).toFixed(3)), false, reason, accountInfo)

        } else if (position.data.side === 'Buy') {

            console.log(`I buy more of ${position.data.symbol}`)

            await this.buyFuture(position.data.symbol, Number((this.activeProcess.tradingAmount * factor).toFixed(3)), false, reason, accountInfo)

        }

    }


    private async reducePosition(position: any, reason: string = "", accountInfo: any): Promise<void> {

        if (position.data.size > this.activeProcess.tradingAmount) {

            if (position.data.side === 'Sell') {

                console.log(`I reduce the short position by ${this.activeProcess.tradingAmount}`)
                await this.buyFuture(position.data.symbol, this.activeProcess.tradingAmount, true, reason, accountInfo)

            } else if (position.data.side === 'Buy') {

                console.log(`I reduce the long position by ${this.activeProcess.tradingAmount}`)
                await this.sellFuture(position.data.symbol, this.activeProcess.tradingAmount, true, reason, accountInfo)

            }

        }

    }

}