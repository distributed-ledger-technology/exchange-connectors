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
}

export interface InvestmentOption {
    pair: string
    minTradingAmount: number
}


export interface IInvestmentAdvisor {
    getInvestmentAdvices(investmentDecisionBase: any): InvestmentAdvice[]
}