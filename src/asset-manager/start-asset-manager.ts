import { AssetManager } from "./asset-manager.ts"

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]

const minimumReserve = 70
const intervalLengthInSeconds = 4

const investmentOptimizer = new AssetManager(apiKey, apiSecret, minimumReserve)

investmentOptimizer.optimizeInvestments(intervalLengthInSeconds)

