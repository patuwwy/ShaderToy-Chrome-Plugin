# Build script for ShaderToy Chrome Plugin
# Requires: jq (https://jqlang.org/download/) and 7-Zip or built-in Compress-Archive

$ErrorActionPreference = 'Stop'

$VERSION = (Get-Content ./manifests/version.txt -Raw).Trim()
Write-Host "Building version: $VERSION"

# Cleanup and prepare output directories
if (Test-Path ./output) { Remove-Item ./output -Recurse -Force }
New-Item -ItemType Directory -Path ./output/chrome, ./output/firefox | Out-Null

# --- Chrome ---
Copy-Item ./app/* ./output/chrome -Recurse -Force
Copy-Item ./manifests/manifest-chrome.json ./output/chrome/manifest.json -Force
$manifest = Get-Content ./output/chrome/manifest.json -Raw | ConvertFrom-Json
$manifest.version = $VERSION
$manifest | ConvertTo-Json -Depth 10 | Set-Content ./output/chrome/manifest.json -Encoding UTF8
Compress-Archive -Path ./output/chrome/* -DestinationPath "./output/ShaderToy-Chrome-Plugin-$VERSION.zip" -Force
Write-Host "Chrome ZIP: output/ShaderToy-Chrome-Plugin-$VERSION.zip"

# --- Firefox ---
# FIREFOX_EXTENSION_ID can be passed as env variable or set here directly
$FIREFOX_EXTENSION_ID = $env:FIREFOX_EXTENSION_ID
if (-not $FIREFOX_EXTENSION_ID) {
    Write-Warning "FIREFOX_EXTENSION_ID not set - skipping gecko id injection"
}
Copy-Item ./app/* ./output/firefox -Recurse -Force
Copy-Item ./manifests/manifest-firefox.json ./output/firefox/manifest.json -Force
$manifest = Get-Content ./output/firefox/manifest.json -Raw | ConvertFrom-Json
if ($FIREFOX_EXTENSION_ID) {
    $manifest.browser_specific_settings.gecko.id = "{$FIREFOX_EXTENSION_ID}"
}
$manifest.version = $VERSION
$manifest | ConvertTo-Json -Depth 10 | Set-Content ./output/firefox/manifest.json -Encoding UTF8
Compress-Archive -Path ./output/firefox/* -DestinationPath "./output/ShaderToy-Firefox-Plugin-$VERSION.zip" -Force
Write-Host "Firefox ZIP: output/ShaderToy-Firefox-Plugin-$VERSION.zip"

Write-Host "Done. Output files in ./output/"
