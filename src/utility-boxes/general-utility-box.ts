import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

export class GeneralUtilityBox {

    public static getHMACFromQuery(query: any, secret: string) {
        // sort

        return hmac("sha256", secret, query, "utf8", "hex")


    }

}
