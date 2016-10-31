/* global window, document */
(function shadertoyPluginProfilePage() {

    'use strict';

    var SHADER_PREVIEW_LOCATION = '/media/shaders/',

        SHADER_PREVIEW_EXTENSION = '.jpg',

        SHADER_LOCATION = '/view/',

        TILE_TEMPLATE = '<a href="{shaderUrl}" class="shader-tile">' +
            '<img class="shader-image" src="{previewUrl}"/>' +
            '<span class="shader-name">{shaderTitle}</span></a>',

        TILES_CONTAINER = '<ul>' +
            '<li class="status"><ul class="draft"></ul></li>' +
            '<li class="status"><ul class="private"></ul></li>' +
            '<li class="status"><ul class="public"></ul></li>' +
            '<li class="status"><ul class="publicapi"></ul></li>' +
            '</ul>',

        contentWrapper = null,

        /**
         * Stores Helpers instance.
         *
         * @type {Helpers}
         */
        helpers = null;

    function getShaderUrlById(id) {
        return SHADER_LOCATION + id;
    }

    function getPreviewUrlById(id) {
        return SHADER_PREVIEW_LOCATION + id + SHADER_PREVIEW_EXTENSION;
    }

    function createPreviewImageElementById(id) {
        var img = new Image();

        img.src = getPreviewUrlById(id);
        return img;
    }

    function SortableShaderList() {
        this.rebuildList();
    }

    /**
     * Adds shaders list sorting on profile page.
     * Adds preview image overlay.
     * Loads preview images of all shaders.
     */
    SortableShaderList.prototype.rebuildList = function shadersList() {
        var tp = this,
            i = 1;

        this.shadersListContainer = document.getElementById('divShaders');
        this.shadersTable = this.shadersListContainer.querySelector('table');
        this.shadersListRows = helpers.collectionToArray(
            this.shadersListContainer.querySelectorAll('tr')
        );
        this.shadersListHeadRow = this.shadersListRows[0];

        // Add small preview images to shaders list.
        this.shadersListRows.forEach(function(row, i) {
            if (!i) return;

            var link = row.querySelector('a'),
                id = link.getAttribute('href').substr(6),
                smallImg = createPreviewImageElementById(id),
                bigImg = createPreviewImageElementById(id);

            smallImg.classList.add('small');
            bigImg.classList.add('bigPreview');

            link.insertBefore(smallImg, link.firstChild);
            link.insertBefore(bigImg, link.firstChild);
        });

        helpers.collectionToArray(
            this.shadersListHeadRow.querySelectorAll('td')
        ).forEach(tp.bindColumnClick.bind(tp));
    };

    /**
     * Binds sorting on click event for provided element if element's index
     * exists in defined list.
     */
    SortableShaderList.prototype.bindColumnClick =
        function bindSort(elem, index) {
            var tp = this,

                // sortable columns indexes.
                sortableColumns = [2, 3, 4];

            if (~sortableColumns.indexOf(index)) {
                elem.addEventListener('click', function() {
                    tp.onColumnHeaderClick(index);
                });
            }
        };

    /**
     * Sorts shaders list.
     *
     * @param {number} index Column index.
     */
    SortableShaderList.prototype.onColumnHeaderClick =
        function sortByColumn(index) {
            var tempArray = [];

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
    SortableShaderList.prototype.updateShadersList =
        function updateShadersList(contents) {
            var tp = this,
                oldRows = helpers.collectionToArray(
                    tp.shadersTable.querySelectorAll('tr')
                ),
                tbody = tp.shadersTable.querySelector('tbody');

            // remove old rows except first one (header).
            oldRows.shift();
            oldRows.forEach(function (elem) {
                elem.remove();
            });

            contents.forEach(function (elem) {
                tbody.appendChild(elem);
            });
        };

    function TilesView() {
        this.init();
    }

    TilesView.prototype.init = function tilesViewInit () {
        document.body.classList.add('alternate-profile');

        this.tilesWrapper = document.createElement('div');
        this.tilesWrapper.classList.add('tiles-wrapper');

        this.tilesWrapper.innerHTML = TILES_CONTAINER;

        contentWrapper = document.getElementById('contentScroll');
        document.body.insertBefore(this.tilesWrapper,
            contentWrapper);

        this.userShaders = this.getShaders();
    };

    TilesView.prototype.getShaders = function() {
        return helpers.collectionToArray(
            document.querySelectorAll('#divShaders tr + tr'))
                .map(function(tr) {
                    var linkElement = tr.querySelector('a'),
                        link = linkElement.getAttribute('href');

                    return new ShaderTile({
                        id: link.replace('/view/', ''),
                        link: link,
                        title: linkElement.textContent,
                        status: tr.lastElementChild.previousElementSibling
                            .textContent.replace(/(\s+|\+)/g, '').toLowerCase()
                    }, this);
                }, this);
    };

    function ShaderTile(shader, tilesView) {
        this.shader = shader;
        this.tilesView = tilesView;
        this.createHTML();
    }

    ShaderTile.prototype.createHTML = function() {
        var li = document.createElement('li');

        li.classList.add('shader');
        li.innerHTML = TILE_TEMPLATE
            .replace(
                '{previewUrl}', getPreviewUrlById(this.shader.id)
            )
            .replace(
                '{shaderUrl}', getShaderUrlById(this.shader.id)
            ).
            replace(
                '{shaderTitle}', this.shader.title
            );
            this.tilesView.tilesWrapper.querySelector('.' + this.shader.status)
                .appendChild(li);
    };

    /**
     * Provides additional functionality to ShaderToy's profile page view.
     *
     * @contructor
     */
    function ToyPlugProfilePage() {
        helpers = new Helpers({});
        this.sortableShaderList = new SortableShaderList();
        if (window.alternateProfile) this.tilesView = new TilesView();
    }

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

    return new ToyPlugProfilePage();
}());
