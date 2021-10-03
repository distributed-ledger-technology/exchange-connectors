import { InvestmentDecisionBase } from "./investment-advisor.ts"


export class InvestmentCalculator {


    public getAddingPointLong(investmentDecisionBase: InvestmentDecisionBase): number {

        return (investmentDecisionBase.longShortDeltaInPercent > 0) ?
            (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170) - Math.pow(investmentDecisionBase.longShortDeltaInPercent, 1.3) :
            (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170)

    }


    public getAddingPointShort(investmentDecisionBase: InvestmentDecisionBase): number {

        return (investmentDecisionBase.longShortDeltaInPercent < 0) ?
            (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170) - ((Math.pow(investmentDecisionBase.longShortDeltaInPercent, 2) / 20)) :
            (Math.pow(investmentDecisionBase.liquidityLevel, 1.7) - 170)

    }


    public getClosingPointLong(investmentDecisionBase: InvestmentDecisionBase): number {

        return (investmentDecisionBase.longShortDeltaInPercent <= 0) ?
            24 :
            (Math.log((1 / Math.pow(investmentDecisionBase.longShortDeltaInPercent, 5)))) + 24

    }


    public getClosingPointShort(investmentDecisionBase: InvestmentDecisionBase): number {

        return (investmentDecisionBase.longShortDeltaInPercent >= 0) ?
            24 :
            (Math.log((1 / Math.pow(-investmentDecisionBase.longShortDeltaInPercent, 5)))) + 24

    }

}