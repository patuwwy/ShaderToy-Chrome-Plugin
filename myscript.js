(function() {

    'strict mode';

    /**
     * Stores CodeMirror HTML Element reference.
     *
     * @type {HTMLElement}
     */
    var ed = null;

    /**
     * Runs callback when CodeMirror editor is ready.
     *
     * @param {function} callback
     */

    function waitForEd(callback) {
        ed = document.querySelector('.CodeMirror');

        if (ed) {
            callback();
        } else {
            setTimeout(function() {
                waitForEd(callback);
            }, 20);
        }
    }

    /**
     * Changes CodeMirror color theme to dark.
     */
    function switchToDarkTheme() {
        ed.classList.remove('cm-s-default');
        ed.classList.add('cm-s-twilight');
    }

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
     * Loads ShaderToy dark theme and attaches it to ShaderToy.
     */
    function loadStyle() {
        loadFile(chrome.runtime.getURL('style.css'), function() {
            var content = this.responseText,
                style = document.createElement('style');

            style.innerHTML = content;
            document.head.appendChild(style);
            document.body.classList.add('dark-toy');
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

    function setIconOn() {

    }

    /**
     * Inits plugin.
     */
    function init() {
        loadStyle();
        loadScript();
        waitForEd(switchToDarkTheme);
        setIconOn();
    }

    init();
})();
