

export class UnitConverter {

    public static convert(from: string, amount: number, to: string): number {

        let valueInWei = 0

        switch (from) {
            case "Wei": valueInWei = amount
                break
            case "Kwei": valueInWei = amount * Math.pow(10, 3)
                break
            case "Mwei": valueInWei = amount * Math.pow(10, 6)
                break
            case "Gwei": valueInWei = amount * Math.pow(10, 9)
                break
            case "Szabo": valueInWei = amount * Math.pow(10, 12)
                break
            case "Finney": valueInWei = amount * Math.pow(10, 15)
                break
            case "Ether": valueInWei = amount * Math.pow(10, 18)
                break
            case "Kether": valueInWei = amount * Math.pow(10, 21)
                break
            case "Mether": valueInWei = amount * Math.pow(10, 24)
                break
            case "Gether": valueInWei = amount * Math.pow(10, 27)
                break
            case "Tether": valueInWei = amount * Math.pow(10, 30)
                break
            default: throw new Error(`can't convert ${amount} ${from} to ${to}`)

        }


        switch (to) {
            case "Wei": return valueInWei
            case "Kwei": return valueInWei / Math.pow(10, 3)
            case "Mwei": return valueInWei / Math.pow(10, 6)
            case "Gwei": return valueInWei / Math.pow(10, 9)
            case "Szabo": return valueInWei / Math.pow(10, 12)
            case "Finney": return valueInWei / Math.pow(10, 15)
            case "Ether": return valueInWei / Math.pow(10, 18)
            case "Kether": return valueInWei * Math.pow(10, 3)
            case "Mether": return valueInWei * Math.pow(10, 3)
            case "Gether": return valueInWei * Math.pow(10, 3)
            case "Tether": return valueInWei * Math.pow(10, 3)
            default: throw new Error(`can't convert ${amount} ${from} to ${to}`)
        }



    }
}