export class FinancialCalculator {


    public static getOverallPNLInPercent(longPosition: any, shortPosition: any) {

        let absolutePNL = longPosition.data.unrealised_pnl + shortPosition.data.unrealised_pnl

        let absoluteValue = longPosition.data.position_value + shortPosition.data.position_value

        return absolutePNL * 100 / (absoluteValue / longPosition.data.leverage)

    }


    public static getPNLOfPositionInPercent(position: any): number {

        return Number((position.data.unrealised_pnl * 100 / (position.data.position_value / position.data.leverage)).toFixed(2))

    }

    public static getLongShortDeltaInPercent(positions: any[]): number {

        const sumOfLongValues = FinancialCalculator.getSumOfValues('Buy', positions)
        const sumOfShortValues = FinancialCalculator.getSumOfValues('Sell', positions)

        const deltaLongShort = Number((sumOfLongValues - sumOfShortValues).toFixed(2))
        const totalOpenPositionValue = Number((sumOfLongValues + sumOfShortValues).toFixed(2))

        let deltaLongShortInPercent = deltaLongShort * 100 / totalOpenPositionValue

        return deltaLongShortInPercent

    }



    public static getSumOfValues(side: string, activePositions: any[], pair?: string): number {

        let sum = 0

        const positions = activePositions.filter((p: any) => p.data.side === side)

        for (const position of positions) {
            if (pair === undefined) {
                sum = sum + position.data.position_value
            } else if (position.data.symbol === pair) {
                sum = sum + position.data.position_value
            }
        }

        return sum

    }

}