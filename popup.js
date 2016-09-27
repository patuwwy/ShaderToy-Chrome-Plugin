(function() {

    'use strict';

    function Popup () {
        this.init();
    }

    Popup.prototype.init = function init() {
        this.bindInput();
        this.bindSelect();
    };

    Popup.prototype.bindInput = function bindInput() {
        var i = document.getElementById('input-dark-theme');

        i.addEventListener('change', function(e) {
            document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    data: {
                        darkTheme: i.checked
                    }
                }, function() {
                });
            });
        });
    };

    Popup.prototype.bindSelect = function bindSelect() {
        var i = document.querySelector('select');

        i.addEventListener('change', function(e) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    data: {
                        renderMode: i.value
                    }
                }, function() {});
            });
        });
    };

    chrome.storage.sync.get('darkThemeEnable', function(items) {
        var i = document.getElementById('input-dark-theme');

        i.checked = items.darkThemeEnable;
        document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
    });

    window.addEventListener('click',function(e){
        if (e.target.href) {
            chrome.tabs.create({url:e.target.href});
        }
    });

    document.getElementById('version').innerText =
        chrome.runtime.getManifest().version;

    return new Popup();

})();
