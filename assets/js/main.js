(function () {
    "use strict";

    document.documentElement.classList.remove("no-js");
    document.documentElement.classList.add("js");

    const config = window.GROWWISE_CONFIG;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let readyResolver;

    const ready = new Promise(function (resolve) {
        readyResolver = resolve;
    });

    const state = {
        page: "",
        category: "",
        mobileMenuOpen: false,
        mobileMenuTrigger: null,
        scrollPosition: 0,
        bodyStyles: null
    };

    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
    }

    function isValidEmail(value) {
        if (!isNonEmptyString(value)) {
            return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    }

    function validateConfig(value) {
        if (!isObject(value)) {
            return false;
        }

        if (!isObject(value.brand) || !isObject(value.company)) {
            return false;
        }

        if (!isNonEmptyString(value.brand.name)) {
            return false;
        }

        if (!isNonEmptyString(value.brand.logoImage)) {
            return false;
        }

        if (!isNonEmptyString(value.brand.logoAlt)) {
            return false;
        }

        if (!isNonEmptyString(value.brand.favicon)) {
            return false;
        }

        if (!isNonEmptyString(value.company.legalName)) {
            return false;
        }

        if (!isValidEmail(value.company.email)) {
            return false;
        }

        if (!isNonEmptyString(value.company.address)) {
            return false;
        }

        if (!isObject(value.navigation) || !isObject(value.navigation.items)) {
            return false;
        }

        if (!Array.isArray(value.navigation.primaryOrder)) {
            return false;
        }

        if (!isObject(value.categories) || !isObject(value.categories.items)) {
            return false;
        }

        if (!Array.isArray(value.categories.order)) {
            return false;
        }

        if (!isObject(value.footer) || !Array.isArray(value.footer.columns)) {
            return false;
        }

        if (!isObject(value.contactForm) || !isObject(value.contactForm.fields)) {
            return false;
        }

        if (!isObject(value.seo) || !isObject(value.seo.pages)) {
            return false;
        }

        return true;
    }

    function getConfigValue(path, fallback) {
        if (!isNonEmptyString(path)) {
            return fallback;
        }

        const segments = path.split(".");
        let value = config;

        for (const segment of segments) {
            if (
                value === null ||
                value === undefined ||
                !Object.prototype.hasOwnProperty.call(value, segment)
            ) {
                return fallback;
            }

            value = value[segment];
        }

        return value;
    }

    function getTemplateTokens() {
        return {
            brandName: getConfigValue("brand.name", ""),
            legalCompany: getConfigValue("company.legalName", ""),
            email: getConfigValue("company.email", ""),
            address: getConfigValue("company.address", ""),
            country: getConfigValue("company.country", ""),
            year: String(new Date().getFullYear())
        };
    }

    function resolveTemplate(value) {
        if (typeof value !== "string") {
            return value;
        }

        const tokens = getTemplateTokens();

        return value.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, function (
            match,
            token
        ) {
            return Object.prototype.hasOwnProperty.call(tokens, token)
                ? tokens[token]
                : match;
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, "&#096;");
    }

    function normalizeUrl(value) {
        if (!isNonEmptyString(value)) {
            return "#";
        }

        const trimmed = value.trim();

        if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
            return "#";
        }

        return trimmed;
    }

    function absoluteUrl(value) {
        const base = getConfigValue("seo.canonicalBase", window.location.href);

        try {
            return new URL(normalizeUrl(value), base).href;
        } catch (error) {
            return normalizeUrl(value);
        }
    }

    function externalLinkAttributes(url) {
        return /^https?:\/\//i.test(url)
            ? ' target="_blank" rel="noopener noreferrer"'
            : "";
    }

    function setInert(element, shouldBeInert) {
        if (!element) {
            return;
        }

        if ("inert" in element) {
            element.inert = shouldBeInert;
            return;
        }

        if (shouldBeInert) {
            element.setAttribute("inert", "");
        } else {
            element.removeAttribute("inert");
        }
    }

    function getCurrentPageState() {
        const body = document.body;

        state.page = body && body.dataset.page ? body.dataset.page : "home";
        state.category =
            body && body.dataset.category ? body.dataset.category : "";

        return {
            page: state.page,
            category: state.category
        };
    }

    function isNavigationItemCurrent(item) {
        if (!item || !isNonEmptyString(item.page)) {
            return false;
        }

        return item.page === state.page;
    }

    function isCategoryCurrent(key) {
        return state.page === "category" && state.category === key;
    }

    function currentAttribute(isCurrent) {
        return isCurrent ? ' aria-current="page"' : "";
    }

    function iconMarkup(iconName, className) {
        const safeName = escapeAttribute(iconName || "arrow-up-right");
        const safeClass = isNonEmptyString(className)
            ? ` class="${escapeAttribute(className)}"`
            : "";

        return `<i data-lucide="${safeName}"${safeClass} aria-hidden="true"></i>`;
    }

    function brandMarkup(classPrefix) {
        const name = resolveTemplate(getConfigValue("brand.name", ""));
        const logoImage = normalizeUrl(
            resolveTemplate(getConfigValue("brand.logoImage", ""))
        );
        const logoAlt = resolveTemplate(
            getConfigValue("brand.logoAlt", name)
        );

        return `
      <img
        class="${escapeAttribute(classPrefix)}__logo"
        src="${escapeAttribute(logoImage)}"
        alt="${escapeAttribute(logoAlt)}"
        width="80"
        height="80"
        decoding="async"
      >
      <span class="${escapeAttribute(classPrefix)}__brand-name">${escapeHtml(
            name
        )}</span>
    `;
    }

    function renderDesktopNavigationLinks() {
        const order = getConfigValue("navigation.primaryOrder", []);
        const items = getConfigValue("navigation.items", {});

        if (!Array.isArray(order) || !isObject(items)) {
            return "";
        }

        const output = [];

        order.forEach(function (key) {
            if (key === "contact") {
                return;
            }

            const item = items[key];

            if (!item) {
                return;
            }

            output.push(`
        <li class="site-nav__item">
          <a
            class="site-nav__link"
            href="${escapeAttribute(normalizeUrl(item.href))}"
            ${currentAttribute(isNavigationItemCurrent(item))}
          >${escapeHtml(resolveTemplate(item.label))}</a>
        </li>
      `);
        });

        output.push(renderDesktopCategoryDropdown());

        const contactItem = items.contact;

        if (contactItem) {
            output.push(`
        <li class="site-nav__item">
          <a
            class="site-nav__link"
            href="${escapeAttribute(normalizeUrl(contactItem.href))}"
            ${currentAttribute(isNavigationItemCurrent(contactItem))}
          >${escapeHtml(resolveTemplate(contactItem.label))}</a>
        </li>
      `);
        }

        return output.join("");
    }

    function renderDesktopCategoryDropdown() {
        const categoryLabel = resolveTemplate(
            getConfigValue("navigation.categoriesLabel", "Categories")
        );
        const categoryOrder = getConfigValue("categories.order", []);
        const categoryItems = getConfigValue("categories.items", {});

        if (!Array.isArray(categoryOrder) || !isObject(categoryItems)) {
            return "";
        }

        const links = categoryOrder
            .map(function (key) {
                const item = categoryItems[key];

                if (!item) {
                    return "";
                }

                return `
          <li>
            <a
              class="site-nav__dropdown-link"
              href="${escapeAttribute(normalizeUrl(item.href))}"
              ${currentAttribute(isCategoryCurrent(key))}
            >
              ${iconMarkup(item.icon)}
              <span>${escapeHtml(resolveTemplate(item.label))}</span>
            </a>
          </li>
        `;
            })
            .join("");

        return `
      <li class="site-nav__item" data-site-dropdown data-dropdown-open="false">
        <button
          class="site-nav__dropdown-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="site-desktop-categories-menu"
          data-site-dropdown-toggle
        >
          <span>${escapeHtml(categoryLabel)}</span>
          ${iconMarkup("chevron-down")}
        </button>
        <div
          class="site-nav__dropdown"
          id="site-desktop-categories-menu"
          data-site-dropdown-menu
        >
          <ul class="site-nav__dropdown-list" role="list">
            ${links}
          </ul>
        </div>
      </li>
    `;
    }

    function renderMobileNavigationLinks() {
        const order = getConfigValue("navigation.primaryOrder", []);
        const items = getConfigValue("navigation.items", {});

        if (!Array.isArray(order) || !isObject(items)) {
            return "";
        }

        const output = [];

        order.forEach(function (key) {
            if (key === "contact") {
                return;
            }

            const item = items[key];

            if (!item) {
                return;
            }

            output.push(`
        <li>
          <a
            class="site-mobile-nav__link"
            href="${escapeAttribute(normalizeUrl(item.href))}"
            ${currentAttribute(isNavigationItemCurrent(item))}
          >
            <span>${escapeHtml(resolveTemplate(item.label))}</span>
            ${iconMarkup("arrow-up-right")}
          </a>
        </li>
      `);
        });

        output.push(renderMobileCategoryAccordion());

        const contactItem = items.contact;

        if (contactItem) {
            output.push(`
        <li>
          <a
            class="site-mobile-nav__link"
            href="${escapeAttribute(normalizeUrl(contactItem.href))}"
            ${currentAttribute(isNavigationItemCurrent(contactItem))}
          >
            <span>${escapeHtml(resolveTemplate(contactItem.label))}</span>
            ${iconMarkup("arrow-up-right")}
          </a>
        </li>
      `);
        }

        return output.join("");
    }

    function renderMobileCategoryAccordion() {
        const categoryLabel = resolveTemplate(
            getConfigValue("navigation.categoriesLabel", "Categories")
        );
        const categoryOrder = getConfigValue("categories.order", []);
        const categoryItems = getConfigValue("categories.items", {});

        if (!Array.isArray(categoryOrder) || !isObject(categoryItems)) {
            return "";
        }

        const links = categoryOrder
            .map(function (key) {
                const item = categoryItems[key];

                if (!item) {
                    return "";
                }

                return `
          <li>
            <a
              class="site-mobile-nav__category-link"
              href="${escapeAttribute(normalizeUrl(item.href))}"
              ${currentAttribute(isCategoryCurrent(key))}
            >
              ${iconMarkup(item.icon)}
              <span>${escapeHtml(resolveTemplate(item.label))}</span>
            </a>
          </li>
        `;
            })
            .join("");

        return `
      <li>
        <button
          class="site-mobile-nav__categories-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="site-mobile-categories-panel"
          data-mobile-categories-toggle
        >
          <span>${escapeHtml(categoryLabel)}</span>
          ${iconMarkup("chevron-down")}
        </button>
        <div
          class="site-mobile-nav__categories-panel"
          id="site-mobile-categories-panel"
          data-mobile-categories-panel
          data-open="false"
          aria-hidden="true"
        >
          <div class="site-mobile-nav__categories-inner">
            <ul class="site-mobile-nav__categories-list" role="list">
              ${links}
            </ul>
          </div>
        </div>
      </li>
    `;
    }

    function renderHeader() {
        const mount = document.querySelector("[data-site-header]");

        if (!mount) {
            return;
        }

        const brandName = resolveTemplate(getConfigValue("brand.name", ""));
        const logoImage = normalizeUrl(
            resolveTemplate(getConfigValue("brand.logoImage", ""))
        );
        const logoAlt = resolveTemplate(
            getConfigValue("brand.logoAlt", brandName)
        );
        const menuLabel = resolveTemplate(
            getConfigValue("ui.openMenu", "Open menu")
        );
        const closeLabel = resolveTemplate(
            getConfigValue("ui.closeMenu", "Close menu")
        );
        const headerCta = getConfigValue("navigation.headerCta", {});
        const companyEmail = resolveTemplate(
            getConfigValue("company.email", "")
        );

        mount.innerHTML = `
      <header class="site-header" data-site-header-element>
        <div class="site-header__inner">
          <div class="site-header__brand-panel">
            <a class="site-header__brand" href="index.html" aria-label="${escapeAttribute(
            `${brandName} home`
        )}">
              ${brandMarkup("site-header")}
            </a>
          </div>
          <div class="site-header__navigation-panel">
            <nav class="site-header__desktop-nav" aria-label="Primary navigation">
              <ul class="site-nav__list" role="list">
                ${renderDesktopNavigationLinks()}
              </ul>
              <a
                class="site-button site-button--primary site-header__cta"
                href="${escapeAttribute(normalizeUrl(headerCta.href || "growing-guides.html"))}"
              >
                <span>${escapeHtml(
            resolveTemplate(headerCta.label || "Explore Guides")
        )}</span>
                ${iconMarkup("arrow-up-right")}
              </a>
            </nav>
          </div>
        </div>
        <div class="site-header__mobile-bar">
          <a
            class="site-header__mobile-brand"
            href="index.html"
            aria-label="${escapeAttribute(`${brandName} home`)}"
          >
            <img
              src="${escapeAttribute(logoImage)}"
              alt="${escapeAttribute(logoAlt)}"
              width="72"
              height="72"
              decoding="async"
            >
            <span class="site-header__mobile-brand-name">${escapeHtml(
            brandName
        )}</span>
          </a>
          <button
            class="site-header__menu-button"
            type="button"
            aria-label="${escapeAttribute(menuLabel)}"
            aria-expanded="false"
            aria-controls="site-mobile-menu"
            data-mobile-menu-open
          >
            ${iconMarkup("menu")}
          </button>
        </div>
      </header>
      <div
        class="site-mobile-menu"
        id="site-mobile-menu"
        data-mobile-menu
        aria-hidden="true"
        tabindex="-1"
      >
        <div class="site-mobile-menu__inner">
          <div class="site-mobile-menu__head">
            <a
              class="site-mobile-menu__brand"
              href="index.html"
              aria-label="${escapeAttribute(`${brandName} home`)}"
            >
              <img
                src="${escapeAttribute(logoImage)}"
                alt="${escapeAttribute(logoAlt)}"
                width="72"
                height="72"
                decoding="async"
              >
              <span>${escapeHtml(brandName)}</span>
            </a>
            <button
              class="site-mobile-menu__close"
              type="button"
              aria-label="${escapeAttribute(closeLabel)}"
              data-mobile-menu-close
            >
              ${iconMarkup("x")}
            </button>
          </div>
          <div class="site-mobile-menu__body">
            <nav aria-label="Mobile navigation">
              <ul class="site-mobile-nav__list" role="list">
                ${renderMobileNavigationLinks()}
              </ul>
            </nav>
          </div>
          <div class="site-mobile-menu__footer">
            <a
              class="site-mobile-menu__email"
              href="mailto:${escapeAttribute(companyEmail)}"
            >${escapeHtml(companyEmail)}</a>
            <a
              class="site-button site-button--primary"
              href="${escapeAttribute(normalizeUrl(headerCta.href || "growing-guides.html"))}"
            >
              <span>${escapeHtml(
            resolveTemplate(headerCta.label || "Explore Guides")
        )}</span>
              ${iconMarkup("arrow-up-right")}
            </a>
          </div>
        </div>
      </div>
    `;

        const mobileMenu = mount.querySelector("[data-mobile-menu]");
        setInert(mobileMenu, true);
    }

    function getFooterItems(column) {
        if (!column || !Array.isArray(column.items)) {
            return [];
        }

        if (column.type === "navigation") {
            const items = getConfigValue("navigation.items", {});

            return column.items
                .map(function (key) {
                    const item = items[key];

                    if (!item) {
                        return null;
                    }

                    return {
                        key: key,
                        label: item.label,
                        href: item.href,
                        current: isNavigationItemCurrent(item)
                    };
                })
                .filter(Boolean);
        }

        if (column.type === "categories") {
            const items = getConfigValue("categories.items", {});

            return column.items
                .map(function (key) {
                    const item = items[key];

                    if (!item) {
                        return null;
                    }

                    return {
                        key: key,
                        label: item.label,
                        href: item.href,
                        current: isCategoryCurrent(key)
                    };
                })
                .filter(Boolean);
        }

        if (column.type === "legal") {
            const items = getConfigValue("legal.links", {});

            return column.items
                .map(function (key) {
                    const item = items[key];

                    if (!item) {
                        return null;
                    }

                    return {
                        key: key,
                        label: item.label,
                        href: item.href,
                        current: item.page === state.page
                    };
                })
                .filter(Boolean);
        }

        return [];
    }

    function renderFooterColumns() {
        const columns = getConfigValue("footer.columns", []);

        if (!Array.isArray(columns)) {
            return "";
        }

        return columns
            .map(function (column) {
                const items = getFooterItems(column);

                return `
          <div class="site-footer__column">
            <h2 class="site-footer__column-title">${escapeHtml(
                    resolveTemplate(column.title || "")
                )}</h2>
            <ul class="site-footer__links" role="list">
              ${items
                        .map(function (item) {
                            return `
                    <li>
                      <a
                        class="site-footer__link"
                        href="${escapeAttribute(normalizeUrl(item.href))}"
                        ${currentAttribute(item.current)}
                      >${escapeHtml(resolveTemplate(item.label))}</a>
                    </li>
                  `;
                        })
                        .join("")}
            </ul>
          </div>
        `;
            })
            .join("");
    }

    function renderSocialLinks() {
        const social = getConfigValue("social", {});

        if (!isObject(social)) {
            return "";
        }

        return Object.keys(social)
            .map(function (key) {
                const item = social[key];

                if (!item || !isNonEmptyString(item.url)) {
                    return "";
                }

                const url = normalizeUrl(item.url);
                const label = resolveTemplate(item.label || key);

                return `
          <li>
            <a
              class="site-footer__social-link"
              href="${escapeAttribute(url)}"
              aria-label="${escapeAttribute(label)}"
              ${externalLinkAttributes(url)}
            >
              ${iconMarkup(item.icon || "external-link")}
            </a>
          </li>
        `;
            })
            .join("");
    }

    function renderFooter() {
        const mount = document.querySelector("[data-site-footer]");

        if (!mount) {
            return;
        }

        const brandName = resolveTemplate(getConfigValue("brand.name", ""));
        const logoImage = normalizeUrl(
            resolveTemplate(getConfigValue("brand.logoImage", ""))
        );
        const logoAlt = resolveTemplate(
            getConfigValue("brand.logoAlt", brandName)
        );
        const footerIntro = resolveTemplate(
            getConfigValue("footer.intro", "")
        );
        const email = resolveTemplate(getConfigValue("company.email", ""));
        const address = resolveTemplate(getConfigValue("company.address", ""));
        const contactTitle = resolveTemplate(
            getConfigValue("footer.contactTitle", "Contact")
        );
        const emailLabel = resolveTemplate(
            getConfigValue("footer.emailLabel", "Corporate email")
        );
        const addressLabel = resolveTemplate(
            getConfigValue("footer.addressLabel", "Business address")
        );
        const socialTitle = resolveTemplate(
            getConfigValue("footer.socialTitle", "Follow us")
        );
        const cta = getConfigValue("footer.cta", {});
        const disclaimer = resolveTemplate(
            getConfigValue("footer.disclaimer", "")
        );
        const copyright = resolveTemplate(
            getConfigValue("footer.copyright", "")
        );
        const backToTopLabel = resolveTemplate(
            getConfigValue("ui.backToTop", "Back to top")
        );

        mount.innerHTML = `
      <footer class="site-footer">
        <div class="site-container-wide site-footer__cta-wrap">
          <div class="site-footer__cta">
            <div class="site-footer__cta-content">
              <h2 class="site-footer__cta-title">${escapeHtml(
            resolveTemplate(cta.title || "")
        )}</h2>
              <p class="site-footer__cta-text">${escapeHtml(
            resolveTemplate(cta.text || "")
        )}</p>
            </div>
            <a
              class="site-button site-button--primary"
              href="${escapeAttribute(normalizeUrl(cta.href || "contact.html"))}"
            >
              <span>${escapeHtml(
            resolveTemplate(cta.label || "Contact Us")
        )}</span>
              ${iconMarkup("arrow-up-right")}
            </a>
          </div>
        </div>
        <div class="site-container-wide">
          <div class="site-footer__main">
            <div class="site-footer__brand-column">
              <a
                class="site-footer__brand"
                href="index.html"
                aria-label="${escapeAttribute(`${brandName} home`)}"
              >
                <img
                  src="${escapeAttribute(logoImage)}"
                  alt="${escapeAttribute(logoAlt)}"
                  width="80"
                  height="80"
                  loading="lazy"
                  decoding="async"
                >
                <span>${escapeHtml(brandName)}</span>
              </a>
              <p class="site-footer__description">${escapeHtml(
            footerIntro
        )}</p>
              <div class="site-footer__contact" aria-labelledby="site-footer-contact-title">
                <h2 class="site-footer__column-title" id="site-footer-contact-title">${escapeHtml(
            contactTitle
        )}</h2>
                <div class="site-footer__contact-item">
                  <span class="site-footer__contact-label">${escapeHtml(
            emailLabel
        )}</span>
                  <a
                    class="site-footer__contact-value"
                    href="mailto:${escapeAttribute(email)}"
                  >${escapeHtml(email)}</a>
                </div>
                <div class="site-footer__contact-item">
                  <span class="site-footer__contact-label">${escapeHtml(
            addressLabel
        )}</span>
                  <span class="site-footer__contact-value">${escapeHtml(
            address
        )}</span>
                </div>
              </div>
            
            </div>
            <div class="site-footer__columns">
              ${renderFooterColumns()}
            </div>
          </div>
          <p class="site-footer__disclaimer">${escapeHtml(disclaimer)}</p>
          <div class="site-footer__bottom">
            <p>${escapeHtml(copyright)}</p>
            <a class="site-footer__back-to-top" href="#top">
              ${iconMarkup("arrow-up")}
              <span>${escapeHtml(backToTopLabel)}</span>
            </a>
          </div>
        </div>
      </footer>
    `;
    }

    function ensureSkipLink() {
        if (document.querySelector(".site-skip-link")) {
            return;
        }

        const label = resolveTemplate(
            getConfigValue("ui.skipToContent", "Skip to main content")
        );
        const link = document.createElement("a");

        link.className = "site-skip-link";
        link.href = "#main-content";
        link.textContent = label;

        document.body.insertBefore(link, document.body.firstChild);
    }

    function applyConfigBindings(root) {
        const scope = root || document;

        scope.querySelectorAll("[data-config-text]").forEach(function (element) {
            const path = element.getAttribute("data-config-text");
            const value = getConfigValue(path, "");

            if (typeof value === "string" || typeof value === "number") {
                element.textContent = resolveTemplate(String(value));
            }
        });

        scope
            .querySelectorAll("[data-config-template]")
            .forEach(function (element) {
                const value = element.getAttribute("data-config-template");

                element.textContent = resolveTemplate(value || "");
            });

        scope
            .querySelectorAll("[data-config-placeholder]")
            .forEach(function (element) {
                const path = element.getAttribute("data-config-placeholder");
                const value = getConfigValue(path, "");

                if ("placeholder" in element) {
                    element.placeholder = resolveTemplate(String(value || ""));
                }
            });

        scope.querySelectorAll("[data-config-value]").forEach(function (element) {
            const path = element.getAttribute("data-config-value");
            const value = getConfigValue(path, "");

            if ("value" in element) {
                element.value = resolveTemplate(String(value || ""));
            }
        });

        scope.querySelectorAll("[data-config-href]").forEach(function (element) {
            const path = element.getAttribute("data-config-href");
            const value = getConfigValue(path, "");

            if (element instanceof HTMLAnchorElement) {
                element.href = normalizeUrl(resolveTemplate(String(value || "")));
            }
        });

        scope.querySelectorAll("[data-config-src]").forEach(function (element) {
            const path = element.getAttribute("data-config-src");
            const value = getConfigValue(path, "");

            if (
                element instanceof HTMLImageElement ||
                element instanceof HTMLSourceElement
            ) {
                element.src = normalizeUrl(resolveTemplate(String(value || "")));
            }
        });

        scope.querySelectorAll("[data-config-alt]").forEach(function (element) {
            const path = element.getAttribute("data-config-alt");
            const value = getConfigValue(path, "");

            if (element instanceof HTMLImageElement) {
                element.alt = resolveTemplate(String(value || ""));
            }
        });

        scope.querySelectorAll("[data-config-email]").forEach(function (element) {
            const path =
                element.getAttribute("data-config-email") || "company.email";
            const email = resolveTemplate(
                String(getConfigValue(path, "") || "")
            );

            element.textContent = email;

            if (element instanceof HTMLAnchorElement) {
                element.href = `mailto:${email}`;
            }
        });

        scope.querySelectorAll("[data-config-mailto]").forEach(function (element) {
            const path =
                element.getAttribute("data-config-mailto") || "company.email";
            const email = resolveTemplate(
                String(getConfigValue(path, "") || "")
            );

            if (element instanceof HTMLAnchorElement) {
                element.href = `mailto:${email}`;
            }
        });

        scope
            .querySelectorAll("[data-config-brand-name]")
            .forEach(function (element) {
                element.textContent = resolveTemplate(
                    getConfigValue("brand.name", "")
                );
            });

        scope
            .querySelectorAll("[data-config-address]")
            .forEach(function (element) {
                element.textContent = resolveTemplate(
                    getConfigValue("company.address", "")
                );
            });

        scope
            .querySelectorAll("[data-config-logo]")
            .forEach(function (element) {
                if (!(element instanceof HTMLImageElement)) {
                    return;
                }

                element.src = normalizeUrl(
                    resolveTemplate(getConfigValue("brand.logoImage", ""))
                );
                element.alt = resolveTemplate(
                    getConfigValue("brand.logoAlt", "")
                );
            });

        scope
            .querySelectorAll("[data-config-collaboration-title]")
            .forEach(function (element) {
                element.textContent = resolveTemplate(
                    getConfigValue("collaboration.title", "")
                );
            });

        scope
            .querySelectorAll("[data-config-collaboration-text]")
            .forEach(function (element) {
                element.textContent = resolveTemplate(
                    getConfigValue("collaboration.text", "")
                );
            });

        scope.querySelectorAll("[data-config-year]").forEach(function (element) {
            element.textContent = String(new Date().getFullYear());
        });

        scope.querySelectorAll("[data-config-options]").forEach(function (element) {
            if (!(element instanceof HTMLSelectElement)) {
                return;
            }

            const path = element.getAttribute("data-config-options");
            const options = getConfigValue(path, []);
            const placeholderPath = element.getAttribute(
                "data-config-options-placeholder"
            );
            const placeholder = placeholderPath
                ? resolveTemplate(getConfigValue(placeholderPath, ""))
                : "";
            const previousValue = element.value;

            if (!Array.isArray(options)) {
                return;
            }

            element.replaceChildren();

            if (placeholder) {
                const placeholderOption = document.createElement("option");

                placeholderOption.value = "";
                placeholderOption.textContent = placeholder;
                placeholderOption.disabled = true;
                placeholderOption.selected = !previousValue;
                element.appendChild(placeholderOption);
            }

            options.forEach(function (option) {
                if (!option || !isNonEmptyString(option.value)) {
                    return;
                }

                const optionElement = document.createElement("option");

                optionElement.value = option.value;
                optionElement.textContent = resolveTemplate(option.label || option.value);

                if (option.value === previousValue) {
                    optionElement.selected = true;
                }

                element.appendChild(optionElement);
            });
        });
    }

    function updateFavicon() {
        const faviconPath = normalizeUrl(
            resolveTemplate(getConfigValue("brand.favicon", ""))
        );
        const faviconType = /\.svg(?:$|\?)/i.test(faviconPath)
            ? "image/svg+xml"
            : "image/png";
        let links = Array.from(
            document.querySelectorAll("link[data-config-favicon]")
        );

        if (links.length === 0) {
            const link = document.createElement("link");

            link.rel = "icon";
            link.setAttribute("data-config-favicon", "");
            document.head.appendChild(link);
            links = [link];
        }

        links.forEach(function (link) {
            link.type = faviconType;
            link.href = faviconPath;
        });
    }

    function getSeoKey() {
        if (state.page === "category" && state.category) {
            return state.category;
        }

        return state.page || "home";
    }

    function ensureMetaByName(name) {
        let element = document.querySelector(`meta[name="${name}"]`);

        if (!element) {
            element = document.createElement("meta");
            element.setAttribute("name", name);
            document.head.appendChild(element);
        }

        return element;
    }

    function ensureMetaByProperty(property) {
        let element = document.querySelector(`meta[property="${property}"]`);

        if (!element) {
            element = document.createElement("meta");
            element.setAttribute("property", property);
            document.head.appendChild(element);
        }

        return element;
    }

    function ensureCanonicalLink() {
        let element = document.querySelector('link[rel="canonical"]');

        if (!element) {
            element = document.createElement("link");
            element.rel = "canonical";
            document.head.appendChild(element);
        }

        return element;
    }

    function updateSeo() {
        const key = getSeoKey();
        const pageSeo = getConfigValue(`seo.pages.${key}`, {});
        const brandName = resolveTemplate(
            getConfigValue("seo.siteName", getConfigValue("brand.name", ""))
        );
        const title = resolveTemplate(
            pageSeo.title || getConfigValue("brand.tagline", brandName)
        );
        const description = resolveTemplate(
            pageSeo.description ||
            getConfigValue("seo.defaultMetaDescription", "")
        );
        const path = pageSeo.path || window.location.pathname;
        const canonicalUrl = absoluteUrl(path);
        const image = absoluteUrl(
            pageSeo.ogImage || getConfigValue("seo.defaultOgImage", "")
        );
        const fullTitle =
            title.toLowerCase().includes(brandName.toLowerCase())
                ? title
                : `${title} | ${brandName}`;

        document.title = fullTitle;

        ensureMetaByName("description").content = description;
        ensureMetaByName("twitter:card").content = resolveTemplate(
            getConfigValue("seo.twitterCard", "summary_large_image")
        );
        ensureMetaByName("twitter:title").content = fullTitle;
        ensureMetaByName("twitter:description").content = description;
        ensureMetaByName("twitter:image").content = image;

        ensureMetaByProperty("og:type").content = "website";
        ensureMetaByProperty("og:title").content = fullTitle;
        ensureMetaByProperty("og:description").content = description;
        ensureMetaByProperty("og:image").content = image;
        ensureMetaByProperty("og:url").content = canonicalUrl;
        ensureMetaByProperty("og:site_name").content = brandName;

        ensureCanonicalLink().href = canonicalUrl;
    }

    function getBreadcrumbEntries() {
        const key = getSeoKey();
        const pageSeo = getConfigValue(`seo.pages.${key}`, {});
        const entries = [
            {
                name: "Home",
                item: absoluteUrl("index.html")
            }
        ];

        if (state.page === "home") {
            return [];
        }

        if (state.page === "category") {
            entries.push({
                name: resolveTemplate(
                    getConfigValue("navigation.items.guides.label", "Growing Guides")
                ),
                item: absoluteUrl(
                    getConfigValue(
                        "navigation.items.guides.href",
                        "growing-guides.html"
                    )
                )
            });
        }

        entries.push({
            name: resolveTemplate(pageSeo.title || document.title),
            item: absoluteUrl(pageSeo.path || window.location.pathname)
        });

        return entries;
    }

    function safeJsonStringify(value) {
        return JSON.stringify(value).replace(/</g, "\\u003c");
    }

    function setStructuredDataScript(id, value) {
        let script = document.getElementById(id);

        if (!script) {
            script = document.createElement("script");
            script.id = id;
            script.type = "application/ld+json";
            document.head.appendChild(script);
        }

        script.textContent = safeJsonStringify(value);
    }

    function removeStructuredDataScript(id) {
        const script = document.getElementById(id);

        if (script) {
            script.remove();
        }
    }

    function updateBaseStructuredData() {
        const brandName = resolveTemplate(getConfigValue("brand.name", ""));
        const legalName = resolveTemplate(
            getConfigValue("company.legalName", brandName)
        );
        const email = resolveTemplate(getConfigValue("company.email", ""));
        const siteUrl = absoluteUrl("");
        const logoUrl = absoluteUrl(
            resolveTemplate(getConfigValue("brand.logoImage", ""))
        );
        const description = resolveTemplate(
            getConfigValue("brand.shortDescription", "")
        );
        const social = getConfigValue("social", {});
        const sameAs = isObject(social)
            ? Object.keys(social)
                .map(function (key) {
                    return social[key] && social[key].url
                        ? normalizeUrl(social[key].url)
                        : "";
                })
                .filter(function (url) {
                    return /^https?:\/\//i.test(url);
                })
            : [];

        setStructuredDataScript("growwise-base-structured-data", {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": `${siteUrl}#organization`,
                    "name": legalName,
                    "alternateName": brandName,
                    "url": siteUrl,
                    "logo": {
                        "@type": "ImageObject",
                        "url": logoUrl
                    },
                    "email": email,
                    "sameAs": sameAs
                },
                {
                    "@type": "WebSite",
                    "@id": `${siteUrl}#website`,
                    "url": siteUrl,
                    "name": brandName,
                    "description": description,
                    "publisher": {
                        "@id": `${siteUrl}#organization`
                    },
                    "inLanguage": "en-US"
                }
            ]
        });

        const breadcrumbEntries = getBreadcrumbEntries();

        if (breadcrumbEntries.length > 0) {
            setStructuredDataScript("growwise-breadcrumb-structured-data", {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": breadcrumbEntries.map(function (entry, index) {
                    return {
                        "@type": "ListItem",
                        "position": index + 1,
                        "name": entry.name,
                        "item": entry.item
                    };
                })
            });
        } else {
            removeStructuredDataScript("growwise-breadcrumb-structured-data");
        }
    }

    function updateFaqStructuredData() {
        const container = document.querySelector("[data-faq-schema]");

        if (!container) {
            removeStructuredDataScript("growwise-faq-structured-data");
            return;
        }

        const items = [];

        container
            .querySelectorAll(".site-accordion__item")
            .forEach(function (item) {
                const trigger = item.querySelector("[data-accordion-trigger]");
                const panel = item.querySelector("[data-accordion-panel]");

                if (!trigger || !panel) {
                    return;
                }

                const question = trigger.textContent.trim();
                const answer = panel.textContent.trim();

                if (!question || !answer) {
                    return;
                }

                items.push({
                    "@type": "Question",
                    "name": question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": answer
                    }
                });
            });

        if (items.length === 0) {
            removeStructuredDataScript("growwise-faq-structured-data");
            return;
        }

        setStructuredDataScript("growwise-faq-structured-data", {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": items
        });
    }

    function renderIcons() {
        if (
            !window.lucide ||
            typeof window.lucide.createIcons !== "function"
        ) {
            return;
        }

        window.lucide.createIcons({
            attrs: {
                "stroke-width": 1.8
            }
        });
    }

    function initAOS() {
        if (
            !window.AOS ||
            typeof window.AOS.init !== "function"
        ) {
            document.documentElement.classList.add(
                "aos-unavailable"
            );
            return;
        }

        window.AOS.init({
            once: true,
            mirror: false,
            duration: 650,
            easing: "ease-out-cubic",
            offset: 60,
            delay: 0,
            anchorPlacement: "top-bottom",
            debounceDelay: 100,
            throttleDelay: 120,
            disableMutationObserver: true,
            disable: function () {
                return window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches;
            }
        });
    }

    function getAccordionTriggers(container) {
        return Array.from(
            container.querySelectorAll("[data-accordion-trigger]")
        );
    }

    function setAccordionState(trigger, shouldOpen, container) {
        const panelId = trigger.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        const item = trigger.closest(".site-accordion__item");

        if (!panel) {
            return;
        }

        trigger.setAttribute("aria-expanded", String(shouldOpen));
        panel.dataset.open = String(shouldOpen);
        panel.setAttribute("aria-hidden", String(!shouldOpen));
        setInert(panel, !shouldOpen);

        if (item) {
            item.classList.toggle("is-open", shouldOpen);
        }

        container.dispatchEvent(
            new CustomEvent("growwise:accordion-change", {
                bubbles: true,
                detail: {
                    trigger: trigger,
                    panel: panel,
                    open: shouldOpen
                }
            })
        );
    }

    function closeOtherAccordionItems(activeTrigger, container) {
        if (container.dataset.accordionMultiple === "true") {
            return;
        }

        getAccordionTriggers(container).forEach(function (trigger) {
            if (
                trigger !== activeTrigger &&
                trigger.getAttribute("aria-expanded") === "true"
            ) {
                setAccordionState(trigger, false, container);
            }
        });
    }

    function prepareAccordionItem(trigger, index, containerIndex) {
        let triggerId = trigger.id;
        let panelId = trigger.getAttribute("aria-controls");
        let panel = panelId ? document.getElementById(panelId) : null;

        if (!triggerId) {
            triggerId = `site-accordion-trigger-${containerIndex}-${index}`;
            trigger.id = triggerId;
        }

        if (!panel) {
            const item = trigger.closest(".site-accordion__item");

            panel = item
                ? item.querySelector("[data-accordion-panel]")
                : null;
        }

        if (!panel) {
            return null;
        }

        if (!panel.id) {
            panel.id = `site-accordion-panel-${containerIndex}-${index}`;
        }

        panelId = panel.id;
        trigger.setAttribute("aria-controls", panelId);
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", triggerId);

        const shouldOpen =
            trigger.getAttribute("aria-expanded") === "true" ||
            (containerIndex >= 0 &&
                trigger.closest("[data-accordion]") &&
                trigger.closest("[data-accordion]").dataset.accordionOpen === "first" &&
                index === 0);

        setAccordionState(
            trigger,
            shouldOpen,
            trigger.closest("[data-accordion]") || trigger.parentElement
        );

        return panel;
    }

    function initAccordionContainer(container, containerIndex) {
        if (!container || container.dataset.accordionInitialized === "true") {
            return;
        }

        const triggers = getAccordionTriggers(container);

        if (triggers.length === 0) {
            return;
        }

        container.dataset.accordionInitialized = "true";

        triggers.forEach(function (trigger, index) {
            prepareAccordionItem(trigger, index, containerIndex);

            trigger.addEventListener("click", function () {
                const isOpen = trigger.getAttribute("aria-expanded") === "true";

                if (!isOpen) {
                    closeOtherAccordionItems(trigger, container);
                }

                setAccordionState(trigger, !isOpen, container);
            });

            trigger.addEventListener("keydown", function (event) {
                const currentIndex = triggers.indexOf(trigger);
                let nextIndex = currentIndex;

                if (event.key === "ArrowDown") {
                    nextIndex = (currentIndex + 1) % triggers.length;
                } else if (event.key === "ArrowUp") {
                    nextIndex =
                        (currentIndex - 1 + triggers.length) % triggers.length;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = triggers.length - 1;
                } else {
                    return;
                }

                event.preventDefault();
                triggers[nextIndex].focus();
            });
        });
    }

    function initAccordions(root) {
        const scope = root || document;
        const containers = Array.from(
            scope.querySelectorAll("[data-accordion]")
        );

        if (
            scope instanceof Element &&
            scope.matches("[data-accordion]")
        ) {
            containers.unshift(scope);
        }

        Array.from(new Set(containers)).forEach(function (
            container,
            index
        ) {
            initAccordionContainer(container, index);
        });

        updateFaqStructuredData();
    }

    function initDesktopDropdown() {
        const dropdown = document.querySelector("[data-site-dropdown]");

        if (!dropdown || dropdown.dataset.dropdownInitialized === "true") {
            return;
        }

        const toggle = dropdown.querySelector("[data-site-dropdown-toggle]");
        const menu = dropdown.querySelector("[data-site-dropdown-menu]");

        if (!toggle || !menu) {
            return;
        }

        dropdown.dataset.dropdownInitialized = "true";

        function setOpen(shouldOpen, focusFirstLink) {
            dropdown.dataset.dropdownOpen = String(shouldOpen);
            toggle.setAttribute("aria-expanded", String(shouldOpen));

            if (shouldOpen && focusFirstLink) {
                const firstLink = menu.querySelector("a");

                if (firstLink) {
                    firstLink.focus();
                }
            }
        }

        toggle.addEventListener("click", function () {
            const shouldOpen =
                toggle.getAttribute("aria-expanded") !== "true";

            setOpen(shouldOpen, false);
        });

        toggle.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true, true);
            }

            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false, false);
            }
        });

        const links = Array.from(menu.querySelectorAll("a"));

        links.forEach(function (link, index) {
            link.addEventListener("keydown", function (event) {
                let nextIndex = index;

                if (event.key === "ArrowDown") {
                    nextIndex = (index + 1) % links.length;
                } else if (event.key === "ArrowUp") {
                    nextIndex = (index - 1 + links.length) % links.length;
                } else if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = links.length - 1;
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false, false);
                    toggle.focus();
                    return;
                } else {
                    return;
                }

                event.preventDefault();
                links[nextIndex].focus();
            });

            link.addEventListener("click", function () {
                setOpen(false, false);
            });
        });

        dropdown.addEventListener("focusout", function () {
            window.setTimeout(function () {
                if (!dropdown.contains(document.activeElement)) {
                    setOpen(false, false);
                }
            }, 0);
        });

        document.addEventListener("click", function (event) {
            if (!dropdown.contains(event.target)) {
                setOpen(false, false);
            }
        });
    }

    function getFocusableElements(container) {
        if (!container) {
            return [];
        }

        return Array.from(
            container.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter(function (element) {
            return (
                !element.hasAttribute("hidden") &&
                element.getAttribute("aria-hidden") !== "true" &&
                !element.closest("[inert]")
            );
        });
    }

    function lockBodyScroll() {
        if (state.bodyStyles) {
            return;
        }

        state.scrollPosition =
            window.scrollY || document.documentElement.scrollTop || 0;

        state.bodyStyles = {
            position: document.body.style.position,
            top: document.body.style.top,
            left: document.body.style.left,
            right: document.body.style.right,
            width: document.body.style.width
        };

        document.body.classList.add("site-menu-open");
        document.body.style.position = "fixed";
        document.body.style.top = `-${state.scrollPosition}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
    }

    function unlockBodyScroll() {
        if (!state.bodyStyles) {
            document.body.classList.remove("site-menu-open");
            return;
        }

        document.body.classList.remove("site-menu-open");
        document.body.style.position = state.bodyStyles.position;
        document.body.style.top = state.bodyStyles.top;
        document.body.style.left = state.bodyStyles.left;
        document.body.style.right = state.bodyStyles.right;
        document.body.style.width = state.bodyStyles.width;

        const restorePosition = state.scrollPosition;

        state.bodyStyles = null;
        window.scrollTo(0, restorePosition);
    }

    function initMobileMenu() {
        const menu = document.querySelector("[data-mobile-menu]");
        const openButton = document.querySelector("[data-mobile-menu-open]");
        const closeButton = document.querySelector("[data-mobile-menu-close]");
        const categoriesToggle = document.querySelector(
            "[data-mobile-categories-toggle]"
        );
        const categoriesPanel = document.querySelector(
            "[data-mobile-categories-panel]"
        );

        if (
            !menu ||
            !openButton ||
            !closeButton ||
            menu.dataset.menuInitialized === "true"
        ) {
            return;
        }

        menu.dataset.menuInitialized = "true";

        function setCategoriesOpen(shouldOpen) {
            if (!categoriesToggle || !categoriesPanel) {
                return;
            }

            categoriesToggle.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );
            categoriesPanel.dataset.open = String(shouldOpen);
            categoriesPanel.setAttribute(
                "aria-hidden",
                String(!shouldOpen)
            );
            setInert(categoriesPanel, !shouldOpen);
        }

        function openMenu() {
            if (state.mobileMenuOpen) {
                return;
            }

            state.mobileMenuOpen = true;
            state.mobileMenuTrigger = document.activeElement;
            menu.classList.add("is-open");
            menu.setAttribute("aria-hidden", "false");
            openButton.setAttribute("aria-expanded", "true");
            setInert(menu, false);
            lockBodyScroll();

            window.requestAnimationFrame(function () {
                closeButton.focus();
            });
        }

        function closeMenu(restoreFocus) {
            if (!state.mobileMenuOpen) {
                return;
            }

            state.mobileMenuOpen = false;
            menu.classList.remove("is-open");
            menu.setAttribute("aria-hidden", "true");
            openButton.setAttribute("aria-expanded", "false");
            setCategoriesOpen(false);
            setInert(menu, true);
            unlockBodyScroll();

            if (
                restoreFocus !== false &&
                state.mobileMenuTrigger instanceof HTMLElement
            ) {
                state.mobileMenuTrigger.focus();
            }

            state.mobileMenuTrigger = null;
        }

        openButton.addEventListener("click", openMenu);
        closeButton.addEventListener("click", function () {
            closeMenu(true);
        });

        if (categoriesToggle && categoriesPanel) {
            setCategoriesOpen(false);

            categoriesToggle.addEventListener("click", function () {
                const shouldOpen =
                    categoriesToggle.getAttribute("aria-expanded") !== "true";

                setCategoriesOpen(shouldOpen);
            });
        }

        menu.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu(true);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusable = getFocusableElements(menu);

            if (focusable.length === 0) {
                event.preventDefault();
                menu.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        });

        menu.querySelectorAll("a[href]").forEach(function (link) {
            link.addEventListener("click", function () {
                closeMenu(false);
            });
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1100 && state.mobileMenuOpen) {
                closeMenu(false);
            }
        });
    }

    function initHeaderScrollState() {
        const header = document.querySelector("[data-site-header-element]");

        if (!header || header.dataset.scrollInitialized === "true") {
            return;
        }

        header.dataset.scrollInitialized = "true";
        let ticking = false;

        function update() {
            header.classList.toggle("is-scrolled", window.scrollY > 24);
            ticking = false;
        }

        function requestUpdate() {
            if (ticking) {
                return;
            }

            ticking = true;
            window.requestAnimationFrame(update);
        }

        update();
        window.addEventListener("scroll", requestUpdate, {
            passive: true
        });
    }

    function readCookiePreference() {
        const storageKey = getConfigValue(
            "cookieConsent.storageKey",
            "growwiseCookiePreference"
        );

        try {
            return window.localStorage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function saveCookiePreference(value) {
        const storageKey = getConfigValue(
            "cookieConsent.storageKey",
            "growwiseCookiePreference"
        );

        try {
            window.localStorage.setItem(storageKey, value);
        } catch (error) {
            return false;
        }

        return true;
    }

    function initCookieConsent() {
        if (document.querySelector("[data-cookie-consent]")) {
            return;
        }

        const existingPreference = readCookiePreference();

        if (
            existingPreference === "accepted" ||
            existingPreference === "declined"
        ) {
            return;
        }

        const title = resolveTemplate(
            getConfigValue("cookieConsent.title", "Your privacy choices")
        );
        const text = resolveTemplate(
            getConfigValue("cookieConsent.text", "")
        );
        const acceptLabel = resolveTemplate(
            getConfigValue("cookieConsent.acceptLabel", "Accept")
        );
        const declineLabel = resolveTemplate(
            getConfigValue("cookieConsent.declineLabel", "Decline")
        );
        const policyLabel = resolveTemplate(
            getConfigValue("cookieConsent.policyLabel", "Cookie Policy")
        );
        const policyHref = normalizeUrl(
            getConfigValue(
                "cookieConsent.policyHref",
                "cookie-policy.html"
            )
        );
        const element = document.createElement("section");

        element.className = "site-cookie";
        element.setAttribute("data-cookie-consent", "");
        element.setAttribute("role", "dialog");
        element.setAttribute("aria-modal", "false");
        element.setAttribute("aria-labelledby", "site-cookie-title");
        element.setAttribute("aria-describedby", "site-cookie-description");

        element.innerHTML = `
      <div class="site-cookie__content">
        <h2 class="site-cookie__title" id="site-cookie-title">${escapeHtml(
            title
        )}</h2>
        <p class="site-cookie__text" id="site-cookie-description">${escapeHtml(
            text
        )}</p>
        <a
          class="site-cookie__policy"
          href="${escapeAttribute(policyHref)}"
        >${escapeHtml(policyLabel)}</a>
        <div class="site-cookie__actions">
          <button
            class="site-cookie__button site-cookie__button--accept"
            type="button"
            data-cookie-accept
          >${escapeHtml(acceptLabel)}</button>
          <button
            class="site-cookie__button site-cookie__button--decline"
            type="button"
            data-cookie-decline
          >${escapeHtml(declineLabel)}</button>
        </div>
      </div>
    `;

        document.body.appendChild(element);

        function closeConsent(preference) {
            saveCookiePreference(preference);
            element.classList.remove("is-visible");

            window.setTimeout(function () {
                element.remove();
            }, reducedMotionQuery.matches ? 0 : 340);
        }

        element
            .querySelector("[data-cookie-accept]")
            .addEventListener("click", function () {
                closeConsent("accepted");
            });

        element
            .querySelector("[data-cookie-decline]")
            .addEventListener("click", function () {
                closeConsent("declined");
            });

        window.requestAnimationFrame(function () {
            element.classList.add("is-visible");
        });
    }

    function initBackToTop() {
        const links = document.querySelectorAll('a[href="#top"]');

        links.forEach(function (link) {
            if (link.dataset.backToTopInitialized === "true") {
                return;
            }

            link.dataset.backToTopInitialized = "true";

            link.addEventListener("click", function (event) {
                event.preventDefault();

                window.scrollTo({
                    top: 0,
                    behavior: reducedMotionQuery.matches ? "auto" : "smooth"
                });
            });
        });
    }

    function initMotionPreferenceListener() {
        function handleChange(event) {
            if (event.matches) {
                revealScrollAnimationContent(document);
            }

            window.dispatchEvent(
                new CustomEvent("growwise:motion-change", {
                    detail: {
                        reducedMotion: event.matches
                    }
                })
            );
        }

        if (typeof reducedMotionQuery.addEventListener === "function") {
            reducedMotionQuery.addEventListener("change", handleChange);
        } else if (typeof reducedMotionQuery.addListener === "function") {
            reducedMotionQuery.addListener(handleChange);
        }
    }

    function renderConfigurationError() {
        revealScrollAnimationContent(document);

        const existingMain = document.querySelector("main");
        const errorMarkup = `
      <section class="site-config-error" role="alert">
        <div class="site-config-error__inner">
          <h1 class="site-config-error__title">Website configuration error</h1>
          <p class="site-config-error__text">The website cannot load because its configuration is missing or invalid.</p>
        </div>
      </section>
    `;

        if (existingMain) {
            existingMain.innerHTML = errorMarkup;
        } else {
            document.body.insertAdjacentHTML("beforeend", errorMarkup);
        }
    }

    function createSwiperOnce(root, options) {
        const element =
            typeof root === "string" ? document.querySelector(root) : root;

        if (
            !element ||
            !window.Swiper ||
            typeof window.Swiper !== "function"
        ) {
            return null;
        }

        if (element.growwiseSwiper) {
            return element.growwiseSwiper;
        }

        const finalOptions = Object.assign({}, options || {});

        if (reducedMotionQuery.matches && finalOptions.autoplay) {
            finalOptions.autoplay = false;
        }

        const instance = new window.Swiper(element, finalOptions);

        element.growwiseSwiper = instance;

        return instance;
    }

    function initialize() {
        getCurrentPageState();

        if (!validateConfig(config)) {
            renderConfigurationError();
            readyResolver(false);
            return;
        }

        if (!document.body.id) {
            document.body.id = "top";
        }

        ensureSkipLink();
        renderHeader();
        renderFooter();
        applyConfigBindings(document);
        updateFavicon();
        updateSeo();
        updateBaseStructuredData();
        initDesktopDropdown();
        initMobileMenu();
        initHeaderScrollState();
        initAccordions(document);
        initCookieConsent();
        initBackToTop();
        renderIcons();
        initAOS();
        initMotionPreferenceListener();

        window.dispatchEvent(
            new CustomEvent("growwise:ready", {
                detail: {
                    page: state.page,
                    category: state.category
                }
            })
        );

        readyResolver(true);
    }

    window.Growwise = {
        config: config,
        ready: ready,
        getCurrentPage: function () {
            return {
                page: state.page,
                category: state.category
            };
        },
        getConfigValue: getConfigValue,
        resolveTemplate: resolveTemplate,
        escapeHtml: escapeHtml,
        normalizeUrl: normalizeUrl,
        renderIcons: renderIcons,
        initAccordions: initAccordions,
        applyConfigBindings: applyConfigBindings,
        updateFaqStructuredData: updateFaqStructuredData,
        createSwiperOnce: createSwiperOnce,
        prefersReducedMotion: function () {
            return reducedMotionQuery.matches;
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, {
            once: true
        });
    } else {
        initialize();
    }
})();
