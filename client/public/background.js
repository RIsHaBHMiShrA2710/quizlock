/// <reference types="chrome"/>

// ─── QuizLock Background Service Worker ───

console.log('[QuizLock BG] Service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[QuizLock BG] Extension installed/updated');
  chrome.storage.local.get(['blockedSites', 'quizCooldowns', 'unlockedSites'], (result) => {
    console.log('[QuizLock BG] Current storage state:', JSON.stringify(result));
    if (!result.blockedSites) chrome.storage.local.set({ blockedSites: [] });
    if (!result.quizCooldowns) chrome.storage.local.set({ quizCooldowns: {} });
    if (!result.unlockedSites) chrome.storage.local.set({ unlockedSites: {} });
  });
});

// Intercept Navigation to Blocked Sites
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  // Skip chrome:// and extension pages
  if (details.url.startsWith('chrome') || details.url.startsWith('about')) return;

  try {
    const url = new URL(details.url);
    const domain = url.hostname.replace(/^www\./, '');

    console.log(`[QuizLock BG] Navigation detected: ${domain} (full: ${details.url})`);

    const result = await chrome.storage.local.get(['blockedSites', 'unlockedSites']);
    const blockedSites = result.blockedSites || [];
    const unlockedSites = result.unlockedSites || {};

    console.log(`[QuizLock BG] Blocked sites list:`, blockedSites);
    console.log(`[QuizLock BG] Is "${domain}" in blocked list?`, blockedSites.includes(domain));

    if (blockedSites.includes(domain)) {
      const unlockData = unlockedSites[domain];
      const now = Date.now();

      if (unlockData && now < unlockData.expiresAt) {
        const remaining = Math.round((unlockData.expiresAt - now) / 1000);
        console.log(`[QuizLock BG] ✅ ALLOWED: ${domain} unlocked for ${remaining}s more`);
      } else {
        console.log(`[QuizLock BG] 🚫 BLOCKED: ${domain} → Redirecting to quiz`);
        const extUrl = chrome.runtime.getURL(`index.html#/quiz?target=${encodeURIComponent(domain)}`);
        console.log(`[QuizLock BG] Redirect URL: ${extUrl}`);
        chrome.tabs.update(details.tabId, { url: extUrl });
      }
    } else {
      console.log(`[QuizLock BG] ⏭ SKIPPED: ${domain} is not blocked`);
    }
  } catch (err) {
    console.error('[QuizLock BG] Error in navigation handler:', err);
  }
}, { url: [{ urlMatches: 'http://*/*' }, { urlMatches: 'https://*/*' }] });

// Log storage changes for debugging
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`[QuizLock BG] Storage "${namespace}" changed — key: "${key}"`, { old: oldValue, new: newValue });
  }
});
