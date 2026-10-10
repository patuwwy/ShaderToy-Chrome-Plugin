(function shadertoyPluginMonaco() {
    'use strict';

    var STATE_STORAGE_KEY = 'STE-state';

    var ToyPlugMonaco = {
        state: {},
        o_editor_monaco: null,
        b_glsl_language_registered: false,
        b_monaco_initialized: false,

        init: function() {
            var self = this;
            this.state = JSON.parse(window.localStorage.getItem(STATE_STORAGE_KEY) || '{}');

            var monacoAssetsListener = function(event) {
                if (event.source !== window) return;
                if (event.data && event.data.type === 'MonacoAssetsData') {
                    self.loadMonacoEditor(event.data.cfg);
                }
            };

            window.addEventListener('message', monacoAssetsListener);
            window.postMessage({ type: 'RequestMonacoAssetsData' }, '*');
        },

        isMonacoSelected: function() {
            return !!(this.state && this.state.monaco === true);
        },

        syncMonacoToActiveDoc: function() {
            if (!this.isMonacoSelected() || !this.o_editor_monaco || !window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[window.gShaderToy.mActiveDoc]) {
                return;
            }

            var s_code = this.o_editor_monaco.getModel().getValue();
            var o_active_doc = window.gShaderToy.mPass[window.gShaderToy.mActiveDoc].mDocs;

            if (o_active_doc.getValue() !== s_code) {
                o_active_doc.setValue(s_code);
                window.gShaderToy.mNeedsSave = true;
            }

            if (window.gShaderToy.mCodeEditor && window.gShaderToy.mCodeEditor.getValue && window.gShaderToy.mCodeEditor.setValue) {
                if (window.gShaderToy.mCodeEditor.getValue() !== s_code) {
                    window.gShaderToy.mCodeEditor.setValue(s_code);
                }
            }
        },

        forceSyncMonacoToActiveDoc: function() {
            if (!this.o_editor_monaco || !window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[window.gShaderToy.mActiveDoc]) {
                return;
            }

            var s_code = this.o_editor_monaco.getModel().getValue();
            var o_active_doc = window.gShaderToy.mPass[window.gShaderToy.mActiveDoc].mDocs;

            if (o_active_doc.getValue() !== s_code) {
                o_active_doc.setValue(s_code);
                window.gShaderToy.mNeedsSave = true;
            }

            if (window.gShaderToy.mCodeEditor && window.gShaderToy.mCodeEditor.getValue && window.gShaderToy.mCodeEditor.setValue) {
                if (window.gShaderToy.mCodeEditor.getValue() !== s_code) {
                    window.gShaderToy.mCodeEditor.setValue(s_code);
                }
            }
        },

        syncActiveDocToMonaco: function() {
            if (!this.o_editor_monaco || !window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[window.gShaderToy.mActiveDoc]) {
                return;
            }

            var s_code = window.gShaderToy.mPass[window.gShaderToy.mActiveDoc].mDocs.getValue();

            if (this.o_editor_monaco.getModel().getValue() !== s_code) {
                this.o_editor_monaco.getModel().setValue(s_code);
            }
        },

        setupGlslLanguage: function(monaco) {
            if (this.b_glsl_language_registered) {
                return;
            }
            this.b_glsl_language_registered = true;

            monaco.languages.register({ id: 'glsl' });

            monaco.languages.setLanguageConfiguration('glsl', {
                wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
                comments: {
                    lineComment: '//',
                    blockComment: ['/*', '*/']
                },
                brackets: [
                    ['{', '}'],
                    ['[', ']'],
                    ['(', ')']
                ],
                autoClosingPairs: [
                    { open: '[', close: ']' },
                    { open: '{', close: '}' },
                    { open: '(', close: ')' },
                    { open: "'", close: "'", notIn: ['string', 'comment'] },
                    { open: '"', close: '"', notIn: ['string'] }
                ]
            });

            monaco.languages.setMonarchTokensProvider('glsl', {
                defaultToken: '',
                tokenPostfix: '.glsl',
                types: ['bool', 'bvec2', 'bvec3', 'bvec4', 'float', 'int', 'ivec2', 'ivec3', 'ivec4', 'mat2', 'mat2x2', 'mat2x3', 'mat2x4', 'mat3', 'mat3x2', 'mat3x3', 'mat3x4', 'mat4', 'mat4x2', 'mat4x3', 'mat4x4', 'uint', 'uvec2', 'uvec3', 'uvec4', 'vec2', 'vec3', 'vec4', 'void'],
                keywords: ['attribute', 'break', 'case', 'centroid', 'const', 'continue', 'default', 'discard', 'do', 'else', 'false', 'flat', 'for', 'highp', 'if', 'in', 'inout', 'invariant', 'isampler2D', 'isampler2DArray', 'isampler3D', 'isamplerCube', 'layout', 'lowp', 'mediump', 'out', 'precision', 'return', 'sampler2D', 'sampler2DArray', 'sampler2DArrayShadow', 'sampler2DShadow', 'sampler3D', 'samplerCube', 'samplerCubeShadow', 'smooth', 'struct', 'switch', 'true', 'uniform', 'usampler2D', 'usampler2DArray', 'usampler3D', 'usamplerCube', 'varying', 'while'],
                functions: ['radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt', 'abs', 'sign', 'floor', 'trunc', 'round', 'roundEven', 'ceil', 'fract', 'mod', 'modf', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep', 'isnan', 'isinf', 'floatBitsToInt', 'floatBitsToUint', 'intBitsToFloat', 'uintBitsToFloat', 'packSnorm2x16', 'unpackSnorm2x16', 'packUnorm2x16', 'unpackUnorm2x16', 'packHalf2x16', 'unpackHalf2x16', 'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward', 'reflect', 'refract', 'matrixCompMult', 'outerProduct', 'transpose', 'determinant', 'inverse', 'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual', 'any', 'all', 'not', 'textureSize', 'texture', 'texture2D', 'textureCube', 'texture2DProj', 'texture2DLodEXT', 'texture2DProjLodEXT', 'textureCubeLodEXT', 'texture2DGradEXT', 'texture2DProjGradEXT', 'textureCubeGradEXT', 'textureProj', 'textureLod', 'textureOffset', 'texelFetch', 'texelFetchOffset', 'textureProjOffset', 'textureLodOffset', 'textureProjLod', 'textureProjLodOffset', 'textureGrad', 'textureGradOffset', 'textureProjGrad', 'textureProjGradOffset', 'dFdx', 'dFdy', 'fwidth'],
                operators: ['++', '--', '+', '-', '~', '!', '*', '/', '%', '<<', '>>', '<', '>', '<=', '>=', '==', '!=', '&', '^', '|', '&&', '^^', '||', '?', ':', '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|=', ','],
                brackets: [
                    { token: 'delimiter.curly', open: '{', close: '}' },
                    { token: 'delimiter.parenthesis', open: '(', close: ')' },
                    { token: 'delimiter.square', open: '[', close: ']' },
                    { token: 'delimiter.angle', open: '<', close: '>' }
                ],
                symbols: /[=><!~?:&|+\-*\/\^%]+/,
                integersuffix: /[uU]?/,
                floatsuffix: /[fF]?/,
                func: /[a-zA-Z_0-9]+/,
                tokenizer: {
                    root: [
                        [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                        [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
                        [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
                        [/([+-]?)\d+(@integersuffix)/, 'number.integer'],
                        [/#(version|define|undef|ifdef|ifndef|else|elsif|endif)/, 'keyword.directive'],
                        [/\$[a-zA-Z0-9]*/, 'regexp'],
                        [/\s[A-Z_][A-Z_0-9]*/, 'constant'],
                        [/gl_[a-zA-Z_0-9]+/, 'keyword.gl'],
                        [
                            /([a-zA-Z_][a-zA-Z_0-9]*)/,
                            {
                                cases: {
                                    '@types': { token: 'keyword.$0' },
                                    '@keywords': { token: 'keyword.$0' },
                                    '@functions': { token: 'keyword.builtins.$0' },
                                    '@default': 'identifier'
                                }
                            }
                        ],
                        [/(\d+(\.\d+))/, 'number.float'],
                        [/\d+/, 'keyword'],
                        [/\/\/.+/, 'comment'],
                        [/\/\*.+?(\*\/)/, 'comment'],
                        [/[{}()\[\]]/, '@brackets'],
                        [
                            /@symbols/,
                            {
                                cases: {
                                    '@operators': 'delimiter',
                                    '@default': ''
                                }
                            }
                        ],
                        [/[;,.]/, 'delimiter']
                    ]
                }
            });

            var a_glsl_keywords = [
                'break', 'case', 'centroid', 'const', 'continue', 'default', 'discard',
                'do', 'else', 'false', 'flat', 'for', 'highp', 'if', 'in', 'inout',
                'invariant', 'layout', 'lowp', 'mediump', 'out', 'precision', 'return',
                'smooth', 'struct', 'switch', 'true', 'uniform', 'varying', 'while'
            ];

            var a_glsl_types = [
                { label: 'bool', detail: 'boolean (true or false)' },
                { label: 'bvec2', detail: '2D boolean vector' },
                { label: 'bvec3', detail: '3D boolean vector' },
                { label: 'bvec4', detail: '4D boolean vector' },
                { label: 'float', detail: 'floating-point scalar' },
                { label: 'int', detail: 'signed integer scalar' },
                { label: 'ivec2', detail: '2D signed integer vector' },
                { label: 'ivec3', detail: '3D signed integer vector' },
                { label: 'ivec4', detail: '4D signed integer vector' },
                { label: 'uint', detail: 'unsigned integer scalar' },
                { label: 'uvec2', detail: '2D unsigned integer vector' },
                { label: 'uvec3', detail: '3D unsigned integer vector' },
                { label: 'uvec4', detail: '4D unsigned integer vector' },
                { label: 'vec2', detail: '2D floating-point vector' },
                { label: 'vec3', detail: '3D floating-point vector' },
                { label: 'vec4', detail: '4D floating-point vector' },
                { label: 'mat2', detail: '2x2 floating-point matrix' },
                { label: 'mat3', detail: '3x3 floating-point matrix' },
                { label: 'mat4', detail: '4x4 floating-point matrix' },
                { label: 'mat2x2', detail: '2x2 floating-point matrix' },
                { label: 'mat2x3', detail: '2x3 floating-point matrix' },
                { label: 'mat2x4', detail: '2x4 floating-point matrix' },
                { label: 'mat3x2', detail: '3x2 floating-point matrix' },
                { label: 'mat3x3', detail: '3x3 floating-point matrix' },
                { label: 'mat3x4', detail: '3x4 floating-point matrix' },
                { label: 'mat4x2', detail: '4x2 floating-point matrix' },
                { label: 'mat4x3', detail: '4x3 floating-point matrix' },
                { label: 'mat4x4', detail: '4x4 floating-point matrix' },
                { label: 'sampler2D', detail: '2D texture sampler' },
                { label: 'sampler3D', detail: '3D texture sampler' },
                { label: 'samplerCube', detail: 'Cube map texture sampler' },
                { label: 'isampler2D', detail: '2D integer texture sampler' },
                { label: 'isampler3D', detail: '3D integer texture sampler' },
                { label: 'isamplerCube', detail: 'Cube map integer texture sampler' },
                { label: 'usampler2D', detail: '2D unsigned integer texture sampler' },
                { label: 'usampler3D', detail: '3D unsigned integer texture sampler' },
                { label: 'usamplerCube', detail: 'Cube map unsigned integer texture sampler' },
                { label: 'void', detail: 'indicates that a function returns no value' }
            ];

            var a_shadertoy_builtins = [
                {
                    label: 'iResolution',
                    detail: 'uniform vec3 iResolution',
                    documentation: 'Viewport resolution in pixels: xy = width and height, z = pixel aspect ratio (x/y).'
                },
                {
                    label: 'iTime',
                    detail: 'uniform float iTime',
                    documentation: 'Shader playback time in seconds.'
                },
                {
                    label: 'iTimeDelta',
                    detail: 'uniform float iTimeDelta',
                    documentation: 'Render time for the previous frame in seconds.'
                },
                {
                    label: 'iFrame',
                    detail: 'uniform int iFrame',
                    documentation: 'Shader playback frame counter.'
                },
                {
                    label: 'iFrameRate',
                    detail: 'uniform float iFrameRate',
                    documentation: 'Estimated framerate in frames per second.'
                },
                {
                    label: 'iMouse',
                    detail: 'uniform vec4 iMouse',
                    documentation: 'Mouse pixel coordinates: xy = current dragging position, zw = click position.'
                },
                {
                    label: 'iDate',
                    detail: 'uniform vec4 iDate',
                    documentation: 'Current date and time: vec4(year, month, day, time_in_seconds).'
                },
                {
                    label: 'iSampleRate',
                    detail: 'uniform float iSampleRate',
                    documentation: 'Sound sample rate in Hz (typically 44100.0).'
                },
                {
                    label: 'iChannel0',
                    detail: 'uniform sampler2D iChannel0',
                    documentation: 'Input texture or buffer channel 0.'
                },
                {
                    label: 'iChannel1',
                    detail: 'uniform sampler2D iChannel1',
                    documentation: 'Input texture or buffer channel 1.'
                },
                {
                    label: 'iChannel2',
                    detail: 'uniform sampler2D iChannel2',
                    documentation: 'Input texture or buffer channel 2.'
                },
                {
                    label: 'iChannel3',
                    detail: 'uniform sampler2D iChannel3',
                    documentation: 'Input texture or buffer channel 3.'
                },
                {
                    label: 'iChannelResolution',
                    detail: 'uniform vec3 iChannelResolution[4]',
                    documentation: 'Input channel resolution array in pixels.'
                },
                {
                    label: 'fragCoord',
                    detail: 'in vec2 fragCoord',
                    documentation: 'Input fragment pixel coordinate within the viewport (origin at bottom-left).'
                },
                {
                    label: 'fragColor',
                    detail: 'out vec4 fragColor',
                    documentation: 'Output fragment color (RGBA in 0.0 to 1.0 range).'
                }
            ];

            var a_glsl_functions = [
                { label: 'radians', insertText: 'radians(${1:degrees})', detail: 'genType radians(genType degrees)', documentation: 'Converts degrees to radians.' },
                { label: 'degrees', insertText: 'degrees(${1:radians})', detail: 'genType degrees(genType radians)', documentation: 'Converts radians to degrees.' },
                { label: 'sin', insertText: 'sin(${1:angle})', detail: 'genType sin(genType angle)', documentation: 'Returns the sine of angle in radians.' },
                { label: 'cos', insertText: 'cos(${1:angle})', detail: 'genType cos(genType angle)', documentation: 'Returns the cosine of angle in radians.' },
                { label: 'tan', insertText: 'tan(${1:angle})', detail: 'genType tan(genType angle)', documentation: 'Returns the tangent of angle in radians.' },
                { label: 'asin', insertText: 'asin(${1:x})', detail: 'genType asin(genType x)', documentation: 'Returns the arcsine of x.' },
                { label: 'acos', insertText: 'acos(${1:x})', detail: 'genType acos(genType x)', documentation: 'Returns the arccosine of x.' },
                { label: 'atan', insertText: 'atan(${1:y}, ${2:x})', detail: 'genType atan(genType y, genType x)', documentation: 'Returns the arc-tangent of y, x or y_over_x.' },
                { label: 'sinh', insertText: 'sinh(${1:x})', detail: 'genType sinh(genType x)', documentation: 'Returns the hyperbolic sine of x.' },
                { label: 'cosh', insertText: 'cosh(${1:x})', detail: 'genType cosh(genType x)', documentation: 'Returns the hyperbolic cosine of x.' },
                { label: 'tanh', insertText: 'tanh(${1:x})', detail: 'genType tanh(genType x)', documentation: 'Returns the hyperbolic tangent of x.' },
                { label: 'asinh', insertText: 'asinh(${1:x})', detail: 'genType asinh(genType x)', documentation: 'Returns the inverse hyperbolic sine of x.' },
                { label: 'acosh', insertText: 'acosh(${1:x})', detail: 'genType acosh(genType x)', documentation: 'Returns the inverse hyperbolic cosine of x.' },
                { label: 'atanh', insertText: 'atanh(${1:x})', detail: 'genType atanh(genType x)', documentation: 'Returns the inverse hyperbolic tangent of x.' },
                { label: 'pow', insertText: 'pow(${1:x}, ${2:y})', detail: 'genType pow(genType x, genType y)', documentation: 'Returns x raised to the power of y (x^y).' },
                { label: 'exp', insertText: 'exp(${1:x})', detail: 'genType exp(genType x)', documentation: 'Returns natural exponentiation of x (e^x).' },
                { label: 'log', insertText: 'log(${1:x})', detail: 'genType log(genType x)', documentation: 'Returns natural logarithm of x (ln(x)).' },
                { label: 'exp2', insertText: 'exp2(${1:x})', detail: 'genType exp2(genType x)', documentation: 'Returns 2 raised to the power of x (2^x).' },
                { label: 'log2', insertText: 'log2(${1:x})', detail: 'genType log2(genType x)', documentation: 'Returns base 2 logarithm of x.' },
                { label: 'sqrt', insertText: 'sqrt(${1:x})', detail: 'genType sqrt(genType x)', documentation: 'Returns square root of x.' },
                { label: 'inversesqrt', insertText: 'inversesqrt(${1:x})', detail: 'genType inversesqrt(genType x)', documentation: 'Returns 1 / sqrt(x).' },
                { label: 'abs', insertText: 'abs(${1:x})', detail: 'genType abs(genType x)', documentation: 'Returns the absolute value of x.' },
                { label: 'sign', insertText: 'sign(${1:x})', detail: 'genType sign(genType x)', documentation: 'Returns 1.0 if x > 0, 0.0 if x == 0, and -1.0 if x < 0.' },
                { label: 'floor', insertText: 'floor(${1:x})', detail: 'genType floor(genType x)', documentation: 'Returns the largest integer less than or equal to x.' },
                { label: 'trunc', insertText: 'trunc(${1:x})', detail: 'genType trunc(genType x)', documentation: 'Returns the integer value obtained by truncating the fraction part.' },
                { label: 'round', insertText: 'round(${1:x})', detail: 'genType round(genType x)', documentation: 'Returns the nearest integer to x.' },
                { label: 'roundEven', insertText: 'roundEven(${1:x})', detail: 'genType roundEven(genType x)', documentation: 'Returns the nearest even integer to x.' },
                { label: 'ceil', insertText: 'ceil(${1:x})', detail: 'genType ceil(genType x)', documentation: 'Returns the smallest integer greater than or equal to x.' },
                { label: 'fract', insertText: 'fract(${1:x})', detail: 'genType fract(genType x)', documentation: 'Returns fraction part: x - floor(x).' },
                { label: 'mod', insertText: 'mod(${1:x}, ${2:y})', detail: 'genType mod(genType x, genType y)', documentation: 'Modulo operation: x - y * floor(x/y).' },
                { label: 'min', insertText: 'min(${1:x}, ${2:y})', detail: 'genType min(genType x, genType y)', documentation: 'Returns the smaller of x and y.' },
                { label: 'max', insertText: 'max(${1:x}, ${2:y})', detail: 'genType max(genType x, genType y)', documentation: 'Returns the larger of x and y.' },
                { label: 'clamp', insertText: 'clamp(${1:x}, ${2:minVal}, ${3:maxVal})', detail: 'genType clamp(genType x, minVal, maxVal)', documentation: 'Constrains x to lie between minVal and maxVal.' },
                { label: 'mix', insertText: 'mix(${1:x}, ${2:y}, ${3:a})', detail: 'genType mix(genType x, genType y, genType a)', documentation: 'Linear interpolation between x and y: x*(1-a) + y*a.' },
                { label: 'step', insertText: 'step(${1:edge}, ${2:x})', detail: 'genType step(genType edge, genType x)', documentation: 'Returns 0.0 if x < edge, otherwise 1.0.' },
                { label: 'smoothstep', insertText: 'smoothstep(${1:edge0}, ${2:edge1}, ${3:x})', detail: 'genType smoothstep(genType edge0, genType edge1, genType x)', documentation: 'Hermite interpolation between 0.0 and 1.0 when edge0 < x < edge1.' },
                { label: 'isnan', insertText: 'isnan(${1:x})', detail: 'genBType isnan(genType x)', documentation: 'Returns true if x is NaN.' },
                { label: 'isinf', insertText: 'isinf(${1:x})', detail: 'genBType isinf(genType x)', documentation: 'Returns true if x is positive or negative infinity.' },
                { label: 'length', insertText: 'length(${1:x})', detail: 'float length(genType x)', documentation: 'Returns the length (magnitude) of vector x.' },
                { label: 'distance', insertText: 'distance(${1:p0}, ${2:p1})', detail: 'float distance(genType p0, genType p1)', documentation: 'Returns the Euclidean distance between p0 and p1.' },
                { label: 'dot', insertText: 'dot(${1:x}, ${2:y})', detail: 'float dot(genType x, genType y)', documentation: 'Returns the scalar dot product of x and y.' },
                { label: 'cross', insertText: 'cross(${1:x}, ${2:y})', detail: 'vec3 cross(vec3 x, vec3 y)', documentation: 'Returns the cross product of two 3D vectors.' },
                { label: 'normalize', insertText: 'normalize(${1:x})', detail: 'genType normalize(genType x)', documentation: 'Returns a vector in the same direction but with unit length.' },
                { label: 'faceforward', insertText: 'faceforward(${1:N}, ${2:I}, ${3:Nref})', detail: 'genType faceforward(genType N, genType I, genType Nref)', documentation: 'Returns N if dot(Nref, I) < 0, else -N.' },
                { label: 'reflect', insertText: 'reflect(${1:I}, ${2:N})', detail: 'genType reflect(genType I, genType N)', documentation: 'Calculates reflection direction: I - 2 * dot(N, I) * N.' },
                { label: 'refract', insertText: 'refract(${1:I}, ${2:N}, ${3:eta})', detail: 'genType refract(genType I, genType N, float eta)', documentation: 'Calculates refraction vector using Snell law.' },
                { label: 'matrixCompMult', insertText: 'matrixCompMult(${1:x}, ${2:y})', detail: 'mat matrixCompMult(mat x, mat y)', documentation: 'Performs component-wise matrix multiplication.' },
                { label: 'outerProduct', insertText: 'outerProduct(${1:c}, ${2:r})', detail: 'mat outerProduct(vec c, vec r)', documentation: 'Calculates outer product of a column vector and a row vector.' },
                { label: 'transpose', insertText: 'transpose(${1:m})', detail: 'mat transpose(mat m)', documentation: 'Transposes matrix m.' },
                { label: 'determinant', insertText: 'determinant(${1:m})', detail: 'float determinant(mat m)', documentation: 'Returns the determinant of square matrix m.' },
                { label: 'inverse', insertText: 'inverse(${1:m})', detail: 'mat inverse(mat m)', documentation: 'Returns the inverse of matrix m.' },
                { label: 'lessThan', insertText: 'lessThan(${1:x}, ${2:y})', detail: 'bvec lessThan(vec x, vec y)', documentation: 'Component-wise x < y.' },
                { label: 'lessThanEqual', insertText: 'lessThanEqual(${1:x}, ${2:y})', detail: 'bvec lessThanEqual(vec x, vec y)', documentation: 'Component-wise x <= y.' },
                { label: 'greaterThan', insertText: 'greaterThan(${1:x}, ${2:y})', detail: 'bvec greaterThan(vec x, vec y)', documentation: 'Component-wise x > y.' },
                { label: 'greaterThanEqual', insertText: 'greaterThanEqual(${1:x}, ${2:y})', detail: 'bvec greaterThanEqual(vec x, vec y)', documentation: 'Component-wise x >= y.' },
                { label: 'equal', insertText: 'equal(${1:x}, ${2:y})', detail: 'bvec equal(vec x, vec y)', documentation: 'Component-wise x == y.' },
                { label: 'notEqual', insertText: 'notEqual(${1:x}, ${2:y})', detail: 'bvec notEqual(vec x, vec y)', documentation: 'Component-wise x != y.' },
                { label: 'any', insertText: 'any(${1:x})', detail: 'bool any(bvec x)', documentation: 'Returns true if any component of boolean vector x is true.' },
                { label: 'all', insertText: 'all(${1:x})', detail: 'bool all(bvec x)', documentation: 'Returns true if all components of boolean vector x are true.' },
                { label: 'not', insertText: 'not(${1:x})', detail: 'bvec not(bvec x)', documentation: 'Component-wise logical complement.' },
                { label: 'texture', insertText: 'texture(${1:iChannel0}, ${2:uv})', detail: 'vec4 texture(sampler2D sampler, vec2 uv)', documentation: 'Samples texture at coordinate uv.' },
                { label: 'textureLod', insertText: 'textureLod(${1:iChannel0}, ${2:uv}, ${3:lod})', detail: 'vec4 textureLod(sampler2D sampler, vec2 uv, float lod)', documentation: 'Samples texture at coordinate uv with explicit LOD level.' },
                { label: 'textureSize', insertText: 'textureSize(${1:iChannel0}, ${2:lod})', detail: 'ivec2 textureSize(sampler2D sampler, int lod)', documentation: 'Retrieves dimensions of texture image at specified level of detail.' },
                { label: 'texelFetch', insertText: 'texelFetch(${1:iChannel0}, ${2:ivec2(fragCoord)}, ${3:0})', detail: 'vec4 texelFetch(sampler2D sampler, ivec2 P, int lod)', documentation: 'Fetches single texel from texture without filtering.' },
                { label: 'dFdx', insertText: 'dFdx(${1:p})', detail: 'genType dFdx(genType p)', documentation: 'Returns partial derivative with respect to window x coordinate.' },
                { label: 'dFdy', insertText: 'dFdy(${1:p})', detail: 'genType dFdy(genType p)', documentation: 'Returns partial derivative with respect to window y coordinate.' },
                { label: 'fwidth', insertText: 'fwidth(${1:p})', detail: 'genType fwidth(genType p)', documentation: 'Returns sum of absolute derivatives: abs(dFdx(p)) + abs(dFdy(p)).' }
            ];

            var a_glsl_snippets = [
                {
                    label: 'mainImage',
                    detail: 'ShaderToy mainImage template',
                    documentation: 'Standard ShaderToy mainImage entrypoint with aspect-corrected normalized UV coordinates.',
                    insertText: [
                        'void mainImage(out vec4 fragColor, in vec2 fragCoord) {',
                        '    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;',
                        '',
                        '    vec3 col = vec3(0.0);',
                        '    ${0}',
                        '    fragColor = vec4(col, 1.0);',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'uv',
                    detail: 'Normalized coordinates snippet',
                    documentation: 'Calculates aspect-corrected screen UV with center at (0, 0).',
                    insertText: 'vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;'
                },
                {
                    label: 'rot',
                    detail: '2D rotation matrix',
                    documentation: 'Returns a 2x2 rotation matrix for angle a.',
                    insertText: [
                        'mat2 rot(float a) {',
                        '    float s = sin(a), c = cos(a);',
                        '    return mat2(c, -s, s, c);',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'palette',
                    detail: 'Cosine color palette (Inigo Quilez)',
                    documentation: 'Generates color palette from cosine formula: a + b * cos(2*PI*(c*t + d)).',
                    insertText: [
                        'vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {',
                        '    return a + b * cos(6.28318530718 * (c * t + d));',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'sdSphere',
                    detail: 'Sphere SDF primitive',
                    documentation: 'Signed distance field function for a sphere of radius r.',
                    insertText: [
                        'float sdSphere(vec3 p, float r) {',
                        '    return length(p) - r;',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'sdBox',
                    detail: 'Box SDF primitive',
                    documentation: 'Signed distance field function for an axis-aligned box with half-dimensions b.',
                    insertText: [
                        'float sdBox(vec3 p, vec3 b) {',
                        '    vec3 q = abs(p) - b;',
                        '    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'raymarch',
                    detail: 'Basic raymarching loop',
                    documentation: 'Standard raymarching loop stepping along ray rd from origin ro.',
                    insertText: [
                        'float rayMarch(vec3 ro, vec3 rd) {',
                        '    float dO = 0.0;',
                        '    for (int i = 0; i < ${1:100}; i++) {',
                        '        vec3 p = ro + rd * dO;',
                        '        float dS = ${2:map}(p);',
                        '        dO += dS;',
                        '        if (dO > ${3:100.0} || abs(dS) < ${4:0.001}) break;',
                        '    }',
                        '    return dO;',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'hash21',
                    detail: '2D to 1D pseudo-random hash',
                    documentation: 'Generates deterministic pseudo-random float in [0.0, 1.0) from vec2 coordinate.',
                    insertText: [
                        'float hash21(vec2 p) {',
                        '    p = fract(p * vec2(123.34, 456.21));',
                        '    p += dot(p, p + 45.32);',
                        '    return fract(p.x * p.y);',
                        '}'
                    ].join('\n')
                },
                {
                    label: 'PI',
                    detail: '#define PI 3.14159265359',
                    documentation: 'Standard PI constant macro definition.',
                    insertText: '#define PI 3.14159265359'
                },
                {
                    label: 'TAU',
                    detail: '#define TAU 6.28318530718',
                    documentation: 'Standard TAU (2*PI) constant macro definition.',
                    insertText: '#define TAU 6.28318530718'
                }
            ];

            var a_swizzles = [
                'x', 'y', 'z', 'w',
                'r', 'g', 'b', 'a',
                'xy', 'xz', 'yz', 'zw',
                'rg', 'rb', 'gb', 'ba',
                'xyz', 'rgb', 'xyw', 'yzw',
                'xyzw', 'rgba', 'st', 'stp', 'stpq'
            ];

            var a_glsl_directives = [
                {
                    label: '#define',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'preprocessor macro definition',
                    documentation: 'Defines a preprocessor macro or constant.',
                    insertText: '#define ${1:NAME} ${2:VALUE}'
                },
                {
                    label: '#define PI',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: '#define PI 3.14159265359',
                    documentation: 'Standard PI constant macro definition.',
                    insertText: '#define PI 3.14159265359'
                },
                {
                    label: '#define TAU',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: '#define TAU 6.28318530718',
                    documentation: 'Standard TAU (2*PI) constant macro definition.',
                    insertText: '#define TAU 6.28318530718'
                },
                {
                    label: '#undef',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'undefine preprocessor macro',
                    documentation: 'Undefines a previously defined macro.',
                    insertText: '#undef ${1:NAME}'
                },
                {
                    label: '#ifdef',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'conditional compilation (if defined)',
                    documentation: 'Compiles enclosed code only if macro is defined.',
                    insertText: [
                        '#ifdef ${1:MACRO}',
                        '${0}',
                        '#endif'
                    ].join('\n')
                },
                {
                    label: '#ifndef',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'conditional compilation (if not defined)',
                    documentation: 'Compiles enclosed code only if macro is not defined.',
                    insertText: [
                        '#ifndef ${1:MACRO}',
                        '${0}',
                        '#endif'
                    ].join('\n')
                },
                {
                    label: '#if',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'conditional compilation',
                    documentation: 'Compiles enclosed code if constant expression is non-zero.',
                    insertText: [
                        '#if ${1:CONDITION}',
                        '${0}',
                        '#endif'
                    ].join('\n')
                },
                {
                    label: '#elif',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'alternative conditional branch',
                    documentation: 'Alternative branch for #if directive.',
                    insertText: '#elif ${1:CONDITION}'
                },
                {
                    label: '#else',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'default conditional branch',
                    documentation: 'Default branch for #if or #ifdef directive.',
                    insertText: '#else'
                },
                {
                    label: '#endif',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'end conditional block',
                    documentation: 'Closes a conditional compilation block.',
                    insertText: '#endif'
                },
                {
                    label: '#version',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'GLSL version specification',
                    documentation: 'Specifies the GLSL language version.',
                    insertText: '#version ${1:300 es}'
                },
                {
                    label: '#extension',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'compiler extension behavior',
                    documentation: 'Controls compiler behavior for specific GLSL extensions.',
                    insertText: '#extension ${1:extension_name} : ${2:enable}'
                },
                {
                    label: '#pragma',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    detail: 'compiler pragma directive',
                    documentation: 'Passes implementation-dependent instructions to compiler.',
                    insertText: '#pragma ${1:instruction}'
                }
            ];

            monaco.languages.registerCompletionItemProvider('glsl', {
                triggerCharacters: ['.', '#'],
                provideCompletionItems: function(model, position) {
                    var o_word = model.getWordUntilPosition(position);
                    var o_range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: o_word.startColumn,
                        endColumn: o_word.endColumn
                    };
                    var s_line_content = model.getLineContent(position.lineNumber);
                    var b_is_dot_access = o_word.startColumn > 1 && s_line_content.charAt(o_word.startColumn - 2) === '.';

                    var b_has_hash_prefix = o_word.word && o_word.word.charAt(0) === '#';
                    var b_has_preceding_hash = !b_has_hash_prefix && o_word.startColumn > 1 && s_line_content.charAt(o_word.startColumn - 2) === '#';
                    var b_is_hash_access = b_has_hash_prefix || b_has_preceding_hash;

                    var a_suggestions = [];

                    if (b_is_dot_access) {
                        a_swizzles.forEach(function(s_swizzle) {
                            a_suggestions.push({
                                label: s_swizzle,
                                kind: monaco.languages.CompletionItemKind.Field,
                                detail: 'swizzle: .' + s_swizzle,
                                insertText: s_swizzle,
                                range: o_range
                            });
                        });
                        return { suggestions: a_suggestions };
                    }

                    if (b_is_hash_access) {
                        var n_hash_start_col = b_has_preceding_hash ? (o_word.startColumn - 1) : o_word.startColumn;
                        var o_hash_range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: n_hash_start_col,
                            endColumn: o_word.endColumn
                        };

                        a_glsl_directives.forEach(function(o_dir) {
                            a_suggestions.push({
                                label: o_dir.label,
                                kind: o_dir.kind,
                                detail: o_dir.detail,
                                documentation: o_dir.documentation,
                                insertText: o_dir.insertText,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: o_hash_range
                            });
                        });
                        return { suggestions: a_suggestions };
                    }

                    a_glsl_keywords.forEach(function(s_kw) {
                        a_suggestions.push({
                            label: s_kw,
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: s_kw,
                            range: o_range
                        });
                    });

                    a_glsl_types.forEach(function(o_t) {
                        a_suggestions.push({
                            label: o_t.label,
                            kind: monaco.languages.CompletionItemKind.TypeParameter,
                            detail: o_t.detail,
                            insertText: o_t.label,
                            range: o_range
                        });
                    });

                    a_shadertoy_builtins.forEach(function(o_b) {
                        a_suggestions.push({
                            label: o_b.label,
                            kind: monaco.languages.CompletionItemKind.Variable,
                            detail: o_b.detail,
                            documentation: o_b.documentation,
                            insertText: o_b.label,
                            range: o_range
                        });
                    });

                    a_glsl_functions.forEach(function(o_fn) {
                        a_suggestions.push({
                            label: o_fn.label,
                            kind: monaco.languages.CompletionItemKind.Function,
                            detail: o_fn.detail,
                            documentation: o_fn.documentation,
                            insertText: o_fn.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: o_range
                        });
                    });

                    a_glsl_snippets.forEach(function(o_sn) {
                        a_suggestions.push({
                            label: o_sn.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            detail: o_sn.detail,
                            documentation: o_sn.documentation,
                            insertText: o_sn.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: o_range
                        });
                    });

                    a_glsl_directives.forEach(function(o_dir) {
                        a_suggestions.push({
                            label: o_dir.label,
                            kind: o_dir.kind,
                            detail: o_dir.detail,
                            documentation: o_dir.documentation,
                            insertText: o_dir.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: o_range
                        });
                    });

                    return { suggestions: a_suggestions };
                }
            });
        },

        handleErrors: function(errors, isError, errorStr, fromScript, editor) {
            var monacoErrors = errors.map(function(shError) {
                return {
                    startLineNumber: shError.line.parent.lines.findIndex(function(p) { return Array.isArray(p.widgets); }) + 1,
                    startColumn: 0,
                    endLineNumber: shError.height,
                    endColumn: shError.line.text.length + 1,
                    message: errorStr,
                    severity: 8
                };
            });
            window.monaco.editor.setModelMarkers(editor.getModel(), 'owner', monacoErrors);
        },

        setCompilationErrorsHandler: function(editor) {
            var self = this;
            var defaultHandler = window.ShaderToy.prototype.SetErrors;

            window.ShaderToy.prototype.SetErrors = function(isError, errorStr, fromScript) {
                defaultHandler.call(this, isError, errorStr, fromScript);

                if (isError) {
                    self.handleErrors(this.mErrors, isError, errorStr, fromScript, editor);
                } else {
                    window.monaco.editor.setModelMarkers(editor.getModel(), 'owner', []);
                }
            };
        },

        loadMonacoEditor: function(monacoAssetsData) {
            if (this.b_monaco_initialized) {
                return;
            }
            this.b_monaco_initialized = true;

            var self = this;
            var o_script = document.createElement('script');
            o_script.type = 'text/javascript';
            o_script.src = monacoAssetsData.monacoLoader;
            document.head.appendChild(o_script);

            var registerEditorEvents = function() {
                if (!window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[window.gShaderToy.mActiveDoc]) {
                    setTimeout(registerEditorEvents, 100);
                    return;
                }

                self.setupGlslLanguage(window.monaco);

                self.o_editor_monaco = window.monaco.editor.create(document.getElementById('editor'), {
                    value: window.gShaderToy.mPass[window.gShaderToy.mActiveDoc].mDocs.getValue(),
                    language: 'glsl',
                    theme: 'vs-dark',
                    mouseWheelZoom: true,
                    showUnused: true,
                    smoothScrolling: true,
                    bracketPairColorization: true
                });

                if (window.ToyPlug && window.ToyPlug.editPage) {
                    window.ToyPlug.editPage.o_editor_monaco = self.o_editor_monaco;
                    window.ToyPlug.editPage.syncActiveDocToMonaco = function() { self.syncActiveDocToMonaco(); };
                    window.ToyPlug.editPage.forceSyncMonacoToActiveDoc = function() { self.forceSyncMonacoToActiveDoc(); };
                }

                window.onresize = function() {
                    if (self.o_editor_monaco) {
                        self.o_editor_monaco.layout();
                    }
                };

                self.o_editor_monaco.getModel().onDidChangeContent(function() {
                    self.syncMonacoToActiveDoc();
                });

                var o_monaco_el = document.querySelector('.monaco-editor');
                if (o_monaco_el) {
                    o_monaco_el.addEventListener('keydown', function(e) {
                        if (e.key === 's' && (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)) {
                            e.preventDefault();
                            var o_save_btn = document.querySelector('#saveButton');
                            if (o_save_btn) o_save_btn.click();
                        }
                        if (e.key === 'Enter' && (navigator.platform.match('Mac') ? e.metaKey : e.altKey)) {
                            e.preventDefault();
                            self.syncMonacoToActiveDoc();
                            var o_compile_btn = document.querySelector('#compileButton');
                            if (o_compile_btn) o_compile_btn.click();
                        }
                    }, false);
                }

                if (window.ToyPlug && window.ToyPlug.editPage && window.ToyPlug.editPage.f_display_editor) {
                    if (self.state.monaco === true) {
                        window.ToyPlug.editPage.f_display_editor('#editor .monaco-editor', true);
                    } else {
                        window.ToyPlug.editPage.f_display_editor('#editor .CodeMirror', false);
                    }
                }

                self.setCompilationErrorsHandler(self.o_editor_monaco);
            };

            o_script.onload = function() {
                window.require.config({ paths: { vs: monacoAssetsData.monacoEditorVSPath } });
                window.require(['vs/editor/editor.main'], registerEditorEvents);
            };

            var f_ChangePass_old = window.ShaderToy.prototype.ChangePass;
            window.ShaderToy.prototype.ChangePass = function(n_id) {
                var n_prev_active_doc = this.mActiveDoc;
                var s_prev_monaco_code = null;

                if (self.isMonacoSelected()) {
                    if (self.o_editor_monaco && self.o_editor_monaco.getModel) {
                        s_prev_monaco_code = self.o_editor_monaco.getModel().getValue();
                    }
                    self.forceSyncMonacoToActiveDoc();
                }

                f_ChangePass_old.call(this, n_id);

                if (typeof s_prev_monaco_code === 'string' && this.mPass[n_prev_active_doc] && this.mPass[n_prev_active_doc].mDocs) {
                    if (this.mPass[n_prev_active_doc].mDocs.getValue() !== s_prev_monaco_code) {
                        this.mPass[n_prev_active_doc].mDocs.setValue(s_prev_monaco_code);
                        this.mNeedsSave = true;
                    }
                }

                self.syncActiveDocToMonaco();
            };

            if (!document.getElementById('editorManager')) {
                var s_html_editor_choice = [
                    '<div id="editorManager" style="margin-bottom: 5px">',
                    '    <div onclick="ToyPlug.editPage.f_display_editor(\'#editor .CodeMirror\', false)" class="tab"><label>Orginal Shadertoy Editor</label></div>',
                    '    <div onclick="ToyPlug.editPage.f_display_editor(\'#editor .monaco-editor\', true)" class="tab"><label>VScode (Monaco) Editor</label></div>',
                    '</div>'
                ].join('\n');

                var o_div_html_editor_choice = document.createElement('div');
                o_div_html_editor_choice.innerHTML = s_html_editor_choice;

                var o_block1 = document.querySelector('.block1');
                if (o_block1) {
                    o_block1.insertBefore(o_div_html_editor_choice, o_block1.firstChild);
                }
            }
        }
    };

    window.ToyPlug = window.ToyPlug || {};
    window.ToyPlug.monaco = ToyPlugMonaco;

    ToyPlugMonaco.init();
})();

