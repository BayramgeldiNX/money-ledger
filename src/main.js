import "./platform.js";
import "./styles.css";
import "./app.js";
import { mountAccount } from "./sync/account.js";

import { mountUpdate } from "./update.js";

mountAccount(document.getElementById("acct-card"));
mountUpdate();
