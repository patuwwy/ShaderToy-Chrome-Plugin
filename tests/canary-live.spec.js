const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const pathToExtension = path.resolve(__dirname, '../app');

test.describe('Shadertoy Live Canary Tests', () => {
    test.setTimeout(90000);

    let context;
    let page;
    const pageErrors = [];

    test.beforeAll(async() => {
        const isHeadless = process.env.HEADLESS !== 'false';
        const launchArgs = [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-webgl',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ];

        if (isHeadless) {
            launchArgs.push('--headless=new');
        }

        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: launchArgs
        });

        const pages = context.pages();
        page = pages.length > 0 ? pages[0] : await context.newPage();

        page.on('pageerror', error => {
            pageErrors.push(error);
        });
    });

    test.afterAll(async() => {
        if (context) {
            await context.close();
        }
    });

    test('verifies Shadertoy contract and extension injection on https://www.shadertoy.com/new', async() => {
        const response = await page.goto('https://www.shadertoy.com/new', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Graceful Cloudflare detection: don't fail build if bot-blocked
        const pageTitle = await page.title();
        const pageContent = await page.content();
        const statusCode = response ? response.status() : 200;

        if (statusCode === 403 || pageTitle.includes('Just a moment...') || pageContent.includes('cf-browser-verification')) {
            console.warn('⚠️ Cloudflare challenge/protection detected on https://www.shadertoy.com/new – skipping live assertion.');
            test.skip(true, 'Cloudflare verification challenge active');
            return;
        }

        // 1. Asserts Shadertoy contract DOM elements exist
        const player = page.locator('#player');
        await expect(player).toBeAttached({ timeout: 15000 });

        const myTime = page.locator('#myTime');
        await expect(myTime).toBeAttached({ timeout: 15000 });

        const shaderInfo = page.locator('#shaderInfo');
        await expect(shaderInfo).toBeAttached({ timeout: 15000 });

        // 2. Asserts Shadertoy JS contract on window: window.gShaderToy and mEffect.RequestFrame
        await page.waitForFunction(() => {
            return typeof window.gShaderToy === 'object' &&
                window.gShaderToy !== null &&
                typeof window.gShaderToy.mEffect === 'object' &&
                window.gShaderToy.mEffect !== null &&
                typeof window.gShaderToy.mEffect.RequestFrame === 'function';
        }, { timeout: 15000 });

        const contractValid = await page.evaluate(() => {
            const g = window.gShaderToy;
            return Boolean(
                g &&
                typeof g === 'object' &&
                g.mEffect &&
                typeof g.mEffect.RequestFrame === 'function'
            );
        });
        expect(contractValid).toBe(true);

        // 3. Asserts extension elements are injected properly
        const controlsContainer = page.locator('.toyplug-controls-container');
        await expect(controlsContainer).toBeAttached({ timeout: 15000 });

        const timeSlider = page.locator('.toyplug-controls-container .time-slider');
        await expect(timeSlider).toBeAttached({ timeout: 15000 });

        const mouseUniforms = page.locator('.toyplug-controls-container .mouse-uniforms');
        await expect(mouseUniforms).toBeAttached({ timeout: 15000 });

        // 4. Asserts no uncaught page errors / exceptions
        expect(pageErrors).toEqual([]);
    });
});
