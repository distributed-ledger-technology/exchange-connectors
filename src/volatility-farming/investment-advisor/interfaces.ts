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


export interface InvestmentDecisionBase {
    accountInfo: any,
    positions: any,
    minimumReserve: number
}

export interface IPosition {
    data: {
        side: string,
        size: number,
        position_value: number,
        leverage: number,
        unrealised_pnl: number,

    }
}

export interface IAccountInfo {
    result: {
        USDT: {
            available_balance: number,
            equity: number
        }
    }
}

export interface IInvestmentAdvisor {
    getInvestmentOptions(): any[]
    getInvestmentAdvices(investmentDecisionBase: any): Promise<InvestmentAdvice[]>
}