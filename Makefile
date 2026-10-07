# Detect OS
# Detect environment
ifeq ($(MSYSTEM),)
    # Windows PowerShell / CMD
    IS_WINDOWS := 1
else
    # MSYS2 / Git Bash / MinGW / WSL
    IS_WINDOWS := 0
endif


ifeq ($(IS_WINDOWS),1)
    SHELL := powershell.exe
    RM := powershell -Command "Remove-Item -Recurse -Force"
    CP := powershell -Command "Copy-Item -Recurse -Force"
    MKDIR := powershell -Command "New-Item -ItemType Directory -Force"
    ZIP := powershell -Command "Compress-Archive -Force"
    READ_VERSION := powershell -Command "(Get-Content manifests/version.txt -Raw).Trim()"
    JQ_CHROME := powershell -Command "(Get-Content output/chrome/manifest.json -Raw | ConvertFrom-Json | %{ $_.version = '$(VERSION)'; $_ } | ConvertTo-Json -Depth 10) | Set-Content output/chrome/manifest.json"
    JQ_FIREFOX := powershell -Command "(Get-Content output/firefox/manifest.json -Raw | ConvertFrom-Json | %{ $_.browser_specific_settings.gecko.id = '$(FIREFOX_EXTENSION_ID)'; $_.version = '$(VERSION)'; $_ } | ConvertTo-Json -Depth 10) | Set-Content output/firefox/manifest.json"
else
    SHELL := /bin/sh
    RM := rm -rf
    CP := cp -r
    MKDIR := mkdir -p
    ZIP := zip -r
    READ_VERSION := cat manifests/version.txt
    JQ_CHROME := jq --arg v "$(VERSION)" '.version = $$v' output/chrome/manifest.json > output/chrome/manifest.tmp && mv output/chrome/manifest.tmp output/chrome/manifest.json
    JQ_FIREFOX := jq --arg v "$(VERSION)" --arg id "$(FIREFOX_EXTENSION_ID)" '.version = $$v | .browser_specific_settings.gecko.id = $$id' output/firefox/manifest.json > output/firefox/manifest.tmp && mv output/firefox/manifest.tmp output/firefox/manifest.json
endif

VERSION := $(shell $(READ_VERSION))
FIREFOX_EXTENSION_ID ?= shadertoy-dev@localhost

CHROME_DIR := output/chrome
FIREFOX_DIR := output/firefox

.PHONY: all clean chrome firefox release

all: release

release: clean chrome firefox
	@echo "Done. Output files in ./output/"

clean:
	$(RM) outputdir

	$(MKDIR) output/chrome
	$(MKDIR) output/firefox

chrome:
	@echo "Building Chrome version: $(VERSION)"
	$(CP) app/* output/chrome
	$(CP) manifests/manifest-chrome.json output/chrome/manifest.json
	$(JQ_CHROME)
ifeq ($(OS),Windows_NT)
	$(ZIP) output/chrome/* "output/ShaderToy-Chrome-Plugin-$(VERSION).zip"
else
	cd output && $(ZIP) "ShaderToy-Chrome-Plugin-$(VERSION).zip" chrome
endif

firefox:
	@echo "Building Firefox version: $(VERSION)"
	@echo "Using FIREFOX_EXTENSION_ID: $(FIREFOX_EXTENSION_ID)"
	$(CP) app/* output/firefox
	$(CP) manifests/manifest-firefox.json output/firefox/manifest.json
	$(JQ_FIREFOX)
ifeq ($(OS),Windows_NT)
	$(ZIP) output/firefox/* "output/ShaderToy-Firefox-Plugin-$(VERSION).zip"
else
	cd output && $(ZIP) "ShaderToy-Firefox-Plugin-$(VERSION).zip" firefox
endif
