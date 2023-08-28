(function() {
    'use strict';

    chrome.action.onClicked.addListener((tab) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // code to be executed in the current tab
            }
        });
    });

    // Check whether new version is installed
    chrome.runtime.onInstalled.addListener(function(d) {
        if (d.reason === 'install') {
            chrome.tabs.create({
                url: 'https://github.com/patuwwy/ShaderToy-Chrome-Plugin/blob/master/CHANGELOG.md'
            });
        }
    });
})();
