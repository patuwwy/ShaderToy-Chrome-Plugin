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
})();