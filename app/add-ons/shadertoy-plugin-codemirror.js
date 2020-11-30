//
// By Ethan Lowenthal 2020
// https://www.shadertoy.com/user/Jinkweiq
//
// Started as a tapermonkey script, adapted to be part of
// shadertoy extention.
//

(function shadertoyPluginColorPicker() {
    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: (parseInt(result[1], 16) / 255).toFixed(3),
                g: (parseInt(result[2], 16) / 255).toFixed(3),
                b: (parseInt(result[3], 16) / 255).toFixed(3)
            }
            : null;
    }
    function rgbToHex(r, g, b) {
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
        if (Math.max(r, g, b) > 255) {
            r /= Math.max(r, g, b) / 255;
            g /= Math.max(r, g, b) / 255;
            b /= Math.max(r, g, b) / 255;
        }

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    let colorPickerNode;

    CodeMirror.colorPicker = function (cm) {
        const { doc } = cm;
        if (colorPickerNode && colorPickerNode.parentNode) {
            colorPickerNode.parentNode.removeChild(colorPickerNode);
        }
        const regexSearchRange = 250;
        const cursor = doc.indexFromPos(doc.getCursor());
        const content = doc.getRange(doc.posFromIndex(cursor - regexSearchRange), doc.posFromIndex(cursor + regexSearchRange));
        const vec3Regex = /vec3\s*\(\s*(\d*\.?\d*)\s*,\s*(\d*\.?\d*)\s*,\s*(\d*\.?\d*)\s*\)/g;
        [...content.matchAll(vec3Regex)].forEach(result => {
            const r = parseFloat(result[1]),
                g = parseFloat(result[2]),
                b = parseFloat(result[3]);

            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                const startPos = result.index + cursor - min(cursor, regexSearchRange);
                const endPos = result.index + result[0].length + cursor - min(cursor, regexSearchRange);

                if (cursor < endPos && cursor > startPos) {
                    colorPickerNode = document.createElement('div');
                    colorPickerNode.className = 'cm-colorpicker-wrapper';

                    const colorPickerInput = document.createElement('input');
                    colorPickerInput.type = 'color';
                    colorPickerInput.className = 'cm-colorpicker';
                    colorPickerInput.value = rgbToHex(r, g, b);
                    colorPickerNode.style.backgroundColor = colorPickerInput.value;

                    colorPickerInput.addEventListener('change', event => {
                        const newColor = hexToRgb(event.target.value);
                        doc.replaceRange(`vec3(${newColor.r},${newColor.g},${newColor.b})`, doc.posFromIndex(startPos), doc.posFromIndex(endPos));
                        colorPickerNode.style.backgroundColor = event.target.value;
                    });

                    colorPickerNode.appendChild(colorPickerInput);
                    cm.addWidget(doc.posFromIndex(startPos), colorPickerNode, true);
                }

            }
        });
    };

    let t;
    t = setTimeout(() => {
        try {
            gShaderToy.mCodeEditor.on('cursorActivity', CodeMirror.colorPicker);
            clearTimeout(t);
        } catch { }
    }, 100);
})();

