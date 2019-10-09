(() => {
    class RecentShaders {
        constructor() {
            this.MAX_SHADERS = 50;

            this.getRecentShaders();

            if (!!document.getElementById('saveButton') && window.gShaderID) {
                this.shaderID = window.gShaderID;
                this.addRecent();

                document
                    .getElementById('saveButton')
                    .addEventListener('click', () => {
                        this.addRecent();
                    });
            }

            this.createComponent();

            window.addEventListener('storage', () => {
                this.createComponent();
            });
        }

        createList() {
            let list = document.createElement('ul');

            if (this.recentShaders.length) {
                for (let shader of this.recentShaders) {
                    let img = document.createElement('img');
                    let li = document.createElement('li');
                    let link = document.createElement('a');

                    img.src = `/media/shaders/${shader.id}.jpg`;

                    link.setAttribute('href', `/view/${shader.id}`);

                    link.appendChild(img);
                    link.appendChild(document.createTextNode(shader.title));

                    li.appendChild(link);
                    list.appendChild(li);
                }
            } else {
                let infoElement = document.createElement('li');

                infoElement.classList.add('no-shaders-info');
                infoElement.textContent =
                    'All your shaders that you open \r\nwill be visible here.';
                list.appendChild(infoElement);
            }

            return list;
        }

        createComponent() {
            let targetEl = document.querySelector('#headerBlock2 > span');

            if (!targetEl) {
                targetEl = document.createElement('span');
                document
                    .querySelector('#headerBlock2')
                    .insertBefore(
                        targetEl,
                        document.querySelector('#headerBlock2 > *')
                    );
                targetEl.style.margin = '14px 0';
            }

            if (this.recentList) {
                targetEl.removeChild(this.recentList);
            }

            this.recentList = document.createElement('label');

            this.recentList.setAttribute('for', 'ste-recent-checkbox');

            const list = this.createList();
            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.id = 'ste-recent-checkbox';

            this.recentList.textContent = 'Open recent...';
            this.recentList.classList.add(
                'recent-list',
                'formButton',
                'formButton-extension'
            );

            this.recentList.appendChild(checkbox);
            this.recentList.appendChild(list);

            targetEl.insertBefore(this.recentList, targetEl.firstChild);

            window.addEventListener('click', (event) => {
                if (event.target.id !== 'ste-recent-checkbox') {
                    checkbox.checked = false;
                }
            });
        }

        getRecentShaders() {
            let raw = window.localStorage.getItem('RecentShaders');

            if (!raw) {
                raw = '[]';
            }

            this.recentShaders = JSON.parse(raw);
        }

        addRecent() {
            const titleElement = document.getElementById('shaderTitle');

            this.recentShaders = this.recentShaders.filter(
                (shader) => shader.id !== this.shaderID
            );

            if (titleElement.value) {
                this.recentShaders.unshift({
                    id: window.gShaderID,
                    title: titleElement.value
                });

                this.recentShaders = this.recentShaders.slice(
                    0,
                    this.MAX_SHADERS
                );
                this.saveRecentShaders();
                this.createComponent();
            } else {
                setTimeout(() => this.addRecent(), 10);
            }
        }

        saveRecentShaders() {
            window.localStorage.setItem(
                'RecentShaders',
                JSON.stringify(this.recentShaders)
            );
        }
    }

    new RecentShaders();
})();
