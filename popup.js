(function() {

    'use strict';

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-19369352-21']);
    _gaq.push(['_trackPageview']);

    function Popup () {
        this.init();
    }

    Popup.prototype.init = function init() {
        this.bindInput();
        this.bindSelect();
    };

    Popup.prototype.bindInput = function bindInput() {
        //chrome.runtime.getBackgroundPage().console.log(i);
        var i = document.getElementById('input-dark-theme');

        i.addEventListener('change', function(e) {
            document.body.classList[i.checked ? 'add' : 'remove']('dark-toy');
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    data: {
                        darkTheme: i.checked
                    }
                }, function(response) {
                    //console.log(i.checked);
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
                }, function(response) {
                    //console.log(i.checked);
                });
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

    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = 'https://ssl.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();

    return new Popup();

})();
