const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Shader Export, Import, and Draft Duplication Tests', () => {
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

    test('Save as new draft resets ID to -1 and triggers draft submission', async({ page }) => {
        const draftBtn = page.locator('.ste-footer').getByText('Save as new draft');
        await expect(draftBtn).toBeAttached();

        await page.evaluate(() => {
            window.__submitCalled = false;
            window.openSubmitShaderForm = function(update) {
                window.__submitCalled = true;
                window.__submitArg = update;
            };
            window.gShaderToy.mNeedsSave = false;
        });

        await draftBtn.click();

        const submitCalled = await page.evaluate(() => window.__submitCalled);
        expect(submitCalled).toBe(true);

        const currentId = await page.evaluate(() => window.gShaderToy.mInfo.id);
        expect(currentId).toBe('-1');

        const currentUsername = await page.evaluate(() => window.gShaderToy.mInfo.username);
        expect(currentUsername).toBe('None');

        const publishedVal = await page.locator('#published').inputValue();
        expect(publishedVal).toBe('0');
    });

    test('Export button triggers JSON download with current shader payload', async({ page }) => {
        const exportBtn = page.locator('.ste-footer').getByText('Export', { exact: true });
        await expect(exportBtn).toBeAttached();

        await page.evaluate(() => {
            window.__downloadedJson = null;
            window.__downloadedFileName = null;
            window.ToyPlug.common.downloadJson = function(filename, content) {
                window.__downloadedFileName = filename;
                window.__downloadedJson = JSON.parse(content);
            };
        });

        await exportBtn.click();

        const filename = await page.evaluate(() => window.__downloadedFileName);
        expect(filename).toBe('test_shader_id.json');

        const json = await page.evaluate(() => window.__downloadedJson);
        expect(json).toBeTruthy();
        expect(json.info).toBeTruthy();
        expect(json.renderpass).toBeTruthy();
    });

    test('renders Export as ZIP and Import controls in footer', async({ page }) => {
        const zipBtn = page.locator('.ste-footer').getByText('ZIP');
        await expect(zipBtn).toBeAttached();

        const importBtn = page.locator('.ste-footer').getByText('Import');
        await expect(importBtn).toBeAttached();
    });
});
