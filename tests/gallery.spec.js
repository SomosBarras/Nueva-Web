import { test, expect } from "@playwright/test";

async function firstPhotograph(page) {
  const figure = page.locator(".gallery-item").first();
  await figure.locator(".gallery-media").scrollIntoViewIfNeeded();
  const button = figure.getByRole("button", { name: /^Ampliar / });
  await expect(button).toBeEnabled();
  return { figure, button };
}

test("la galería amplía las fotos completas y funciona con teclado", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const { figure, button } = await firstPhotograph(page);
  const originalSource = await figure
    .locator("img")
    .evaluate((image) => image.currentSrc || image.src);
  const originalOverflow = await page
    .locator("body")
    .evaluate((body) => body.style.overflow);
  await button.click();

  const dialog = page.locator("dialog.lightbox");
  const preview = dialog.locator(".lightbox-image");
  const close = dialog.getByRole("button", { name: "Cerrar galería" });
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(preview).toHaveAttribute("src", originalSource);
  await expect(preview).toHaveCSS("object-fit", "contain");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(dialog.locator("#sb-lightbox-count")).toHaveText("01 / 06");

  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("#sb-lightbox-count")).toHaveText("02 / 06");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("#sb-lightbox-count")).toHaveText("01 / 06");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("#sb-lightbox-count")).toHaveText("06 / 06");
  await dialog.getByRole("button", { name: "Fotografía siguiente" }).click();
  await expect(dialog.locator("#sb-lightbox-count")).toHaveText("01 / 06");

  // A portrait must also retain its complete original aspect ratio.
  await dialog.getByRole("button", { name: "Fotografía siguiente" }).click();
  await dialog.getByRole("button", { name: "Fotografía siguiente" }).click();
  await expect
    .poll(() => preview.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  const ratios = await preview.evaluate((image) => {
    const box = image.getBoundingClientRect();
    return {
      actual: box.width / box.height,
      original: image.naturalWidth / image.naturalHeight,
    };
  });
  expect(ratios.actual).toBeCloseTo(ratios.original, 2);
  await preview.click();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(
    await page.locator("body").evaluate((body) => body.style.overflow),
  ).toBe(originalOverflow);

  await button.click();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await dialog.click({ position: { x: 3, y: 3 } });
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(errors).toEqual([]);
});

test("la galería no se abre sobre el chat de WhatsApp", async ({ page }) => {
  await page.goto("/");
  const { button } = await firstPhotograph(page);
  await page.getByRole("button", { name: "Abrir chat de WhatsApp" }).click();
  await expect(page.locator("#wa-chat")).toBeVisible();
  // Outside controls are inert to the user. The handler also rejects a
  // programmatic event, so the two modal experiences cannot overlap.
  await button.dispatchEvent("click");
  await expect(page.locator("dialog.lightbox")).toBeHidden();
  await expect(page.locator("#wa-chat")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("una fotografía fallida no ofrece ampliación", async ({ page }) => {
  await page.route("**/assets/photos/ENF3556.webp", (route) => route.abort());
  await page.goto("/");
  const figure = page.locator(".gallery-item").first();
  await figure.locator(".gallery-media").scrollIntoViewIfNeeded();
  await expect(figure.locator(".gallery-media")).toHaveClass(/asset-failed/);
  await expect(figure.locator(".gallery-expand")).toBeDisabled();
  await expect(figure.locator(".gallery-expand")).toBeHidden();
  await expect(page.locator("dialog.lightbox")).toBeHidden();
});
