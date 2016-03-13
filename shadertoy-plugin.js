(function(d, w, M) {

    var
        /**
         * Body class name for fullscreen edit.
         *
         * @type {string}
         */
        FULLSCREEN_MODE_CLASS = 'fullscreen-edit',



        /**
         * Stores ToyPlug instance.
         *
         * @type {ToyPlug}
         */
        tp,

        tpEdit,

        tpProfile;

    /**
     * ToyPlug. Plugin.
     *
     * @contructor
     */
    function ToyPlug() {
        this.init();
    }

    ToyPlug.prototype.isEditPage = function isEditPage() {
        return document.location.href.match('shadertoy.com/view');
    };

    ToyPlug.prototype.isProfilePage = function isProfilePage() {
        return document.location.href.match('shadertoy.com/profile');
    };

    /**
     * Inits ToyPlug functionality.
     */
    ToyPlug.prototype.init = function init() {
        if (this.isEditPage()) {
            this.editPage = new ToyPlugEditPage();
        }

        if (this.isProfilePage()) {
            this.profilePage = new ToyPlugProfilePage();
        }

        console.log(this.isEditPage, this.isProfilePage);
    };

    function ToyPlugEditPage() {
        this.init();
    }

    ToyPlugEditPage.prototype.init = function init() {

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
        currentDivider = divider;
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
        this.decraseRes(currentDivider);
    };

    function ToyPlugProfilePage() {
        this.init();
    }

    ToyPlugProfilePage.prototype.init = function init() {
        this.shadersList();
    };

    /**
     * Manages shaders list.
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
    function Helpers() {}

    /**
     * Converts HTML collection to array.
     *
     * @param {HTMLCollection} collection
     * @returns {HTMLElement[]}
     */
    Helpers.prototype.collectionToArray = function(collection) {
        return Array.prototype.slice.apply(collection);
    };

    helpers = new Helpers();
    tp = new ToyPlug();

})(document, window);
