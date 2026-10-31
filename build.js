// Builds public/index.html: one self-contained page with the free chart code inlined.
// The forecast module (shared/forecast.js) is deliberately NOT included; it runs on the server only.
const fs = require("fs");
const path = require("path");
const read = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const libs = ["shared/cities.js", "shared/engine.js", "shared/interp.js"].map(read).join("\n");
let page = read("src/template.html").replace("/*__LIBS__*/", () => libs).replace("/*__APP__*/", () => read("src/app.js"));
// serve the astronomy library from our own site instead of a CDN
page = page.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/astronomy-engine@[^"]+"><\/script>/, '<script src="/vendor/astronomy.browser.min.js"></script>');
// everything before the page wrapper (title, meta, fonts, styles) belongs in <head>
const cut = page.indexOf('<div class="wrap">');
const headExtra = page.slice(0, cut), body = page.slice(cut);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Your birth chart read as a manual of the self, with a dated forecast of the sky weather moving through it.">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}</style>
${headExtra}
</head>
<body>
${body}
</body>
</html>
`;
fs.mkdirSync(path.join(__dirname, "public"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "public/index.html"), html);
fs.mkdirSync(path.join(__dirname, "public/vendor"), { recursive: true });
fs.copyFileSync(path.join(__dirname, "node_modules/astronomy-engine/astronomy.browser.min.js"), path.join(__dirname, "public/vendor/astronomy.browser.min.js"));
if (!html.includes("/vendor/astronomy.browser.min.js")) throw new Error("astronomy script tag not replaced");
if (/transitCalendar|skyEvents/.test(html)) throw new Error("forecast code leaked into the public page");
console.log(`built public/index.html (${(html.length / 1024).toFixed(0)} KB)`);
