import "./gallery.css";

let galleryCleanup;

/** Enhance the existing photographs without introducing another image source. */
export function initGallery({ getLenis = () => undefined } = {}) {
  if (galleryCleanup) return galleryCleanup;

  const entries = [];
  const removeListeners = [];
  const listen = (element, event, handler) => {
    element.addEventListener(event, handler);
    removeListeners.push(() => element.removeEventListener(event, handler));
  };

  document.querySelectorAll(".gallery-item").forEach((figure) => {
    const media = figure.querySelector(".gallery-media");
    const image = media?.querySelector("img");
    if (!image) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-expand";
    button.setAttribute("aria-label", `Ampliar ${image.alt}`);
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5M4 4l5 5m11-5-5 5M4 20l5-5m11 5-5-5"/></svg>';
    media.append(button);

    const entry = {
      image,
      button,
      title:
        figure.querySelector("figcaption > span")?.textContent.trim() ||
        image.alt,
      failed: image.complete && image.naturalWidth === 0,
    };
    entries.push(entry);

    const updateAvailability = () => {
      entry.failed = image.complete && image.naturalWidth === 0;
      button.disabled = entry.failed || image.naturalWidth === 0;
    };
    updateAvailability();
    listen(image, "load", updateAvailability);
    listen(image, "error", updateAvailability);
  });

  if (!entries.length) return () => {};

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-labelledby", "sb-lightbox-title");
  dialog.setAttribute("aria-describedby", "sb-lightbox-count");
  dialog.innerHTML = `
    <div class="lightbox-shell">
      <div class="lightbox-header">
        <span class="lightbox-eyebrow">Operativa</span>
        <button class="lightbox-close" type="button" aria-label="Cerrar galería" autofocus>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <figure class="lightbox-figure">
        <div class="lightbox-stage"><img class="lightbox-image" alt="" draggable="false" /></div>
        <figcaption class="lightbox-caption">
          <span id="sb-lightbox-title"></span>
          <span id="sb-lightbox-count" aria-live="polite" aria-atomic="true"></span>
        </figcaption>
      </figure>
      <div class="lightbox-navigation" aria-label="Navegación de fotografías">
        <button class="lightbox-previous" type="button" aria-label="Fotografía anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>
          <span>Anterior</span>
        </button>
        <span class="lightbox-keyboard-hint" aria-hidden="true">← &nbsp; →</span>
        <button class="lightbox-next" type="button" aria-label="Fotografía siguiente">
          <span>Siguiente</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
  document.body.append(dialog);

  const closeButton = dialog.querySelector(".lightbox-close");
  const previousButton = dialog.querySelector(".lightbox-previous");
  const nextButton = dialog.querySelector(".lightbox-next");
  const preview = dialog.querySelector(".lightbox-image");
  const title = dialog.querySelector("#sb-lightbox-title");
  const count = dialog.querySelector("#sb-lightbox-count");
  const shell = dialog.querySelector(".lightbox-shell");
  const stage = dialog.querySelector(".lightbox-stage");

  let activeIndex = 0;
  let returnFocus;
  let previousOverflow = "";
  let previousLenisStopped = false;
  let locked = false;

  function show(index) {
    activeIndex = index;
    const entry = entries[index];
    // This is the same source already used by the page. For the standalone
    // export it is the embedded data URI, so browsing stays entirely offline.
    preview.src = entry.image.currentSrc || entry.image.src;
    preview.alt = entry.image.alt;
    title.textContent = entry.title;
    count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(entries.length).padStart(2, "0")}`;
    const available = entries.filter((item) => !item.failed).length;
    previousButton.disabled = available < 2;
    nextButton.disabled = available < 2;
  }

  function move(direction) {
    for (let offset = 1; offset <= entries.length; offset += 1) {
      const index =
        (activeIndex + direction * offset + entries.length) % entries.length;
      if (!entries[index].failed) {
        show(index);
        return;
      }
    }
    dialog.close();
  }

  function open(index) {
    const whatsapp = document.querySelector("#wa-chat");
    if (
      dialog.open ||
      entries[index].button.disabled ||
      (whatsapp && !whatsapp.hidden) ||
      typeof dialog.showModal !== "function"
    )
      return;

    returnFocus = entries[index].button;
    show(index);
    dialog.showModal();
    previousOverflow = document.body.style.overflow;
    previousLenisStopped = Boolean(getLenis()?.isStopped);
    locked = true;
    document.body.style.overflow = "hidden";
    getLenis()?.stop();
    closeButton.focus({ preventScroll: true });
  }

  function restore() {
    if (!locked) return;
    locked = false;
    document.body.style.overflow = previousOverflow;
    if (!previousLenisStopped) getLenis()?.start();
    if (returnFocus?.isConnected && !returnFocus.disabled)
      returnFocus.focus({ preventScroll: true });
  }

  entries.forEach((entry, index) => {
    listen(entry.button, "click", () => open(index));
  });
  listen(closeButton, "click", () => dialog.close());
  listen(previousButton, "click", () => move(-1));
  listen(nextButton, "click", () => move(1));
  listen(dialog, "close", restore);
  listen(dialog, "click", (event) => {
    if ([dialog, shell, stage].includes(event.target)) dialog.close();
  });
  listen(dialog, "keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
    // Escape and focus containment are supplied by the native modal dialog.
  });
  listen(preview, "error", () => {
    if (!dialog.open) return;
    entries[activeIndex].failed = true;
    entries[activeIndex].button.disabled = true;
    move(1);
  });

  galleryCleanup = () => {
    if (dialog.open) dialog.close();
    restore();
    removeListeners.forEach((remove) => remove());
    entries.forEach((entry) => entry.button.remove());
    dialog.remove();
    galleryCleanup = undefined;
  };
  return galleryCleanup;
}
