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
                targetEl.style.margin = '0';
                targetEl.style.display = 'inline-flex';
                targetEl.style.alignItems = 'center';
                targetEl.style.alignSelf = 'center';
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

    /**
     * "Templates" header button. Stores whole shaders (all passes and inputs)
     * as templates and opens new shaders from them.
     */
    class ShaderTemplates {
        constructor() {
            this.STORAGE_KEY = 'STE-templates';
            this.CHECKBOX_ID = 'ste-templates-checkbox';
            this.PASS_LABELS = { image: 'Image', common: 'Common', sound: 'Sound', cubemap: 'Cube A', buffer: 'Buffer' };

            /**
             * Inline form shown in the list: { action: 'add' | 'rename' | 'update' | 'remove' | 'open', id }.
             */
            this.form = null;

            this.getTemplates();
            this.createComponent();

            window.addEventListener('storage', event => {
                if ((event.key === this.STORAGE_KEY || event.key === null) && !this.isOpen()) {
                    this.getTemplates();
                    this.renderList();
                }
            });

            window.addEventListener('click', event => {
                // composedPath(): clicked element may be already removed by list re-render.
                const path = event.composedPath();

                if (this.checkbox && !path.includes(this.checkbox) && !path.includes(this.list)) {
                    this.close();
                }
            });

            window.addEventListener('keydown', event => {
                if (event.key === 'Escape' && this.isOpen()) {
                    this.close();
                }
            });
        }

        isOpen() {
            return !!(this.checkbox && this.checkbox.checked);
        }

        close() {
            if (this.checkbox) {
                this.checkbox.checked = false;
            }
        }

        /**
         * @returns {boolean} True on shader (editor) page.
         */
        isShaderPage() {
            return !!(window.gShaderToy && window.gShaderToy.mEffect);
        }

        /**
         * @returns {boolean} True if current shader is loaded and can be saved as template.
         */
        canCaptureShader() {
            return (
                this.isShaderPage() &&
                typeof window.gShaderToy.mEffect.GetNumPasses === 'function' &&
                window.gShaderToy.mEffect.GetNumPasses() > 0
            );
        }

        isValidShader(shader) {
            return !!(shader && Array.isArray(shader.renderpass) && shader.renderpass.some(pass => pass && pass.type === 'image'));
        }

        getTemplates() {
            let templates = [];

            try {
                templates = JSON.parse(window.localStorage.getItem(this.STORAGE_KEY) || '[]');
            } catch (ignore) {}

            this.templates = Array.isArray(templates) ? templates.filter(template => template && template.id && this.isValidShader(template.shader)) : [];
        }

        /**
         * @returns {string} Error message for failed localStorage write.
         */
        getStorageError(error) {
            const isQuotaError = error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

            return isQuotaError ? 'Not enough browser storage. Delete some templates and try again.' : 'Could not save: ' + error.message;
        }

        /**
         * @returns {string} Error message or empty string if templates were stored.
         */
        saveTemplates() {
            try {
                window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.templates));
            } catch (error) {
                this.getTemplates();

                return this.getStorageError(error);
            }

            return '';
        }

        /**
         * Returns current shader (all passes and inputs) without its metadata,
         * or null if shader is not loaded.
         */
        captureShader() {
            const editPage = window.ToyPlug && window.ToyPlug.editPage;

            if (!this.canCaptureShader()) {
                return null;
            }

            if (editPage && typeof editPage.forceSyncMonacoToActiveDoc === 'function') {
                editPage.forceSyncMonacoToActiveDoc();
            }

            const shader = JSON.parse(JSON.stringify(gShaderToy.Save()));

            // Save() returns last compiled code unless shader needs saving, take code from editor.
            shader.renderpass.forEach((pass, i) => {
                const doc = gShaderToy.mPass && gShaderToy.mPass[i] && gShaderToy.mPass[i].mDocs;

                if (doc && typeof doc.getValue === 'function') {
                    pass.code = doc.getValue();
                }
            });

            delete shader.info;

            return this.isValidShader(shader) ? shader : null;
        }

        getCurrentShaderName() {
            const titleElement = document.getElementById('shaderTitle');

            return (titleElement && (titleElement.value || titleElement.textContent)) || (gShaderToy.mInfo && gShaderToy.mInfo.name) || '';
        }

        /**
         * Small JPEG of the shader canvas (data URL), or empty string.
         */
        captureThumbnail() {
            const glCanvas = gShaderToy.mEffect.mGLContext && gShaderToy.mEffect.mGLContext.canvas;

            return new Promise(resolve => {
                let done = false;
                const grab = () => {
                    if (done) {
                        return;
                    }

                    done = true;

                    try {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');

                        canvas.width = 128;
                        canvas.height = 72;
                        context.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);

                        // Fully transparent: drawing buffer was already cleared.
                        const isEmpty = context.getImageData(0, 0, canvas.width, canvas.height).data.every((value, i) => i % 4 !== 3 || value === 0);

                        resolve(isEmpty ? '' : canvas.toDataURL('image/jpeg', 0.8));
                    } catch (ignore) {
                        resolve('');
                    }
                };

                if (!glCanvas || !glCanvas.width) {
                    resolve('');

                    return;
                }

                // WebGL drawing buffer is readable right after the page renders a frame.
                window.requestAnimationFrame(grab);
                setTimeout(grab, 500);
            });
        }

        /**
         * Pass names in Shadertoy tab order, e.g. "Common · Buffer A–D · Image".
         */
        describePasses(shader) {
            const order = ['common', 'buffer', 'cubemap', 'sound', 'image'];
            const rank = pass => (order.indexOf(pass.type) + order.length + 1) % (order.length + 1);
            const parts = [];

            shader.renderpass
                .slice()
                .sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)))
                .forEach(pass => {
                    const label = (pass.type === 'buffer' && pass.name) || this.PASS_LABELS[pass.type] || pass.name || pass.type;
                    const buffer = /^Buffer ([A-Z])$/.exec(label);
                    const last = parts[parts.length - 1];

                    if (buffer && last && last.to && buffer[1].charCodeAt(0) === last.to.charCodeAt(0) + 1) {
                        last.to = buffer[1];
                    } else {
                        parts.push(buffer ? { from: buffer[1], to: buffer[1] } : { label });
                    }
                });

            return parts.map(part => part.label || (part.from === part.to ? 'Buffer ' + part.from : `Buffer ${part.from}–${part.to}`)).join(' · ');
        }

        /**
         * Runs list action and shows the list again with an optional message.
         */
        async submit(action, id, title) {
            const captures = action === 'add' || action === 'update';
            let shader = null;
            let thumbnail = '';
            let error = '';

            if (this.busy) {
                return;
            }

            this.busy = true;

            if (captures) {
                shader = this.captureShader();
                thumbnail = shader ? await this.captureThumbnail() : '';
            }

            // Fresh copy of templates, they could be changed in other tab.
            this.getTemplates();

            const template = this.templates.find(item => item.id === id);

            if (captures && !shader) {
                error = 'Shader is still loading, try again in a moment.';
            } else if (action !== 'add' && !template) {
                error = 'This template was removed in another tab.';
            } else if (action === 'add') {
                id = Date.now() + '_' + Math.random().toString(36).slice(2);
                this.templates.unshift({ id, title, shader, thumbnail });
            } else if (action === 'update') {
                template.shader = shader;
                template.thumbnail = thumbnail;
            } else if (action === 'rename') {
                template.title = title;
            } else if (action === 'remove') {
                this.templates = this.templates.filter(item => item !== template);
            }

            error = error || this.saveTemplates();
            // Keep form (and typed name) when action failed.
            this.form = error && this.form ? { ...this.form, value: title } : null;
            this.highlightId = error || action === 'remove' ? null : id;
            this.busy = false;
            this.renderList(error);
            this.highlightId = null;
        }

        /**
         * Opens new shader page with template loaded (and compiled).
         *
         * @param {boolean} [confirmed] User agreed to lose unsaved changes of current shader.
         */
        useTemplate(template, inNewTab, confirmed) {
            if (!window.ToyPlug || typeof window.ToyPlug.openShaderAsNew !== 'function') {
                return;
            }

            if (!inNewTab && !confirmed && window.gShaderToy && window.gShaderToy.mNeedsSave) {
                this.setForm('open', template.id);

                return;
            }

            const shader = JSON.parse(JSON.stringify(template.shader));

            // Same metadata as default "new shader".
            shader.info = {
                id: '-1',
                date: String(Math.floor(Date.now() / 1000)),
                viewed: 0,
                name: '',
                username: 'None',
                description: '',
                likes: 0,
                hasliked: 0,
                tags: [],
                published: 0
            };

            try {
                window.ToyPlug.openShaderAsNew(shader, inNewTab);
            } catch (error) {
                // Opening stores a copy of the template, it can exceed storage quota.
                this.form = null;
                this.renderList(this.getStorageError(error));

                return;
            }

            // Keep list open after opening in new tab, so more templates can be opened.
            if (!inNewTab) {
                this.close();
            }
        }

        createButton(text, className, onClick) {
            const button = document.createElement('button');

            button.type = 'button';
            button.textContent = text;
            button.className = className;
            button.addEventListener('click', event => {
                event.preventDefault();
                onClick();
            });

            return button;
        }

        setForm(action, id) {
            this.form = action ? { action, id } : null;
            this.renderList();
        }

        /**
         * Inline name input with Save / Cancel buttons.
         */
        createNameForm(action, id, value) {
            const form = document.createElement('div');
            const input = document.createElement('input');
            const save = () => {
                if (input.value.trim()) {
                    this.submit(action, id, input.value.trim());
                } else {
                    input.focus();
                }
            };

            form.className = 'ste-template-form';

            input.type = 'text';
            input.value = this.form && typeof this.form.value === 'string' ? this.form.value : value;
            input.placeholder = 'Template name';
            input.maxLength = 80;
            input.addEventListener('keydown', event => {
                event.stopPropagation();

                if (event.key === 'Enter') {
                    event.preventDefault();
                    save();
                } else if (event.key === 'Escape') {
                    this.setForm(null);
                }
            });
            input.addEventListener('keyup', event => event.stopPropagation());
            input.addEventListener('keypress', event => event.stopPropagation());

            form.appendChild(input);
            form.appendChild(this.createButton('Save', 'ste-btn ste-btn-primary', save));
            form.appendChild(this.createButton('Cancel', 'ste-btn', () => this.setForm(null)));

            setTimeout(() => {
                input.focus();
                input.select();
            });

            return form;
        }

        /**
         * Inline "Are you sure?" row.
         */
        createConfirm(question, confirmText, onConfirm) {
            const row = document.createElement('div');
            const text = document.createElement('span');

            row.className = 'ste-template-confirm';
            text.textContent = question;

            row.appendChild(text);
            row.appendChild(this.createButton(confirmText, 'ste-btn ste-btn-primary', onConfirm));
            row.appendChild(this.createButton('Cancel', 'ste-btn', () => this.setForm(null)));

            return row;
        }

        createAddItem() {
            const li = document.createElement('li');

            li.className = 'ste-templates-add';

            if (this.form && this.form.action === 'add') {
                li.appendChild(this.createNameForm('add', null, this.getCurrentShaderName()));

                return li;
            }

            const button = this.createButton('', 'ste-templates-add-btn', () => this.setForm('add'));
            const title = document.createElement('span');
            const hint = document.createElement('span');

            title.className = 'ste-template-name';
            title.textContent = '+ Save this shader as template';
            hint.className = 'ste-template-info';
            hint.textContent = 'Keeps all passes and inputs';

            button.appendChild(title);
            button.appendChild(hint);
            li.appendChild(button);

            return li;
        }

        createItem(template) {
            const li = document.createElement('li');
            const form = this.form && this.form.id === template.id ? this.form.action : null;

            li.className = 'ste-template';

            if (form === 'rename') {
                li.appendChild(this.createNameForm('rename', template.id, template.title));

                return li;
            }

            if (form === 'remove' || form === 'update') {
                li.appendChild(
                    this.createConfirm(
                        form === 'remove' ? `Delete "${template.title}"?` : `Replace "${template.title}" with this shader?`,
                        form === 'remove' ? 'Delete' : 'Replace',
                        () => this.submit(form, template.id)
                    )
                );

                return li;
            }

            if (form === 'open') {
                li.appendChild(this.createConfirm('Unsaved changes will be lost. Open anyway?', 'Open', () => this.useTemplate(template, false, true)));

                return li;
            }

            const link = document.createElement('a');
            const thumbnail = document.createElement(template.thumbnail ? 'img' : 'span');
            const text = document.createElement('span');
            const name = document.createElement('span');
            const info = document.createElement('span');
            const actions = document.createElement('span');

            if (template.id === this.highlightId) {
                li.classList.add('is-new');
            }
            const onOpen = event => {
                event.preventDefault();
                this.useTemplate(template, event.ctrlKey || event.metaKey || event.button === 1);
            };

            // No href: "Open in new tab" from context menu would skip loading the template.
            link.setAttribute('role', 'link');
            link.tabIndex = 0;
            link.title = 'New shader from this template (Ctrl+click: new tab)';
            link.addEventListener('click', onOpen);
            // Prevent middle button autoscroll, otherwise "auxclick" is not fired.
            link.addEventListener('mousedown', event => event.button === 1 && event.preventDefault());
            link.addEventListener('auxclick', event => event.button === 1 && onOpen(event));
            link.addEventListener('keydown', event => event.key === 'Enter' && onOpen(event));

            name.className = 'ste-template-name';
            name.textContent = template.title;
            info.className = 'ste-template-info';
            info.textContent = this.describePasses(template.shader);
            info.title = info.textContent;

            thumbnail.className = 'ste-template-thumb';

            if (template.thumbnail) {
                thumbnail.src = template.thumbnail;
                thumbnail.alt = '';
            }

            text.className = 'ste-template-text';
            text.appendChild(name);
            text.appendChild(info);
            link.appendChild(thumbnail);
            link.appendChild(text);

            actions.className = 'ste-template-actions';
            actions.appendChild(this.createButton('Rename', 'ste-btn', () => this.setForm('rename', template.id)));

            if (this.isShaderPage()) {
                actions.appendChild(this.createButton('Update', 'ste-btn', () => this.setForm('update', template.id)));
            }

            actions.appendChild(this.createButton('Delete', 'ste-btn', () => this.setForm('remove', template.id)));

            li.appendChild(link);
            li.appendChild(actions);

            return li;
        }

        createInfo(className, text) {
            const li = document.createElement('li');

            li.className = className;
            li.textContent = text;

            return li;
        }

        /**
         * (Re)builds dropdown content.
         *
         * @param {string} [message] Error message shown on top of the list.
         */
        renderList(message) {
            const list = this.list;

            list.textContent = '';

            if (message) {
                list.appendChild(this.createInfo('ste-templates-message', message));
            }

            if (this.isShaderPage()) {
                list.appendChild(this.createAddItem());
            }

            if (this.templates.length) {
                list.appendChild(this.createInfo('ste-templates-heading', 'New shader from template'));

                for (const template of this.templates) {
                    list.appendChild(this.createItem(template));
                }
            } else {
                list.appendChild(
                    this.createInfo(
                        'no-shaders-info',
                        this.isShaderPage()
                            ? 'Saved templates appear here.\r\nPick one to start a new shader with all its passes.'
                            : 'No templates yet.\r\nOpen a shader and choose\r\n"Save this shader as template".'
                    )
                );
            }
        }

        createComponent() {
            const targetEl = document.querySelector('#headerBlock2 > span');

            if (!targetEl) {
                return;
            }

            const component = document.createElement('label');
            const recentCheckbox = document.getElementById('ste-recent-checkbox');

            this.checkbox = document.createElement('input');
            this.checkbox.type = 'checkbox';
            this.checkbox.id = this.CHECKBOX_ID;
            this.checkbox.addEventListener('change', () => {
                if (this.isOpen()) {
                    this.form = null;
                    this.getTemplates();
                    this.renderList();
                }
            });

            this.list = document.createElement('ul');
            // Clicks on list background must not toggle the dropdown (label activation).
            this.list.addEventListener('click', event => {
                if (!event.target.closest('button, input')) {
                    event.preventDefault();
                }
            });

            component.setAttribute('for', this.CHECKBOX_ID);
            component.textContent = 'Templates';
            component.classList.add('recent-list', 'templates-list', 'formButton', 'formButton-extension');
            component.appendChild(this.checkbox);
            component.appendChild(this.list);

            if (recentCheckbox && recentCheckbox.parentElement.parentElement === targetEl) {
                recentCheckbox.parentElement.after(component);
            } else {
                targetEl.insertBefore(component, targetEl.firstChild);
            }

            this.component = component;
            this.renderList();
        }
    }

    new RecentShaders();
    new ShaderTemplates();
})();
