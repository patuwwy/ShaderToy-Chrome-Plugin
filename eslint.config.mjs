export default [
    {
        ignores: [
            'app/*/**',
            'output/**',
            'node_modules/**'
        ]
    },
    {
        files: ['app/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                chrome: 'readonly',
                browser: 'readonly',
                gShaderToy: 'writable',
                ShaderToy: 'writable',
                CustomEvent: 'readonly',
                cloneInto: 'readonly',
                JSZip: 'readonly',
                monaco: 'readonly',
                require: 'readonly',
                o_editor_monaco: 'writable',
                WebGL2RenderingContext: 'readonly',
                EffectPass: 'readonly'
            }
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['warn', { 'vars': 'all', 'args': 'none', 'ignoreRestSiblings': true }]
        }
    }
];

