const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Profile Page and Recent Shaders Tests', () => {
    test.beforeEach(async({ page }) => {
        // Setup initial recent shaders in localStorage
        await page.addInitScript(() => {
            window.localStorage.setItem('RecentShaders', JSON.stringify([
                { id: 'shader001', title: 'First Cool Shader' },
                { id: 'shader002', title: 'Second Raymarching Shader' }
            ]));
        });

        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage
            );
        });

        // Inject shadertoy-plugin-common.js which houses RecentShaders
        await page.evaluate(() => {
            const script = document.createElement('script');
            script.src = '../../app/shadertoy-plugin-common.js';
            document.body.appendChild(script);
        });
    });

    test('RecentShaders renders Open recent button and populates list from localStorage', async({ page }) => {
        const recentLabel = page.locator('label.recent-list');
        await expect(recentLabel).toBeAttached({ timeout: 5000 });
        await expect(recentLabel).toContainText('Open recent...');

        const checkbox = page.locator('#ste-recent-checkbox');
        await expect(checkbox).toBeAttached();

        const items = recentLabel.locator('ul li');
        await expect(items).toHaveCount(2);

        const firstItemText = await items.nth(0).textContent();
        expect(firstItemText).toBe('First Cool Shader');

        const secondItemText = await items.nth(1).textContent();
        expect(secondItemText).toBe('Second Raymarching Shader');

        const firstItemLink = await items.nth(0).locator('a').getAttribute('href');
        expect(firstItemLink).toContain('/view/shader001');
    });

    test('clicking outside Open recent dropdown closes the menu', async({ page }) => {
        const checkbox = page.locator('#ste-recent-checkbox');

        // Open menu by checking checkbox
        await checkbox.evaluate(el => {
            el.checked = true;
        });
        expect(await checkbox.isChecked()).toBe(true);

        // Click outside on body
        await page.dispatchEvent('body', 'click');

        expect(await checkbox.isChecked()).toBe(false);
    });
});
