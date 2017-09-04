(function() {

    'strict mode';

    /**
     * Main extension script filename.
     *
     * @type {string}
     */
    var MAIN_EXTENSION_FILENAME = 'shadertoy-plugin.js',

        /**
         * Profile page script filename.
         *
         * @type {string}
         */
        PROFILE_EXTENSION_FILENAME = 'shadertoy-plugin-profile.js';

    /**
     * Loads main ToyPlug script and attaches it to ShaderToy.
     */
    function loadScript(file) {
        loadFile(chrome.runtime.getURL(file), function() {
            var script = document.createElement('script');

            script.innerHTML = this.responseText;
            document.body.appendChild(script);
        });
    }

    /**
     * Load file and calls callback when file is loaded.
     *
     * @param {string} file
     * @param {function} callback
     */
    function loadFile(file, callback) {
        var oReq = new XMLHttpRequest();

        oReq.onload = callback;
        oReq.open('get', file, true);
        oReq.send();
    }

    /**
     * Injects script into Shadertoy page.
     */
    function executeScriptOnPage(javascriptCode) {
        var script = document.createElement('script');

        script.innerHTML = javascriptCode;
        document.body.appendChild(script);
    }

    /**
     * Listens to extension messages.
     */
    function bindMessagesListener() {
        chrome.runtime.onMessage.addListener(
            function(request, sender, sendResponse) {
                if (request.data.renderMode) {
                    executeScriptOnPage(
                        'ToyPlug.setRenderMode(\'' +
                            request.data.renderMode + '\');'
                    );
                }

                if ('loopEnabled' in request.data) {
                    executeScriptOnPage(
                        'ToyPlug.editPage.timebar.loop = ' +
                            request.data.loopEnabled + ';'
                    );

                    chrome.storage.sync.set({
                            loopEnabled: request.data.loopEnabled
                        }, function() {}
                    );
                }

                if ('alternateProfile' in request.data) {
                    chrome.storage.sync.set({
                        alternateProfile: request.data.alternateProfile
                    }, function() {});
                }
            }
        );
    }

    /**
     * Sets extension variables changes listener.
     */
    function bindStorageListener() {
        chrome.storage.onChanged.addListener(function(changes, namespace) {
            var key;

            for (key in changes) {
                var storageChange = changes[key];

                if (key === 'loopEnabled') {
                    executeScriptOnPage(
                        'window.TimebarLoop = ' + changes[key].newValue + ';'
                    );
                }
            }
        });
    }

    /**
     * Injects short script which sets variable in window context.
     */
    function setWindowVariable(variable, value) {
        var
            isString = typeof(value) == 'string',
            code;

        value = isString ? ('\'' + value + '\';') : value;
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
        chrome.extension.sendMessage({
            present: true
        }, function (response) {});
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
     * Initializes extension.
     */
    function init() {
        synchronizeChrome();
        loadScript(MAIN_EXTENSION_FILENAME);
        initializeProfilePage();
        bindMessagesListener();
        bindStorageListener();
        sendInitialMessage();
    }

    window.addEventListener('load', init);
})();
