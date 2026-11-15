const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('BBCode Toolbar Add-on Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage
            );
        });

        // Setup comment textarea expected by shadertoy-plugin-bbcode.js
        await page.evaluate(() => {
            let commentArea = document.getElementById('commentTextArea');
            if (!commentArea) {
                commentArea = document.createElement('textarea');
                commentArea.id = 'commentTextArea';
                document.body.appendChild(commentArea);
            }
            commentArea.value = 'Shader comment';

            const script = document.createElement('script');
            script.src = '../../app/add-ons/shadertoy-plugin-bbcode.js';
            document.body.appendChild(script);
        });
    });

    test('renders BBCode toolbar buttons above comments textarea', async({ page }) => {
        const textArea = page.locator('#commentTextArea');
        await textArea.focus();

        const bbcodeButtons = page.locator('.bbcode-button.bbcode-button-row');
        await expect(bbcodeButtons.first()).toBeAttached({ timeout: 5000 });

        // There are at least 6 standard formatting buttons + dropdowns
        const count = await bbcodeButtons.count();
        expect(count).toBeGreaterThanOrEqual(6);
    });

    test('clicking Bold button wraps or inserts [b][/b] tags into textarea', async({ page }) => {
        const textArea = page.locator('#commentTextArea');
        await textArea.focus();
        await textArea.evaluate(el => {
            el.value = 'hello world';
            el.selectionStart = 0;
            el.selectionEnd = 5; // Select 'hello'
        });

        // Find the bold button (first row button)
        const boldButton = page.locator('.bbcode-button.bbcode-button-row').first();
        await boldButton.dispatchEvent('mousedown');

        const value = await textArea.inputValue();
        expect(value).toContain('[b]');
        expect(value).toContain('[/b]');
    });

    test('clicking Italic button inserts [i][/i] tags', async({ page }) => {
        const textArea = page.locator('#commentTextArea');
        await textArea.focus();
        await textArea.evaluate(el => {
            el.value = 'test italic';
            el.selectionStart = 5;
            el.selectionEnd = 11;
        });

        const italicButton = page.locator('.bbcode-button.bbcode-button-row').nth(1);
        await italicButton.dispatchEvent('mousedown');

        const value = await textArea.inputValue();
        expect(value).toContain('[i]');
        expect(value).toContain('[/i]');
    });

    test('clicking URL button inserts [url][/url] tags', async({ page }) => {
        const textArea = page.locator('#commentTextArea');
        await textArea.focus();
        await textArea.evaluate(el => {
            el.value = 'https://link.com';
            el.selectionStart = 0;
            el.selectionEnd = 16;
        });

        const urlButton = page.locator('.bbcode-button.bbcode-button-row').nth(3);
        await urlButton.dispatchEvent('mousedown');

        const value = await textArea.inputValue();
        expect(value).toContain('[url]');
        expect(value).toContain('[/url]');
    });
});
