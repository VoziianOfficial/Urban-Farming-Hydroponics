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
                ".about-parallax-media img",
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
        const items = queryAll("[data-about-parallax]").map(function (
            section
        ) {
            return {
                section: section,
                media: query("[data-about-parallax-media]", section),
                visible: true
            };
        }).filter(function (item) {
            return Boolean(item.media);
        });

        if (items.length === 0) {
            return null;
        }

        let enabled = false;
        let frameRequested = false;
        let intersectionObserver = null;
        let resizeTimer = 0;

        function canRun() {
            return (
                window.innerWidth >= 992 &&
                !prefersReducedMotion()
            );
        }

        function resetItem(item) {
            item.media.style.transform = "";
            item.media.style.willChange = "";
        }

        function updateItem(item) {
            if (!item.visible) {
                return;
            }

            const rectangle = item.section.getBoundingClientRect();
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
            const parallaxRange = Number.parseFloat(
                item.section.dataset.aboutParallaxRange
            );
            const movement =
                progress *
                -(Number.isFinite(parallaxRange) ? parallaxRange : 42);

            item.media.style.willChange = "transform";
            item.media.style.transform = `translate3d(0, ${movement.toFixed(
                2
            )}px, 0)`;
        }

        function update() {
            frameRequested = false;

            if (!enabled) {
                return;
            }

            items.forEach(updateItem);
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
                            const item = items.find(function (
                                parallaxItem
                            ) {
                                return parallaxItem.section === entry.target;
                            });

                            if (!item) {
                                return;
                            }

                            item.visible = entry.isIntersecting;

                            if (item.visible) {
                                requestUpdate();
                            }
                        });
                    },
                    {
                        rootMargin: "20% 0px 20% 0px",
                        threshold: 0
                    }
                );

                items.forEach(function (item) {
                    intersectionObserver.observe(item.section);
                });
            }

            requestUpdate();
        }

        function disable() {
            enabled = false;
            frameRequested = false;

            window.removeEventListener("scroll", requestUpdate);

            if (intersectionObserver) {
                intersectionObserver.disconnect();
                intersectionObserver = null;
            }

            items.forEach(function (item) {
                item.visible = true;
                resetItem(item);
            });
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

        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    function start() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.ready === "function"
        ) {
            growwise.ready(initAboutPage);
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

(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "about") {
        return;
    }

    let editorialInitialized = false;

    function getGrowwise() {
        return window.Growwise || null;
    }

    function prefersReducedMotion() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.prefersReducedMotion === "function"
        ) {
            return Boolean(
                growwise.prefersReducedMotion()
            );
        }

        if (
            growwise &&
            typeof growwise.prefersReducedMotion === "boolean"
        ) {
            return growwise.prefersReducedMotion;
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

    function createEditorialSwiper() {
        const root = document.querySelector(
            "[data-about-editorial-swiper]"
        );

        const previousButton = document.querySelector(
            "[data-about-editorial-previous]"
        );

        const nextButton = document.querySelector(
            "[data-about-editorial-next]"
        );

        const pagination = document.querySelector(
            "[data-about-editorial-pagination]"
        );

        if (!root) {
            return null;
        }

        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.createSwiperOnce === "function"
        ) {
            return growwise.createSwiperOnce(root, {
                speed: prefersReducedMotion() ? 0 : 720,
                slidesPerView: 1.04,
                slidesPerGroup: 1,
                spaceBetween: 16,
                grabCursor: !prefersReducedMotion(),
                watchOverflow: true,
                observer: true,
                observeParents: true,
                resizeObserver: true,
                keyboard: {
                    enabled: true,
                    onlyInViewport: true
                },
                autoplay: prefersReducedMotion()
                    ? false
                    : {
                        delay: 5600,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true
                    },
                navigation: {
                    prevEl: previousButton,
                    nextEl: nextButton
                },
                pagination: {
                    el: pagination,
                    clickable: true
                },
                a11y: {
                    enabled: true,
                    prevSlideMessage:
                        "Previous editorial principle",
                    nextSlideMessage:
                        "Next editorial principle",
                    firstSlideMessage:
                        "This is the first editorial principle",
                    lastSlideMessage:
                        "This is the last editorial principle",
                    paginationBulletMessage:
                        "Go to editorial principle {{index}}"
                },
                breakpoints: {
                    640: {
                        slidesPerView: 1.2,
                        spaceBetween: 18
                    },
                    768: {
                        slidesPerView: 1.45,
                        spaceBetween: 22
                    },
                    1024: {
                        slidesPerView: 2,
                        spaceBetween: 28
                    }
                }
            });
        }

        if (typeof window.Swiper !== "function") {
            return null;
        }

        return new window.Swiper(root, {
            speed: prefersReducedMotion() ? 0 : 720,
            slidesPerView: 1.04,
            slidesPerGroup: 1,
            spaceBetween: 16,
            grabCursor: !prefersReducedMotion(),
            watchOverflow: true,
            observer: true,
            observeParents: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            autoplay: prefersReducedMotion()
                ? false
                : {
                    delay: 5600,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                },
            navigation: {
                prevEl: previousButton,
                nextEl: nextButton
            },
            pagination: {
                el: pagination,
                clickable: true
            },
            breakpoints: {
                640: {
                    slidesPerView: 1.2,
                    spaceBetween: 18
                },
                768: {
                    slidesPerView: 1.45,
                    spaceBetween: 22
                },
                1024: {
                    slidesPerView: 2,
                    spaceBetween: 28
                }
            }
        });
    }

    function initEditorialCardMovement() {
        const cards = Array.from(
            document.querySelectorAll(
                "[data-about-editorial-card]"
            )
        );

        const precisePointer = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

        if (
            cards.length === 0 ||
            !precisePointer ||
            prefersReducedMotion()
        ) {
            return;
        }

        cards.forEach(function (card) {
            let animationFrame = 0;

            function resetCard() {
                window.cancelAnimationFrame(
                    animationFrame
                );

                card.style.transform =
                    "rotateX(0deg) rotateY(0deg) translateY(0)";
            }

            card.addEventListener(
                "pointermove",
                function (event) {
                    const bounds =
                        card.getBoundingClientRect();

                    const pointerX =
                        event.clientX - bounds.left;

                    const pointerY =
                        event.clientY - bounds.top;

                    const horizontal =
                        pointerX / bounds.width - 0.5;

                    const vertical =
                        pointerY / bounds.height - 0.5;

                    card.style.setProperty(
                        "--about-note-light-x",
                        `${pointerX}px`
                    );

                    card.style.setProperty(
                        "--about-note-light-y",
                        `${pointerY}px`
                    );

                    window.cancelAnimationFrame(
                        animationFrame
                    );

                    animationFrame =
                        window.requestAnimationFrame(
                            function () {
                                card.style.transform =
                                    `rotateX(${vertical * -3.5}deg) ` +
                                    `rotateY(${horizontal * 4.5}deg) ` +
                                    "translateY(-6px)";
                            }
                        );
                }
            );

            card.addEventListener(
                "pointerleave",
                resetCard
            );

            card.addEventListener(
                "pointercancel",
                resetCard
            );
        });
    }

    function initEditorialNotes() {
        if (editorialInitialized) {
            return;
        }

        const section = document.querySelector(
            "[data-about-editorial-notes]"
        );

        if (!section) {
            return;
        }

        editorialInitialized = true;

        createEditorialSwiper();
        initEditorialCardMovement();
        renderIcons();

        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.refreshAOS === "function"
        ) {
            growwise.refreshAOS();
        }
    }

    function startEditorialNotes() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.ready === "function"
        ) {
            growwise.ready(
                initEditorialNotes
            );

            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initEditorialNotes,
                {
                    once: true
                }
            );

            return;
        }

        initEditorialNotes();
    }

    startEditorialNotes();
})();