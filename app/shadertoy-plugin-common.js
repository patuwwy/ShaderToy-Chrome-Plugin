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
            window.localStorage.setItem('RecentShaders', JSON.stringify(this.recentShaders));
        }
    }
    class MyShaderTemplates {
        constructor() {
            this.templates = [
                {
                    title: 'Offical template',
                    code: `void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));

    // Output to screen
    fragColor = vec4(col,1.0);
}`
                }
            ];
            this.isVisible = false;
            this.autoFill();
            this.createComponent();
            window.addEventListener('storage', () => {
                this.createComponent();
            });
        }
        /**
         * auto fill the shader code from the template when the page is new
         *
         */
        autoFill() {
            if (window.location.pathname !== '/new') {
                return;
            }
            let _template = window.localStorage.getItem('ShaderTemplates');

            let useTemplate = window.localStorage.getItem('useTemplate');
            let title = useTemplate;
            if (useTemplate) {
                window.localStorage.removeItem('useTemplate');
            } else {
                return;
            }
            if (_template) {
                let template = JSON.parse(_template);
                if (template.length) {
                    try {
                        let code = template.find(t => t.title === title).code;
                        const mInterval = setInterval(() => {
                            if (window.gShaderToy) {
                                clearInterval(mInterval);
                                gShaderToy.mCodeEditor.doc.setValue(code);
                                gShaderToy.mCodeEditor.refresh();
                            }
                        }, 100);
                    } catch (error) {
                        window.alert('Failed to load shader!\n' + error);
                    }
                } else {
                    window.alert('Failed to load shader!');
                    console.error('Failed to load shader!' + _template);
                }
            }
        }

        getTemplate(title) {
            return this.templates.find(template => template.title === title);
        }

        getTitles() {
            return this.templates.map(template => template.title);
        }

        loadTemplates() {
            let raw = window.localStorage.getItem('ShaderTemplates');
            if (raw) {
                this.templates = JSON.parse(raw);
                // remove null or undefined templates
                this.templates = this.templates.filter(template => template);
                if (this.templates.length > 0) {
                    return;
                }
            }

            // default template
            this.templates = [
                {
                    title: 'Offical template',
                    code: `void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));

    // Output to screen
    fragColor = vec4(col,1.0);
}`
                }
            ];
            this.saveTemplates();
        }

        saveTemplates() {
            // remove null or undefined templates
            this.templates = this.templates.filter(template => template);

            window.localStorage.setItem('ShaderTemplates', JSON.stringify(this.templates));
        }

        removeTemplate(title) {
            this.templates = this.templates.filter(template => template.title !== title);
        }

        createSelectList() {
            /**
             * - Template 1    [edit] [delete]
             * - Template 2    [edit] [delete]
             * ...
             * - Create New Template
             * - Save Current As New Template
             */
            let slist = document.createElement('ul');
            let titles = this.getTitles();
            slist.classList.add('select-list');
            let listContainer = document.createElement('div');

            for (let title of titles) {
                let li = document.createElement('li');
                let a = document.createElement('a');
                let editButton = document.createElement('button');
                let deleteButton = document.createElement('button');

                a.textContent = title;
                editButton.textContent = 'Edit';
                deleteButton.textContent = 'Del';

                a.addEventListener('click', () => {
                    this.useTemplate(a.textContent);
                });
                editButton.addEventListener('click', () => {
                    this.showEditForm(title);
                });

                deleteButton.addEventListener('click', () => {
                    this.removeTemplate(title);
                    deleteButton.parentElement.classList.add('removing');
                    setTimeout(() => {
                        this.saveTemplates();
                        this.createComponent();
                    }, 450);
                });

                // special case for official template
                if (title === 'Offical template') {
                    editButton.style.display = 'none';
                    deleteButton.style.display = 'none';
                }

                li.appendChild(a);
                li.appendChild(editButton);
                li.appendChild(deleteButton);
                listContainer.appendChild(li);
            }
            slist.appendChild(listContainer);

            let li = document.createElement('li');
            li.classList.add('select-list-btn');
            li.textContent = 'Create New Template';
            li.addEventListener('click', () => {
                this.createNewTemplate();
            });
            slist.appendChild(li);

            li = document.createElement('li');
            li.classList.add('select-list-btn');
            li.textContent = 'Save Current As New Template';
            li.addEventListener('click', () => {
                this.saveCurrentAsNew();
            });
            slist.appendChild(li);

            return slist;
        }

        showEditForm(title) {
            let _template = this.getTemplate(title);
            this.createModalWindow(title, _template.code);
        }

        showSelectList() {
            this.isVisible = true;
            if (this.selectList) {
                this.selectList.style.display = 'block';
            }
        }

        hideSelectList() {
            this.isVisible = false;
            if (this.selectList) {
                this.selectList.style.display = 'none';
            }
        }

        isChildOf(child, parent) {
            if (child === parent) {
                return true;
            }
            while (child && child !== parent) {
                child = child.parentNode;
            }
            return child === parent;
        }

        createComponent() {
            let targetEL = document.querySelector('#headerBlock2 > a:nth-child(3)');
            let selectList = document.querySelector('#headerBlock2 > .select-list');

            this.loadTemplates();

            if (selectList) {
                selectList.parentElement.removeChild(selectList);
                this.selectList = null;
            }
            this.selectList = this.createSelectList();
            targetEL.parentElement.appendChild(this.selectList);

            this.hideSelectList();

            targetEL.addEventListener('click', e => {
                e.preventDefault();

                this.showSelectList();
            });
            window.addEventListener('click', e => {
                if (e.target != selectList && this.isVisible === true && e.target != targetEL && this.isChildOf(e.target, this.selectList) === false) {
                    this.hideSelectList();
                }
            });
        }

        useTemplate(title) {
            console.log('useTemplate ', title);

            window.localStorage.setItem('useTemplate', title);

            window.location.href = 'https://www.shadertoy.com/new';
        }

        showAlert(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `alert-toast ${type}`;
            toast.innerHTML = `
    <div class="alert-progress"></div>
    ${message}
  `;

            document.body.appendChild(toast);

            // show toast
            setTimeout(() => toast.classList.add('active'), 10);

            setTimeout(() => {
                toast.classList.remove('active');
                setTimeout(() => toast.remove(), 400);
            }, 3000);
        }
        createModalWindow(title = '', code = '') {
            if (this.modalWindow) {
                this.modalWindow.parentElement.removeChild(this.modalWindow);
                this.modalWindow = null;
            }
            let tab = document.createElement('div');
            tab.classList.add('code-editor-modal');
            tab.innerHTML = `
<div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3>Code Template Editor</h3>
      <button class="close-btn">&times;</button>
    </div>
    <div class="modal-body">
      <div class="name-input">
        <input type="text" id="templateName" placeholder="Enter a title for the template" />
      </div>
      <div class="code-editor-container">
        <textarea id="glslEditor"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="save-btn">Save</button>
      <button class="cancel-btn">Cancel</button>
    </div>
  </div>
            `;
            document.body.appendChild(tab);
            let editor = null;
            try {
                editor = CodeMirror.fromTextArea(document.getElementById('glslEditor'), {
                    mode: 'x-shader/x-fragment',
                    lineNumbers: true,
                    theme: 'default',
                    indentUnit: 4,
                    gutters: ['CodeMirror-linenumbers'],
                    lineNumberFormatter: line => line
                });
            } catch (error) {
                // this is always becaus of the code mirror is not loaded at view page
                this.showAlert('Please do not use this feature on view page!\nHint: Use this feature on new page or any page that has a code editor.', 'error');
                console.error(error);
                tab.parentElement.removeChild(tab);
                return null;
            }
            if (!editor) {
                return;
            }
            if (title && title !== '') {
                document.getElementById('templateName').value = title;
            }
            if (code && code !== '') {
                editor.setValue(code);
                editor.refresh();
            }
            const modal = document.querySelector('.code-editor-modal');
            modal.classList.add('active');
            setTimeout(() => editor.refresh(), 50);

            document.querySelector('.save-btn').addEventListener('click', () => {
                const title = document.getElementById('templateName').value;
                const code = editor.getValue();

                if (!title || title === '') {
                    alert('Please enter a title');
                    return;
                }

                this.showAlert('Template saved successfully!');

                this.saveTemplate(title, code);
                document.querySelector('.code-editor-modal').classList.remove('active');
            });

            document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelector('.code-editor-modal').classList.remove('active');
                });
            });

            this.modalWindow = tab;
        }

        createNewTemplate() {
            this.createModalWindow();
        }

        saveTemplate(title, code) {
            if (title && code) {
                if (this.templates.find(template => template.title === title)) {
                    this.templates = this.templates.map(template => {
                        if (template.title === title) {
                            return {
                                title: title,
                                code: code
                            };
                        }
                        return template;
                    });
                } else {
                    this.templates.push({
                        title: title,
                        code: code
                    });
                }
                this.saveTemplates();
                this.createComponent();
            } else {
                console.log('There is no code!');
            }
        }

        saveCurrentAsNew() {
            const title = window.prompt('Enter a title for the template');
            if (title) {
                try {
                    let code = gShaderToy.mCodeEditor.doc.getValue();
                    if (code) {
                        this.saveTemplate(title, code);
                    }
                } catch (error) {
                    this.showAlert('Failed to save template!', 'error');
                    console.error(error);
                }
            }
        }
    }
    new RecentShaders();
    new MyShaderTemplates();
})();
