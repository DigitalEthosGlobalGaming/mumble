import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The standalone page must not reference anything external, so drop the Google Fonts links
// (styles.css already has system-font fallbacks).
const dropExternalFonts = (): Plugin => ({
  name: "drop-external-fonts",
  transformIndexHtml: html => html.replace(/<link[^>]*(fonts\.googleapis|fonts\.gstatic)[^>]*>\s*/g, ""),
});

// `vite build`                -> dist/ (separate JS/CSS files, needs a web server or file access)
// `vite build --mode single`  -> dist-single/index.html (all JS and CSS inlined, just open it)
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    plugins: single ? [dropExternalFonts(), viteSingleFile()] : [],
    build: { outDir: single ? "dist-single" : "dist", emptyOutDir: true },
  };
});
