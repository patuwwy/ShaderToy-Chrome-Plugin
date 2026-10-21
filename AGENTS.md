# AGENTS.md

## Purpose

This file defines practical guidance for coding agents working in this repository.
The project is a browser extension for shadertoy.com with Chrome and Firefox builds.

## Project Layout

- `app/`: extension runtime files copied into distribution packages
- `app/background.js`: background worker/script entry
- `app/contentscript.js`: injects extension scripts into page context
- `app/popup.html` + `app/popup.js`: extension popup UI and logic
- `app/shadertoy-plugin*.js`: main feature modules
- `app/add-ons/`: optional feature modules and vendored Monaco assets
- `manifests/manifest-chrome.json`: Chrome manifest template
- `manifests/manifest-firefox.json`: Firefox manifest template
- `manifests/version.txt`: single source of truth for release version
- `CHANGELOG.md`: major changes history

## Build and Release Facts

- CI/CD workflow: `.github/workflows/main.yml`
- Packaging copies `app/*` and injects manifest templates per browser.
- Version is read from `manifests/version.txt` and written into packaged manifest files.
- Firefox package also injects `browser_specific_settings.gecko.id` from secrets.
- `app/manifest.json` is generated for local packaging and is ignored by git.

## Editing Rules for Agents

- Keep changes minimal and focused on the requested issue.
- Avoid broad reformatting in old files unless explicitly requested.
- Do not edit vendored Monaco files under `app/add-ons/monaco/min/**` unless asked.
- Code style and formatting (aligned with `.prettierrc` and `.eslintrc`):
  - **Indentation**: 4 spaces, no tabs (`useTabs: false`, `no-tabs`), no trailing whitespace (`no-trailing-spaces`), and ensure newline at EOF (`eol-last`). *(Exceptions: `Makefile` uses 8-width tabs, `*.yml` uses 2 spaces)*.
  - **Semicolons**: always include semicolons (`semi: true`, `"semi": ["error", "always"]`).
  - **Quotes**: single quotes (`singleQuote: true`, `"quotes": ["error", "single"]`); allow template literals when interpolating or escaping.
  - **Trailing commas**: none (`trailingComma: "none"`, `"comma-dangle": "never"` across arrays, objects, imports, exports, functions).
  - **Bracket spacing**: space inside object literal brackets (`{ foo: bar }`, `bracketSpacing: true`).
  - **Line width**: 160 characters max print width (`printWidth: 160`; `*.json` allows 200).
  - **Functions & braces**: 1TBS brace style (`brace-style: "1tbs"`), no space before function parentheses (`space-before-function-paren: "never"`), avoid parentheses around single-argument arrow functions (`arrowParens: "avoid"`).
  - **Equality**: use strict equality (`===` / `!==`, `eqeqeq`).
- Linting and JavaScript rules (aligned with `eslint.config.mjs` and `.eslintrc`):
  - **Runtime & syntax**: ECMAScript 2022 (`ecmaVersion: 2022`), `sourceType: 'script'`.
  - **No undefined variables**: avoid undeclared references (`no-undef: 'error'`). Declare or respect known globals (`chrome`, `browser`, `window`, `document`, `navigator`, `console`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `gShaderToy`, `ShaderToy`, `CustomEvent`, `cloneInto`, `JSZip`, `monaco`, `require`, `o_editor_monaco`, `WebGL2RenderingContext`, `EffectPass`).
  - **Unused variables**: avoid unused variables (`no-unused-vars`); prefix intentionally unused variables with `_` or `ignore` (matches `varsIgnorePattern: '^_|^ignore'`).
  - **Linter scope**: `eslint.config.mjs` targets `app/*.js` and ignores `app/*/**` (subdirectories like `app/add-ons/`), `output/**`, and `node_modules/**`.
- Update both browser manifest templates when adding/removing extension resources.
- If a user-facing behavior changes, add a concise top entry in `CHANGELOG.md`.
- For popup visuals, always provide a local fallback and do not rely only on remote embeds.

## Validation Checklist

After code changes, validate at least the impacted area:

1. Lint/syntax: run `npx eslint "app/*.js"` and ensure edited files have no linter or editor errors.
2. Chrome manual check:
   - load unpacked extension from project root,
   - open shadertoy.com and verify target behavior,
   - open popup and verify UI behavior.
3. Firefox manual check (for compatibility-sensitive changes):
   - load temporary add-on from `app/manifest.json` or packaged output,
   - re-check the same behavior and popup.
4. If release-related files changed, verify:
   - `manifests/version.txt` value,
   - matching `CHANGELOG.md` top entry.

## Common Pitfalls

- Editing only `app/manifest.json` is insufficient; templates in `manifests/` are authoritative.
- Cross-browser differences in background config are intentional:
  - Chrome uses `background.service_worker`
  - Firefox uses `background.scripts`
- Resources injected by content script must exist and be listed in `web_accessible_resources`.
