import { assertEquals, fail } from "https://deno.land/std@0.123.0/testing/asserts.ts"
import { DyDxConnector } from "./dydx-connector.ts"

const dydxConnector = new DyDxConnector()
const testWallet = "0xD6C2DD6B5A5a3A58765eDcdcd6c2768f5cdFd6D4"

Deno.test("should check if a user exists with wallet 0xD6C2DD6B5A5a3A58765eDcdcd6c2768f5cdFd6D4", async () => {

    const userExists = await dydxConnector.checkUserExists(testWallet)
    assertEquals(userExists, true)

})

Deno.test("should retrieve account balance = wallet balance for 0xD6C2DD6B5A5a3A58765eDcdcd6c2768f5cdFd6D4", async () => {

    let actualBalance
    let expectedBalance = 0

    try {
        actualBalance = dydxConnector.getBalance(testWallet)
    } catch (error) {
        fail(`the following unexpected error occurred: ${error}`)
    }

    assertEquals(actualBalance, expectedBalance)

})


Deno.test("should return market data", async () => {

    const result = await dydxConnector.getMarketData()

    if (result === undefined) {
        fail(`I would have expected fancy market data`)
    }

})

