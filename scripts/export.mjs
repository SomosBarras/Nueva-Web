import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const output = path.join(root, "entrega");
const mimeTypes = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function localAsset(url) {
  const asset = path.resolve(dist, `.${url}`);
  if (!asset.startsWith(`${dist}${path.sep}`))
    throw new Error(`Invalid asset: ${url}`);
  return readFile(asset);
}

async function dataUrl(url) {
  const type = mimeTypes[path.extname(url)];
  if (!type) throw new Error(`Unknown asset type: ${url}`);
  return `data:${type};base64,${(await localAsset(url)).toString("base64")}`;
}

let html = await readFile(path.join(dist, "index.html"), "utf8");
const scripts = [
  ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
];
const styles = [
  ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g),
];
if (scripts.length !== 1 || styles.length !== 1) {
  throw new Error(
    "Expected one compiled JS bundle and one stylesheet. Recheck the export pipeline.",
  );
}

const javascript = (await localAsset(scripts[0][1])).toString("utf8");
if (/\bimport\s*(?:\(|\.)|(?:^|\n)\s*(?:import|export)\s/m.test(javascript)) {
  throw new Error(
    "The bundle still depends on modules and cannot be opened directly as a file.",
  );
}
let css = (await localAsset(styles[0][1])).toString("utf8");
for (const asset of [...css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g)]) {
  css = css.replace(asset[0], `url("${await dataUrl(asset[1])}")`);
}

html = html.replace(scripts[0][0], "");
html = html.replace(
  styles[0][0],
  `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
);
html = html.replace(
  'href="/favicon.svg"',
  `href="${await dataUrl("/favicon.svg")}"`,
);
for (const image of [
  ...html.matchAll(/<img\b[^>]*\bsrc="(\/[^\"]+)"[^>]*>/g),
]) {
  html = html.replace(
    image[0],
    image[0].replace(`src="${image[1]}"`, `src="${await dataUrl(image[1])}"`),
  );
}

// A local file cannot load an SVG sprite from another file in many browsers.
// Keep the original diagrams as inline symbols in the existing definitions.
const sprite = (await localAsset("/assets/service-diagrams.svg"))
  .toString("utf8")
  .replace(/^\s*<svg\b[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
html = html.replace(
  /(<svg\b[^>]*class="svg-definitions"[^>]*>)([\s\S]*?)(<\/svg>)/,
  (_match, open, symbols, close) => `${open}${symbols}${sprite}${close}`,
);
html = html.replaceAll('href="/assets/service-diagrams.svg#', 'href="#');

// A classic inline script must run after the DOM, unlike the original deferred
// module in the head. Escaping HTML end tags preserves JavaScript strings.
html = html.replace(
  "</body>",
  `<script>${javascript.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`,
);
if (/(?:src|href)="\/(?!\/)|url\(["']?\/assets\//.test(html)) {
  throw new Error("The export still references a local server asset.");
}

await mkdir(output, { recursive: true });
const file = path.join(output, "SomosBarras.html");
const readme = `SOMOS BARRAS — WEB LISTA PARA ABRIR\n\n1. Descarga SomosBarras.html, o extrae el ZIP.\n2. Abre SomosBarras.html (o index.html en el ZIP) con doble clic.\n\nNo necesitas instalar Node, Vite, paquetes ni abrir una terminal.\nEl diseño, las fuentes, los SVG, las animaciones, las seis fotografías y el logotipo originales están dentro del HTML.\nLas fotografías están optimizadas para pantalla, sin cambiar su contenido.\nLa visualización funciona sin conexión a Internet.\nLos enlaces a WhatsApp, correo, empleo y páginas legales requieren sus servicios correspondientes.\n\nPara subirla a un alojamiento estático, puedes renombrar SomosBarras.html a index.html.\n`;
await writeFile(path.join(output, "LEEME.txt"), readme);
const licenses = {};
const licenseText = {};
for (const font of ["inter-tight", "manrope"]) {
  licenses[`SomosBarras/licencias/${font}.txt`] = new Uint8Array(
    await readFile(
      path.join(root, "node_modules", "@fontsource-variable", font, "LICENSE"),
    ),
  );
  licenseText[font] = new TextDecoder().decode(
    licenses[`SomosBarras/licencias/${font}.txt`],
  );
}
html = html.replace(
  "</head>",
  `<script type="application/json" id="font-licenses">${JSON.stringify(licenseText).replaceAll("<", "\\u003c")}</script>\n</head>`,
);
html = html.replace(/^[\t ]+$/gm, '');
await writeFile(file, html);
await writeFile(
  path.join(output, "SomosBarras.zip"),
  zipSync(
    {
      "SomosBarras/index.html": strToU8(html),
      "SomosBarras/LEEME.txt": strToU8(readme),
      ...licenses,
    },
    { level: 6 },
  ),
);
console.log(
  `HTML autónomo: ${file} (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`,
);
