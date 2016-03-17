chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        chrome.pageAction.show(sender.tab.id);
        sendResponse({});
    }
);

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(d){
    if (d.reason == 'install' || d.reason == 'update') {
        chrome.tabs.create({
            url: 'https://github.com/patuwwy/ShaderToy-Chrome-Plugin#changelog'
        });
    }
});
