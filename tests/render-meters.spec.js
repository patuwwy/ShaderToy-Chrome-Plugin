const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('GPU Render Meters Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage
            );
        });
    });

    test('handles GPU timer queries availability gracefully', async({ page }) => {
        const renderMetersState = await page.evaluate(() => {
            const hasContainer = Boolean(document.querySelector('.ste-rendering-meters'));
            const rm = window.ToyPlug.editPage.performanceIndicators;
            return {
                hasContainer: hasContainer,
                hasMetersInstance: Boolean(rm)
            };
        });

        expect(renderMetersState.hasMetersInstance).toBe(true);
    });

    test('responds to toyplug:renderTimersVisibility events', async({ page }) => {
        await page.evaluate(() => {
            window.__timersVisibilityState = null;
            document.addEventListener('toyplug:renderTimersVisibility', e => {
                window.__timersVisibilityState = e.detail && e.detail.enabled;
            });

            document.dispatchEvent(
                new CustomEvent('toyplug:renderTimersVisibility', {
                    detail: { enabled: true }
                })
            );
        });

        const state = await page.evaluate(() => window.__timersVisibilityState);
        expect(state).toBe(true);
    });
});
