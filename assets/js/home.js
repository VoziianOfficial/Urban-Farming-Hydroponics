(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "home") {
        return;
    }

    let heroSwiper = null;
    let categoryCirclesSwiper = null;
    let systemsSwiper = null;
    let questionsSwiper = null;
    let parallaxController = null;
    let initialized = false;

    function getGrowwise() {
        return window.Growwise || null;
    }

    function query(selector, root) {
        return (root || document).querySelector(selector);
    }

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function isReducedMotion() {
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

    function normalizeUrl(value) {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.normalizeUrl === "function"
        ) {
            return growwise.normalizeUrl(value);
        }

        return typeof value === "string" && value.trim()
            ? value.trim()
            : "#";
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

    function refreshAOS() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.refreshAOS === "function"
        ) {
            growwise.refreshAOS();
        }
    }

    function createSwiper(root, options) {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.createSwiperOnce === "function"
        ) {
            return growwise.createSwiperOnce(root, options);
        }

        if (
            root &&
            window.Swiper &&
            typeof window.Swiper === "function"
        ) {
            if (root.growwiseSwiper) {
                return root.growwiseSwiper;
            }

            root.growwiseSwiper = new window.Swiper(root, options || {});

            return root.growwiseSwiper;
        }

        return null;
    }

    function sanitizeIconName(value) {
        if (
            typeof value !== "string" ||
            !/^[a-z0-9-]+$/i.test(value)
        ) {
            return "circle";
        }

        return value;
    }

    function renderPaginationBullet(label, index, className) {
        return `
      <button
        class="${className}"
        type="button"
        aria-label="${label} ${index + 1}"
      ></button>
    `;
    }

    function preloadImage(source) {
        return new Promise(function (resolve, reject) {
            if (!source) {
                reject(new Error("Missing image source"));
                return;
            }

            const image = new Image();

            image.onload = function () {
                resolve(source);
            };

            image.onerror = function () {
                reject(new Error("Image could not be loaded"));
            };

            image.src = source;
        });
    }

    function setTabState(buttons, activeButton) {
        buttons.forEach(function (button) {
            const isActive = button === activeButton;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
            button.tabIndex = isActive ? 0 : -1;
        });
    }

    function focusTabByOffset(buttons, currentButton, offset) {
        const currentIndex = buttons.indexOf(currentButton);

        if (currentIndex < 0 || buttons.length === 0) {
            return;
        }

        const nextIndex =
            (currentIndex + offset + buttons.length) % buttons.length;

        buttons[nextIndex].focus();
    }

    function handleTabKeyboard(event, buttons, currentButton) {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            focusTabByOffset(buttons, currentButton, 1);
            return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            focusTabByOffset(buttons, currentButton, -1);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();

            if (buttons[0]) {
                buttons[0].focus();
            }

            return;
        }

        if (event.key === "End") {
            event.preventDefault();

            const lastButton = buttons[buttons.length - 1];

            if (lastButton) {
                lastButton.focus();
            }
        }
    }

    function initHeroSwiper() {
        const root = query("[data-home-hero-swiper]");
        const previousButton = query("[data-home-hero-previous]");
        const nextButton = query("[data-home-hero-next]");
        const pagination = query("[data-home-hero-pagination]");

        if (!root) {
            return null;
        }

        const autoplay = isReducedMotion()
            ? false
            : {
                delay: 6500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            };

        const instance = createSwiper(root, {
            loop: true,
            speed: isReducedMotion() ? 0 : 850,
            effect: "slide",
            slidesPerView: 1,
            spaceBetween: 0,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            resizeObserver: true,
            autoplay: autoplay,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            navigation: {
                previousEl: previousButton,
                nextEl: nextButton,
                prevEl: previousButton,
                nextEl: nextButton
            },
            pagination: {
                el: pagination,
                clickable: true,
                renderBullet: function (index, className) {
                    return renderPaginationBullet(
                        "Go to introduction slide",
                        index,
                        className
                    );
                }
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous introduction slide",
                nextSlideMessage: "Next introduction slide",
                firstSlideMessage: "This is the first introduction slide",
                lastSlideMessage: "This is the last introduction slide",
                paginationBulletMessage: "Go to introduction slide {{index}}"
            }
        });

        if (!instance) {
            return null;
        }

        let heroVisible = true;

        function syncAutoplay() {
            if (
                !instance.autoplay ||
                typeof instance.autoplay.stop !== "function"
            ) {
                return;
            }

            if (
                isReducedMotion() ||
                document.hidden ||
                !heroVisible
            ) {
                instance.autoplay.stop();
                return;
            }

            if (typeof instance.autoplay.start === "function") {
                instance.autoplay.start();
            }
        }

        document.addEventListener("visibilitychange", syncAutoplay);

        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        heroVisible = entry.isIntersecting;
                        syncAutoplay();
                    });
                },
                {
                    threshold: 0.12
                }
            );

            observer.observe(root);

            root.addEventListener(
                "growwise:destroy",
                function () {
                    observer.disconnect();
                },
                {
                    once: true
                }
            );
        }

        window.addEventListener("growwise:motion-change", syncAutoplay);
        syncAutoplay();

        return instance;
    }

    function initCategoryCirclesSwiper() {
        const section = query(".home-oval-categories");
        const root = query(
            "[data-home-oval-categories-swiper]",
            section
        );
        const previousButton =
            query("[data-home-oval-categories-previous]", section) ||
            query(".home-oval-categories__button:first-child", section);
        const nextButton =
            query("[data-home-oval-categories-next]", section) ||
            query(".home-oval-categories__button:last-child", section);

        if (!root) {
            return null;
        }

        const instance = createSwiper(root, {
            speed: isReducedMotion() ? 0 : 650,
            slidesPerView: 2,
            slidesPerGroup: 1,
            spaceBetween: 10,
            grabCursor: !isReducedMotion(),
            simulateTouch: true,
            threshold: 6,
            rewind: true,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            resizeObserver: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            navigation: {
                prevEl: previousButton,
                nextEl: nextButton
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous category",
                nextSlideMessage: "Next category",
                firstSlideMessage: "This is the first category",
                lastSlideMessage: "This is the last category"
            },
            breakpoints: {
                575: {
                    slidesPerView: 2,
                    spaceBetween: 14
                },
                768: {
                    slidesPerView: 2.5,
                    spaceBetween: 20
                },
                1100: {
                    slidesPerView: 3,
                    spaceBetween: 28
                }
            }
        });

        if (previousButton) {
            previousButton.addEventListener("click", function (event) {
                event.preventDefault();

                if (instance && typeof instance.slidePrev === "function") {
                    instance.slidePrev();
                    return;
                }

                root.scrollBy({
                    left: -root.clientWidth * 0.85,
                    behavior: isReducedMotion() ? "auto" : "smooth"
                });
            });
        }

        if (nextButton) {
            nextButton.addEventListener("click", function (event) {
                event.preventDefault();

                if (instance && typeof instance.slideNext === "function") {
                    instance.slideNext();
                    return;
                }

                root.scrollBy({
                    left: root.clientWidth * 0.85,
                    behavior: isReducedMotion() ? "auto" : "smooth"
                });
            });
        }

        if (instance) {
            window.requestAnimationFrame(function () {
                if (typeof instance.update === "function") {
                    instance.update();
                }
            });
        }

        return instance;
    }

    function initSystemsSwiper() {
        const root = query("[data-home-systems-swiper]");
        const previousButton = query("[data-home-systems-previous]");
        const nextButton = query("[data-home-systems-next]");
        const pagination = query("[data-home-systems-pagination]");

        if (!root) {
            return null;
        }

        return createSwiper(root, {
            speed: isReducedMotion() ? 0 : 650,
            slidesPerView: 1.08,
            slidesPerGroup: 1,
            spaceBetween: 16,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            resizeObserver: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            navigation: {
                previousEl: previousButton,
                nextEl: nextButton,
                prevEl: previousButton
            },
            pagination: {
                el: pagination,
                clickable: true,
                renderBullet: function (index, className) {
                    return renderPaginationBullet(
                        "Go to growing system slide",
                        index,
                        className
                    );
                }
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous growing system",
                nextSlideMessage: "Next growing system",
                firstSlideMessage: "This is the first growing system",
                lastSlideMessage: "This is the last growing system",
                paginationBulletMessage: "Go to growing system slide {{index}}"
            },
            breakpoints: {
                640: {
                    slidesPerView: 1.45,
                    spaceBetween: 18
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 22
                },
                1100: {
                    slidesPerView: 3,
                    spaceBetween: 28
                }
            }
        });
    }

    function initQuestionsSwiper() {
        const root = query("[data-home-questions-swiper]");
        const previousButton = query("[data-home-questions-previous]");
        const nextButton = query("[data-home-questions-next]");
        const pagination = query("[data-home-questions-pagination]");

        if (!root) {
            return null;
        }

        return createSwiper(root, {
            speed: isReducedMotion() ? 0 : 650,
            slidesPerView: 1.06,
            slidesPerGroup: 1,
            spaceBetween: 16,
            watchOverflow: true,
            observer: true,
            observeParents: true,
            resizeObserver: true,
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            navigation: {
                previousEl: previousButton,
                nextEl: nextButton,
                prevEl: previousButton
            },
            pagination: {
                el: pagination,
                clickable: true,
                renderBullet: function (index, className) {
                    return renderPaginationBullet(
                        "Go to question slide",
                        index,
                        className
                    );
                }
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous growing question",
                nextSlideMessage: "Next growing question",
                firstSlideMessage: "This is the first growing question",
                lastSlideMessage: "This is the last growing question",
                paginationBulletMessage: "Go to question slide {{index}}"
            },
            breakpoints: {
                640: {
                    slidesPerView: 1.45,
                    spaceBetween: 18
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 22
                },
                1120: {
                    slidesPerView: 3,
                    spaceBetween: 28
                }
            }
        });
    }

    function initGrowingPathSelector() {
        const root = query("[data-home-path-selector]");

        if (!root || root.dataset.pathSelectorInitialized === "true") {
            return;
        }

        const buttons = queryAll("[data-home-path-button]", root);
        const panel = query("[data-home-path-panel]", root);
        const image = query("[data-home-path-image]", root);
        const label = query("[data-home-path-label]", root);
        const title = query("[data-home-path-title]", root);
        const summary = query("[data-home-path-summary]", root);
        const factOne = query("[data-home-path-fact-one]", root);
        const factTwo = query("[data-home-path-fact-two]", root);
        const link = query("[data-home-path-link]", root);

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !label ||
            !title ||
            !summary ||
            !factOne ||
            !factTwo ||
            !link
        ) {
            return;
        }

        root.dataset.pathSelectorInitialized = "true";
        panel.setAttribute("aria-live", "polite");

        const hoverQuery = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );
        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.pathKey || "";
        let changeTimer = 0;
        let requestToken = 0;

        function applyContent(button, loadedImageSource) {
            const buttonLabel =
                query("span", button)?.textContent.trim() ||
                button.dataset.pathKey ||
                "Growing topic";

            label.textContent = buttonLabel;
            title.textContent = button.dataset.pathTitle || "";
            summary.textContent = button.dataset.pathSummary || "";
            factOne.textContent = button.dataset.pathFactOne || "";
            factTwo.textContent = button.dataset.pathFactTwo || "";
            link.href = normalizeUrl(button.dataset.pathHref || "#");

            if (loadedImageSource) {
                image.src = loadedImageSource;
                image.alt = button.dataset.pathAlt || "";
            }

            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.pathKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(button.dataset.pathImage || "");
            const delay = isReducedMotion() ? 0 : 150;

            setTabState(buttons, button);
            panel.classList.add("is-changing");
            window.clearTimeout(changeTimer);

            preloadImage(source)
                .then(function (loadedSource) {
                    if (currentToken !== requestToken) {
                        return;
                    }

                    changeTimer = window.setTimeout(function () {
                        if (currentToken !== requestToken) {
                            return;
                        }

                        applyContent(button, loadedSource);
                    }, delay);
                })
                .catch(function () {
                    if (currentToken !== requestToken) {
                        return;
                    }

                    changeTimer = window.setTimeout(function () {
                        if (currentToken !== requestToken) {
                            return;
                        }

                        applyContent(button, "");
                    }, delay);
                });
        }

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                activate(button, false);
            });

            button.addEventListener("focus", function () {
                activate(button, false);
            });

            button.addEventListener("keydown", function (event) {
                handleTabKeyboard(event, buttons, button);
            });

            button.addEventListener("mouseenter", function () {
                if (hoverQuery.matches) {
                    activate(button, false);
                }
            });
        });

        const initialButton =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            }) || buttons[0];

        if (initialButton) {
            activate(initialButton, true);
        }
    }

    function initBalanceSwitcher() {
        const root = query("[data-home-balance]");

        if (!root || root.dataset.balanceInitialized === "true") {
            return;
        }

        const buttons = queryAll("[data-home-balance-button]", root);
        const panel = query("[data-home-balance-panel]", root);
        const image = query("[data-home-balance-image]", root);
        const eyebrow = query("[data-home-balance-eyebrow]", root);
        const title = query("[data-home-balance-title]", root);
        const text = query("[data-home-balance-text]", root);
        const link = query("[data-home-balance-link]", root);
        const linkLabel = query("[data-home-balance-link-label]", root);
        const iconContainer = query(".home-balance__icon", root);

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !eyebrow ||
            !title ||
            !text ||
            !link ||
            !linkLabel ||
            !iconContainer
        ) {
            return;
        }

        root.dataset.balanceInitialized = "true";
        panel.setAttribute("aria-live", "polite");

        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.balanceKey || "";
        let changeTimer = 0;
        let requestToken = 0;

        function updateIcon(iconName) {
            const safeIconName = sanitizeIconName(iconName);

            iconContainer.innerHTML = `
        <i
          data-lucide="${safeIconName}"
          data-home-balance-icon
          aria-hidden="true"
        ></i>
      `;

            renderIcons();
        }

        function applyContent(button, loadedImageSource) {
            eyebrow.textContent = button.dataset.balanceEyebrow || "";
            title.textContent = button.dataset.balanceTitle || "";
            text.textContent = button.dataset.balanceText || "";
            link.href = normalizeUrl(button.dataset.balanceHref || "#");
            linkLabel.textContent = button.dataset.balanceLink || "Learn more";

            if (loadedImageSource) {
                image.src = loadedImageSource;
                image.alt = button.dataset.balanceAlt || "";
            }

            updateIcon(button.dataset.balanceIcon || "circle");
            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.balanceKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(button.dataset.balanceImage || "");
            const delay = isReducedMotion() ? 0 : 150;

            setTabState(buttons, button);
            panel.classList.add("is-changing");
            window.clearTimeout(changeTimer);

            preloadImage(source)
                .then(function (loadedSource) {
                    if (currentToken !== requestToken) {
                        return;
                    }

                    changeTimer = window.setTimeout(function () {
                        if (currentToken !== requestToken) {
                            return;
                        }

                        applyContent(button, loadedSource);
                    }, delay);
                })
                .catch(function () {
                    if (currentToken !== requestToken) {
                        return;
                    }

                    changeTimer = window.setTimeout(function () {
                        if (currentToken !== requestToken) {
                            return;
                        }

                        applyContent(button, "");
                    }, delay);
                });
        }

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                activate(button, false);
            });

            button.addEventListener("focus", function () {
                activate(button, false);
            });

            button.addEventListener("keydown", function (event) {
                handleTabKeyboard(event, buttons, button);
            });
        });

        const initialButton =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            }) || buttons[0];

        if (initialButton) {
            activate(initialButton, true);
        }
    }

    function createParallaxController() {
        const sections = queryAll(
            "[data-home-parallax], [data-home-parallax-block]"
        );

        if (sections.length === 0) {
            return null;
        }

        let frameRequested = false;
        let enabled = false;
        let observedSections = new Set();
        let observer = null;

        function canRun() {
            return window.innerWidth >= 992 && !isReducedMotion();
        }

        function resetSection(section) {
            const media = query("[data-parallax-media]", section);

            if (!media) {
                return;
            }

            media.style.transform = "";
            media.style.willChange = "";
        }

        function updateSection(section) {
            const media = query("[data-parallax-media]", section);

            if (!media) {
                return;
            }

            const rectangle = section.getBoundingClientRect();
            const viewportHeight =
                window.innerHeight || document.documentElement.clientHeight;

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
                section.dataset.parallaxRange
            );
            const movement =
                progress *
                -(Number.isFinite(parallaxRange) ? parallaxRange : 54);

            media.style.willChange = "transform";
            media.style.transform = `translate3d(0, ${movement.toFixed(
                2
            )}px, 0)`;
        }

        function update() {
            frameRequested = false;

            if (!enabled) {
                return;
            }

            observedSections.forEach(function (section) {
                updateSection(section);
            });
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

            if ("IntersectionObserver" in window) {
                observer = new IntersectionObserver(
                    function (entries) {
                        entries.forEach(function (entry) {
                            if (entry.isIntersecting) {
                                observedSections.add(entry.target);
                            } else {
                                observedSections.delete(entry.target);
                            }
                        });

                        requestUpdate();
                    },
                    {
                        rootMargin: "18% 0px 18% 0px",
                        threshold: 0
                    }
                );

                sections.forEach(function (section) {
                    observer.observe(section);
                });
            } else {
                sections.forEach(function (section) {
                    observedSections.add(section);
                });
            }

            window.addEventListener("scroll", requestUpdate, {
                passive: true
            });

            requestUpdate();
        }

        function disable() {
            enabled = false;
            frameRequested = false;
            observedSections.clear();

            window.removeEventListener("scroll", requestUpdate);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            sections.forEach(resetSection);
        }

        function sync() {
            if (canRun()) {
                enable();
            } else {
                disable();
            }
        }

        let resizeTimer = 0;

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
                window.removeEventListener("resize", handleResize);
                window.removeEventListener(
                    "growwise:motion-change",
                    handleMotionChange
                );
            }
        };
    }

    function refreshSwipers() {
        [
            heroSwiper,
            categoryCirclesSwiper,
            systemsSwiper,
            questionsSwiper
        ].forEach(function (instance) {
            if (
                instance &&
                typeof instance.update === "function"
            ) {
                instance.update();
            }
        });
    }

    function initHomePage() {
        if (initialized) {
            return;
        }

        initialized = true;
        body.dataset.homeInitialized = "true";

        initGrowingPathSelector();
        initBalanceSwitcher();

        heroSwiper = initHeroSwiper();
        categoryCirclesSwiper = initCategoryCirclesSwiper();
        systemsSwiper = initSystemsSwiper();
        questionsSwiper = initQuestionsSwiper();
        parallaxController = createParallaxController();

        renderIcons();

        window.requestAnimationFrame(function () {
            refreshSwipers();

            if (parallaxController) {
                parallaxController.refresh();
            }

            refreshAOS();
        });

        window.addEventListener(
            "load",
            function () {
                refreshSwipers();

                if (parallaxController) {
                    parallaxController.refresh();
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
                    initHomePage();
                }
            });

            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initHomePage,
                {
                    once: true
                }
            );
        } else {
            initHomePage();
        }
    }

    start();
})();

