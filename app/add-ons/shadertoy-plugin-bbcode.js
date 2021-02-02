//
// By Ethan Lowenthal 2020
// https://www.shadertoy.com/user/Jinkweiq
//
// Started as a tapermonkey script, adapted to be part of
// shadertoy extention.
//

(function shadertoyPluginBBCode() {
    // bootstrap icons

    const emojiIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-emoji-smile" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
  <path fill-rule="evenodd" d="M4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683z"/>
  <path d="M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zm4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5z"/>
</svg>`;

    const alphabetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-down" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M4 2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11A.5.5 0 0 1 4 2z"/>
  <path fill-rule="evenodd" d="M6.354 11.146a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L4 12.793l1.646-1.647a.5.5 0 0 1 .708 0z"/>
  <path d="M9.664 7l.418-1.371h1.781L12.281 7h1.121l-1.78-5.332h-1.235L8.597 7h1.067zM11 2.687l.652 2.157h-1.351l.652-2.157H11zM9.027 14h3.934v-.867h-2.645v-.055l2.567-3.719v-.691H9.098v.867h2.507v.055l-2.578 3.719V14z"/>
</svg>`;

    const bold = {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-bold" viewBox="0 0 16 16">
    <path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>
  </svg>`, open: '[b]', close: '[/b]'
    };
    const italic = {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-italic" viewBox="0 0 16 16">
    <path d="M7.991 11.674L9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>
  </svg>`, open: '[i]', close: '[/i]'
    };
    const image = {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-card-image" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M14.5 3h-13a.5.5 0 0 0-.5.5v9c0 .013 0 .027.002.04V12l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094L15 9.499V3.5a.5.5 0 0 0-.5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13zm4.502 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
  </svg>`, open: '[img]', close: '[/img]'
    };
    const url = {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link" viewBox="0 0 16 16">
    <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/>
    <path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/>
  </svg>`, open: '[url]', close: '[/url]'
    };
    const code = {
        icon: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-code-slash" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0zm-.999-3.124a.5.5 0 0 1 .33.625l-4 13a.5.5 0 0 1-.955-.294l4-13a.5.5 0 0 1 .625-.33z"/>
    </svg>
    `, open: '[code]', close: '[/code]'
    };
    const video = {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-camera-reels" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M0 8a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 7.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 16H2a2 2 0 0 1-2-2V8zm11.5 5.175l3.5 1.556V7.269l-3.5 1.556v4.35zM2 7a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H2z"/>
        <path fill-rule="evenodd" d="M3 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        <path fill-rule="evenodd" d="M9 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
      </svg>`, open: '[video]', close: '[/video]'
    };

    const happy = { icon: '<img src="/img/emoticonHappy.png">', open: ':)', close: '' };
    const sad = { icon: '<img src="/img/emoticonSad.png">', open: ':(', close: '' };
    const laugh = { icon: '<img src="/img/emoticonLaugh.png">', open: ':D', close: '' };
    const heart = { icon: '<img src="/img/emoticonLove.png">', open: ':love:', close: '' };
    const octo = { icon: '<img src="/img/emoticonOctopus.png">', open: ':octopus:', close: '' };
    const octoBalloon = {
        icon: '<img src="/img/emoticonOctopusBalloon.png">',
        open: ':octopusballoon:',
        close: '',
    };


    const alpha = {
        icon: 'α'
        , open: ':alpha:', close: ''
    };
    const beta = {
        icon: 'β'
        , open: ':beta:', close: ''
    };
    const delta = {
        icon: 'Δ'
        , open: ':delta:', close: ''
    };
    const epsilon = {
        icon: 'ε'
        , open: ':epsilon:', close: ''
    };
    const nabla = {
        icon: '∇'
        , open: ':nabla:', close: ''
    };
    const square = {
        icon: '²'
        , open: ':square:', close: ''
    };
    const cube = {
        icon: '³'
        , open: ':cube:', close: ''
    };
    const limit = {
        icon: '≐'
        , open: ':limit:', close: ''
    };

    function insertText(b, input) {
        const { value } = input;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value =
            value.slice(0, start) + b.open + b.close + value.slice(end);
        input.selectionStart = input.selectionEnd = start + b.open.length;
    }
    let popup;
    let textarea;
    let button;
    const insertButtons = () => {
        popup = document.createElement('div');
        popup.style = `
position: absolute;
transform: translate(4px, calc(-100% - 4px));`;
        textArea = document.getElementById('commentTextArea');

        if (!textArea) {
            return;
        }

        function createList(icon, elems) {
            const wrapper = document.createElement('button');
            wrapper.type = 'button';
            wrapper.innerHTML = icon;
            const dropdown = document.createElement('div');
            wrapper.addEventListener('mousedown', (e) => {
                e.preventDefault();
                wrapper.appendChild(dropdown);
            });
            wrapper.className = 'bbcode-button bbcode-button-row';
            dropdown.style = `display: flex;
                position: absolute;
                z-index: 100;
                transform: translate(-25%, 4px);`;
            let dropbutton;
            elems.forEach((elem) => {
                dropbutton = document.createElement('button');
                dropbutton.type = 'button';
                dropbutton.className = 'bbcode-button';
                dropbutton.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    insertText(elem, textArea);
                });
                dropbutton.innerHTML = elem.icon;
                dropdown.appendChild(dropbutton);
            });
            document.addEventListener('click', (e) => {
                if (e.target !== wrapper && e.target.parentNode !== wrapper) {
                    dropdown.remove();
                }
            });
            return wrapper;
        }

        [bold, italic, image, url, code, video].forEach((b) => {
            button = document.createElement('button');
            button.type = 'button';
            button.className = 'bbcode-button bbcode-button-row';
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                insertText(b, textArea);
            });
            button.innerHTML = b.icon;
            popup.appendChild(button);
        });
        popup.appendChild(
            createList(emojiIcon, [
                happy,
                sad,
                laugh,
                heart,
                octo,
                octoBalloon,
            ]),
        );
        popup.appendChild(
            createList(alphabetIcon, [
                alpha,
                beta,
                delta,
                epsilon,
                nabla,
                square,
                cube,
                limit,
            ]),
        );
        textArea.addEventListener('focus', () => {
            textArea.parentNode.insertBefore(popup, textArea);
        });
        textArea.addEventListener('focusout', () => {
            popup.remove();
        });
    }
    if (document.readyState == 'loading') {
        document.onreadystatechange = function () {
            if (document.readyState === 'interactive') {
                insertButtons();
            }
        }
    } else {
        insertButtons();
    }
    (function waitForTheme() {
        try {
            const styles = `
            .bbcode-button {
            cursor: pointer;
            background: ${gThemeName == 'dark' ? '#383838' : '#f0f0f0'};
            border: 1px solid #808080;
            color: ${gThemeName == 'dark' ? '#b0b0b0' : '#000000'};
            margin: inherit;
            padding-top: 3px;
            z-index: 100;
            position: relative;
            }
            .bbcode-button-row:last-child {
            border-radius: 0px 10px 10px 0px;
            }
            .bbcode-button-row:first-child {
            border-radius: 10px 0px 0px 10px;
            }
            `;

            const styleSheet = document.createElement('style');
            styleSheet.type = 'text/css';
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        }
        catch {
            setTimeout(waitForTheme, 500);
        }
    })();
})();


