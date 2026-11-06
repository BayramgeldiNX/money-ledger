import "./os.js";
import "./platform.js";
import "./styles.css";
import "./app.js";
import { mountAccount } from "./sync/account.js";
import { startLock, mountLockCard } from "./lock.js";
import { mountUpdate } from "./update.js";
import { mountInstall } from "./install.js";

startLock();
mountAccount(document.getElementById("acct-card"));
mountLockCard(document.getElementById("lock-card"));
mountUpdate();
mountInstall();