(function () {
    "use strict";

    let initialized = false;

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

    function initFieldNotesSwiper() {
        const root = document.querySelector(
            "[data-home-field-notes-swiper]"
        );

        if (!root) {
            return null;
        }

        const previousButton = document.querySelector(
            "[data-home-field-notes-previous]"
        );

        const nextButton = document.querySelector(
            "[data-home-field-notes-next]"
        );

        const pagination = document.querySelector(
            "[data-home-field-notes-pagination]"
        );

        const growwise = getGrowwise();

        if (
            !growwise ||
            typeof growwise.createSwiperOnce !== "function"
        ) {
            return null;
        }

        return growwise.createSwiperOnce(root, {
            speed: prefersReducedMotion() ? 0 : 720,
            slidesPerView: 1,
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
                prevSlideMessage: "Previous practical growing note",
                nextSlideMessage: "Next practical growing note",
                firstSlideMessage: "This is the first growing note",
                lastSlideMessage: "This is the last growing note",
                paginationBulletMessage: "Go to growing note {{index}}"
            },
            breakpoints: {
                640: {
                    slidesPerView: 1,
                    spaceBetween: 18
                },
                768: {
                    slidesPerView: 1,
                    spaceBetween: 22
                },
                1024: {
                    slidesPerView: 2,
                    spaceBetween: 28
                }
            }
        });
    }

    function initFieldNotesTilt() {
        const cards = Array.from(
            document.querySelectorAll(
                "[data-home-field-note]"
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
            let frame = 0;

            function reset() {
                window.cancelAnimationFrame(frame);

                card.style.transform =
                    "rotateX(0deg) rotateY(0deg) translateY(0)";
            }

            card.addEventListener(
                "pointermove",
                function (event) {
                    const rectangle =
                        card.getBoundingClientRect();

                    const x =
                        event.clientX - rectangle.left;

                    const y =
                        event.clientY - rectangle.top;

                    const horizontal =
                        x / rectangle.width - 0.5;

                    const vertical =
                        y / rectangle.height - 0.5;

                    card.style.setProperty(
                        "--note-light-x",
                        `${x}px`
                    );

                    card.style.setProperty(
                        "--note-light-y",
                        `${y}px`
                    );

                    window.cancelAnimationFrame(frame);

                    frame = window.requestAnimationFrame(
                        function () {
                            card.style.transform =
                                `rotateX(${vertical * -4}deg) ` +
                                `rotateY(${horizontal * 5}deg) ` +
                                "translateY(-7px)";
                        }
                    );
                }
            );

            card.addEventListener("pointerleave", reset);
            card.addEventListener("pointercancel", reset);
        });
    }

    function initFieldNotes() {
        if (initialized) {
            return;
        }

        const section = document.querySelector(
            "[data-home-field-notes]"
        );

        if (!section) {
            return;
        }

        initialized = true;

        initFieldNotesSwiper();
        initFieldNotesTilt();
        renderIcons();

        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.refreshAOS === "function"
        ) {
            growwise.refreshAOS();
        }
    }

    function start() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.ready === "function"
        ) {
            growwise.ready(initFieldNotes);
            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initFieldNotes,
                {
                    once: true
                }
            );
        } else {
            initFieldNotes();
        }
    }

    start();
})();
