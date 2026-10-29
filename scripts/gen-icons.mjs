// Makes the app icons in public/ from the master 1024px artwork in design/.
import sharp from "sharp";
import fs from "node:fs";

const src = "design/money-ledger-icon.png", phone = "design/money-ledger-iphone.png";
fs.mkdirSync("public", { recursive: true });
const sizes = { "icon-192.png": 192, "icon-512.png": 512 };
for (const [name, size] of Object.entries(sizes)) await sharp(src).resize(size, size).png().toFile("public/" + name);
// iPhone draws its own rounded corners, so it gets the full square
await sharp(phone).resize(180, 180).png().toFile("public/apple-touch-icon.png");
// maskable: the artwork sits inside the safe zone on a solid background
const inner = await sharp(src).resize(384, 384).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1A1B3A" } }).composite([{ input: inner, gravity: "center" }]).png().toFile("public/icon-maskable-512.png");
await sharp(src).resize(48, 48).png().toFile("public/favicon.png");
console.log("icons written to public/");
