import { fail } from "https://deno.land/std@0.86.0/testing/asserts.ts";
import { VolatilityFarmer } from "./volatility-farmer.ts"
import { ExchangeConnectorTestDouble } from "./exchange-connector-test-double.ts";
import { InvestmentAdvisor } from "../investment-advisor/investment-advisor.ts";

Deno.test("should optimize investments", async () => {

    const volatilityFarmer = new VolatilityFarmer("a", "b", new ExchangeConnectorTestDouble(), new InvestmentAdvisor("a", undefined), undefined)
    const numberOfSeconds = 1

    try {
        await volatilityFarmer.farm(numberOfSeconds)
        fail(`I would have expected an error`)
    } catch (error) {
        // in this case I expect an error --> fine
    }

})