import { Registry } from "../../../deps.ts";
import { BybitConnector } from "../../bybit/bybit-connector.ts";
import { IExchangeConnector } from "../../interfaces/exchange-connector-interface.ts";

const apiKey = Deno.args[0]
const apiSecret = Deno.args[1]
const exchangeConnectorClassName = (Deno.args[2] === undefined) ? "BybitConnector" : Deno.args[2]
const leverageInPercent = Number(Deno.args[3])

const registryExchangeConnectors = new Registry()
registryExchangeConnectors.register(BybitConnector)
const exchangeConnector: IExchangeConnector = new (registryExchangeConnectors.get(exchangeConnectorClassName))(apiKey, apiSecret)

const positions = await exchangeConnector.getPositions()

for (const position of positions) {
    if (position.data.size > 0) {

        const r = await exchangeConnector.setLeverage(position.data.symbol, leverageInPercent)

        console.log(r)

    }
}