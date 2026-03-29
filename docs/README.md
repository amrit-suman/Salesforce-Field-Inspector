# Salesforce Field Inspector

> Hover over any field on a Salesforce Lightning record page to instantly see its API name, type, formula, picklist values, history tracking, and more — no Setup navigation required.

Built to complement **Salesforce Inspector Advanced** and **Salesforce Inspector Reloaded**. Use this extension to identify a field on the page, then hand off to Salesforce Inspector for deeper data or FLS analysis via the built-in **Check FLS ↗** button.

---

## What it shows

| Property | Details |
|---|---|
| **API Name** | Highlighted — click **Copy API Name** to copy |
| **Label** | Display label as shown in the UI |
| **Type** | Human-readable type (Text, Lookup, Formula, Picklist, etc.) |
| **Lookup / Master-Detail** | Referenced object, relationship name, cascade delete flag |
| **Formula** | Full formula body in a scrollable code block |
| **Picklist values** | Up to 8 active values; click **+N more** to open all in Setup |
| **Currency / Number** | Precision and decimal places |
| **Text** | Maximum character length |
| **Required / Updateable / Createable** | Field-level access flags |
| **Unique / External ID / Encrypted** | Special field flags |
| **Default Value** | Configured default if present |
| **History Tracked** | Whether field history tracking is enabled |

---

## How to use

1. Open any Salesforce Lightning record page
2. Hover over a **field label** or **field value** for ~0.8 seconds
3. The metadata tooltip appears — move your mouse into it to keep it open
4. Click **Copy API Name** to copy the field's API name
5. Click **Check FLS ↗** to open FLS analysis in Salesforce Inspector
6. Click **✕** or anywhere outside to dismiss

---

## Requirements

- Google Chrome or Microsoft Edge
- Salesforce Lightning Experience (record pages matching `/lightning/r/*/view`)
- API Enabled permission on your Salesforce user profile

---

## Source

View the full source code on [GitHub](https://github.com/amrit-suman/Salesforce-Field-Inspector).

> 🔒 [Privacy Policy](#privacy-policy)

---

## Privacy Policy

**Last updated:** March 2026

### Overview

Salesforce Field Inspector displays field schema metadata in a tooltip when you hover over fields on Salesforce Lightning record pages. This policy describes exactly what data the extension accesses, how it is used, and what it does not do.

### Data We Access

**Salesforce Session Cookie (`sid`)**

The extension reads the `sid` session cookie from your Salesforce org, used solely as a Bearer token to authenticate calls to your own Salesforce org's REST and Tooling APIs. The session ID is:
- Held in memory for the lifetime of the current page only
- Never written to disk, `localStorage`, or any persistent storage
- Never transmitted to any server other than your own Salesforce org
- Discarded automatically when you navigate away or close the tab

**Field Schema Metadata**

The extension fetches field metadata from two Salesforce APIs on your own org:
- **REST API** — returns field definitions (API name, label, type, formula, picklist values, etc.)
- **Tooling API** — returns whether field history tracking is enabled

This metadata is schema-level only — **no record data, no user data, and no personal information is ever read**. It is cached in memory for 5 minutes and discarded when you navigate away or close the tab.

### Data We Do Not Access

- **No record data** — the extension never reads field values from your Salesforce records
- **No personal information** — no names, emails, user IDs, or profile data
- **No browsing history** — scoped to Salesforce Lightning record pages only
- **No clipboard reads** — clipboard access is write-only (Copy API Name button only)

### Local Data Only

| Principle | Detail |
|---|---|
| **Local data only** | All data stays on your device. Nothing is sent to any external server. |
| **No third-party sharing** | Data is never shared with, sold to, or transmitted to any third party. |
| **No data collection** | No personal or record data is collected, stored, or used. |
| **No legal disclosures** | No personal data is collected, so none can be shared for legal purposes. |
| **Privacy by design** | Only the minimum permissions needed to function are requested. |

### Permissions Explained

| Permission | Why it is needed |
|---|---|
| `cookies` | Reads the `sid` session cookie to authenticate REST API calls to your Salesforce org |
| `clipboardWrite` | Powers the **Copy API Name** button — write-only, the extension never reads your clipboard |
| `management` | Detects whether Salesforce Inspector is installed to enable the **Check FLS ↗** button |
| Host access to `*.salesforce.com`, `*.lightning.force.com`, `*.force.com` | Required to inject the content script and call the Salesforce REST/Tooling APIs |

### Contact

For questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/amrit-suman/Salesforce-Field-Inspector/issues).
