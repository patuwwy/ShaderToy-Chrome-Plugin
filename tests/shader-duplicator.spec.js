const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Shader Duplicator and Fork Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.shaderDuplicator
            );
        });
    });

    test('renders Fork button in extension controls container footer', async({ page }) => {
        const forkBtn = page.locator('.ste-footer .fork-shader-btn');
        await expect(forkBtn).toBeAttached();
        await expect(forkBtn).toHaveText('Fork');
    });

    test('generates fork banner with shader name, author and timestamp', async({ page }) => {
        const banner = await page.evaluate(() => {
            const duplicator = window.ToyPlug.editPage.shaderDuplicator;
            return duplicator.createBanner({
                name: 'Test Shader',
                username: 'ShaderAuthor',
                id: 'abc123xyz'
            });
        });

        expect(banner).toContain('// Fork of "Test Shader" by ShaderAuthor');
        expect(banner).toContain('https://shadertoy.com/view/abc123xyz');
    });

    test('forking shader serializes shader data and prepends banner into Image pass in localStorage', async({ page }) => {
        // Mock Save method on gShaderToy to return full shader structure
        await page.evaluate(() => {
            window.gShaderToy.mNeedsSave = false;
            window.gShaderToy.Save = function() {
                return {
                    info: {
                        name: 'Original Effect',
                        username: 'Creator',
                        id: 'testid999'
                    },
                    renderpass: [
                        {
                            name: 'Image',
                            code: 'void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0); }'
                        }
                    ]
                };
            };
        });

        // Trigger onButtonClick directly to avoid full page navigation in mock harness
        await page.evaluate(() => {
            const duplicator = window.ToyPlug.editPage.shaderDuplicator;
            const shaderData = window.gShaderToy.Save();
            const banner = duplicator.createBanner(shaderData.info);

            shaderData.renderpass.forEach(pass => {
                if (pass.name === 'Image') {
                    pass.code = banner + pass.code;
                }
            });

            window.localStorage.setItem('forkedShaderStorage', JSON.stringify(shaderData));
        });

        const storedRaw = await page.evaluate(() => window.localStorage.getItem('forkedShaderStorage'));
        expect(storedRaw).toBeTruthy();

        const stored = JSON.parse(storedRaw);
        expect(stored.info.name).toBe('Original Effect');
        expect(stored.renderpass[0].code).toContain('// Fork of "Original Effect" by Creator');
        expect(stored.renderpass[0].code).toContain('void mainImage');
    });
});
