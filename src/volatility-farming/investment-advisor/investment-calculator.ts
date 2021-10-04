import { InvestmentDecisionBase } from "./investment-advisor.ts"


export class InvestmentCalculator {


    public getAddingPointLong(longShortDeltaInPercent: number, liquidityLevel: number): number {

        return (longShortDeltaInPercent > 0) ?
            (Math.pow(liquidityLevel, 1.7) - 170) - Math.pow(longShortDeltaInPercent, 1.3) :
            (Math.pow(liquidityLevel, 1.7) - 170)

    }


    public getAddingPointShort(longShortDeltaInPercent: number, liquidityLevel: number): number {

        return (longShortDeltaInPercent < 0) ?
            (Math.pow(liquidityLevel, 1.7) - 170) - ((Math.pow(longShortDeltaInPercent, 2) / 20)) :
            (Math.pow(liquidityLevel, 1.7) - 170)

    }


    public getClosingPointLong(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent <= 0) ?
            24 :
            (Math.log((1 / Math.pow(longShortDeltaInPercent, 5)))) + 24

    }


    public getClosingPointShort(longShortDeltaInPercent: number): number {

        return (longShortDeltaInPercent >= 0) ?
            24 :
            (Math.log((1 / Math.pow(-longShortDeltaInPercent, 5)))) + 24

    }

}