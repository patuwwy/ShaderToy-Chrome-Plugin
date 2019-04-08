class Popup {
    constructor() {
        this.bindRenderModeSelect();
        this.bindAlternateProfileInput();

        this.init();
    }

    init() {
        chrome.storage.sync.get('alternateProfile', items => {
            document.getElementById('input-alternate-profile').checked = items.alternateProfile;
        });

        window.addEventListener('click', event => {
            if (event.target.href) {
                chrome.tabs.create({ url: event.target.href });
            }
        });

        document.getElementById('version').innerText = 'v' + chrome.runtime.getManifest().version;
    }

    /**
     * Sets listener for render mode select element.
     */
    bindRenderModeSelect() {
        document.getElementById('input-rendering-mode').addEventListener('change', event => {
            this.sendMessage({
                renderMode: event.target.value
            });
        });
    }

    /**
     * Sets listener for alternate profile page select element.
     */
    bindAlternateProfileInput() {
        document.getElementById('input-alternate-profile').addEventListener('change', event => {
            this.sendMessage({
                alternateProfile: event.target.checked
            });
        });
    }

    /**
     * Sends chrome message.
     */
    sendMessage(data) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                {
                    data: data
                },
                () => {}
            );
        });
    }
}

new Popup();
