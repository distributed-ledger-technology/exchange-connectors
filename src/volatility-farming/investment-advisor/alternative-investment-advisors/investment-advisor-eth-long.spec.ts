import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { Action, InvestmentAdvice, InvestmentDecisionBase } from "./../interfaces.ts";
import { ETHLongWithHiddenOverallHedge } from "./investment-advisor-eth-long.ts";

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
            { action: Action.BUY, amount: 0.01, pair: "ETHUSDT", reason: "we open a(n) ETHUSDT long position to play the game" },
        ]
    }
]

Deno.test("should return great investment advices", async () => {

    const investmentAdvisor = new ETHLongWithHiddenOverallHedge("123", undefined)

    console.log(testSets.length)

    for (const testSet of testSets) {

        const investmentAdvices: InvestmentAdvice[] = await investmentAdvisor.getInvestmentAdvices(testSet.input)

        console.log(investmentAdvices)

        assertEquals(investmentAdvices.length, testSet.output.length)
        assertEquals(investmentAdvices, testSet.output)

    }

})