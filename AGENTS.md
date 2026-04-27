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
- Preserve legacy coding style: 4 spaces, semicolons, single quotes.
- Avoid broad reformatting in old files unless explicitly requested.
- Do not edit vendored Monaco files under `app/add-ons/monaco/min/**` unless asked.
- Update both browser manifest templates when adding/removing extension resources.
- If a user-facing behavior changes, add a concise top entry in `CHANGELOG.md`.
- For popup visuals, always provide a local fallback and do not rely only on remote embeds.

## Validation Checklist

After code changes, validate at least the impacted area:

1. Lint/syntax: ensure edited files have no editor errors.
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
