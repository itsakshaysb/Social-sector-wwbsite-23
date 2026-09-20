const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const form = document.querySelector(".contact-form");
const status = document.querySelector(".form-status");

if (toggle && nav) {
    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open menu");
        });
    });
}

if (form && status) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        status.hidden = false;
        status.textContent = "Thanks — we’ll write back within a few days.";
        form.reset();
    });
}
