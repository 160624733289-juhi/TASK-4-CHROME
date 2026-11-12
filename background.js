// MindTrace background service worker (Manifest V3).
// Tracks domain-level time only. It does not read page content or browsing history.
const DEFAULTS = {
  dailyGoalMinutes: 120,
  productiveDomains: ["github.com", "stackoverflow.com", "developer.mozilla.org", "w3schools.com", "docs.google.com"],
  distractingDomains: ["instagram.com", "facebook.com", "tiktok.com", "x.com", "twitter.com", "reddit.com"],
  backendUrl: "http://localhost:3000"
};

let activeTabId = null;
let activeDomain = null;
let activeStartedAt = Date.now();
let windowFocused = true;

const todayKey = () => new Date().toLocaleDateString("en-CA");
const hourKey = () => String(new Date().getHours()).padStart(2, "0");

async function getSettings() {
  const saved = await chrome.storage.local.get("settings");
  return { ...DEFAULTS, ...(saved.settings || {}) };
}
async function getToday() {
  const key = todayKey();
  const data = await chrome.storage.local.get(key);
  return data[key] || {
    date: key, totalSeconds: 0, productiveSeconds: 0, distractingSeconds: 0,
    neutralSeconds: 0, switches: 0, domains: {}, hourly: {}, sessions: 0
  };
}
async function saveToday(stats) {
  await chrome.storage.local.set({ [todayKey()]: stats });
}
function getDomain(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch { return null; }
}
function categoryFor(domain, settings) {
  if (!domain) return "neutral";
  if (settings.productiveDomains.some(d => domain === d || domain.endsWith("." + d))) return "productive";
  if (settings.distractingDomains.some(d => domain === d || domain.endsWith("." + d))) return "distracting";
  return "neutral";
}
async function recordElapsed() {
  if (!activeDomain || !windowFocused) return;
  const now = Date.now();
  const seconds = Math.max(0, Math.min(3600, Math.floor((now - activeStartedAt) / 1000)));
  activeStartedAt = now;
  if (!seconds) return;

  const settings = await getSettings();
  const stats = await getToday();
  const category = categoryFor(activeDomain, settings);
  stats.totalSeconds += seconds;
  stats[category + "Seconds"] += seconds;
  stats.domains[activeDomain] = (stats.domains[activeDomain] || 0) + seconds;
  stats.hourly[hourKey()] = (stats.hourly[hourKey()] || 0) + seconds;
  await saveToday(stats);
}
async function syncBackend() {
  const settings = await getSettings();
  if (!settings.backendUrl) return;
  const stats = await getToday();
  try {
    await fetch(`${settings.backendUrl.replace(/\/$/, "")}/api/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stats)
    });
  } catch (error) {
    // Local tracking continues even if the optional backend is not running.
  }
}
async function changeActiveTab(tabId, url) {
  await recordElapsed();
  const domain = getDomain(url);
  if (activeDomain && domain && activeDomain !== domain) {
    const stats = await getToday();
    stats.switches += 1;
    await saveToday(stats);
    await checkFocusDistraction(domain);
  }
  activeTabId = tabId;
  activeDomain = domain;
  activeStartedAt = Date.now();
  await syncBackend();
}
async function checkFocusDistraction(newDomain) {
  const data = await chrome.storage.local.get("focusSession");
  const session = data.focusSession;
  if (!session || !session.active) return;
  if (newDomain !== session.startedOn) {
    chrome.notifications.create("mindtrace-focus-" + Date.now(), {
      type: "basic",
      iconUrl: "notification.png",
      title: "MindTrace focus reminder",
      message: `You switched away from ${session.startedOn}. Ready to return to your focus?`,
      priority: 1
    }).catch(() => {});
  }
}
async function refreshActiveTab() {
  if (!windowFocused) return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) await changeActiveTab(tab.id, tab.url);
}
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await changeActiveTab(tabId, tab.url);
  } catch {}
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) await changeActiveTab(tabId, changeInfo.url);
});
chrome.windows.onFocusChanged.addListener(async windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await recordElapsed();
    windowFocused = false;
    activeDomain = null;
    activeTabId = null;
  } else {
    windowFocused = true;
    await refreshActiveTab();
  }
});
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === "mindtrace-minute") {
    await recordElapsed();
    await syncBackend();
  }
  if (alarm.name === "mindtrace-focus-end") {
    await chrome.storage.local.set({ focusSession: { active: false } });
    chrome.notifications.create("mindtrace-focus-done-" + Date.now(), {
      type: "basic", iconUrl: "notification.png",
      title: "Focus session complete!", message: "You completed your 25-minute focus challenge. Take a short break!"
    }).catch(() => {});
  }
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_STATS") {
      await recordElapsed();
      const stats = await getToday();
      const settings = await getSettings();
      const focus = (await chrome.storage.local.get("focusSession")).focusSession || { active: false };
      const productiveMinutes = Math.round(stats.productiveSeconds / 60);
      const totalMinutes = Math.round(stats.totalSeconds / 60);
      const score = stats.totalSeconds ? Math.max(0, Math.min(100, Math.round(
        (stats.productiveSeconds / stats.totalSeconds) * 70 +
        (1 - Math.min(stats.switches / Math.max(1, stats.totalSeconds / 60), 1)) * 30
      ))) : 0;
      sendResponse({ stats, settings, focus, score, productiveMinutes, totalMinutes });
    } else if (message.type === "START_FOCUS") {
      await recordElapsed();
      const session = { active: true, startedAt: Date.now(), startedOn: activeDomain || "your current task" };
      await chrome.storage.local.set({ focusSession: session });
      await chrome.alarms.create("mindtrace-focus-end", { delayInMinutes: 25 });
      const stats = await getToday(); stats.sessions += 1; await saveToday(stats);
      sendResponse({ ok: true, session });
    } else if (message.type === "STOP_FOCUS") {
      await chrome.alarms.clear("mindtrace-focus-end");
      await chrome.storage.local.set({ focusSession: { active: false } });
      sendResponse({ ok: true });
    } else if (message.type === "SAVE_SETTINGS") {
      await chrome.storage.local.set({ settings: message.settings });
      sendResponse({ ok: true });
    } else if (message.type === "GET_SETTINGS") {
      sendResponse(await getSettings());
    }
  })().catch(error => sendResponse({ error: error.message }));
  return true;
});
chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get("settings");
  if (!saved.settings) await chrome.storage.local.set({ settings: DEFAULTS });
  chrome.alarms.create("mindtrace-minute", { periodInMinutes: 1 });
  await refreshActiveTab();
});
chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create("mindtrace-minute", { periodInMinutes: 1 });
  await refreshActiveTab();
});
