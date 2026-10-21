import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add("js-ready");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionButton = document.querySelector(".motion-toggle");
const services = document.querySelector(".services");
const track = document.querySelector(".services-track");
const serviceCurrent = document.querySelector("#service-current");
const serviceProgress = document.querySelector(".services-progress > span");
let context;
let media;
let lenis;
let tickerCallback;
let hasEntered = false;
let storedPause = false;
try {
  storedPause = localStorage.getItem("sb-motion-paused") === "true";
} catch {
  /* Storage is optional. */
}
let paused = reduceMotion.matches || storedPause;

function clearMotion() {
  media?.revert();
  context?.revert();
  if (tickerCallback) gsap.ticker.remove(tickerCallback);
  lenis?.destroy();
  lenis = undefined;
  services.classList.remove("scroll-services");
  serviceProgress.style.transform = "";
  serviceCurrent.textContent = "01";
}

function setupMotion() {
  clearMotion();
  document.documentElement.classList.toggle("motion-paused", paused);
  motionButton.setAttribute("aria-pressed", String(paused));
  motionButton.setAttribute(
    "aria-label",
    paused ? "Activar animaciones" : "Pausar animaciones",
  );
  if (paused) {
    hasEntered = true;
    ScrollTrigger.refresh();
    return;
  }

  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    anchors: { offset: -90 },
  });
  lenis.on("scroll", ScrollTrigger.update);
  tickerCallback = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerCallback);

  context = gsap.context(() => {
    if (!hasEntered && window.scrollY < 100) {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-topline", { y: 15, autoAlpha: 0, duration: 0.8 }, 0.15)
        .from(
          ".hero-title .title-mask > span",
          { yPercent: 115, rotate: 3, duration: 1.15, stagger: 0.12 },
          0.18,
        )
        .from(".hero-bottom", { y: 25, autoAlpha: 0, duration: 0.9 }, 0.6)
        .from(".hero-footnote", { autoAlpha: 0, duration: 0.7 }, 0.8);
    }
    hasEntered = true;

    gsap.to(".hero-title", {
      yPercent: 22,
      opacity: 0.12,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    gsap.to(".hero-art", {
      rotation: 35,
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });

    document.querySelectorAll(".statement, .contact h2").forEach((heading) => {
      gsap.from(heading.querySelectorAll(".reveal-line > span"), {
        yPercent: 112,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: heading, start: "top 88%", once: true },
      });
    });
    gsap.from(".about-copy p", {
      y: 35,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: { trigger: ".about-copy", start: "top 90%", once: true },
    });
    gsap.from("[data-count]", {
      textContent: 0,
      snap: { textContent: 1 },
      duration: 1.4,
      ease: "power2.out",
      scrollTrigger: { trigger: ".experience", start: "top 85%", once: true },
    });
    gsap.from(".stat-rules span", {
      scaleY: 0,
      transformOrigin: "bottom",
      duration: 0.9,
      stagger: 0.1,
      scrollTrigger: { trigger: ".experience", start: "top 85%", once: true },
    });
    gsap.from(".client-list li", {
      y: 25,
      autoAlpha: 0,
      duration: 0.65,
      stagger: 0.025,
      ease: "power2.out",
      scrollTrigger: { trigger: ".client-list", start: "top 90%", once: true },
    });
    document.querySelectorAll(".rotating-star").forEach((star) => {
      gsap.to(star, {
        rotation: 150,
        ease: "none",
        scrollTrigger: {
          trigger: star.closest("section"),
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    });
    document.querySelectorAll(".gallery-media").forEach((image) => {
      gsap.fromTo(
        image.querySelector("img"),
        { yPercent: -7, scale: 1.16 },
        {
          yPercent: 7,
          scale: 1.16,
          ease: "none",
          scrollTrigger: {
            trigger: image,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    });
  });

  media = gsap.matchMedia();
  media.add("(min-width: 901px) and (min-height: 640px)", () => {
    services.classList.add("scroll-services");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".services-stage",
        start: "top top",
        end: () => `+=${distance() * 1.05}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          serviceCurrent.textContent = String(
            Math.min(4, 1 + Math.floor(self.progress * 4)),
          ).padStart(2, "0");
          serviceProgress.style.transform = `scaleX(${self.progress})`;
        },
      },
    });
    return () => services.classList.remove("scroll-services");
  });
  media.add("(max-width: 900px), (max-height: 639px)", () => {
    document.querySelectorAll(".service-card").forEach((card) => {
      gsap.from(card, {
        y: 35,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 95%", once: true },
      });
    });
  });
  ScrollTrigger.refresh();
}

motionButton.addEventListener("click", () => {
  paused = !paused;
  storedPause = paused;
  try {
    localStorage.setItem("sb-motion-paused", String(paused));
  } catch {
    /* Storage is optional. */
  }
  setupMotion();
});
reduceMotion.addEventListener("change", (event) => {
  paused = event.matches || storedPause;
  setupMotion();
});

// Native scrolling remains available with JavaScript or motion disabled.
const headerProgress = document.querySelector(".header-progress");
let scrollFrame = false;
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  headerProgress.style.transform = `scaleX(${max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0})`;
  scrollFrame = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scrollFrame) {
      scrollFrame = true;
      requestAnimationFrame(updateProgress);
    }
  },
  { passive: true },
);
window.addEventListener("resize", updateProgress);

const navObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const link = document.querySelector(
        `.nav-link[href="#${entry.target.id}"]`,
      );
      link?.classList.toggle("is-active", entry.isIntersecting);
    }
  },
  { rootMargin: "-15% 0px -35% 0px" },
);
navObserver.observe(services);
navObserver.observe(document.querySelector(".operations"));

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.querySelectorAll(".magnetic").forEach((button) => {
    const icon = button.querySelector(".button-icon");
    const x = gsap.quickTo(icon, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(icon, "y", { duration: 0.5, ease: "power3.out" });
    button.addEventListener("pointermove", (event) => {
      if (paused) return;
      const box = button.getBoundingClientRect();
      x((event.clientX - box.left - box.width / 2) * 0.07);
      y((event.clientY - box.top - box.height / 2) * 0.12);
    });
    button.addEventListener("pointerleave", () => {
      x(0);
      y(0);
    });
  });
}

// Keep the original photographs and their descriptions. The technical artwork
// behind them is a deliberate fallback if the origin cannot be reached.
document.querySelectorAll(".brand-source").forEach((image) => {
  const showBrand = () =>
    image.parentElement.classList.toggle(
      "brand-loaded",
      image.naturalWidth > 0,
    );
  image.addEventListener("load", showBrand);
  if (image.complete) showBrand();
});
document.querySelectorAll(".gallery-media img").forEach((image) => {
  const markAsset = () => {
    const media = image.parentElement;
    const failed = image.naturalWidth === 0;
    media.classList.toggle("asset-loaded", !failed);
    media.classList.toggle("asset-failed", failed);
    if (failed) {
      media.setAttribute("role", "img");
      media.setAttribute("aria-label", image.alt);
    } else {
      media.removeAttribute("role");
      media.removeAttribute("aria-label");
    }
  };
  image.addEventListener("load", markAsset);
  image.addEventListener("error", markAsset);
  if (image.complete) markAsset();
});

const chat = document.querySelector("#wa-chat");
const trigger = document.querySelector(".wa-trigger");
const close = document.querySelector(".wa-close");
const message = document.querySelector("#wa-message");
const mainRegions = document.querySelectorAll(
  ".site-header, main, .site-footer",
);

function closeChat() {
  if (chat.hidden) return;
  chat.hidden = true;
  trigger.hidden = false;
  trigger.setAttribute("aria-expanded", "false");
  mainRegions.forEach((region) => {
    region.inert = false;
  });
  lenis?.start();
  trigger.focus({ preventScroll: true });
}
trigger.addEventListener("click", () => {
  chat.hidden = false;
  trigger.hidden = true;
  trigger.setAttribute("aria-expanded", "true");
  mainRegions.forEach((region) => {
    region.inert = true;
  });
  lenis?.stop();
  message.focus({ preventScroll: true });
});
close.addEventListener("click", closeChat);
document.addEventListener("keydown", (event) => {
  if (chat.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeChat();
  }
  if (event.key === "Tab") {
    const controls = [close, message, chat.querySelector('[type="submit"]')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
document.querySelector(".wa-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text =
    message.value.trim() || "Hola, vengo de la web y necesito información.";
  window.open(
    `https://wa.me/34661667318?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
  message.value = "";
  closeChat();
});

setupMotion();
updateProgress();
document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
