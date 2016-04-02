chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.present) chrome.pageAction.show(sender.tab.id);
        sendResponse({});
    }
);

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(d){
    if (d.reason == 'install') {
        chrome.tabs.create({
            url: 'https://github.com/patuwwy/ShaderToy-Chrome-Plugin'
        });
    }
});
