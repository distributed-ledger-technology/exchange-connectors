import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { InvestmentAdvisor } from "./investment-advisor.ts";
import { InvestmentAdvice } from "./interfaces.ts";

const testSets = [
    {
        input: { longShortDeltaInPercent: 0, liquidityLevel: 20, unrealizedProfitsLong: -10, unrealizedProfitsShort: -10 },
        output: [{ action: "BUY", amount: 0.001, pair: "BTCUSDT" }, { action: "SELL", amount: 0.001, pair: "BTCUSDT" }]
    }
    ,
    {
        input: { longShortDeltaInPercent: 10, liquidityLevel: 20, unrealizedProfitsLong: -10, unrealizedProfitsShort: -10 },
        output: [{ action: "SELL", amount: 0.001, pair: "BTCUSDT" }]
    }
]

Deno.test("should return great investment advices", () => {

    const investmentAdvisor = new InvestmentAdvisor()

    for (const testSet of testSets) {

        const investmentAdvices: InvestmentAdvice[] = investmentAdvisor.getInvestmentAdvices(testSet.input)

        console.log(investmentAdvices)

        assertEquals(investmentAdvices, testSet.output)

    }

})