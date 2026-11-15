const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Timebar Regression Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.timebar &&
                window.ToyPlug.editPage.timebar.sliderInput
            );
        });
    });

    test('slider dragging/scrubbing updates gShaderToy.mTime', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Initial time check
        const initialTime = await page.evaluate(() => window.gShaderToy.mTime);
        expect(initialTime).toBe(0);

        // Begin dragging/scrubbing: mousedown, input to 3500ms (3.5s), mouseup
        await slider.dispatchEvent('mousedown');
        await slider.evaluate(el => {
            el.value = '3500';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await slider.dispatchEvent('mouseup');

        // Verify gShaderToy.mTime and mEffect.mTime reflect the scrubbed time in seconds
        const updatedTime = await page.evaluate(() => window.gShaderToy.mTime);
        expect(updatedTime).toBeCloseTo(3.5, 2);

        const effectTime = await page.evaluate(() => window.gShaderToy.mEffect.mTime);
        expect(effectTime).toBeCloseTo(3.5, 2);

        // Native time indicator in Shadertoy DOM is also updated
        const timeDisplay = await page.locator('#myTime').textContent();
        expect(timeDisplay).toBe('3.50');
    });

    test('scrubbing on pause triggers mEffect.RequestFrame() while keeping mIsPaused === true', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Pause playback
        await page.evaluate(() => {
            window.gShaderToy.pauseTime();
        });
        const isPausedBefore = await page.evaluate(() => window.gShaderToy.mIsPaused);
        expect(isPausedBefore).toBe(true);

        const initialFrameCount = await page.evaluate(() => window.gShaderToy._requestFrameCount);

        // Begin scrubbing while paused
        await slider.dispatchEvent('mousedown');
        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);

        // Move slider during scrub
        await slider.evaluate(el => {
            el.value = '8200';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // RequestFrame must be triggered while scrubbing on pause to update the canvas
        const frameCountDuring = await page.evaluate(() => window.gShaderToy._requestFrameCount);
        expect(frameCountDuring).toBeGreaterThan(initialFrameCount);

        // Pause state must remain true throughout scrubbing
        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);

        // Finish scrubbing
        await slider.dispatchEvent('mouseup');

        // Pause state must remain true after scrubbing ends
        const isPausedAfter = await page.evaluate(() => window.gShaderToy.mIsPaused);
        expect(isPausedAfter).toBe(true);

        const scrubbedTime = await page.evaluate(() => window.gShaderToy.mTime);
        expect(scrubbedTime).toBeCloseTo(8.2, 2);
    });

    test('arrow keys (ArrowLeft/ArrowRight) shift time by exactly 1 frame (~16.67ms / 1000/60)', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Set baseline time to 2.000s
        await page.evaluate(() => {
            window.gShaderToy.SetTime(2.0);
        });

        await slider.focus();

        // ArrowRight: advance time by 1 frame (1000 / 60 ms = 1 / 60 s ~ 0.01667s)
        await page.keyboard.press('ArrowRight');

        const timeAfterRight = await page.evaluate(() => window.gShaderToy.mTime);
        const expectedForward = 2.0 + (1 / 60);
        expect(timeAfterRight).toBeCloseTo(expectedForward, 4);

        // ArrowLeft: rewind time by 1 frame back to baseline 2.0s
        await page.keyboard.press('ArrowLeft');

        const timeAfterLeft = await page.evaluate(() => window.gShaderToy.mTime);
        expect(timeAfterLeft).toBeCloseTo(2.0, 4);
    });

    test('Shift + ArrowRight/ArrowLeft shifts time by 1.0s', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Set baseline time to 2.500s
        await page.evaluate(() => {
            window.gShaderToy.SetTime(2.5);
        });

        await slider.focus();

        // Shift + ArrowRight: advance time by exactly 1.0s
        await page.keyboard.press('Shift+ArrowRight');

        const timeAfterShiftRight = await page.evaluate(() => window.gShaderToy.mTime);
        expect(timeAfterShiftRight).toBeCloseTo(3.5, 3);

        // Shift + ArrowLeft: rewind time by exactly 1.0s
        await page.keyboard.press('Shift+ArrowLeft');

        const timeAfterShiftLeft = await page.evaluate(() => window.gShaderToy.mTime);
        expect(timeAfterShiftLeft).toBeCloseTo(2.5, 3);
    });

    test('clicking on slider track sets time correctly', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Simulate click/change on slider at 15.0s (15000ms)
        await slider.evaluate(el => {
            el.value = '15000';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const timeAfterChange = await page.evaluate(() => window.gShaderToy.mTime);
        expect(timeAfterChange).toBeCloseTo(15.0, 2);

        const timeDisplay = await page.locator('#myTime').textContent();
        expect(timeDisplay).toBe('15.00');

        // Test pointer click along track
        const box = await slider.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
            const timeAfterClick = await page.evaluate(() => window.gShaderToy.mTime);
            expect(timeAfterClick).toBeGreaterThan(0);
        }
    });

    test('scrubbing does not randomly toggle gShaderToy.Pause()', async({ page }) => {
        const slider = page.locator('.toyplug-controls-container .time-slider input[type="range"]');
        await expect(slider).toBeAttached();

        // Scenario 1: Unpaused state remains unpaused throughout and after scrubbing
        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(false);

        await slider.dispatchEvent('mousedown');
        await slider.evaluate(el => {
            el.value = '4000';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await slider.dispatchEvent('mouseup');

        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(false);

        // Scenario 2: Paused state remains strictly paused across multiple rapid scrubbing gestures
        await page.evaluate(() => {
            window.gShaderToy.pauseTime();
        });
        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);

        const scrubTargets = ['1000', '5000', '2000', '12000'];
        for (const target of scrubTargets) {
            await slider.dispatchEvent('mousedown');
            expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);

            await slider.evaluate((el, val) => {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }, target);
            expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);

            await slider.dispatchEvent('mouseup');
            expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);
        }

        // Final assertion: mIsPaused is still strictly true and gShaderToy.mTime is updated
        expect(await page.evaluate(() => window.gShaderToy.mIsPaused)).toBe(true);
        expect(await page.evaluate(() => window.gShaderToy.mTime)).toBeCloseTo(12.0, 2);
    });
});
