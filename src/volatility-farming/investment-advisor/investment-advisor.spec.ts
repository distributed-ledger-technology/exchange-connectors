import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { IAccountInfo, InvestmentAdvisor, InvestmentDecisionBase, IPosition } from "./investment-advisor.ts";
import { Action, InvestmentAdvice } from "./interfaces.ts";

export interface ITestData {
    input: InvestmentDecisionBase,
    output: InvestmentAdvice[]
}



const testPositions: IPosition[] = []
// const testPositions: IPosition[] = [
//     { data: { side: "Buy", size: 0.001, position_value: 1, leverage: 100, unrealised_pnl: 20 } }
// ]

const testSets: ITestData[] = [
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: []
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT" }, { action: Action.SELL, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Buy", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 20 } }]
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Sell", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 20 } }]
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } },
                { data: { side: "Sell", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } }]
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT" }, { action: Action.SELL, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: -20 } },
                { data: { side: "Sell", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: 2 } }]
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: 20 } },
                { data: { side: "Sell", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: -15 } }]
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 10, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }]
        },
        output: []
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 0, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: 20 } },
                { data: { side: "Sell", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: -25 } }]
        },
        output: [{ action: Action.REDUCELONG, amount: 0.01, pair: "BTCUSDT" }, { action: Action.REDUCESHORT, amount: 0.01, pair: "BTCUSDT" }]
    },

]


Deno.test("should return great investment advices", () => {

    const investmentAdvisor = new InvestmentAdvisor()

    console.log(testSets.length)

    for (const testSet of testSets) {

        const investmentAdvices: InvestmentAdvice[] = investmentAdvisor.getInvestmentAdvices(testSet.input)

        console.log(investmentAdvices)

        assertEquals(investmentAdvices.length, testSet.output.length)
        assertEquals(investmentAdvices, testSet.output)

    }

})