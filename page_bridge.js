/**
 * Salesforce Field Inspector — page_bridge.js
 *
 * Runs in the PAGE (MAIN) world to access Salesforce JS globals
 * (window.$A, window.sforce) which are not accessible from the isolated content script.
 * Communicates with content.js via CustomEvents on window.
 * The nonce echoed in the response prevents spoofed replies from page scripts.
 */
(function () {
  function readSidFromPage() {
    try {
      if (window.$A && typeof window.$A.getContext === 'function') {
        const sid = window.$A.getContext().sessionId;
        if (sid) return sid;
      }
    } catch (_) {}

    try {
      if (window.sforce?.connection?.sessionId)
        return window.sforce.connection.sessionId;
    } catch (_) {}

    try {
      if (window.UserContext?.sessionId)
        return window.UserContext.sessionId;
    } catch (_) {}

    return null;
  }

  window.addEventListener('sf-fi-get-sid', (e) => {
    window.dispatchEvent(new CustomEvent('sf-fi-sid-response', {
      detail: { sid: readSidFromPage(), nonce: e.detail?.nonce ?? null }
    }));
  });
})();
