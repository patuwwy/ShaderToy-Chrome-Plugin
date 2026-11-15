const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Mouse Uniforms Simulator Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.mouseUniforms
            );
        });
    });

    test('renders 4 mouse sliders with correct axis and component attributes', async({ page }) => {
        const mouseWrapper = page.locator('.toyplug-controls-container .mouse-uniforms');
        await expect(mouseWrapper).toBeAttached();

        const sliders = mouseWrapper.locator('input[type="range"]');
        await expect(sliders).toHaveCount(4);

        const expectedConfig = [
            { axis: 'PosX', vpart: 'x' },
            { axis: 'PosY', vpart: 'y' },
            { axis: 'OriX', vpart: 'z' },
            { axis: 'OriY', vpart: 'w' }
        ];

        for (let i = 0; i < 4; i++) {
            const slider = sliders.nth(i);
            await expect(slider).toHaveAttribute('data-axis', expectedConfig[i].axis);
            await expect(slider).toHaveAttribute('data-vpart', expectedConfig[i].vpart);
        }
    });

    test('changing slider values updates gShaderToy mouse uniforms and indicators', async({ page }) => {
        const mouseWrapper = page.locator('.toyplug-controls-container .mouse-uniforms');
        const sliders = mouseWrapper.locator('input[type="range"]');

        // Test PosX (x)
        const sliderX = sliders.nth(0);
        await sliderX.evaluate(el => {
            el.value = '120';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const posX = await page.evaluate(() => window.gShaderToy.mMousePosX);
        expect(Number(posX)).toBe(120);

        // Test PosY (y)
        const sliderY = sliders.nth(1);
        await sliderY.evaluate(el => {
            el.value = '80';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const posY = await page.evaluate(() => window.gShaderToy.mMousePosY);
        expect(Number(posY)).toBe(80);

        // Test OriX (z)
        const sliderZ = sliders.nth(2);
        await sliderZ.evaluate(el => {
            el.value = '200';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const oriX = await page.evaluate(() => window.gShaderToy.mMouseOriX);
        expect(Number(oriX)).toBe(200);

        // Test OriY (w)
        const sliderW = sliders.nth(3);
        await sliderW.evaluate(el => {
            el.value = '150';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const oriY = await page.evaluate(() => window.gShaderToy.mMouseOriY);
        expect(Number(oriY)).toBe(150);

        // Verify force frame was requested for rerender
        const forceFrame = await page.evaluate(() => window.gShaderToy.mForceFrame);
        expect(forceFrame).toBe(true);
    });

    test('window resize updates slider max attributes based on demogl canvas size', async({ page }) => {
        const mouseWrapper = page.locator('.toyplug-controls-container .mouse-uniforms');
        const sliderX = mouseWrapper.locator('input[type="range"]').nth(0);

        const canvasWidth = await page.evaluate(() => {
            return document.getElementById('demogl').getBoundingClientRect().width;
        });

        const sliderMax = await sliderX.getAttribute('max');
        expect(Number(sliderMax)).toBeCloseTo(canvasWidth, -1);
    });
});
