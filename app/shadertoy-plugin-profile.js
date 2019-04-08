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
        TILE_TEMPLATE =
            '<a href="{shaderUrl}" class="shader-tile">' +
            '<img class="shader-image" src="{previewUrl}"/>' +
            '<span class="shader-name">{shaderTitle}</span></a>',
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
        var img = new window.Image();

        img.src = getPreviewUrlById(id);
        return img;
    }

    /**
     * Adds shader previews to the shaders list.
     */
    class SortableShaderList {
        constructor() {
            // Need to wait for user's shaders to load.
            // This is a hot fix.
            (function waitForShaders() {
                if (document.querySelectorAll('#divShaders tr + tr').length) {
                    this.rebuildList();
                } else {
                    setTimeout(waitForShaders.bind(this), 200);
                }
            }.call(this));
            this.rebuildList();
        }
        /**
         * Adds shaders list sorting on profile page.
         * Adds preview image overlay.
         * Loads preview images of all shaders.
         */
        rebuildList() {
            this.shadersListContainer = document.getElementById('divShaders');
            this.shadersTable = this.shadersListContainer.querySelector('table');
            this.shadersListRows = helpers.collectionToArray(this.shadersListContainer.querySelectorAll('tr'));
            this.shadersListHeadRow = this.shadersListRows[0];
            // Add small preview images to shaders list.
            // Images are shown on hover.
            this.shadersListRows.forEach(function(row, i) {
                if (!i) {
                    return;
                }

                var link = row.querySelector('a'),
                    id = link.getAttribute('href').substr(6),
                    bigImg = createPreviewImageElementById(id);

                bigImg.classList.add('bigPreview');
                link.insertBefore(bigImg, link.firstChild);
            });
        }
    }

    /**
     * Initializes Tiles (alternate profile page view).
     */
    class TilesView {
        constructor() {
            this.init();
        }
        /**
         * Initializes component.
         */
        init() {
            document.body.classList.add('alternate-profile');
            this.tilesWrapper = document.createElement('div');
            this.tilesWrapper.classList.add('tiles-wrapper');
            contentWrapper = document.getElementById('contentScroll');
            document.body.insertBefore(this.tilesWrapper, contentWrapper);
            this.userShaders = this.getShaders();
            // Need to wait for user's shaders to load.
            // This is a hot fix.
            (function waitForShaders() {
                if (document.querySelectorAll('#divShaders tr + tr').length) {
                    this.userShaders = this.getShaders();
                    this.addSecondHeader();
                } else {
                    setTimeout(waitForShaders.bind(this), 200);
                }
            }.call(this));
            document.body.style = 'overflow: visible';
        }
        /**
         * Parses all shaders from table and converts each to ShaderTile instance.
         *
         * @returns {ShaderTile[]}
         */
        getShaders() {
            return helpers.collectionToArray(document.querySelectorAll('#divShaders tr + tr')).map(function parseRow(tr) {
                var linkElement = tr.querySelector('td + td a'),
                    link = linkElement.getAttribute('href'),
                    status = tr.lastElementChild.previousElementSibling.textContent;
                return new ShaderTile(
                    {
                        id: link.replace('/view/', ''),
                        link: link,
                        title: linkElement.textContent,
                        statusOrginal: status,
                        status: status.replace(/(\s+|\+)/g, '').toLowerCase()
                    },
                    this
                );
            }, this);
        }
        /**
         * Adds header with links to shaders' groups.
         */
        addSecondHeader() {
            var SECOND_HEADER_CONTENT = '<a href="#contentScroll">Original part</a>',
                secondHeaderElement = document.createElement('div'),
                contents = '',
                headerAnchors = [],
                orginalPartAnchor = document.createElement('a');

            orginalPartAnchor.setAttribute('href', '#contentScroll');
            orginalPartAnchor.textContent = 'Orginal part';
            headerAnchors.push(orginalPartAnchor);
            helpers.collectionToArray(document.querySelectorAll('.tiles-wrapper > ul')).forEach((tilesList, i) => {
                var attr = tilesList.getAttribute('data-status'),
                    anchor = document.createElement('a');

                tilesList.setAttribute('id', 'toy-list-' + i);
                anchor.href = '#toy-list-' + i;
                anchor.textContent = attr;
                headerAnchors.push(anchor);
            });
            secondHeaderElement.classList.add('toyPlugHeader');
            headerAnchors.forEach(anchor => {
                secondHeaderElement.appendChild(anchor);
            });
            document.body.prepend(secondHeaderElement);
        }
    }

    /**
     * ShaderTile constructor.
     *
     * @constructor
     * @param {object} shader
     * @param {*} tilesView
     */
    class ShaderTile {
        constructor(shader, tilesView) {
            this.shader = shader;
            this.tilesView = tilesView;
            this.createHTML();
        }

        /**
         * Creates and adds shader tile element.
         */
        createHTML() {
            var tile = document.createElement('li'),
                targetElement = this.tilesView.tilesWrapper.querySelector('.list.' + this.shader.status);

            if (!targetElement) {
                let list = document.createElement('ul'),
                    listElement = document.createElement('li');

                list.classList.add('list', this.shader.status);
                list.setAttribute('data-status', this.shader.statusOrginal);
                listElement.appendChild(list);
                this.tilesView.tilesWrapper.appendChild(list);
                targetElement = list;
            }

            tile.classList.add('shader');
            tile.innerHTML = TILE_TEMPLATE.replace('{previewUrl}', getPreviewUrlById(this.shader.id))
                .replace('{shaderUrl}', getShaderUrlById(this.shader.id))
                .replace('{shaderTitle}', this.shader.title);
            targetElement.appendChild(tile);
        }
    }

    /**
     * Download button to download all shaders from the profile page
     */
    class ShaderDownload {
        constructor() {
            this.downloadCaption = 'DOWNLOAD ALL SHADERS';
            this.loadingCaption = 'LOADING ';
            this.loading = false;
            this.button = null;
            this.numShaders = 0;
            this.downloadQueue = [];
            this.downloadResults = [];
            this.createDownloadButton();
        }

        createDownloadButton() {
            var me = this,
                section = document.getElementById('userData');

            me.button = document.createElement('div');
            me.button.classList.add('formButtonSmall');
            me.button.classList.add('formButton-extension');
            me.button.style.width = '200px';
            me.button.style.marginTop = '10px';
            me.button.textContent = me.downloadCaption;
            me.button.onclick = function onDownloadButtonClick() {
                var ids = 0,
                    numRequests = 0,
                    i = 0;

                if (me.loading) {
                    window.alert('Please wait while we are processing your request!');
                    return;
                }

                this.textContent = me.loadingCaption;
                ids = helpers.collectionToArray(document.querySelectorAll('#divShaders tr + tr')).map(function getShaderIdFromURL(tr) {
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
                    this.textContent = me.downloadCaption;
                    window.alert('No shaders found!');
                }
            };
            section.appendChild(me.button);
        }

        processQueue() {
            var me = this,
                request = me.downloadQueue.shift(),
                httpReq,
                str = '';

            me.button.textContent = me.loadingCaption + ' ' + me.downloadResults.length + '/' + me.numShaders;

            try {
                httpReq = new window.XMLHttpRequest();
                httpReq.addEventListener(
                    'load',
                    function onResponse(event) {
                        var json = event.target.response;
                        if (json === null) {
                            window.alert('Error loading shader');
                            return;
                        }
                        me.downloadResults = me.downloadResults.concat(json);
                        if (me.downloadQueue.length > 0) {
                            me.processQueue();
                        } else {
                            me.loading = false;
                            me.button.textContent = me.downloadCaption;
                            window.ToyPlug.common.downloadJson(me.downloadResults[0].info.username + '.json', JSON.stringify(me.downloadResults));
                        }
                    },
                    false
                );
                httpReq.addEventListener(
                    'error',
                    function onRequestError() {
                        window.alert('Error loading shader');
                    },
                    false
                );
                httpReq.open('POST', '/shadertoy', true);
                httpReq.responseType = 'json';
                httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                str = '{ "shaders" : ["' + request.join('","') + '"] }';
                str = 's=' + encodeURIComponent(str);
                httpReq.send(str);
            } catch (ignore) {}
        }
    }

    /**
     * Provides additional functionality to ShaderToy's profile page view.
     * Redirects to login page if user is not logged anymore.
     *
     * @contructor
     */
    class ToyPlugProfilePage {
        constructor() {
            helpers = new Helpers({});

            if (document.head.textContent) {
                this.sortableShaderList = new SortableShaderList();

                if (window.alternateProfile) {
                    this.tilesView = new TilesView();
                }

                this.shaderDownload = new ShaderDownload();
            } else {
                window.location.href = '/signin';
            }
        }
    }

    /**
     * Common helper function.
     */
    class Helpers {
        constructor(options) {
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
        collectionToArray(collection) {
            return Array.prototype.slice.apply(collection);
        }
    }

    return new ToyPlugProfilePage();
})();
