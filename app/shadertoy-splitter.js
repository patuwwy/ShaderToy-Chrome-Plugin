(function () {
    const container = document.querySelector('.container');
    if (!container) return console.error('No .container found');

    // Require at least two children to split
    const kids = Array.from(container.children);
    if (kids.length < 2) return console.error('.container needs at least two child elements');

    const splitterWidth = 4;
    const minLeft = 80;      // px, minimum left pane
    const minRight = 80;     // px, minimum right pane

    // Cache original settings so this is reversible
    const original = {
        display: container.style.display,
        gridTemplateColumns: container.style.gridTemplateColumns,
        position: container.style.position,
    };

    // Make sure it’s a grid and positionable
    const cs = getComputedStyle(container);
    if (cs.display !== 'grid') container.style.display = 'grid';
    if (cs.position === 'static' || !cs.position) container.style.position = 'relative';

    // Pin first two children to columns 1 and 3 (we’ll create 3 tracks)
    const leftEl = kids[0];
    const rightEl = kids[1];
    leftEl.style.gridColumn = '1';
    rightEl.style.gridColumn = '3';

    // Use the current template if it exists; otherwise assume two cols.
    // We need to split by spaces but NOT inside parentheses (e.g. minmax(), repeat()).
    function splitTracks(str) {
        const out = [];
        let buf = '';
        let depth = 0;
        for (const ch of str.trim()) {
            if (ch === '(') depth++;
            if (ch === ')') depth = Math.max(0, depth - 1);
            if (ch === ' ' && depth === 0) {
                if (buf) { out.push(buf); buf = ''; }
            } else {
                buf += ch;
            }
        }
        if (buf) out.push(buf);
        return out;
    }

    let startCols = cs.gridTemplateColumns.trim();
    let leftTrack = '1fr', rightTrack = '1fr';

    if (startCols) {
        const tokens = splitTracks(startCols);
        if (tokens.length >= 2) {
            leftTrack = tokens[0];
        }
    }

    // Create three tracks: left | splitter | right (preserve original left/right)
    container.style.gridTemplateColumns = `${leftTrack} ${splitterWidth}px auto`;
    container.style.gridGap = '14px';

    // If a previous splitter exists, remove it first
    const old = container.querySelector('#grid-splitter');
    if (old) old.remove();

    // Build the visible handle (absolute so it always catches events)
    const handle = document.createElement('div');
    handle.id = 'grid-splitter';
    Object.assign(handle.style, {
        position: 'absolute',
        top: '0',
        bottom: '0',
        width: splitterWidth + 'px',
        left: '50%',
        transform: 'translateX(-50%)',
        cursor: 'col-resize',
        background: '#777777',
        opacity: '1',
        transition: 'background 0.15s ease, opacity 1s ease',
        zIndex: '9999',
        userSelect: 'none'
    });
    handle.addEventListener('mouseenter', () => {
        handle.style.background = '#777777';
        handle.style.opacity = '1';
    });

    handle.addEventListener('mouseleave', () => {
        handle.style.background = '#777777';
        handle.style.opacity = '0';
    });
    container.appendChild(handle);
    // Show for 1s, then fade out over 1s
    setTimeout(() => { handle.style.opacity = '0'; }, 500);


    // Floating readout showing column widths during drag
    const readout = document.createElement('div');
    Object.assign(readout.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        transform: 'translate(12px, 12px)', // offset from pointer via JS position
        padding: '4px 8px',
        font: '12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        borderRadius: '6px',
        pointerEvents: 'none',
        zIndex: '10000',
        display: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)'
    });
    document.body.appendChild(readout);

    // Utility to set columns from an x position (px from container left)
    function setColumnsFromX(x) {
        const rect = container.getBoundingClientRect();
        const total = rect.width;
        const left = Math.max(minLeft, Math.min(x, total - minRight - splitterWidth));
        const right = Math.max(minRight, total - left - splitterWidth);
        container.style.gridTemplateColumns = `${left}px ${splitterWidth}px auto`;
        handle.style.left = (left + splitterWidth / 2) + 'px';
        return { left, right, total };
    }

    // Initialize handle near the existing column boundary if possible
    (function tryAlignToCurrentColumns() {
        const parts = splitTracks(startCols);
        const rect = container.getBoundingClientRect();
        const total = rect.width;
        let leftGuess = total / 2;

        function parseLen(val, fallback) {
            if (val.endsWith('px')) return parseFloat(val);
            if (val.endsWith('fr')) {
                const totalFr = parts
                    .filter(v => v.endsWith('fr'))
                    .map(v => parseFloat(v))
                    .reduce((a, b) => a + b, 0);
                if (totalFr === 0) return fallback;
                return total * (parseFloat(val) / totalFr);
            }
            if (val.endsWith('%')) return total * (parseFloat(val) / 100);
            return fallback;
        }

        if (parts.length >= 2) {
            const guess = parseLen(parts[0], leftGuess);
            if (isFinite(guess) && guess > 0 && guess < total) leftGuess = guess;
        }
        setColumnsFromX(leftGuess);
    })();

    // --- Drag handlers ---
    let dragging = false;
    let dragOffset = 0;

    function updateReadout(clientX, clientY, sizes) {
        if (!sizes) return;
        const { left, right, total } = sizes;
        const lp = Math.round((left / total) * 100);
        const rp = Math.round((right / total) * 100);
        readout.textContent = `${Math.round(left)}px (${lp}%) | ${Math.round(right)}px (${rp}%)`;
        readout.style.left = clientX + 'px';
        readout.style.top = clientY + 'px';
    }

    function onDown(e) {
        dragging = true;
        handle.style.opacity = '1';
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
        const rect = handle.getBoundingClientRect();
        dragOffset = e.clientX - (rect.left + rect.width / 2);
        readout.style.display = 'block';
    }

    function onMove(e) {
        if (!dragging) return;
        handle.style.opacity = '1';
        const cRect = container.getBoundingClientRect();
        const sizes = setColumnsFromX(e.clientX - cRect.left - dragOffset);
        updateReadout(e.clientX, e.clientY, sizes);
    }

    function onUp() {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
        readout.style.display = 'none';
        handle.style.opacity = '0'; 
    }

    handle.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Touch support
    handle.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        dragging = true;
        document.body.style.cursor = 'col-resize';
        const rect = handle.getBoundingClientRect();
        dragOffset = t.clientX - (rect.left + rect.width / 2);
        readout.style.display = 'block';
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        const cRect = container.getBoundingClientRect();
        const sizes = setColumnsFromX(t.clientX - cRect.left - dragOffset);
        updateReadout(t.clientX, t.clientY, sizes);
    }, { passive: false });

    window.addEventListener('touchend', onUp);

    // Double-click to reset to 50/50
    handle.addEventListener('dblclick', () => {
        const rect = container.getBoundingClientRect();
        const sizes = setColumnsFromX((rect.width - splitterWidth) / 2);
        // Center readout briefly at handle
        updateReadout(rect.left + rect.width / 2, rect.top + 24, sizes);
    });

    // Right-click (context menu) on the bar should remove it and restore layout
    function removeSplitter() {
        // Clean listeners
        handle.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        handle.removeEventListener('touchstart', onDown);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);

        // Remove UI elements
        if (handle.parentNode) handle.parentNode.removeChild(handle);
        if (readout.parentNode) readout.parentNode.removeChild(readout);

        // console.log('Splitter removed.');
    }

    handle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        removeSplitter();
    });

    //  console.log('Splitter attached. Drag the visible bar to resize. Right‑click it to remove.');
})();
