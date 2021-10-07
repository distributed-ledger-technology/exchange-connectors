import { assertEquals } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { InvestmentAdvisor } from "./../investment-advisor.ts";
import { Action, InvestmentAdvice, InvestmentDecisionBase } from "./../interfaces.ts";

export interface ITestData {
    input: InvestmentDecisionBase,
    output: InvestmentAdvice[]
}


const testSets: ITestData[] = [

]
Deno.test("should return great investment advices", async () => {

    const investmentAdvisor = new InvestmentAdvisor("123", undefined)

    console.log(testSets.length)

    for (const testSet of testSets) {

        const investmentAdvices: InvestmentAdvice[] = await investmentAdvisor.getInvestmentAdvices(testSet.input)

        console.log(investmentAdvices)

        assertEquals(investmentAdvices.length, testSet.output.length)
        assertEquals(investmentAdvices, testSet.output)

    }

})