class Popup {
    constructor() {
        this.bindBackgroundEmbed();
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
                document.getElementById('input-alternate-profile').checked =
                    response.alternateProfile;
                document.getElementById('input-rendering-mode').value =
                    response.renderMode;
            }
        );

        window.addEventListener('click', (event) => {
            if (event.target.href) {
                chrome.tabs.create({ url: event.target.href });
            }
        });

        document.getElementById('version').innerText =
            'v' + chrome.runtime.getManifest().version;
    }

    /**
     * Shows embedded shader only when it successfully loads.
     * Keeps a local CSS background as the fallback on failure.
     */
    bindBackgroundEmbed() {
        const body = document.body;
        const backgroundFrame = document.getElementById('popup-background');

        if (!backgroundFrame) {
            return;
        }

        let isSettled = false;
        const loadTimeoutMs = 1800;

        const markLoaded = () => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            body.classList.remove('shader-bg-failed');
            body.classList.add('shader-bg-ready');
        };

        const markFailed = () => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            body.classList.remove('shader-bg-ready');
            body.classList.add('shader-bg-failed');
        };

        const timeout = window.setTimeout(markFailed, loadTimeoutMs);

        backgroundFrame.addEventListener('load', () => {
            window.clearTimeout(timeout);
            markLoaded();
        });

        backgroundFrame.addEventListener('error', () => {
            window.clearTimeout(timeout);
            markFailed();
        });
    }

    /**
     * Sets listener for render mode select element.
     */
    bindRenderModeSelect() {
        document
            .getElementById('input-rendering-mode')
            .addEventListener('change', (event) => {
                this.sendMessage({
                    set: {
                        renderMode: event.target.value
                    }
                });
            });
    }

    /**
     * Sets listener for alternate profile page select element.
     */
    bindAlternateProfileInput() {
        document
            .getElementById('input-alternate-profile')
            .addEventListener('change', (event) => {
                this.sendMessage({
                    set: {
                        alternateProfile: event.target.checked
                    }
                });
            });
    }

    /**
     * Sends chrome message.
     */
    sendMessage(data, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
        });
    }
}

new Popup();
