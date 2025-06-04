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
 */

(function shadertoyPluginCustomInputs() {
    'use strict';

    const S_RGB = false;

    const ASSET_ID = 9;

    const PLUGIN_ASSETS_URL = document.querySelector('#plugin-assets-url')?.getAttribute('href')

    class MimeTypeError extends Error {
        /**
         * @param {string} adjective
         * @param {string} mimeType
         */
        constructor(adjective, mimeType) {
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

    function findMediaType(mimeType) {
        if (typeof mimeType !== 'string' || !mimeType.includes('/')) {
            throw new InvalidMimeTypeError(mimeType);
        }
        const [ topLevelType, subType ] = mimeType.split('/');
        if (
            topLevelType in SUPPORTED_MEDIA_TYPES
            && SUPPORTED_MEDIA_TYPES[topLevelType].subTypes.includes(subType)
        ) {
            return SUPPORTED_MEDIA_TYPES[topLevelType];
        }
        throw new UnsupportedMimeTypeError(mimeType);
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
     * @param {string} dataUrl
     * @param {MEDIA_TYPE} mediaType
     * @param {number} channelIndex
     */
    function applyTexture(mimeType, dataUrl, mediaType = findMediaTypeOrAlert(mimeType), channelIndex = getCurrentChannelIndex()) {
        try {
            const currentInput = gShaderToy.mEffect.mPasses[gShaderToy.mActiveDoc].mInputs[channelIndex];
            /** @type {ChannelInput} */
            const config = {
                mType: mediaType.mType,
                mID: mediaType.mID,
                mSrc: dataUrl,
                mSampler: {
                    srgb: `${S_RGB}`,
                    ...mediaType.mSampler,
                    ...currentInput?.globject.mInfo ?? {} // overwrite with existing settings if available
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
     */
    function wrap(eventListener) {
        if (!PLUGIN_ASSETS_URL) {
            console.error('PLUGIN_ASSETS_URL is not defined.');
            return;
        }
        const customInputUrl = `${PLUGIN_ASSETS_URL}/custom-input.template.html`;
        const thumbnailUrl = `${PLUGIN_ASSETS_URL}/file.png`;
        
        const row = document.createElement('tr');
        // read contents of custom input template
        fetch(customInputUrl)
            .then(response => response.text())
            .then(template => {
                row.innerHTML = template.replaceAll(
                    '{{thumbnailUrl}}',
                    thumbnailUrl,
                ).replaceAll(
                    '{{ASSET_ID}}',
                    ASSET_ID,
                );
                row.querySelector(`#miscAssetThumnail${ASSET_ID}`).addEventListener('click', eventListener);
            })
            .catch(error => {
                console.error('Failed to load custom input template:', error);
            });
        return row;
    }

    function injectButton() {
        document.querySelector('#divMisc > table > tbody').appendChild(
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
            })
        );
    }

    function injectDropHandlers() {
        const getChannel = (i) => document.getElementById(`myUnitCanvas${i++}`);
        let channel = getChannel(0);
        for (let channelIndex = 0; channel; channel = getChannel(++channelIndex)) {
            channel.addEventListener('drop', (event) => {
                event.stopPropagation();
                event.preventDefault();

                const text = event.dataTransfer.getData('text');
                if (text) { // text has been dropped
                    try {
                        const mediaType = findMediaTypeOrAlert(text);
                        applyTexture(mediaType.mType, text, mediaType, channelIndex);
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

    injectButton()
    injectDropHandlers();

})();