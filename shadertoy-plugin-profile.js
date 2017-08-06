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
		
		downloadQueue = [],
		downloadResults = [],

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

            link.insertBefore(bigImg, link.firstChild);
            link.insertBefore(smallImg, link.firstChild);
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
                        status: tr.lastElementChild
                            .previousElementSibling
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
	 * Add download button to download all shaders
	 */
	 function createDownloadButton()
	 {
		var section = document.getElementById('userData');
		var btn = document.createElement('div');
		btn.className = 'formButtonSmall';
		btn.setAttribute("id","downloadButton");
		btn.setAttribute("style","width:200px; margin-top:10px;"); // had this in css but it did not seem to work
		btn.innerHTML = "DOWNLOAD ALL SHADERS";		
		btn.onclick = function(e){
			if (this.innerHTML == "LOADING ...") return;			
			this.innerHTML = "LOADING ...";
			var ids = helpers.collectionToArray(document.querySelectorAll('#divShaders tr + tr'))
                .map(function(tr) {
                    var linkElement = tr.querySelector('a'),
                        link = linkElement.getAttribute('href');
					return link.replace('/view/', '');
                }, this);
		
			var numRequests = Math.ceil(ids.length / 8);
			downloadQueue = [];
			downloadResults = [];
			for(var i = 0; i < numRequests; i++) downloadQueue.push(ids.slice(i*8, (i+1)*8));
			processDownloadQueue(downloadQueue);			
		};
		section.appendChild(btn);		
	 }
	 
	function processDownloadQueue()
	{
		var request = downloadQueue.shift();
		
		//console.log(requests);
		try
		{
			var httpReq = new XMLHttpRequest();
			httpReq.addEventListener('load', function (event) 
			{ 
				var jsnShader = event.target.response;
				if( jsnShader===null ) { alert( "Error loading shader" ); return; };
				downloadResults = downloadResults.concat(jsnShader);
				if (downloadQueue.length > 0) processDownloadQueue();
				else 
				{
					document.getElementById("downloadButton").innerHTML = "DOWNLOAD ALL SHADERS";
					window.ToyPlug.common.downloadJson('shaders.json', JSON.stringify(downloadResults));
				}
			}, false );
			
			httpReq.addEventListener( 'error', function () { alert( "Error loading shader" ); }, false );

			httpReq.open( "POST", "/shadertoy", true );
			httpReq.responseType = "json";
			httpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			var str = "{ \"shaders\" : [\""+ request.join("\",\"") +"\"] }";
			str = "s=" + encodeURIComponent( str );
			httpReq.send(str);
		}
		catch(e)
		{
			return;
		}
	
	}
	
    /**
     * Provides additional functionality to ShaderToy's profile page view.
     *
     * @contructor
     */
    function ToyPlugProfilePage() {
        helpers = new Helpers({});
        this.sortableShaderList = new SortableShaderList();
        if (window.alternateProfile) this.tilesView = new TilesView();
		createDownloadButton();		
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