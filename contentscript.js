(function() {

    'strict mode';

    /**
     * Loads main ToyPlug script and attaches it to ShaderToy.
     */
    function loadScript() {
        loadFile(chrome.runtime.getURL('shadertoy-plugin.js'), function() {
            var
                content = this.responseText,
                script = document.createElement('script');

            script.innerHTML = content;
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

    function executeScriptOnPage(javascriptCode) {
        var script = document.createElement('script');

        script.innerHTML = javascriptCode;
        document.body.appendChild(script);
    }

    function onMessage() {

    }

    /**
     * Appends main extension script.
     * Toggles on extension icon.
     */
    function init() {
        loadScript();
        chrome.extension.sendMessage({ present: true }, function (response) {
            //console.log(response);
        });
    }

    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            //if (!sender.tab) {
                //executeScriptOnPage('console.log(\'message\', ' + request.data + ')');

                chrome.storage.sync.get('darkThemeEnable', function(items) {
                    executeScriptOnPage(
                        'window.darkTheme = ' + request.data + ';' +
                        'ToyPlug.toggleDarkTheme();'
                    );
                });

                chrome.storage.sync.set({
                        darkThemeEnable: request.data
                    },
                    function() {
                        //executeScriptOnPage('console.log(\'value saved\');');
                    }
                );
            //}
        }
    );

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        var key;

        for (key in changes) {
            var storageChange = changes[key];

            if (key == 'darkThemeEnable') {

                setWindowVariable(key, changes[key].newValue);
                executeScriptOnPage(
                    //'window.darkTheme = ' + changes[key].newValue + ';' +
                    'ToyPlug.toggleDarkTheme();'
                );
            }

        }
    });

    function setWindowVariable(variable, value) {
        var isString = typeof(value) == 'string',
            code;

        value = isString ? ('\'' + value + '\';') : value;
        code = 'window.' + variable + ' = ' + value + ';';
        executeScriptOnPage(code);
        //executeScriptOnPage('console.log( \'' + variable + '\', ' + value + ');');
    }

    chrome.storage.sync.get('darkThemeEnable', function(items) {
        //executeScriptOnPage('window.darkTheme = ' + items.darkThemeEnable);
        setWindowVariable('darkTheme', items.darkThemeEnable);
    });

    init();

})();
