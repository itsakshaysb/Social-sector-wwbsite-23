const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const form = document.querySelector(".contact-form");
const status = document.querySelector(".form-status");

function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

if (toggle && nav) {
    toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenu(false);
    });
}

if (form && status) {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        status.classList.remove("is-error");
        if (!form.checkValidity()) {
            form.reportValidity();
            status.classList.add("is-error");
            status.textContent = "Please complete the required fields.";
            return;
        }
        status.textContent = "Sending…";
        window.setTimeout(() => {
            status.textContent = "Thank you. We will write back shortly.";
            form.reset();
        }, 400);
    });
}
