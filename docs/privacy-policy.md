# Privacy Policy

**Extension:** Salesforce Field Inspector
**Last updated:** March 2026

---

## Overview

Salesforce Field Inspector is a Chrome/Edge extension that displays field schema metadata in a tooltip when you hover over fields on Salesforce Lightning record pages. This policy describes exactly what data the extension accesses, how it is used, and what it does not do.

---

## Data We Access

### Salesforce Session Cookie (`sid`)
The extension reads the `sid` session cookie from your Salesforce org. This is used solely as a Bearer token to authenticate calls to your own Salesforce org's REST and Tooling APIs. The session ID is:
- Held in memory for the lifetime of the current page only
- Never written to disk, `localStorage`, or any persistent storage
- Never transmitted to any server other than your own Salesforce org
- Discarded automatically when you navigate away or close the tab

### Field Schema Metadata
The extension fetches field metadata from two Salesforce APIs on your own org:
- **REST API** — `/services/data/v{ver}/sobjects/{Object}/describe` — returns field definitions (API name, label, type, formula, picklist values, etc.)
- **Tooling API** — `EntityParticle` query — returns whether field history tracking is enabled

This metadata is:
- Schema-level only — **no record data, no user data, no personal information is ever read**
- Cached in memory for 5 minutes to reduce API calls on repeated hovers
- Discarded when you navigate away or close the tab

---

## Data We Do Not Access

- **No record data** — the extension never reads field values from your Salesforce records
- **No personal information** — no names, emails, user IDs, or profile data
- **No browsing history** — the extension is scoped to Salesforce Lightning record pages only
- **No keystrokes or clipboard reads** — clipboard access is write-only (Copy API Name button)

---

## Local Data Only

All data processed by this extension stays entirely on your device:

- **No external servers** — the extension makes no calls to any server other than your own Salesforce org
- **No third-party services** — no analytics, no telemetry, no crash reporting, no advertising networks
- **No data sharing** — your data is never shared with, sold to, or transmitted to any third party for any purpose
- **No legal disclosures** — no personal data is collected, so none can be shared for legal or compliance purposes

---

## Permissions Explained

| Permission | Why it is needed |
|---|---|
| `cookies` | Reads the `sid` session cookie (even when HttpOnly) to authenticate REST API calls to your Salesforce org |
| `clipboardWrite` | Powers the **Copy API Name** button — write-only, the extension never reads your clipboard |
| `management` | Detects whether Salesforce Inspector Advanced or Salesforce Inspector Reloaded is installed, to enable the **Check FLS ↗** button |
| Host access to `*.salesforce.com`, `*.lightning.force.com`, `*.force.com` | Required to inject the content script on Salesforce pages and to call the Salesforce REST/Tooling APIs |

---

## Privacy by Design

The extension is built with minimal data use as a core principle:

- Requests only the permissions strictly necessary to function
- All caches are in-memory and scoped to the current page session
- Input values embedded in API queries are validated against a strict allowlist before use
- All user-controlled values rendered in the tooltip are HTML-escaped to prevent injection
- No data persists beyond the current browser tab

---

## Changes to This Policy

If this policy is updated, the **Last updated** date at the top of this page will be revised. Continued use of the extension after changes constitutes acceptance of the updated policy.

---

## Contact

For questions or concerns about this privacy policy, open an issue on the [GitHub repository](https://github.com/amrit-suman/Salesforce-Field-Inspector/issues).
