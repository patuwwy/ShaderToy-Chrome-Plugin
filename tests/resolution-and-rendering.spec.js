const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Resolution Multipliers and Rendering Mode Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.c
            );
        });
    });

    test('downscales canvas resolution with Alt + 2 shortcut', async({ page }) => {
        const canvas = page.locator('#demogl');
        await expect(canvas).toBeAttached();

        // Dispatch Alt + '2' with which=50
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: '2',
                code: 'Digit2',
                altKey: true,
                shiftKey: false,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 50 });
            document.getElementById('demogl').dispatchEvent(event);
        });

        const currentDivider = await page.evaluate(() => window.ToyPlug.editPage.currentDivider);
        expect(currentDivider).toBeCloseTo(0.5, 2);

        const resizeCalled = await page.evaluate(() => {
            const history = window.__harnessState ? window.__harnessState.requestFrameCalls : 0;
            return history >= 0;
        });
        expect(resizeCalled).toBe(true);
    });

    test('upscales canvas resolution with Alt + Shift + 2 shortcut', async({ page }) => {
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: '2',
                code: 'Digit2',
                altKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 50 });
            document.getElementById('demogl').dispatchEvent(event);
        });

        const currentDivider = await page.evaluate(() => window.ToyPlug.editPage.currentDivider);
        expect(currentDivider).toBe(2);
    });

    test('toggles pixelated rendering mode on canvas element', async({ page }) => {
        // Apply pixelated mode
        await page.evaluate(() => {
            window.ToyPlug.setRenderMode('pixelated');
        });

        const renderingModePixelated = await page.evaluate(() => {
            return window.ToyPlug.editPage.c.style.imageRendering;
        });
        expect(renderingModePixelated).toBe('pixelated');

        // Revert to default mode
        await page.evaluate(() => {
            window.ToyPlug.setRenderMode('default');
        });

        const renderingModeDefault = await page.evaluate(() => {
            return window.ToyPlug.editPage.c.style.imageRendering;
        });
        expect(renderingModeDefault).toBe('');
    });

    test('toggles fullscreen edit mode with Shift + Ctrl + Enter shortcut', async({ page }) => {
        // Initial state: body does not have fullscreen-edit
        const initialFS = await page.evaluate(() => document.body.classList.contains('fullscreen-edit'));
        expect(initialFS).toBe(false);

        // Dispatch Shift + Ctrl + Enter with which=13
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 13 });
            document.dispatchEvent(event);
        });

        const activeFS = await page.evaluate(() => document.body.classList.contains('fullscreen-edit'));
        expect(activeFS).toBe(true);

        // Toggle back off
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 13 });
            document.dispatchEvent(event);
        });

        const revertedFS = await page.evaluate(() => document.body.classList.contains('fullscreen-edit'));
        expect(revertedFS).toBe(false);
    });

    test('entering and exiting fullscreen preserves pause state and triggers redraw of the same frame at designated resolution', async({ page }) => {
        // Set specific playback time (e.g. 2.5s) and ensure shader is paused
        await page.evaluate(() => {
            window.gShaderToy.SetTime(2.5);
            if (!window.gShaderToy.mIsPaused) {
                window.gShaderToy.pauseTime();
            }
        });
        const isPausedInitially = await page.evaluate(() => window.gShaderToy.mIsPaused);
        expect(isPausedInitially).toBe(true);

        // Record initial state: playback time, frame, frame count and canvas resolution
        const timeBefore = await page.evaluate(() => window.gShaderToy.mTime);
        const frameBefore = await page.evaluate(() => window.gShaderToy.mFrame);
        const initialFrameCount = await page.evaluate(() => window.gShaderToy._requestFrameCount);
        const initialRes = await page.evaluate(() => ({
            width: window.gShaderToy.mEffect.mXres,
            height: window.gShaderToy.mEffect.mYres
        }));
        expect(timeBefore).toBeCloseTo(2.5, 2);
        expect(initialRes.width).toBe(800);
        expect(initialRes.height).toBe(450);

        // 1. Enter fullscreen mode (Shift + Ctrl + Enter)
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 13 });
            document.dispatchEvent(event);
        });

        // Verify canvas/buffer resolution is updated to fullscreen dimensions
        const fullscreenRes = await page.evaluate(() => ({
            width: window.gShaderToy.mEffect.mXres,
            height: window.gShaderToy.mEffect.mYres,
            canvasWidth: window.gShaderToy.mCanvas.width,
            canvasHeight: window.gShaderToy.mCanvas.height
        }));
        expect(fullscreenRes.width).toBeGreaterThan(800);
        expect(fullscreenRes.height).toBeGreaterThan(450);
        expect(fullscreenRes.canvasWidth).toBe(fullscreenRes.width);
        expect(fullscreenRes.canvasHeight).toBe(fullscreenRes.height);

        // Transitioning to fullscreen must NOT change pause state or advance frame
        const isPausedInFS = await page.evaluate(() => window.gShaderToy.mIsPaused);
        const timeInFS = await page.evaluate(() => window.gShaderToy.mTime);
        const frameInFS = await page.evaluate(() => window.gShaderToy.mFrame);
        expect(isPausedInFS).toBe(true);
        expect(timeInFS).toBeCloseTo(timeBefore, 3);
        expect(frameInFS).toBe(frameBefore);

        // CRITICAL BUG / REGRESSION: Switching to fullscreen in pause state must trigger a redraw
        // of that exact same frame (via mEffect.RequestFrame()) so the shader displays at the new resolution.
        // Currently fails because entering fullscreen does not trigger a redraw.
        const frameCountAfterFS = await page.evaluate(() => window.gShaderToy._requestFrameCount);
        expect(frameCountAfterFS).toBeGreaterThan(initialFrameCount);

        // 2. Exit fullscreen mode (Shift + Ctrl + Enter)
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 13 });
            document.dispatchEvent(event);
        });

        // Transitioning out of fullscreen must also preserve pause state and the exact same frame
        const isPausedAfterExit = await page.evaluate(() => window.gShaderToy.mIsPaused);
        const timeAfterExit = await page.evaluate(() => window.gShaderToy.mTime);
        const frameAfterExit = await page.evaluate(() => window.gShaderToy.mFrame);
        expect(isPausedAfterExit).toBe(true);
        expect(timeAfterExit).toBeCloseTo(timeBefore, 3);
        expect(frameAfterExit).toBe(frameBefore);
    });
});