(function shadertoyPluginCodeCompletion() {
    // modified https://codemirror.net/doc/manual.html#addon_show-hint
    const HINT_ELEMENT_CLASS = 'cm-hint';
    const ACTIVE_HINT_ELEMENT_CLASS = 'cm-hint-active';
    // all the keywords, (and code samples)
    const glslKeywords = [
        'const',
        'uniform',
        'break',
        'continue',
        'do',
        'for',
        'while',
        'if',
        'else',
        'switch',
        'case',
        'in',
        'out',
        'inout',
        'float',
        'int',
        'uint',
        'void',
        'bool',
        'true',
        'false',
        'invariant',
        'discard',
        'return',
        'mat2',
        'mat3',
        'mat2x2',
        'mat2x3',
        'mat2x4',
        'mat3x2',
        'mat3x3',
        'mat3x4',
        'mat4x2',
        'mat4x3',
        'mat4x4',
        'mat4',
        'vec2',
        'vec3',
        'vec4',
        'ivec2',
        'ivec3',
        'ivec4',
        'uvec2',
        'uvec3',
        'uvec4',
        'bvec2',
        'bvec3',
        'bvec4',
        'sampler2D',
        'samplerCube',
        'sampler3D',
        'structradians',
        'degrees',
        'sin',
        'cos',
        'tan',
        'asin',
        'acos',
        'atan',
        'pow',
        'sinh',
        'cosh',
        'tanh',
        'asinh',
        'acosh',
        'atanh',
        'exp',
        'log',
        'exp2',
        'log2',
        'sqrt',
        'inversesqrt',
        'abs',
        'sign',
        'floor',
        'ceil',
        'round',
        'trunc',
        'fract',
        'mod',
        'modf',
        'min',
        'max',
        'clamp',
        'mix',
        'step',
        'smoothstep',
        'length',
        'distance',
        'dot',
        'cross',
        'determinant',
        'inverse',
        'normalize',
        'faceforward',
        'reflect',
        'refract',
        'matrixCompMult',
        'outerProduct',
        'transpose',
        'lessThan',
        'lessThanEqual',
        'greaterThan',
        'greaterThanEqual',
        'equal',
        'notEqual',
        'any',
        'all',
        'not',
        'packUnorm2x16',
        'unpackUnorm2x16',
        'packSnorm2x16',
        'unpackSnorm2x16',
        'packHalf2x16',
        'unpackHalf2x16',
        'dFdx',
        'dFdy',
        'fwidth',
        'textureSize',
        'texture',
        'textureProj',
        'textureLod',
        'textureGrad',
        'texelFetch',
        'texelFetchOffset',
        'textureProjLod',
        'textureLodOffset',
        'textureGradOffset',
        'textureProjLodOffset',
        'textureProjGrad',
        'intBitsToFloat',
        'uintBitsToFloat',
        'floatBitsToInt',
        'floatBitsToUint',
        'isnan',
        'isinffragColor',
        'fragCoord',
        'fragColor',
        'iResolution',
        'iTime',
        'iTimeDelta',
        'iFrame',
        'iMouse',
        'iDate',
        'iChannelTime',
        'iChannel0',
        'iChannel1',
        'iChannel2',
        'iChannel3',
        'iSampleRate',
        `void mainImage( out vec4 fragColor, in vec2 fragCoord ){
}`,
        'vec2 uv = (fragCoord - .5*iResolution.xy) / min(iResolution.x, iResolution.y)',
        '#define PI acos(-1.)',
        `mat2 rotate(float angle){
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}`,
        'for(int i=0;i<10;i++){}',
    ];

    CodeMirror.showHint = function (cm, getHints, options) {
        if (!getHints) return cm.showHint(options);
        if (options && options.async) getHints.async = true;
        const newOpts = {
            hint: getHints
        };
        if (options) for (const prop in options) newOpts[prop] = options[prop];
        return cm.showHint(newOpts);
    };

    CodeMirror.defineExtension('showHint', function (options) {
        options = parseOptions(this, this.getCursor('start'), options);
        const selections = this.listSelections();
        if (selections.length > 1) return;
        // By default, don't allow completion when something is selected.
        // A hint function can have a `supportsSelection` property to
        // indicate that it can handle selections.
        if (this.somethingSelected()) {
            if (!options.hint.supportsSelection) return;
            // Don't try with cross-line selections
            for (let i = 0; i < selections.length; i++) if (selections[i].head.line != selections[i].anchor.line) return;
        }

        if (this.state.completionActive) this.state.completionActive.close();
        const completion = (this.state.completionActive = new Completion(this, options));
        if (!completion.options.hint) return;

        CodeMirror.signal(this, 'startCompletion', this);
        completion.update(true);
    });

    CodeMirror.defineExtension('closeHint', function () {
        if (this.state.completionActive) this.state.completionActive.close();
    });

    function Completion(cm, options) {
        this.cm = cm;
        this.options = options;
        this.widget = null;
        this.debounce = 0;
        this.tick = 0;
        this.startPos = this.cm.getCursor('start');
        this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

        const self = this;
        cm.on(
            'cursorActivity',
            (this.activityFunc = function () {
                self.cursorActivity();
            })
        );
    }

    const requestAnimationFrame =
        window.requestAnimationFrame ||
        function (fn) {
            return setTimeout(fn, 1000 / 60);
        };
    const cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

    Completion.prototype = {
        close() {
            if (!this.active()) return;
            this.cm.state.completionActive = null;
            this.tick = null;
            this.cm.off('cursorActivity', this.activityFunc);

            if (this.widget && this.data) CodeMirror.signal(this.data, 'close');
            if (this.widget) this.widget.close();
            CodeMirror.signal(this.cm, 'endCompletion', this.cm);
        },

        active() {
            return this.cm.state.completionActive == this;
        },

        pick(data, i) {
            const completion = data.list[i];
            const self = this;
            this.cm.operation(function () {
                if (completion.hint) completion.hint(self.cm, data, completion);
                else self.cm.replaceRange(getText(completion), completion.from || data.from, completion.to || data.to, 'complete');
                CodeMirror.signal(data, 'pick', completion);
                self.cm.scrollIntoView();
            });
            if (this.options.closeOnPick) {
                this.close();
            }
        },

        cursorActivity() {
            if (this.debounce) {
                cancelAnimationFrame(this.debounce);
                this.debounce = 0;
            }

            let identStart = this.startPos;
            if (this.data) {
                identStart = this.data.from;
            }

            const pos = this.cm.getCursor();
            const line = this.cm.getLine(pos.line);
            if (
                pos.line != this.startPos.line ||
                line.length - pos.ch != this.startLen - this.startPos.ch ||
                pos.ch < identStart.ch ||
                this.cm.somethingSelected() ||
                !pos.ch ||
                this.options.closeCharacters.test(line.charAt(pos.ch - 1))
            ) {
                if (this.options.closeOnCursorActivity) {
                    this.close();
                }
            } else {
                const self = this;
                this.debounce = requestAnimationFrame(function () {
                    self.update();
                });
                if (this.widget) this.widget.disable();
            }
        },

        update(first) {
            if (this.tick == null) return;
            const self = this;
            const myTick = ++this.tick;
            fetchHints(this.options.hint, this.cm, this.options, function (data) {
                if (self.tick == myTick) self.finishUpdate(data, first);
            });
        },

        finishUpdate(data, first) {
            if (this.data) CodeMirror.signal(this.data, 'update');

            const picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
            if (this.widget) this.widget.close();

            this.data = data;

            if (data && data.list.length) {
                if (picked && data.list.length == 1) {
                    this.pick(data, 0);
                } else {
                    this.widget = new Widget(this, data);
                    CodeMirror.signal(data, 'shown');
                }
            }
        }
    };

    function parseOptions(cm, pos, options) {
        const editor = cm.options.hintOptions;
        const out = {};
        for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
        if (editor) for (var prop in editor) if (editor[prop] !== undefined) out[prop] = editor[prop];
        if (options) for (var prop in options) if (options[prop] !== undefined) out[prop] = options[prop];
        if (out.hint.resolve) out.hint = out.hint.resolve(cm, pos);
        return out;
    }

    function getText(completion) {
        if (typeof completion === 'string') return completion;
        return completion.text;
    }

    function buildKeyMap(completion, handle) {
        const baseMap = {
            Up() {
                handle.moveFocus(-1);
            },
            Down() {
                handle.moveFocus(1);
            },
            PageUp() {
                handle.moveFocus(-handle.menuSize() + 1, true);
            },
            PageDown() {
                handle.moveFocus(handle.menuSize() - 1, true);
            },
            Home() {
                handle.setFocus(0);
            },
            End() {
                handle.setFocus(handle.length - 1);
            },
            Enter: handle.pick,
            Tab: handle.pick,
            Esc: handle.close
        };

        const mac = /Mac/.test(navigator.platform);

        if (mac) {
            baseMap['Ctrl-P'] = function () {
                handle.moveFocus(-1);
            };
            baseMap['Ctrl-N'] = function () {
                handle.moveFocus(1);
            };
        }

        const custom = completion.options.customKeys;
        const ourMap = custom ? {} : baseMap;

        function addBinding(key, val) {
            let bound;
            if (typeof val !== 'string')
                bound = function (cm) {
                    return val(cm, handle);
                };
            // This mechanism is deprecated
            else if (baseMap.hasOwnProperty(val)) bound = baseMap[val];
            else bound = val;
            ourMap[key] = bound;
        }
        if (custom) for (var key in custom) if (custom.hasOwnProperty(key)) addBinding(key, custom[key]);
        const extra = completion.options.extraKeys;
        if (extra) for (var key in extra) if (extra.hasOwnProperty(key)) addBinding(key, extra[key]);
        return ourMap;
    }

    function getHintElement(hintsElement, el) {
        while (el && el != hintsElement) {
            if (el.nodeName.toUpperCase() === 'LI' && el.parentNode == hintsElement) return el;
            el = el.parentNode;
        }
    }

    function Widget(completion, data) {
        this.completion = completion;
        this.data = data;
        this.picked = false;
        const widget = this;
        const { cm } = completion;
        const { ownerDocument } = cm.getInputField();
        const parentWindow = ownerDocument.defaultView || ownerDocument.parentWindow;

        const hints = (this.hints = ownerDocument.createElement('ul'));
        const { theme } = completion.cm.options;
        hints.className = `cm-hints ${theme}`;
        this.selectedHint = data.selectedHint || 0;

        const completions = data.list;
        for (let i = 0; i < completions.length; ++i) {
            const elt = hints.appendChild(ownerDocument.createElement('li'));
            const cur = completions[i];
            let className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? '' : ` ${ACTIVE_HINT_ELEMENT_CLASS}`);
            if (cur.className != null) className = `${cur.className} ${className}`;
            elt.className = className;
            if (cur.render) cur.render(elt, data, cur);
            else elt.appendChild(ownerDocument.createTextNode(cur.displayText || getText(cur)));
            elt.hintId = i;
        }

        const container = completion.options.container || ownerDocument.body;
        let pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
        let { left } = pos;
        let top = pos.bottom;
        let below = true;
        let offsetLeft = 0;
        let offsetTop = 0;
        if (container !== ownerDocument.body) {
            // We offset the cursor position because left and top are relative to the offsetParent's top left corner.
            const isContainerPositioned = ['absolute', 'relative', 'fixed'].indexOf(parentWindow.getComputedStyle(container).position) !== -1;
            const offsetParent = isContainerPositioned ? container : container.offsetParent;
            const offsetParentPosition = offsetParent.getBoundingClientRect();
            const bodyPosition = ownerDocument.body.getBoundingClientRect();
            offsetLeft = offsetParentPosition.left - bodyPosition.left - offsetParent.scrollLeft;
            offsetTop = offsetParentPosition.top - bodyPosition.top - offsetParent.scrollTop;
        }
        hints.style.left = `${left - offsetLeft}px`;
        hints.style.top = `${top - offsetTop}px`;

        // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
        const winW = parentWindow.innerWidth || Math.max(ownerDocument.body.offsetWidth, ownerDocument.documentElement.offsetWidth);
        const winH = parentWindow.innerHeight || Math.max(ownerDocument.body.offsetHeight, ownerDocument.documentElement.offsetHeight);
        container.appendChild(hints);

        let box = completion.options.moveOnOverlap ? hints.getBoundingClientRect() : new DOMRect();
        const scrolls = completion.options.paddingForScrollbar ? hints.scrollHeight > hints.clientHeight + 1 : false;

        // Compute in the timeout to avoid reflow on init
        let startScroll;
        setTimeout(function () {
            startScroll = cm.getScrollInfo();
        });

        const overlapY = box.bottom - winH;
        if (overlapY > 0) {
            const height = box.bottom - box.top;
            const curTop = pos.top - (pos.bottom - box.top);
            if (curTop - height > 0) {
                // Fits above cursor
                hints.style.top = `${(top = pos.top - height - offsetTop)}px`;
                below = false;
            } else if (height > winH) {
                hints.style.height = `${winH - 5}px`;
                hints.style.top = `${(top = pos.bottom - box.top - offsetTop)}px`;
                const cursor = cm.getCursor();
                if (data.from.ch != cursor.ch) {
                    pos = cm.cursorCoords(cursor);
                    hints.style.left = `${(left = pos.left - offsetLeft)}px`;
                    box = hints.getBoundingClientRect();
                }
            }
        }
        let overlapX = box.right - winW;
        if (overlapX > 0) {
            if (box.right - box.left > winW) {
                hints.style.width = `${winW - 5}px`;
                overlapX -= box.right - box.left - winW;
            }
            hints.style.left = `${(left = pos.left - overlapX - offsetLeft)}px`;
        }
        if (scrolls) for (let node = hints.firstChild; node; node = node.nextSibling) node.style.paddingRight = `${cm.display.nativeBarWidth}px`;

        cm.addKeyMap(
            (this.keyMap = buildKeyMap(completion, {
                moveFocus(n, avoidWrap) {
                    widget.changeActive(widget.selectedHint + n, avoidWrap);
                },
                setFocus(n) {
                    widget.changeActive(n);
                },
                menuSize() {
                    return widget.screenAmount();
                },
                length: completions.length,
                close() {
                    completion.close();
                },
                pick() {
                    widget.pick();
                },
                data
            }))
        );

        if (completion.options.closeOnUnfocus) {
            let closingOnBlur;
            cm.on(
                'blur',
                (this.onBlur = function () {
                    closingOnBlur = setTimeout(function () {
                        completion.close();
                    }, 100);
                })
            );
            cm.on(
                'focus',
                (this.onFocus = function () {
                    clearTimeout(closingOnBlur);
                })
            );
        }

        cm.on(
            'scroll',
            (this.onScroll = function () {
                const curScroll = cm.getScrollInfo();
                const editor = cm.getWrapperElement().getBoundingClientRect();
                const newTop = top + startScroll.top - curScroll.top;
                let point = newTop - (parentWindow.pageYOffset || (ownerDocument.documentElement || ownerDocument.body).scrollTop);
                if (!below) point += hints.offsetHeight;
                if (point <= editor.top || point >= editor.bottom) return completion.close();
                hints.style.top = `${newTop}px`;
                hints.style.left = `${left + startScroll.left - curScroll.left}px`;
            })
        );

        CodeMirror.on(hints, 'dblclick', function (e) {
            const t = getHintElement(hints, e.target || e.srcElement);
            if (t && t.hintId != null) {
                widget.changeActive(t.hintId);
                widget.pick();
            }
        });

        CodeMirror.on(hints, 'click', function (e) {
            const t = getHintElement(hints, e.target || e.srcElement);
            if (t && t.hintId != null) {
                widget.changeActive(t.hintId);
                if (completion.options.completeOnSingleClick) widget.pick();
            }
        });

        CodeMirror.on(hints, 'mousedown', function () {
            setTimeout(function () {
                cm.focus();
            }, 20);
        });

        // The first hint doesn't need to be scrolled to on init
        const selectedHintRange = this.getSelectedHintRange();
        if (selectedHintRange.from !== 0 || selectedHintRange.to !== 0) {
            this.scrollToActive();
        }

        CodeMirror.signal(data, 'select', completions[this.selectedHint], hints.childNodes[this.selectedHint]);
        return true;
    }

    Widget.prototype = {
        close() {
            if (this.completion.widget != this) return;
            this.completion.widget = null;
            this.hints.parentNode.removeChild(this.hints);
            this.completion.cm.removeKeyMap(this.keyMap);

            const { cm } = this.completion;
            if (this.completion.options.closeOnUnfocus) {
                cm.off('blur', this.onBlur);
                cm.off('focus', this.onFocus);
            }
            cm.off('scroll', this.onScroll);
        },

        disable() {
            this.completion.cm.removeKeyMap(this.keyMap);
            const widget = this;
            this.keyMap = {
                Enter() {
                    widget.picked = true;
                }
            };
            this.completion.cm.addKeyMap(this.keyMap);
        },

        pick() {
            this.completion.pick(this.data, this.selectedHint);
        },

        changeActive(i, avoidWrap) {
            if (i >= this.data.list.length) i = avoidWrap ? this.data.list.length - 1 : 0;
            else if (i < 0) i = avoidWrap ? 0 : this.data.list.length - 1;
            if (this.selectedHint == i) return;
            let node = this.hints.childNodes[this.selectedHint];
            if (node) node.className = node.className.replace(` ${ACTIVE_HINT_ELEMENT_CLASS}`, '');
            node = this.hints.childNodes[(this.selectedHint = i)];
            node.className += ` ${ACTIVE_HINT_ELEMENT_CLASS}`;
            this.scrollToActive();
            CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], node);
        },

        scrollToActive() {
            const selectedHintRange = this.getSelectedHintRange();
            const node1 = this.hints.childNodes[selectedHintRange.from];
            const node2 = this.hints.childNodes[selectedHintRange.to];
            const firstNode = this.hints.firstChild;
            if (node1.offsetTop < this.hints.scrollTop) this.hints.scrollTop = node1.offsetTop - firstNode.offsetTop;
            else if (node2.offsetTop + node2.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
                this.hints.scrollTop = node2.offsetTop + node2.offsetHeight - this.hints.clientHeight + firstNode.offsetTop;
        },

        screenAmount() {
            return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
        },

        getSelectedHintRange() {
            const margin = this.completion.options.scrollMargin || 0;
            return {
                from: Math.max(0, this.selectedHint - margin),
                to: Math.min(this.data.list.length - 1, this.selectedHint + margin)
            };
        }
    };

    function fetchHints(hint, cm, options, callback) {
        if (hint.async) {
            hint(cm, callback, options);
        } else {
            const result = hint(cm, options);
            if (result && result.then) result.then(callback);
            else callback(result);
        }
    }

    CodeMirror.registerHelper('hint', 'fromList', function (cm, options) {
        const cur = cm.getCursor();
        const token = cm.getTokenAt(cur);
        let term;
        let from = CodeMirror.Pos(cur.line, token.start);
        const to = cur;
        if (token.start < cur.ch && /\w/.test(token.string.charAt(cur.ch - token.start - 1))) {
            term = token.string.substr(0, cur.ch - token.start);
        } else {
            term = '';
            from = cur;
        }
        const found = [];
        for (let i = 0; i < options.words.length; i++) {
            const word = options.words[i];
            if (word.slice(0, term.length) == term) found.push(word);
        }
        for (let i = 0; i < options.words.length; i++) {
            const word = options.words[i];
            if (word.includes(term) && !found.includes(word)) found.push(word);
        }
        if (found.length)
            return {
                list: found,
                from,
                to
            };
    });

    CodeMirror.commands.autocomplete = CodeMirror.showHint;
    var defaultOptions = {
        words: glslKeywords,
        hint: CodeMirror.hint.fromList,
        completeSingle: true,
        alignWithWord: true,
        closeCharacters: /[\s()\[\]{};:>,]/,
        closeOnCursorActivity: true,
        closeOnPick: true,
        closeOnUnfocus: true,
        completeOnSingleClick: true,
        container: null,
        customKeys: null,
        extraKeys: null,
        paddingForScrollbar: true,
        moveOnOverlap: true
    };
    // wait for gShaderToy to be defined.
    let t;
    t = setTimeout(() => {
        try {
            gShaderToy.mCodeEditor.options.extraKeys['Shift-Tab'] = 'autocomplete';
            clearTimeout(t);
        } catch { }
    }, 100);
})();
(function () {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
.cm-colorpicker {
    opacity: 0;
    display: block;
    width: 32px;
    height: 16px;
    border: none;
    position: absolute;
    z-index: 10;
}
.cm-colorpicker-wrapper {
    position: absolute;
    width: 32px;
    height: 16px;
    border-radius: 6px;
    border: 4px solid ${gThemeName === 'dark' ? 'white' : 'black'};
    transform: translate(0, 1px);
    z-index: 10;
}
.cm-hints {
    position: absolute;
    z-index: 10;
    overflow: hidden;
    list-style: none;

    margin: 0;
    padding: 2px;

    -webkit-box-shadow: 2px 3px 5px rgba(0,0,0,.2);
    -moz-box-shadow: 2px 3px 5px rgba(0,0,0,.2);
    box-shadow: 2px 3px 5px rgba(0,0,0,.2);
    border-radius: 3px;
    border: 1px solid silver;

    background: ${gThemeName === 'dark' ? 'black' : 'white'};
    font-size: 90%;
    font-family: monospace;

    max-height: 20em;
    overflow-y: auto;
}

.cm-hint {
    margin: 0;
    padding: 0 4px;
    border-radius: 2px;
    white-space: pre;
    color: ${gThemeName === 'dark' ? 'white' : 'black'};
    cursor: pointer;
}

li.cm-hint-active {
    background: #08f;
    color: ${gThemeName === 'dark' ? 'black' : 'white'};
}
`;
    document.getElementsByTagName('head')[0].appendChild(style);
})()
