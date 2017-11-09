/* global window, document */
(function shadertoyPluginProfilePage() {

    'use strict';

    /**
     * Location of shader previews.
     *
     * @const {string}
     */
    var SHADER_PREVIEW_LOCATION = '/media/shaders/',

        /**
         * Extension of shader preview.
         *
         * @const {string}
         */
        SHADER_PREVIEW_EXTENSION = '.jpg',

        /**
         * URL of shader.
         *
         * @const {string}
         */
        SHADER_LOCATION = '/view/',

        /**
         * Template for single tile on alternate profile page.
         *
         * @const {string}
         */
        TILE_TEMPLATE = '<a href="{shaderUrl}" class="shader-tile">' +
            '<img class="shader-image" src="{previewUrl}"/>' +
            '<span class="shader-name">{shaderTitle}</span></a>',

        /**
         * HTML for tiles lists.
         *
         * @const {string}
         */
        TILES_CONTAINER = '<ul>' +
            '<li class="status"><ul class="draft"></ul></li>' +
            '<li class="status"><ul class="unlisted"></ul></li>' +
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

    /**
     * Gets shader URL by id.
     *
     * @param {string} id
     * @return {string}
     */
    function getShaderUrlById(id) {
        return SHADER_LOCATION + id;
    }

    /**
     * Gets location of shader preview by id.
     *
     * @param {string} id
     * @return {string}
     */
    function getPreviewUrlById(id) {
        return SHADER_PREVIEW_LOCATION + id + SHADER_PREVIEW_EXTENSION;
    }

    /**
     * Gets shader's preview image by id.
     *
     * @param {string} id
     * @returns {Image}
     */
    function createPreviewImageElementById(id) {
        var img = new Image();

        img.src = getPreviewUrlById(id);
        return img;
    }

    /**
     * Adds shader previews to the shaders list.
     */
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
        // Images are shown on hover.
        this.shadersListRows.forEach(function(row, i) {
            if (!i) return;

            var link = row.querySelector('a'),
                id = link.getAttribute('href').substr(6),
                bigImg = createPreviewImageElementById(id);

            bigImg.classList.add('bigPreview');
            link.insertBefore(bigImg, link.firstChild);
        });
    };

    /**
     * Initializes Tiles (alternate profile page view).
     */
    function TilesView() {
        this.init();
    }

    /**
     * Initializes component.
     */
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

    /**
     * Parses all shaders from table and converts each to ShaderTile instance.
     *
     * @returns {ShaderTile[]}
     */
    TilesView.prototype.getShaders = function() {
        return helpers.collectionToArray(
            document.querySelectorAll('#divShaders tr + tr'))
                .map(function parseRow(tr) {
                    var linkElement = tr.querySelector('td + td a'),
                        link = linkElement.getAttribute('href');

                    return new ShaderTile({
                        id: link.replace('/view/', ''),
                        link: link,
                        title: linkElement.textContent,
                        status: tr.lastElementChild
                            .previousElementSibling
                            .textContent.replace(/(\s+|\+)/g, '').toLowerCase()
                    }, this);
                }, this);
    };

    /**
     * ShaderTile constructor.
     *
     * @constructor
     * @param {object} shader
     * @param {*} tilesView
     */
    function ShaderTile(shader, tilesView) {
        this.shader = shader;
        this.tilesView = tilesView;
        this.createHTML();
    }

    /**
     * Creates and adds shader tile element.
     */
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
     * Download button to download all shaders from the profile page
     */
    function ShaderDownload() {
        this.downloadCaption = 'DOWNLOAD ALL SHADERS';
        this.loadingCaption = 'LOADING ';
        this.loading = false;
        this.button = null;
        this.numShaders = 0;
        this.downloadQueue = [];
        this.downloadResults = [];
        this.createDownloadButton();
    }

    ShaderDownload.prototype.createDownloadButton =
        function createDownloadButton() {
            var me = this,
                section = document.getElementById('userData');

            me.button = document.createElement('div');
            me.button.classList.add('formButtonSmall');
            me.button.classList.add('formButton-extension');
            me.button.style.width = '200px';
            me.button.style.marginTop = '10px';
            me.button.innerHTML = me.downloadCaption;

            me.button.onclick = function onDownloadButtonClick(e) {
                var ids = 0,
                    numRequests = 0,
                    i = 0;

                if (me.loading) {
                    alert('Please wait while we are processing your request!');
                    return;
                }

                this.innerHTML = me.loadingCaption;
                ids = helpers.collectionToArray(
                    document.querySelectorAll('#divShaders tr + tr'))
                        .map(function getShaderIdFromURL(tr) {
                            var linkElement = tr.querySelector('a'),
                                link = linkElement.getAttribute('href');
                            return link.replace('/view/', '');
                        }, this);

                me.numShaders = ids.length;

                if (ids.length > 0) {
                    me.loading = true;
                    me.downloadQueue = [];
                    me.downloadResults = [];
                    numRequests = Math.ceil(ids.length / 8);

                    for (i = 0; i < numRequests; i++) {
                        me.downloadQueue.push(ids.slice(i * 8, (i + 1) * 8));
                    }

                    me.processQueue();
                } else {
                    this.innerHTML = me.downloadCaption;
                    alert('No shaders found!');
                }
            };
            section.appendChild(me.button);
        };

    ShaderDownload.prototype.processQueue = function processQueue() {
        var me = this,
            request = me.downloadQueue.shift(),
            httpReq,
            str = '';

        me.button.innerHTML = me.loadingCaption + ' ' +
            me.downloadResults.length + '/' + me.numShaders;

        try {
            httpReq = new XMLHttpRequest();
            httpReq.addEventListener('load', function onResponse(event) {
                var json = event.target.response;

                if (json === null) {
                    alert('Error loading shader');
                    return;
                }

                me.downloadResults = me.downloadResults.concat(json);

                if (me.downloadQueue.length > 0) {
                    me.processQueue();
                } else {
                    me.loading = false;
                    me.button.innerHTML = me.downloadCaption;
                    window.ToyPlug.common.downloadJson(me.downloadResults[0].info.username + '.json', JSON.stringify(me.downloadResults));
                }
            }, false);

            httpReq.addEventListener('error', function onRequestError() {
                alert('Error loading shader');
            }, false);

            httpReq.open('POST', '/shadertoy', true);
            httpReq.responseType = 'json';
            httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            str = '{ "shaders" : ["'+ request.join('","') +'"] }';
            str = 's=' + encodeURIComponent( str );
            httpReq.send(str);
        } catch(e) {
            return;
        }
    };

    /**
     * Provides additional functionality to ShaderToy's profile page view.
     * Redirects to login page if user is not logged anymore.
     *
     * @contructor
     */
    function ToyPlugProfilePage() {
        helpers = new Helpers({});

        if (document.head.innerHTML) {
            this.sortableShaderList = new SortableShaderList();
            if (window.alternateProfile) {
                this.tilesView = new TilesView();
            }
            this.shaderDownload = new ShaderDownload();
        } else {
            window.location.href = '/signin';
        }
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
