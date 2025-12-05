(() => {
    window.utils = window.utils || {};

    /* ===============================
        LocalStorage Helper (Safe)
    ================================*/
    window.utils.updateLocalStorageObject = (key, newValues) => {
        try {
            const existing = localStorage.getItem(key);
            let data = existing ? JSON.parse(existing) : {};
            Object.assign(data, newValues);
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn("LocalStorage unavailable:", e.message);
        }
    };

    /* ===============================
        Cookie Helper (Safe)
    ================================*/
    window.utils.setCookie = (name, value, days) => {
        try {
            const date = new Date();
            date.setTime(date.getTime() + (days * 86400000));
            const expires = "; expires=" + date.toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`;
        } catch (e) {
            console.warn("Cookies unavailable:", e.message);
        }
    };

    /* ===============================
        Video Helpers
    ================================*/
    window.utils.findVideo = () => document.querySelector("video");

    window.utils.enableVideoSkipControls = (rewindSeconds = 5, forwardSeconds = 5) => {
        const handler = (e) => {
            const vid = window.utils.findVideo();
            if (!vid) return;

            if (e.key === "ArrowLeft") {
                vid.currentTime = Math.max(0, vid.currentTime - rewindSeconds);
                e.preventDefault();
            }

            if (e.key === "ArrowRight") {
                vid.currentTime = Math.min(vid.duration, vid.currentTime + forwardSeconds);
                e.preventDefault();
            }
        };

        document.addEventListener("keydown", handler, true);

        // Cleanup function
        return () => document.removeEventListener("keydown", handler, true);
    };

    /* ===============================
        clickWhenExists (with timeout)
    ================================*/
    window.utils.clickWhenExists = (selector, options = { once: true, timeout: 30000 }) => {
        let observer;

        const tryClick = () => {
            const el = document.querySelector(selector);
            if (!el) return false;

            el.click();
            if (observer) observer.disconnect();
            return true;
        };

        if (tryClick()) return { cleanup: () => {} };

        observer = new MutationObserver(() => tryClick());
        observer.observe(document.body, { childList: true, subtree: true });

        const timeoutId = setTimeout(() => observer?.disconnect(), options.timeout);

        return {
            cleanup: () => {
                clearTimeout(timeoutId);
                observer?.disconnect();
            }
        };
    };

    /* ===============================
        clickButtonByText (with observer)
    ================================*/
    window.utils.clickButtonByText = (text, options = { timeout: 30000 }) => {
        let observer;

        const tryClick = () => {
            const btn = [...document.querySelectorAll("button")]
                .find(b => b.textContent.trim().toLowerCase().includes(text.toLowerCase()));

            if (btn) {
                btn.click();
                observer?.disconnect();
                return true;
            }
            return false;
        };

        if (tryClick()) return { cleanup: () => {} };

        observer = new MutationObserver(() => tryClick());
        observer.observe(document.body, { childList: true, subtree: true });

        const timeoutId = setTimeout(() => observer?.disconnect(), options.timeout);

        return {
            cleanup: () => {
                clearTimeout(timeoutId);
                observer?.disconnect();
            }
        };
    };

    /* ===============================
        removeOnAppear (with cleanup)
    ================================*/
    window.utils.removeOnAppear = (selector, options = { root: document.body, timeout: 60000 }) => {
        const root = options.root || document.body;

        // Remove immediately
        document.querySelectorAll(selector).forEach(el => el.remove());

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === "childList") {
                    for (const node of m.addedNodes) {
                        if (!(node instanceof Element)) continue;

                        if (node.matches(selector)) {
                            node.remove();
                            continue;
                        }

                        node.querySelectorAll?.(selector).forEach(el => el.remove());
                    }
                }
            }
        });

        observer.observe(root, { childList: true, subtree: true });

        const timeoutId = setTimeout(() => observer.disconnect(), options.timeout);

        return {
            observer,
            cleanup: () => {
                clearTimeout(timeoutId);
                observer.disconnect();
            }
        };
    };

})();
