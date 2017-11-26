/* global gShaderToy, window, document */

(function shadertoyPlugin() {

    'strict mode';

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

        /**
         * Stores ToyPlug instance.
         *
         * @type {ToyPlug}
         */
        tp,

        /**
         * Stores references to ShaderToy HTML elements.
         */
        shaderToyElements = {
            shaderInfo: document.getElementById('shaderInfo'),
        },

        extensionElements = {
        };

    /**
     * ToyPlug.
     *
     * @contructor
     */
    function ToyPlug() {
        if (!this.initialized) {
            this.init();
        }

        this.initialized = true;
    }

    /**
     * @returns {boolean} True if current page is editor page.
     */
    ToyPlug.prototype.isEditPage = function isEditPage() {
        return document.location.href.match(/(.com\/view|.com\/new)/);
    };

    ToyPlug.prototype.setRenderMode = function setRenderMode(mode) {
        if (this.editPage) {
            this.editPage.setRenderMode(mode);
        }
    };

    /**
     * Inits ToyPlug functionality.
     */
    ToyPlug.prototype.init = function init() {
        this.common = new ToyPlugCommon();

        if (this.isEditPage()) {
            this.editPage = new ToyPlugEditPage();
        }
    };

    /**
     * Provides functionality for every type of shadertoy page.
     *
     * @constructor
     */
    function ToyPlugCommon() { }

    ToyPlugCommon.prototype.downloadJson = function downloadJson(filename, data) {
        var blob = new Blob([data], {type: 'application/json'}),
            link = window.document.createElement('a');

        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Provides additional functionality to Shadertoy's edit page.
     *
     * @constructor
     */
    function ToyPlugEditPage() {
        this.init();
    }

    /**
     * Initializes.
     */
    ToyPlugEditPage.prototype.init = function init() {

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
        this.createContainers();

        this.timebar = new Timebar(this);
        this.mouseUniforms = new MouseUniforms(this);
        this.duplicateShader();
        this.uploadShader();
        this.downloadShader();

        this.shaderDuplicator = new ShaderDuplicator();
        this.anchorsMaker = new AnchorsMaker();
    };

    /**
     * Creates containers for extension elements.
     */
    ToyPlugEditPage.prototype.createContainers = function() {
        var controlsContainer = document.createElement('div');

        controlsContainer.classList.add('toyplug-controls-container');

        shaderToyElements.shaderInfo.insertBefore(
            controlsContainer,
            shaderToyElements.shaderInfo.querySelector('#shaderInfoHeader')
        );

        extensionElements.controlsContainer = controlsContainer;
    };

    /**
     * Changes Shader resolution.
     * Resolution calculation is based on divider and depends of fullscreen
     * mode.
     *
     * @param {number} divider
     */
    ToyPlugEditPage.prototype.decreaseRes = function (divider) {
        var b = this.c.getBoundingClientRect(),
            n = {
                w: b.width / divider,
                h: b.height / divider
            };

        gShaderToy.resize(n.w, n.h);
        this.currentDivider = divider;
    };

    /**
     * Changes time position.
     *
     * @param {number} timeshift. Time change value in ms.
     */
    ToyPlugEditPage.prototype.changeTimePosition = function (timeShift) {
        var destTime = Math.max(0, gShaderToy.mTf + timeShift);

        updateShaderToyTime(destTime);
        updateInputsTime(destTime);
        gShaderToy.mTf = destTime;
    };

    /**
     * Increases time position.
     */
    ToyPlugEditPage.prototype.increaseTimePosition =
        function increaseTimePosition() {
            this.changeTimePosition(ARROW_KEY_TIMESHIFT);
        };

    /**
     * Decrease time position.
     */
    ToyPlugEditPage.prototype.decreaseTimePosition =
        function decreaseTimePosition() {
            this.changeTimePosition(-ARROW_KEY_TIMESHIFT);
        };

    /**
     * Attaches additional keys support.
     */
    ToyPlugEditPage.prototype.bindKeys = function bindKeys() {

        var self = this;

        document.addEventListener('keydown', function(e) {

            var which = e.which,
                code = e.code;

            if (e.target.id === self.MAIN_SHADERTOY_DEMO_ID) {

                // Alt (or Cmd) + ...
                if (e.altKey || e.metaKey) {

                    // 1...9 Keys
                    if (which == Math.max(49, Math.min(57, which))) {
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
                if (e.ctrlKey && e.shiftKey && e.which == '83') {
                    self.takeScreenShot();
                }

                // shift + ctrl + r
                if (e.ctrlKey && e.shiftKey && code === 'KeyR') {
                    self.switchRecording();
                }

            }

            // shift + ctrl + enter
            if (e.which == 13 && e.shiftKey && e.ctrlKey) {
                self.toggleFullScreenEdit();
            }
        });
    };

    /**
     * Toggles fullscreen edit mode.
     */
    ToyPlugEditPage.prototype.toggleFullScreenEdit =
        function toggleFullScreenEdit() {
            var isFS = document.body.classList
                    .contains(this.FULLSCREEN_MODE_CLASS);

            if (document.webkitIsFullScreen) {
                document.webkitExitFullscreen();
            }

            document.body.classList[isFS ? 'remove' : 'add'](
                this.FULLSCREEN_MODE_CLASS
            );
            this.decreaseRes(this.currentDivider);
        };

    ToyPlugEditPage.prototype.setRenderMode = function setRenderMode(mode) {
        this.c.style.imageRendering = mode;
    };

    ToyPlugEditPage.prototype.takeScreenShot = function takeScreenShot() {
        var imageData = null,
            currentDivider = this.currentDivider,
            paused = gShaderToy.mIsPaused;

        if (!paused) gShaderToy.pauseTime();
        this.decreaseRes(currentDivider * 0.25);

        window.setTimeout(function getImageData() {
            imageData = gShaderToy.mGLContext.canvas.toDataURL('image/png');
        }, 100);

        window.setTimeout(function() {
            var link = document.createElement('a'),
                clickEvent = new MouseEvent('click', {
                    'view': window,
                    'bubbles': true,
                    'cancelable': false
                }),
                filename = document.getElementById('shaderTitle').value +
                    '_' + new Date().toJSON().slice(0,10) +
                    ' ' + new Date(new Date()).toString().split(' ')[4];

            link.setAttribute('href', imageData);
            link.setAttribute('download', filename);
            link.dispatchEvent(clickEvent);

            this.decreaseRes(currentDivider);
            if (!paused) gShaderToy.pauseTime();
        }.bind(this), 1000);
    };

    ToyPlugEditPage.prototype.switchRecording = function switchRecording() {
        if (gShaderToy.mMediaRecorder.state == 'inactive') {
            gShaderToy.mMediaRecorder.start();
        }
        else {
            gShaderToy.mMediaRecorder.stop();
        }
    };

    ToyPlugEditPage.prototype.duplicateShader = function duplicateShader() {
        var publishWrapper = document.getElementById('shaderPublished'),
            duplicate = document.createElement('div');

        if (publishWrapper) {
            duplicate.classList.add('formButton');
            duplicate.classList.add('formButton-extension');
            duplicate.style.marginLeft = "12px";
            duplicate.style.display = 'inline-block';
            duplicate.textContent = 'Save as new draft';

            publishWrapper.appendChild(duplicate);
            duplicate.addEventListener('click', function() {
                if (
                    (gShaderToy.mNeedsSave &&
                        window.confirm('Current shader will be saved as new draft. Page will be reloaded. Continue?')
                    ) || !gShaderToy.mNeedsSave) {
                        gShaderToy.mInfo.username = 'None';
                        gShaderToy.mInfo.id = '-1';
                        document.getElementById('published').value = '0';
                        window.openSubmitShaderForm(false);
                    }
            });
        }
    };

    ToyPlugEditPage.prototype.downloadShader = function downloadShader() {
        var container = document.getElementById('shaderPublished') || document.getElementById('shaderButtons'),
            download = document.createElement('div');

        if (container) {
            download.classList.add('formButton');
            download.classList.add('formButton-extension');
            download.style.marginLeft = '12px';
            download.style.float = 'right';
            download.style.width = '60px';
            download.style.minWidth = '60px';
            download.style.display = 'inline-block';
            download.textContent = 'Export';

            container.appendChild(download);
            download.addEventListener('click', function onDownloadButtonClick() {
                var name = gShaderToy.mInfo.id;
                if (name == '-1') {
                    name = 'default';
                }
                window.ToyPlug.common.downloadJson(name + '.json', JSON.stringify(gShaderToy.exportToJSON()));
            });
        }
    };

    ToyPlugEditPage.prototype.uploadShader = function uploadShader() {
        var container = document.getElementById('shaderPublished'),
            upload = document.createElement('div');

        if (container) {
            upload.classList.add('formButton');
            upload.classList.add('formButton-extension');
            upload.style.marginLeft = '12px';
            upload.style.float = 'right';
            upload.style.width = '60px';
            upload.style.minWidth = '60px';
            upload.style.display = 'inline-block';
            upload.textContent = 'Import';
            container.appendChild(upload);

            upload.addEventListener('click', function onUploadButtonClick() {
                var fileInput = document.createElement('input');

                fileInput.type = 'file';
                fileInput.addEventListener('change', function onInputChange() {
                    var file = this.files[0],
                        reader = new FileReader();

                    reader.onload = function onFileLoaded(e) {
                        var text = reader.result;
                        try {
                            dataLoadShader(JSON.parse('[' + text + ']'));
                        } catch (error) {
                            alert('Failed to load shader!');
                        }
                        gShaderToy.mInfo.id = '-1';
                    };

                    reader.readAsText(file);
                    container.removeChild(fileInput);
                });

                container.appendChild(fileInput);
                fileInput.click();
            });
        }
    };

    /**
     * Provides timebar functionality.
     *
     * @contructor
     */
    function Timebar(toyPlug) {
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

        this.setControlsVisibility(
            this.getControlsVisibilitySavedState()
        );
    }

    Timebar.prototype.getControlsVisibilitySavedState = function() {
        return JSON.parse(localStorage.getItem('controlsExpanded'));
    };

    Timebar.prototype.setControlsVisibility = function(expand) {
        this.controlsExpandTrigger.classList[expand ? 'add' : 'remove']('expanded');
    };

    Timebar.prototype.onControlsExpandTriggerClick = function() {
        var isExpanded = this.getControlsVisibilitySavedState();

        this.setControlsVisibility(!isExpanded);
        localStorage.setItem('controlsExpanded', !isExpanded);
    };

    /**
     * Creates and appends timebar elements to ShaderToy.
     */
    Timebar.prototype.createElements = function createElements() {
        this.controlsExpandTrigger = document.createElement('div');
        this.sliderBar = document.createElement('div');
        this.minValueInput = document.createElement('input');
        this.sliderInput = document.createElement('input');
        this.maxValueInput = document.createElement('input');

        this.controlsExpandTrigger.textContent = 'Toggle controls';
        this.controlsExpandTrigger.classList.add('expand-trigger');
        this.controlsExpandTrigger.classList.add('formButton');
        this.controlsExpandTrigger.classList.add('formButton-extension');

        extensionElements.controlsContainer.appendChild(
            this.controlsExpandTrigger
        );

        extensionElements.controlsContainer.appendChild(
            this.sliderBar
        );

        this.sliderBar.classList.add('time-slider');

        this.sliderBar.appendChild(this.minValueInput);
        this.sliderBar.appendChild(this.sliderInput);
        this.sliderBar.appendChild(this.maxValueInput);

        this.sliderInput.type = 'range';
        this.minValueInput.type = this.maxValueInput.type = 'number';

        this.minValueInput.value = 0;
        this.minValueInput.min = 0;

        this.maxValueInput.value = 60;
        this.maxValueInput.min = 1;

        this.sliderInput.min = 0;
        this.sliderInput.max = 60 * 1000;
        this.sliderInput.value = 0;
        this.sliderInput.step = 20;
    };

    Timebar.prototype.onChangeMinInput = function onChangeMinInput() {
        this.maxValueInput.min = parseInt(this.minValueInput.value, 10) + 1;
        this.maxValueInput.value = Math.max(
            parseInt(this.maxValueInput.value, 10),
            parseInt(this.minValueInput.value, 10) + 1
        );
        this.sliderInput.min = parseInt(this.minValueInput.value, 10) * 1000;
    };

    Timebar.prototype.onChangeMaxInput = function onChangeMinInput() {
        this.minValueInput.max = parseInt(this.maxValueInput.value, 10);
        this.minValueInput.value = Math.min(
            parseInt(this.maxValueInput.value, 10) - 1,
            parseInt(this.minValueInput.value, 10)
        );
        this.sliderInput.max = parseInt(this.maxValueInput.value, 10) * 1000;
    };

    /**
     * Sets slider to ShaderToy time.
     */
    Timebar.prototype.updateSlider = function updateSlider() {
        this.loop = window.TimebarLoop;

        var outsideLoop = false;

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
    };

    /**
     * Handles click on slider.
     */
    Timebar.prototype.sliderOnMouseDown = function sliderOnMouseDown() {
        this.wasPaused = gShaderToy.mIsPaused;
        this.sliderInput.min = parseInt(this.minValueInput.value * 1000, 10);
        this.sliderInput.max = parseInt(this.maxValueInput.value * 1000, 10);
        if (!this.wasPaused) {
            this.busy = true;
            gShaderToy.pauseTime();
        }
        return false;
    };

    /**
     * Handles relase slider click.
     */
    Timebar.prototype.sliderOnMouseUp = function sliderOnMouseUp() {
        if (!this.wasPaused) gShaderToy.pauseTime();

        requestAnimationFrame(function() {
            updateShaderToyTime(this.sliderInput.value, !this.wasPaused);
            updateInputsTime(this.sliderInput.value);
            this.busy = false;
        }.bind(this));
    };

    /**
     * Handles user changing slider value.
     */
    Timebar.prototype.sliderOnChange = function sliderOnChange() {
        updateShaderToyTime(this.sliderInput.value);
    };

    /**
     * Updates ShaderToy with provided time value.
     */
    function updateShaderToyTime(time, togglePause) {
        var value = parseInt(time, 10),
            i = 0;

        gShaderToy.pauseTime();

        gShaderToy.mFpsFrame = ~~(value / 1000 * 60);
        gShaderToy.mForceFrame = true;
        gShaderToy.mRestarted = true;
        gShaderToy.mFpsTo = gShaderToy.mTo;
        gShaderToy.mEffect.mFrame = gShaderToy.mFpsFrame;

        for (i; i < gShaderToy.mEffect.mPasses.length; i++ ) {
            gShaderToy.mEffect.mPasses[i].mFrame = gShaderToy.mFpsFrame;
        }

        requestAnimationFrame(function() {
            gShaderToy.mTOffset = value;
            gShaderToy.mTo = getRealTime();
            gShaderToy.mTf = value;
            gShaderToy.mEffect.mAudioContext.currentTime = value;

            gShaderToy.pauseTime();
        });
    }

    /**
     * Updates ShaderToy inputs.
     */
    function updateInputsTime(value) {
        gShaderToy.mEffect.mPasses.forEach(function mPass(pass) {
            pass.mInputs.forEach(function mInput(input){
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
    ShaderDuplicator = function() {
        this.finishShaderFork();
        this.addButton();
        this.bindButtonEvents();
    };

    /**
     * Loads shader from LocalStorage if there is is stored one.
     */
    ShaderDuplicator.prototype.finishShaderFork = function() {
        var storedShader = window.localStorage.getItem(
                LOCALSTORAGE_SHADER_FORK_KEYNAME
            ),
            ctx = gShaderToy.mGLContext;

        if (!storedShader) {
            return;
        }

        try {
            gShaderToy.mGLContext = null;

            setTimeout(function() {
                dataLoadShader(JSON.parse('[' + storedShader + ']'));
                gShaderToy.mGLContext = ctx;
                gShaderToy.startRendering();
            }, 50);
        } catch (ignore) {}

        window.localStorage.setItem(LOCALSTORAGE_SHADER_FORK_KEYNAME, '');

        gShaderToy.mInfo.username = 'None';
        gShaderToy.mInfo.id = '-1';
        gShaderToy.mNeedsSave = true;
        document.getElementById('published').value = "0";
    };

    /**
     * Adds "Fork" button.
     */
    ShaderDuplicator.prototype.addButton = function() {
        this.button = document.createElement('div');

        this.button.textContent = 'Fork';
        this.button.classList.add('formButton');
        this.button.classList.add('formButton-extension');
        this.button.classList.add('fork-shader-btn');
        shaderToyElements.shaderInfo.appendChild(this.button);
    };

    /**
     * Binds "Fork" button event.
     */
    ShaderDuplicator.prototype.bindButtonEvents = function() {
        var self = this;

        this.button.addEventListener('click', self.onButtonClick.bind(self));
    };

    ShaderDuplicator.prototype.createBanner = function(shaderInfo) {
        banner = '// Fork of ' +
            '"' + shaderInfo.name + '" by ' + shaderInfo.username +
            '. https://shadertoy.com/view/' + shaderInfo.id +
            '\n// ' + new Date().toISOString().replace('T',' ').replace(/(\..*)/g, '') + '\n\n';

        return banner;
    }

    /**
     * Handles button's "click" event.
     * Stores shader in localStorage and redirect to "new shader" page.
     */
    ShaderDuplicator.prototype.onButtonClick = function() {
        var shaderData = gShaderToy.exportToJSON(),
            banner = this.createBanner(shaderData.info);

        shaderData.renderpass.forEach(function (pass) {
            if (pass.name === 'Image') {
                pass.code = banner + pass.code;
            }
        })

        window.localStorage.setItem(
            LOCALSTORAGE_SHADER_FORK_KEYNAME,
            JSON.stringify(shaderData)
        );

        gShaderToy.mNeedsSave = false;
        window.location.href = 'https://www.shadertoy.com/new';
    };

    /**
     * Mouse uniform sliders constructor.
     */
    MouseUniforms = function() {
        this.config = [
            { gS: 'PosX', vPart: 'x', size: 'width'},
            { gS: 'PosY', vPart: 'y', size: 'height'},
            { gS: 'OriX', vPart: 'z', size: 'width'},
            { gS: 'OriY', vPart: 'w', size: 'height'}
        ];
        this.addSliders();
        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
    };

    /**
     * Adds sliders to page.
     */
    MouseUniforms.prototype.addSliders = function() {
        this.slidersWrapper = document.createElement('div');
        this.slidersWrapper.classList.add('mouse-uniforms');

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
            this.slidersWrapper.appendChild(slider);
            this.slidersWrapper.appendChild(valueElement);

            slider.addEventListener('input', this.onSliderChange.bind(this));
            slider.addEventListener('blur', this.onSliderBlur);
            return slider;
        }, this);

        extensionElements.controlsContainer.appendChild(
            this.slidersWrapper
        );
    };

    /**
     * Resets mouse left button status.
     */
    MouseUniforms.prototype.onSliderBlur = function() {
        gShaderToy.mMouseIsDown = false;
    };

    /**
     * Updates shaderToy mouse uniforms.
     * Waits 20ms to reset mouse button status.
     */
    MouseUniforms.prototype.onSliderChange = function(e) {
        var slider = e.target,
            axis = slider.getAttribute('data-axis'),
            vPart = slider.getAttribute('data-vPart'),
            value = slider.value;

        slider.nextSibling.textContent = vPart + ': ' + value;

        gShaderToy['mMouse' + axis] = value;
        gShaderToy.mForceFrame = true;
        setTimeout(this.onSliderBlur, 20);
    };

    /**
     * Updates sliders range on window resize.
     */
    MouseUniforms.prototype.onResize = function() {
        var sizes = document.getElementById('demogl').getBoundingClientRect();

        this.sliders.forEach(function(slider) {
            slider.max = sizes[slider.getAttribute('data-size')];
            this.onSliderChange({target: slider});
        }, this);
    };

    /**
     * Class to wrap http/https url into HTML <a> tags.
     */
    AnchorsMaker = function() {
        this.NOT_ANCHOR_URL_REGEXP = /((http?|https?):\/\/[^"<\s]+)(?![^<>]*>|[^"]*?<\/a)/g;
        this.init();
    };

    /**
     * Initializes instance.
     * Runs replacing for shaderToy elements.
     */
    AnchorsMaker.prototype.init = function() {
        try {
            this.makeCommentsLinks();
            this.makeDescriptionLinks();
        } catch (ignore) {}
    };

    /**
     * Wraps all http/https urls in element content into HTML <a> tags.
     *
     * @param {element} Element to replace urls in.
     */
    AnchorsMaker.prototype._makeLink = function(element) {
        element.innerHTML = element.innerHTML.replace(
            this.NOT_ANCHOR_URL_REGEXP,
            '<a target="_blank" class="regular" href="$1">$1</a>'
        );
    };

    /**
     * Waits to description load.
     * Replaces urls if loaded.
     */
    AnchorsMaker.prototype.makeDescriptionLinks = function() {
        var SELECTOR = '#shaderDescription';
            descriptionElement = document.querySelector(SELECTOR);

        if (descriptionElement.tagName == 'TEXTAREA') {
            return;
        }

        if (descriptionElement.innerHTML) {
            this._makeLink(descriptionElement);
        } else {
            setTimeout(this.makeDescriptionLinks.bind(this), 200, this);
        }
    };

    /**
     * Waits for comments load.
     * Replaces urls if loaded.
     */
    AnchorsMaker.prototype.makeCommentsLinks = function() {
        var SELECTOR = '#myComments .commentContent',
            commentsContents = document.querySelectorAll(SELECTOR);

        if (commentsContents.length) {
            Array.prototype.slice.apply(
                commentsContents
            ).forEach(function(commentContentElement) {
                this._makeLink(commentContentElement);
            }.bind(this));
        } else {
            setTimeout(this.makeCommentsLinks.bind(this), 200, this);
        }
    };

    window.ToyPlug = window.ToyPlug || new ToyPlug();

})(document, window);
