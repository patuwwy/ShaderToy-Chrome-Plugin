(function shadertoyPluginMonaco() {
    'use strict';

    var STATE_STORAGE_KEY = 'STE-state';

    var ToyPlugMonaco = {
        state: {},
        o_editor_monaco: null,
        b_glsl_language_registered: false,
        b_monaco_initialized: false,
        n_live_debounce_ms: 800,
        b_live_validation_throttled: false,
        o_view_states: {},

        init: function() {
            var self = this;
            this.state = JSON.parse(window.localStorage.getItem(STATE_STORAGE_KEY) || '{}');
            this.o_view_states = {};

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

        getOrCreateModelForPass: function(n_id) {
            if (!window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[n_id]) {
                return null;
            }

            var o_pass = window.gShaderToy.mPass[n_id];
            if (o_pass.mMonacoModel && !o_pass.mMonacoModel.isDisposed()) {
                return o_pass.mMonacoModel;
            }

            var s_initial_code = (o_pass.mDocs && typeof o_pass.mDocs.getValue === 'function')
                ? o_pass.mDocs.getValue()
                : '';

            var uri = window.monaco.Uri.parse('inmemory://shadertoy/pass_' + n_id + '.glsl');
            var existingModel = window.monaco.editor.getModel(uri);
            if (existingModel && !existingModel.isDisposed()) {
                existingModel.dispose();
            }

            var o_model = window.monaco.editor.createModel(s_initial_code, 'glsl', uri);
            o_pass.mMonacoModel = o_model;

            var self = this;
            o_model.onDidChangeContent(function() {
                self.syncPassFromModel(n_id, o_model);
            });

            return o_model;
        },

        syncPassFromModel: function(n_pass_id, o_model) {
            if (!window.gShaderToy || !window.gShaderToy.mPass || !window.gShaderToy.mPass[n_pass_id]) {
                return;
            }

            var o_pass = window.gShaderToy.mPass[n_pass_id];
            if (!o_pass.mDocs || typeof o_pass.mDocs.getValue !== 'function') {
                return;
            }

            var s_code = o_model.getValue();
            if (o_pass.mDocs.getValue() !== s_code) {
                o_pass.mDocs.setValue(s_code);
                window.gShaderToy.mNeedsSave = true;
            }

            if (window.gShaderToy.mActiveDoc === n_pass_id && window.gShaderToy.mCodeEditor && window.gShaderToy.mCodeEditor.getValue && window.gShaderToy.mCodeEditor.setValue) {
                if (window.gShaderToy.mCodeEditor.getValue() !== s_code) {
                    window.gShaderToy.mCodeEditor.setValue(s_code);
                }
            }
        },

        syncMonacoToActiveDoc: function() {
            if (!this.isMonacoSelected() || !this.o_editor_monaco || !window.gShaderToy) {
                return;
            }
            var n_active_id = window.gShaderToy.mActiveDoc;
            var o_model = this.o_editor_monaco.getModel();
            if (o_model) {
                this.syncPassFromModel(n_active_id, o_model);
            }
        },

        forceSyncMonacoToActiveDoc: function() {
            if (!this.o_editor_monaco || !window.gShaderToy) {
                return;
            }
            var n_active_id = window.gShaderToy.mActiveDoc;
            var o_model = this.o_editor_monaco.getModel();
            if (o_model) {
                this.syncPassFromModel(n_active_id, o_model);
            }
        },

        syncActiveDocToMonaco: function() {
            if (!this.o_editor_monaco || !window.gShaderToy || !window.gShaderToy.mPass) {
                return;
            }

            var n_active_id = window.gShaderToy.mActiveDoc;
            var o_pass = window.gShaderToy.mPass[n_active_id];
            if (!o_pass || !o_pass.mDocs) {
                return;
            }

            var o_target_model = this.getOrCreateModelForPass(n_active_id);
            if (!o_target_model) {
                return;
            }

            var s_code = o_pass.mDocs.getValue();
            if (o_target_model.getValue() !== s_code) {
                o_target_model.setValue(s_code);
            }

            if (this.o_editor_monaco.getModel() !== o_target_model) {
                this.o_editor_monaco.setModel(o_target_model);
                if (this.o_view_states && this.o_view_states[n_active_id]) {
                    this.o_editor_monaco.restoreViewState(this.o_view_states[n_active_id]);
                }
            }
        },

        setupGlslLanguage: function(monaco) {
            if (this.b_glsl_language_registered) {
                return;
            }
            this.b_glsl_language_registered = true;
            var self = this;

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

            var o_glsl_docs = {
                iResolution: {
                    signature: 'uniform vec3 iResolution;',
                    description: '**Viewport resolution** (in pixels):\n- `iResolution.x` — viewport width in pixels\n- `iResolution.y` — viewport height in pixels\n- `iResolution.z` — pixel aspect ratio (`x / y`)'
                },
                iTime: {
                    signature: 'uniform float iTime;',
                    description: '**Playback time**: elapsed shader playback time in seconds.'
                },
                iTimeDelta: {
                    signature: 'uniform float iTimeDelta;',
                    description: '**Delta time**: render duration of the previous frame in seconds (dt).'
                },
                iFrame: {
                    signature: 'uniform int iFrame;',
                    description: '**Frame counter**: sequential frame index since playback started or reset (0, 1, 2, ...).'
                },
                iFrameRate: {
                    signature: 'uniform float iFrameRate;',
                    description: '**Frame rate**: estimated playback frame rate in frames per second (FPS).'
                },
                iMouse: {
                    signature: 'uniform vec4 iMouse;',
                    description: '**Mouse coordinates** (in pixels):\n- `iMouse.xy` — current mouse position (while button is held, or last position when released)\n- `iMouse.zw` — mouse click down coordinates\n- `iMouse.z > 0.0` — left mouse button is currently pressed\n- `iMouse.w > 0.0` — mouse button was clicked in this frame'
                },
                iDate: {
                    signature: 'uniform vec4 iDate;',
                    description: '**Current date & time**:\n- `iDate.x` — Year (e.g. 2026)\n- `iDate.y` — Month (1 - 12)\n- `iDate.z` — Day (1 - 31)\n- `iDate.w` — Time in seconds since midnight (`hours * 3600 + minutes * 60 + seconds`)'
                },
                iSampleRate: {
                    signature: 'uniform float iSampleRate;',
                    description: '**Sound sample rate**: output audio sample frequency in Hz (typically 44100.0).'
                },
                iChannel0: {
                    signature: 'uniform sampler2D iChannel0;',
                    description: '**Input channel 0**: texture, buffer, audio, keyboard, or video bound to slot 0.'
                },
                iChannel1: {
                    signature: 'uniform sampler2D iChannel1;',
                    description: '**Input channel 1**: texture, buffer, audio, keyboard, or video bound to slot 1.'
                },
                iChannel2: {
                    signature: 'uniform sampler2D iChannel2;',
                    description: '**Input channel 2**: texture, buffer, audio, keyboard, or video bound to slot 2.'
                },
                iChannel3: {
                    signature: 'uniform sampler2D iChannel3;',
                    description: '**Input channel 3**: texture, buffer, audio, keyboard, or video bound to slot 3.'
                },
                iChannelResolution: {
                    signature: 'uniform vec3 iChannelResolution[4];',
                    description: '**Channel resolutions**: array of vec3 containing width, height, and depth/aspect of each input channel.'
                },
                fragCoord: {
                    signature: 'in vec2 fragCoord;',
                    description: '**Fragment coordinates**: pixel position ranging from (0.5, 0.5) to (iResolution.x - 0.5, iResolution.y - 0.5). Origin (0, 0) is at bottom-left.'
                },
                fragColor: {
                    signature: 'out vec4 fragColor;',
                    description: '**Fragment color output**: output RGBA color of the pixel, each component typically in [0.0, 1.0].'
                },
                radians: {
                    signature: 'genType radians(genType degrees)',
                    description: 'Converts degrees to radians: `degrees * (PI / 180.0)`.'
                },
                degrees: {
                    signature: 'genType degrees(genType radians)',
                    description: 'Converts radians to degrees: `radians * (180.0 / PI)`.'
                },
                sin: {
                    signature: 'genType sin(genType angle)',
                    description: 'Computes the trigonometric sine of the angle in radians.'
                },
                cos: {
                    signature: 'genType cos(genType angle)',
                    description: 'Computes the trigonometric cosine of the angle in radians.'
                },
                tan: {
                    signature: 'genType tan(genType angle)',
                    description: 'Computes the trigonometric tangent: `sin(angle) / cos(angle)`.'
                },
                asin: {
                    signature: 'genType asin(genType x)',
                    description: 'Computes arcsine in [-PI/2, PI/2]. Undefined if `abs(x) > 1.0`.'
                },
                acos: {
                    signature: 'genType acos(genType x)',
                    description: 'Computes arccosine in [0, PI]. Undefined if `abs(x) > 1.0`.'
                },
                atan: {
                    signature: 'genType atan(genType y, genType x)\ngenType atan(genType y_over_x)',
                    description: 'Computes arc-tangent. Two-argument form returns angle in [-PI, PI] evaluating signs of both arguments (atan2).'
                },
                sinh: { signature: 'genType sinh(genType x)', description: 'Computes hyperbolic sine: `(e^x - e^(-x)) / 2.0`.' },
                cosh: { signature: 'genType cosh(genType x)', description: 'Computes hyperbolic cosine: `(e^x + e^(-x)) / 2.0`.' },
                tanh: { signature: 'genType tanh(genType x)', description: 'Computes hyperbolic tangent: `sinh(x) / cosh(x)`.' },
                asinh: { signature: 'genType asinh(genType x)', description: 'Computes inverse hyperbolic sine.' },
                acosh: { signature: 'genType acosh(genType x)', description: 'Computes inverse hyperbolic cosine. Undefined if `x < 1.0`.' },
                atanh: { signature: 'genType atanh(genType x)', description: 'Computes inverse hyperbolic tangent. Undefined if `abs(x) >= 1.0`.' },
                pow: {
                    signature: 'genType pow(genType x, genType y)',
                    description: 'Calculates x raised to power y (`x^y`). Undefined if `x < 0.0`, or if `x == 0.0` and `y <= 0.0`.'
                },
                exp: {
                    signature: 'genType exp(genType x)',
                    description: 'Computes natural exponential `e^x`.'
                },
                log: {
                    signature: 'genType log(genType x)',
                    description: 'Computes natural logarithm `ln(x)`. Undefined if `x <= 0.0`.'
                },
                exp2: {
                    signature: 'genType exp2(genType x)',
                    description: 'Computes base-2 exponential `2^x`.'
                },
                log2: {
                    signature: 'genType log2(genType x)',
                    description: 'Computes base-2 logarithm `log2(x)`. Undefined if `x <= 0.0`.'
                },
                sqrt: {
                    signature: 'genType sqrt(genType x)',
                    description: 'Computes square root `sqrt(x)`. Undefined if `x < 0.0`.'
                },
                inversesqrt: {
                    signature: 'genType inversesqrt(genType x)',
                    description: 'Computes reciprocal square root `1.0 / sqrt(x)`. Highly optimized on GPU hardware.'
                },
                abs: {
                    signature: 'genType abs(genType x)',
                    description: 'Returns the absolute value `abs(x)`.'
                },
                sign: {
                    signature: 'genType sign(genType x)',
                    description: 'Returns `1.0` if `x > 0.0`, `0.0` if `x == 0.0`, and `-1.0` if `x < 0.0`.'
                },
                floor: {
                    signature: 'genType floor(genType x)',
                    description: 'Returns the largest integer less than or equal to x (floor).'
                },
                trunc: {
                    signature: 'genType trunc(genType x)',
                    description: 'Truncates fractional part towards zero.'
                },
                round: {
                    signature: 'genType round(genType x)',
                    description: 'Rounds x to the nearest integer.'
                },
                roundEven: {
                    signature: 'genType roundEven(genType x)',
                    description: 'Rounds x to nearest even integer (banker\'s rounding).'
                },
                ceil: {
                    signature: 'genType ceil(genType x)',
                    description: 'Returns the smallest integer greater than or equal to x (ceil).'
                },
                fract: {
                    signature: 'genType fract(genType x)',
                    description: 'Returns fractional part: `x - floor(x)`. Always in [0.0, 1.0).'
                },
                mod: {
                    signature: 'genType mod(genType x, genType y)\ngenType mod(genType x, float y)',
                    description: 'Modulo operation: `x - y * floor(x / y)`.'
                },
                min: {
                    signature: 'genType min(genType x, genType y)\ngenType min(genType x, float y)',
                    description: 'Returns the minimum of two values.'
                },
                max: {
                    signature: 'genType max(genType x, genType y)\ngenType max(genType x, float y)',
                    description: 'Returns the maximum of two values.'
                },
                clamp: {
                    signature: 'genType clamp(genType x, genType minVal, genType maxVal)\ngenType clamp(genType x, float minVal, float maxVal)',
                    description: 'Constrains x to lie between minVal and maxVal:\n`min(max(x, minVal), maxVal)`'
                },
                mix: {
                    signature: 'genType mix(genType x, genType y, genType a)\ngenType mix(genType x, genType y, float a)',
                    description: '**Linear interpolation (lerp)** between x and y:\n`x * (1.0 - a) + y * a`\nReturns `x` when `a == 0.0`, and `y` when `a == 1.0`.'
                },
                step: {
                    signature: 'genType step(genType edge, genType x)\ngenType step(float edge, genType x)',
                    description: 'Step function: returns `0.0` if `x < edge`, otherwise `1.0`.'
                },
                smoothstep: {
                    signature: 'genType smoothstep(genType edge0, genType edge1, genType x)\ngenType smoothstep(float edge0, float edge1, genType x)',
                    description: '**Smooth Hermite interpolation** between 0.0 and 1.0:\n```glsl\nt = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\nreturn t * t * (3.0 - 2.0 * t);\n```\nProvides smooth C1 transition with zero 1st derivatives at boundaries.'
                },
                isnan: { signature: 'genBType isnan(genType x)', description: 'Returns true if x is NaN (Not a Number).' },
                isinf: { signature: 'genBType isinf(genType x)', description: 'Returns true if x is positive or negative infinity.' },
                length: {
                    signature: 'float length(genType x)',
                    description: 'Calculates the Euclidean vector length (magnitude):\n`sqrt(x[0]*x[0] + x[1]*x[1] + ...)`'
                },
                distance: {
                    signature: 'float distance(genType p0, genType p1)',
                    description: 'Returns the Euclidean distance between points p0 and p1: `length(p0 - p1)`.'
                },
                dot: {
                    signature: 'float dot(genType x, genType y)',
                    description: 'Calculates scalar dot product: `x[0]*y[0] + x[1]*y[1] + ...`\nEquivalent to `length(x) * length(y) * cos(angle)`.'
                },
                cross: {
                    signature: 'vec3 cross(vec3 x, vec3 y)',
                    description: 'Calculates vector cross product. The result is perpendicular to both x and y.'
                },
                normalize: {
                    signature: 'genType normalize(genType x)',
                    description: 'Returns unit vector pointing in the same direction: `x / length(x)`.'
                },
                faceforward: {
                    signature: 'genType faceforward(genType N, genType I, genType Nref)',
                    description: 'Returns N oriented towards the viewer: returns N if `dot(Nref, I) < 0.0`, else `-N`.'
                },
                reflect: {
                    signature: 'genType reflect(genType I, genType N)',
                    description: 'Calculates reflection direction for incident vector I and surface normal N:\n`I - 2.0 * dot(N, I) * N`'
                },
                refract: {
                    signature: 'genType refract(genType I, genType N, float eta)',
                    description: 'Calculates refraction vector using Snell\'s law with index of refraction ratio eta. Returns 0.0 vector on total internal reflection.'
                },
                matrixCompMult: { signature: 'mat matrixCompMult(mat x, mat y)', description: 'Performs component-wise matrix multiplication.' },
                outerProduct: { signature: 'mat outerProduct(vec c, vec r)', description: 'Calculates outer product of column vector c and row vector r.' },
                transpose: { signature: 'mat transpose(mat m)', description: 'Transposes matrix m (flips rows and columns).' },
                determinant: { signature: 'float determinant(mat m)', description: 'Calculates determinant of square matrix m.' },
                inverse: { signature: 'mat inverse(mat m)', description: 'Computes inverse of matrix m such that `m * inverse(m) == identity`.' },
                lessThan: { signature: 'bvec lessThan(vec x, vec y)', description: 'Component-wise `x < y`.' },
                lessThanEqual: { signature: 'bvec lessThanEqual(vec x, vec y)', description: 'Component-wise `x <= y`.' },
                greaterThan: { signature: 'bvec greaterThan(vec x, vec y)', description: 'Component-wise `x > y`.' },
                greaterThanEqual: { signature: 'bvec greaterThanEqual(vec x, vec y)', description: 'Component-wise `x >= y`.' },
                equal: { signature: 'bvec equal(vec x, vec y)', description: 'Component-wise `x == y`.' },
                notEqual: { signature: 'bvec notEqual(vec x, vec y)', description: 'Component-wise `x != y`.' },
                any: { signature: 'bool any(bvec x)', description: 'Returns true if any component of boolean vector is true.' },
                all: { signature: 'bool all(bvec x)', description: 'Returns true if all components of boolean vector are true.' },
                not: { signature: 'bvec not(bvec x)', description: 'Logical NOT of boolean vector components.' },
                texture: {
                    signature: 'vec4 texture(sampler2D sampler, vec2 P)\nvec4 texture(samplerCube sampler, vec3 P)',
                    description: 'Samples texture at coordinates P with hardware-filtered mipmapping.'
                },
                textureLod: {
                    signature: 'vec4 textureLod(sampler2D sampler, vec2 P, float lod)',
                    description: 'Samples texture with explicit mipmap level of detail lod.'
                },
                textureSize: {
                    signature: 'ivec2 textureSize(sampler2D sampler, int lod)',
                    description: 'Retrieves dimensions of texture image at mipmap level lod.'
                },
                texelFetch: {
                    signature: 'vec4 texelFetch(sampler2D sampler, ivec2 P, int lod)',
                    description: 'Fetches single texel from texture without filtering using integer coordinates.'
                },
                dFdx: {
                    signature: 'genType dFdx(genType p)',
                    description: 'Partial derivative of p with respect to screen horizontal axis x.'
                },
                dFdy: {
                    signature: 'genType dFdy(genType p)',
                    description: 'Partial derivative of p with respect to screen vertical axis y.'
                },
                fwidth: {
                    signature: 'genType fwidth(genType p)',
                    description: 'Sum of absolute derivatives:\n`abs(dFdx(p)) + abs(dFdy(p))`\nIdeal for pixel-scale anti-aliasing.'
                },
                float: { signature: 'float', description: 'Single-precision 32-bit IEEE-754 floating point scalar.' },
                int: { signature: 'int', description: 'Signed 32-bit two\'s complement integer.' },
                uint: { signature: 'uint', description: 'Unsigned 32-bit integer.' },
                bool: { signature: 'bool', description: 'Boolean conditional type (`true` or `false`).' },
                vec2: { signature: 'vec2', description: '2D floating-point vector (`xy`, `rg`, `st`).' },
                vec3: { signature: 'vec3', description: '3D floating-point vector (`xyz`, `rgb`, `stp`).' },
                vec4: { signature: 'vec4', description: '4D floating-point vector (`xyzw`, `rgba`, `stpq`).' },
                mat2: { signature: 'mat2', description: '2x2 floating-point column-major matrix.' },
                mat3: { signature: 'mat3', description: '3x3 floating-point column-major matrix.' },
                mat4: { signature: 'mat4', description: '4x4 floating-point column-major matrix.' },
                sampler2D: { signature: 'sampler2D', description: 'Handle to a 2D texture unit.' },
                samplerCube: { signature: 'samplerCube', description: 'Handle to a cubemap texture unit.' },
                '#define': { signature: '#define NAME VALUE', description: 'Defines a preprocessor macro or constant value.' },
                '#undef': { signature: '#undef NAME', description: 'Undefines a previously declared preprocessor macro.' },
                '#ifdef': { signature: '#ifdef MACRO', description: 'Conditional compilation: executes block if `MACRO` is defined.' },
                '#ifndef': { signature: '#ifndef MACRO', description: 'Conditional compilation: executes block if `MACRO` is not defined.' },
                '#if': { signature: '#if CONDITION', description: 'Conditional compilation: executes block if expression is non-zero.' },
                '#elif': { signature: '#elif CONDITION', description: 'Alternative conditional branch.' },
                '#else': { signature: '#else', description: 'Default conditional branch.' },
                '#endif': { signature: '#endif', description: 'Closes a conditional compilation block.' },
                '#version': { signature: '#version 300 es', description: 'Specifies GLSL shading language version.' },
            };


            var f_get_line_count = function(source) {
                if (!source) return 0;
                if (typeof source.getLineCount === 'function') return source.getLineCount();
                if (typeof source.lineCount === 'function') return source.lineCount();
                if (typeof source.getValue === 'function') return source.getValue().split('\n').length;
                if (typeof source === 'string') return source.split('\n').length;
                return 0;
            };

            var f_get_line_content = function(source, lineNum) {
                if (!source || lineNum < 1) return '';
                if (typeof source.getLineContent === 'function') return source.getLineContent(lineNum);
                if (typeof source.getLine === 'function') return source.getLine(lineNum - 1) || '';
                if (typeof source.getValue === 'function') {
                    var lines = source.getValue().split('\n');
                    return lines[lineNum - 1] || '';
                }
                if (typeof source === 'string') {
                    var lines = source.split('\n');
                    return lines[lineNum - 1] || '';
                }
                return '';
            };

            var f_find_matching_brace_line = function(source, n_start_line, n_total_lines) {
                var n_depth = 0;
                var b_found_first = false;

                for (var lineIdx = n_start_line; lineIdx <= n_total_lines; lineIdx++) {
                    var s_line_str = f_get_line_content(source, lineIdx);
                    for (var charIdx = 0; charIdx < s_line_str.length; charIdx++) {
                        var ch = s_line_str.charAt(charIdx);
                        if (ch === '{') {
                            n_depth++;
                            b_found_first = true;
                        } else if (ch === '}') {
                            n_depth--;
                            if (b_found_first && n_depth === 0) {
                                return lineIdx;
                            }
                        }
                    }
                }
                return n_start_line;
            };

            var f_extract_preceding_doc = function(source, n_line_idx) {
                var a_doc_lines = [];
                for (var c = n_line_idx - 1; c >= 1; c--) {
                    var s_prev = f_get_line_content(source, c).trim();
                    if (!s_prev) {
                        break;
                    }
                    if (s_prev.indexOf('//') === 0) {
                        a_doc_lines.unshift(s_prev.replace(/^\/\/\s?/, ''));
                    } else if (s_prev.indexOf('*/') !== -1 || s_prev.indexOf('/*') !== -1 || s_prev.indexOf('*') === 0) {
                        a_doc_lines.unshift(s_prev.replace(/^(\/\*+|\*+|\*\/)\s?/, ''));
                    } else {
                        break;
                    }
                }
                return a_doc_lines.join('\n').trim();
            };

            var f_parse_glsl_symbols = function(source) {
                var n_line_count = f_get_line_count(source);
                var a_symbols = [];
                var o_def_map = {};

                var o_non_types = {
                    'return': 1, 'else': 1, 'case': 1, 'break': 1, 'continue': 1,
                    'discard': 1, 'if': 1, 'for': 1, 'while': 1, 'do': 1,
                    'switch': 1, 'default': 1
                };

                var o_symbol_kind = (window.monaco && window.monaco.languages && window.monaco.languages.SymbolKind) ? window.monaco.languages.SymbolKind : {
                    Function: 11,
                    Struct: 22,
                    Constant: 13,
                    Variable: 12
                };

                var o_fn_start_re = /^(\s*)([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)\s*\(/;
                var o_struct_re = /^(\s*)struct\s+([a-zA-Z_]\w*)\s*(\{)?/;
                var o_define_re = /^(\s*)#define\s+([a-zA-Z_]\w*)(?:\(([^)]*)\))?/;
                var o_const_re = /^(\s*)const\s+(?:[a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)/;
                var o_global_var_re = /^(\s*)([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)\s*(?:=\s*[^;]+)?\s*;/;

                for (var i = 1; i <= n_line_count; i++) {
                    var s_line = f_get_line_content(source, i);
                    var s_trimmed = s_line.trim();

                    if (s_trimmed.indexOf('//') === 0 || s_trimmed.indexOf('/*') === 0) {
                        continue;
                    }

                    // Struct definitions
                    var o_match = s_line.match(o_struct_re);
                    if (o_match) {
                        var s_struct_name = o_match[2];
                        var n_start_col = s_line.indexOf(s_struct_name) + 1;
                        var n_end_col = n_start_col + s_struct_name.length;
                        var n_struct_end_line = f_find_matching_brace_line(source, i, n_line_count);
                        var s_struct_doc = f_extract_preceding_doc(source, i);

                        o_def_map[s_struct_name] = {
                            line: i,
                            startCol: n_start_col,
                            endCol: n_end_col,
                            kind: 'struct',
                            name: s_struct_name,
                            signature: 'struct ' + s_struct_name,
                            documentation: s_struct_doc
                        };

                        a_symbols.push({
                            name: s_struct_name,
                            detail: 'struct',
                            kind: o_symbol_kind.Struct,
                            range: {
                                startLineNumber: i,
                                startColumn: 1,
                                endLineNumber: n_struct_end_line,
                                endColumn: (source.getLineMaxColumn ? source.getLineMaxColumn(n_struct_end_line) : (f_get_line_content(source, n_struct_end_line).length + 1))
                            },
                            selectionRange: {
                                startLineNumber: i,
                                startColumn: n_start_col,
                                endLineNumber: i,
                                endColumn: n_end_col
                            }
                        });
                        continue;
                    }

                    // #define macros
                    o_match = s_line.match(o_define_re);
                    if (o_match) {
                        var s_macro_name = o_match[2];
                        var n_macro_start_col = s_line.indexOf(s_macro_name) + 1;
                        var n_macro_end_col = n_macro_start_col + s_macro_name.length;
                        var s_macro_doc = f_extract_preceding_doc(source, i);

                        o_def_map[s_macro_name] = {
                            line: i,
                            startCol: n_macro_start_col,
                            endCol: n_macro_end_col,
                            kind: 'macro',
                            name: s_macro_name,
                            signature: s_trimmed,
                            documentation: s_macro_doc
                        };

                        a_symbols.push({
                            name: s_macro_name,
                            detail: o_match[3] ? '(' + o_match[3] + ')' : 'macro',
                            kind: o_symbol_kind.Constant,
                            range: {
                                startLineNumber: i,
                                startColumn: 1,
                                endLineNumber: i,
                                endColumn: (source.getLineMaxColumn ? source.getLineMaxColumn(i) : (s_line.length + 1))
                            },
                            selectionRange: {
                                startLineNumber: i,
                                startColumn: n_macro_start_col,
                                endLineNumber: i,
                                endColumn: n_macro_end_col
                            }
                        });
                        continue;
                    }

                    // const definitions
                    o_match = s_line.match(o_const_re);
                    if (o_match) {
                        var s_const_name = o_match[2];
                        var n_const_start = s_line.indexOf(s_const_name) + 1;
                        var n_const_end = n_const_start + s_const_name.length;
                        var s_const_doc = f_extract_preceding_doc(source, i);

                        o_def_map[s_const_name] = {
                            line: i,
                            startCol: n_const_start,
                            endCol: n_const_end,
                            kind: 'const',
                            name: s_const_name,
                            signature: s_trimmed.replace(/;.*$/, ''),
                            documentation: s_const_doc
                        };

                        a_symbols.push({
                            name: s_const_name,
                            detail: 'const',
                            kind: o_symbol_kind.Constant,
                            range: {
                                startLineNumber: i,
                                startColumn: 1,
                                endLineNumber: i,
                                endColumn: (source.getLineMaxColumn ? source.getLineMaxColumn(i) : (s_line.length + 1))
                            },
                            selectionRange: {
                                startLineNumber: i,
                                startColumn: n_const_start,
                                endLineNumber: i,
                                endColumn: n_const_end
                            }
                        });
                        continue;
                    }

                    // Function definitions
                    var o_fn_match = s_line.match(o_fn_start_re);
                    if (o_fn_match) {
                        var s_ret_type = o_fn_match[2];
                        var s_fn_name = o_fn_match[3];

                        if (!o_non_types[s_ret_type] && !o_non_types[s_fn_name]) {
                            var s_params = '';
                            var b_fn_valid = false;
                            var n_closing_line = i;

                            if (s_line.indexOf(')') !== -1) {
                                var n_paren_open = s_line.indexOf('(');
                                var n_paren_close = s_line.indexOf(')', n_paren_open);
                                s_params = s_line.substring(n_paren_open + 1, n_paren_close).trim();
                                b_fn_valid = true;
                            } else {
                                var a_param_chunks = [s_line.substring(s_line.indexOf('(') + 1)];
                                for (var m = i + 1; m <= Math.min(n_line_count, i + 8); m++) {
                                    var s_m_line = f_get_line_content(source, m);
                                    var n_close_idx = s_m_line.indexOf(')');
                                    if (n_close_idx !== -1) {
                                        a_param_chunks.push(s_m_line.substring(0, n_close_idx));
                                        n_closing_line = m;
                                        b_fn_valid = true;
                                        break;
                                    } else {
                                        a_param_chunks.push(s_m_line);
                                    }
                                }
                                if (b_fn_valid) {
                                    s_params = a_param_chunks.join(' ').replace(/\s+/g, ' ').trim();
                                }
                            }

                            if (b_fn_valid) {
                                var s_end_line = f_get_line_content(source, n_closing_line).trim();
                                if (s_end_line.charAt(s_end_line.length - 1) !== ';') {
                                    var b_has_brace = (s_end_line.indexOf('{') !== -1);
                                    if (!b_has_brace) {
                                        for (var k = n_closing_line + 1; k <= Math.min(n_line_count, n_closing_line + 5); k++) {
                                            var s_next_trimmed = f_get_line_content(source, k).trim();
                                            if (!s_next_trimmed) continue;
                                            if (s_next_trimmed.indexOf('{') === 0) {
                                                b_has_brace = true;
                                            }
                                            break;
                                        }
                                    }

                                    if (b_has_brace) {
                                        var n_fn_start = s_line.indexOf(s_fn_name) + 1;
                                        var n_fn_end = n_fn_start + s_fn_name.length;
                                        var n_fn_end_line = f_find_matching_brace_line(source, n_closing_line, n_line_count);
                                        var s_fn_doc = f_extract_preceding_doc(source, i);
                                        var s_fn_sig = s_ret_type + ' ' + s_fn_name + '(' + s_params + ')';

                                        o_def_map[s_fn_name] = {
                                            line: i,
                                            startCol: n_fn_start,
                                            endCol: n_fn_end,
                                            kind: 'function',
                                            retType: s_ret_type,
                                            name: s_fn_name,
                                            params: s_params,
                                            signature: s_fn_sig,
                                            documentation: s_fn_doc
                                        };

                                        a_symbols.push({
                                            name: s_fn_name,
                                            detail: s_ret_type + ' (' + s_params + ')',
                                            kind: o_symbol_kind.Function,
                                            range: {
                                                startLineNumber: i,
                                                startColumn: 1,
                                                endLineNumber: n_fn_end_line,
                                                endColumn: (source.getLineMaxColumn ? source.getLineMaxColumn(n_fn_end_line) : (f_get_line_content(source, n_fn_end_line).length + 1))
                                            },
                                            selectionRange: {
                                                startLineNumber: i,
                                                startColumn: n_fn_start,
                                                endLineNumber: i,
                                                endColumn: n_fn_end
                                            }
                                        });
                                        continue;
                                    }
                                }
                            }
                        }
                    }

                    // Global variable definitions
                    var o_var_match = s_line.match(o_global_var_re);
                    if (o_var_match) {
                        var s_var_type = o_var_match[2];
                        var s_var_name = o_var_match[3];
                        if (!o_non_types[s_var_type] && !o_non_types[s_var_name] && !o_def_map[s_var_name]) {
                            var n_var_start = s_line.indexOf(s_var_name) + 1;
                            var n_var_end = n_var_start + s_var_name.length;
                            var s_var_doc = f_extract_preceding_doc(source, i);

                            o_def_map[s_var_name] = {
                                line: i,
                                startCol: n_var_start,
                                endCol: n_var_end,
                                kind: 'variable',
                                name: s_var_name,
                                signature: s_trimmed.replace(/;.*$/, ''),
                                documentation: s_var_doc
                            };

                            a_symbols.push({
                                name: s_var_name,
                                detail: s_var_type,
                                kind: o_symbol_kind.Variable,
                                range: {
                                    startLineNumber: i,
                                    startColumn: 1,
                                    endLineNumber: i,
                                    endColumn: (source.getLineMaxColumn ? source.getLineMaxColumn(i) : (s_line.length + 1))
                                },
                                selectionRange: {
                                    startLineNumber: i,
                                    startColumn: n_var_start,
                                    endLineNumber: i,
                                    endColumn: n_var_end
                                }
                            });
                        }
                    }
                }

                return { symbols: a_symbols, defMap: o_def_map };
            };

            var o_symbols_cache = {};
            var f_get_parsed_symbols = function(source) {
                if (!source) return { symbols: [], defMap: {} };
                var s_key = (source.id) || (source.uri ? source.uri.toString() : '');
                var n_version = typeof source.getVersionId === 'function' ? source.getVersionId() : 0;
                if (!s_key) {
                    s_key = (typeof source.getValue === 'function') ? ('doc_' + source.getValue().length) : 'default';
                    n_version = (typeof source.getValue === 'function') ? source.getValue().length : 0;
                }
                if (o_symbols_cache[s_key] && o_symbols_cache[s_key].version === n_version) {
                    return o_symbols_cache[s_key].data;
                }
                var o_data = f_parse_glsl_symbols(source);
                o_symbols_cache[s_key] = { version: n_version, data: o_data };
                return o_data;
            };

            var f_find_symbol_definition = function(model, s_target) {
                var o_parsed = f_get_parsed_symbols(model);
                if (o_parsed.defMap[s_target]) {
                    return { def: o_parsed.defMap[s_target], model: model, isCurrentModel: true };
                }

                if (window.gShaderToy && Array.isArray(window.gShaderToy.mPass)) {
                    for (var p = 0; p < window.gShaderToy.mPass.length; p++) {
                        var o_pass = window.gShaderToy.mPass[p];
                        if (o_pass && o_pass.mDocs && o_pass.mDocs !== model) {
                            var o_other_parsed = f_get_parsed_symbols(o_pass.mDocs);
                            if (o_other_parsed.defMap[s_target]) {
                                return { def: o_other_parsed.defMap[s_target], model: o_pass.mDocs, isCurrentModel: false, passIndex: p };
                            }
                        }
                    }
                }

                return null;
            };

            var f_find_local_definition = function(model, position, s_target) {
                if (!model || !position || !s_target) return null;
                var o_local_re = new RegExp('\\b([a-zA-Z_]\\w*)\\s+([a-zA-Z_]\\w*\\s*,\\s*)*\\b' + s_target + '\\b');
                for (var i = position.lineNumber; i >= 1; i--) {
                    var s_current_line = f_get_line_content(model, i);
                    var o_match = s_current_line.match(o_local_re);
                    if (o_match) {
                        var n_col = s_current_line.indexOf(s_target) + 1;
                        if (n_col > 0) {
                            var s_type = o_match[1];
                            var b_is_fn = /^\s*(?:void|bool|int|uint|float|vec[234]|mat[234])\s+[a-zA-Z_]\w*\s*\(/.test(s_current_line);
                            var s_sig = (b_is_fn ? '(parameter) ' : '(local variable) ') + s_type + ' ' + s_target;
                            return {
                                line: i,
                                startCol: n_col,
                                endCol: n_col + s_target.length,
                                signature: s_sig
                            };
                        }
                    }
                    if (/^\s*(?:void|bool|int|uint|float|vec[234]|mat[234])\s+[a-zA-Z_]\w*\s*\(/.test(s_current_line)) {
                        break;
                    }
                }
                return null;
            };

            monaco.languages.registerHoverProvider('glsl', {
                provideHover: function(model, position) {
                    var o_word = model.getWordAtPosition(position);
                    if (!o_word || !o_word.word) {
                        return null;
                    }

                    var s_line_content = model.getLineContent(position.lineNumber);
                    var s_word = o_word.word;

                    if (s_word.charAt(0) !== '#' && o_word.startColumn > 1 && s_line_content.charAt(o_word.startColumn - 2) === '#') {
                        s_word = '#' + s_word;
                    }

                    var o_doc = o_glsl_docs[s_word];
                    var o_range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: o_word.startColumn,
                        endColumn: o_word.endColumn
                    };

                    if (!o_doc) {
                        if (o_word.startColumn > 1 && s_line_content.charAt(o_word.startColumn - 2) === '.') {
                            var b_is_pos = /^[xyzw]+$/.test(s_word);
                            var b_is_col = /^[rgba]+$/.test(s_word);
                            var b_is_tex = /^[stpq]+$/.test(s_word);
                            if (b_is_pos || b_is_col || b_is_tex) {
                                var s_type = s_word.length === 1 ? 'float' : ('vec' + s_word.length);
                                return {
                                    range: o_range,
                                    contents: [
                                        { value: '```glsl\n(property) ' + s_type + ' .' + s_word + '\n```' },
                                        { value: '**Vector Swizzle**: selects components `.' + s_word + '` as a `' + s_type + '`.' }
                                    ]
                                };
                            }
                        }

                        // Check user-defined functions, structs, macros, consts
                        var o_user_sym = f_find_symbol_definition(model, s_word);
                        if (o_user_sym) {
                            var o_user_def = o_user_sym.def;
                            var a_user_contents = [
                                { value: '```glsl\n' + o_user_def.signature + '\n```' }
                            ];
                            if (o_user_def.documentation) {
                                a_user_contents.push({ value: o_user_def.documentation });
                            }
                            return {
                                range: o_range,
                                contents: a_user_contents
                            };
                        }

                        // Check local variable or parameter in current scope
                        var o_local = f_find_local_definition(model, position, s_word);
                        if (o_local) {
                            return {
                                range: o_range,
                                contents: [
                                    { value: '```glsl\n' + o_local.signature + '\n```' }
                                ]
                            };
                        }

                        return null;
                    }

                    var a_contents = [];
                    var s_sig = o_doc.signature;
                    if (/^iChannel[0-3]$/.test(s_word) && self && self.getChannelSamplerType) {
                        var n_ch_num = parseInt(s_word.replace('iChannel', ''), 10);
                        var s_dyn_type = self.getChannelSamplerType(n_ch_num, model.getValue());
                        if (s_dyn_type) {
                            s_sig = 'uniform ' + s_dyn_type + ' ' + s_word + ';';
                        }
                    }
                    if (s_sig) {
                        a_contents.push({ value: '```glsl\n' + s_sig + '\n```' });
                    }
                    if (o_doc.description) {
                        a_contents.push({ value: o_doc.description });
                    }

                    return {
                        range: o_range,
                        contents: a_contents
                    };
                }
            });

            var o_signatures = {
                vec2: [
                    { label: 'vec2(float x, float y)', documentation: 'Constructs a 2D vector from x and y components.', parameters: [{ label: 'float x' }, { label: 'float y' }] },
                    { label: 'vec2(float s)', documentation: 'Constructs a 2D vector with both components initialized to scalar s.', parameters: [{ label: 'float s' }] }
                ],
                vec3: [
                    { label: 'vec3(float x, float y, float z)', documentation: 'Constructs a 3D vector from x, y, and z components.', parameters: [{ label: 'float x' }, { label: 'float y' }, { label: 'float z' }] },
                    { label: 'vec3(vec2 xy, float z)', documentation: 'Constructs a 3D vector from 2D vector xy and float z.', parameters: [{ label: 'vec2 xy' }, { label: 'float z' }] },
                    { label: 'vec3(float s)', documentation: 'Constructs a 3D vector with all components initialized to scalar s.', parameters: [{ label: 'float s' }] }
                ],
                vec4: [
                    { label: 'vec4(float x, float y, float z, float w)', documentation: 'Constructs a 4D vector from x, y, z, and w components.', parameters: [{ label: 'float x' }, { label: 'float y' }, { label: 'float z' }, { label: 'float w' }] },
                    { label: 'vec4(vec3 xyz, float w)', documentation: 'Constructs a 4D vector from 3D vector xyz and float w.', parameters: [{ label: 'vec3 xyz' }, { label: 'float w' }] },
                    { label: 'vec4(vec2 xy, vec2 zw)', documentation: 'Constructs a 4D vector from two 2D vectors xy and zw.', parameters: [{ label: 'vec2 xy' }, { label: 'vec2 zw' }] },
                    { label: 'vec4(vec2 xy, float z, float w)', documentation: 'Constructs a 4D vector from 2D vector xy and floats z, w.', parameters: [{ label: 'vec2 xy' }, { label: 'float z' }, { label: 'float w' }] },
                    { label: 'vec4(float s)', documentation: 'Constructs a 4D vector with all components initialized to scalar s.', parameters: [{ label: 'float s' }] }
                ],
                mat2: [
                    { label: 'mat2(float m00, float m01, float m10, float m11)', documentation: 'Constructs a 2x2 column-major matrix from 4 floats.', parameters: [{ label: 'float m00' }, { label: 'float m01' }, { label: 'float m10' }, { label: 'float m11' }] },
                    { label: 'mat2(vec2 col0, vec2 col1)', documentation: 'Constructs a 2x2 matrix from two column vectors.', parameters: [{ label: 'vec2 col0' }, { label: 'vec2 col1' }] },
                    { label: 'mat2(float diag)', documentation: 'Constructs a 2x2 diagonal matrix.', parameters: [{ label: 'float diag' }] }
                ],
                mat3: [
                    { label: 'mat3(vec3 col0, vec3 col1, vec3 col2)', documentation: 'Constructs a 3x3 matrix from three column vectors.', parameters: [{ label: 'vec3 col0' }, { label: 'vec3 col1' }, { label: 'vec3 col2' }] },
                    { label: 'mat3(float diag)', documentation: 'Constructs a 3x3 diagonal matrix.', parameters: [{ label: 'float diag' }] }
                ],
                mat4: [
                    { label: 'mat4(vec4 col0, vec4 col1, vec4 col2, vec4 col3)', documentation: 'Constructs a 4x4 matrix from four column vectors.', parameters: [{ label: 'vec4 col0' }, { label: 'vec4 col1' }, { label: 'vec4 col2' }, { label: 'vec4 col3' }] },
                    { label: 'mat4(float diag)', documentation: 'Constructs a 4x4 diagonal matrix.', parameters: [{ label: 'float diag' }] }
                ]
            };

            for (var s_fn_key in o_glsl_docs) {
                if (Object.prototype.hasOwnProperty.call(o_glsl_docs, s_fn_key)) {
                    var o_fn_doc = o_glsl_docs[s_fn_key];
                    if (o_fn_doc.signature && o_fn_doc.signature.indexOf('(') !== -1) {
                        var a_fn_lines = o_fn_doc.signature.split('\n');
                        var a_fn_sigs = [];
                        for (var n_line_idx = 0; n_line_idx < a_fn_lines.length; n_line_idx++) {
                            var s_sig_line = a_fn_lines[n_line_idx].trim();
                            var o_sig_match = s_sig_line.match(/^(.+?\b([a-zA-Z0-9_]+))\s*\((.*)\)$/);
                            if (o_sig_match) {
                                var s_params_str = o_sig_match[3].trim();
                                var a_parsed_params = [];
                                if (s_params_str.length > 0) {
                                    var a_raw_params = s_params_str.split(',');
                                    for (var p = 0; p < a_raw_params.length; p++) {
                                        a_parsed_params.push({
                                            label: a_raw_params[p].trim()
                                        });
                                    }
                                }
                                a_fn_sigs.push({
                                    label: s_sig_line,
                                    documentation: o_fn_doc.description,
                                    parameters: a_parsed_params
                                });
                            }
                        }
                        if (a_fn_sigs.length > 0) {
                            o_signatures[s_fn_key] = a_fn_sigs;
                        }
                    }
                }
            }

            function f_find_function_call(s_text) {
                var n_depth = 0;
                var n_bracket_depth = 0;
                var n_param_index = 0;
                var i = s_text.length - 1;

                for (; i >= 0; i--) {
                    var c = s_text.charAt(i);
                    if (c === ';' || c === '{' || c === '}') {
                        return null;
                    }
                    if (c === ')') {
                        n_depth++;
                    } else if (c === '(') {
                        if (n_depth > 0) {
                            n_depth--;
                        } else {
                            break;
                        }
                    } else if (c === ']') {
                        n_bracket_depth++;
                    } else if (c === '[') {
                        if (n_bracket_depth > 0) {
                            n_bracket_depth--;
                        }
                    } else if (c === ',' && n_depth === 0 && n_bracket_depth === 0) {
                        n_param_index++;
                    }
                }

                if (i < 0) {
                    return null;
                }

                var j = i - 1;
                while (j >= 0 && /\s/.test(s_text.charAt(j))) {
                    j--;
                }
                var n_end = j + 1;
                while (j >= 0 && /[a-zA-Z0-9_]/.test(s_text.charAt(j))) {
                    j--;
                }
                var s_fn_name = s_text.substring(j + 1, n_end);
                if (!s_fn_name) {
                    return null;
                }

                return {
                    functionName: s_fn_name,
                    activeParameter: n_param_index
                };
            }

            monaco.languages.registerSignatureHelpProvider('glsl', {
                signatureHelpTriggerCharacters: ['(', ','],
                signatureHelpRetriggerCharacters: [','],
                provideSignatureHelp: function(model, position) {
                    var s_line_before_cursor = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
                    if (s_line_before_cursor.indexOf('//') !== -1) {
                        return null;
                    }

                    var n_start_line = Math.max(1, position.lineNumber - 4);
                    var s_text = model.getValueInRange({
                        startLineNumber: n_start_line,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });

                    var o_call = f_find_function_call(s_text);
                    if (!o_call) {
                        return null;
                    }

                    var a_sigs = o_signatures[o_call.functionName];
                    if (!a_sigs || a_sigs.length === 0) {
                        var o_user_fn = f_find_symbol_definition(model, o_call.functionName);
                        if (o_user_fn && o_user_fn.def.kind === 'function') {
                            var s_raw_params = o_user_fn.def.params;
                            var a_params = [];
                            if (s_raw_params) {
                                var a_split = s_raw_params.split(',');
                                for (var sp = 0; sp < a_split.length; sp++) {
                                    var s_p = a_split[sp].trim();
                                    if (s_p) {
                                        a_params.push({ label: s_p });
                                    }
                                }
                            }
                            a_sigs = [{
                                label: o_user_fn.def.signature,
                                documentation: o_user_fn.def.documentation || '',
                                parameters: a_params
                            }];
                        }
                    }

                    if (!a_sigs || a_sigs.length === 0) {
                        return null;
                    }

                    var n_active_sig = 0;
                    for (var s = 0; s < a_sigs.length; s++) {
                        if (a_sigs[s].parameters.length > o_call.activeParameter) {
                            n_active_sig = s;
                            break;
                        }
                    }

                    return {
                        value: {
                            signatures: a_sigs,
                            activeSignature: n_active_sig,
                            activeParameter: o_call.activeParameter
                        },
                        dispose: function() {}
                    };
                }
            });

            monaco.languages.registerDocumentSymbolProvider('glsl', {
                provideDocumentSymbols: function(model) {
                    var o_parsed = f_get_parsed_symbols(model);
                    return o_parsed.symbols;
                }
            });

            monaco.languages.registerDefinitionProvider('glsl', {
                provideDefinition: function(model, position) {
                    var o_word = model.getWordAtPosition(position);
                    if (!o_word || !o_word.word) {
                        return null;
                    }
                    var s_target = o_word.word;
                    var o_user_sym = f_find_symbol_definition(model, s_target);

                    if (o_user_sym && o_user_sym.isCurrentModel && model.uri) {
                        var o_def = o_user_sym.def;
                        return {
                            uri: model.uri,
                            range: {
                                startLineNumber: o_def.line,
                                startColumn: o_def.startCol,
                                endLineNumber: o_def.line,
                                endColumn: o_def.endCol
                            }
                        };
                    }

                    var o_local = f_find_local_definition(model, position, s_target);
                    if (o_local && model.uri) {
                        return {
                            uri: model.uri,
                            range: {
                                startLineNumber: o_local.line,
                                startColumn: o_local.startCol,
                                endLineNumber: o_local.line,
                                endColumn: o_local.endCol
                            }
                        };
                    }

                    return null;
                }
            });
        },

        handleErrors: function(errors, isError, errorStr, fromScript, editor, n_header_offset) {
            var o_editor = editor || this.o_editor_monaco;
            if (!o_editor || !o_editor.getModel) {
                return;
            }
            var o_model = o_editor.getModel();
            if (!o_model) {
                return;
            }

            if (!isError) {
                window.monaco.editor.setModelMarkers(o_model, 'owner', []);
                window.monaco.editor.setModelMarkers(o_model, 'shadertoy', []);
                return;
            }

            var a_monaco_markers = [];
            var n_total_lines = o_model.getLineCount();

            if (Array.isArray(errors) && errors.length > 0) {
                for (var i = 0; i < errors.length; i++) {
                    var shError = errors[i];
                    if (!shError) {
                        continue;
                    }

                    var n_line = -1;
                    if (shError.line) {
                        if (typeof shError.line.lineNo === 'function') {
                            n_line = shError.line.lineNo() + 1;
                        } else if (typeof shError.line === 'number') {
                            n_line = shError.line + 1;
                        } else if (window.gShaderToy && window.gShaderToy.mCodeEditor && typeof window.gShaderToy.mCodeEditor.getLineNumber === 'function') {
                            n_line = window.gShaderToy.mCodeEditor.getLineNumber(shError.line) + 1;
                        } else if (shError.line.parent && Array.isArray(shError.line.parent.lines)) {
                            var n_idx = shError.line.parent.lines.indexOf(shError.line);
                            if (n_idx !== -1) {
                                n_line = n_idx + 1;
                            }
                        }
                    }

                    var s_msg = '';
                    if (shError.node && shError.node.textContent) {
                        s_msg = shError.node.textContent.trim();
                    } else if (shError.text) {
                        s_msg = shError.text.trim();
                    }

                    if (n_line > 0) {
                        n_line = Math.max(1, Math.min(n_line, n_total_lines));
                        var s_line_text = o_model.getLineContent(n_line);
                        var n_start_col = 1;
                        var n_end_col = s_line_text.length + 1;

                        var o_token_match = s_msg.match(/['"]([^'"]+)['"]/);
                        if (o_token_match && o_token_match[1]) {
                            var s_token = o_token_match[1];
                            var n_token_idx = s_line_text.indexOf(s_token);
                            if (n_token_idx !== -1) {
                                n_start_col = n_token_idx + 1;
                                n_end_col = n_token_idx + 1 + s_token.length;
                            } else if (s_token === 'assign' || /cannot convert/i.test(s_msg) || /dimension mismatch/i.test(s_msg)) {
                                var n_eq_pos = s_line_text.indexOf('=');
                                if (n_eq_pos !== -1) {
                                    n_start_col = n_eq_pos + 1;
                                    n_end_col = n_eq_pos + 2;
                                } else {
                                    var n_first_non_ws = o_model.getLineFirstNonWhitespaceColumn(n_line);
                                    if (n_first_non_ws > 0) {
                                        n_start_col = n_first_non_ws;
                                    }
                                }
                            } else {
                                var n_first_non_ws = o_model.getLineFirstNonWhitespaceColumn(n_line);
                                if (n_first_non_ws > 0) {
                                    n_start_col = n_first_non_ws;
                                }
                            }
                        } else {
                            var n_non_ws = o_model.getLineFirstNonWhitespaceColumn(n_line);
                            if (n_non_ws > 0) {
                                n_start_col = n_non_ws;
                            }
                        }

                        if (n_end_col <= n_start_col) {
                            n_end_col = n_start_col + 1;
                        }

                        var b_is_warn = s_msg.toLowerCase().indexOf('warning') !== -1;
                        a_monaco_markers.push({
                            startLineNumber: n_line,
                            startColumn: n_start_col,
                            endLineNumber: n_line,
                            endColumn: n_end_col,
                            message: s_msg || errorStr,
                            severity: b_is_warn ? 4 : 8
                        });
                    }
                }
            }

            if (a_monaco_markers.length === 0 && typeof errorStr === 'string' && errorStr.length > 0) {
                var a_err_lines = errorStr.split('\n');
                var o_err_re = /^(ERROR|WARNING):\s*(?:\d+:)?(\d+)(?:\((\d+)\))?:\s*(.*)$/i;

                for (var j = 0; j < a_err_lines.length; j++) {
                    var s_raw_line = a_err_lines[j].trim();
                    var o_match = s_raw_line.match(o_err_re);
                    if (o_match) {
                        var s_sev = o_match[1].toUpperCase();
                        var n_parsed_line = parseInt(o_match[2], 10);
                        var n_parsed_col = o_match[3] ? parseInt(o_match[3], 10) : null;
                        var s_detail = o_match[4] ? o_match[4].trim() : s_raw_line;

                        if (typeof n_header_offset === 'number') {
                            n_parsed_line = n_parsed_line - n_header_offset;
                        }

                        if (n_parsed_line < 1 || n_parsed_line > n_total_lines) {
                            continue;
                        }

                        var s_line_content = o_model.getLineContent(n_parsed_line);
                        var n_sc = 1;
                        var n_ec = s_line_content.length + 1;

                        if (n_parsed_col !== null && n_parsed_col > 0 && n_parsed_col <= s_line_content.length + 1) {
                            n_sc = n_parsed_col;
                            n_ec = Math.min(s_line_content.length + 1, n_parsed_col + 1);
                        } else {
                            var o_t_match = s_detail.match(/['"]([^'"]+)['"]/);
                            if (o_t_match && o_t_match[1]) {
                                var s_raw_token = o_t_match[1];
                                var n_pos = s_line_content.indexOf(s_raw_token);
                                if (n_pos !== -1) {
                                    n_sc = n_pos + 1;
                                    n_ec = n_pos + 1 + s_raw_token.length;
                                } else if (s_raw_token === 'assign' || /cannot convert/i.test(s_detail) || /dimension mismatch/i.test(s_detail)) {
                                    var n_eq_idx = s_line_content.indexOf('=');
                                    if (n_eq_idx !== -1) {
                                        n_sc = n_eq_idx + 1;
                                        n_ec = n_eq_idx + 2;
                                    } else {
                                        var n_first_nw = o_model.getLineFirstNonWhitespaceColumn(n_parsed_line);
                                        if (n_first_nw > 0) {
                                            n_sc = n_first_nw;
                                        }
                                    }
                                } else {
                                    var n_first_nw = o_model.getLineFirstNonWhitespaceColumn(n_parsed_line);
                                    if (n_first_nw > 0) {
                                        n_sc = n_first_nw;
                                    }
                                }
                            } else {
                                var n_nw = o_model.getLineFirstNonWhitespaceColumn(n_parsed_line);
                                if (n_nw > 0) {
                                    n_sc = n_nw;
                                }
                            }
                        }

                        if (n_ec <= n_sc) {
                            n_ec = n_sc + 1;
                        }

                        a_monaco_markers.push({
                            startLineNumber: n_parsed_line,
                            startColumn: n_sc,
                            endLineNumber: n_parsed_line,
                            endColumn: n_ec,
                            message: s_detail || s_raw_line,
                            severity: (s_sev === 'WARNING' ? 4 : 8)
                        });
                    }
                }
            }

            window.monaco.editor.setModelMarkers(o_model, 'owner', []);
            window.monaco.editor.setModelMarkers(o_model, 'shadertoy', a_monaco_markers);
        },

        getChannelSamplerType: function(n_ch, s_user_code) {
            var n_active_id = (window.gShaderToy && typeof window.gShaderToy.mActiveDoc === 'number')
                ? window.gShaderToy.mActiveDoc
                : 0;

            var a_passes = (window.gShaderToy && window.gShaderToy.mEffect && window.gShaderToy.mEffect.mPasses) || [];
            var o_effect_pass = a_passes[n_active_id];
            var o_doc_pass = window.gShaderToy && window.gShaderToy.mPass && window.gShaderToy.mPass[n_active_id];
            var o_pass = o_effect_pass || o_doc_pass;

            if (o_pass) {
                if (typeof o_pass.mHeader === 'string') {
                    var o_hdr_match = o_pass.mHeader.match(new RegExp('uniform\\s+(samplerCube|sampler3D|sampler2D)\\s+iChannel' + n_ch + ';'));
                    if (o_hdr_match && o_hdr_match[1]) {
                        return o_hdr_match[1];
                    }
                }

                var a_inputs = o_pass.mInputs || (o_doc_pass && o_doc_pass.mInputs) || (o_effect_pass && o_effect_pass.mInputs);
                if (Array.isArray(a_inputs) && a_inputs[n_ch]) {
                    var o_input = a_inputs[n_ch];
                    var s_type = (o_input.mType || (o_input.mInfo && o_input.mInfo.mType) || o_input.type || '').toLowerCase();
                    if (s_type === 'cubemap' || s_type === 'cube') {
                        return 'samplerCube';
                    }
                    if (s_type === 'volume' || s_type === '3d') {
                        return 'sampler3D';
                    }
                    if (typeof o_input.mSrc === 'string') {
                        if (/cube/i.test(o_input.mSrc)) {
                            return 'samplerCube';
                        }
                        if (/volume/i.test(o_input.mSrc)) {
                            return 'sampler3D';
                        }
                    }
                }
            }

            if (typeof s_user_code === 'string') {
                var o_cube_usage = new RegExp('\\b(?:textureCube\\s*\\(\\s*iChannel' + n_ch + '\\b|texture(?:Lod)?\\s*\\(\\s*iChannel' + n_ch + '\\s*,\\s*(?:reflect|refract|normalize|vec3|[a-zA-Z0-9_]+\\.(?:xyz|rgb)))');
                if (o_cube_usage.test(s_user_code)) {
                    return 'samplerCube';
                }
            }

            return 'sampler2D';
        },

        getGlContext: function() {
            if (window.gShaderToy && window.gShaderToy.mEffect && window.gShaderToy.mEffect.mGLContext) {
                return window.gShaderToy.mEffect.mGLContext;
            }
            if (!this.o_gl_context) {
                var o_canvas = document.createElement('canvas');
                this.o_gl_context = o_canvas.getContext('webgl2') || o_canvas.getContext('webgl');
            }
            return this.o_gl_context;
        },

        validateShaderLive: function(editor) {
            var o_editor = editor || this.o_editor_monaco;
            if (!o_editor || !o_editor.getModel) {
                return;
            }
            var o_model = o_editor.getModel();
            if (!o_model || o_model.isDisposed()) {
                return;
            }

            var gl = this.getGlContext();
            if (!gl) {
                return;
            }

            var s_user_code = o_model.getValue();
            if (!s_user_code || s_user_code.trim().length === 0) {
                window.monaco.editor.setModelMarkers(o_model, 'owner', []);
                window.monaco.editor.setModelMarkers(o_model, 'shadertoy', []);
                return;
            }

            var s_common_code = '';
            var o_common_img = document.querySelector("img[src='/img/common.png']");
            if (o_common_img && o_common_img.parentNode && o_common_img.parentNode.id) {
                var n_common_id = parseInt(o_common_img.parentNode.id.replace(/\D/g, ''), 10);
                if (!isNaN(n_common_id) && window.gShaderToy && window.gShaderToy.mActiveDoc !== n_common_id && window.gShaderToy.mPass && window.gShaderToy.mPass[n_common_id] && window.gShaderToy.mPass[n_common_id].mDocs) {
                    s_common_code = window.gShaderToy.mPass[n_common_id].mDocs.getValue() + '\n';
                }
            }

            var s_ch0 = this.getChannelSamplerType(0, s_user_code);
            var s_ch1 = this.getChannelSamplerType(1, s_user_code);
            var s_ch2 = this.getChannelSamplerType(2, s_user_code);
            var s_ch3 = this.getChannelSamplerType(3, s_user_code);

            var a_header_parts = [
                '#version 300 es',
                'precision highp float;',
                'precision highp int;',
                '#define texture2D texture',
                '#define textureCube texture',
                '#define textureLod textureLod',
                'uniform vec3 iResolution;',
                'uniform float iTime;',
                'uniform float iTimeDelta;',
                'uniform float iFrameRate;',
                'uniform int iFrame;',
                'uniform float iChannelTime[4];',
                'uniform vec3 iChannelResolution[4];',
                'uniform vec4 iMouse;',
                'uniform vec4 iDate;',
                'uniform float iSampleRate;',
                'uniform ' + s_ch0 + ' iChannel0;',
                'uniform ' + s_ch1 + ' iChannel1;',
                'uniform ' + s_ch2 + ' iChannel2;',
                'uniform ' + s_ch3 + ' iChannel3;',
                'out vec4 fragColor;',
                '#define gl_FragColor fragColor'
            ];

            var s_base_header = a_header_parts.join('\n') + '\n';
            var s_full_header = s_base_header + (s_common_code ? s_common_code : '');
            var n_header_lines = s_full_header.split('\n').length - 1;

            var s_footer = '';
            if (s_user_code.indexOf('mainImage') !== -1) {
                s_footer = '\nvoid main() { mainImage(fragColor, gl_FragCoord.xy); }\n';
            } else if (s_user_code.indexOf('mainSound') !== -1) {
                s_footer = '\nvoid main() { mainSound(iTime); }\n';
            } else {
                s_footer = '\nvoid main() { fragColor = vec4(0.0); }\n';
            }

            var s_full_shader = s_full_header + s_user_code + s_footer;

            var o_shader = null;
            try {
                o_shader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(o_shader, s_full_shader);

                var n_compile_start = window.performance ? window.performance.now() : Date.now();
                gl.compileShader(o_shader);
                var n_compile_end = window.performance ? window.performance.now() : Date.now();
                var n_compile_duration = n_compile_end - n_compile_start;

                if (n_compile_duration > 35) {
                    this.n_live_debounce_ms = 2500;
                    if (n_compile_duration > 75) {
                        this.b_live_validation_throttled = true;
                    }
                } else if (this.n_live_debounce_ms > 800 && n_compile_duration < 20) {
                    this.n_live_debounce_ms = 800;
                    this.b_live_validation_throttled = false;
                }

                var b_ok = gl.getShaderParameter(o_shader, gl.COMPILE_STATUS);
                if (b_ok) {
                    window.monaco.editor.setModelMarkers(o_model, 'owner', []);
                    window.monaco.editor.setModelMarkers(o_model, 'shadertoy', []);
                } else {
                    var s_log = gl.getShaderInfoLog(o_shader);
                    if (s_log) {
                        this.handleErrors(null, true, s_log, false, o_editor, n_header_lines);
                    }
                }
            } catch (ignore) {
            } finally {
                if (o_shader && gl) {
                    try {
                        gl.deleteShader(o_shader);
                    } catch (ignoreDel) {}
                }
            }
        },

        setCompilationErrorsHandler: function(editor) {
            var self = this;
            var defaultHandler = window.ShaderToy.prototype.SetErrors;

            window.ShaderToy.prototype.SetErrors = function(isError, errorStr, fromScript) {
                defaultHandler.call(this, isError, errorStr, fromScript);

                var o_target_editor = editor || self.o_editor_monaco;
                if (isError) {
                    self.handleErrors(this.mErrors, isError, errorStr, fromScript, o_target_editor);
                } else if (o_target_editor && o_target_editor.getModel) {
                    self.b_live_validation_throttled = false;
                    window.monaco.editor.setModelMarkers(o_target_editor.getModel(), 'owner', []);
                    window.monaco.editor.setModelMarkers(o_target_editor.getModel(), 'shadertoy', []);
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

                // Initialize models for all passes so history and symbols are ready
                for (var p = 0; p < window.gShaderToy.mPass.length; p++) {
                    self.getOrCreateModelForPass(p);
                }

                var o_active_model = self.getOrCreateModelForPass(window.gShaderToy.mActiveDoc);

                self.o_editor_monaco = window.monaco.editor.create(document.getElementById('editor'), {
                    model: o_active_model,
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

                var n_validate_timer = null;
                self.o_editor_monaco.onDidChangeModelContent(function() {
                    if (self.b_live_validation_throttled) {
                        return;
                    }
                    clearTimeout(n_validate_timer);
                    n_validate_timer = setTimeout(function() {
                        self.validateShaderLive(self.o_editor_monaco);
                    }, self.n_live_debounce_ms || 800);
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

                if (self.o_editor_monaco && self.o_editor_monaco.getModel) {
                    if (!self.o_view_states) {
                        self.o_view_states = {};
                    }
                    self.o_view_states[n_prev_active_doc] = self.o_editor_monaco.saveViewState();
                    self.forceSyncMonacoToActiveDoc();
                }

                f_ChangePass_old.call(this, n_id);

                if (self.o_editor_monaco) {
                    var o_new_model = self.getOrCreateModelForPass(n_id);
                    if (o_new_model && self.o_editor_monaco.getModel() !== o_new_model) {
                        self.o_editor_monaco.setModel(o_new_model);
                        if (self.o_view_states && self.o_view_states[n_id]) {
                            self.o_editor_monaco.restoreViewState(self.o_view_states[n_id]);
                        }
                        self.o_editor_monaco.focus();
                    }
                }
            };

            if (!document.getElementById('editorManager')) {
                var s_html_editor_choice = [
                    '<div id="editorManager" style="margin-bottom: 5px">',
                    '    <div onclick="ToyPlug.editPage.f_display_editor(\'#editor .CodeMirror\', false)" class="tab"><label>Orginal Shadertoy Editor</label></div>',
                    '    <div onclick="ToyPlug.editPage.f_display_editor(\'#editor .monaco-editor\', true)" class="tab monaco"><label>Monaco</label><button id="monaco-keys-btn" type="button" class="monaco-help-btn" title="Monaco Shortcuts & Features">?</button></div>',
                    '    ',
                    '</div>'
                ].join('\n');

                var o_div_html_editor_choice = document.createElement('div');
                o_div_html_editor_choice.innerHTML = s_html_editor_choice;

                var o_block1 = document.querySelector('.block1');
                if (o_block1) {
                    o_block1.insertBefore(o_div_html_editor_choice, o_block1.firstChild);
                }
            } else {
                var o_em = document.getElementById('editorManager');
                if (o_em) {
                    var o_tabs = o_em.querySelectorAll('.tab label');
                    if (o_tabs && o_tabs[1] && o_tabs[1].textContent.indexOf('VScode') !== -1) {
                        o_tabs[1].textContent = 'Monaco';
                    }
                    if (!document.getElementById('monaco-keys-btn')) {
                        var o_btn = document.createElement('button');
                        o_btn.id = 'monaco-keys-btn';
                        o_btn.type = 'button';
                        o_btn.className = 'monaco-help-btn';
                        o_btn.title = 'Monaco Shortcuts & Features';
                        o_btn.innerHTML = '?';
                        o_em.appendChild(o_btn);
                    }
                }
            }

            var o_keys_btn = document.getElementById('monaco-keys-btn');
            if (o_keys_btn && !o_keys_btn.hasAttribute('data-bound')) {
                o_keys_btn.setAttribute('data-bound', 'true');
                o_keys_btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.showShortcutsModal();
                });
            }
        },

        showShortcutsModal: function() {
            var o_modal = document.getElementById('monaco-shortcuts-modal');
            if (o_modal) {
                o_modal.style.display = 'flex';
                return;
            }

            var isMac = /Mac/i.test(navigator.platform);
            var cmdKey = isMac ? 'Cmd' : 'Ctrl';
            var altKey = isMac ? 'Cmd' : 'Alt';

            var s_modal_html = [
                '<div id="monaco-shortcuts-modal">',
                '    <div class="msm-container" onclick="event.stopPropagation()">',
                '        <div class="msm-header">',
                '            <div class="msm-title">⌨️ Monaco Editor — Shortcuts & Features</div>',
                '            <button class="msm-close" type="button" title="Close (Esc)">✕</button>',
                '        </div>',
                '        <div class="msm-body">',
                '            <h3>Shortcuts</h3>',
                '            <div class="msm-grid">',
                '                <div class="msm-item"><span>Compile & Run</span><kbd>' + altKey + ' + Enter</kbd></div>',
                '                <div class="msm-item"><span>Save shader</span><kbd>' + cmdKey + ' + S</kbd></div>',
                '                <div class="msm-item"><span>Go to Definition</span><kbd>F12 / ' + cmdKey + ' + Click</kbd></div>',
                '                <div class="msm-item"><span>Symbol Outline</span><kbd>' + cmdKey + ' + Shift + O</kbd></div>',
                '                <div class="msm-item"><span>Autocomplete</span><kbd>' + cmdKey + ' + Space</kbd></div>',
                '                <div class="msm-item"><span>Signature Help</span><kbd>( , / ' + cmdKey + ' + Shift + Space</kbd></div>',
                '                <div class="msm-item"><span>Command Palette</span><kbd>F1</kbd></div>',
                '                <div class="msm-item"><span>Find / Replace</span><kbd>' + cmdKey + ' + F / ' + cmdKey + ' + H</kbd></div>',
                '                <div class="msm-item"><span>Undo / Redo</span><kbd>' + cmdKey + ' + Z / ' + cmdKey + ' + Y</kbd></div>',
                '                <div class="msm-item"><span>Zoom Font</span><kbd>' + cmdKey + ' + Scroll</kbd></div>',
                '            </div>',
                '            <h3>Features</h3>',
                '            <div class="msm-features">',
                '                <div class="msm-feat-card">',
                '                    <strong>⚡ Live Error Diagnostics</strong>',
                '                    <p>Background GLSL syntax & type validation while typing (debounced) with accurate squiggles and error tooltips.</p>',
                '                </div>',
                '                <div class="msm-feat-card">',
                '                    <strong>🔍 Go to Definition & Outline</strong>',
                '                    <p>Instant navigation to user-defined functions, structs, #define macros, and variables, plus Quick Open outline.</p>',
                '                </div>',
                '                <div class="msm-feat-card">',
                '                    <strong>💡 Hover Documentation</strong>',
                '                    <p>Hover over any GLSL function, swizzle, uniform (iResolution, iTime, etc.), or input channel to see docs & formulas.</p>',
                '                </div>',
                '                <div class="msm-feat-card">',
                '                    <strong>📑 Independent Pass Tabs</strong>',
                '                    <p>Switching tabs (Image, Buffers, Common, Sound) preserves independent cursor, scroll position, and Undo/Redo history.</p>',
                '                </div>',
                '                <div class="msm-feat-card">',
                '                    <strong>🧊 Dynamic Sampler Types</strong>',
                '                    <p>Auto-detects CubeMap (samplerCube), 3D textures, and 2D textures for iChannel0..3 based on active pass inputs.</p>',
                '                </div>',
                '                <div class="msm-feat-card">',
                '                    <strong>📝 IntelliSense & Signature Help</strong>',
                '                    <p>Auto-completion for GLSL built-ins, types, snippets, and live parameter hints with function overloads.</p>',
                '                </div>',
                '            </div>',
                '        </div>',
                '        <div class="msm-footer">',
                '            <span>Tip: Press Esc or click outside to close</span>',
                '            <button class="msm-close-btn" type="button">Close</button>',
                '        </div>',
                '    </div>',
                '</div>'
            ].join('\n');

            var o_wrapper = document.createElement('div');
            o_wrapper.innerHTML = s_modal_html;
            var o_modal_el = o_wrapper.firstElementChild;
            document.body.appendChild(o_modal_el);

            var f_close = function() {
                o_modal_el.style.display = 'none';
            };

            o_modal_el.addEventListener('click', f_close);
            var o_close_icon = o_modal_el.querySelector('.msm-close');
            if (o_close_icon) o_close_icon.addEventListener('click', f_close);
            var o_close_btn = o_modal_el.querySelector('.msm-close-btn');
            if (o_close_btn) o_close_btn.addEventListener('click', f_close);

            window.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && o_modal_el.style.display !== 'none') {
                    f_close();
                }
            });
        }
    };

    window.ToyPlug = window.ToyPlug || {};
    window.ToyPlug.monaco = ToyPlugMonaco;

    ToyPlugMonaco.init();
})();

