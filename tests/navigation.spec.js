import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("los accesos de servicios llevan al servicio seleccionado", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Ir a Auditoría de Stock" }).click();
  await expect(page.locator("#service-current")).toHaveText("03");
  await expect(page.locator(".service-card").nth(2)).toBeInViewport({
    ratio: 0.8,
  });
  await expect(
    page.getByRole("button", { name: "Ir a Auditoría de Stock" }),
  ).toHaveAttribute("aria-current", "step");
});

test("la navegación por capítulos alcanza operativa y contacto con el encabezado visible", async ({
  page,
}) => {
  const mobile = (page.viewportSize()?.width || 1440) <= 900;
  const nav = page.locator(mobile ? ".mobile-nav" : ".header-nav");
  await nav.locator('a[href="#operativa"]').click();
  await expect(page.locator("#operations-title")).toBeInViewport();
  await expect(nav.locator('a[href="#operativa"]')).toHaveAttribute(
    "aria-current",
    "location",
  );
  await page.locator(".nav-contact").click();
  await expect(page.locator("#contact-title")).toBeInViewport();
  expect(
    await page
      .locator("#contact-title")
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBeGreaterThan(90);
});

test("la portada mantiene el mensaje y el contacto tras pausar y cambiar de tamaño", async ({
  page,
}) => {
  const toggle = page.locator(".motion-toggle");
  if ((await toggle.getAttribute("aria-pressed")) === "false")
    await toggle.click();
  for (const [width, height] of [
    [320, 780],
    [390, 844],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("#hero-title")).toBeInViewport();
    await expect(page.locator(".hero-bottom .round-link")).toBeInViewport({
      ratio: 0.9,
    });
    await expect(page.locator(".hero-topline")).toBeVisible();
    await expect(page.locator(".hero-photo")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});

test("pausar y reanudar mantiene la sección que se está leyendo", async ({
  page,
}) => {
  await page.evaluate(() => {
    const section = document.getElementById("operativa");
    window.scrollTo(0, section.getBoundingClientRect().top + scrollY - 132);
  });
  await expect(page.locator("#operations-title")).toBeInViewport();
  await page.locator(".motion-toggle").click();
  await expect(page.locator("#operations-title")).toBeInViewport();
  await page.locator(".motion-toggle").click();
  await expect(page.locator("#operations-title")).toBeInViewport();
});
