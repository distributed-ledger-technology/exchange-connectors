import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { InvestmentDecisionBase, InvestmentAdvice, Action, IInvestmentAdvisor } from "./interfaces.ts";
import { InvestmentAdvisor } from "./investment-advisor.ts";

export interface ITestData {
    input: InvestmentDecisionBase,
    output: InvestmentAdvice[]
}


const testSets: ITestData[] = [
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [],
        },
        output: [
            { action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "we open a BTCUSDT long position to play the game" },
            { action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "we open a BTCUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Buy", symbol: 'BTCUSDT', size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 0.001 } }],
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "we open a BTCUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Sell", symbol: 'BTCUSDT', size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 0.002 } }],
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "we open a BTCUSDT long position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } }],
        },
        output: [
            { action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "we enhance both positions to narrow down the diff pnl (at a long pnl of: -400%)" },
            { action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "we enhance both positions to narrow down the diff pnl (at a short pnl of: -400%)" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -20 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "we enhance our BTCUSDT long position (at a pnl of: -400%) by 0.001" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -15 } }],
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "we enhance our BTCUSDT short position (at a pnl of: -300%) by 0.001" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 10, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
        },
        output: []
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 0, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 20 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -25 } }],
        },
        output: [
            { action: Action.REDUCELONG, amount: 0.01, pair: "BTCUSDT", reason: "we close 0.01 BTCUSDT long due to a liquidity crisis" },
            { action: Action.REDUCESHORT, amount: 0.01, pair: "BTCUSDT", reason: "we close 0.01 BTCUSDT short due to a liquidity crisis" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 446, equity: 689 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.232, position_value: 11300, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.231, position_value: 11299, leverage: 100, unrealised_pnl: -7 } }],
        },
        output: []
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 50, equity: 100 } } },
            positions: [
                { data: { side: "Buy", symbol: 'BTCUSDT', size: 0.004, position_value: 1180, leverage: 100, unrealised_pnl: 0.001 } },
                { data: { side: "Sell", symbol: 'BTCUSDT', size: 0.02, position_value: 2900, leverage: 100, unrealised_pnl: 0.001 } }],
        },
        output: []
    }
]
Deno.test("should return great investment advices", async () => {

    const investmentAdvisor: IInvestmentAdvisor = new InvestmentAdvisor("123", undefined)

    console.log(testSets.length)

    for (const testSet of testSets) {

        const investmentAdvices: InvestmentAdvice[] = await investmentAdvisor.getInvestmentAdvices(testSet.input)

        console.log(investmentAdvices)

        // assertEquals(investmentAdvices.length, testSet.output.length)
        assertEquals(investmentAdvices, testSet.output)

    }

})