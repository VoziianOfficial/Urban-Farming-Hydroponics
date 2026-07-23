(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "about") {
        return;
    }

    let initialized = false;
    let contextParallax = null;

    function getGrowwise() {
        return window.Growwise || null;
    }

    function query(selector, root) {
        return (root || document).querySelector(selector);
    }

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function prefersReducedMotion() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.prefersReducedMotion === "function"
        ) {
            return growwise.prefersReducedMotion();
        }

        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    function refreshAOS() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.refreshAOS === "function"
        ) {
            growwise.refreshAOS();
        }
    }

    function renderIcons() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.renderIcons === "function"
        ) {
            growwise.renderIcons();
        }
    }

    function markImageReady(image) {
        if (!(image instanceof HTMLImageElement)) {
            return;
        }

        const wrapper = image.parentElement;

        image.dataset.imageState = "ready";

        if (wrapper) {
            wrapper.classList.add("is-image-ready");
        }
    }

    function markImageError(image) {
        if (!(image instanceof HTMLImageElement)) {
            return;
        }

        const wrapper = image.parentElement;

        image.dataset.imageState = "error";

        if (wrapper) {
            wrapper.classList.add("has-image-error");
        }
    }

    function initImageStates() {
        const images = queryAll(
            [
                ".about-purpose__visuals img",
                ".about-audience__layout img",
                ".about-coverage__visual img",
                ".about-comparisons__feature img",
                ".about-context__media img",
                ".about-collaboration__visual img"
            ].join(",")
        );

        images.forEach(function (image) {
            if (image.dataset.imageStateInitialized === "true") {
                return;
            }

            image.dataset.imageStateInitialized = "true";

            if (image.complete) {
                if (image.naturalWidth > 0) {
                    markImageReady(image);
                } else {
                    markImageError(image);
                }

                return;
            }

            image.addEventListener(
                "load",
                function () {
                    markImageReady(image);
                },
                {
                    once: true
                }
            );

            image.addEventListener(
                "error",
                function () {
                    markImageError(image);
                },
                {
                    once: true
                }
            );
        });
    }

    function initVisualObservers() {
        const visuals = queryAll(
            [
                ".about-purpose__visuals",
                ".about-clarity__panels",
                ".about-audience__layout",
                ".about-coverage__visual",
                ".about-comparisons__layout",
                ".about-principles__items",
                ".about-collaboration__visual"
            ].join(",")
        );

        if (visuals.length === 0) {
            return null;
        }

        if (
            prefersReducedMotion() ||
            !("IntersectionObserver" in window)
        ) {
            visuals.forEach(function (visual) {
                visual.classList.add("is-in-view");
            });

            return null;
        }

        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("is-in-view");
                    observer.unobserve(entry.target);
                });
            },
            {
                rootMargin: "0px 0px -8% 0px",
                threshold: 0.12
            }
        );

        visuals.forEach(function (visual) {
            observer.observe(visual);
        });

        return observer;
    }

    function createContextParallax() {
        const section = query(".about-context");
        const media = query(".about-context__media", section);

        if (!section || !media) {
            return null;
        }

        let enabled = false;
        let visible = true;
        let frameRequested = false;
        let intersectionObserver = null;
        let resizeTimer = 0;

        function canRun() {
            return (
                window.innerWidth >= 992 &&
                !prefersReducedMotion()
            );
        }

        function reset() {
            media.style.transform = "";
            media.style.willChange = "";
        }

        function update() {
            frameRequested = false;

            if (!enabled || !visible) {
                return;
            }

            const rectangle = section.getBoundingClientRect();
            const viewportHeight =
                window.innerHeight ||
                document.documentElement.clientHeight;

            if (
                rectangle.bottom <= 0 ||
                rectangle.top >= viewportHeight
            ) {
                return;
            }

            const sectionCenter =
                rectangle.top + rectangle.height / 2;
            const viewportCenter = viewportHeight / 2;
            const distance = sectionCenter - viewportCenter;
            const range = viewportHeight + rectangle.height;
            const progress = Math.max(
                -1,
                Math.min(1, distance / range)
            );
            const movement = progress * -42;

            media.style.willChange = "transform";
            media.style.transform = `translate3d(0, ${movement.toFixed(
                2
            )}px, 0)`;
        }

        function requestUpdate() {
            if (!enabled || frameRequested) {
                return;
            }

            frameRequested = true;
            window.requestAnimationFrame(update);
        }

        function enable() {
            if (enabled) {
                requestUpdate();
                return;
            }

            enabled = true;
            window.addEventListener("scroll", requestUpdate, {
                passive: true
            });

            if ("IntersectionObserver" in window) {
                intersectionObserver = new IntersectionObserver(
                    function (entries) {
                        entries.forEach(function (entry) {
                            visible = entry.isIntersecting;

                            if (visible) {
                                requestUpdate();
                            }
                        });
                    },
                    {
                        rootMargin: "20% 0px 20% 0px",
                        threshold: 0
                    }
                );

                intersectionObserver.observe(section);
            }

            requestUpdate();
        }

        function disable() {
            enabled = false;
            frameRequested = false;
            visible = true;

            window.removeEventListener("scroll", requestUpdate);

            if (intersectionObserver) {
                intersectionObserver.disconnect();
                intersectionObserver = null;
            }

            reset();
        }

        function sync() {
            if (canRun()) {
                enable();
            } else {
                disable();
            }
        }

        function handleResize() {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(function () {
                sync();
                requestUpdate();
            }, 120);
        }

        function handleMotionChange() {
            sync();
        }

        window.addEventListener("resize", handleResize);
        window.addEventListener(
            "growwise:motion-change",
            handleMotionChange
        );

        sync();

        return {
            refresh: function () {
                sync();
                requestUpdate();
            },
            destroy: function () {
                disable();
                window.clearTimeout(resizeTimer);
                window.removeEventListener("resize", handleResize);
                window.removeEventListener(
                    "growwise:motion-change",
                    handleMotionChange
                );
            }
        };
    }

    function initAboutPage() {
        if (initialized) {
            return;
        }

        initialized = true;
        body.dataset.aboutInitialized = "true";

        initImageStates();
        initVisualObservers();
        contextParallax = createContextParallax();
        renderIcons();

        window.requestAnimationFrame(function () {
            if (contextParallax) {
                contextParallax.refresh();
            }

            refreshAOS();
        });

        window.addEventListener(
            "load",
            function () {
                initImageStates();

                if (contextParallax) {
                    contextParallax.refresh();
                }

                refreshAOS();
            },
            {
                once: true
            }
        );
    }

    function start() {
        const growwise = getGrowwise();

        if (growwise && growwise.ready) {
            growwise.ready.then(function (readyState) {
                if (readyState !== false) {
                    initAboutPage();
                }
            });

            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initAboutPage,
                {
                    once: true
                }
            );
        } else {
            initAboutPage();
        }
    }

    start();
})();