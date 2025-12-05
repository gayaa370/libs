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

        if (tryClick()) return { cleanup: () => { } };

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

        if (tryClick()) return { cleanup: () => { } };

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

    /* ===============================
       Additional Helpers for Tampermonkey
       (Non-breaking API extensions)
    ================================*/

    /* -------------------------------------
       clickMultipleWhenExists
       - Accepts an array of selectors
       - Clicks each when it appears
    -------------------------------------- */
    window.utils.clickMultipleWhenExists = (selectors, options = { once: true, timeout: 30000 }) => {
        const cleanups = selectors.map(sel =>
            window.utils.clickWhenExists(sel, options)
        );
        return {
            cleanup: () => cleanups.forEach(c => c.cleanup?.())
        };
    };


    /* -------------------------------------
       removeAttributesFromElements
       - remove attributes from all elements matching a selector
    -------------------------------------- */
    window.utils.removeAttributesFromElements = (selector, attributes = []) => {
        document.querySelectorAll(selector).forEach(el => {
            attributes.forEach(attr => el.removeAttribute(attr));
        });
    };


    /* -------------------------------------
       stripSubstringFromHTML
       - Removes specific substrings from innerHTML of all matches
    -------------------------------------- */
    window.utils.stripSubstringFromHTML = (selector, substrings = []) => {
        document.querySelectorAll(selector).forEach(el => {
            let html = el.innerHTML;
            substrings.forEach(str => {
                html = html.replace(str, "");
            });
            el.innerHTML = html;
        });
    };


    /* -------------------------------------
       addButtonBefore
       - Creates a button and inserts before a target
    -------------------------------------- */
    window.utils.addButtonBefore = (targetSelector, { id, text, className, onClick }) => {
        const target = document.querySelector(targetSelector);
        if (!target) return null;

        const btn = document.createElement("button");
        if (id) btn.id = id;
        if (text) btn.textContent = text;
        if (className) btn.className = className;

        if (typeof onClick === "function") {
            btn.addEventListener("click", onClick);
        }

        target.parentNode.insertBefore(btn, target);
        return btn;
    };


    /* -------------------------------------
       observeUntil
       - Observe the DOM until condition returns true
       - Then run callback + auto-cleanup
    -------------------------------------- */
    window.utils.observeUntil = (conditionFn, callback, timeout = 30000) => {

        const check = () => {
            if (conditionFn()) {
                cleanup();
                callback();
                return true;
            }
            return false;
        };

        if (check()) return;

        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });

        const timeoutId = setTimeout(() => cleanup(), timeout);

        function cleanup() {
            clearTimeout(timeoutId);
            observer.disconnect();
        }

        return { cleanup };
    };


    /* -------------------------------------
       autoVideoSkip
       - Automatically skip video to a specific time
       - Accepts default skip or URL-based rules
    -------------------------------------- */
    window.utils.autoVideoSkip = (rules = {}, defaultSkip = 0) => {

        const handler = (e) => {
            const url = location.href;

            for (const key in rules) {
                if (url.includes(key)) {
                    e.target.currentTime = rules[key];
                    return;
                }
            }

            e.target.currentTime = defaultSkip;
        };

        document.querySelectorAll("video").forEach(v => {
            v.addEventListener("loadedmetadata", handler);
        });

        return {
            cleanup: () => {
                document.querySelectorAll("video").forEach(v => {
                    v.removeEventListener("loadedmetadata", handler);
                });
            }
        };
    };

    /* ===============================
   Quality Selector Builder (inserts below custom element)
================================*/
    window.utils.addQualitySelector = ({
        belowSelector,
        qualities = [
            { label: '1080p', color: '#28a745' },
            { label: '720p', color: '#fd7e14' },
            { label: '480p', color: '#007bff' }
        ],
        intervalDelay = 500,
        timeout = 20000
    } = {}) => {

        let intervalId;
        const start = Date.now();

        const poll = () => {
            const video = document.querySelector("video");
            if (!video) {
                if (Date.now() - start > timeout) clearInterval(intervalId);
                return;
            }

            // Determine source URL
            const source = video.querySelector("source");
            const videoSrc = source?.src || video.src || "";
            if (!videoSrc) return;

            clearInterval(intervalId);

            const target = document.querySelector(belowSelector);
            if (!target) return;

            const qualityPattern = /(?:480p|720p|1080p)/;

            qualities.forEach(({ label, color }) => {
                if (!qualityPattern.test(videoSrc)) return;

                const url = videoSrc.replace(qualityPattern, label);

                fetch(url, { method: "HEAD" })
                    .then(res => {
                        if (!res.ok) return;

                        const link = document.createElement("a");
                        link.href = url;
                        link.target = "_blank";
                        link.textContent = label;
                        link.style.color = color;
                        link.style.margin = "4px";
                        link.style.display = "inline-block";

                        // INSERT BELOW TARGET
                        window.utils.insertBelow(belowSelector, [link]);
                    })
                    .catch(() => { });
            });
        };

        intervalId = setInterval(poll, intervalDelay);

        return { cleanup: () => clearInterval(intervalId) };
    };

    /* ================================================
   Select Highest Quality Automatically
   - Scans elements by selector
   - Reads numeric values (e.g., 720, 1080)
   - Chooses the highest <= max
   - Clicks that element
   - Optionally clicks video afterward
================================================ */
    window.utils.selectHighestQuality = ({
        selector = "[data-value]",
        attribute = "data-value",
        max = 1080,
        clickDelay = 600,
        videoClickSelector = null
    } = {}) => {

        const elements = document.querySelectorAll(selector);
        if (!elements.length) return;

        let values = [];

        elements.forEach(el => {
            const val = parseInt(el.getAttribute(attribute), 10);
            if (!isNaN(val) && val <= max && val > 10) {
                values.push(val);
            }
        });

        if (!values.length) return;

        const highest = Math.max(...values);

        // Retrieve existing setting
        let current = null;
        try {
            const saved = JSON.parse(localStorage.getItem("x-player-settings"));
            current = parseInt(saved?.quality);
        } catch { }

        if (highest === current) return;

        // Click the correct quality element
        const target = document.querySelector(`${selector}[${attribute}="${highest}"]`);
        if (target) target.click();

        // Click video afterward to apply settings
        if (videoClickSelector) {
            setTimeout(() => {
                const video = document.querySelector(videoClickSelector);
                video?.click();
            }, clickDelay);
        }
    };

    /* ============================================================
   redirectOnUrlMatch
   - Detects URL changes (SPA + history + mutation)
   - If URL matches a pattern, redirects using replacement rule
   - Works on initial load + navigation changes
============================================================ */
    window.utils.redirectOnUrlMatch = ({
        match,
        replace,
        delay = 0
    } = {}) => {

        if (!match || !replace) return;

        let currentHref = location.href;

        const performRedirect = () => {
            if (location.href.includes(match)) {
                const newUrl = location.href.replace(match, replace);
                if (newUrl !== location.href) {
                    if (delay > 0) {
                        setTimeout(() => location.replace(newUrl), delay);
                    } else {
                        location.replace(newUrl);
                    }
                }
            }
        };

        // Run immediately
        performRedirect();

        // Observe SPA mutations
        const observer = new MutationObserver(() => {
            if (currentHref !== location.href) {
                currentHref = location.href;
                performRedirect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Handle browser navigation
        window.addEventListener("popstate", () => {
            setTimeout(performRedirect, delay);
        });

        return {
            cleanup: () => {
                observer.disconnect();
            }
        };
    };

    /* ============================================================
   redirectToDomain
   - Redirects to a new domain
   - Keeps path + query intact
============================================================ */
    window.utils.redirectToDomain = (newDomain) => {
        if (!newDomain) return;

        // Normalize domain (no trailing slash)
        newDomain = newDomain.replace(/\/+$/, "");

        const newUrl = newDomain + window.location.pathname + window.location.search;

        if (newUrl !== window.location.href) {
            window.location.href = newUrl;
        }
    };


    /* ============================================================
       acceptAgeGates
       - Clicks common age/consent buttons
    ============================================================ */
    window.utils.acceptAgeGates = () => {
        window.utils.clickWhenExists('#rtaAcceptButton');
        window.utils.clickWhenExists('#rtaAcceptButton > button');
        window.utils.clickButtonByText("I'm 18 or older");
        if (window.CookieBanner?.acceptAllCookies) {
            window.CookieBanner.acceptAllCookies();
        }
    };
    /* ============================================================
       insertElement
       - insert a created element relative to a target
       - supports: before, after, prepend, append, replace
    ============================================================ */
    window.utils.insertElement = ({
        targetSelector,
        element,
        position = "after"   // before, after, prepend, append, replace
    } = {}) => {

        const target = document.querySelector(targetSelector);
        if (!target || !(element instanceof Element)) return null;

        switch (position) {
            case "before":
                target.insertAdjacentElement("beforebegin", element);
                break;

            case "after":
                target.insertAdjacentElement("afterend", element);
                break;

            case "prepend":
                target.insertAdjacentElement("afterbegin", element);
                break;

            case "append":
                target.insertAdjacentElement("beforeend", element);
                break;

            case "replace":
                target.replaceWith(element);
                break;
        }

        return element;
    };



    /* ============================================================
       removeElements
       - remove ANY selector you pass (not constant)
    ============================================================ */
    window.utils.removeElements = (selector) => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    };



    /* ============================================================
       observeUntilFound
       - watches DOM for ANY selector you choose
       - once found → callback receives the found element(s)
       - then it stops automatically
    ============================================================ */
    window.utils.observeUntilFound = ({
        selector,
        callback,
        timeout = 30000
    } = {}) => {

        let timer;
        const check = () => {
            const elements = Array.from(document.querySelectorAll(selector));
            if (elements.length) {
                cleanup();
                callback(elements);
                return true;
            }
            return false;
        };

        if (check()) return;

        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });

        timer = setTimeout(() => cleanup(), timeout);

        function cleanup() {
            clearTimeout(timer);
            observer.disconnect();
        }

        return { cleanup };
    };

    /* ============================================================
   autoLogin
   - Fully dynamic login automation
   - You pass selectors + values + retry logic
============================================================ */
    window.utils.autoLogin = ({
        userSelector,
        passSelector,
        buttonSelector,
        userValue,
        passValue,
        retryEvery = 1000,
        totalTime = 10000
    } = {}) => {

        let elapsed = 0;

        const fillAndLogin = () => {
            const userField = document.querySelector(userSelector);
            const passField = document.querySelector(passSelector);
            const loginBtn = document.querySelector(buttonSelector);

            if (!userField || !passField || !loginBtn) return;

            // Fill values dynamically
            userField.value = userValue;
            passField.value = passValue;

            // Trigger input events
            userField.dispatchEvent(new Event('input', { bubbles: true }));
            passField.dispatchEvent(new Event('input', { bubbles: true }));

            // Click login
            loginBtn.click();

            // Stop retrying
            clearInterval(interval);
        };

        // Try immediately
        fillAndLogin();

        // Retry loop
        const interval = setInterval(() => {
            elapsed += retryEvery;
            fillAndLogin();

            if (elapsed >= totalTime) {
                clearInterval(interval);
            }
        }, retryEvery);

        return { cleanup: () => clearInterval(interval) };
    };

    /* ============================================================
   Dynamic & Convenience Helpers (non-breaking additions)
   Use: window.utils.<helperName>(...)
============================================================ */

    /* Insert an element relative to a target (before/after/prepend/append/replace) */
    window.utils.insertElement = ({ targetSelector, element, position = "after" } = {}) => {
        const target = document.querySelector(targetSelector);
        if (!target || !(element instanceof Element)) return null;
        switch (position) {
            case "before": target.insertAdjacentElement("beforebegin", element); break;
            case "after": target.insertAdjacentElement("afterend", element); break;
            case "prepend": target.insertAdjacentElement("afterbegin", element); break;
            case "append": target.insertAdjacentElement("beforeend", element); break;
            case "replace": target.replaceWith(element); break;
        }
        return element;
    };

    /* Remove all elements that match a selector */
    window.utils.removeElements = (selector) => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    };

    /* Observe until selector exists, then call callback with array of found elements */
    window.utils.observeUntilFound = ({ selector, callback, timeout = 30000 } = {}) => {
        let timer;
        const check = () => {
            const nodes = Array.from(document.querySelectorAll(selector));
            if (nodes.length) {
                cleanup();
                callback(nodes);
                return true;
            }
            return false;
        };
        if (check()) return;
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        timer = setTimeout(() => cleanup(), timeout);
        function cleanup() { clearTimeout(timer); observer.disconnect(); }
        return { cleanup };
    };

    /* Create a menu/button entry and insert it near a parent element
       parentSelector: selector of existing element near which to insert
       options: { text, href, tag='a', className, id, attributes, position: 'after'|'before'|'append'|'prepend' }
    */
    window.utils.createMenuButton = (parentSelector, options = {}) => {
        const parent = document.querySelector(parentSelector);
        if (!parent) return null;
        const tag = options.tag || 'a';
        const el = document.createElement(tag);
        if (options.id) el.id = options.id;
        if (options.className) el.className = options.className;
        if (options.href) el.href = options.href;
        if (options.text) el.textContent = options.text;
        if (options.html) el.innerHTML = options.html;
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([k, v]) => el.setAttribute(k, v));
        }
        const pos = options.position || 'after';
        window.utils.insertElement({ targetSelector: parentSelector, element: el, position: pos });
        return el;
    };

    /* Create a generic "clear all" control that clicks every element matching removeSelector
       and optionally reloads after completion.
       options: { insertNearSelector, insertPosition, buttonText, buttonClass, reloadAfter, reloadDelay }
    */
    window.utils.createClearAllControl = (removeSelector, options = {}) => {
        if (!removeSelector) return null;
        const defaultOpts = {
            insertNearSelector: null,
            insertPosition: 'after',
            buttonText: 'Clear All',
            buttonClass: 'greyButton',
            reloadAfter: true,
            reloadDelay: 800
        };
        const cfg = Object.assign({}, defaultOpts, options);

        // create the trigger button
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = cfg.buttonClass;
        btn.textContent = cfg.buttonText;
        btn.style.cursor = 'pointer';

        // insert it if a location was provided
        if (cfg.insertNearSelector) {
            window.utils.insertElement({ targetSelector: cfg.insertNearSelector, element: btn, position: cfg.insertPosition });
        }

        const handler = (e) => {
            if (e) e.preventDefault();
            const nodes = Array.from(document.querySelectorAll(removeSelector));
            if (!nodes.length) return;
            nodes.forEach(n => {
                // prefer to trigger click on the actionable element
                try { n.click(); } catch (err) { /* ignore */ }
            });
            if (cfg.reloadAfter) setTimeout(() => location.reload(), cfg.reloadDelay);
        };

        btn.addEventListener('click', handler);

        return { button: btn, cleanup: () => btn.removeEventListener('click', handler) };
    };

    /* Auto-enable common video keyboard controls and double-click fullscreen
       options: { rewind:10, forward:10, spaceToggles:true, scrollTopOnPlay:true, dblClickFullscreen:true, playerSelector }
    */
    window.utils.enableVideoKeys = (options = {}) => {
        const cfg = Object.assign({
            rewind: 10, forward: 10, spaceToggles: true, scrollTopOnPlay: true, dblClickFullscreen: true, playerSelector: 'video'
        }, options);

        const getPlayer = () => document.querySelector(cfg.playerSelector);
        const keyHandler = (e) => {
            const player = getPlayer();
            if (!player) return;
            // left
            if (e.key === 'ArrowLeft' || e.which === 37) {
                player.currentTime = Math.max(0, player.currentTime - cfg.rewind);
            }
            // right
            if (e.key === 'ArrowRight' || e.which === 39) {
                player.currentTime = Math.min(player.duration || Infinity, player.currentTime + cfg.forward);
            }
            // space
            if ((e.key === ' ' || e.key === 'Spacebar' || e.which === 32) && cfg.spaceToggles) {
                if (e.target === document.body || e.target === document.documentElement) {
                    e.preventDefault();
                    if (player.paused) {
                        if (cfg.scrollTopOnPlay) window.scrollTo({ top: 0, behavior: 'smooth' });
                        player.play();
                    } else {
                        player.pause();
                    }
                }
            }
        };

        const dblHandler = () => {
            const player = getPlayer();
            if (!player) return;
            // full screen attempt
            if (player.requestFullscreen) player.requestFullscreen();
            else if (player.webkitRequestFullScreen) player.webkitRequestFullScreen();
            else if (player.mozRequestFullScreen) player.mozRequestFullScreen();
        };

        document.addEventListener('keydown', keyHandler, true);
        if (cfg.dblClickFullscreen) {
            const player = getPlayer();
            if (player) player.addEventListener('dblclick', dblHandler);
        }

        return {
            cleanup: () => {
                document.removeEventListener('keydown', keyHandler, true);
                const player = getPlayer();
                if (player) player.removeEventListener('dblclick', dblHandler);
            }
        };
    };

    /* Ensure the current URL contains a given query fragment (e.g. '&type=public') and if not append it */
    window.utils.ensureUrlHas = (fragment) => {
        if (!fragment) return;
        const href = location.href;
        if (href.includes(fragment)) return;
        // If there's a hash, put fragment before hash
        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) {
            const beforeHash = href.slice(0, hashIndex);
            const hash = href.slice(hashIndex);
            location.href = beforeHash + (beforeHash.includes('?') ? '&' : '?') + fragment.replace(/^[&?]+/, '') + hash;
        } else {
            location.href = href + (href.includes('?') ? '&' : '?') + fragment.replace(/^[&?]+/, '');
        }
    };

    /* Copy cookie value into a cookie with the same name but updated expiry (days) */
    window.utils.copyCookie = (name, days = 365) => {
        if (!name) return;
        // simple cookie parser
        const cookieString = document.cookie || '';
        const match = cookieString.split('; ').find(c => c.startsWith(name + '='));
        if (!match) return;
        const val = match.split('=').slice(1).join('=');
        try {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = `${name}=${val}; expires=${date.toUTCString()}; path=/`;
        } catch (e) { /* ignore */ }
        return val;
    };


})();
