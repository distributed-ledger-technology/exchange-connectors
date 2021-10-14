import { assertEquals } from "https://deno.land/std@0.107.0/testing/asserts.ts";
import { GeneralUtilityBox } from "./general-utility-box.ts";

Deno.test("should return great investment advices", async () => {

    const date = new Date()
    const dateMinusOneHour = GeneralUtilityBox.subtractXHoursFromDate(1, date)

    assertEquals(date.getTime() - (1000 * 60 * 60), dateMinusOneHour.getTime())

})