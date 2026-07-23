(function () {
    "use strict";

    const body = document.body;

    if (!body || body.dataset.page !== "contact") {
        return;
    }

    let initialized = false;
    let submitting = false;
    let activeRequest = null;
    let collaborationParallax = null;

    function getGrowwise() {
        return window.Growwise || null;
    }

    function getConfig() {
        return window.GROWWISE_CONFIG || {};
    }

    function query(selector, root) {
        return (root || document).querySelector(selector);
    }

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function readPath(source, path) {
        if (!source || typeof path !== "string" || !path.trim()) {
            return undefined;
        }

        return path.split(".").reduce(function (current, key) {
            if (
                current === null ||
                current === undefined ||
                !Object.prototype.hasOwnProperty.call(current, key)
            ) {
                return undefined;
            }

            return current[key];
        }, source);
    }

    function firstString(paths, fallback) {
        const config = getConfig();

        for (let index = 0; index < paths.length; index += 1) {
            const value = readPath(config, paths[index]);

            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }

        return fallback;
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

    function getHeaderOffset() {
        const header = query(".site-header", query("[data-site-header]"));
        const headerHeight = header
            ? header.getBoundingClientRect().height
            : 0;

        return headerHeight + 20;
    }

    function scrollToElement(element, focusElement) {
        if (!element) {
            return;
        }

        const destination =
            element.getBoundingClientRect().top +
            window.scrollY -
            getHeaderOffset();

        window.scrollTo({
            top: Math.max(0, destination),
            behavior: prefersReducedMotion() ? "auto" : "smooth"
        });

        if (focusElement) {
            window.setTimeout(
                function () {
                    focusElement.focus({
                        preventScroll: true
                    });
                },
                prefersReducedMotion() ? 0 : 450
            );
        }
    }

    function getFormField(form, name) {
        if (!form || !name) {
            return null;
        }

        const field = form.elements.namedItem(name);

        return field instanceof HTMLElement ? field : null;
    }

    function getErrorElement(form, name) {
        return query(`[data-contact-error="${name}"]`, form);
    }

    function getFieldWrapper(field) {
        return field
            ? field.closest(".contact-form__field")
            : null;
    }

    function getFieldMessage(name, type, fallback) {
        return firstString(
            [
                `contactForm.fields.${name}.messages.${type}`,
                `contactForm.fields.${name}.${type}Message`,
                `contactForm.validation.${name}.${type}`,
                `contactForm.messages.${name}.${type}`,
                `contactForm.messages.${type}`
            ],
            fallback
        );
    }

    function getGlobalMessage(type, fallback) {
        return firstString(
            [
                `contactForm.messages.${type}`,
                `contactForm.${type}Message`,
                `contactForm.formMessages.${type}`
            ],
            fallback
        );
    }

    function appendDescribedBy(field, errorElement) {
        if (!field || !errorElement || !errorElement.id) {
            return;
        }

        const values = (
            field.getAttribute("aria-describedby") || ""
        )
            .split(/\s+/)
            .filter(Boolean);

        if (!values.includes(errorElement.id)) {
            values.push(errorElement.id);
        }

        field.setAttribute("aria-describedby", values.join(" "));
    }

    function setFieldError(form, name, message) {
        const field = getFormField(form, name);
        const errorElement = getErrorElement(form, name);
        const wrapper = getFieldWrapper(field);

        if (!field || !errorElement) {
            return;
        }

        errorElement.textContent = message || "";
        field.setAttribute("aria-invalid", "true");
        appendDescribedBy(field, errorElement);

        if (wrapper) {
            wrapper.classList.add("has-error");
        }
    }

    function clearFieldError(form, name) {
        const field = getFormField(form, name);
        const errorElement = getErrorElement(form, name);
        const wrapper = getFieldWrapper(field);

        if (!field || !errorElement) {
            return;
        }

        errorElement.textContent = "";
        field.removeAttribute("aria-invalid");

        if (wrapper) {
            wrapper.classList.remove("has-error");
        }
    }

    function normalizeTextValue(field) {
        if (
            !field ||
            !(
                field instanceof HTMLInputElement ||
                field instanceof HTMLTextAreaElement
            )
        ) {
            return "";
        }

        const value = field.value.replace(/\r\n?/g, "\n").trim();

        field.value = value;

        return value;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
    }

    function validateFullName(form) {
        const field = getFormField(form, "fullName");

        if (!(field instanceof HTMLInputElement)) {
            return true;
        }

        const value = field.value.trim();

        if (!value) {
            setFieldError(
                form,
                "fullName",
                getFieldMessage(
                    "fullName",
                    "required",
                    "Please enter your full name."
                )
            );
            return false;
        }

        if (value.length < 2) {
            setFieldError(
                form,
                "fullName",
                getFieldMessage(
                    "fullName",
                    "tooShort",
                    "Please enter at least 2 characters."
                )
            );
            return false;
        }

        if (value.length > 120) {
            setFieldError(
                form,
                "fullName",
                getFieldMessage(
                    "fullName",
                    "tooLong",
                    "Please keep your name under 120 characters."
                )
            );
            return false;
        }

        clearFieldError(form, "fullName");
        return true;
    }

    function validateEmail(form) {
        const field = getFormField(form, "email");

        if (!(field instanceof HTMLInputElement)) {
            return true;
        }

        const value = field.value.trim();

        if (!value) {
            setFieldError(
                form,
                "email",
                getFieldMessage(
                    "email",
                    "required",
                    "Please enter your email address."
                )
            );
            return false;
        }

        if (value.length > 190) {
            setFieldError(
                form,
                "email",
                getFieldMessage(
                    "email",
                    "tooLong",
                    "Please keep your email address under 190 characters."
                )
            );
            return false;
        }

        if (!isValidEmail(value)) {
            setFieldError(
                form,
                "email",
                getFieldMessage(
                    "email",
                    "invalid",
                    "Please enter a valid email address."
                )
            );
            return false;
        }

        clearFieldError(form, "email");
        return true;
    }

    function validateOrganization(form) {
        const field = getFormField(form, "organization");

        if (!(field instanceof HTMLInputElement)) {
            return true;
        }

        const value = field.value.trim();

        if (value.length > 160) {
            setFieldError(
                form,
                "organization",
                getFieldMessage(
                    "organization",
                    "tooLong",
                    "Please keep the organization name under 160 characters."
                )
            );
            return false;
        }

        clearFieldError(form, "organization");
        return true;
    }

    function validatePrimaryInterest(form) {
        const field = getFormField(form, "primaryInterest");

        if (!(field instanceof HTMLSelectElement)) {
            return true;
        }

        if (!field.value) {
            setFieldError(
                form,
                "primaryInterest",
                getFieldMessage(
                    "primaryInterest",
                    "required",
                    "Please select a primary interest."
                )
            );
            return false;
        }

        clearFieldError(form, "primaryInterest");
        return true;
    }

    function validateProjectType(form) {
        const field = getFormField(form, "projectType");

        if (!(field instanceof HTMLSelectElement)) {
            return true;
        }

        clearFieldError(form, "projectType");
        return true;
    }

    function validateMessage(form) {
        const field = getFormField(form, "message");

        if (!(field instanceof HTMLTextAreaElement)) {
            return true;
        }

        const value = field.value.trim();

        if (!value) {
            setFieldError(
                form,
                "message",
                getFieldMessage(
                    "message",
                    "required",
                    "Please enter a message."
                )
            );
            return false;
        }

        if (value.length < 20) {
            setFieldError(
                form,
                "message",
                getFieldMessage(
                    "message",
                    "tooShort",
                    "Please provide at least 20 characters of context."
                )
            );
            return false;
        }

        if (value.length > 4000) {
            setFieldError(
                form,
                "message",
                getFieldMessage(
                    "message",
                    "tooLong",
                    "Please keep your message under 4000 characters."
                )
            );
            return false;
        }

        clearFieldError(form, "message");
        return true;
    }

    function validatePrivacyConsent(form) {
        const field = getFormField(form, "privacyConsent");

        if (!(field instanceof HTMLInputElement)) {
            return true;
        }

        if (!field.checked) {
            setFieldError(
                form,
                "privacyConsent",
                getFieldMessage(
                    "privacyConsent",
                    "required",
                    "Please confirm that your information may be used to respond."
                )
            );
            return false;
        }

        clearFieldError(form, "privacyConsent");
        return true;
    }

    function validateField(form, name) {
        const validators = {
            fullName: validateFullName,
            email: validateEmail,
            organization: validateOrganization,
            primaryInterest: validatePrimaryInterest,
            projectType: validateProjectType,
            message: validateMessage,
            privacyConsent: validatePrivacyConsent
        };

        const validator = validators[name];

        return validator ? validator(form) : true;
    }

    function validateForm(form) {
        const fieldNames = [
            "fullName",
            "email",
            "organization",
            "primaryInterest",
            "projectType",
            "message",
            "privacyConsent"
        ];

        let firstInvalidField = null;
        let valid = true;

        fieldNames.forEach(function (name) {
            const fieldValid = validateField(form, name);

            if (!fieldValid) {
                valid = false;

                if (!firstInvalidField) {
                    firstInvalidField = getFormField(form, name);
                }
            }
        });

        return {
            valid: valid,
            firstInvalidField: firstInvalidField
        };
    }

    function clearAllErrors(form) {
        queryAll("[data-contact-error]", form).forEach(function (
            errorElement
        ) {
            const name = errorElement.dataset.contactError;

            if (name) {
                clearFieldError(form, name);
            }
        });
    }

    function setFormStatus(statusElement, type, message, focus) {
        if (!statusElement) {
            return;
        }

        statusElement.classList.remove("is-success", "is-error");
        statusElement.textContent = "";

        if (!message) {
            statusElement.removeAttribute("tabindex");
            return;
        }

        statusElement.classList.add(
            type === "success" ? "is-success" : "is-error"
        );
        statusElement.textContent = message;
        statusElement.setAttribute("tabindex", "-1");

        if (focus) {
            statusElement.focus({
                preventScroll: true
            });
            scrollToElement(statusElement);
        }
    }

    function setSubmittingState(
        form,
        submitButton,
        labelElement,
        loading
    ) {
        if (!form || !submitButton) {
            return;
        }

        const defaultLabel =
            submitButton.dataset.defaultLabel ||
            labelElement?.textContent.trim() ||
            "Send Inquiry";
        const loadingLabel = getGlobalMessage(
            "sending",
            "Sending Inquiry"
        );

        submitButton.dataset.defaultLabel = defaultLabel;
        submitButton.disabled = loading;
        submitButton.classList.toggle("is-loading", loading);
        submitButton.setAttribute("aria-busy", String(loading));
        form.setAttribute("aria-busy", String(loading));

        if (labelElement) {
            labelElement.textContent = loading
                ? loadingLabel
                : defaultLabel;
        }
    }

    function applyServerErrors(form, errors) {
        if (!errors || typeof errors !== "object") {
            return null;
        }

        let firstInvalidField = null;

        Object.keys(errors).forEach(function (name) {
            const rawMessage = errors[name];
            const message = Array.isArray(rawMessage)
                ? rawMessage.filter(Boolean).join(" ")
                : String(rawMessage || "").trim();

            if (!message || !getFormField(form, name)) {
                return;
            }

            setFieldError(form, name, message);

            if (!firstInvalidField) {
                firstInvalidField = getFormField(form, name);
            }
        });

        return firstInvalidField;
    }

    function parseResponse(response) {
        return response.text().then(function (text) {
            if (!text.trim()) {
                return {};
            }

            try {
                return JSON.parse(text);
            } catch (error) {
                return {
                    success: response.ok,
                    message: text.trim()
                };
            }
        });
    }

    function updateCharacterCount(messageField, countElement) {
        if (!messageField || !countElement) {
            return;
        }

        const maximum = Number(messageField.maxLength) || 4000;
        const length = messageField.value.length;

        countElement.textContent = `${length} / ${maximum}`;
        countElement.classList.toggle(
            "is-near-limit",
            length >= maximum * 0.9
        );
        countElement.classList.toggle(
            "is-at-limit",
            length >= maximum
        );
    }

    function initializeFieldAccessibility(form) {
        queryAll("[data-contact-error]", form).forEach(function (
            errorElement
        ) {
            const name = errorElement.dataset.contactError;
            const field = name ? getFormField(form, name) : null;

            if (field) {
                appendDescribedBy(field, errorElement);
            }
        });
    }

    function bindFieldValidation(form) {
        const fields = queryAll("[data-contact-field]", form);

        fields.forEach(function (field) {
            if (field.dataset.validationInitialized === "true") {
                return;
            }

            field.dataset.validationInitialized = "true";

            const name = field.getAttribute("name");

            if (!name) {
                return;
            }

            field.addEventListener("blur", function () {
                validateField(form, name);
            });

            field.addEventListener("input", function () {
                if (field.getAttribute("aria-invalid") === "true") {
                    validateField(form, name);
                }
            });

            field.addEventListener("change", function () {
                validateField(form, name);
            });
        });
    }

    function normalizeFormValues(form) {
        [
            "fullName",
            "email",
            "organization",
            "message"
        ].forEach(function (name) {
            normalizeTextValue(getFormField(form, name));
        });
    }

    function updateSourcePage(form) {
        const field = getFormField(form, "sourcePage");

        if (!(field instanceof HTMLInputElement)) {
            return;
        }

        const pageName =
            window.location.pathname.split("/").filter(Boolean).pop() ||
            "contact.html";

        field.value = pageName;
    }

    function findMatchingOption(select, requestedValue, keywords) {
        if (!(select instanceof HTMLSelectElement)) {
            return null;
        }

        const directMatch = Array.from(select.options).find(function (
            option
        ) {
            return option.value === requestedValue;
        });

        if (directMatch) {
            return directMatch;
        }

        const normalizedKeywords = (keywords || [])
            .map(function (keyword) {
                return String(keyword).toLowerCase();
            })
            .filter(Boolean);

        return Array.from(select.options).find(function (option) {
            const haystack = `${option.value} ${option.textContent}`
                .toLowerCase()
                .trim();

            return normalizedKeywords.some(function (keyword) {
                return haystack.includes(keyword);
            });
        }) || null;
    }

    function selectOption(select, requestedValue, keywords) {
        const option = findMatchingOption(
            select,
            requestedValue,
            keywords
        );

        if (!option) {
            return false;
        }

        select.value = option.value;
        select.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        return true;
    }

    function selectInterest(form, interest) {
        const primaryInterest = getFormField(
            form,
            "primaryInterest"
        );
        const projectType = getFormField(form, "projectType");

        const interestKeywords = {
            "general-question": ["general", "question"],
            "educational-project": ["education", "content", "guide"],
            "advertising-collaboration": [
                "advertis",
                "collabor",
                "partner"
            ],
            "workshop-consultation": [
                "workshop",
                "consult"
            ],
            other: ["other"]
        };

        const projectValues = {
            "educational-project": {
                value: "joint-educational-project",
                keywords: ["educational", "editorial", "content"]
            },
            "advertising-collaboration": {
                value: "advertising",
                keywords: ["advertis"]
            },
            "workshop-consultation": {
                value: "workshop",
                keywords: ["workshop", "consult"]
            }
        };

        selectOption(
            primaryInterest,
            interest,
            interestKeywords[interest] || [interest]
        );

        const project = projectValues[interest];

        if (project) {
            selectOption(
                projectType,
                project.value,
                project.keywords
            );
        }
    }

    function initInquiryLinks(form) {
        const links = queryAll("[data-contact-interest-link]");

        links.forEach(function (link) {
            if (link.dataset.interestInitialized === "true") {
                return;
            }

            link.dataset.interestInitialized = "true";

            link.addEventListener("click", function (event) {
                const interest = link.dataset.contactInterestLink;
                const href = link.getAttribute("href") || "";
                const targetId = href.startsWith("#")
                    ? href.slice(1)
                    : "";
                const target = targetId
                    ? document.getElementById(targetId)
                    : null;

                if (interest) {
                    selectInterest(form, interest);
                }

                if (target) {
                    event.preventDefault();
                    scrollToElement(target);
                }
            });
        });
    }

    function initCollaborationButton(form) {
        const button = query("[data-contact-collaboration-button]");
        const formSection = document.getElementById("contact-form");
        const primaryInterest = getFormField(
            form,
            "primaryInterest"
        );

        if (
            !button ||
            button.dataset.collaborationInitialized === "true"
        ) {
            return;
        }

        button.dataset.collaborationInitialized = "true";

        button.addEventListener("click", function () {
            selectInterest(form, "advertising-collaboration");
            scrollToElement(formSection, primaryInterest);
        });
    }

    function initQueryParameters(form) {
        const parameters = new URLSearchParams(
            window.location.search
        );
        const interest =
            parameters.get("interest") ||
            parameters.get("inquiry") ||
            "";
        const projectType =
            parameters.get("projectType") ||
            parameters.get("format") ||
            "";

        if (interest) {
            selectInterest(form, interest);
        }

        if (projectType) {
            const projectSelect = getFormField(form, "projectType");

            selectOption(
                projectSelect,
                projectType,
                [projectType.replace(/[-_]+/g, " ")]
            );
        }
    }

    function initCharacterCounter(form) {
        const messageField = query("[data-contact-message]", form);
        const countElement = query(
            "[data-contact-character-count]",
            form
        );

        if (
            !(messageField instanceof HTMLTextAreaElement) ||
            !countElement
        ) {
            return;
        }

        updateCharacterCount(messageField, countElement);

        messageField.addEventListener("input", function () {
            updateCharacterCount(messageField, countElement);
        });

        form.addEventListener("reset", function () {
            window.requestAnimationFrame(function () {
                updateCharacterCount(messageField, countElement);
            });
        });
    }

    function handleFormSubmit(form) {
        const submitButton = query("[data-contact-submit]", form);
        const submitLabel = query(
            "[data-contact-submit-label]",
            form
        );
        const statusElement = query("[data-contact-status]", form);

        form.addEventListener("submit", function (event) {
            if (
                typeof window.fetch !== "function" ||
                submitting
            ) {
                if (submitting) {
                    event.preventDefault();
                }

                return;
            }

            event.preventDefault();
            setFormStatus(statusElement, "", "", false);
            normalizeFormValues(form);

            const validation = validateForm(form);

            if (!validation.valid) {
                setFormStatus(
                    statusElement,
                    "error",
                    getGlobalMessage(
                        "validationError",
                        "Please review the highlighted fields and try again."
                    ),
                    false
                );

                if (validation.firstInvalidField) {
                    scrollToElement(
                        getFieldWrapper(validation.firstInvalidField) ||
                        validation.firstInvalidField,
                        validation.firstInvalidField
                    );
                }

                return;
            }

            submitting = true;
            setSubmittingState(
                form,
                submitButton,
                submitLabel,
                true
            );

            const action = form.getAttribute("action") || "contact.php";
            const formData = new FormData(form);
            const controller =
                "AbortController" in window
                    ? new AbortController()
                    : null;
            const timeoutId = controller
                ? window.setTimeout(function () {
                    controller.abort();
                }, 25000)
                : 0;

            activeRequest = controller;

            window
                .fetch(action, {
                    method: "POST",
                    body: formData,
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    signal: controller ? controller.signal : undefined
                })
                .then(function (response) {
                    return parseResponse(response).then(function (payload) {
                        return {
                            response: response,
                            payload: payload
                        };
                    });
                })
                .then(function (result) {
                    const response = result.response;
                    const payload = result.payload || {};
                    const fieldErrors =
                        payload.errors || payload.fieldErrors || null;

                    if (!response.ok || payload.success === false) {
                        const firstInvalidField = applyServerErrors(
                            form,
                            fieldErrors
                        );

                        const error = new Error(
                            payload.message ||
                            getGlobalMessage(
                                "error",
                                "Your inquiry could not be sent. Please review the form and try again."
                            )
                        );

                        error.firstInvalidField = firstInvalidField;
                        throw error;
                    }

                    clearAllErrors(form);
                    form.reset();
                    updateSourcePage(form);

                    setFormStatus(
                        statusElement,
                        "success",
                        payload.message ||
                        getGlobalMessage(
                            "success",
                            "Thank you. Your inquiry has been sent successfully."
                        ),
                        true
                    );
                })
                .catch(function (error) {
                    const aborted =
                        error &&
                        (error.name === "AbortError" ||
                            error.message === "The operation was aborted.");

                    const message = aborted
                        ? getGlobalMessage(
                            "timeout",
                            "The request took too long. Please check your connection and try again."
                        )
                        : error?.message ||
                        getGlobalMessage(
                            "networkError",
                            "The inquiry could not be sent. Please check your connection and try again."
                        );

                    setFormStatus(
                        statusElement,
                        "error",
                        message,
                        !error?.firstInvalidField
                    );

                    if (error?.firstInvalidField) {
                        scrollToElement(
                            getFieldWrapper(error.firstInvalidField) ||
                            error.firstInvalidField,
                            error.firstInvalidField
                        );
                    }
                })
                .finally(function () {
                    if (timeoutId) {
                        window.clearTimeout(timeoutId);
                    }

                    activeRequest = null;
                    submitting = false;

                    setSubmittingState(
                        form,
                        submitButton,
                        submitLabel,
                        false
                    );
                });
        });
    }

    function initImageStates() {
        const images = queryAll(
            [
                ".contact-preparation__image img",
                ".contact-collaboration__media img",
                ".contact-hero__media img"
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

    function createCollaborationParallax() {
        const section = query(".contact-collaboration");
        const media = query(
            ".contact-collaboration__media",
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
            const movement = progress * -44;

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

    function initContactPage() {
        if (initialized) {
            return;
        }

        const form = query("[data-contact-form]");

        if (!form) {
            return;
        }

        initialized = true;
        body.dataset.contactInitialized = "true";

        initializeFieldAccessibility(form);
        updateSourcePage(form);
        bindFieldValidation(form);
        initCharacterCounter(form);
        initInquiryLinks(form);
        initCollaborationButton(form);
        initQueryParameters(form);
        handleFormSubmit(form);
        initImageStates();

        collaborationParallax = createCollaborationParallax();

        renderIcons();

        window.requestAnimationFrame(function () {
            if (collaborationParallax) {
                collaborationParallax.refresh();
            }

            refreshAOS();
        });

        window.addEventListener(
            "load",
            function () {
                initImageStates();

                if (collaborationParallax) {
                    collaborationParallax.refresh();
                }

                refreshAOS();
            },
            {
                once: true
            }
        );

        window.addEventListener("beforeunload", function () {
            if (activeRequest) {
                activeRequest.abort();
            }
        });
    }

    function start() {
        const growwise = getGrowwise();

        if (growwise && growwise.ready) {
            growwise.ready.then(function (readyState) {
                if (readyState !== false) {
                    initContactPage();
                }
            });

            return;
        }

        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initContactPage,
                {
                    once: true
                }
            );
        } else {
            initContactPage();
        }
    }

    start();
})();