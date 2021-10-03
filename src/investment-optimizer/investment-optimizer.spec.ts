import { assertEquals, fail } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { InvestmentOptimizer } from "./investment-optimizer.ts";
import { ExchangeConnectorTestDouble } from "./exchange-connector-test-double.ts";

Deno.test("should optimize investments", async () => {


    const investmentOptimizer = new InvestmentOptimizer("a", "b", 20, new ExchangeConnectorTestDouble())
    const numberOfSeconds = 1

    try {
        await investmentOptimizer.optimizeInvestments(numberOfSeconds)
        fail(`I would have expected an error`)
    } catch (error) {
        // in this case I expect an error --> fine
    }

})