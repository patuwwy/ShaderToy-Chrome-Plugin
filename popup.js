(function() {

    'use strict';

    var i = document.getElementById('input-dark-theme');

    function Popup () {
        this.init();
    }

    Popup.prototype.init = function init() {
        this.bindInput();
    };

    Popup.prototype.bindInput = function bindInput() {
        //chrome.runtime.getBackgroundPage().console.log(i);

        i.addEventListener('change', function(e) {
            document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {data: i.checked}, function(response) {
                    //console.log(i.checked);
                });
            });
        });
    };

    chrome.storage.sync.get('darkThemeEnable', function(items) {
        i.checked = items.darkThemeEnable;
        document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
    });

    window.addEventListener('click',function(e){
        if(e.target.href!==undefined){
            chrome.tabs.create({url:e.target.href});
        }
    });

    return new Popup();

})();
