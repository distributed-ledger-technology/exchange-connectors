

import { Request } from 'https://deno.land/x/request@1.3.0/request.ts'
import { IExchangeConnector } from "../interfaces/exchange-connector-interface.ts";
import { GeneralUtilityBox } from "../utility-boxes/general-utility-box.ts";


export enum getEndPoints {
    "/v2/private/wallet/balance",
    "/private/linear/position/list",
    "/v2/public/risk-limit/list",
}

export enum postEndPoints {
    "/private/linear/position/set-leverage",
    "/v2/public/risk-limit/list",
    "/private/linear/order/create",
    "/asset/v1/private/transfer",
    "/private/linear/position/trading-stop"
}


export class BybitConnector implements IExchangeConnector {

    private readonly apiKey
    private readonly apiSecret
    private readonly accountId
    private readonly baseURL = "https://api.bybit.com"

    public constructor(apiKey: string, apiSecret: string, accountId: string = 'default') {

        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.accountId = accountId

        console.log(`An instance of BybitConnectorDouble has been created`)

    }


    public getAccountId(): string {
        return this.accountId
    }


    public async getFuturesAccountData() {
        const url = await this.getURLSigned(getEndPoints[0])
        const result = await Request.get(url)

        return result

    }


    public async buyFuture(symbol: string, amount: number, reduceOnly: boolean) {

        return this.placeMarketOrder(symbol, amount, 'Buy', reduceOnly)

    }


    public async sellFuture(symbol: string, amount: number, reduceOnly: boolean) {

        return this.placeMarketOrder(symbol, amount, 'Sell', reduceOnly)

    }


    public async setLeverage(symbol: string, leverage: number) {
        const timestamp = (Date.now()).toString()
        const url = await this.getURL(postEndPoints[0])
        const queryForSign = `api_key=${this.apiKey}&buy_leverage=${leverage}&sell_leverage=${leverage}&symbol=${symbol}&timestamp=${timestamp}`
        const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)
        const body = { "api_key": this.apiKey, "buy_leverage": leverage, "sell_leverage": leverage, "symbol": symbol, "timestamp": timestamp, "sign": sign }

        return Request.post(url, body)
    }

    public async setRiskLimit(symbol: string, riskId: number = 20) {
        const timestamp = (Date.now()).toString()
        const url = await this.getURL(postEndPoints[1])
        const queryForSign = `api_key=${this.apiKey}&risk_id=${riskId}&symbol=${symbol}&timestamp=${timestamp}`
        const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)
        const body = { "api_key": this.apiKey, "risk_id": riskId, "symbol": symbol, "timestamp": timestamp, "sign": sign }

        return Request.post(url, body)
    }

    public async getPositions() {
        const url = await this.getURLSigned(getEndPoints[1])
        const response = await Request.get(url)

        return response.result.filter((p: any) => p.data.size > 0)
    }

    public async getRiskLimits() {
        const url = await this.getURLSigned(getEndPoints[2])
        const result = await Request.get(url)

        return result
    }


    public async setStopLoss(pair: string, stopLoss: number, side: string) {

        const timestamp = (Date.now()).toString()
        const url = await this.getURL(postEndPoints[4])
        const queryForSign = `api_key=${this.apiKey}&side=${side}&stop_loss=${stopLoss}&symbol=${pair}&timestamp=${timestamp}`
        const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)
        const body = { "api_key": this.apiKey, "symbol": pair, "side": side, "stop_loss": stopLoss, "timestamp": timestamp, "sign": sign }

        console.log("body:", JSON.stringify(body))

        const r = await Request.post(url, body)
        // console.log(r)

        return r

    }

    private async placeMarketOrder(pair: string, amount: number, side: string, reduceOnly: boolean) {

        const timestamp = (Date.now()).toString()
        const url = await this.getURL(postEndPoints[2])
        const queryForSign = `api_key=${this.apiKey}&close_on_trigger=false&order_type=Market&qty=${amount}&reduce_only=${reduceOnly}&side=${side}&symbol=${pair}&time_in_force=GoodTillCancel&timestamp=${timestamp}`
        const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)
        const body = { "api_key": this.apiKey, "close_on_trigger": false, "order_type": "Market", "qty": amount, "reduce_only": reduceOnly, "side": side, "symbol": pair, "time_in_force": "GoodTillCancel", "timestamp": timestamp, "sign": sign }

        const r = await Request.post(url, body)
        // console.log(r)

        return r

    }

    private async getURLSigned(endPoint: string) {

        const timestamp = (Date.now()).toString()
        const queryForSign = `api_key=${this.apiKey}&timestamp=${timestamp}`
        const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)

        // return `${this.baseURL}/${endPoint}?api_key=${this.apiKey}&timestamp=${timestamp}&sign=${sign}`
        return `${this.baseURL}${endPoint}?api_key=${this.apiKey}&timestamp=${timestamp}&sign=${sign}`

    }


    private async getURL(endPoint: string) {

        return `${this.baseURL}${endPoint}`

    }


    public async transferUSDT(fromAccountType: string, toAccountType: string, amount: number, coin: string, transferId: string) {
        // const timestamp = (Date.now()).toString()
        // const url = await this.getURL(postEndPoints[2])
        // const queryForSign = `api_key=${this.apiKey}&risk_id=${riskId}&symbol=${symbol}&timestamp=${timestamp}`
        // const sign = GeneralUtilityBox.getHMACFromQuery(queryForSign, this.apiSecret)
        // const body = { "api_key": this.apiKey, "risk_id": riskId, "symbol": symbol, "timestamp": timestamp, "sign": sign }

        // return Request.post(url, body)

    }


}
