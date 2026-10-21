import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../index-2.html", import.meta.url),
  "utf8",
);
const normalize = (text) =>
  text.normalize("NFC").toLowerCase().replace(/\s+/g, "");

test.beforeEach(async ({ page }) => {
  // Exercise the real failure state without relying on the external WordPress
  // host. Asset connectivity is reported separately, never counted as passing.
  await page.route("https://somosbarras.com/**", (route) => route.abort());
  await page.route("**/assets/photos/**", (route) => route.abort());
  await page.route("**/assets/logo-original.png", (route) => route.abort());
  await page.addInitScript(() => {
    window.__openedLinks = [];
    window.open = (...args) => {
      window.__openedLinks.push(args);
      return null;
    };
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("conserva el contenido original y los colores de marca", async ({
  page,
}) => {
  // Compare the finished copy in the supported static reading mode. Counters
  // and below-the-fold entrances are intentionally unfinished on initial load.
  if (
    (await page.locator(".motion-toggle").getAttribute("aria-pressed")) ===
    "false"
  ) {
    await page.locator(".motion-toggle").click();
  }
  const originalContent = await page.evaluate((html) => {
    const original = new DOMParser().parseFromString(html, "text/html");
    return [
      ...original.querySelectorAll(
        ".tagline, .hero h1 span, .hero p, .btn-neon, .marquee-content span, .big-stat, .about-grid p, .section-heading-dual span, .event-tag, .service-card h3, .service-card p, .contact-section h2, .contact-section a, .sb-gallery-label, footer p, footer a",
      ),
    ]
      .map((element) => element.textContent.trim())
      .filter(Boolean);
  }, source);
  const body = normalize(await page.locator("body").innerText());
  for (const originalText of originalContent)
    expect(body, originalText).toContain(normalize(originalText));
  await expect(page.locator(".client-list li")).toHaveCount(25);
  await expect(page.locator(".service-card")).toHaveCount(4);
  await expect(page.locator(".gallery-item")).toHaveCount(6);
  const palette = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ["--pink", "--white", "--black"].map((name) =>
      style.getPropertyValue(name).trim(),
    );
  });
  expect(palette).toEqual(["#ff3890", "#ffffff", "#000000"]);
  const images = await page
    .locator(".gallery-media img")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        src: element.getAttribute("data-original-src"),
        alt: element.getAttribute("alt"),
      })),
    );
  const originalImages = await page.evaluate((html) => {
    const original = new DOMParser().parseFromString(html, "text/html");
    return [...original.querySelectorAll(".sb-gallery img")].map((element) => ({
      src: element.getAttribute("src"),
      alt: element.getAttribute("alt"),
    }));
  }, source);
  expect(images).toEqual(originalImages);
});

test("el scroll llega a todos los servicios y secciones sin desbordes", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (testInfo.project.name === "desktop") {
    await expect(page.locator(".services")).toHaveClass(/scroll-services/);
    await page.evaluate(() => {
      const section = document.querySelector("#servicios");
      window.scrollTo(
        0,
        section.getBoundingClientRect().top +
          scrollY +
          section.offsetHeight -
          innerHeight -
          2,
      );
    });
    await expect(page.locator("#service-current")).toHaveText("04");
    await expect(page.locator(".service-card").last()).toBeInViewport({
      ratio: 0.8,
    });
  } else {
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  }
  for (const id of [
    "inicio",
    "nosotros",
    "clientes",
    "servicios",
    "operativa",
    "contacto",
  ]) {
    await page.evaluate((id) => {
      const element = document.getElementById(id);
      window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 100);
    }, id);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
      id,
    ).toBeLessThanOrEqual(1);
  }
  await expect(page.locator("#contact-title")).toBeInViewport();
  expect(errors).toEqual([]);
});

test("WhatsApp funciona con teclado, codifica el mensaje y devuelve el foco", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Abrir chat de WhatsApp" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeFocused();
  expect(await page.locator("main").evaluate((element) => element.inert)).toBe(
    true,
  );
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Cerrar chat" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Enviar mensaje por WhatsApp" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cerrar chat" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.locator("main").evaluate((element) => element.inert)).toBe(
    false,
  );

  await trigger.click();
  await page
    .getByRole("textbox")
    .fill("¡Hola! Información para un festival & logística.");
  await page.getByRole("textbox").press("Enter");
  const opened = await page.evaluate(() => window.__openedLinks[0]);
  expect(opened[0]).toBe(
    `https://wa.me/34661667318?text=${encodeURIComponent("¡Hola! Información para un festival & logística.")}`,
  );
  expect(opened[2]).toBe("noopener,noreferrer");
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("textbox")).toHaveValue("");
  await page
    .getByRole("button", { name: "Enviar mensaje por WhatsApp" })
    .click();
  const fallback = await page.evaluate(() => window.__openedLinks[1][0]);
  expect(fallback).toBe(
    `https://wa.me/34661667318?text=${encodeURIComponent("Hola, vengo de la web y necesito información.")}`,
  );
});

test("el control de movimiento respeta y conserva la preferencia", async ({
  page,
}, testInfo) => {
  const motion = page.locator(".motion-toggle");
  if (testInfo.project.name === "reduced-motion") {
    await expect(motion).toHaveAttribute("aria-pressed", "true");
  } else {
    await motion.click();
  }
  await expect(page.locator("html")).toHaveClass(/motion-paused/);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(page.locator(".ticker-track")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  if (testInfo.project.name !== "reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(motion).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(motion).toHaveAttribute("aria-pressed", "true");
  }
});

test("mantiene los destinos de contacto, empleo y páginas legales", async ({
  page,
}) => {
  await expect(
    page.getByRole("link", { name: /Únete al staff/i }),
  ).toHaveAttribute("href", "https://somosbarras.com/empleo");
  await expect(page.locator(".hero-bottom .round-link")).toHaveAttribute(
    "href",
    "https://wa.me/34661667318",
  );
  await expect(page.locator(".contact-button")).toHaveAttribute(
    "href",
    "mailto:hola@somosbarras.com",
  );
  for (const [name, path] of [
    ["Aviso Legal", "aviso-legal"],
    ["Privacidad", "politica-de-privacidad"],
    ["Cookies", "politica-de-cookies"],
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      `https://somosbarras.com/${path}`,
    );
  }
});

test("las fotos inaccesibles mantienen la composición y su descripción", async ({
  page,
}) => {
  for (const figure of await page.locator(".gallery-item").all()) {
    await figure.scrollIntoViewIfNeeded();
    await expect(figure.locator(".gallery-media")).toHaveClass(/asset-failed/);
    await expect(figure.locator(".media-pattern")).toBeVisible();
    await expect(figure.locator("img")).toHaveAttribute("alt", /.+/);
    await expect(figure.getByRole("img")).toHaveAccessibleName(/.+/);
    await expect(figure.locator("figcaption")).toBeVisible();
  }
});
