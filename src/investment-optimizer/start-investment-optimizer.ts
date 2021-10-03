import { InvestmentOptimizer } from "./investment-optimizer.ts"

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]

const minimumReserve = 70
const intervalLengthInSeconds = 4

const investmentOptimizer = new InvestmentOptimizer(apiKey, apiSecret, minimumReserve)

investmentOptimizer.optimizeInvestments(intervalLengthInSeconds)

