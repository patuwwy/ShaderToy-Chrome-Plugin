/* global gShaderToy, dataLoadShader, window, document, Effect */

(function shadertoyPlugin() {
    'use strict';

    /**
     * Arrow keys time change (ms).
     *
     * @type {number}
     */
    var ARROW_KEY_TIMESHIFT = 5000,
        /**
         * Key name to store shader in LocalStorage.
         *
         * @const {string}
         */
        LOCALSTORAGE_SHADER_FORK_KEYNAME = 'forkedShaderStorage',
        STATE_STORAGE_KEY = 'STE-state',
        SHADER_PREVIEW_LOCATION = '/media/shaders/',
        /**
         * Stores references to ShaderToy HTML elements.
         */
        shaderToyElements = {
            leftColumnContainer: document.querySelector('.container > .block0'),
            shaderInfo: document.getElementById('shaderInfo'),
            shaderPlayer: document.getElementById('player'),
            shaderTags: document.getElementById('shaderTags'),
            shaderDescription: document.getElementById('shaderDescription')
        },
        extensionElements = {},
        /**
         * Template for the readme.txt when you download a ZIP of a
         * single shader.
         *
         * @const {string}
         */
        ZIP_README_TEMPLATE =
            '"{friendlyName}" provided by {userName}\n' +
            '{href}\n' +
            '-------------------------------------------------------------\n' +
            '{tags}\n{description}\n' +
            '-------------------------------------------------------------\n' +
            'You can upload the JSON file of the shader using\n' +
            'https://github.com/patuwwy/ShaderToy-Chrome-Plugin\n',
        renderTimersVisible = false;

    /**
     * ToyPlug.
     *
     * @contructor
     */
    class ToyPlug {
        constructor() {
            if (!this.initialized) {
                this.init();
            }

            this.initialized = true;
        }
        /**
         * Render a template by substituting {tag}s in #template from #values.
         * Tags in #template will be replaced only if there is a corresponding
         * element in #values.  Other tags will be left untouched.
         *
         * @param template {String} the template to fill in
         * @param values {Object} the values to fill in.
         */
        renderTemplate(template, values) {
            if (!template || typeof template !== 'string') {
                // Sane output for invalid input
                return '';
            }

            values = values || {};

            if (typeof values !== 'object') {
                // If invalid input, no changes.
                return template;
            }

            var result = template.replace(/{([^}]+)}/g, function(match, key) {
                return values[key] || match;
            });

            // Regularize line endings, in case one of the inputs used \r\n
            result = result.replace(/\r\n|\r/g, '\n');

            return result;
        }

        /**
         * @returns {boolean} True if current page is editor page.
         */
        isEditPage() {
            return document.location.href.match(/(.com\/view|.com\/new)/);
        }

        setRenderMode(mode) {
            if (this.editPage) {
                if (mode == 'default') {
                    this.editPage.setRenderMode('');

                    return;
                }

                this.editPage.setRenderMode('pixelated');
                this.editPage.setRenderMode('optimizespeed');

            }
        }

        /**
         * Inits ToyPlug functionality.
         */
        init() {
            this.common = new ToyPlugCommon();

            if (this.isEditPage()) {
                this.editPage = new ToyPlugEditPage();
            }

            this.setListener();

            let state = JSON.parse(window.localStorage.getItem(STATE_STORAGE_KEY));

            if (state && state.renderMode) {
                this.setRenderMode(state.renderMode);
            }
        }

        setListener() {
            document.addEventListener('STE:mainState:updated', (event) => {
                const detail = event.detail;

                if (detail && detail.renderMode) {
                    this.setRenderMode(detail.renderMode);
                }
            });
        }
    }

    /**
     * Provides functionality for every type of shadertoy page.
     *
     * @constructor
     */
    class ToyPlugCommon {
        /**
         * Download a blob to the user's disk.
         * @param filename {String} The filename to save
         * @param blob {Blob} The data to save
         */
        downloadBlob(filename, blob) {
            var link = window.document.createElement('a');

            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        /**
         * Download a JSON file of the provided data
         */
        downloadJson(filename, data) {
            var blob = new window.Blob([ data ], { type: 'application/json' });

            this.downloadBlob(filename, blob);
        }
    }

    /**
     * Provides additional functionality to Shadertoy's edit page.
     *
     * @constructor
     */
    class ToyPlugEditPage {
        constructor() {
            this.init();
        }

        /**
         * Initializes.
         */
        init() {
            /**
             * Body class name for fullscreen edit.
             *
             * @type {string}
             */
            this.FULLSCREEN_MODE_CLASS = 'fullscreen-edit';

            /**
             * Main Shadertoy canvas HTML id attribute.
             *
             * @type {string}
             */
            this.MAIN_SHADERTOY_DEMO_ID = 'demogl';

            /**
             * Main Shadertoy canvas (shader holder).
             *
             * @type {HTMLElement}
             */
            this.c = document.getElementById(this.MAIN_SHADERTOY_DEMO_ID);

            /**
             * Current Shadertoy demo canvas resolution divider.
             *
             * @type {number}
             */
            this.currentDivider = 1;
            this.bindKeys();

            if (!this.createContainers()) {
                return;
            }

            // Create new UI controls
            this.timebar = new Timebar(this);
            this.mouseUniforms = new MouseUniforms(this);
            this.shaderStaticPreview = new ShaderStaticPreview();
            this.shaderDuplicator = new ShaderDuplicator();

            this.duplicateShader();
            this.downloadShader();
            this.downloadShaderAsZip();
            this.uploadShader();

            this.anchorsMaker = new AnchorsMaker();
            this.performanceIndicators = new RenderMeters();
        }

        /**
         * Creates containers for extension elements.
         */
        createContainers() {
            try {
                extensionElements.controlsContainer = document.createElement(
                    'div'
                );
                extensionElements.controlsContainer.classList.add(
                    'toyplug-controls-container'
                );

                extensionElements.controlsContainerHeader = document.createElement(
                    'div'
                );
                extensionElements.controlsContainerHeader.classList.add(
                    'ste-header'
                );
                extensionElements.controlsContainer.appendChild(
                    extensionElements.controlsContainerHeader
                );

                extensionElements.timeWrapper = document.createElement('div');
                extensionElements.timeWrapper.classList.add('time-slider');
                extensionElements.controlsContainer.appendChild(
                    extensionElements.timeWrapper
                );

                extensionElements.mouseSlidersWrapper = document.createElement(
                    'div'
                );
                extensionElements.mouseSlidersWrapper.classList.add(
                    'mouse-uniforms'
                );
                extensionElements.controlsContainer.appendChild(
                    extensionElements.mouseSlidersWrapper
                );

                extensionElements.controlsContainerFooter = document.createElement(
                    'div'
                );
                extensionElements.controlsContainerFooter.classList.add(
                    'ste-footer'
                );
                extensionElements.controlsContainer.appendChild(
                    extensionElements.controlsContainerFooter
                );

                shaderToyElements.leftColumnContainer.insertBefore(
                    extensionElements.controlsContainer,
                    shaderToyElements.shaderInfo
                );

                return true;
            } catch (e) {
                console.error(e);

                return false;
            }
        }

        /**
         * Changes Shader resolution.
         * Resolution calculation is based on divider.
         *
         * @param {number} divider
         */
        decreaseRes(divider) {
            var b = this.c.getBoundingClientRect(),
                n = {
                    w: Math.floor(b.width / divider),
                    h: Math.floor(b.height / divider)
                };

            var mE = gShaderToy.mEffect;
            var xres = n.w;
            var yres = n.h;

            gShaderToy.mEffect.mRO.unobserve(gShaderToy.mCanvas);

            mE.mCanvas.setAttribute('width', xres);
            mE.mCanvas.setAttribute('height', yres);
            mE.mCanvas.width = xres;
            mE.mCanvas.height = yres;
            mE.mXres = xres;
            mE.mYres = yres;

            mE.ResizeBuffers(xres, yres);

            gShaderToy.iSetResolution(xres, yres);
            this.currentDivider = divider;
        }

        /**
         * Changes time position.
         *
         * @param {number} timeshift. Time change value in ms.
         */
        changeTimePosition(timeShift) {
            var destTime = Math.max(0, gShaderToy.mTf + timeShift);

            updateShaderToyTime(destTime);
            updateInputsTime(destTime);
            gShaderToy.mTf = destTime;
        }

        /**
         * Increases time position.
         */
        increaseTimePosition() {
            this.changeTimePosition(ARROW_KEY_TIMESHIFT);
        }

        /**
         * Decrease time position.
         */
        decreaseTimePosition() {
            this.changeTimePosition(-ARROW_KEY_TIMESHIFT);
        }

        /**
         * Attaches additional keys support.
         */
        bindKeys() {
            var self = this;

            document.addEventListener('keydown', function(e) {
                var which = e.which,
                    code = e.code;
                if (e.target.id === self.MAIN_SHADERTOY_DEMO_ID) {
                    console.log(e);
                    // Alt (or Cmd) + ...
                    if (e.altKey || e.metaKey) {
                        // 1...9 Keys
                        if (which === Math.max(49, Math.min(57, which))) {
                            self.decreaseRes(which - 48);
                        }
                        if (e.key === 'ArrowUp') {
                            gShaderToy.pauseTime();
                        }
                        if (e.key === 'ArrowDown') {
                            gShaderToy.resetTime();
                        }
                        if (e.key === 'ArrowRight') {
                            self.increaseTimePosition();
                        }
                        if (e.key === 'ArrowLeft') {
                            self.decreaseTimePosition();
                        }
                    }

                    // shift + ctrl + s
                    if (e.ctrlKey && e.shiftKey && e.which === 83) {
                        self.takeScreenShot();
                    }

                    // shift + ctrl + r
                    if (e.ctrlKey && e.shiftKey && code === 'KeyR') {
                        self.switchRecording();
                    }
                }
                // shift + ctrl + enter
                if (e.which === 13 && e.shiftKey && e.ctrlKey) {
                    self.toggleFullScreenEdit();
                }
            });
        }

        /**
         * Toggles fullscreen edit mode.
         */
        toggleFullScreenEdit() {
            var isFS = document.body.classList.contains(
                this.FULLSCREEN_MODE_CLASS
            );

            if (document.webkitIsFullScreen) {
                document.webkitExitFullscreen();
            }

            document.body.classList[isFS ? 'remove' : 'add'](
                this.FULLSCREEN_MODE_CLASS
            );
            this.decreaseRes(this.currentDivider);
        }

        setRenderMode(mode) {
            this.c.style.imageRendering = mode;
        }

        takeScreenShot() {
            var imageData = null,
                currentDivider = this.currentDivider,
                paused = gShaderToy.mIsPaused;

            if (!paused) {
                gShaderToy.pauseTime();
            }

            this.decreaseRes(currentDivider * 0.25);

            window.setTimeout(function getImageData() {
                imageData = gShaderToy.mEffect.mGLContext.canvas.toDataURL('image/png');
            }, 100);

            window.setTimeout(
                function() {
                    var link = document.createElement('a'),
                        clickEvent = new window.MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: false
                        }),
                        filename =
                            document.getElementById('shaderTitle').value +
                            '_' +
                            new Date().toJSON().slice(0, 10) +
                            ' ' +
                            new Date(new Date()).toString().split(' ')[4];

                    link.setAttribute('href', imageData);
                    link.setAttribute('download', filename);
                    link.dispatchEvent(clickEvent);
                    this.decreaseRes(currentDivider);

                    if (!paused) {
                        gShaderToy.pauseTime();
                    }
                }.bind(this),
                1000
            );
        }

        switchRecording() {
            if (gShaderToy.mMediaRecorder.state === 'inactive') {
                gShaderToy.mMediaRecorder.start();
            } else {
                gShaderToy.mMediaRecorder.stop();
            }
        }

        duplicateShader() {
            var publishWrapper = document.getElementById('shaderPublished'),
                duplicate = document.createElement('div');

            if (publishWrapper) {
                duplicate.classList.add('formButton');
                duplicate.classList.add('formButton-extension');
                duplicate.textContent = 'Save as new draft';

                extensionElements.controlsContainerFooter.appendChild(
                    duplicate
                );

                duplicate.addEventListener('click', function() {
                    if (
                        (gShaderToy.mNeedsSave &&
                            window.confirm(
                                'Current shader will be saved as new draft. Page will be reloaded. Continue?'
                            )) ||
                        !gShaderToy.mNeedsSave
                    ) {
                        gShaderToy.mInfo.username = 'None';
                        gShaderToy.mInfo.id = '-1';
                        document.getElementById('published').value = '0';
                        window.openSubmitShaderForm(false);
                    }
                });
            }
        }

        /**
         * Create the UI controls to download the JSON file of the current shader
         */
        downloadShader() {
            var container =
                    document.getElementById('shaderPublished') ||
                    document.getElementById('shaderButtons'),
                download = document.createElement('div');

            download.classList.add('formButton');
            download.classList.add('formButton-extension');
            download.textContent = 'Export';

            extensionElements.controlsContainerFooter.appendChild(download);

            download.addEventListener(
                'click',
                function onDownloadButtonClick() {
                    var name = gShaderToy.mInfo.id;

                    if (name === '-1') {
                        name = 'default';
                    }

                    window.ToyPlug.common.downloadJson(
                        name + '.json',
                        JSON.stringify(gShaderToy.Save())
                    );
                }
            );
        }

        /**
         * Create the UI controls to download a ZIP of the current shader
         */
        downloadShaderAsZip() {
            /**
             * Callback to prepare and download a ZIP of the current shader
             */
            function onDownloadAsZipClick() {
                var id = gShaderToy.mInfo.id,
                    friendlyName =
                        gShaderToy.mInfo.name || 'ShaderToy shader ' + id,
                    username = gShaderToy.mInfo.username || 'unknown',
                    filename =
                        window.sanitizeFilename(username) +
                        ' - ' +
                        window.sanitizeFilename(friendlyName),
                    tags = [],
                    tagsString = '',
                    description,
                    readme,
                    zip;

                if (id === '-1') {
                    id = 'default';
                }

                // Pull from the live tags and description fields, if provided,
                // rather than just from mInfo.  This permits
                // stuffing information (e.g., release party) into the
                // readme without having to hand-edit, and without needing
                // write access to the shader.
                // Get the tags from the tag box, with a fallback to the
                // ShaderToy info.
                if (
                    shaderToyElements.shaderTags &&
                    shaderToyElements.shaderTags.value
                ) {
                    tags = shaderToyElements.shaderTags.value.split(/\s*,\s*/);
                }

                if (tags.length === 0) {
                    tags = gShaderToy.mInfo.tags;
                }

                // Add the tags to the README
                if (Array.isArray(tags) && tags.length !== 0) {
                    tagsString = 'Tags: ' + tags.join(', ') + '\n';
                }

                // Get the description from the textarea, with a fallback
                // to the ShaderToy info
                if (
                    shaderToyElements.shaderDescription &&
                    shaderToyElements.shaderDescription.value
                ) {
                    description = shaderToyElements.shaderDescription.value;
                } else {
                    description = gShaderToy.mInfo.description;
                }

                readme = window.ToyPlug.renderTemplate(ZIP_README_TEMPLATE, {
                    friendlyName: friendlyName,
                    userName: username,
                    href: window.location.href,
                    tags: tagsString,
                    description: description
                });

                // Build the ZIP.  Tweaked from the JSZip example.
                zip = JSZip();
                zip.file('readme.txt', readme, { binary: false });
                zip.file(
                    id + '.json',
                    JSON.stringify(gShaderToy.Save()),
                    { binary: false }
                );

                // Save the ZIP
                zip.generateAsync({ type: 'blob' }).then(
                    function(content) {
                        window.ToyPlug.common.downloadBlob(
                            filename + '.zip',
                            content
                        );
                    },
                    function() {
                        window.alert("Couldn't save ZIP"); // jshint ignore: line
                    }
                );
            } // onDownloadAsZipClick()

            // Put it down by the Fork button since it is a less-common function
            if (shaderToyElements.shaderInfo) {
                let download = document.createElement('div');

                download.classList.add(
                    'formButton',
                    'formButton-extension',
                    'download-zip'
                );
                download.textContent = 'Export ZIP';

                extensionElements.controlsContainerFooter.appendChild(download);
                download.addEventListener('click', onDownloadAsZipClick);
            }
        }

        uploadShader() {
            var container = document.getElementById('shaderPublished'),
                upload = document.createElement('div');

            if (container) {
                upload.classList.add('formButton');
                upload.classList.add('formButton-extension');
                upload.textContent = 'Import';

                extensionElements.controlsContainerFooter.appendChild(upload);

                upload.addEventListener(
                    'click',
                    function onUploadButtonClick() {
                        var fileInput = document.createElement('input');

                        fileInput.type = 'file';
                        fileInput.addEventListener(
                            'change',
                            function onInputChange() {
                                var file = this.files[0],
                                    reader = new window.FileReader();

                                reader.onload = function onFileLoaded() {
                                    var text = reader.result;

                                    try {
                                        while(gShaderToy.mEffect.mPasses.length) {
                                            gShaderToy.mEffect.DestroyPass(0);
                                        }

                                        gShaderToy.Load(JSON.parse(text, true));
                                    } catch (error) {
                                        window.alert('Failed to load shader!');
                                    }
                                };

                                reader.readAsText(file);
                                container.removeChild(fileInput);
                            }
                        );

                        container.appendChild(fileInput);
                        fileInput.click();
                    }
                );
            }
        }
    }

    /**
     * Provides timebar functionality.
     */
    class Timebar {
        constructor(toyPlug) {
            this.ToyPlug = toyPlug;
            this.loop = window.TimebarLoop;
            this.busy = false;
            this.wasPaused = false;
            this.createElements();
            this.sliderInput.addEventListener(
                'mousedown',
                this.sliderOnMouseDown.bind(this)
            );
            this.sliderInput.addEventListener(
                'mouseup',
                this.sliderOnMouseUp.bind(this)
            );
            this.sliderInput.addEventListener(
                'input',
                function() {
                    updateShaderToyTime(this.sliderInput.value);
                }.bind(this)
            );
            this.minValueInput.addEventListener(
                'change',
                this.onChangeMinInput.bind(this)
            );
            this.maxValueInput.addEventListener(
                'change',
                this.onChangeMaxInput.bind(this)
            );
            this.updateSlider();
            this.controlsExpandTrigger.addEventListener(
                'click',
                this.onControlsExpandTriggerClick.bind(this)
            );
            this.renderSpeedSelector.addEventListener(
                'change',
                this.onChangeRenderSpeedSelector.bind(this)
            );

            this._Paint = Effect.prototype.Paint;
            this.setControlsVisibility(this.getControlsVisibilitySavedState());
        }

        getControlsVisibilitySavedState() {
            return JSON.parse(window.localStorage.getItem('controlsExpanded'));
        }

        setControlsVisibility(expand) {
            extensionElements.controlsContainer.classList[
                expand ? 'add' : 'remove'
            ]('expanded');
        }

        onControlsExpandTriggerClick() {
            var isExpanded = this.getControlsVisibilitySavedState();

            this.setControlsVisibility(!isExpanded);

            window.localStorage.setItem('controlsExpanded', !isExpanded);
        }

        /**
         * Creates and appends timebar elements to ShaderToy.
         */
        createElements() {
            this.controlsExpandTrigger = document.createElement('div');
            this.renderSpeedSelectorWrapper = document.createElement('div');
            this.renderSpeedSelectorWrapper.classList.add(
                'ste-renderSpeed-wrapper'
            );
            this.minValueInput = document.createElement('input');
            this.minValueInput.classList.add('ste-min-input');
            this.sliderInput = document.createElement('input');
            this.maxValueInput = document.createElement('input');
            this.maxValueInput.classList.add('ste-max-input');

            {
                this.loopInput = document.createElement('input');
                this.loopInput.setAttribute('type', 'checkbox');
                this.loopInput.classList.add('ste-loop-toggle');
                this.loopInput.setAttribute('title', 'loop');
                this.loopInput.addEventListener('change', (event) => {
                    this.loop = event.target.checked;
                });
            }

            this.controlsExpandTrigger.textContent = 'Toggle controls';
            this.controlsExpandTrigger.classList.add(
                'expand-trigger',
                'formButton',
                'formButton-extension',
                'speed-select'
            );

            let renderSpeedSpan = document.createElement('label');
            renderSpeedSpan.setAttribute('for', 'ste-renderSpeed');
            renderSpeedSpan.textContent = 'Paint calls:';

            this.renderSpeedSelectorWrapper.appendChild(renderSpeedSpan);
            this.renderSpeedSelector = this.renderSpeedSelectorWrapper.appendChild(
                document.createElement('select')
            );
            this.renderSpeedSelector.id = 'ste-renderSpeed';
            this.renderSpeedSelector.classList.add('formButton');

            [ 1, 2, 4, 8, 16, 32, 64 ].forEach((val) => {
                let option = document.createElement('option');
                option.value = val;
                option.textContent = val;
                this.renderSpeedSelector.appendChild(option);
            });

            extensionElements.controlsContainerHeader.appendChild(
                this.controlsExpandTrigger
            );
            extensionElements.controlsContainerHeader.appendChild(
                this.renderSpeedSelectorWrapper
            );

            {
                extensionElements.timeWrapper.appendChild(this.minValueInput);
                extensionElements.timeWrapper.appendChild(this.sliderInput);
                extensionElements.timeWrapper.appendChild(this.maxValueInput);
                extensionElements.timeWrapper.appendChild(this.loopInput);
            }

            this.minValueInput.type = this.maxValueInput.type = 'number';
            this.minValueInput.value = 0;
            this.minValueInput.min = 0;
            this.maxValueInput.value = 60;
            this.maxValueInput.min = 1;

            this.sliderInput.type = 'range';
            this.sliderInput.min = 0;
            this.sliderInput.max = 60 * 1000;
            this.sliderInput.value = 0;
            this.sliderInput.step = 20;

            this.createRenderTimersTrigger();
        }

        createRenderTimersTrigger() {
            let triggerElement = document.createElement('input');

            triggerElement.type = 'checkbox';
            triggerElement.classList.add('ste-render-meters-toggle');

            extensionElements.controlsContainerHeader.appendChild(
                triggerElement
            );

            triggerElement.addEventListener('change', (e) => {
                document.dispatchEvent(
                    new CustomEvent('toyplug:renderTimersVisibility', {
                        detail: {
                            enabled: e.target.checked
                        }
                    })
                );
            });

            document.addEventListener(
                'toyplug:renderTimersVisibility:notAvailable',
                () => {
                    triggerElement.disabled = true;
                    triggerElement.title =
                        'EXT_disjoint_timer_query_webgl2 not found';
                }
            );

            document.addEventListener(
                'toyplug:renderTimersVisibility:updated',
                (e) => {
                    triggerElement.checked = e.detail.enabled;
                }
            );
        }

        onChangeRenderSpeedSelector(e) {
            let speedFactor = e.target.value,
                self = this;

            if (!self._Paint && typeof Effect.prototype.Paint === 'function') {
                self._Paint = Effect.prototype._Paint;
            }

            Effect.prototype.Paint = function(...args) {
                for (let i = 0; i < speedFactor; i++) {
                    self._Paint.apply(this, args);
                }
            };
        }

        onChangeMinInput() {
            this.maxValueInput.min = parseInt(this.minValueInput.value, 10) + 1;
            this.maxValueInput.value = Math.max(
                parseInt(this.maxValueInput.value, 10),
                parseInt(this.minValueInput.value, 10) + 1
            );
            this.sliderInput.min =
                parseInt(this.minValueInput.value, 10) * 1000;
        }

        onChangeMaxInput() {
            this.minValueInput.max = parseInt(this.maxValueInput.value, 10);
            this.minValueInput.value = Math.min(
                parseInt(this.maxValueInput.value, 10) - 1,
                parseInt(this.minValueInput.value, 10)
            );
            this.sliderInput.max =
                parseInt(this.maxValueInput.value, 10) * 1000;
        }

        /**
         * Sets slider to ShaderToy time.
         */
        updateSlider() {
            var outsideLoop = false;

            //this.loop = window.TimebarLoop;

            if (gShaderToy && !this.busy) {
                this.sliderInput.value = gShaderToy.mTf;
            }

            if (this.loop && gShaderToy.mTf > this.maxValueInput.value * 1000) {
                this.sliderInput.value = this.minValueInput.value * 1000;
                outsideLoop = true;
            }

            if (this.loop && gShaderToy.mTf < this.minValueInput.value * 1000) {
                this.sliderInput.value = this.minValueInput.value * 1000;
                outsideLoop = true;
            }

            if (outsideLoop) {
                updateShaderToyTime(this.sliderInput.value);
                updateInputsTime(this.sliderInput.value);
            }

            setTimeout(this.updateSlider.bind(this), 26);
        }

        /**
         * Handles click on slider.
         */
        sliderOnMouseDown() {
            this.wasPaused = gShaderToy.mIsPaused;
            this.sliderInput.min = parseInt(
                this.minValueInput.value * 1000,
                10
            );
            this.sliderInput.max = parseInt(
                this.maxValueInput.value * 1000,
                10
            );

            if (!this.wasPaused) {
                this.busy = true;
                gShaderToy.pauseTime();
            }

            return false;
        }

        /**
         * Handles relase slider click.
         */
        sliderOnMouseUp() {
            if (!this.wasPaused) {
                gShaderToy.pauseTime();
            }

            window.requestAnimationFrame(
                function() {
                    updateShaderToyTime(
                        this.sliderInput.value,
                        !this.wasPaused
                    );
                    updateInputsTime(this.sliderInput.value);
                    this.busy = false;
                }.bind(this)
            );
        }

        /**
         * Handles user changing slider value.
         */
        sliderOnChange() {
            updateShaderToyTime(this.sliderInput.value);
        }
    }

    /**
     * Updates ShaderToy with provided time value.
     */
    function updateShaderToyTime(time) {
        var value = parseInt(time, 10),
            i = 0;

        gShaderToy.pauseTime();

        gShaderToy.mFpsFrame = ~~(value / 1000 * 60);
        gShaderToy.mForceFrame = true;
        gShaderToy.mRestarted = true;
        gShaderToy.mFpsTo = gShaderToy.mTo;
        gShaderToy.mEffect.mFrame = gShaderToy.mFpsFrame;

        for (i; i < gShaderToy.mEffect.mPasses.length; i++) {
            gShaderToy.mEffect.mPasses[i].mFrame = gShaderToy.mFpsFrame;
        }

        window.requestAnimationFrame(function() {
            gShaderToy.mTOffset = value;
            gShaderToy.mTo = window.getRealTime();
            gShaderToy.mTf = value;

            try {
                gShaderToy.mEffect.mAudioContext.currentTime = value;
            } catch (ignore) {}

            gShaderToy.pauseTime();
        });
    }

    /**
     * Updates ShaderToy inputs.
     */
    function updateInputsTime(value) {
        gShaderToy.mEffect.mPasses.forEach(function mPass(pass) {
            pass.mInputs.forEach(function mInput(input) {
                var media = null;

                if (input) {
                    media = input.audio || input.video;

                    if (media) {
                        media.controls = true;
                        media.currentTime = value / 1000;
                    }
                }
            });
        });
    }

    /**
     * Adds forking any shader functionality.
     */
    class ShaderDuplicator {
        constructor() {
            this.finishShaderFork();
            this.addButton();
            this.bindButtonEvents();
        }

        /**
         * Loads shader from LocalStorage if there is is stored one.
         */
        finishShaderFork() {
            var storedShader = window.localStorage.getItem(
                    LOCALSTORAGE_SHADER_FORK_KEYNAME
                );

            if (!storedShader) {
                return;
            }

            window.gIsMyShader = true;

            try {
                gShaderToy.mEffect.mGLContext = null;
                gShaderToy.mEffect.DestroyPass(0);

                setTimeout(function() {
                    while(gShaderToy.mEffect.mPasses.length) {
                        gShaderToy.mEffect.DestroyPass(0);
                    }

                    window.iLoadShader([JSON.parse(storedShader)]);

                    window.localStorage.setItem(
                        LOCALSTORAGE_SHADER_FORK_KEYNAME,
                        ''
                    );

                    gShaderToy.mInfo.username = 'None';
                    gShaderToy.mInfo.id = '-1';
                    gShaderToy.mNeedsSave = true;

                    if (document.getElementById('published')) {
                        document.getElementById('published').value = '0';
                    }
                }, 50);
            } catch (ignore) {}
        }

        /**
         * Adds "Fork" button.
         */
        addButton() {
            this.button = document.createElement('div');
            this.button.textContent = 'Fork';
            this.button.classList.add('formButton');
            this.button.classList.add('formButton-extension');
            this.button.classList.add('fork-shader-btn');

            extensionElements.controlsContainerFooter.appendChild(this.button);
        }

        /**
         * Binds "Fork" button event.
         */
        bindButtonEvents() {
            var self = this;

            this.button.addEventListener(
                'click',
                self.onButtonClick.bind(self)
            );
        }

        createBanner(shaderInfo) {
            var banner =
                '// Fork of ' +
                '"' +
                shaderInfo.name +
                '" by ' +
                shaderInfo.username +
                '. https://shadertoy.com/view/' +
                shaderInfo.id +
                '\n// ' +
                new Date()
                    .toISOString()
                    .replace('T', ' ')
                    .replace(/(\..*)/g, '') +
                '\n\n';
            return banner;
        }

        /**
         * Handles button's "click" event.
         * Stores shader in localStorage and redirect to "new shader" page.
         */
        onButtonClick() {
            var shaderData = gShaderToy.Save(),
                banner = this.createBanner(shaderData.info);

            shaderData.renderpass.forEach(function(pass) {
                if (pass.name === 'Image') {
                    pass.code = banner + pass.code;
                }
            });

            window.localStorage.setItem(
                LOCALSTORAGE_SHADER_FORK_KEYNAME,
                JSON.stringify(shaderData)
            );
            gShaderToy.mNeedsSave = false;
            window.location.href = 'https://www.shadertoy.com/new';
        }
    }

    /**
     * Mouse uniform sliders.
     */
    class MouseUniforms {
        constructor() {
            this.config = [
                { gS: 'PosX', vPart: 'x', size: 'width' },
                { gS: 'PosY', vPart: 'y', size: 'height' },
                { gS: 'OriX', vPart: 'z', size: 'width' },
                { gS: 'OriY', vPart: 'w', size: 'height' }
            ];

            this.addSliders();
            this.onResize();

            window.addEventListener('resize', this.onResize.bind(this));
        }

        /**
         * Adds sliders to page.
         */
        addSliders() {
            this.sliders = this.config.map(function createSlider(obj) {
                var slider = document.createElement('input'),
                    valueElement = document.createElement('span');
                slider.type = 'range';
                slider.min = 0;
                slider.value = 0;
                slider.setAttribute('data-axis', obj.gS);
                slider.setAttribute('data-vpart', obj.vPart);
                slider.setAttribute('data-size', obj.size);
                valueElement.textContent = obj.vPart + ': 0';
                extensionElements.mouseSlidersWrapper.appendChild(slider);
                extensionElements.mouseSlidersWrapper.appendChild(valueElement);
                slider.addEventListener(
                    'input',
                    this.onSliderChange.bind(this)
                );
                slider.addEventListener('blur', this.onSliderBlur);
                return slider;
            }, this);
        }

        /**
         * Resets mouse left button status.
         */
        onSliderBlur() {
            gShaderToy.mMouseIsDown = false;
        }

        /**
         * Updates shaderToy mouse uniforms.
         * Waits 20ms to reset mouse button status.
         */
        onSliderChange(e) {
            var slider = e.target,
                axis = slider.getAttribute('data-axis'),
                vPart = slider.getAttribute('data-vPart'),
                value = slider.value;

            slider.nextSibling.textContent = vPart + ': ' + value;
            gShaderToy['mMouse' + axis] = value;
            gShaderToy.mForceFrame = true;
            setTimeout(this.onSliderBlur, 20);
        }

        /**
         * Updates sliders range on window resize.
         */
        onResize() {
            var sizes = document
                .getElementById('demogl')
                .getBoundingClientRect();

            this.sliders.forEach(function(slider) {
                slider.max = sizes[slider.getAttribute('data-size')];
                this.onSliderChange({ target: slider });
            }, this);
        }
    }

    /**
     * Class to wrap http/https url into HTML <a> tags.
     */
    class AnchorsMaker {
        constructor() {
            this.NOT_ANCHOR_URL_REGEXP = /((http?|https?):\/\/[^"<\s]+)(?![^<>]*>|[^"]*?<\/a)/g;
            this.init();
        }

        /**
         * Initializes instance.
         * Runs replacing for shaderToy elements.
         */
        init() {
            try {
                this.makeCommentsLinks();
                this.makeDescriptionLinks();
            } catch (ignore) {}
        }

        /**
         * Wraps all http/https urls in element content into HTML <a> tags.
         *
         * @param {element} Element to replace urls in.
         */
        _makeLink(element) {
            element.innerHTML = element.innerHTML.replace(
                this.NOT_ANCHOR_URL_REGEXP,
                '<a class="ext-link" target="_blank" class="regular" href="$1">$1</a>'
            );
            let links = Array.from(element.querySelectorAll('[href].ext-link'));
            // remove non alphanumeric at the end.
            links.forEach((link) => {
                let href = link
                    .getAttribute('href')
                    .replace(/[^a-zA-Z0-9 :]$/, ' ');
                link.setAttribute('href', href);
                link.textContent = href;
            });
        }

        /**
         * Waits to description load.
         * Replaces urls if loaded.
         */
        makeDescriptionLinks() {
            var SELECTOR = '#shaderDescription',
                descriptionElement = document.querySelector(SELECTOR);

            if (descriptionElement.tagName === 'TEXTAREA') {
                return;
            }

            if (descriptionElement.textContent) {
                this._makeLink(descriptionElement);
            } else {
                setTimeout(this.makeDescriptionLinks.bind(this), 200, this);
            }
        }

        /**
         * Waits for comments load.
         * Replaces urls if loaded.
         */
        makeCommentsLinks() {
            var SELECTOR = '#myComments .commentContent',
                commentsContents = document.querySelectorAll(SELECTOR);

            if (commentsContents.length) {
                Array.prototype.slice.apply(commentsContents).forEach(
                    function(commentContentElement) {
                        this._makeLink(commentContentElement);
                    }.bind(this)
                );
            } else {
                setTimeout(this.makeCommentsLinks.bind(this), 200, this);
            }
        }
    }

    class ShaderStaticPreview {
        constructor() {
            this.addButton();
            this.addPreviewImage();
        }

        addPreviewImage() {
            this.previewImage = document.createElement('img');
            this.previewImage.classList.add('toyplug-preview');
            this.previewImage.setAttribute(
                'src',
                SHADER_PREVIEW_LOCATION + window.gShaderID + '.jpg'
            );

            document.body.appendChild(this.previewImage);
        }

        addButton() {
            this.button = document.createElement('div');
            this.button.style.backgroundImage =
                'url(' + SHADER_PREVIEW_LOCATION + window.gShaderID + '.jpg)';
            this.button.classList.add(
                'formButton',
                'formButton-extension',
                'formButton-preview-button'
            );
            this.button.setAttribute('title', 'Show generated preview');
            this.button.addEventListener(
                'click',
                this.onButtonClick.bind(this)
            );

            extensionElements.controlsContainerFooter.appendChild(this.button);
        }

        onButtonClick(event) {
            this.previewImage.classList.toggle('visible');

            window.addEventListener('click', this.hidePreview.bind(this));
            event.stopPropagation();
        }

        hidePreview() {
            this.previewImage.classList.remove('visible');

            window.removeEventListener('click', this.hidePreview);
        }
    }

    class RenderMeters {
        setUpInstanceVariables() {
            this.gl = gShaderToy.mCanvas.getContext('webgl2');
            this.ext = this.gl instanceof WebGL2RenderingContext && this.gl.getExtension('EXT_disjoint_timer_query_webgl2');

            if (!this.ext) {
                return;
            }

            this.NUM_QUERIES = 16;
            this.TIMERS_VISIBILITY_KEY = 'timersVisibility';

            this.mTimingSupport = {
                createQuery: () => this.gl.createQuery(),
                deleteQuery: query => this.gl.deleteQuery(query),
                beginQuery: query => this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query),
                endQuery: () => this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),
                isAvailable: query => this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE),
                isDisjoint: () => this.gl.getParameter(this.ext.GPU_DISJOINT_EXT),
                getResult: query => this.gl.getQueryParameter(query, this.gl.QUERY_RESULT)
            };

            this.interval = null;
            this.renderTimersVisible = false;
        }

        constructor() {
            this.setUpInstanceVariables();

            if (this.ext) {
                console.info('Found EXT_disjoint_timer_query_webgl2 extension');

                this.replaceShaderToyPaint();
                this.replaceShaderToyCreate();
                this.setTimer();
            } else {
                console.warn('EXT_disjoint_timer_query_webgl2 extension not available');

                document.dispatchEvent(
                    new CustomEvent('toyplug:renderTimersVisibility:notAvailable', {
                        detail: {}
                    })
                );
                return;
            }

            extensionElements.renderMetersContainer = document.createElement('div');
            extensionElements.renderMetersContainer.classList.add('ste-rendering-meters');

            shaderToyElements.shaderPlayer.appendChild(extensionElements.renderMetersContainer);

            document.addEventListener('toyplug:renderTimersVisibility', e => {
                this.setState(e.detail.enabled);
            });

            this.restoreState();
        }

        restoreState() {
            const saved = window.localStorage.getItem(this.TIMERS_VISIBILITY_KEY);

            if (saved != undefined) {
                this.setState(JSON.parse(saved));
            } else {
                this.setState(false);
            }
        }

        setState(newState) {
            if (!newState) {
                clearInterval(this.interval);
            } else {
                this.setTimer();
            }

            window.localStorage.setItem(this.TIMERS_VISIBILITY_KEY, JSON.stringify(newState));

            this.renderTimersVisible = newState;
            this.updateElementVisibility();

            document.dispatchEvent(
                new CustomEvent('toyplug:renderTimersVisibility:updated', {
                    detail: {
                        enabled: newState
                    }
                })
            );
        }

        initPass(pass) {
            const self = this;

            if (self.mTimingSupport && pass.mType != 'common' && pass.mType != 'sound') {
                pass.mTiming = {
                    query: Array.from({ length: self.NUM_QUERIES }, () => self.mTimingSupport.createQuery()),
                    cursor: 0,
                    wait: self.NUM_QUERIES,
                    accumTime: 0,
                    accumSamples: 0
                };
            }

            pass.ste = true;
        }

        replaceShaderToyPaint() {
            const self = this;
            let oldEffectPassPaint = EffectPass.prototype.Paint;

            EffectPass.prototype.Paint = function(...args) {
                let timing = this.mTiming;

                if (timing) {
                    self.mTimingSupport.beginQuery(timing.query[timing.cursor]);
                }

                let result = oldEffectPassPaint.apply(this, args);

                if (timing) {
                    self.mTimingSupport.endQuery();
                    timing.cursor = (timing.cursor + 1) % timing.query.length;

                    if (timing.wait > 0) {
                        --timing.wait;
                    } else {
                        let prev = timing.cursor;
                        let available = self.mTimingSupport.isAvailable(timing.query[prev]);
                        let disjoint = self.mTimingSupport.isDisjoint();

                        if (available && !disjoint) {
                            let elapsed = self.mTimingSupport.getResult(timing.query[prev]);
                            timing.accumTime += elapsed * 1e-6;
                            timing.accumSamples++;
                        }
                    }
                }

                if (!timing && !this.ste) {
                    self.initPass.call(self, this);
                }

                return result;
            };
        }

        replaceShaderToyCreate() {
            const self = this;

            let oldEffectPassCreate = EffectPass.prototype.Create;

            EffectPass.prototype.Create = function(...args) {
                let result = oldEffectPassCreate.apply(this, args);

                self.initPass.call(self, this);

                return result;
            };
        }

        updateElementVisibility() {
            extensionElements.renderMetersContainer.style.display = this.renderTimersVisible ? 'block' : 'none';
        }

        setTimer() {
            this.interval = setInterval(() => {
                let numPasses = 0;
                const passData = [];

                for (let pass of gShaderToy.mEffect.mPasses) {
                    let timing = pass.mTiming;

                    if (!timing) {
                        continue;
                    }

                    if (timing.accumSamples) {
                        timing.average = timing.accumTime / timing.accumSamples;
                        timing.accumTime = 0;
                        timing.accumSamples = 0;
                    }

                    if (timing.average === undefined) {
                        continue;
                    }

                    passData[numPasses++] = {
                        avgRenderTime: timing.average.toFixed(2),
                        name: pass.mName,
                        compilationTime: pass.mCompilationTime
                    };
                }

                let sorted = [];
                let fastest;
                let slowest;

                if (numPasses > 1) {
                    sorted = passData.sort((p1, p2) => p1.avgRenderTime - p2.avgRenderTime);

                    fastest = sorted[0].avgRenderTime;
                    slowest = sorted[sorted.length - 1].avgRenderTime;
                }

                while (extensionElements.renderMetersContainer.lastChild) {
                    extensionElements.renderMetersContainer.lastChild.remove();
                }

                extensionElements.renderMetersContainer.removeChild;
                let frag = document.createDocumentFragment();

                passData.forEach(pass => {
                    let l = document.createElement('p');
                    l.textContent = `${pass.name}: ${pass.avgRenderTime}ms`;

                    if (numPasses > 1) {
                        if (pass.avgRenderTime === slowest) {
                            l.classList.add('slowest');
                        }

                        if (pass.avgRenderTime === fastest) {
                            l.classList.add('fastest');
                        }
                    }

                    frag.appendChild(l);
                });

                extensionElements.renderMetersContainer.append(frag);
            }, 100);
        }
    }

    window.ToyPlug = window.ToyPlug || new ToyPlug();
})(document, window);
