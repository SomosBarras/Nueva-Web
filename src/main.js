import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initGallery } from "./gallery.js";

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add("js-ready");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionButton = document.querySelector(".motion-toggle");
const services = document.querySelector(".services");
const track = document.querySelector(".services-track");
const serviceCurrent = document.querySelector("#service-current");
const serviceProgress = document.querySelector(".services-progress > span");
const serviceButtons = [...document.querySelectorAll("[data-service]")];
const serviceCards = [...document.querySelectorAll(".service-card")];
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

const lead = document.querySelector(".about-copy .lead");
const words = lead.textContent.trim().split(/\s+/);
lead.replaceChildren(
  ...words.flatMap((word, index) => {
    const span = document.createElement("span");
    span.className = "copy-word";
    span.textContent = word;
    return index ? [document.createTextNode(" "), span] : [span];
  }),
);

function setService(index) {
  serviceCurrent.textContent = String(index + 1).padStart(2, "0");
  serviceButtons.forEach((button, item) => {
    if (index === item) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
}

function clearMotion() {
  media?.revert();
  context?.revert();
  if (tickerCallback) gsap.ticker.remove(tickerCallback);
  lenis?.destroy();
  lenis = undefined;
  services.classList.remove("scroll-services");
  serviceProgress.style.transform = "";
  setService(0);
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
    anchors: { offset: 0 },
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
          ".hero-photo-panel",
          { clipPath: "inset(100% 0 0 0)", duration: 1.25, ease: "power4.out" },
          0.05,
        )
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
      yPercent: -10,
      opacity: 0.05,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    gsap.to(".hero-photo-panel", {
      left: () => (window.innerWidth > 900 ? "6%" : "0%"),
      right: () => (window.innerWidth > 900 ? "4%" : "0%"),
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    gsap.to(".hero-photo", {
      scale: 1.1,
      yPercent: 5,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
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
    gsap.from(".copy-word", {
      opacity: 0.18,
      stagger: 0.08,
      ease: "none",
      scrollTrigger: {
        trigger: lead,
        start: "top 88%",
        end: "bottom 55%",
        scrub: true,
      },
    });
    gsap.from(".about-field", {
      clipPath: "inset(16% 0 16% 0)",
      ease: "none",
      scrollTrigger: {
        trigger: ".about-field",
        start: "top 90%",
        end: "top 45%",
        scrub: 0.6,
      },
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
      y: 18,
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
        { yPercent: -4, scale: 1.09 },
        {
          yPercent: 4,
          scale: 1.09,
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
    gsap.fromTo(
      ".footer-watermark",
      { xPercent: 2 },
      {
        xPercent: -5,
        ease: "none",
        scrollTrigger: {
          trigger: ".site-footer",
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
        },
      },
    );
  });

  media = gsap.matchMedia();
  media.add("(min-width: 901px) and (min-height: 640px)", () => {
    services.classList.add("scroll-services");
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        id: "service-flow",
        trigger: ".services-stage",
        start: "top top",
        end: () => `+=${distance() * 1.05}`,
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const cardWidth = serviceCards[0].offsetWidth;
          const viewportCenter =
            self.progress * distance() + window.innerWidth * 0.455;
          setService(
            Math.max(
              0,
              Math.min(
                3,
                Math.floor(
                  viewportCenter / (cardWidth + window.innerWidth * 0.02),
                ),
              ),
            ),
          );
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

let readingSnapshot;
let readingRestoreFrame;
function restoreReadingPosition() {
  if (!readingSnapshot) return;
  const flow = ScrollTrigger.getById("service-flow");
  // Enabling motion creates a pin spacer on GSAP's next update. Measure its
  // actual height instead of restoring against the temporary unpinned layout.
  if (flow) {
    const expectedHeight =
      document.querySelector(".services-stage").offsetHeight +
      Math.max(0, flow.end - flow.start);
    if (services.offsetHeight + 2 < expectedHeight) {
      readingRestoreFrame = requestAnimationFrame(restoreReadingPosition);
      return;
    }
  }
  const { chapter, previousTop, serviceIndex } = readingSnapshot;
  lenis?.resize();
  let destination =
    window.scrollY + chapter.getBoundingClientRect().top - previousTop;
  if (chapter === services) {
    if (flow) {
      const distance = track.scrollWidth - window.innerWidth;
      const progress = Math.min(
        1,
        (serviceIndex *
          (serviceCards[0].offsetWidth + window.innerWidth * 0.02)) /
          distance,
      );
      destination = flow.start + progress * (flow.end - flow.start);
    } else
      destination =
        serviceCards[serviceIndex].getBoundingClientRect().top +
        window.scrollY -
        132;
    setService(serviceIndex);
  }
  if (lenis) lenis.scrollTo(destination, { immediate: true });
  else window.scrollTo(0, destination);
  readingSnapshot = undefined;
  updateProgress();
}

function rebuildMotionAtReadingPosition() {
  if (!readingSnapshot) {
    const chapter =
      [...document.querySelectorAll("main > section[id]")]
        .filter(
          (section) =>
            section.getBoundingClientRect().top <= window.innerHeight * 0.33,
        )
        .at(-1) || document.querySelector(".hero");
    const previousTop = chapter.getBoundingClientRect().top;
    let serviceIndex = Number(serviceCurrent.textContent) - 1;
    if (
      chapter === services &&
      !services.classList.contains("scroll-services")
    ) {
      const visible = serviceCards.findIndex((card) => {
        const box = card.getBoundingClientRect();
        return box.top < window.innerHeight * 0.65 && box.bottom > 132;
      });
      if (visible >= 0) serviceIndex = visible;
    }
    readingSnapshot = { chapter, previousTop, serviceIndex };
  }
  cancelAnimationFrame(readingRestoreFrame);
  setupMotion();
  readingRestoreFrame = requestAnimationFrame(restoreReadingPosition);
}

motionButton.addEventListener("click", () => {
  paused = !paused;
  storedPause = paused;
  try {
    localStorage.setItem("sb-motion-paused", String(paused));
  } catch {
    /* Storage is optional. */
  }
  rebuildMotionAtReadingPosition();
});

serviceButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const flow = ScrollTrigger.getById("service-flow");
    if (flow) {
      const gap = window.innerWidth * 0.02;
      const distance = track.scrollWidth - window.innerWidth;
      const progress = Math.min(
        1,
        (index * (serviceCards[0].offsetWidth + gap)) / distance,
      );
      const position = flow.start + progress * (flow.end - flow.start);
      if (lenis) lenis.scrollTo(position, { duration: 1 });
      else window.scrollTo(0, position);
    } else {
      const position =
        serviceCards[index].getBoundingClientRect().top + window.scrollY - 132;
      if (lenis) lenis.scrollTo(position, { duration: 0.8 });
      else window.scrollTo(0, position);
      setService(index);
    }
  });
});
reduceMotion.addEventListener("change", (event) => {
  paused = event.matches || storedPause;
  rebuildMotionAtReadingPosition();
});

// Native scrolling remains available with JavaScript or motion disabled.
const headerProgress = document.querySelector(".header-progress");
const chapters = [...document.querySelectorAll("main > section[id]")];
const chapterLinks = [...document.querySelectorAll("[data-section]")];
let scrollFrame = false;
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  headerProgress.style.transform = `scaleX(${max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0})`;
  const current =
    chapters
      .filter(
        (section) =>
          section.getBoundingClientRect().top <= window.innerHeight * 0.33,
      )
      .at(-1)?.id || "inicio";
  chapterLinks.forEach((link) => {
    if (link.dataset.section === current)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
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
document.querySelectorAll(".editorial-media img").forEach((image) => {
  const updateImage = () => {
    image.hidden = image.naturalWidth === 0;
    image.parentElement.classList.toggle(
      "media-failed",
      image.naturalWidth === 0,
    );
  };
  image.addEventListener("error", updateImage);
  image.addEventListener("load", updateImage);
  if (image.complete) updateImage();
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
initGallery({ getLenis: () => lenis });
updateProgress();
document.fonts.ready.then(() => ScrollTrigger.refresh());
window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
