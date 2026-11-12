import { osOf } from "./lib/os.js";
import "./platform.js";
import "./styles.css";
import "./app.js";
import { mountAccount } from "./sync/account.js";
import { startLock, mountLockCard } from "./lock.js";
import { mountUpdate } from "./update.js";
import { mountInstall } from "./install.js";
import { applyModeIcon, rememberedMode } from "./mode-icon.js";

// lets CSS aim at one phone family: [data-os="android"] / [data-os="ios"]
document.documentElement.dataset.os = osOf(navigator);
applyModeIcon(rememberedMode());
startLock();
mountAccount(document.getElementById("acct-card"));
mountLockCard(document.getElementById("lock-card"));
mountUpdate();
mountInstall();
