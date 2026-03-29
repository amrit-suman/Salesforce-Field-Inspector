/**
 * Salesforce Field Inspector — background.js (service worker)
 *
 * Reads the Salesforce `sid` session cookie for the content script.
 * Uses chrome.cookies API so it works even when the cookie is HttpOnly.
 */

const SF_DOMAIN_RE = /^https:\/\/[a-zA-Z0-9-]+\.(my\.salesforce\.com|lightning\.force\.com|salesforce\.com|force\.com)$/;

// Salesforce Inspector extension IDs (Chrome Web Store)
const SF_INSPECTOR_ADVANCED_ID = 'dbfimaflmomgldabcphgolbeoamjogji';
const SF_INSPECTOR_RELOADED_ID = 'hpijlohoihegkfehhibggnkbjhoemldh';

function isSalesforceDomain(url) {
  try { return SF_DOMAIN_RE.test(new URL(url).origin); }
  catch { return false; }
}

// Uses chrome.management.get — the only reliable way to check if an extension
// is installed. Returns true only if installed AND enabled.
function isExtInstalled(extId) {
  return new Promise((resolve) => {
    chrome.management.get(extId, (info) => {
      if (chrome.runtime.lastError || !info) { resolve(false); return; }
      resolve(info.enabled === true);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SF_FI_RESOLVE_INSPECTOR') {
    if (sender.id !== chrome.runtime.id) { sendResponse({ extId: null }); return true; }
    Promise.all([
      isExtInstalled(SF_INSPECTOR_ADVANCED_ID),
      isExtInstalled(SF_INSPECTOR_RELOADED_ID),
    ]).then(([hasAdvanced, hasReloaded]) => {
      // Prefer Advanced; fall back to Reloaded; null if neither detected
      const extId = hasAdvanced ? SF_INSPECTOR_ADVANCED_ID
                  : hasReloaded ? SF_INSPECTOR_RELOADED_ID
                  : null;
      sendResponse({ extId });
    });
    return true; // keep channel open for async response
  }

  if (message.type !== 'SF_FI_GET_SID') return;

  // Only accept messages from our own extension (content scripts / popup)
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ sid: null });
    return true;
  }

  // Require instanceUrl to be a non-empty string before URL parsing
  if (typeof message.instanceUrl !== 'string' || !message.instanceUrl) {
    sendResponse({ sid: null });
    return true;
  }

  if (!isSalesforceDomain(message.instanceUrl)) {
    sendResponse({ sid: null });
    return true;
  }

  chrome.cookies.get({ url: message.instanceUrl, name: 'sid' }, (cookie) => {
    sendResponse({ sid: chrome.runtime.lastError ? null : (cookie?.value ?? null) });
  });
  return true;
});
