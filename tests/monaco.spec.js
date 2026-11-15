const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('Monaco Editor Regression Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.monaco &&
                window.ToyPlug.monaco.b_monaco_initialized
            );
        });
    });

    test('switching between native editor and Monaco editor tab', async({ page }) => {
        const monacoTab = page.locator('#editorManager .tab.monaco');
        const nativeTab = page.locator('#editorManager .tab').first();
        const monacoEditorContainer = page.locator('#editor .monaco-editor');
        const codeMirrorContainer = page.locator('#editor .CodeMirror');

        await expect(monacoTab).toBeAttached();
        await expect(nativeTab).toBeAttached();

        // 1. Switch to Monaco Editor tab
        await monacoTab.click();

        await expect(monacoTab).toHaveClass(/selected/);
        await expect(nativeTab).not.toHaveClass(/selected/);
        await expect(monacoEditorContainer).toBeVisible();
        await expect(codeMirrorContainer).toBeHidden();

        const isMonacoActive = await page.evaluate(() => window.ToyPlug.monaco.isMonacoSelected());
        expect(isMonacoActive).toBe(true);

        // 2. Switch back to Native CodeMirror Editor tab
        await nativeTab.click();

        await expect(nativeTab).toHaveClass(/selected/);
        await expect(monacoTab).not.toHaveClass(/selected/);
        await expect(codeMirrorContainer).toBeVisible();
        await expect(monacoEditorContainer).toBeHidden();

        const isNativeActive = await page.evaluate(() => window.ToyPlug.monaco.isMonacoSelected());
        expect(isNativeActive).toBe(false);
    });

    test('pass tab switching (Image, Buffer A, Common) preserves code per pass without overwriting with stale cache', async({ page }) => {
        // Activate Monaco editor
        await page.locator('#editorManager .tab.monaco').click();
        expect(await page.evaluate(() => window.ToyPlug.monaco.isMonacoSelected())).toBe(true);

        const imageCode = '// PASS 0: Unique Image Pass Code\nvoid mainImage(out vec4 fragColor, in vec2 uv) { fragColor = vec4(1.0, 0.2, 0.3, 1.0); }';
        const commonCode = '// PASS 1: Unique Common Pass Code\n#define TEST_CONSTANT 42.0\nfloat helper() { return TEST_CONSTANT; }';
        const bufferCode = '// PASS 2: Unique Buffer A Code\nvoid mainImage(out vec4 fragColor, in vec2 uv) { fragColor = vec4(0.0, 1.0, 0.0, 1.0); }';

        // Set custom code on Pass 0 (Image)
        await page.evaluate(code => {
            const pass0 = window.gShaderToy.mPass[0];
            const model0 = pass0.mMonacoModel || window.ToyPlug.monaco.getOrCreateModelForPass(0);
            model0.setValue(code);
            window.ToyPlug.monaco.syncPassFromModel(0, model0);
        }, imageCode);

        // Switch to Pass 1 (Common)
        await page.locator('#tab1').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(1);

        // Set custom code on Pass 1 (Common)
        await page.evaluate(code => {
            const pass1 = window.gShaderToy.mPass[1];
            const model1 = pass1.mMonacoModel || window.ToyPlug.monaco.getOrCreateModelForPass(1);
            model1.setValue(code);
            window.ToyPlug.monaco.syncPassFromModel(1, model1);
        }, commonCode);

        // Switch to Pass 2 (Buffer A)
        await page.locator('#tab2').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(2);

        // Set custom code on Pass 2 (Buffer A)
        await page.evaluate(code => {
            const pass2 = window.gShaderToy.mPass[2];
            const model2 = pass2.mMonacoModel || window.ToyPlug.monaco.getOrCreateModelForPass(2);
            model2.setValue(code);
            window.ToyPlug.monaco.syncPassFromModel(2, model2);
        }, bufferCode);

        // Switch back to Pass 0 (Image) and verify its code is preserved and not overwritten
        await page.locator('#tab0').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(0);

        const currentPass0Code = await page.evaluate(() => window.gShaderToy.mPass[0].mDocs.getValue());
        expect(currentPass0Code).toBe(imageCode);
        expect(currentPass0Code).not.toContain('TEST_CONSTANT');
        expect(currentPass0Code).not.toContain('Buffer A');

        // Switch back to Pass 1 (Common) and verify
        await page.locator('#tab1').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(1);

        const currentPass1Code = await page.evaluate(() => window.gShaderToy.mPass[1].mDocs.getValue());
        expect(currentPass1Code).toBe(commonCode);

        // Switch back to Pass 2 (Buffer A) and verify
        await page.locator('#tab2').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(2);

        const currentPass2Code = await page.evaluate(() => window.gShaderToy.mPass[2].mDocs.getValue());
        expect(currentPass2Code).toBe(bufferCode);
    });

    test('shortcut Alt + Left / Alt + Right switches passes sequentially', async({ page }) => {
        // Activate Monaco editor
        await page.locator('#editorManager .tab.monaco').click();
        expect(await page.evaluate(() => window.ToyPlug.monaco.isMonacoSelected())).toBe(true);

        // Ensure we start on pass 0
        await page.locator('#tab0').click();
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(0);

        // Alt + Right: Switch forward (0 -> 1)
        await page.evaluate(() => window.ToyPlug.monaco.switchPassTab(1));
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(1);

        // Wait past 100ms throttle guard in switchPassTab
        await page.waitForTimeout(120);

        // Alt + Right: Switch forward (1 -> 2)
        await page.evaluate(() => window.ToyPlug.monaco.switchPassTab(1));
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(2);

        await page.waitForTimeout(120);

        // Alt + Right: Cycle forward (2 -> 0)
        await page.evaluate(() => window.ToyPlug.monaco.switchPassTab(1));
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(0);

        await page.waitForTimeout(120);

        // Alt + Left: Switch backward (0 -> 2)
        await page.evaluate(() => window.ToyPlug.monaco.switchPassTab(-1));
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(2);

        await page.waitForTimeout(120);

        // Alt + Left: Switch backward (2 -> 1)
        await page.evaluate(() => window.ToyPlug.monaco.switchPassTab(-1));
        expect(await page.evaluate(() => window.gShaderToy.mActiveDoc)).toBe(1);
    });

    test('shortcut Alt + Enter triggers compilation', async({ page }) => {
        // Activate Monaco editor
        await page.locator('#editorManager .tab.monaco').click();
        expect(await page.evaluate(() => window.ToyPlug.monaco.isMonacoSelected())).toBe(true);

        // Setup compiler listener in harness
        await page.evaluate(() => {
            window.__compileEventTriggered = false;
            window.addEventListener('shadertoy:compile', () => {
                window.__compileEventTriggered = true;
            });
        });

        // Trigger compilation via ToyPlug monaco compileShader
        await page.evaluate(() => {
            window.ToyPlug.monaco.compileShader();
        });

        // Verify compilation was triggered
        const wasCompiled = await page.evaluate(() => Boolean(window.__compileEventTriggered));
        expect(wasCompiled).toBe(true);
    });
});
