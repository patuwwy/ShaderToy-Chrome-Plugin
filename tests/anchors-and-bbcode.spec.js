const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const harnessPath = path.resolve(__dirname, 'fixtures/shadertoy-harness.html');
const harnessUrl = pathToFileURL(harnessPath).href + '#.com/view';

test.describe('AnchorsMaker and Rich Links Tests', () => {
    test.beforeEach(async({ page }) => {
        await page.goto(harnessUrl);
        await page.waitForFunction(() => {
            return Boolean(
                window.gShaderToy &&
                window.ToyPlug &&
                window.ToyPlug.editPage &&
                window.ToyPlug.editPage.anchorsMaker
            );
        });
    });

    test('replaces raw http/https URLs with clickable target="_blank" anchor tags', async({ page }) => {
        // Prepare a container element with raw text URLs
        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'testLinkContainer';
            container.innerHTML = 'Check this awesome resource: https://shadertoy.com/view/example and http://github.com/patuwwy';
            document.body.appendChild(container);

            const maker = window.ToyPlug && window.ToyPlug.editPage && window.ToyPlug.editPage.anchorsMaker;
            if (maker && typeof maker._makeLink === 'function') {
                maker._makeLink(container);
            }
        });

        const container = page.locator('#testLinkContainer');
        const links = container.locator('a.ext-link');
        await expect(links).toHaveCount(2);

        await expect(links.nth(0)).toHaveAttribute('target', '_blank');
        await expect(links.nth(0)).toHaveAttribute('href', 'https://shadertoy.com/view/example');

        await expect(links.nth(1)).toHaveAttribute('target', '_blank');
        await expect(links.nth(1)).toHaveAttribute('href', 'http://github.com/patuwwy');
    });

    test('does not double-wrap URLs that are already inside existing anchor tags', async({ page }) => {
        await page.evaluate(() => {
            const container = document.createElement('div');
            container.id = 'testExistingLinkContainer';
            container.innerHTML = '<a href="https://already-a-link.org">https://already-a-link.org</a> and new link https://fresh-link.com';
            document.body.appendChild(container);

            const maker = window.ToyPlug && window.ToyPlug.editPage && window.ToyPlug.editPage.anchorsMaker;
            if (maker && typeof maker._makeLink === 'function') {
                maker._makeLink(container);
            }
        });

        const container = page.locator('#testExistingLinkContainer');
        const freshLinks = container.locator('a.ext-link');
        // Only the un-wrapped URL should be wrapped by _makeLink
        await expect(freshLinks).toHaveCount(1);
        await expect(freshLinks.nth(0)).toHaveAttribute('href', 'https://fresh-link.com');
    });
});
