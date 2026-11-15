const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Media Capture and Video Recording Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.recordButton
            );
        });
    });

    test('renders video recording button and FPS selector in controls footer', async({ page }) => {
        const recordBtn = page.locator('.ste-footer .ste-record-btn');
        await expect(recordBtn).toBeAttached();

        const fpsSelect = page.locator('.ste-footer .ste-record-fps-select');
        await expect(fpsSelect).toBeAttached();

        const options = fpsSelect.locator('option');
        await expect(options).toHaveCount(5);

        const fpsValues = await options.allTextContents();
        expect(fpsValues).toContain('50 fps');
        expect(fpsValues).toContain('60 fps');
        expect(fpsValues).toContain('120 fps');
        expect(fpsValues).toContain('144 fps');
        expect(fpsValues).toContain('240 fps');
    });

    test('toggles recording state and active class on record button click', async({ page }) => {
        const recordBtn = page.locator('.ste-footer .ste-record-btn');

        // Initial state: not recording
        const isRecordingInitial = await page.evaluate(() => window.ToyPlug.editPage.isRecording);
        expect(isRecordingInitial).toBeFalsy();

        // Click record button to start
        await recordBtn.click();

        const isRecordingActive = await page.evaluate(() => window.ToyPlug.editPage.isRecording);
        expect(isRecordingActive).toBe(true);
        await expect(recordBtn).toHaveClass(/recording-active/);

        // Click again to stop
        await recordBtn.click();

        const isRecordingStopped = await page.evaluate(() => window.ToyPlug.editPage.isRecording);
        expect(isRecordingStopped).toBe(false);
        await expect(recordBtn).not.toHaveClass(/recording-active/);
    });

    test('shortcut Alt + Shift + R toggles recording state', async({ page }) => {
        const isRecordingInitial = await page.evaluate(() => Boolean(window.ToyPlug.editPage.isRecording));
        expect(isRecordingInitial).toBe(false);

        // Dispatch Alt + Shift + R
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'r',
                code: 'KeyR',
                altKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 82 });
            document.getElementById('demogl').dispatchEvent(event);
        });

        const isRecordingStarted = await page.evaluate(() => Boolean(window.ToyPlug.editPage.isRecording));
        expect(isRecordingStarted).toBe(true);

        // Toggle back off with shortcut
        await page.evaluate(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'r',
                code: 'KeyR',
                altKey: true,
                shiftKey: true,
                bubbles: true
            });
            Object.defineProperty(event, 'which', { value: 82 });
            document.getElementById('demogl').dispatchEvent(event);
        });

        const isRecordingEnded = await page.evaluate(() => Boolean(window.ToyPlug.editPage.isRecording));
        expect(isRecordingEnded).toBe(false);
    });

    test('takeScreenShot temporarily super-samples resolution and creates a PNG download link', async({ page }) => {
        let downloadTriggered = false;

        await page.evaluate(() => {
            // Mock canvas toDataURL
            window.gShaderToy.mEffect.mGLContext = {
                canvas: {
                    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                }
            };

            // Intercept anchor clicks
            window.__downloadLinkCreated = false;
            const originalCreateElement = document.createElement.bind(document);
            document.createElement = function(tagName) {
                const el = originalCreateElement(tagName);
                if (tagName.toLowerCase() === 'a') {
                    el.addEventListener('click', () => {
                        const href = el.getAttribute('href');
                        const download = el.getAttribute('download');
                        if (href && href.startsWith('data:image/png') && download && download.endsWith('.png')) {
                            window.__downloadLinkCreated = true;
                        }
                    });
                }
                return el;
            };

            window.ToyPlug.editPage.takeScreenShot();
        });

        // Wait for takeScreenShot timeouts (100ms image data, 1000ms link creation)
        await page.waitForTimeout(1200);

        downloadTriggered = await page.evaluate(() => Boolean(window.__downloadLinkCreated));
        expect(downloadTriggered).toBe(true);
    });
});
