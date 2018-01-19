(function definePopupModule() {
    'use strict';

    /**
     * Initializes Popup window.
     *
     * @constructor
     */
    function Popup() {
        this.init();
    }

    /**
     * Calls initialization of sub modules.
     */
    Popup.prototype.init = function init() {
        this.bindLoopInput();
        this.bindRenderModeSelect();
        this.bindAlternateProfileInput();
    };

    /**
     * Sets listener for render mode select element.
     */
    Popup.prototype.bindRenderModeSelect = function bindSelect() {
        var i = document.querySelector('select');

        i.addEventListener('change', function(e) {
            sendMessage({
                renderMode: i.value
            });
        });
    };

    /**
     * Sets listener for loop mode select element.
     */
    Popup.prototype.bindLoopInput = function bindSelect() {
        var i = document.getElementById('input-loop');

        i.addEventListener('change', function(e) {
            sendMessage({
                loopEnabled: i.checked
            });
        });
    };

    /**
     * Sets listener for alternate profile page select element.
     */
    Popup.prototype.bindAlternateProfileInput =
        function bindAlternateProfileInput() {
            var i = document.getElementById('input-alternate-profile');

            i.addEventListener('change', function onInputChange(e) {
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
     * Gets stored state of loop option.
     */
    chrome.storage.sync.get('loopEnabled', function onSync(items) {
        var i = document.getElementById('input-loop');

        i.checked = items.loopEnabled;
    });

    /**
     * Gets stored state of alternate profile page layout.
     */
    chrome.storage.sync.get('alternateProfile', function onSync(items) {
        var i = document.getElementById('input-alternate-profile');

        i.checked = items.alternateProfile;
    });

    /**
     * Opens all links in new tab.
     */
    window.addEventListener('click', function onLinkClick(e) {
        if (e.target.href) {
            chrome.tabs.create({ url: e.target.href });
        }
    });

    /**
     * Shows current version.
     */
    document.getElementById('version').innerText = 'v' +
        chrome.runtime.getManifest().version;

    return new Popup();
})();
