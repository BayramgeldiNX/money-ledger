import { osOf } from "./lib/lock.js";
// lets CSS aim at one phone family: [data-os="android"] / [data-os="ios"]
document.documentElement.dataset.os = osOf(navigator);
