const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Loop Regression Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.timebar &&
                window.ToyPlug.editPage.timebar.sliderInput &&
                window.ToyPlug.editPage.timebar.loopInput
            );
        });
    });

    test('toggling loop checkbox updates plugin state', async({ page }) => {
        const loopCheckbox = page.locator('.toyplug-controls-container .ste-loop-toggle');
        await expect(loopCheckbox).toBeAttached();

        // Initial state is un-looped (or matches default)
        const initialLoopState = await page.evaluate(() => Boolean(window.ToyPlug.editPage.timebar.loop));

        // Toggle checkbox to opposite state
        if (!initialLoopState) {
            await loopCheckbox.check();
            expect(await page.evaluate(() => window.ToyPlug.editPage.timebar.loop)).toBe(true);

            await loopCheckbox.uncheck();
            expect(await page.evaluate(() => window.ToyPlug.editPage.timebar.loop)).toBe(false);
        } else {
            await loopCheckbox.uncheck();
            expect(await page.evaluate(() => window.ToyPlug.editPage.timebar.loop)).toBe(false);

            await loopCheckbox.check();
            expect(await page.evaluate(() => window.ToyPlug.editPage.timebar.loop)).toBe(true);
        }
    });

    test('setting loop min and loop max bounds with decimal precision (e.g. 2.50s, 5.00s)', async({ page }) => {
        const minInput = page.locator('.toyplug-controls-container .ste-min-input');
        const maxInput = page.locator('.toyplug-controls-container .ste-max-input');
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');

        await expect(minInput).toBeAttached();
        await expect(maxInput).toBeAttached();

        // Set min to 2.50 and max to 5.00 with decimal precision
        await minInput.fill('2.50');
        await minInput.dispatchEvent('change');

        await maxInput.fill('5.00');
        await maxInput.dispatchEvent('change');

        // Verify values are preserved in DOM with 2 decimal places
        expect(await minInput.inputValue()).toBe('2.50');
        expect(await maxInput.inputValue()).toBe('5.00');

        // Verify slider boundaries are adjusted to milliseconds (2500ms and 5000ms)
        const sliderMin = await slider.getAttribute('min');
        const sliderMax = await slider.getAttribute('max');
        expect(sliderMin).toBe('2500');
        expect(sliderMax).toBe('5000');
    });

    test('time wrap-around: when virtual playback time reaches max, it loops back to min', async({ page }) => {
        const loopCheckbox = page.locator('.toyplug-controls-container .ste-loop-toggle');
        const minInput = page.locator('.toyplug-controls-container .ste-min-input');
        const maxInput = page.locator('.toyplug-controls-container .ste-max-input');

        // Configure loop range [2.50s, 5.00s]
        await minInput.fill('2.50');
        await minInput.dispatchEvent('change');

        await maxInput.fill('5.00');
        await maxInput.dispatchEvent('change');

        // Enable loop
        await loopCheckbox.check();
        expect(await page.evaluate(() => window.ToyPlug.editPage.timebar.loop)).toBe(true);

        // Advance time beyond max (e.g. 5.30s)
        await page.evaluate(() => {
            window.gShaderToy.SetTime(5.3);
        });

        // Timebar updateSlider loop should detect out-of-bounds (> 5000ms) and wrap back to min (2500ms / 2.5s)
        await page.waitForFunction(() => {
            return Math.abs(window.gShaderToy.mTime - 2.5) < 0.05;
        }, { timeout: 3000 });

        const wrappedTime = await page.evaluate(() => window.gShaderToy.mTime);
        expect(wrappedTime).toBeCloseTo(2.5, 2);

        // Also test lower bound: if playback time falls below min (< 2.50s), wraps back to min
        await page.evaluate(() => {
            window.gShaderToy.SetTime(1.2);
        });

        await page.waitForFunction(() => {
            return Math.abs(window.gShaderToy.mTime - 2.5) < 0.05;
        }, { timeout: 3000 });

        const wrappedLowerTime = await page.evaluate(() => window.gShaderToy.mTime);
        expect(wrappedLowerTime).toBeCloseTo(2.5, 2);
    });

    test('loop bounds inputs are never overwritten by current playback time', async({ page }) => {
        const loopCheckbox = page.locator('.toyplug-controls-container .ste-loop-toggle');
        const minInput = page.locator('.toyplug-controls-container .ste-min-input');
        const maxInput = page.locator('.toyplug-controls-container .ste-max-input');

        // Set bounds to 2.50s and 5.00s
        await minInput.fill('2.50');
        await minInput.dispatchEvent('change');

        await maxInput.fill('5.00');
        await maxInput.dispatchEvent('change');

        await loopCheckbox.check();

        // Simulate advancing playback time within bounds
        const testTimes = [2.8, 3.4, 4.1, 4.9];
        for (const t of testTimes) {
            await page.evaluate(timeVal => {
                window.gShaderToy.SetTime(timeVal);
            }, t);

            // Wait a brief tick for timebar.updateSlider() to cycle
            await page.waitForTimeout(50);

            // Min and max input values must remain strictly unchanged
            expect(await minInput.inputValue()).toBe('2.50');
            expect(await maxInput.inputValue()).toBe('5.00');
        }
    });
});
