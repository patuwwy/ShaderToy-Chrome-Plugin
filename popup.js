(function() {

    'use strict';

    function Popup () {
        this.init();
    }

    Popup.prototype.init = function init() {
        this.bindDarkThemeInput();
        this.bindLoopInput();
        this.bindRenderModeSelect();
        this.bindAlternateProfileInput();
    };

    Popup.prototype.bindDarkThemeInput = function bindInput() {
        var i = document.getElementById('input-dark-theme');

        i.addEventListener('change', function(e) {
            document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
            sendMessage({
                darkTheme: i.checked
            });
        });
    };

    Popup.prototype.bindRenderModeSelect = function bindSelect() {
        var i = document.querySelector('select');

        i.addEventListener('change', function(e) {
            sendMessage({
                renderMode: i.value
            });
        });
    };

    Popup.prototype.bindLoopInput = function bindSelect() {
        var i = document.getElementById('input-loop');

        i.addEventListener('change', function(e) {
            sendMessage({
                loopEnabled: i.checked
            });
        });
    };

    Popup.prototype.bindAlternateProfileInput =
        function bindAlternateProfileInput() {
            var i = document.getElementById('input-alternate-profile');

            i.addEventListener('change', function(e) {
                sendMessage({
                    alternateProfile: i.checked
                });
            });
    };

    /**
     * Sends chrome message.
     */
    function sendMessage(data) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    data: data
                },
                function() {}
            );
        });
    }

    /**
     * Gets stored value for dark theme option.
     */
    chrome.storage.sync.get('darkThemeEnable', function(items) {
        var i = document.getElementById('input-dark-theme');

        i.checked = items.darkThemeEnable;
        document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
    });

    /**
     * Gets stored state of loop option.
     */
    chrome.storage.sync.get('loopEnabled', function(items) {
        var i = document.getElementById('input-loop');

        i.checked = items.loopEnabled;
    });

    /**
     * Gets stored state of alternate profile page layout.
     */
    chrome.storage.sync.get('alternateProfile', function(items) {
        var i = document.getElementById('input-alternate-profile');

        i.checked = items.alternateProfile;
    });

    window.addEventListener('click',function(e){
        if (e.target.href) {
            chrome.tabs.create({url:e.target.href});
        }
    });

    document.getElementById('version').innerText = 'v' +
        chrome.runtime.getManifest().version;

    return new Popup();

})();
