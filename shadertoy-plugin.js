(function(d, w, M) {

    var
        /**
         * Body class name for fullscreen edit.
         *
         * @type {string}
         */
        FULLSCREEN_MODE_CLASS = 'fullscreen-edit',

        /**
         * Main Shadertoy canvas HTML Attribute.
         *
         * @type {string}
         */
        MAIN_SHADERTOY_DEMO_ID = 'demogl',

        /**
         * Main Shadertoy canvas (shader holder).
         *
         * @type {HTMLElement}
         */
        c = d.getElementById(MAIN_SHADERTOY_DEMO_ID),

        /**
         * Current Shadertoy demo canvas resolution divider.
         *
         * @type {number}
         */
        currentDivider = 1,

        ToyPlug,

        /**
         * Stores ToyPlug instance.
         *
         * @type {ToyPlug}
         */
        tp;

    /**
     * ToyPlug. Plugin.
     *
     * @contructor
     */
    ToyPlug = function() {
        this.init();
    };

    /**
     * Changes Shader resolution.
     * Resolution calculation is based on divider and depends of fullscreen
     * mode.
     */
    ToyPlug.prototype.decraseRes = function decraseRes(divider) {

        var n = c.height == w.innerHeight ? {
            w: w.innerWidth / divider,
            h: w.innerHeight / divider
        } : {
            w: c.clientWidth / divider,
            h: c.clientHeight / divider
        };

        gShaderToy.resize(n.w, n.h);
        currentDivider = divider;
    };

    /**
     * Attaches additional keys support.
     */
    ToyPlug.prototype.bindKeys = function bindKeys() {

        var self = this;

        d.addEventListener('keydown', function(e) {

            var which = e.which;

            if (e.target.id === MAIN_SHADERTOY_DEMO_ID) {

                /**
                 * 1...9 Keys
                 */
                if (which == Math.max(49, Math.min(57, which))) {
                    self.decraseRes(which - 48);
                }

                /**
                 * Alt (or Cmd) + arrow up and down.
                 */
                if (e.altKey || e.metaKey) {
                    if (which == 38) {
                        gShaderToy.pauseTime();
                    }
                    if (which == 40) {
                        gShaderToy.resetTime();
                    }
                }

            }

            /**
             * Alt (cmd) + shif + space
             */
            if (e.altKey || e.metaKey) {
                if (e.which == 32 && e.shiftKey) {
                    self.toggleFullScreenEdit();
                }
            }

        });
    };

    /**
     * Toggles fullscreen edit mode.
     */
    ToyPlug.prototype.toggleFullScreenEdit = function toggleFullScreenEdit() {
        var isFS = d.body.classList.contains(FULLSCREEN_MODE_CLASS);

        d.body.classList[isFS ? 'remove' : 'add'](FULLSCREEN_MODE_CLASS);
        this.decraseRes(currentDivider);
    };

    /**
     * Inits ToyPlug functionality.
     */
    ToyPlug.prototype.init = function init() {
        this.bindKeys();
    };

    tp = new ToyPlug();

})(document, window);
