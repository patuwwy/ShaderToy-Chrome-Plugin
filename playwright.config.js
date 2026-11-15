const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : 4,
    reporter: process.env.CI
        ? [
            ['list'],
            ['html', { open: 'never', outputFolder: 'playwright-report' }],
            ['github']
        ]
        : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'chromium',
            testIgnore: /.*canary.*/,
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: [
                        '--use-gl=angle',
                        '--use-angle=swiftshader',
                        '--enable-webgl',
                        '--ignore-gpu-blocklist'
                    ]
                }
            }
        },
        {
            name: 'canary',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: [
                        '--use-gl=angle',
                        '--use-angle=swiftshader',
                        '--enable-webgl',
                        '--ignore-gpu-blocklist'
                    ]
                }
            },
            testMatch: /.*canary.*/
        }
    ]
});
