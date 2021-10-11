import { Registry } from "../../../deps.ts";
import { BybitConnector } from "../../bybit/bybit-connector.ts";
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts";

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]
const exchangeConnectorClassName = (Deno.args[2] === undefined) ? "BybitConnector" : Deno.args[2]

const registryExchangeConnectors = new Registry()
registryExchangeConnectors.register(BybitConnector)
const exchangeConnector: IExchangeConnector = new (registryExchangeConnectors.get(exchangeConnectorClassName))(apiKey, apiSecret)

const positions = await exchangeConnector.getPositions()

for (const position of positions) {
    if (position.data.size > 0) {

        console.log(`closing ${position.data.size} ${position.data.symbol}`)

        if (position.data.side === 'Buy') {
            await exchangeConnector.sellFuture(position.data.symbol, position.data.size, true)
        } else if (position.data.side === 'Sell') {
            await exchangeConnector.buyFuture(position.data.symbol, position.data.size, true)
        } else {
            throw new Error(`what kind of position is this: ${position}`)
        }
    }
}