/* global gShaderToy, window, document, Effect */

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
            'https://github.com/patuwwy/ShaderToy-Chrome-Plugin\n';

    /**
     * ToyPlug.
     *
     * @contructor
     */
    class ToyPlug {
        state = {};
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
            this.state = JSON.parse(window.localStorage.getItem(STATE_STORAGE_KEY) || "{}");

            if (!this.state) {
                window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({}));
                this.state = {};
            }

            console.log(this.state)
            this.common = new ToyPlugCommon();

            if (this.isEditPage()) {
                this.editPage = new ToyPlugEditPage();
            }

            this.setListener();

            if (this.state && this.state.renderMode) {
                this.setRenderMode(this.state.renderMode);
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
            this.createRecordButton();

            this.anchorsMaker = new AnchorsMaker();
            this.performanceIndicators = new RenderMeters();

            window.addEventListener("resize", () => {
                this.multiplyRes(this.currentDivider);
            })
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
         * @param {number} multiplier
         */
        multiplyRes(multiplier) {
            var b = this.c.getBoundingClientRect(),
                n = {
                    w: Math.floor(b.width * multiplier * window.devicePixelRatio),
                    h: Math.floor(b.height * multiplier * window.devicePixelRatio)
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
            this.currentDivider = multiplier;
        }

        /**
         * Changes time position.
         *
         * @param {number} timeshift. Time change value in ms.
         */
        changeTimePosition(timeShift) {
            var destTime = Math.max(0, gShaderToy.mTf + timeShift);

            updateShaderToyTime(destTime);
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
            var self = this,
                commentHistory = {
                    undoStack: [],
                    redoStack: [],
                    lastSnapshot: null,
                    isApplying: false
                };

            function isCommentTextArea(target) {
                return target && target.id === 'commentTextArea';
            }

            function getSnapshot(target) {
                return {
                    value: target.value,
                    start: target.selectionStart,
                    end: target.selectionEnd
                };
            }

            function applySnapshot(target, snapshot) {
                target.value = snapshot.value;
                if (typeof snapshot.start === 'number' && typeof snapshot.end === 'number') {
                    target.selectionStart = snapshot.start;
                    target.selectionEnd = snapshot.end;
                }
            }

            function pushSnapshot(stack, snapshot) {
                stack.push(snapshot);
                if (stack.length > 200) {
                    stack.shift();
                }
            }

            document.addEventListener('focusin', function(e) {
                if (isCommentTextArea(e.target)) {
                    commentHistory.lastSnapshot = getSnapshot(e.target);
                }
            }, true);

            document.addEventListener('input', function(e) {
                if (!isCommentTextArea(e.target)) {
                    return;
                }

                var currentSnapshot = getSnapshot(e.target);

                if (commentHistory.isApplying) {
                    commentHistory.lastSnapshot = currentSnapshot;
                    return;
                }

                if (!commentHistory.lastSnapshot) {
                    commentHistory.lastSnapshot = currentSnapshot;
                    return;
                }

                if (commentHistory.lastSnapshot.value !== currentSnapshot.value) {
                    pushSnapshot(commentHistory.undoStack, commentHistory.lastSnapshot);
                    commentHistory.redoStack = [];
                }

                commentHistory.lastSnapshot = currentSnapshot;
            }, true);

            document.addEventListener('keydown', function(e) {
                var target = e.target,
                    key = (e.key || '').toLowerCase(),
                    code = e.code || '',
                    activeElement = document.activeElement,
                    isCmdOrCtrl = e.ctrlKey || e.metaKey,
                    isUndoShortcut = isCmdOrCtrl && !e.altKey && !e.shiftKey && (key === 'z' || code === 'KeyZ'),
                    isRedoShortcut = isCmdOrCtrl && !e.altKey && (
                        key === 'y' || code === 'KeyY' ||
                        (e.shiftKey && (key === 'z' || code === 'KeyZ'))
                    ),
                    isCodeEditorTarget =
                        (target && target.closest && target.closest('#editor .CodeMirror')) ||
                        (activeElement && activeElement.closest && activeElement.closest('#editor .CodeMirror')) ||
                        (gShaderToy.mCodeEditor && typeof gShaderToy.mCodeEditor.hasFocus === 'function' && gShaderToy.mCodeEditor.hasFocus());

                if ((isUndoShortcut || isRedoShortcut) && isCommentTextArea(target)) {
                    var fromStack = isUndoShortcut ? commentHistory.undoStack : commentHistory.redoStack,
                        toStack = isUndoShortcut ? commentHistory.redoStack : commentHistory.undoStack,
                        nextSnapshot = fromStack.pop();

                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    if (nextSnapshot) {
                        pushSnapshot(toStack, getSnapshot(target));
                        commentHistory.isApplying = true;
                        applySnapshot(target, nextSnapshot);
                        commentHistory.isApplying = false;
                        commentHistory.lastSnapshot = getSnapshot(target);
                    }

                    return;
                }

                // Keep undo/redo scoped to the shader code editor and prevent
                // browser-level history from jumping into other text fields.
                if ((isUndoShortcut || isRedoShortcut) && isCodeEditorTarget && gShaderToy.mCodeEditor) {
                    e.preventDefault();
                    e.stopPropagation();
                    gShaderToy.mCodeEditor.execCommand(isUndoShortcut ? 'undo' : 'redo');
                    gShaderToy.mCodeEditor.focus();
                    return;
                }

                var which = e.which,
                    code = e.code;
                if (e.target.id === self.MAIN_SHADERTOY_DEMO_ID) {
                    console.log(e);
                    // Alt (or Cmd) + ...
                    if (e.altKey || e.metaKey) {
                        // 1...9 Keys
                        if (which === Math.max(49, Math.min(57, which))) {
                            if (!e.shiftKey) {
                                self.multiplyRes(1 / (which - 48))
                            } else {
                                self.multiplyRes(which - 48);
                            }
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
                    if (e.ctrlKey && e.shiftKey && (e.which === 83 || code === 'KeyS' || key === 's')) {
                        self.takeScreenShot();
                    }

                    // alt + shift + r or ctrl + shift + r
                    var isRecordShortcut = (e.altKey && e.shiftKey && (code === 'KeyR' || key === 'r' || e.which === 82)) ||
                        (e.ctrlKey && e.shiftKey && (code === 'KeyR' || key === 'r' || e.which === 82));
                    if (isRecordShortcut) {
                        e.preventDefault();
                        self.switchRecording();
                    }
                } else if (self.isRecording && ((e.altKey && e.shiftKey && (code === 'KeyR' || key === 'r' || e.which === 82)) ||
                    (e.ctrlKey && e.shiftKey && (code === 'KeyR' || key === 'r' || e.which === 82)))) {
                    e.preventDefault();
                    self.switchRecording();
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
            this.multiplyRes(this.currentDivider);
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

            this.multiplyRes(currentDivider * 0.25);

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
                        titleElem = document.getElementById('shaderTitle'),
                        title = (titleElem && titleElem.value ? titleElem.value.trim() : '') ||
                            (gShaderToy.mInfo && (gShaderToy.mInfo.name || gShaderToy.mInfo.id)) ||
                            'shadertoy',
                        safeTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_'),
                        filename =
                            safeTitle +
                            '_' +
                            new Date().toJSON().slice(0, 10) +
                            '_' +
                            new Date().toTimeString().split(' ')[0].replace(/:/g, '-') +
                            '.png';

                    if (imageData) {
                        link.setAttribute('href', imageData);
                        link.setAttribute('download', filename);
                        link.dispatchEvent(clickEvent);
                    }
                    this.decreaseRes(currentDivider);

                    if (!paused) {
                        gShaderToy.pauseTime();
                    }
                }.bind(this),
                1000
            );
        }

        startRecording() {
            if (this.isRecording) {
                return;
            }

            var canvas = (window.gShaderToy && window.gShaderToy.mEffect && window.gShaderToy.mEffect.mCanvas) ||
                (window.gShaderToy && window.gShaderToy.mEffect && window.gShaderToy.mEffect.mGLContext && window.gShaderToy.mEffect.mGLContext.canvas) ||
                document.getElementById(this.MAIN_SHADERTOY_DEMO_ID) ||
                this.c;

            if (!canvas) {
                console.error('[ShaderToy Plugin] Canvas element not found.');
                window.alert('Cannot record: ShaderToy canvas element not found.');
                return;
            }

            var targetFps = parseInt(this.fpsSelect ? this.fpsSelect.value : 60, 10) || 60;
            var width = canvas.width - (canvas.width % 2);
            var height = canvas.height - (canvas.height % 2);

            if (this.recordButton) {
                this.recordButton.classList.add('recording-active');
                if (this.recordButtonLabel) {
                    this.recordButtonLabel.textContent = 'STOP';
                }
            }
            if (this.fpsSelect) {
                this.fpsSelect.disabled = true;
            }

            this.isRecording = true;
            this.recordedFrameCount = 0;
            this.targetFps = targetFps;

            this.showRecordingIndicator(targetFps);

            // Preferred mode: WebCodecs + WebMMuxer for deterministic frame-accurate recording
            var WebMMuxerClass = window.WebMMuxer || (typeof window !== 'undefined' ? window.WebMMuxer : null);
            if (typeof window.VideoEncoder !== 'undefined' && WebMMuxerClass) {
                this.startDeterministicRecording(canvas, width, height, targetFps);
            } else if (typeof window.VideoEncoder === 'undefined') {
                console.warn('[ShaderToy Plugin] VideoEncoder (WebCodecs) not supported, using MediaRecorder fallback.');
                this.startMediaRecorderFallback(canvas, targetFps);
            } else {
                console.error('[ShaderToy Plugin] WebMMuxer not found on window. Ensure webm-muxer.js is loaded.');
                window.alert('WebMMuxer library is still loading or not found. Please refresh the page and try again.');
                this.stopRecording();
            }
        }

        startDeterministicRecording(canvas, width, height, targetFps) {
            try {
                var WebMMuxerClass = window.WebMMuxer || (typeof window !== 'undefined' ? window.WebMMuxer : null);
                if (!WebMMuxerClass) {
                    throw new Error('WebMMuxer not available on window');
                }

                console.info('[ShaderToy Plugin] Initializing deterministic recording:', {
                    width: width,
                    height: height,
                    targetFps: targetFps
                });

                var muxer = new WebMMuxerClass.Muxer({
                    target: new WebMMuxerClass.ArrayBufferTarget(),
                    video: {
                        codec: 'V_VP9',
                        width: width,
                        height: height,
                        frameRate: targetFps
                    }
                });

                var bitrate = Math.min(60000000, Math.max(8000000, Math.round(width * height * targetFps * 0.15)));
                var encoder = new window.VideoEncoder({
                    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                    error: (e) => console.error('[ShaderToy Plugin] VideoEncoder error:', e)
                });

                try {
                    encoder.configure({
                        codec: 'vp09.00.10.08',
                        width: width,
                        height: height,
                        bitrate: bitrate,
                        framerate: targetFps
                    });
                } catch (vp9Err) {
                    console.warn('[ShaderToy Plugin] VP9 configuration failed, trying vp8:', vp9Err);
                    encoder.configure({
                        codec: 'vp8',
                        width: width,
                        height: height,
                        bitrate: bitrate,
                        framerate: targetFps
                    });
                }

                this.videoEncoder = encoder;
                this.webmMuxer = muxer;
                this.recordingCanvas = canvas;
                this.isDeterministic = true;
                this.recordedFrameCount = 0;

                this.wasPaused = (window.gShaderToy && window.gShaderToy.mIsPaused);
                if (window.gShaderToy && !window.gShaderToy.mIsPaused) {
                    window.gShaderToy.pauseTime();
                }

                var startTimeMs = (window.gShaderToy && typeof window.gShaderToy.mTf === 'number')
                    ? window.gShaderToy.mTf
                    : ((window.gShaderToy && typeof window.gShaderToy.mTOffset === 'number') ? window.gShaderToy.mTOffset : 0),
                    dtMs = 1000 / targetFps,
                    dtSec = 1.0 / targetFps,
                    frameIndex = 0,
                    virtualTimeMs = startTimeMs,
                    self = this;

                // Override getRealTime so any internal Shadertoy timing uses our virtual deterministic time
                var origGetRealTime = window.getRealTime;
                this.origGetRealTime = origGetRealTime;
                window.getRealTime = function() {
                    return virtualTimeMs;
                };

                var stepFrame = () => {
                    if (!self.isRecording) {
                        return;
                    }

                    var frameTimeMs = startTimeMs + (frameIndex * dtMs);
                    virtualTimeMs = frameTimeMs;

                    if (window.gShaderToy) {
                        var currentFrameNumber = Math.round(frameTimeMs / 1000 * targetFps);
                        window.gShaderToy.mTOffset = frameTimeMs;
                        window.gShaderToy.mTo = frameTimeMs - dtMs;
                        window.gShaderToy.mTf = frameTimeMs;
                        window.gShaderToy.mFpsFrame = currentFrameNumber;
                        window.gShaderToy.mRestarted = false;
                        window.gShaderToy.mForceFrame = true;

                        if (window.gShaderToy.mEffect) {
                            window.gShaderToy.mEffect.mFrame = currentFrameNumber;
                            if (window.gShaderToy.mEffect.mPasses) {
                                for (var p = 0; p < window.gShaderToy.mEffect.mPasses.length; p++) {
                                    window.gShaderToy.mEffect.mPasses[p].mFrame = currentFrameNumber;
                                }
                            }
                        }

                        // Explicitly render this frame to canvas
                        var rendered = false;
                        if (typeof window.gShaderToy.Render === 'function') {
                            try {
                                window.gShaderToy.Render(true);
                                rendered = true;
                            } catch (e) {
                                console.warn('[ShaderToy Plugin] gShaderToy.Render error:', e);
                            }
                        }

                        if (!rendered && window.gShaderToy.mEffect && typeof window.gShaderToy.mEffect.Paint === 'function') {
                            try {
                                window.gShaderToy.mEffect.Paint(frameTimeMs / 1000, dtSec, targetFps, 0, 0, 0, 0, false);
                                rendered = true;
                            } catch (e2) {
                                console.warn('[ShaderToy Plugin] mEffect.Paint error:', e2);
                            }
                        }
                    }

                    // Update Shadertoy native time display and plugin slider while paused for recording
                    var myTimeEl = document.getElementById('myTime');
                    if (myTimeEl) {
                        myTimeEl.textContent = (frameTimeMs / 1000).toFixed(2);
                    }
                    if (self.timebar && self.timebar.sliderInput) {
                        self.timebar.sliderInput.value = frameTimeMs;
                    }

                    // Flush GPU draw queue so the WebGL canvas has finished all pixels
                    var gl = (window.gShaderToy && window.gShaderToy.mEffect && window.gShaderToy.mEffect.mGLContext) ||
                        (canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
                    if (gl && typeof gl.finish === 'function') {
                        gl.finish();
                    }

                    try {
                        var timestampUs = Math.round(frameIndex * (1000000 / targetFps)),
                            isKey = (frameIndex % (targetFps * 2) === 0),
                            recCanvas = self.recordingCanvas || (window.gShaderToy && window.gShaderToy.mCanvas) || canvas,
                            frameOpts = { timestamp: timestampUs };

                        if (recCanvas.width !== width || recCanvas.height !== height) {
                            frameOpts.visibleRect = { x: 0, y: 0, width: width, height: height };
                        }

                        var videoFrame = new window.VideoFrame(recCanvas, frameOpts);

                        encoder.encode(videoFrame, { keyFrame: isKey });
                        videoFrame.close();

                        frameIndex++;
                        self.recordedFrameCount = frameIndex;

                        var virtualSec = (frameIndex / targetFps).toFixed(2);
                        self.updateRecordingHUD(frameIndex, targetFps, virtualSec);

                        if (frameIndex % 30 === 0 || frameIndex === 1) {
                            console.log('[ShaderToy Plugin] Recorded frame ' + frameIndex + ' (' + virtualSec + 's)');
                        }

                        var scheduleNext = () => {
                            if (!self.isRecording) {
                                return;
                            }
                            if (encoder.encodeQueueSize > 8) {
                                window.setTimeout(scheduleNext, 10);
                            } else {
                                // Yield via requestAnimationFrame so browser paints frame on screen
                                window.requestAnimationFrame(stepFrame);
                            }
                        };

                        scheduleNext();
                    } catch (encodeErr) {
                        console.error('[ShaderToy Plugin] Frame encode error:', encodeErr);
                        self.stopRecording();
                    }
                };

                // Kick off the deterministic frame-by-frame loop
                stepFrame();
            } catch (err) {
                console.error('[ShaderToy Plugin] Deterministic recording failed to init:', err);
                window.alert('Deterministic recording initialization failed: ' + err.message);
                this.stopRecording();
            }
        }

        startMediaRecorderFallback(canvas, targetFps) {
            var captureStream = canvas.captureStream || canvas.mozCaptureStream;
            if (typeof captureStream !== 'function' || typeof window.MediaRecorder === 'undefined') {
                console.error('[ShaderToy Plugin] MediaRecorder not supported.');
                window.alert('Video recording is not supported in this browser.');
                this.isRecording = false;
                return;
            }

            var stream = null;
            try {
                stream = captureStream.call(canvas, targetFps);
            } catch (e) {
                stream = captureStream.call(canvas);
            }

            if (!stream) {
                this.isRecording = false;
                return;
            }

            if (window.gShaderToy && window.gShaderToy.mIsPaused) {
                window.gShaderToy.pauseTime();
            }

            var mimeType = '',
                candidateTypes = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4;codecs=avc1',
                    'video/mp4'
                ];

            if (typeof window.MediaRecorder.isTypeSupported === 'function') {
                for (var i = 0; i < candidateTypes.length; i++) {
                    if (window.MediaRecorder.isTypeSupported(candidateTypes[i])) {
                        mimeType = candidateTypes[i];
                        break;
                    }
                }
            }

            var recorderOptions = mimeType ? { mimeType: mimeType } : {},
                mediaRecorder = null;

            try {
                mediaRecorder = new window.MediaRecorder(stream, recorderOptions);
            } catch (recErr) {
                mediaRecorder = new window.MediaRecorder(stream);
            }

            this.mediaRecorder = mediaRecorder;
            this.recordedChunks = [];
            this.isDeterministic = false;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (!this.recordedChunks || this.recordedChunks.length === 0) {
                    return;
                }
                var actualMime = mediaRecorder.mimeType || mimeType || 'video/webm',
                    ext = actualMime.indexOf('mp4') !== -1 ? '.mp4' : '.webm',
                    blob = new window.Blob(this.recordedChunks, { type: actualMime });
                this.recordedChunks = [];
                this.downloadRecordingBlob(blob, ext, targetFps);
            };

            mediaRecorder.start(250);
        }

        stopRecording() {
            if (!this.isRecording) {
                return;
            }

            this.isRecording = false;

            if (this.origGetRealTime) {
                window.getRealTime = this.origGetRealTime;
                this.origGetRealTime = null;
            }

            if (this.wasPaused === false && window.gShaderToy && window.gShaderToy.mIsPaused) {
                window.gShaderToy.pauseTime();
            }

            if (this.recordButton) {
                this.recordButton.classList.remove('recording-active');
                if (this.recordButtonLabel) {
                    this.recordButtonLabel.textContent = 'REC';
                }
            }
            if (this.fpsSelect) {
                this.fpsSelect.disabled = false;
            }
            this.removeRecordingIndicator();

            if (this.isDeterministic && this.videoEncoder && this.webmMuxer) {
                var encoder = this.videoEncoder,
                    muxer = this.webmMuxer,
                    targetFps = this.targetFps || 60;

                this.videoEncoder = null;
                this.webmMuxer = null;

                (async () => {
                    try {
                        await encoder.flush();
                        encoder.close();
                        muxer.finalize();

                        var buffer = muxer.target.buffer,
                            blob = new window.Blob([buffer], { type: 'video/webm' });

                        this.downloadRecordingBlob(blob, '.webm', targetFps);
                    } catch (finalizeErr) {
                        console.error('[ShaderToy Plugin] Error finalizing video:', finalizeErr);
                    }
                })();
            } else if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                try {
                    if (typeof this.mediaRecorder.requestData === 'function') {
                        this.mediaRecorder.requestData();
                    }
                } catch (ignore) {}
                try {
                    this.mediaRecorder.stop();
                } catch (e) {
                    console.error('[ShaderToy Plugin] MediaRecorder.stop failed:', e);
                }
            }
        }

        downloadRecordingBlob(blob, ext, fps) {
            var titleElem = document.getElementById('shaderTitle'),
                title = (titleElem && titleElem.value ? titleElem.value.trim() : '') ||
                    (window.gShaderToy && window.gShaderToy.mInfo && (window.gShaderToy.mInfo.name || window.gShaderToy.mInfo.id)) ||
                    'shadertoy',
                safeTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_'),
                now = new Date(),
                timestamp = now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0') + '_' +
                    String(now.getHours()).padStart(2, '0') + '-' +
                    String(now.getMinutes()).padStart(2, '0') + '-' +
                    String(now.getSeconds()).padStart(2, '0'),
                filename = safeTitle + '_' + timestamp + '_' + fps + 'fps' + ext;

            var link = document.createElement('a'),
                url = window.URL.createObjectURL(blob);

            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            window.setTimeout(() => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
                window.URL.revokeObjectURL(url);
            }, 30000);
        }

        switchRecording() {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        }

        createRecordButton() {
            var group = document.createElement('div'),
                recordBtn = document.createElement('div'),
                dot = document.createElement('span'),
                label = document.createElement('span'),
                fpsSelect = document.createElement('select');

            group.className = 'ste-record-control-group';

            recordBtn.className = 'formButton formButton-extension ste-record-btn';
            recordBtn.title = 'Record shader video (ALT + SHIFT + R)';

            dot.className = 'ste-record-btn-dot';
            label.className = 'ste-record-btn-label';
            label.textContent = 'REC';

            recordBtn.appendChild(dot);
            recordBtn.appendChild(label);

            fpsSelect.className =
                'formButton formButton-extension ste-record-fps-select';
            fpsSelect.title = 'Target video recording FPS';

            [50, 60, 120, 144, 240].forEach((fps) => {
                var opt = document.createElement('option');
                opt.value = fps;
                opt.textContent = fps + ' fps';
                if (fps === 60) {
                    opt.selected = true;
                }
                fpsSelect.appendChild(opt);
            });

            group.appendChild(recordBtn);
            group.appendChild(fpsSelect);

            if (extensionElements.controlsContainerFooter) {
                extensionElements.controlsContainerFooter.appendChild(group);
            }

            recordBtn.addEventListener('click', () => {
                this.switchRecording();
            });

            this.recordButton = recordBtn;
            this.recordButtonLabel = label;
            this.fpsSelect = fpsSelect;
        }

        showRecordingIndicator(fps) {
            this.removeRecordingIndicator();

            var container = document.getElementById('player') || document.body,
                badge = document.createElement('div'),
                dot = document.createElement('span'),
                label = document.createElement('span'),
                fpsBadge = document.createElement('span'),
                timer = document.createElement('span'),
                stopBtn = document.createElement('button');

            badge.className = 'ste-recording-badge';
            badge.title = 'Recording in progress. Click to stop (or press Alt + Shift + R)';

            dot.className = 'ste-recording-dot';
            label.className = 'ste-recording-label';
            label.textContent = 'REC';

            fpsBadge.className = 'ste-recording-fps-badge';
            fpsBadge.textContent = '[' + fps + ' FPS]';

            timer.className = 'ste-recording-timer';
            timer.textContent = 'Frames: 0 (0.00s)';

            stopBtn.className = 'ste-recording-stop-btn';
            stopBtn.type = 'button';
            stopBtn.textContent = 'Stop';

            badge.appendChild(dot);
            badge.appendChild(label);
            badge.appendChild(fpsBadge);
            badge.appendChild(timer);
            badge.appendChild(stopBtn);

            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.stopRecording();
            });

            container.appendChild(badge);
            this.recordingBadge = badge;
            this.recordingHUDTimer = timer;
        }

        updateRecordingHUD(frameCount, fps, virtualSec) {
            if (this.recordingHUDTimer) {
                this.recordingHUDTimer.textContent = 'Frames: ' + frameCount + ' (' + virtualSec + 's)';
            }
        }

        removeRecordingIndicator() {
            if (this.recordingBadge && this.recordingBadge.parentNode) {
                this.recordingBadge.parentNode.removeChild(this.recordingBadge);
                this.recordingBadge = null;
            }
            this.recordingHUDTimer = null;
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
            var download = document.createElement('div');

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

        f_display_editor(s_selector, monaco) {
            this.state = this.state || {};

            var o_monaco = window.ToyPlug && window.ToyPlug.monaco;

            if (monaco && this.syncActiveDocToMonaco) {
                this.syncActiveDocToMonaco();
            } else if (monaco && o_monaco && o_monaco.syncActiveDocToMonaco) {
                o_monaco.syncActiveDocToMonaco();
            }

            if (!monaco && this.forceSyncMonacoToActiveDoc) {
                this.forceSyncMonacoToActiveDoc();
            } else if (!monaco && o_monaco && o_monaco.forceSyncMonacoToActiveDoc) {
                o_monaco.forceSyncMonacoToActiveDoc();
            }

            this.state.monaco = monaco;

            if (!monaco && gShaderToy.mCodeEditor && gShaderToy.mPass[gShaderToy.mActiveDoc]) {
                var o_active_doc = gShaderToy.mPass[gShaderToy.mActiveDoc].mDocs;

                if (gShaderToy.mCodeEditor.getDoc && gShaderToy.mCodeEditor.swapDoc && gShaderToy.mCodeEditor.getDoc() !== o_active_doc) {
                    gShaderToy.mCodeEditor.swapDoc(o_active_doc);
                }
            }

            Array.prototype.slice.apply(document.querySelectorAll('#editorManager .tab'))
                .forEach(o => o.classList.remove('selected'));

            var a_editor_tabs = document.querySelectorAll('#editorManager > .tab');
            if (!a_editor_tabs.length) {
                a_editor_tabs = document.querySelectorAll('#editorManager > div');
            }
            if (a_editor_tabs[Number(monaco)]) {
                a_editor_tabs[Number(monaco)].classList.add('selected');
            }

            var o_cm = document.querySelector('#editor .CodeMirror');
            var o_mo = document.querySelector('#editor .monaco-editor');
            if (o_cm) o_cm.style.display = 'none';
            if (o_mo) o_mo.style.display = 'none';

            var o_target = document.querySelector(s_selector);
            if (o_target) {
                o_target.style.display = 'block';
            }

            if (!monaco && gShaderToy.mCodeEditor && gShaderToy.mCodeEditor.refresh) {
                gShaderToy.mCodeEditor.refresh();
            }

            var o_monaco_editor = this.o_editor_monaco || (o_monaco && o_monaco.o_editor_monaco);
            if (monaco && o_monaco_editor && o_monaco_editor.layout) {
                o_monaco_editor.layout();
            }

            window.localStorage.setItem(
                STATE_STORAGE_KEY, JSON.stringify(
                    {
                        ...JSON.parse(window.localStorage.getItem(STATE_STORAGE_KEY) || '{}'),
                        monaco: this.state.monaco
                    }
                )
            );
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

            var addWheelStep = function(input, callback) {
                input.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    var step = e.shiftKey ? 10 : 1;
                    var delta = e.deltaY < 0 ? step : -step;
                    var cur = parseFloat(input.value) || 0;
                    var min = parseFloat(input.min) || 0;
                    var next = Math.max(min, cur + delta);
                    if (input.max) {
                        next = Math.min(parseFloat(input.max), next);
                    }
                    input.value = next;
                    callback();
                }, { passive: false });
            };
            addWheelStep(this.minValueInput, this.onChangeMinInput.bind(this));
            addWheelStep(this.maxValueInput, this.onChangeMaxInput.bind(this));
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
            this.maxValueInput.min = parseFloat(this.minValueInput.value) + 0.1;
            this.maxValueInput.value = Math.max(
                parseFloat(this.maxValueInput.value),
                parseFloat(this.minValueInput.value) + 0.1
            );
            this.sliderInput.min =
                parseFloat(this.minValueInput.value) * 1000;
        }

        onChangeMaxInput() {
            this.minValueInput.max = parseFloat(this.maxValueInput.value);
            this.minValueInput.value = Math.min(
                parseFloat(this.maxValueInput.value) - 0.1,
                parseFloat(this.minValueInput.value)
            );
            this.sliderInput.max =
                parseFloat(this.maxValueInput.value) * 1000;
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

            if (this.ToyPlug && this.ToyPlug.isRecording) {
                setTimeout(this.updateSlider.bind(this), 26);
                return;
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
            var unpause = !this.wasPaused;

            this.busy = false;
            updateShaderToyTime(this.sliderInput.value, unpause);
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
    function updateShaderToyTime(time, unpause) {
        var value = parseInt(time, 10),
            i = 0,
            shouldUnpause = typeof unpause === 'boolean' ? unpause : !gShaderToy.mIsPaused;

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

            if (shouldUnpause) {
                if (gShaderToy.mIsPaused) {
                    gShaderToy.pauseTime();
                }
            } else if (!gShaderToy.mIsPaused) {
                gShaderToy.pauseTime();
            }

            updateInputsTime(value);
        });
    }

    /**
     * Updates ShaderToy inputs and sound pass playback.
     */
    function updateInputsTime(value) {
        var timeInSeconds = value / 1000;

        gShaderToy.mEffect.mPasses.forEach(function mPass(pass) {
            if (pass.mType === 'sound') {
                if (pass.mBuffer) {
                    if (pass.mPlayNode) {
                        try {
                            pass.mPlayNode.stop();
                            pass.mPlayNode.disconnect();
                        } catch (ignore) {}
                        pass.mPlayNode = null;
                    }

                    if (!gShaderToy.mIsPaused && timeInSeconds < pass.mPlayTime) {
                        try {
                            var audioCtx = pass.mEffect.mAudioContext,
                                newSource = audioCtx.createBufferSource();

                            newSource.buffer = pass.mBuffer;
                            newSource.connect(pass.mGainNode || audioCtx.destination);
                            newSource.start(0, timeInSeconds);

                            pass.mPlayNode = newSource;
                            pass.mPlaying = true;
                        } catch (ignore) {}
                    } else {
                        pass.mPlaying = false;
                    }
                }
                return;
            }

            pass.mInputs.forEach(function mInput(input) {
                var media = null;

                if (input) {
                    media = input.audio || input.video;

                    if (media) {
                        media.controls = true;
                        media.currentTime = timeInSeconds;
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
            if (
                gShaderToy.mNeedsSave &&
                !window.confirm(
                    'This shader has unsaved changes. Forking now may cause you to lose edits in the current draft.\n\nSave first, or use "Save as new draft" instead of Fork. Continue anyway?'
                )
            ) {
                return;
            }

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

                let fastest;
                let slowest;

                if (numPasses > 1) {
                    let sortedByTime = [...passData].sort((p1, p2) => parseFloat(p1.avgRenderTime) - parseFloat(p2.avgRenderTime));
                    fastest = sortedByTime[0].avgRenderTime;
                    slowest = sortedByTime[sortedByTime.length - 1].avgRenderTime;

                    passData.sort((p1, p2) => (p1.name || '').localeCompare(p2.name || ''));
                }

                while (extensionElements.renderMetersContainer.lastChild) {
                    extensionElements.renderMetersContainer.lastChild.remove();
                }

                let frag = document.createDocumentFragment();

                passData.forEach(pass => {
                    let l = document.createElement('p');
                    l.textContent = `${pass.name}: ${pass.avgRenderTime}ms`;

                    if (numPasses > 1 && fastest !== slowest) {
                        if (pass.avgRenderTime === slowest) {
                            l.classList.add('slowest');
                        } else if (pass.avgRenderTime === fastest) {
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
