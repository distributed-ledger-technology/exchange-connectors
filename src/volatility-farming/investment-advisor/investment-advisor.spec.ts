import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { InvestmentAdvisor, InvestmentDecisionBase } from "./investment-advisor.ts";
import { Action, InvestmentAdvice } from "./interfaces.ts";

export interface ITestData {
    input: InvestmentDecisionBase,
    output: InvestmentAdvice[]
}


const testSets: ITestData[] = [
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [],
            minimumReserve: 90
        },
        output: [
            { action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall open a BTCUSDT long position to play the game" },
            { action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall open a BTCUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Buy", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 20 } }],
            minimumReserve: 90
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall open a BTCUSDT short position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [{ data: { side: "Sell", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: 20 } }],
            minimumReserve: 90
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall open a BTCUSDT long position to play the game" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } },
                { data: { side: "Sell", size: 0.001, position_value: 50, leverage: 100, unrealised_pnl: -2 } }],
            minimumReserve: 90
        },
        output: [
            { action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall enhance both positions to narrow down the diff pnl" },
            { action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall enhance both positions to narrow down the diff pnl" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -20 } },
                { data: { side: "Sell", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
            minimumReserve: 90
        },
        output: [{ action: Action.BUY, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall enhance our BTCUSDT long position due to a great price" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 100, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -15 } }],
            minimumReserve: 90
        },
        output: [{ action: Action.SELL, amount: 0.001, pair: "BTCUSDT", reason: "it seems we shall enhance our BTCUSDT short position due to a great price" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 10, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 1 } }],
            minimumReserve: 90
        },
        output: []
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 0, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: 20 } },
                { data: { side: "Sell", size: 0.01, position_value: 500, leverage: 100, unrealised_pnl: -25 } }],
            minimumReserve: 90
        },
        output: [
            { action: Action.REDUCELONG, amount: 0.01, pair: "BTCUSDT", reason: "it seems we shall close 0.01 BTCUSDT long due to a liquidity crisis" },
            { action: Action.REDUCESHORT, amount: 0.01, pair: "BTCUSDT", reason: "it seems we shall close 0.01 BTCUSDT short due to a liquidity crisis" },
            { action: Action.PAUSE, amount: 0, pair: "", reason: "it seems we shall pause the game due to a liquidity crisis" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 70, equity: 80 } } },
            positions: [
                { data: { side: "Buy", size: 0.01, position_value: 1, leverage: 100, unrealised_pnl: 20 } },
                { data: { side: "Sell", size: 0.02, position_value: 1, leverage: 100, unrealised_pnl: -25 } }],
            minimumReserve: 90
        },
        output: [
            { action: Action.REDUCELONG, amount: 0.01, pair: "BTCUSDT", reason: "it seems we shall close 0.01 BTCUSDT long due to an equity drop" },
            { action: Action.REDUCESHORT, amount: 0.02, pair: "BTCUSDT", reason: "it seems we shall close 0.01 BTCUSDT short due to an equity drop" },
            { action: Action.PAUSE, amount: 0, pair: "", reason: "it seems we shall pause the game due to an equity drop" }]
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 446, equity: 689 } } },
            positions: [
                { data: { side: "Buy", size: 0.232, position_value: 11300, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", size: 0.231, position_value: 11299, leverage: 100, unrealised_pnl: -7 } }],
            minimumReserve: 90
        },
        output: []
    },
    {
        input: {
            accountInfo: { result: { USDT: { available_balance: 50, equity: 100 } } },
            positions: [
                { data: { side: "Buy", size: 0.004, position_value: 1180, leverage: 100, unrealised_pnl: 1 } },
                { data: { side: "Sell", size: 0.02, position_value: 2900, leverage: 100, unrealised_pnl: 1 } }],
            minimumReserve: 90
        },
        output: []
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