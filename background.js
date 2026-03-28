/**
 * SF Field Inspector — background.js (service worker)
 *
 * Reads the Salesforce `sid` session cookie for the content script.
 * Uses chrome.cookies API so it works even when the cookie is HttpOnly.
 */

const SF_DOMAIN_RE = /^https:\/\/[a-zA-Z0-9-]+\.(my\.salesforce\.com|lightning\.force\.com|salesforce\.com|force\.com)$/;

function isSalesforceDomain(url) {
  try { return SF_DOMAIN_RE.test(new URL(url).origin); }
  catch { return false; }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
