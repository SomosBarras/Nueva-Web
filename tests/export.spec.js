import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const html = readFileSync(
  new URL("../entrega/SomosBarras.html", import.meta.url),
  "utf8",
);

test("el HTML descargable carga fotos, fuentes, scroll y chat sin red ni servidor", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: testInfo.project.use.viewport,
    reducedMotion:
      testInfo.project.name === "reduced-motion" ? "reduce" : "no-preference",
    offline: true,
  });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  const extraFiles = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) externalRequests.push(request.url());
    if (request.url().startsWith("file:")) extraFiles.push(request.url());
  });
  await page.evaluate(() => {
    window.__links = [];
    window.open = (url) => {
      window.__links.push(url);
      return null;
    };
  });
  // The managed cloud browser blocks file: navigation by policy. Execute the
  // exact exported bytes in an offline blank page, without serving any assets.
  // This checks the self-contained payload, not the blocked file: protocol.
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveClass(/js-ready/);
  await expect(page.locator(".wordmark").first()).toHaveClass(/brand-loaded/);
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('600 16px "Inter Tight Variable"') &&
        document.fonts.check('500 16px "Manrope Variable"'),
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".service-diagram use")
      .first()
      .evaluate((element) => element.getBBox().width),
  ).toBeGreaterThan(0);
  for (const image of await page.locator(".gallery-media img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image.locator("..")).toHaveClass(/asset-loaded/);
    expect(
      await image.evaluate((element) => element.naturalWidth),
    ).toBeGreaterThanOrEqual(1365);
    await expect(image).toHaveAttribute("src", /^data:image\/webp;base64,/);
  }
  await page.getByRole("button", { name: "Abrir chat de WhatsApp" }).click();
  await page
    .getByRole("textbox", { name: "Tu mensaje" })
    .fill("Hola, quiero información.");
  await page.getByRole("textbox").press("Enter");
  expect(await page.evaluate(() => window.__links[0])).toBe(
    `https://wa.me/34661667318?text=${encodeURIComponent("Hola, quiero información.")}`,
  );
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  expect(extraFiles).toEqual([]);
  await context.close();
});
