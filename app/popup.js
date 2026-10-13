class Popup {
    constructor() {
        this.bindRenderModeSelect();
        this.bindAlternateProfileInput();

        this.init();
    }

    init() {
        this.sendMessage(
            {
                get: 'state'
            },
            (response) => {
                if (response) {
                    var altProfile = document.getElementById('input-alternate-profile');
                    if (altProfile && typeof response.alternateProfile === 'boolean') {
                        altProfile.checked = response.alternateProfile;
                    }
                    var renderMode = document.getElementById('input-rendering-mode');
                    if (renderMode && response.renderMode) {
                        renderMode.value = response.renderMode;
                    }
                }
            }
        );

        window.addEventListener('click', (event) => {
            const anchor = event.target.closest('a');
            if (anchor && anchor.href) {
                event.preventDefault();
                chrome.tabs.create({ url: anchor.href });
            }
        });

        const versionEl = document.getElementById('version');
        if (versionEl) {
            versionEl.innerText = 'v' + chrome.runtime.getManifest().version;
        }
    }

    /**
     * Sets listener for render mode select element.
     */
    bindRenderModeSelect() {
        var el = document.getElementById('input-rendering-mode');
        if (el) {
            el.addEventListener('change', (event) => {
                this.sendMessage({
                    set: {
                        renderMode: event.target.value
                    }
                });
            });
        }
    }

    /**
     * Sets listener for alternate profile page select element.
     */
    bindAlternateProfileInput() {
        var el = document.getElementById('input-alternate-profile');
        if (el) {
            el.addEventListener('change', (event) => {
                this.sendMessage({
                    set: {
                        alternateProfile: event.target.checked
                    }
                });
            });
        }
    }

    /**
     * Sends chrome message.
     */
    sendMessage(data, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        data: data
                    },
                    (res) => {
                        if (typeof callback === 'function') {
                            callback(res);
                        }
                    }
                );
            }
        });
    }
}

new Popup();
