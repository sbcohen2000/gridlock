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

test("enter text into a blank document, then undo", async ({ page }) => {
    await page.goto("http://localhost:8000");

    const initial = await page.evaluate("window.printCompactGrid()");

    const firstLine = page.locator('.editor-line').first()
    await firstLine.click();

    await page.keyboard.type("hello");
    await page.keyboard.press("Control+/");

    const final = await page.evaluate("window.printCompactGrid()");

    expect(final).toBe(initial);
});

test("enter text into a blank document, then undo multiple times", async ({ page }) => {
    // The intent is that multiple undo operations will have no effect
    // on the final document.

    await page.goto("http://localhost:8000");

    const initial = await page.evaluate("window.printCompactGrid()");

    const firstLine = page.locator('.editor-line').first()
    await firstLine.click();

    await page.keyboard.type("hello");

    for(let i = 0; i < 3; ++i) {
        await page.keyboard.press("Control+/");
    }

    const final = await page.evaluate("window.printCompactGrid()");

    expect(final).toBe(initial);
});