function commentCodeHighlighting() {
    commentsContents = document.querySelectorAll('#myComments .commentContent');

    if (commentsContents.length) {
        const code = [];
        commentsContents.forEach(c => {
            code.push(...c.getElementsByTagName('pre'))
        });
        code.forEach(codeElem => {
            const copyButton = document.createElement('button');
            copyButton.innerHTML = 'copy';
            copyButton.type = 'button';
            copyButton.className = 'copy-button';
            copyButton.addEventListener("mouseout", () => {
                copyButton.innerHTML = 'copy';
            }, false);
            copyButton.addEventListener('click', (e) => {
                e.preventDefault();
                var tempInput = document.createElement("textarea");
                tempInput.value = codeElem.innerText;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand("copy");
                document.body.removeChild(tempInput);
                copyButton.innerHTML = 'copied!';
            });
            const codeMirrorWrapper = document.createElement('div');
            codeMirrorWrapper.style = `
            display: grid;
            position: relative;
            margin-top: 3px;`;
            codeElem.parentNode.insertBefore(codeMirrorWrapper, codeElem);
            CodeMirror(codeMirrorWrapper,
                {
                    lineNumbers: false,
                    indentWithTabs: false,
                    tabSize: 4,
                    indentUnit: 4,
                    mode: "text/x-glsl",
                    readOnly: true,
                    value: codeElem.innerText.trim(),
                })
            codeElem.remove();
            codeMirrorWrapper.appendChild(copyButton);

        })
        var css = `
        .CodeMirror:not(:hover) + .copy-button {
            display: none;
        }
        .copy-button {
            background: transparent;
            position: absolute;
            top: 0px;
            right: 0px;
            cursor: pointer;
            z-index: 10;
            border: 1px solid #808080;
            color: #808080;
            border-radius: 4px;
            padding: 2px 7px;
            font-size: inherit;
        }
        .copy-button:hover {
            display: block !important;
            color: black;
            background: #808080;
        }
        .copy-button:focus {
            outline: none;
        }

        `;
        var style = document.createElement('style');

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }

        document.getElementsByTagName('head')[0].appendChild(style);

    } else {
        setTimeout(commentCodeHighlighting, 200);
    }
}
commentCodeHighlighting();

