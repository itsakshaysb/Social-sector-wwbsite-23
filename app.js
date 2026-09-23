const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const form = document.querySelector(".contact-form");
const status = document.querySelector(".form-status");
const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

window.addEventListener("scroll", () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
}, { passive: true });

if (reduce) {
    document.querySelectorAll(".hero, .reveal, .reveal-group").forEach((el) => el.classList.add("is-in"));
} else {
    requestAnimationFrame(() => hero?.classList.add("is-in"));

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-in");
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    document.querySelectorAll(".reveal-group").forEach((el) => io.observe(el));
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
