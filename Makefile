VERSION         := $(shell awk '{printf "%s", $$0}' ./manifests/version.txt)
APP_DIR         := ./app
MANIFESTS_DIR   := ./manifests
OUT_DIR         := ./output

# Space separated list of browsers to build for.
# Of course, functionality will have to be adjusted, this ain't magic.
BROWSERS        := chrome firefox

# Capitalize the first letter of the browser name for the ZIP file name
capitalize_first = $(shell echo $(1) | sed 's/.*/\u&/')

.PHONY: all clean zip prepare-% clean-% zip-% github-release publish

all: zip

clean:
	@echo "Cleaning all zip files"
	rm -rf $(OUT_DIR)

zip: $(BROWSERS:%=zip-%)

# clean-<browser>
clean-%:
	@echo "Cleaning build files for $* browser"
	rm -rf $(OUT_DIR)/$* \
			$(OUT_DIR)/ShaderToy-$(call capitalize_first,$*)-Plugin-*.zip

# prepare-<browser>
prepare-%: clean-%
	@echo "Preparing build for $* browser"
	mkdir -p $(OUT_DIR)/$*
ifeq ($*,firefox)
ifndef FIREFOX_EXTENSION_ID
	$(error Please set the FIREFOX_EXTENSION_ID environment variable)
endif
endif

# zip-<browser>
zip-%: prepare-%
	@echo "Building zip file of version $(VERSION) for $* browser"
	cp -r $(APP_DIR)/* $(OUT_DIR)/$*
	cp $(MANIFESTS_DIR)/manifest-$*.json $(OUT_DIR)/$*/manifest.json
	jq '.version = "$(VERSION)"' $(OUT_DIR)/$*/manifest.json \
		> $(OUT_DIR)/$*/manifest.json.tmp
	mv $(OUT_DIR)/$*/manifest.json.tmp $(OUT_DIR)/$*/manifest.json

ifeq ($*,firefox)
	jq '.applications.gecko.id = "$(FIREFOX_EXTENSION_ID)"' $(OUT_DIR)/$*/manifest.json \
		> $(OUT_DIR)/$*/manifest.json.tmp
	mv $(OUT_DIR)/$*/manifest.json.tmp $(OUT_DIR)/$*/manifest.json
endif
	cd $(OUT_DIR)/$* && \
	zip -r \
	  ../../$(OUT_DIR)/ShaderToy-$(call capitalize_first,$*)-Plugin-$(VERSION).zip \
	  ./*

github-release: zip
	@echo "Creating GitHub release for version $(VERSION)"
	echo release create $(VERSION) \
		$(OUT_DIR)/ShaderToy-Chrome-Plugin-$(VERSION).zip \
		$(OUT_DIR)/ShaderToy-Firefox-Plugin-$(VERSION).zip \
		--title "$(VERSION)"

publish: zip
	@echo "Publishing extensions"
	npx publish-extension \
		--chrome-zip $(OUT_DIR)/ShaderToy-Chrome-Plugin-$(VERSION).zip \
		--firefox-zip $(OUT_DIR)/ShaderToy-Firefox-Plugin-$(VERSION).zip