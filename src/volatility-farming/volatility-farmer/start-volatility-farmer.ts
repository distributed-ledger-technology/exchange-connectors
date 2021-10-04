import { VolatilityFarmer } from "./volatility-farmer.ts"

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]

const dbUser = Deno.args[2]
const dbPW = Deno.args[3]

const minimumReserve = 70
const intervalLengthInSeconds = 4

let assetManager: VolatilityFarmer

if (dbUser !== undefined && dbPW !== undefined) {
    const dbConnectionURL = `mongodb://${dbUser}:${dbPW}@localhost:27017`
    assetManager = new VolatilityFarmer(apiKey, apiSecret, minimumReserve, undefined, dbConnectionURL)
} else {
    assetManager = new VolatilityFarmer(apiKey, apiSecret, minimumReserve)
}

assetManager.optimizeInvestments(intervalLengthInSeconds)

