(function() {
    'use strict';

    /**
     * Main extension script filename.
     *
     * @const {string}
     */
    var MAIN_EXTENSION_FILENAME = 'shadertoy-plugin.js',
        /**
         * Profile page script filename.
         *
         * @const {string}
         */
        PROFILE_EXTENSION_FILENAME = 'shadertoy-plugin-profile.js',
        /**
         * Home page script filename.  Not yet used.
         *
         * @const {string}
         */
        HOME_EXTENSION_FILENAME = 'shadertoy-plugin-home.js';

    /**
     * Load a script directly from our extension.  The script should be
     * listed in the manifest as a web_accessible_resource.
     * The script runs in the page's world, not in the extension's world.
     *
     * @param filename {String} the filename of the script within our extension
     * @param id {String} optional ID to assign to the <script> tag
     */
    function loadScript(filename, id) {
        var script = document.createElement('script');

        script.src = chrome.runtime.getURL(filename);
        script.async = true;

        if (id) {
            script.id = id;
        }

        document.head.appendChild(script);
    }

    /**
     * Injects script code into Shadertoy page.  The code runs in the page's
     * world, not in this extension's world.
     */
    function executeScriptOnPage(javascriptCode) {
        var script = document.createElement('script');

        script.textContent = javascriptCode;
        document.body.appendChild(script);
    }

    /**
     * Listens to extension messages.
     */
    function bindMessagesListener() {
        chrome.runtime.onMessage.addListener(function(request /*, sender, sendResponse */) {
            if (request.data.renderMode) {
                executeScriptOnPage("ToyPlug.setRenderMode('" + request.data.renderMode + "');");
            }

            if ('loopEnabled' in request.data) {
                executeScriptOnPage('ToyPlug.editPage.timebar.loop = ' + request.data.loopEnabled + ';');

                chrome.storage.sync.set(
                    {
                        loopEnabled: request.data.loopEnabled
                    },
                    function() {}
                );
            }

            if ('alternateProfile' in request.data) {
                chrome.storage.sync.set(
                    {
                        alternateProfile: request.data.alternateProfile
                    },
                    function() {}
                );
            }
        });
    }

    /**
     * Sets extension variables changes listener.
     */
    function bindStorageListener() {
        chrome.storage.onChanged.addListener(function(changes) {
            var key;

            for (key in changes) {
                if (key === 'loopEnabled') {
                    executeScriptOnPage('window.TimebarLoop = ' + changes[key].newValue + ';');
                }
            }
        });
    }

    /**
     * Injects short script which sets variable in window context.
     * We can't set it directly because our global scope is different from
     * the page's global scope (isolated worlds).
     *
     * @param variable {String} The variable name.  Must be a valid
     *                          JavaScript identifier.
     * @param value {mixed} The new value.
     */
    function setWindowVariable(variable, value) {
        var isString = typeof value === 'string',
            code;

        if (isString) {
            // Make a proper single-quoted, escaped representation
            value = value.replace(/[\\]/g, '\\\\').replace(/[']/g, "\\'");
            value = "'" + value + "'";
        }

        code = 'window.' + variable + ' = ' + value + ';';

        executeScriptOnPage(code);
    }

    /**
     * Gets stored variables from google cloud.
     */
    function synchronizeChrome() {
        chrome.storage.sync.get('alternateProfile', function(items) {
            setWindowVariable('alternateProfile', items.alternateProfile);
        });

        chrome.storage.sync.get('loopEnabled', function(items) {
            var code = '';

            if ('loopEnabled' in items) {
                code = 'TimebarLoop = ' + items.loopEnabled;
                executeScriptOnPage(code);
            }
        });
    }

    /**
     * Sends initial message.
     */
    function sendInitialMessage() {
        chrome.runtime.sendMessage(
            {
                present: true
            },
            function() {}
        );
    }

    /**
     * Loads profile script on profile page.
     */
    function initializeProfilePage() {
        if (document.location.href.match('shadertoy.com/profile')) {
            loadScript(PROFILE_EXTENSION_FILENAME);
        }
    }

    /**
     * Loads profile script on profile page.
     */
    function initializeHomePage() {
        if (document.location.href.match(/shadertoy.com\/?$/)) {
            loadScript(HOME_EXTENSION_FILENAME);
        }
    }

    /**
     * Initializes extension.
     */
    function init() {
        // Must be before any loadScript calls to set window.* variables
        // with the configuration from chrome.storage.
        synchronizeChrome();

        loadScript(MAIN_EXTENSION_FILENAME);
        loadScript('scripts/node-sanitize-filename.js');
        loadScript('scripts/jszip-3.1.5.js');

        initializeProfilePage();
        initializeHomePage();

        bindMessagesListener();
        bindStorageListener();
        sendInitialMessage();
    }

    window.addEventListener('load', init);
})();
