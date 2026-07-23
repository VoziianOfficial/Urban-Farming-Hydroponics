(function () {
    "use strict";

    const body = document.body;

    if (
        !body ||
        (!body.classList.contains("page-category") &&
            !body.dataset.category)
    ) {
        return;
    }

    let initialized = false;
    let methodsSwiper = null;
    let nextSwiper = null;
    let topicRailController = null;
    let environmentParallax = null;

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

        if (growwise) {
            if (
                typeof growwise.prefersReducedMotion === "function"
            ) {
                return Boolean(growwise.prefersReducedMotion());
            }

            if (
                typeof growwise.prefersReducedMotion === "boolean"
            ) {
                return growwise.prefersReducedMotion;
            }

            if (
                typeof growwise.reducedMotion === "function"
            ) {
                return Boolean(growwise.reducedMotion());
            }

            if (
                typeof growwise.reducedMotion === "boolean"
            ) {
                return growwise.reducedMotion;
            }
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
            return;
        }

        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    function createSwiper(root, options) {
        if (!root) {
            return null;
        }

        const growwise = getGrowwise();

        if (
            growwise &&
            typeof growwise.createSwiperOnce === "function"
        ) {
            return growwise.createSwiperOnce(root, options);
        }

        if (root.swiper) {
            return root.swiper;
        }

        if (typeof window.Swiper !== "function") {
            return null;
        }

        return new window.Swiper(root, options);
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
            const active = button === activeButton;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-selected", String(active));
            button.tabIndex = active ? 0 : -1;
        });
    }

    function focusTabByOffset(buttons, currentButton, offset) {
        const currentIndex = buttons.indexOf(currentButton);

        if (currentIndex < 0 || buttons.length === 0) {
            return;
        }

        const nextIndex =
            (currentIndex + offset + buttons.length) %
            buttons.length;

        buttons[nextIndex].focus();
    }

    function handleTabKeyboard(event, buttons, currentButton) {
        if (
            event.key === "ArrowRight" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            focusTabByOffset(buttons, currentButton, 1);
            return;
        }

        if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowUp"
        ) {
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

            const finalButton = buttons[buttons.length - 1];

            if (finalButton) {
                finalButton.focus();
            }
        }
    }

    function updateIcon(container, iconName, dataAttribute) {
        if (!container) {
            return;
        }

        const safeIconName = sanitizeIconName(iconName);
        const extraAttribute = dataAttribute
            ? ` ${dataAttribute}`
            : "";

        container.innerHTML = `
      <i
        data-lucide="${safeIconName}"
        aria-hidden="true"${extraAttribute}
      ></i>
    `;

        renderIcons();
    }

    function scrollElementIntoView(container, element) {
        if (!container || !element) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        const outsideLeft =
            elementRect.left < containerRect.left;

        const outsideRight =
            elementRect.right > containerRect.right;

        if (!outsideLeft && !outsideRight) {
            return;
        }

        const elementCenter =
            elementRect.left -
            containerRect.left +
            container.scrollLeft +
            elementRect.width / 2;

        const targetLeft =
            elementCenter -
            container.clientWidth / 2;

        container.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: prefersReducedMotion()
                ? "auto"
                : "smooth"
        });
    }

    function getHeaderOffset() {
        const header =
            query(".site-header", query("[data-site-header]")) ||
            query(".site-header");

        return header
            ? header.getBoundingClientRect().height
            : 0;
    }

    function initTopicRail() {
        const root = query("[data-category-topic-rail]");

        if (!root || root.dataset.topicRailInitialized === "true") {
            return null;
        }

        const scroller =
            query(".category-topic-rail__scroller", root) || root;
        const links = queryAll("[data-category-topic-link]", root);
        const entries = links
            .map(function (link) {
                const sectionId =
                    link.dataset.topicSection ||
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
            return null;
        }

        root.dataset.topicRailInitialized = "true";

        let activeId = "";
        let frameRequested = false;
        let resizeTimer = 0;

        function getScrollOffset() {
            return (
                getHeaderOffset() +
                Math.min(root.getBoundingClientRect().height, 96) +
                24
            );
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
                    entry.link.setAttribute("aria-current", "location");
                    scrollElementIntoView(scroller, entry.link);
                } else {
                    entry.link.removeAttribute("aria-current");
                }
            });
        }

        function detectActiveSection() {
            const position = window.scrollY + getScrollOffset();
            let selected = entries[0];

            entries.forEach(function (entry) {
                if (entry.section.offsetTop <= position) {
                    selected = entry;
                }
            });

            const atPageBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 5;

            if (atPageBottom) {
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
                detectActiveSection();
            });
        }

        entries.forEach(function (entry) {
            entry.link.addEventListener("click", function (event) {
                event.preventDefault();

                const destination =
                    entry.section.getBoundingClientRect().top +
                    window.scrollY -
                    getScrollOffset();

                setActive(entry.id);

                window.scrollTo({
                    top: Math.max(0, destination),
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
            detectActiveSection();
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

    function initDetailSelector() {
        const root = query("[data-category-detail]");

        if (
            !root ||
            root.dataset.categoryDetailInitialized === "true"
        ) {
            return;
        }

        const buttons = queryAll(
            "[data-category-detail-button]",
            root
        );
        const panel = query("[data-category-detail-panel]", root);
        const image = query("[data-category-detail-image]", root);
        const label = query("[data-category-detail-label]", root);
        const title = query("[data-category-detail-title]", root);
        const text = query("[data-category-detail-text]", root);
        const factOne = query(
            "[data-category-detail-fact-one]",
            root
        );
        const factTwo = query(
            "[data-category-detail-fact-two]",
            root
        );
        const link = query("[data-category-detail-link]", root);
        const linkLabel = query(
            "[data-category-detail-link-label]",
            root
        );
        const iconContainer = query(
            ".category-detail__icon",
            root
        );

        if (
            buttons.length === 0 ||
            !panel ||
            !image ||
            !title ||
            !text ||
            !factOne ||
            !factTwo ||
            !iconContainer
        ) {
            return;
        }

        root.dataset.categoryDetailInitialized = "true";
        panel.setAttribute("aria-live", "polite");

        let activeKey =
            buttons.find(function (button) {
                return button.getAttribute("aria-selected") === "true";
            })?.dataset.detailKey || "";
        let requestToken = 0;
        let changeTimer = 0;

        function applyContent(button, loadedSource) {
            if (label) {
                label.textContent =
                    button.dataset.detailLabel ||
                    button.textContent.trim();
            }

            title.textContent = button.dataset.detailTitle || "";
            text.textContent = button.dataset.detailText || "";
            factOne.textContent =
                button.dataset.detailFactOne || "";
            factTwo.textContent =
                button.dataset.detailFactTwo || "";

            if (link) {
                link.href = normalizeUrl(
                    button.dataset.detailHref || "#"
                );
            }

            if (linkLabel) {
                linkLabel.textContent =
                    button.dataset.detailLink ||
                    "Explore This Topic";
            }

            if (loadedSource) {
                image.src = loadedSource;
                image.alt = button.dataset.detailAlt || "";
            }

            updateIcon(
                iconContainer,
                button.dataset.detailIcon || "circle",
                "data-category-detail-icon"
            );

            panel.setAttribute("aria-labelledby", button.id);
            panel.classList.remove("is-changing");
        }

        function activate(button, force) {
            const key = button.dataset.detailKey || "";

            if (!force && key && key === activeKey) {
                return;
            }

            activeKey = key;
            requestToken += 1;

            const currentToken = requestToken;
            const source = normalizeUrl(
                button.dataset.detailImage || ""
            );
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

    function renderPaginationBullet(label, index, className) {
        return `
      <button
        class="${className}"
        type="button"
        aria-label="${label} ${index + 1}"
      ></button>
    `;
    }

    function initMethodsSwiper() {
        const root = query("[data-category-methods-swiper]");
        const previousButton = query(
            "[data-category-methods-previous]"
        );
        const nextButton = query(
            "[data-category-methods-next]"
        );
        const pagination = query(
            "[data-category-methods-pagination]"
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
                renderBullet: function (index, className) {
                    return renderPaginationBullet(
                        "Go to method slide",
                        index,
                        className
                    );
                }
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous method",
                nextSlideMessage: "Next method",
                firstSlideMessage: "This is the first method",
                lastSlideMessage: "This is the last method",
                paginationBulletMessage:
                    "Go to method slide {{index}}"
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
                }
            }
        });
    }

    function initNextSwiper() {
        const root = query("[data-category-next-swiper]");
        const previousButton = query(
            "[data-category-next-previous]"
        );
        const nextButton = query("[data-category-next-next]");
        const pagination = query(
            "[data-category-next-pagination]"
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
                renderBullet: function (index, className) {
                    return renderPaginationBullet(
                        "Go to related guide slide",
                        index,
                        className
                    );
                }
            },
            a11y: {
                enabled: true,
                prevSlideMessage: "Previous related guide",
                nextSlideMessage: "Next related guide",
                firstSlideMessage:
                    "This is the first related guide",
                lastSlideMessage:
                    "This is the last related guide",
                paginationBulletMessage:
                    "Go to related guide slide {{index}}"
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
        const sections = queryAll("[data-category-parallax]").map(
            function (section) {
                return {
                    section: section,
                    media: query("[data-category-parallax-media]", section),
                    visible: true
                };
            }
        ).filter(function (item) {
            return Boolean(item.media);
        });

        if (sections.length === 0) {
            return null;
        }

        let enabled = false;
        let frameRequested = false;
        let observer = null;
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
                item.section.dataset.categoryParallaxRange
            );
            const movement =
                progress *
                -(Number.isFinite(parallaxRange) ? parallaxRange : 48);

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

            sections.forEach(updateItem);
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
                            const item = sections.find(function (
                                sectionItem
                            ) {
                                return sectionItem.section === entry.target;
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

                sections.forEach(function (item) {
                    observer.observe(item.section);
                });
            }

            requestUpdate();
        }

        function disable() {
            enabled = false;
            frameRequested = false;

            window.removeEventListener("scroll", requestUpdate);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            sections.forEach(function (item) {
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

    function initImageStates() {
        const images = queryAll(
            [
                ".category-hero__media img",
                ".category-overview__visual img",
                ".category-method-card__media img",
                ".category-detail__visual img",
                ".category-process__step-image img",
                ".category-environment__media img",
                ".category-considerations__visual img",
                ".category-next-card__media img",
                ".category-final-cta__media img"
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
                    image.parentElement.classList.add(
                        "is-image-ready"
                    );
                }
            }

            function markError() {
                image.dataset.imageState = "error";

                if (image.parentElement) {
                    image.parentElement.classList.add(
                        "has-image-error"
                    );
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

    function initHashNavigation() {
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
                const destination =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    getHeaderOffset() -
                    24;

                window.scrollTo({
                    top: Math.max(0, destination),
                    behavior: prefersReducedMotion()
                        ? "auto"
                        : "smooth"
                });
            }, 100);
        });
    }

    function refreshInteractiveElements() {
        [methodsSwiper, nextSwiper].forEach(function (instance) {
            if (
                instance &&
                typeof instance.update === "function"
            ) {
                instance.update();
            }
        });

        if (topicRailController) {
            topicRailController.refresh();
        }

        if (environmentParallax) {
            environmentParallax.refresh();
        }

    }

    function initCategoryPage() {
        if (initialized) {
            return;
        }

        initialized = true;
        body.dataset.categoryInitialized = "true";

        topicRailController = initTopicRail();
        initDetailSelector();
        initImageStates();

        methodsSwiper = initMethodsSwiper();
        nextSwiper = initNextSwiper();
        environmentParallax = createEnvironmentParallax();

        renderIcons();
        initHashNavigation();

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

        if (growwise && typeof growwise.ready === "function") {
            const result = growwise.ready(initCategoryPage);

            if (
                result &&
                typeof result.then === "function"
            ) {
                result.then(function (readyState) {
                    if (readyState !== false) {
                        initCategoryPage();
                    }
                });
            }

            return;
        }

        if (
            growwise &&
            growwise.ready &&
            typeof growwise.ready.then === "function"
        ) {
            growwise.ready.then(function (readyState) {
                if (readyState !== false) {
                    initCategoryPage();
                }
            });

            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initCategoryPage,
                {
                    once: true
                }
            );
        } else {
            initCategoryPage();
        }
    }

    start();
})();
