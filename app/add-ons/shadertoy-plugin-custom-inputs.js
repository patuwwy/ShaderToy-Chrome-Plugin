//
// By Moritz Tim W.
// https://moritztim.dev
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
 * @property {string} mType name
 * @property {string[]} subTypes
 * @property {string} mID
 * @property {SamplerConfig} mSampler sampler configuration
 * 
 * @typedef {Object} SimpleMimeType
 * @property {string} topLevelType
 * @property {string} subType
 * 
 */

(function shadertoyPluginCustomInputs() {
    'use strict';

    // Based on https://github.com/broofa/mime/blob/main/types/standard.ts
    const MIME_TYPES = {
        "audio/3gpp": ["*3gpp"],
        "audio/aac": ["adts", "aac"],
        "audio/adpcm": ["adp"],
        "audio/amr": ["amr"],
        "audio/basic": ["au", "snd"],
        "audio/midi": ["mid", "midi", "kar", "rmi"],
        "audio/mobile-xmf": ["mxmf"],
        "audio/mp3": ["*mp3"],
        "audio/mp4": ["m4a", "mp4a", "m4b"],
        "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"],
        "audio/ogg": ["oga", "ogg", "spx", "opus"],
        "audio/s3m": ["s3m"],
        "audio/silk": ["sil"],
        "audio/wav": ["wav"],
        "audio/wave": ["*wav"],
        "audio/webm": ["weba"],
        "audio/xm": ["xm"],
        "image/aces": ["exr"],
        "image/apng": ["apng"],
        "image/avci": ["avci"],
        "image/avcs": ["avcs"],
        "image/avif": ["avif"],
        "image/bmp": ["bmp", "dib"],
        "image/cgm": ["cgm"],
        "image/dicom-rle": ["drle"],
        "image/dpx": ["dpx"],
        "image/emf": ["emf"],
        "image/fits": ["fits"],
        "image/g3fax": ["g3"],
        "image/gif": ["gif"],
        "image/heic": ["heic"],
        "image/heic-sequence": ["heics"],
        "image/heif": ["heif"],
        "image/heif-sequence": ["heifs"],
        "image/hej2k": ["hej2"],
        "image/ief": ["ief"],
        "image/jaii": ["jaii"],
        "image/jais": ["jais"],
        "image/jls": ["jls"],
        "image/jp2": ["jp2", "jpg2"],
        "image/jpeg": ["jpg", "jpeg", "jpe"],
        "image/jph": ["jph"],
        "image/jphc": ["jhc"],
        "image/jpm": ["jpm", "jpgm"],
        "image/jpx": ["jpx", "jpf"],
        "image/jxl": ["jxl"],
        "image/jxr": ["jxr"],
        "image/jxra": ["jxra"],
        "image/jxrs": ["jxrs"],
        "image/jxs": ["jxs"],
        "image/jxsc": ["jxsc"],
        "image/jxsi": ["jxsi"],
        "image/jxss": ["jxss"],
        "image/ktx": ["ktx"],
        "image/ktx2": ["ktx2"],
        "image/pjpeg": ["jfif"],
        "image/png": ["png"],
        "image/sgi": ["sgi"],
        "image/svg+xml": ["svg", "svgz"],
        "image/t38": ["t38"],
        "image/tiff": ["tif", "tiff"],
        "image/tiff-fx": ["tfx"],
        "image/webp": ["webp"],
        "image/wmf": ["wmf"],
        "video/3gpp": ["3gp", "3gpp"],
        "video/3gpp2": ["3g2"],
        "video/h261": ["h261"],
        "video/h263": ["h263"],
        "video/h264": ["h264"],
        "video/iso.segment": ["m4s"],
        "video/jpeg": ["jpgv"],
        "video/jpm": ["*jpm", "*jpgm"],
        "video/mj2": ["mj2", "mjp2"],
        "video/mp2t": ["ts", "m2t", "m2ts", "mts"],
        "video/mp4": ["mp4", "mp4v", "mpg4"],
        "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
        "video/ogg": ["ogv"],
        "video/quicktime": ["qt", "mov"],
        "video/webm": ["webm"]
    };

    const DESCRIPTION_LINE_LENGTH = 'Viewport Resolution'.length; // the longest line in other descriptions

    const S_RGB = false;

    const MISC_INPUT_COUNT = 9;

    const PLUGIN_ASSETS_URL = document.querySelector('#plugin-assets-url')?.getAttribute('href')

    class MimeTypeError extends Error {
        /**
         * @param {string} adjective
         * @param {string|SimpleMimeType} mimeType
         */
        constructor(adjective, mimeType) {
            if (typeof mimeType === 'object') {
                mimeType = `${mimeType.topLevelType}/${mimeType.subType}`;
            }
            let sentenceCaseAdjective = adjective.charAt(0).toUpperCase() + adjective.slice(1);
            super(`${sentenceCaseAdjective} Media type: ${mimeType}. Supported types are:\n` +
                Object.entries(SUPPORTED_MEDIA_TYPES)
                    .map(([type, { subTypes }]) => `${type}: ${subTypes.join(', ')}`)
                    .join('\n'));
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
    /**
     * @enum {MEDIA_TYPE} 
     */
    let SUPPORTED_MEDIA_TYPES = {
        image: {
            mType: 'texture',
            subTypes: ['jpeg', 'png', 'gif', 'webp', 'bmp'],
            mID: '4dXGRn',
            mSampler: {
                wrap: 'repeat',
                filter: 'mipmap',
                vflip: 'true',
            }
        },
        video: {
            mType: 'video',
            subTypes: ['mp4', 'webm', 'ogg'],
            mID: '4df3zn',
            mSampler: {
                wrap: 'clamp',
                filter: 'linear',
                vflip: 'true',
            }
        },
        audio: {
            mType: 'music',
            subTypes: ['mp3', 'wav', 'ogg', 'aac'],
            mID: '4sXGzn',
            mSampler: {
                wrap: 'clamp',
                filter: 'linear',
                vflip: 'false',
            }
        },
    };


    function getMimeSubType(extension) {
        for (const type of Object.values(SUPPORTED_MEDIA_TYPES)) {
            for (const subType of type.subTypes) {
                if (subType === extension) return subType;
            }
        }
        for (const type of Object.keys(MIME_TYPES)) {
            if (MIME_TYPES[type].includes(extension)) {
                return type.split('/')[1];
            }
        }
    }

    /**
     * @param {string|URL} mimeType
     */
    function findMediaType(mimeTypeOrUrl) {
        if (mimeTypeOrUrl instanceof URL) {
            return findMediaTypeFromMimeType(getMimeSubType(mimeTypeOrUrl.pathname.split('.').pop()));
        }
        if (typeof mimeTypeOrUrl !== 'string' || !mimeTypeOrUrl.includes('/')) {
            throw new InvalidMimeTypeError(mimeType);
        }
        const [ topLevelType, subType ] = mimeTypeOrUrl.split('/');
        if (!subType) {
            throw new InvalidMimeTypeError(mimeTypeOrUrl);
        }
        return findMediaTypeFromMimeType(subType, topLevelType);
    }

    /**
     * @param {string} subType
     * @param {string?} topLevelType
     */
    function findMediaTypeFromMimeType(subType, topLevelType) {
        if (!topLevelType) {
            for (const type in SUPPORTED_MEDIA_TYPES) {
                try {
                    return findMediaTypeFromMimeType(subType, type);
                } catch (error) {
                    if (!(error instanceof UnsupportedMimeTypeError)) {
                        throw error; // rethrow unexpected errors
                    }
                }
            }
        }
        if (
            topLevelType in SUPPORTED_MEDIA_TYPES
            && SUPPORTED_MEDIA_TYPES[topLevelType].subTypes.includes(subType)
        ) {
            return SUPPORTED_MEDIA_TYPES[topLevelType];
        }
        throw new UnsupportedMimeTypeError({ topLevelType, subType });
    }

    function findMediaTypeOrAlert(mimeType) {
        try {
            return findMediaType(mimeType);
        } catch (error) {
            if (error instanceof MimeTypeError) {
                console.warn(error.message);
                alert(error.message);
            } else {
                console.error('Unexpected error:', error);
            }
            throw error; // rethrow to stop further processing
        }
    }
    
    /**
     * Reads a file if valid and applies it to the current channel.
     * @param {File} file
     * @param {number?} channelIndex
     */
    function processFile(file, channelIndex) {
        if (!file) {
            throw new Error('No file provided');
        }
        const mediaType = findMediaTypeOrAlert(file.type);
        
        const reader = new FileReader();
        reader.onerror = () => {
            throw new Error(`Failed to read file: ${file.name}: ${reader.error.message}`);
        };

        reader.onload = (event) => {
            applyTexture(file.type, event.target.result, mediaType, channelIndex);
        };

        reader.readAsDataURL(file);
    }

    /**
     * Extracts the current channel index from the dialog title.
     * @returns {number}
     */
    function getCurrentChannelIndex() {
        const result = parseInt(document.querySelector('#pickTextureDialogTitle')?.textContent.at(-1));
        if (isNaN(result)) {
            throw new Error('No channnel selected');
        }
        return result;
    }
    
    /**
     * Applies a texture to the current channel.
     * @param {string} mimeType
     * @param {URL} url
     * @param {MEDIA_TYPE} mediaType
     * @param {number} channelIndex
     */
    function applyTexture(mimeType, url, mediaType = findMediaTypeOrAlert(mimeType), channelIndex = getCurrentChannelIndex()) {
        url = new URL(url);
        try {
            const currentInput = gShaderToy.mEffect.mPasses[gShaderToy.mActiveDoc].mInputs[channelIndex];
            /** @type {ChannelInput} */
            const config = {
                mType: mediaType.mType,
                mID: mediaType.mID,
                mSrc: url.href,
                mSampler: {
                    srgb: `${S_RGB}`,
                    ...mediaType.mSampler,
                    ...currentInput?.mInfo.mSampler ?? {} // overwrite with existing settings if available
                }
            }
            gShaderToy.mEffect.NewTexture(gShaderToy.mActiveDoc, channelIndex, config);
            gShaderToy.mNeedsSave = true;
            
            console.log(`Applied ${config.type} to channel ${channelIndex}`);
        } catch (error) {
            console.error('Failed to apply texture:', error);
        }
    }
    
    /**
     * Wraps the eventListener in a ridiculous construction to fit in with the other input options on the misc tab.
     * @param {function} eventListener
     * @param {int} assetId
     * @param {string} title
     * @param {string} thumbnailUrl
     * @param {string} description
     */
    function wrap(eventListener, assetId, title, thumbnailUrl, description) {
        if (!PLUGIN_ASSETS_URL) {
            console.error('PLUGIN_ASSETS_URL is not defined.');
            return;
        }
        const customInputUrl = `${PLUGIN_ASSETS_URL}/custom-input.template.html`;
        
        const result = document.createElement('td');
        // read contents of custom input template
        fetch(customInputUrl)
            .then(response => response.text())
            .then(template => {
                result.innerHTML = template.replaceAll(
                    '{{thumbnailUrl}}',
                    thumbnailUrl,
                ).replaceAll(
                    '{{assetId}}',
                    assetId,
                ).replaceAll(
                    '{{title}}',
                    title,
                ).replaceAll(
                    '{{description}}',
                    description.split('').reduce((acc, char) => {
                        if (acc.length >= DESCRIPTION_LINE_LENGTH && char.match(/\s/)) {
                            acc += '\n';
                        } else {
                            acc += char;
                        }
                        return acc;
                    }
                    , ''),                    
                );
                result.querySelector(`#miscAssetThumnail${assetId}`).addEventListener('click', eventListener);
            })
            .catch(error => {
                console.error('Failed to load custom input template:', error);
            });
        return result;
    }

    function injectButtons() {
        const table = document.querySelector('#divMisc > table > tbody')
        const row = document.createElement('tr');
        table.appendChild(row);
        row.append(
            // Upload handler
            wrap((event) => {
                event.preventDefault();
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = Object.values(SUPPORTED_MEDIA_TYPES).flatMap(
                    type => type.subTypes.map(subType => `${type.mID}/${subType}`)
                ).join(',');
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        processFile(file);
                    }
                };
                fileInput.click();
            }, MISC_INPUT_COUNT + 1, 'Upload File', `${PLUGIN_ASSETS_URL}/file.png`, 'Upload your own file.'),
            // URL handler
            wrap((event) => {
                event.preventDefault();
                const url = new URL(prompt('Enter the URL of the texture:'))
                try {
                    if (url) {
                        const mediaType = findMediaTypeOrAlert(url);
                        applyTexture(mediaType.mType, url, mediaType);
                    }
                } catch (error) {
                    console.error('Failed to apply texture from URL:', error);
                }
            }, MISC_INPUT_COUNT + 2, 'Apply URL', `${PLUGIN_ASSETS_URL}/link.png`, 'Load a file from a URL on shadertoy.com.')
        );
    }

    function injectDropHandlers() {
        const getChannel = (index) => document.getElementById(`myUnitCanvas${index++}`);
        let channel = getChannel(0);
        for (let channelIndex = 0; channel; channel = getChannel(++channelIndex)) {
            channel.addEventListener('drop', (event) => {
                event.stopPropagation();
                event.preventDefault();

                const text = event.dataTransfer.getData('text');
                if (text) { // text has been dropped
                    try {
                        const url = new URL(text);
                        const mediaType = findMediaTypeOrAlert(url);
                        applyTexture(mediaType.mType, url, mediaType, channelIndex);
                    } catch (error) {
                        console.error('Failed to apply texture from URL:', error);
                    }
                } else if (event.dataTransfer.files.length > 0) { // a file has been dropped
                    processFile(event.dataTransfer.files[0], channelIndex);
                    if (event.dataTransfer.files.length > 1) {
                        [console.warn, alert].forEach(fn => fn(
                            `Multiple files dropped. Only the first file will be processed: ${event.dataTransfer.files[0].name}`
                        ));
                    }
                }
            }, false);
            channel.addEventListener('dragover', (event) => {
                event.stopPropagation();
                event.preventDefault();
                event.dataTransfer.dropEffect = 'link';
            }, false);
        }
    }

    injectButtons()
    injectDropHandlers();

})();