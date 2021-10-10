
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
    private pnlLong = 0
    private pnlShort = 0
    private longPosition: IPosition | undefined
    private shortPosition: IPosition | undefined
    private liquidityLevel = 0
    private longShortDeltaInPercent = 0




    public constructor(private apiKey: string, private persistenceService: IPersistenceService | undefined) { }


    public getInvestmentOptions(): InvestmentOption[] {
        return this.investmentOptions
    }


    public async getInvestmentAdvices(investmentDecisionBase: InvestmentDecisionBase): Promise<InvestmentAdvice[]> {

        this.currentInvestmentAdvices = []

        this.longShortDeltaInPercent = FinancialCalculator.getLongShortDeltaInPercent(investmentDecisionBase.positions)
        this.liquidityLevel = (investmentDecisionBase.accountInfo.result.USDT.available_balance / investmentDecisionBase.accountInfo.result.USDT.equity) * 20

        this.longPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Buy')[0]
        this.shortPosition = investmentDecisionBase.positions.filter((p: any) => p.data.side === 'Sell')[0]


        this.pnlLong = FinancialCalculator.getPNLOfPositionInPercent(this.longPosition)
        this.pnlShort = FinancialCalculator.getPNLOfPositionInPercent(this.shortPosition)

        for (const investmentOption of this.investmentOptions) {

            for (const move of Object.values(Action)) {
                await sleep(0.1)
                await this.deriveInvestmentAdvice(investmentOption, move)

            }

        }

        return this.currentInvestmentAdvices

    }



    protected async deriveInvestmentAdvice(investmentOption: InvestmentOption, potentialMove: Action): Promise<void> {


        if (potentialMove === Action.PAUSE) { // here just to ensure the following block is executed only once

            this.deriveSpecialMoves(investmentOption)

        } else if (this.longPosition !== undefined && this.shortPosition !== undefined && this.currentInvestmentAdvices.length === 0) {

            await this.deriveStandardMoves(investmentOption, potentialMove)

        }

    }


    protected async deriveSpecialMoves(investmentOption: InvestmentOption) {

        if (this.longPosition === undefined) {

            const investmentAdvice: InvestmentAdvice = {
                action: Action.BUY,
                amount: investmentOption.minTradingAmount,
                pair: investmentOption.pair,
                reason: `we open a(n) ${investmentOption.pair} long position to play the game`
            }

            this.currentInvestmentAdvices.push(investmentAdvice)

        }

    }


    protected async deriveStandardMoves(investmentOption: InvestmentOption, potentialMove: Action) {
        switch (potentialMove) {

            case Action.BUY: {

                const refDate = new Date();
                refDate.setMinutes(refDate.getMinutes() - 30);

                if (this.liquidityLevel > 19 || (this.liquidityLevel < 11 && this.liquidityLevel > 3 && this.lastAddDate < refDate)) {

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

                if (this.liquidityLevel === 0 && this.longPosition !== undefined) {
                    const amount = Number((this.longPosition.data.size / 2).toFixed(2))
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

            default: // console.log(`potential move ${move} not relevant here`)
        }
    }
}