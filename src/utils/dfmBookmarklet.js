(function () {
    const parentDomain = window.location.origin;
    const spaUrl = `${DFM_NINJA_PATH}/#parentDomain=${parentDomain}`;
    const windowName = "DfM-Ninja";

    // 1. Try to open or focus the Ninja window
    const openNinjaWindow = () => {
        let ninjaWindow = window.open("", windowName);

        if (!ninjaWindow || ninjaWindow.location.href === "about:blank") {
            // Not open yet or connection lost, open fresh
            ninjaWindow = window.open(spaUrl, windowName);
        } else {
            // Already open, just focus
            ninjaWindow.focus();
        }
    };

    openNinjaWindow();

    // 3. Extraction is now handled dynamically via RPC from the Ninja SPA

    // 4. Set up receiver for commands from Ninja (idempotent: only register once)
    if (!window.__dfmNinjaInitialized) {
        window.__dfmNinjaInitialized = true;
        window.addEventListener("message", (event) => {
            // if (event.origin !== spaUrl) return;

            console.log("Ninja Command Received:", event.data, event.origin);

            // RPC Request Handler
            if (event.data.type === "RPC_REQUEST") {
                const { functionStr, timestamp, args } = event.data;
                try {
                    // Execute the function string
                    const executor = eval('(' + functionStr + ')');
                    // 万が一 args が無い時も空の配列として扱う
                    const result = executor(...(args || []));

                    event.source.postMessage({
                        type: "RPC_RESPONSE",
                        timestamp,
                        data: result
                    }, event.origin);
                } catch (e) {
                    event.source.postMessage({
                        type: "RPC_RESPONSE",
                        timestamp,
                        error: e.message
                    }, event.origin);
                }
                return;
            }

            if (event.data.type === "PING") {
                event.source.postMessage({ type: "PONG" }, event.origin);
            }
        }, { once: false });

        window.addEventListener('beforeunload', e => {
            e.preventDefault();
            e.returnValue = '';
        });
    }

    const style = 'background: none; border: none; right: 4px; top: 60px; font-size: 18px; position: absolute; z-index: 10000;';
    if (!document.getElementById('DfM-Ninja')) {
        const $btn = $(`<button style="${style}" id="DfM-Ninja" title="Open DfM-Ninja">🥷</button>`);
        $btn.on('click', openNinjaWindow);
        $('body').append($btn);
    }
    console.log("DfM-Ninja Bookmarklet Initialized.");
})();
