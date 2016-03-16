(function(d, w, M) {

    'strict mode';

    var
        /**
         * Stores ToyPlug instance.
         *
         * @type {ToyPlug}
         */
        tp,

        /** Stores Helpers instance.
         *
         * @type {Helpers}
         */
        helpers;

    /**
     * ToyPlug. Plugin.
     *
     * @contructor
     */
    function ToyPlug() {
        this.init();
    }

    ToyPlug.prototype.isEditPage = function isEditPage() {
        return document.location.href.match(/(.com\/view|.com\/new)/);
    };

    ToyPlug.prototype.isProfilePage = function isProfilePage() {
        return document.location.href.match('shadertoy.com/profile');
    };

    ToyPlug.prototype.toggleDarkTheme = function(status) {
        if (this.editPage) {
            this.editPage.switchEditorToDark(window.darkTheme);
        }

        this.common.switchToDarkTheme();
    };

    ToyPlug.prototype.setRenderMode = function setRenderMode(mode) {
        console.log(mode);
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

        if (this.isProfilePage()) {
            this.profilePage = new ToyPlugProfilePage();
        }
    };

    /**
     * Provides functionality for every type of shadertoy page.
     *
     * @constructor
     */
    function ToyPlugCommon() {
        this.init();
    }

    /**
     * Inits common functionality.
     */
    ToyPlugCommon.prototype.init = function init() {
        this.switchToDarkTheme();
    };

    /**
     * Swithces Shadertoy to dark theme.
     */
    ToyPlugCommon.prototype.switchToDarkTheme = function switchToDarkTheme() {
        document.body.classList.remove('dark-toy');
        if (window.darkTheme) document.body.classList.add('dark-toy');
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

        this.switchEditorToDark(window.darkTheme);
        this.bindKeys();
    };

    /**
     * Waits for CodeMirror editor to init, then changes it's theme.
     */
    ToyPlugEditPage.prototype.switchEditorToDark =
        function switchEditorToDark(isDark) {
            var ed = null,
                edClass = isDark ? 'cm-s-twilight' : 'cm-s-default';

            function waitForEd() {
                ed = document.querySelector('.CodeMirror');

                if (ed) {
                    ed.classList.remove('cm-s-default');
                    ed.classList.remove('cm-s-twilight');
                    ed.classList.add(edClass);
                } else {
                    setTimeout(function() {
                        waitForEd();
                    }, 10);
                }
            }

            waitForEd();
        };
    /**
     * Changes Shader resolution.
     * Resolution calculation is based on divider and depends of fullscreen
     * mode.
     */
    ToyPlugEditPage.prototype.decraseRes = function decraseRes(divider) {

        var n = this.c.height == w.innerHeight ? {
            w: w.innerWidth / divider,
            h: w.innerHeight / divider
        } : {
            w: this.c.clientWidth / divider,
            h: this.c.clientHeight / divider
        };

        gShaderToy.resize(n.w, n.h);
        this.currentDivider = divider;
    };


    /**
     * Attaches additional keys support.
     */
    ToyPlugEditPage.prototype.bindKeys = function bindKeys() {

        var self = this;

        d.addEventListener('keydown', function(e) {

            var which = e.which;

            if (e.target.id === self.MAIN_SHADERTOY_DEMO_ID) {

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
             * Alt (cmd) + shift + space
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
    ToyPlugEditPage.prototype.toggleFullScreenEdit = function toggleFullScreenEdit() {
        var isFS = d.body.classList.contains(this.FULLSCREEN_MODE_CLASS);

        d.body.classList[isFS ? 'remove' : 'add'](this.FULLSCREEN_MODE_CLASS);
        this.decraseRes(this.currentDivider);
    };

    ToyPlugEditPage.prototype.setRenderMode = function(mode) {
        this.c.style.imageRendering = mode;
    };

    /**
     * Provides additional functionality to ShaderToy's profile page view.
     *
     * @contructor
     */
    function ToyPlugProfilePage() {
        this.init();
    }

    /**
     * Initializes profile page functions.
     */
    ToyPlugProfilePage.prototype.init = function init() {
        this.shadersList();
    };

    /**
     * Adds sorting shaders list on profile page.
     */
    ToyPlugProfilePage.prototype.shadersList = function () {
        var tp = this;

        this.shadersListContainer = document.getElementById('divShaders');
        this.shadersTable = this.shadersListContainer.querySelector('table');
        this.shadersListRows = helpers.collectionToArray(
            this.shadersListContainer.querySelectorAll('tr')
        );
        this.shadersListHeadRow = this.shadersListRows[0];

        helpers.collectionToArray(
            this.shadersListHeadRow.querySelectorAll('td')
        ).forEach(tp.bindClickSorting.bind(tp));
    };

    /**
     * Binds click.
     */
    ToyPlugProfilePage.prototype.bindClickSorting =
        function bindSort(elem, index) {
            var tp = this,

                /* sortable columns indexes. */
                sortableColumns = [2, 3, 4];

            if (~sortableColumns.indexOf(index)) {
                elem.addEventListener('click', function() {
                    tp.sortByColumn(index);
                });
            }
        };

    /**
     * Sorts shaders list.
     *
     * @param {number} index Column index.
     */
    ToyPlugProfilePage.prototype.sortByColumn = function sortByColumn(index) {
        var tp = this,
            tempArray = [];

        this.shadersListRows = helpers.collectionToArray(
            this.shadersListContainer.querySelectorAll('tr')
        );

        tempArray = tempArray.concat(this.shadersListRows);

        tempArray.sort(function(a, b) {
            var val1 = helpers.collectionToArray(
                    a.querySelectorAll('td')
                )[index].innerText,
                val2 = helpers.collectionToArray(
                    b.querySelectorAll('td')
                )[index].innerText;

            return val2 - val1;
        });

        this.updateShadersList(tempArray);

    };

    /**
     * Updates shaders list.
     *
     * @param {HTMLElement[]} contents Array of sorted rows.
     */
    ToyPlugProfilePage.prototype.updateShadersList =
        function updateShadersList(contents) {
            var tp = this,
                oldRows = helpers.collectionToArray(
                    tp.shadersTable.querySelectorAll('tr')
                ),
                tbody = tp.shadersTable.querySelector('tbody');

            /* remove old rows except first one (header). */
            oldRows.shift();
            oldRows.forEach(function (elem) { elem.remove(); });

            contents.forEach(function (elem) {
                tbody.appendChild(elem);
            });
        };

    /**
     * Common helper function.
     */
    function Helpers(options) {
        Object.keys(options).forEach(function(item) {
            this[item] = options[item];
        });
    }

    /**
     * Converts HTML collection to array.
     *
     * @param {HTMLCollection} collection
     * @returns {HTMLElement[]}
     */
    Helpers.prototype.collectionToArray = function(collection) {
        return Array.prototype.slice.apply(collection);
    };

    Helpers.prototype.log = function(val) {
        if (this.debug) console.log('value:', val);
    };

    helpers = window.ToyPlugHelpers = new Helpers({ debug: true });
    window.ToyPlug = new ToyPlug();

})(document, window);
