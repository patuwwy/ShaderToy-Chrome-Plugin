const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const popupPath = path.resolve(__dirname, '../app/popup.html');
const popupUrl = pathToFileURL(popupPath).href;

test.describe('Extension Popup UI Tests', () => {
    test.beforeEach(async({ page }) => {
        // Mock chrome API for standalone popup page testing
        await page.addInitScript(() => {
            window.chrome = {
                runtime: {
                    getManifest: () => ({ version: '0.15.12' })
                },
                tabs: {
                    query: (_query, cb) => {
                        if (typeof cb === 'function') cb([{ id: 101 }]);
                    },
                    sendMessage: (_tabId, _msg, cb) => {
                        if (typeof cb === 'function') {
                            cb({
                                alternateProfile: false,
                                renderMode: 'default'
                            });
                        }
                    },
                    create: () => {}
                }
            };
        });

        await page.goto(popupUrl);
    });

    test('renders popup header, plasma canvas backdrop, and settings controls', async({ page }) => {
        // Plasma canvas background
        const canvasBackdrop = page.locator('.shader-canvas');
        await expect(canvasBackdrop).toBeAttached();

        // Alternate profile page checkbox
        const altProfileCheckbox = page.locator('#input-alternate-profile');
        await expect(altProfileCheckbox).toBeAttached();
        await expect(altProfileCheckbox).not.toBeChecked();

        // Rendering mode select dropdown
        const renderModeSelect = page.locator('#input-rendering-mode');
        await expect(renderModeSelect).toBeAttached();
        await expect(renderModeSelect).toHaveValue('default');

        const options = renderModeSelect.locator('option');
        await expect(options).toHaveCount(2);
        await expect(options.nth(0)).toHaveText('Default');
        await expect(options.nth(1)).toHaveText('Pixelated');
    });

    test('displays version number matching manifest', async({ page }) => {
        const versionEl = page.locator('#version');
        await expect(versionEl).toBeAttached();
        await expect(versionEl).toHaveText('v0.15.12');
    });

    test('displays keyboard shortcuts guide', async({ page }) => {
        const keysList = page.locator('.keys').first();
        await expect(keysList).toBeAttached();

        const allKeys = await page.locator('.keys').allTextContents();
        const listContent = allKeys.join(' ');
        expect(listContent).toContain('ALT + 1..9');
        expect(listContent).toContain('Forward');
        expect(listContent).toContain('Rewind');
        expect(listContent).toContain('Fullscreen edit');
        expect(listContent).toContain('Take HQ screenshot');
        expect(listContent).toContain('Record');
        expect(listContent).toContain('Code Completion');
    });

    test('contains working support and github repository links', async({ page }) => {
        const kofiLink = page.locator('a[href*="ko-fi.com/patu_pl"]');
        await expect(kofiLink).toBeAttached();

        const paypalLink = page.locator('a[href*="paypal.com"]');
        await expect(paypalLink).toBeAttached();

        const gitLink = page.locator('.gitlink');
        await expect(gitLink).toBeAttached();
        await expect(gitLink).toHaveAttribute('href', 'https://github.com/patuwwy/ShaderToy-Chrome-Plugin');
    });
});
