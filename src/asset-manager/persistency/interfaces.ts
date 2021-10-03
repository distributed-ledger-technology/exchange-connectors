export interface IPersistence {

}


export interface AccountInfoSchema {
    _id: { $oid: string }
    apiKey: any
    equity: number
    avaliableBalance: number
    longPositionSize: number
    longPositionPNLInPercent: number
    shortPositionSize: number
    shortPositionPNLInPercent: number
    longShortDeltaInPercent: number
    overallUnrealizedPNL: number
    botStatus: string
}


export interface DealSchema {
    _id: { $oid: string }
    apiKey: any
    utcTime: string
    side: string
    asset: string
    reason: string
    reduceOnly: boolean
    equityBeforeThisDeal: number
}