(function () {
    "use strict";

    const body = document.body;

    if (!body || !body.classList.contains("page-legal")) {
        return;
    }

    let initialized = false;

    function query(selector, root) {
        return (root || document).querySelector(selector);
    }

    function queryAll(selector, root) {
        return Array.from(
            (root || document).querySelectorAll(selector)
        );
    }

    function getGrowwise() {
        return window.Growwise || null;
    }

    function prefersReducedMotion() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.prefersReducedMotion === "function"
        ) {
            return Boolean(growwise.prefersReducedMotion());
        }

        if (
            growwise &&
            typeof growwise.prefersReducedMotion === "boolean"
        ) {
            return growwise.prefersReducedMotion;
        }

        if (
            growwise &&
            typeof growwise.reducedMotion === "function"
        ) {
            return Boolean(growwise.reducedMotion());
        }

        if (
            growwise &&
            typeof growwise.reducedMotion === "boolean"
        ) {
            return growwise.reducedMotion;
        }

        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    function renderIcons() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.renderIcons === "function"
        ) {
            growwise.renderIcons();
            return;
        }

        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    function getHeaderHeight() {
        const header =
            query(".site-header", query("[data-site-header]")) ||
            query(".site-header");

        return header
            ? Math.ceil(header.getBoundingClientRect().height)
            : 0;
    }

    function setHeaderHeightVariable() {
        const height = getHeaderHeight();

        if (height > 0) {
            document.documentElement.style.setProperty(
                "--header-height",
                `${height}px`
            );
        }
    }

    function getScrollOffset() {
        return getHeaderHeight() + 24;
    }

    function scrollToTarget(target, updateHistory) {
        if (!target) {
            return;
        }

        const destination =
            target.getBoundingClientRect().top +
            window.scrollY -
            getScrollOffset();

        window.scrollTo({
            top: Math.max(0, destination),
            behavior: prefersReducedMotion() ? "auto" : "smooth"
        });

        if (
            updateHistory &&
            target.id &&
            window.history &&
            typeof window.history.replaceState === "function"
        ) {
            window.history.replaceState(
                null,
                "",
                `#${target.id}`
            );
        }
    }

    function initLegalNavigation() {
        const navigation = query("[data-legal-navigation]");

        if (
            !navigation ||
            navigation.dataset.legalNavigationInitialized ===
            "true"
        ) {
            return;
        }

        const links = queryAll(
            "[data-legal-navigation-link]",
            navigation
        );

        const entries = links
            .map(function (link) {
                const sectionId =
                    link.dataset.legalSection ||
                    link.getAttribute("href")?.replace(/^#/, "") ||
                    "";

                const section = sectionId
                    ? document.getElementById(sectionId)
                    : null;

                if (!section) {
                    return null;
                }

                return {
                    id: sectionId,
                    link: link,
                    section: section
                };
            })
            .filter(Boolean);

        if (entries.length === 0) {
            return;
        }

        navigation.dataset.legalNavigationInitialized = "true";

        let activeId = "";
        let frameRequested = false;
        let resizeTimer = 0;

        function keepActiveLinkVisible(link) {
            if (!link || window.innerWidth >= 992) {
                return;
            }

            const navigationRectangle =
                navigation.getBoundingClientRect();
            const linkRectangle = link.getBoundingClientRect();

            if (
                linkRectangle.top >= navigationRectangle.top &&
                linkRectangle.bottom <= navigationRectangle.bottom
            ) {
                return;
            }

            link.scrollIntoView({
                behavior: prefersReducedMotion()
                    ? "auto"
                    : "smooth",
                block: "nearest",
                inline: "nearest"
            });
        }

        function setActive(id) {
            if (!id || id === activeId) {
                return;
            }

            activeId = id;

            entries.forEach(function (entry) {
                const active = entry.id === id;

                entry.link.classList.toggle("is-active", active);

                if (active) {
                    entry.link.setAttribute(
                        "aria-current",
                        "location"
                    );
                    keepActiveLinkVisible(entry.link);
                } else {
                    entry.link.removeAttribute("aria-current");
                }
            });
        }

        function detectActiveSection() {
            const currentPosition =
                window.scrollY + getScrollOffset() + 18;

            let selectedEntry = entries[0];

            entries.forEach(function (entry) {
                if (entry.section.offsetTop <= currentPosition) {
                    selectedEntry = entry;
                }
            });

            const atPageBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 4;

            if (atPageBottom) {
                selectedEntry = entries[entries.length - 1];
            }

            setActive(selectedEntry.id);
        }

        function requestUpdate() {
            if (frameRequested) {
                return;
            }

            frameRequested = true;

            window.requestAnimationFrame(function () {
                frameRequested = false;
                detectActiveSection();
            });
        }

        function handleResize() {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(function () {
                setHeaderHeightVariable();
                requestUpdate();
            }, 120);
        }

        entries.forEach(function (entry) {
            entry.link.addEventListener("click", function (event) {
                event.preventDefault();
                setActive(entry.id);
                scrollToTarget(entry.section, true);
            });
        });

        window.addEventListener("scroll", requestUpdate, {
            passive: true
        });

        window.addEventListener("resize", handleResize);

        const hash = window.location.hash.replace("#", "");
        const matchingEntry = entries.find(function (entry) {
            return entry.id === hash;
        });

        if (matchingEntry) {
            setActive(matchingEntry.id);
        } else {
            detectActiveSection();
        }
    }

    function initBackToTop() {
        const links = queryAll("[data-legal-back-to-top]");

        links.forEach(function (link) {
            if (link.dataset.backToTopInitialized === "true") {
                return;
            }

            link.dataset.backToTopInitialized = "true";

            link.addEventListener("click", function (event) {
                event.preventDefault();

                window.scrollTo({
                    top: 0,
                    behavior: prefersReducedMotion()
                        ? "auto"
                        : "smooth"
                });

                if (
                    window.history &&
                    typeof window.history.replaceState === "function"
                ) {
                    window.history.replaceState(
                        null,
                        "",
                        `${window.location.pathname}${window.location.search}`
                    );
                }
            });
        });
    }

    function initInternalLegalLinks() {
        const links = queryAll(
            '.legal-content a[href^="#"]:not([data-legal-back-to-top])'
        );

        links.forEach(function (link) {
            if (
                link.dataset.legalInternalLinkInitialized === "true"
            ) {
                return;
            }

            const targetId = link
                .getAttribute("href")
                ?.replace(/^#/, "");

            const target = targetId
                ? document.getElementById(targetId)
                : null;

            if (!target) {
                return;
            }

            link.dataset.legalInternalLinkInitialized = "true";

            link.addEventListener("click", function (event) {
                event.preventDefault();
                scrollToTarget(target, true);
            });
        });
    }

    function initExternalLinks() {
        const links = queryAll(
            '.legal-content a[href^="http"], .legal-content a[href^="//"]'
        );

        links.forEach(function (link) {
            let destination;

            try {
                destination = new URL(
                    link.getAttribute("href"),
                    window.location.href
                );
            } catch (error) {
                return;
            }

            if (destination.origin === window.location.origin) {
                return;
            }

            if (!link.hasAttribute("target")) {
                link.setAttribute("target", "_blank");
            }

            const existingRel = (
                link.getAttribute("rel") || ""
            )
                .split(/\s+/)
                .filter(Boolean);

            ["noopener", "noreferrer"].forEach(function (value) {
                if (!existingRel.includes(value)) {
                    existingRel.push(value);
                }
            });

            link.setAttribute("rel", existingRel.join(" "));
        });
    }

    function initHashPosition() {
        const hash = window.location.hash.replace("#", "");

        if (!hash) {
            return;
        }

        const target = document.getElementById(hash);

        if (!target) {
            return;
        }

        window.requestAnimationFrame(function () {
            window.setTimeout(function () {
                scrollToTarget(target, false);
            }, 120);
        });
    }

    function initPrintPreparation() {
        window.addEventListener("beforeprint", function () {
            document.documentElement.style.removeProperty(
                "--header-height"
            );
        });

        window.addEventListener("afterprint", function () {
            setHeaderHeightVariable();
        });
    }

    function initLegalPage() {
        if (initialized) {
            return;
        }

        initialized = true;
        body.dataset.legalInitialized = "true";

        setHeaderHeightVariable();
        initLegalNavigation();
        initBackToTop();
        initInternalLegalLinks();
        initExternalLinks();
        initPrintPreparation();
        renderIcons();

        window.requestAnimationFrame(function () {
            initHashPosition();
        });

        window.addEventListener(
            "load",
            function () {
                setHeaderHeightVariable();
            },
            {
                once: true
            }
        );
    }

    function start() {
        const growwise = getGrowwise();

        if (growwise && typeof growwise.ready === "function") {
            growwise.ready(initLegalPage);
            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initLegalPage,
                {
                    once: true
                }
            );
        } else {
            initLegalPage();
        }
    }

    start();
})();
