import { BybitConnector } from "../bybit/bybit-connector.ts"
import { IExchangeConnector } from "../interfaces/exchange-connector-interface.ts"
import { ToolBox } from "./tool-box.ts"
import { InvestmentDecisionBase, InvestmentAdvisor } from "../investment-advisor/investment-advisor.ts"
import { InvestmentAdvice } from "../investment-advisor/interfaces.ts"


export interface IActiveProcess {
    apiKey: string,
    exchangeConnector: IExchangeConnector,
    intervalId: number,
    iterationCounter: number
    pauseCounter: number
    minimumReserve: number
    pair: string
    tradingAmount: number
}


export class AssetManager {

    public static activeProcesses: IActiveProcess[] = []

    private activeProcess: IActiveProcess
    private exchangeConnector: IExchangeConnector
    private accountInfo: any // shall be defined properly as soon as we have a long term dex connected
    private positions: any[] = [] // shall be defined properly as soon as we have a long term dex connected
    private toolBox: ToolBox
    private longPosition: any // shall be defined properly as soon as we have a long term dex connected
    private shortPosition: any // shall be defined properly as soon as we have a long term dex connected
    private investmentDecisionBase: InvestmentDecisionBase | undefined


    public constructor(private apiKey: string, private apiSecret: string, minimumReserve: number, exchangeConnector?: IExchangeConnector) {

        if (exchangeConnector === undefined) { // giving the possibility for constructor dependency injection 
            this.exchangeConnector = new BybitConnector(apiKey, apiSecret)
        } else {
            this.exchangeConnector = exchangeConnector
        }

        this.activeProcess = {
            apiKey,
            exchangeConnector: this.exchangeConnector,
            intervalId: 0,
            iterationCounter: 0,
            pauseCounter: 0,
            minimumReserve,
            pair: 'BTCUSDT',
            tradingAmount: 0.001
        }

        AssetManager.activeProcesses.push(this.activeProcess)

        this.toolBox = new ToolBox(this.activeProcess)

    }


    public async optimizeInvestments(intervalLengthInSeconds: number): Promise<void> {

        this.checkParameters(intervalLengthInSeconds)

        this.activeProcess.intervalId = setInterval(async () => {

            this.activeProcess.iterationCounter++

            if (this.activeProcess.pauseCounter > 0) {
                this.activeProcess.pauseCounter--
            } else {
                await this.playTheGame()
            }

        }, intervalLengthInSeconds * 1000)

    }


    private async playTheGame(): Promise<void> {

        await this.collectFundamentals()

        const investmentAdvices = await this.getInvestmentAdvices()

        await this.toolBox.applyInvestmentAdvices(investmentAdvices)

    }


    protected async collectFundamentals() {

        this.accountInfo = await this.exchangeConnector.getFuturesAccountData()
        this.positions = await this.exchangeConnector.getPositions()
        this.longPosition = this.positions.filter((p: any) => p.data.side === 'Buy')[0]
        this.shortPosition = this.positions.filter((p: any) => p.data.side === 'Sell')[0]

    }


    protected async ensureConsistency() {

        if (this.longPosition === undefined) {

            let message = `opening a long position with ${this.activeProcess.tradingAmount} ${this.activeProcess.pair}`

            await this.toolBox.buyFuture(this.activeProcess.pair, this.activeProcess.tradingAmount, false, `opening a long position with ${this.activeProcess.tradingAmount} ${this.activeProcess.pair}`, this.accountInfo)

            throw new Error(message)

        }


        if (this.shortPosition === undefined) {

            let message = `opening a short position with ${this.activeProcess.tradingAmount} ${this.activeProcess.pair}`

            await this.toolBox.sellFuture(this.activeProcess.pair, this.activeProcess.tradingAmount, false, `opening a short position with ${this.activeProcess.tradingAmount} ${this.activeProcess.pair}`, this.accountInfo)

            throw new Error(message)

        }

    }


    protected async getInvestmentAdvices(): Promise<InvestmentAdvice[]> {

        await this.ensureConsistency()

        this.investmentDecisionBase = {
            longShortDeltaInPercent: this.toolBox.getLongShortDeltaInPercent(this.positions),
            liquidityLevel: this.toolBox.getPNLOfPositionInPercent(this.longPosition),
            unrealizedProfitsLong: this.toolBox.getPNLOfPositionInPercent(this.shortPosition),
            unrealizedProfitsShort: (this.accountInfo.result.USDT.available_balance / this.accountInfo.result.USDT.equity) * 20

        }

        const investmentAdvisor = new InvestmentAdvisor()

        return investmentAdvisor.getInvestmentAdvices(this.investmentDecisionBase)

    }


    // protected async manageRisk() {

    //     if (this.accountInfo.result.USDT.equity < this.activeProcess.minimumReserve) {
    //         // await this.
    //     }

    // }


    protected async realizeProfits() {

    }


    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 2) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

