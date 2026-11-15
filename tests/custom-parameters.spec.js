const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Custom Parameters Add-on Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage
            );
        });

        // Inject shadertoy-plugin-parameters.js
        await page.evaluate(() => {
            const script = document.createElement('script');
            script.src = '../../app/add-ons/shadertoy-plugin-parameters.js';
            document.body.appendChild(script);
        });
    });

    test('parses custom parameters comment block and sets custom canvas resolution', async({ page }) => {
        // Setup Common pass tab (id=1) with valid custom parameters JSON block
        const parametersJson = [
            '/* shadertoy-plugin parameters',
            '{',
            '    "canvas": {',
            '        "width": 1280,',
            '        "height": 720',
            '    }',
            '}',
            '*/'
        ].join('\n');

        await page.evaluate(code => {
            // Mock common tab image indicator as expected by getParameters()
            const tab1 = document.getElementById('tab1');
            if (tab1 && !tab1.querySelector('img[src="/img/common.png"]')) {
                const img = document.createElement('img');
                img.src = '/img/common.png';
                tab1.appendChild(img);
            }

            // Set Common pass code
            window.gShaderToy.mPass[1].mDocs.setValue(code);
            window.gShaderToy.iSetResolution = function(w, h) {
                this.mCanvas.width = w;
                this.mCanvas.height = h;
            };

            // Trigger re-evaluation via compile button click
            document.getElementById('compileButton').click();
        }, parametersJson);

        // Wait for parameter changes to apply to canvas style
        await page.waitForFunction(() => {
            const el = document.getElementById('demogl');
            return Boolean(el && el.getAttribute('style') && el.getAttribute('style').includes('aspect-ratio'));
        });

        const canvas = page.locator('#demogl');
        const canvasStyle = await canvas.getAttribute('style');
        expect(canvasStyle).toContain('aspect-ratio: 1280 / 720');
        expect(canvasStyle).toContain('margin: auto');
    });

    test('injects custom textures into mEffect when specified in parameters', async({ page }) => {
        const textureParams = [
            '/* shadertoy-plugin parameters',
            '{',
            '    "textures": [',
            '        "https://example.com/custom_texture.png"',
            '    ]',
            '}',
            '*/'
        ].join('\n');

        await page.evaluate(code => {
            const tab1 = document.getElementById('tab1');
            if (tab1 && !tab1.querySelector('img[src="/img/common.png"]')) {
                const img = document.createElement('img');
                img.src = '/img/common.png';
                tab1.appendChild(img);
            }

            window.gShaderToy.mPass[1].mDocs.setValue(code);

            // Record calls to NewTexture
            window.__newTextureCalls = [];
            window.gShaderToy.mEffect.NewTexture = function(pass, channel, config) {
                window.__newTextureCalls.push({ pass: pass, channel: channel, config: config });
            };

            document.getElementById('compileButton').click();
        }, textureParams);

        // Wait for texture injection call
        await page.waitForFunction(() => (window.__newTextureCalls || []).length > 0);

        const newTextureCalls = await page.evaluate(() => window.__newTextureCalls || []);
        expect(newTextureCalls.length).toBeGreaterThanOrEqual(1);
        expect(newTextureCalls[0].channel).toBe(0);
        expect(newTextureCalls[0].config.mSrc).toBe('https://example.com/custom_texture.png');
    });
});
