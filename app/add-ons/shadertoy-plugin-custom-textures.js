//
// By Moritz Tim W.
// https://github.com/moritztim
// Inspired by ShadertoyCustomTextures
// https://github.com/ahillss/ShadertoyCustomTextures
//

/**
 * @typedef {'true'|'false'} booleanString
 * @typedef {Object} SamplerConfig
 * @property {'nearest'|'mipmap'|'linear'} filter
 * @property {'repeat'|'clamp'} wrap wrap mode
 * @property {booleanString} vflip vertical flip
 * @property {booleanString} srgb whether to use sRGB encoding
 * @property {'byte'} internal
 * 
 * @typedef {Object} ChannelInput
 * @property {string} mSrc source URL
 * @property {string} mType top level MIME type
 * @property {string} mID unique identifier
 * @property {SamplerConfig} mSampler sampler configuration
 *
 * @typedef {object} MEDIA_TYPE
 * @property {string[]} subTypes
 * @property {string} mID
 * @property {SamplerConfig} config
 */

(function shadertoyCustomTextures() {
    'use strict';

    const S_RGB = false;

    const ASSET_ID = 9;

    class MimeTypeError extends Error {
        /**
         * @param {string} adjective
         * @param {string} mimeType
         */
        constructor(adjective, mimeType) {
            let sentenceCaseAdjective = adjective.charAt(0).toUpperCase() + adjective.slice(1);
            super(`${sentenceCaseAdjective} MIME type: ${mimeType}`);
            this.name = `${sentenceCaseAdjective}MimeTypeError`;
        }
    }
    class InvalidMimeTypeError extends MimeTypeError {
        constructor(mimeType) {
            super('Invalid', mimeType);
        }
    }
    class UnsupportedMimeTypeError extends MimeTypeError {
        constructor(mimeType) {
            super('Unsupported', mimeType);
        }
    }

    class Texture {
        
    }
    
    const CHANNELS = 4;
    /**
     * @enum {MEDIA_TYPE} 
     */
    let SUPPORTED_MEDIA_TYPES = {
        image: {
            subTypes: ['jpeg', 'png', 'gif', 'webp', 'bmp'],
            mID: '4dXGRn',
            config: {
                wrap: 'repeat',
                filter: 'mipmap',
                vflip: 'true',
            }
        },
        video: {
            subTypes: ['mp4', 'webm', 'ogg'],
            mID: '4df3zn',
            config: {
                wrap: 'clamp',
                filter: 'linear',
                vflip: 'true',
            }
        },
        audio: {
            subTypes: ['mp3', 'wav', 'ogg', 'aac'],
            mID: '4sXGzn',
            config: {
                wrap: 'clamp',
                filter: 'linear',
                vflip: 'false',
            }
        },
    };

    function findMediaType(mimeType) {
        if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
            throw new InvalidMimeTypeError(mimeType);
        }
        const { type, subtype } = mimeType.split('/');
        if (type in SUPPORTED_MEDIA_TYPES && subtype in SUPPORTED_MEDIA_TYPES[type].subTypes) {
            return SUPPORTED_MEDIA_TYPES[type].config;
        }
        throw new UnsupportedMimeTypeError(mimeType);
    }
    /**
     * Wraps the eventListener in a ridiculous construction to fit in with the other input options on the misc tab.
     * @param {function} eventListener
     */
    function wrap(eventListener) {
        const create = (...args) => document.createElement(...args);

        const row = create('tr');
        const td = create('td');

        const divAsset = create('div');
            divAsset.className = 'divAsset';
            divAsset.id = 'miscAsset1';

        const table = create('table');
        const tbody = create('tbody');
        const innerRow = create('tr');

        const thumbnail = create('img');
        thumbnail.className = 'inputThumbnail';
        thumbnail.id = 'miscAssetThumnail1';
        thumbnail.src = 'assets/file.png';

        const triggerTd = create('td');

        const infoTd = create('td');
        infoTd.className = 'inputInfoColumn';

        const infoDiv = create('div');
        infoDiv.style.position = 'absolute';

        infoDiv.innerHTML = `
            <span class="spanName" id="miscAssetName${ASSET_ID}">File</span><br>
            by <span class="spanUser" id="miscUserName${ASSET_ID}"><a class="user">you</a></span><br><br>
            <span class="spanDescription" id="miscInfo${ASSET_ID}">upload your own file</span>
        `;

        row.append(td);
        td.append(divAsset);
        divAsset.append(table);
        table.append(tbody);
        tbody.append(innerRow);
        innerRow.append(triggerTd, infoTd);
        infoTd.append(infoDiv);
        triggerTd.appendChild(thumbnail);
        thumbnail.addEventListener('click', eventListener);

        return row;
    }

    document.querySelector('#divMisc > table > tbody').appendChild(
        wrap((event) => {
            alert('Not Implemented');
        })
    );

})();