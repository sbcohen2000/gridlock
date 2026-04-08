import { test, expect } from "@playwright/test";

test("enter text into blank document", async ({ page }) => {
    await page.goto("http://localhost:8000");

    const firstLine = page.locator('.editor-line').first()
    await firstLine.click();

    await page.keyboard.type("hello");

    const exp =
        "AAgACAATAAQAEwAbAB4AAAAAIAAFAAAAAAAA\n" +
            "hello                         \n" +
            "                              \n" +
            "                              \n" +
            "                              ";

    const actual = await page.evaluate("window.printCompactGrid()");
    expect(actual).toBe(exp);
});
