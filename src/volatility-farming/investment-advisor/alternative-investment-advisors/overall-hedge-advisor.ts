import { InvestmentDecisionBase, InvestmentAdvice, Action, IPosition } from "../interfaces.ts";
import { Request } from "../../../../deps.ts";
import { FinancialCalculator } from "../../../utility-boxes/financial-calculator.ts";

export class OverallHedgeAdvisor {

    private hedgeLongPosition: IPosition | undefined
    private hedgeShortPosition: IPosition | undefined
    private hedgePositionPair = 'BTCUSDT'
    private hedgePositionTradingAmount = 0.001
    private currentInvestmentAdvices: InvestmentAdvice[] = []
    private hedgePNLLong = 0
    private hedgePNLShort = 0


    public async getRecommendedOverallHedgeMoves(investmentDecisionBase: InvestmentDecisionBase): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        const assetsUnderManagementDemoAccounts = await Request.get(`https://openforce.de/getAssetsUnderManagementDemoAccounts`) as any

        // console.log(assetsUnderManagementDemoAccounts)
        const lsd = assetsUnderManagementDemoAccounts.longPosSum - assetsUnderManagementDemoAccounts.shortPosSum

        this.hedgeLongPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy' && p.data.symbol === this.hedgePositionPair)[0]
        this.hedgeShortPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell' && p.data.symbol === this.hedgePositionPair)[0]

        let investmentAdviceOverallHedge: InvestmentAdvice | undefined

        if (this.hedgeLongPosition === undefined) {

            const message = `we shall open an overall hedge long ${this.hedgePositionPair} position`

            console.log(message)

            investmentAdviceOverallHedge = {
                action: Action.BUY,
                amount: this.hedgePositionTradingAmount,
                pair: this.hedgePositionPair,
                reason: message
            }


        } else if (this.hedgeShortPosition === undefined) {

            const message = `we shall open an overall hedge short ${this.hedgePositionPair} position`

            console.log(message)

            investmentAdviceOverallHedge = {
                action: Action.SELL,
                amount: this.hedgePositionTradingAmount,
                pair: this.hedgePositionPair,
                reason: message
            }

        } else if (lsd > 0.1) {

            const message = `we shall hedge against about ${lsd} ${this.hedgePositionPair} long - adding 0.001 to short ${this.hedgePositionPair} position`

            console.log(message)

            investmentAdviceOverallHedge = {
                action: Action.SELL,
                amount: this.hedgePositionTradingAmount,
                pair: this.hedgePositionPair,
                reason: message
            }

        } else if (lsd < -0.1) {

            const message = `we shall hedge against about ${lsd} ${this.hedgePositionPair} short - adding to long ${this.hedgePositionPair} position`

            console.log(message)

            investmentAdviceOverallHedge = {
                action: Action.BUY,
                amount: this.hedgePositionTradingAmount,
                pair: this.hedgePositionPair,
                reason: message
            }

        } else if (Math.abs(lsd) < 0.3) {


            this.hedgePNLLong = FinancialCalculator.getPNLOfPositionInPercent(this.hedgeLongPosition)
            this.hedgePNLShort = FinancialCalculator.getPNLOfPositionInPercent(this.hedgeShortPosition)

            if (this.hedgePNLShort > 54) { // we reduce short first as we are slightly opinionated long - betting on rising BTC and ETH prices

                const message = `we can sell from winning ${this.hedgePositionPair} short hedge position (pnl: ${this.hedgePNLLong})`
                console.log(message)

                investmentAdviceOverallHedge = {
                    action: Action.REDUCESHORT,
                    amount: this.hedgePositionTradingAmount,
                    pair: this.hedgePositionPair,
                    reason: message
                }

            } else if (this.hedgePNLLong > 54) {

                const message = `we can sell from winning ${this.hedgePositionPair} long hedge position (pnl: ${this.hedgePNLLong})`
                console.log(message)

                investmentAdviceOverallHedge = {
                    action: Action.REDUCELONG,
                    amount: this.hedgePositionTradingAmount,
                    pair: this.hedgePositionPair,
                    reason: message
                }

            }

        }

        if (investmentAdviceOverallHedge !== undefined) {
            this.currentInvestmentAdvices.push(investmentAdviceOverallHedge)
        }

        console.log(this.currentInvestmentAdvices.length)
        return this.currentInvestmentAdvices

    }
}