import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "test",
    fullyParallel: true,
    use: {
        baseURL: "http://localhost:8000",
        trace: "on-first-retry"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ],
    webServer: {
        command: "npm run watch",
        url: "http://localhost:8000",
        reuseExistingServer: !process.env.CI
    }
});
