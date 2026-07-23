(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "guides") {
        return;
    }

    let initialized = false;
    let categoriesSwiper = null;
    let environmentParallax = null;
    let topicNavigatorController = null;

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
            !growwise ||
            typeof growwise.createSwiperOnce !== "function"
        ) {
            return null;
        }

        return growwise.createSwiperOnce(root, options);
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

    function preloadImage(source) {
        return new Promise(function (resolve, reject) {
            if (!source || source === "#") {
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

    function updateIcon(container, iconName, dataAttribute) {
        if (!container) {
            return;
        }

        const safeIconName = sanitizeIconName(iconName);
        const attribute = dataAttribute
            ? ` ${dataAttribute}`
            : "";

        container.innerHTML = `
      <i
        data-lucide="${safeIconName}"
        aria-hidden="true"${attribute}
      ></i>
    `;

        renderIcons();
    }

    function scrollElementIntoView(container, element) {
        if (!container || !element) {
            return;
        }

        const containerRectangle = container.getBoundingClientRect();
        const elementRectangle = element.getBoundingClientRect();
        const outsideLeft =
            elementRectangle.left < containerRectangle.left;
        const outsideRight =
            elementRectangle.right > containerRectangle.right;

        if (!outsideLeft && !outsideRight) {
            return;
        }

        element.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "nearest",
            inline: "center"
        });
    }

    function initTopicNavigator() {
        const root = query("[data-guides-topic-navigator]");

        if (!root || root.dataset.navigatorInitialized === "true") {
            return null;
        }

        const scroller = query(".guides-navigator__scroller", root);
        const links = queryAll("[data-guides-topic-link]", root);
        const entries = links
            .map(function (link) {
                const sectionId = link.dataset.topicSection;
                const section = sectionId
                    ? document.getElementById(sectionId)
                    : null;

                if (!section) {
                    return null;
                }

                return {
                    link: link,
                    section: section,
                    id: sectionId
                };
            })
            .filter(Boolean);

        if (entries.length === 0) {
            return null;
        }

        root.dataset.navigatorInitialized = "true";

        let activeId = "";
        let frameRequested = false;
        let resizeTimer = 0;

        function getOffset() {
            const header = query("[data-site-header]");
            const headerHeight = header
                ? header.getBoundingClientRect().height
                : 0;
            const navigatorHeight = root.getBoundingClientRect().height;

            return headerHeight + Math.min(navigatorHeight, 105) + 24;
        }

        function setActive(id) {
            if (!id || id === activeId) {
                return;
            }

            activeId = id;

            entries.forEach(function (entry) {
                const isActive = entry.id === id;

                entry.link.classList.toggle("is-active", isActive);

                if (isActive) {
                    entry.link.setAttribute("aria-current", "location");
                    scrollElementIntoView(scroller, entry.link);
                } else {
                    entry.link.removeAttribute("aria-current");
                }
            });
        }

        function findActiveSection() {
            const offset = getOffset();
            const scrollPosition = window.scrollY + offset;
            let selected = entries[0];

            entries.forEach(function (entry) {
                if (entry.section.offsetTop <= scrollPosition) {
                    selected = entry;
                }
            });

            const pageBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 4;

            if (pageBottom) {
                selected = entries[entries.length - 1];
            }

            setActive(selected.id);
        }

        function requestUpdate() {
            if (frameRequested) {
                return;
            }

            frameRequested = true;

            window.requestAnimationFrame(function () {
                frameRequested = false;
                findActiveSection();
            });
        }

        entries.forEach(function (entry) {
            entry.link.addEventListener("click", function (event) {
                event.preventDefault();

                const offset = getOffset();
                const destination =
                    entry.section.getBoundingClientRect().top +
                    window.scrollY -
                    offset;

                setActive(entry.id);

                window.scrollTo({
                    top: Math.max(0, destination),
                    behavior: prefersReducedMotion() ? "auto" : "smooth"
                });

                if (window.history && window.history.replaceState) {
                    window.history.replaceState(
                        null,
                        "",
                        `#${entry.id}`
                    );
                }
            });
        });

        function handleResize() {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(function () {
                requestUpdate();
            }, 120);
        }

        window.addEventListener("scroll", requestUpdate, {
            passive: true
        });
        window.addEventListener("resize", handleResize);

        const initialHash = window.location.hash.replace("#", "");
        const initialEntry = entries.find(function (entry) {
            return entry.id === initialHash;
        });

        if (initialEntry) {
            setActive(initialEntry.id);
        } else {
            findActiveSection();
        }

        return {
            refresh: requestUpdate,
            destroy: function () {
                window.clearTimeout(resizeTimer);
                window.removeEventListener("scroll", requestUpdate);
                window.removeEventListener("resize", handleResize);
            }
        };
    }

    function initCropSelector() {
        const root = query("[data-guides-crop-selector]");

        if (!root || root.dataset.cropSelectorInitialized === "true") {
            return;
        }

        const buttons = queryAll("[data-guides-crop-button]", root);
        const panel = query("[data-guides-crop-panel]", root);
        const image = query("[data-guides-crop-image]", root);
        const label = query("[data-guides-crop-label]", root);
        const title = query("[data-guides-crop-title]", root);
        const text = query("[data-guides-crop-text]", root);
        const factOne = query("[data-guides-crop-fact-one]", root);
        const factTwo = query("[data-guides-crop-fact-two]", root);
        const link = query("[data-guides-crop-link]", root);
        const iconContainer = query(".guides-crops__icon", root);

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !label ||
            !title ||
            !text ||
            !factOne ||
            !factTwo ||
            !link ||
            !iconContainer
        ) {
            return;
        }

        root.dataset.cropSelectorInitialized = "true";

        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.cropKey || "";
        let requestToken = 0;
        let changeTimer = 0;

        function applyContent(button, loadedSource) {
            label.textContent =
                button.dataset.cropLabel || button.textContent.trim();
            title.textContent = button.dataset.cropTitle || "";
            text.textContent = button.dataset.cropText || "";
            factOne.textContent = button.dataset.cropFactOne || "";
            factTwo.textContent = button.dataset.cropFactTwo || "";
            link.href = normalizeUrl(button.dataset.cropHref || "#");

            if (loadedSource) {
                image.src = loadedSource;
                image.alt = button.dataset.cropAlt || "";
            }

            updateIcon(
                iconContainer,
                button.dataset.cropIcon || "sprout",
                "data-guides-crop-icon"
            );

            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.cropKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(button.dataset.cropImage || "");
            const delay = prefersReducedMotion() ? 0 : 150;

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

    function initSystemComparison() {
        const root = query("[data-guides-system-comparison]");

        if (!root || root.dataset.systemComparisonInitialized === "true") {
            return;
        }

        const buttons = queryAll("[data-guides-system-button]", root);
        const cards = queryAll("[data-guides-system-card]", root);
        const panel = query("[data-guides-system-panel]", root);
        const image = query("[data-guides-system-image]", root);
        const title = query("[data-guides-system-title]", root);
        const text = query("[data-guides-system-text]", root);
        const link = query("[data-guides-system-link]", root);

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !title ||
            !text ||
            !link
        ) {
            return;
        }

        root.dataset.systemComparisonInitialized = "true";

        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.systemKey || "";
        let requestToken = 0;
        let changeTimer = 0;

        function setCardsState(activeButton) {
            const key = activeButton.dataset.systemKey || "";

            cards.forEach(function (card) {
                card.classList.toggle(
                    "is-active",
                    card.dataset.systemKey === key
                );
            });
        }

        function applyContent(button, loadedSource) {
            title.textContent = button.dataset.systemTitle || "";
            text.textContent = button.dataset.systemText || "";
            link.href = normalizeUrl(button.dataset.systemHref || "#");

            if (loadedSource) {
                image.src = loadedSource;
                image.alt = button.dataset.systemAlt || "";
            }

            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.systemKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(button.dataset.systemImage || "");
            const delay = prefersReducedMotion() ? 0 : 150;

            setTabState(buttons, button);
            setCardsState(button);
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

    function initLightComparison() {
        const root = query("[data-guides-light-comparison]");

        if (!root || root.dataset.lightComparisonInitialized === "true") {
            return;
        }

        const buttons = queryAll("[data-guides-light-button]", root);
        const panel = query("[data-guides-light-panel]", root);
        const image = query("[data-guides-light-image]", root);
        const label = query("[data-guides-light-label]", root);
        const title = query("[data-guides-light-title]", root);
        const text = query("[data-guides-light-text]", root);
        const factOne = query("[data-guides-light-fact-one]", root);
        const factTwo = query("[data-guides-light-fact-two]", root);
        const iconContainer = query(".guides-lights__icon", root);

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !label ||
            !title ||
            !text ||
            !factOne ||
            !factTwo ||
            !iconContainer
        ) {
            return;
        }

        root.dataset.lightComparisonInitialized = "true";

        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.lightKey || "";
        let requestToken = 0;
        let changeTimer = 0;

        function applyContent(button, loadedSource) {
            label.textContent =
                button.dataset.lightLabel || button.textContent.trim();
            title.textContent = button.dataset.lightTitle || "";
            text.textContent = button.dataset.lightText || "";
            factOne.textContent = button.dataset.lightFactOne || "";
            factTwo.textContent = button.dataset.lightFactTwo || "";

            if (loadedSource) {
                image.src = loadedSource;
                image.alt = button.dataset.lightAlt || "";
            }

            updateIcon(
                iconContainer,
                button.dataset.lightIcon || "sun",
                "data-guides-light-icon"
            );

            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.lightKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(button.dataset.lightImage || "");
            const delay = prefersReducedMotion() ? 0 : 150;

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

    function renderPaginationBullet(index, className) {
        return `
      <button
        class="${className}"
        type="button"
        aria-label="Go to growing category slide ${index + 1}"
      ></button>
    `;
    }

    function initCategoriesSwiper() {
        const root = query("[data-guides-categories-swiper]");
        const previousButton = query(
            "[data-guides-categories-previous]"
        );
        const nextButton = query("[data-guides-categories-next]");
        const pagination = query(
            "[data-guides-categories-pagination]"
        );

        if (!root) {
            return null;
        }

        return createSwiper(root, {
            speed: prefersReducedMotion() ? 0 : 650,
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
                prevEl: previousButton,
                nextEl: nextButton
            },
            pagination: {
                el: pagination,
                clickable: true,
                renderBullet: renderPaginationBullet
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous growing category",
                nextSlideMessage: "Next growing category",
                firstSlideMessage: "This is the first growing category",
                lastSlideMessage: "This is the last growing category",
                paginationBulletMessage:
                    "Go to growing category slide {{index}}"
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
                    spaceBetween: 26
                },
                1440: {
                    slidesPerView: 4,
                    spaceBetween: 28
                }
            }
        });
    }

    function createEnvironmentParallax() {
        const section = query("[data-guides-parallax]");
        const media = query(
            "[data-guides-parallax-media]",
            section
        );

        if (!section || !media) {
            return null;
        }

        let enabled = false;
        let visible = true;
        let frameRequested = false;
        let observer = null;
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
            const movement = progress * -48;

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
                observer = new IntersectionObserver(
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

                observer.observe(section);
            }

            requestUpdate();
        }

        function disable() {
            enabled = false;
            visible = true;
            frameRequested = false;

            window.removeEventListener("scroll", requestUpdate);

            if (observer) {
                observer.disconnect();
                observer = null;
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

    function initImageStates() {
        const images = queryAll(
            [
                ".guides-start__step-image img",
                ".guides-crops__visual img",
                ".guides-systems__panel-media img",
                ".guides-environment__media img",
                ".guides-lights__visual img",
                ".guides-watering__head-image img",
                ".guides-media__collage img",
                ".guides-categories__image img"
            ].join(",")
        );

        images.forEach(function (image) {
            if (image.dataset.imageStateInitialized === "true") {
                return;
            }

            image.dataset.imageStateInitialized = "true";

            function markReady() {
                image.dataset.imageState = "ready";

                if (image.parentElement) {
                    image.parentElement.classList.add("is-image-ready");
                }
            }

            function markError() {
                image.dataset.imageState = "error";

                if (image.parentElement) {
                    image.parentElement.classList.add("has-image-error");
                }
            }

            if (image.complete) {
                if (image.naturalWidth > 0) {
                    markReady();
                } else {
                    markError();
                }

                return;
            }

            image.addEventListener("load", markReady, {
                once: true
            });
            image.addEventListener("error", markError, {
                once: true
            });
        });
    }

    function refreshInteractiveElements() {
        if (
            categoriesSwiper &&
            typeof categoriesSwiper.update === "function"
        ) {
            categoriesSwiper.update();
        }

        if (environmentParallax) {
            environmentParallax.refresh();
        }

        if (topicNavigatorController) {
            topicNavigatorController.refresh();
        }

        refreshAOS();
    }

    function initGuidesPage() {
        if (initialized) {
            return;
        }

        initialized = true;
        body.dataset.guidesInitialized = "true";

        topicNavigatorController = initTopicNavigator();
        initCropSelector();
        initSystemComparison();
        initLightComparison();
        initImageStates();

        categoriesSwiper = initCategoriesSwiper();
        environmentParallax = createEnvironmentParallax();

        renderIcons();

        window.requestAnimationFrame(function () {
            refreshInteractiveElements();
        });

        window.addEventListener(
            "load",
            function () {
                initImageStates();
                refreshInteractiveElements();
            },
            {
                once: true
            }
        );

        window.addEventListener(
            "growwise:motion-change",
            function () {
                refreshInteractiveElements();
            }
        );
    }

    function start() {
        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.ready === "function"
        ) {
            growwise.ready(initOvalCategories);
            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initGuidesPage,
                {
                    once: true
                }
            );
        } else {
            initGuidesPage();
        }
    }

    start();
})();

(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "guides") {
        return;
    }

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

    function initOvalCategorySwiper() {
        const root = document.querySelector(
            "[data-guides-oval-swiper]"
        );

        if (!root) {
            return null;
        }

        const previousButton = document.querySelector(
            "[data-guides-oval-prev]"
        );

        const nextButton = document.querySelector(
            "[data-guides-oval-next]"
        );

        const pagination = document.querySelector(
            "[data-guides-oval-pagination]"
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
            slidesPerView: 1.08,
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
                    slidesPerView: 1.35,
                    spaceBetween: 18
                },

                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },

                1100: {
                    slidesPerView: 3,
                    spaceBetween: 24
                }
            }
        });
    }

    function initOvalCategories() {
        if (initialized) {
            return;
        }

        const section = document.querySelector(
            "[data-guides-oval-categories]"
        );

        if (!section) {
            return;
        }

        initialized = true;

        initOvalCategorySwiper();
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
            growwise.ready(initOvalCategories);
            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initOvalCategories,
                {
                    once: true
                }
            );
        } else {
            initOvalCategories();
        }
    }

    start();
})();