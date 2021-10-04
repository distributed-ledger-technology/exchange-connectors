export enum Action {
    PAUSE = "PAUSE",
    BUY = "BUY",
    SELL = "SELL",
    REDUCELONG = "REDUCELONG",
    REDUCESHORT = "REDUCESHORT",
}


export interface InvestmentAdvice {
    action: Action,
    amount: number
    pair: string,
    reason: string
}

export interface InvestmentOption {
    pair: string
    minTradingAmount: number
}


export interface IInvestmentAdvisor {
    getInvestmentAdvices(investmentDecisionBase: any): InvestmentAdvice[]
    getPNLOfPositionInPercent(longPosition: any): number
    getOverallPNLInPercent(longPosition: any, shortPosition: any): number
    getLongShortDeltaInPercent(position: any[]): number
}