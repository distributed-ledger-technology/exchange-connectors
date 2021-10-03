import { BybitConnector } from "../bybit/bybit-connector.ts";
import { IExchangeConnector } from "../interfaces/exchange-connector-interface.ts";
import { ToolBox } from "./tool-box.ts";


export interface IActiveProcess {
    apiKey: string,
    exchangeConnector: IExchangeConnector,
    intervalId: number,
    iterationCounter: number
    pauseCounter: number
    minimumReserve: number
    tradingAmount: number
}


export class InvestmentOptimizer {

    public static activeProcesses: IActiveProcess[] = []

    private activeProcess: IActiveProcess
    private exchangeConnector: IExchangeConnector
    private accountInfo: any // shall be defined properly as soon as we have a long term dex connected
    private positions: any // shall be defined properly as soon as we have a long term dex connected
    private toolBox: ToolBox // shall be defined properly as soon as we have a long term dex connected


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
            tradingAmount: 0.001
        }

        InvestmentOptimizer.activeProcesses.push(this.activeProcess)

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

        await this.deriveData()

        await this.manageRisk()

        await this.invest()

        await this.realizeProfits()

    }


    protected async collectFundamentals() {

        this.accountInfo = await this.exchangeConnector.getFuturesAccountData()

        console.log(this.accountInfo)

        this.positions = await this.exchangeConnector.getPositions()

        console.log(this.positions)

    }


    protected async deriveData() {

    }


    protected async manageRisk() {
        if (this.accountInfo.result.USDT.equity < this.activeProcess.minimumReserve) {
            // await this.
        }
    }


    protected async invest() {

    }


    protected async realizeProfits() {

    }


    protected checkParameters(intervalLengthInSeconds: number): void {

        if (intervalLengthInSeconds < 2) {
            throw new Error(`Are you sure you want me to do this each ${intervalLengthInSeconds} seconds?`)
        }

    }

}

