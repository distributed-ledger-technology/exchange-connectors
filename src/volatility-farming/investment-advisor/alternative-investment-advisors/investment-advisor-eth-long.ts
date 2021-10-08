
// this is a slightly opinionated (long) investment advisor
// it serves edcucational purposes and shall inspire friends to implement different strategies and apply them within this network
// https://www.math3d.org/2cj0XobI 

import { IInvestmentAdvisor, InvestmentAdvice, Action, InvestmentOption, InvestmentDecisionBase, IPosition } from "./../interfaces.ts"
import { sleep } from "https://deno.land/x/sleep@v1.2.0/mod.ts";
import { FinancialCalculator } from "../../../utility-boxes/financial-calculator.ts";
import { VFLogger } from "../../../utility-boxes/logger.ts";
import { IPersistenceService } from "../../volatility-farmer/persistency/interfaces.ts";



export class InvestmentAdvisorETHLong implements IInvestmentAdvisor {

    private investmentOptions: InvestmentOption[] = [
        {
            pair: "ETHUSDT",
            minTradingAmount: 0.01
        }
    ]

    private currentInvestmentAdvices: InvestmentAdvice[] = []
    private lastAddDate: Date = new Date()

    public constructor(private apiKey: string, private persistenceService: IPersistenceService) { }


    public getInvestmentOptions(): InvestmentOption[] {
        return this.investmentOptions
    }

    public async getInvestmentAdvices(investmentDecisionBase: InvestmentDecisionBase): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        const liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20
        const longPosition: IPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]

        let pnlInPercent = (longPosition === undefined) ? 0 : FinancialCalculator.getPNLOfPositionInPercent(longPosition)

        const message = `liquidity level: ${liquidityLevel.toFixed(2)}`
        await VFLogger.log(message, this.apiKey, this.persistenceService)


        // console.log(investmentDecisionBase)
        for (const investmentOption of this.investmentOptions) {
            for (const move of Object.values(Action)) {
                await sleep(0.05)
                await this.deriveInvestmentAdvice(investmentOption, move, longPosition, liquidityLevel, pnlInPercent)

            }

        }

        return this.currentInvestmentAdvices

    }



    protected async deriveInvestmentAdvice(investmentOption: InvestmentOption, move: Action, longPosition: any | undefined, liquidityLevel: number, pnlInPercent: number): Promise<void> {


        switch (move) {
            case Action.PAUSE: {

                if (longPosition === undefined) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: Action.BUY,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                        reason: `we open a ${investmentOption.pair} long position to play the game`
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)

                }

            }
                break
            case Action.BUY: {

                const refDate = new Date();
                refDate.setDate(refDate.getHours() - 1);

                console.log(this.lastAddDate, "vs.", refDate)

                if (liquidityLevel > 19 || (liquidityLevel < 11 && this.lastAddDate < refDate)) {

                    const investmentAdvice: InvestmentAdvice = {
                        action: Action.BUY,
                        amount: investmentOption.minTradingAmount,
                        pair: investmentOption.pair,
                        reason: `we add ${investmentOption.minTradingAmount} to our ${investmentOption.pair} long position`
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)

                    this.lastAddDate = new Date()
                }

            }
                break
            case Action.REDUCELONG: {

                if (liquidityLevel === 0) {
                    const amount = Number((longPosition.data.size / 2).toFixed(2))
                    const investmentAdvice: InvestmentAdvice = {
                        action: Action.REDUCELONG,
                        amount,
                        pair: investmentOption.pair,
                        reason: `emergency closing ${amount} ${investmentOption.pair} from long position due to liquidity crisis`
                    }

                    this.currentInvestmentAdvices.push(investmentAdvice)
                }

            }
                break

            default: // console.log(`${move} not relevant for this advisor`)
        }
    }

}