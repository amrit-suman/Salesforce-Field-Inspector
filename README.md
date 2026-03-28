# SF Field Inspector

A Chrome extension that shows complete field metadata in a tooltip when you hover over any field on a Salesforce Lightning record page — no Setup navigation required.

---

## What it does

Hover over any field label or value on a record page and a tooltip appears showing:

| Property                               | Details                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| **API Name**                           | Highlighted in blue — click **Copy API Name** to copy              |
| **Label**                              | Display label as shown in the UI                                   |
| **Type**                               | Human-readable type (Text, Lookup, Formula (Text), Picklist, etc.) |
| **Lookup / Master-Detail**             | Referenced object, relationship name, cascade delete flag          |
| **Formula**                            | Full formula body in a scrollable code block                       |
| **Picklist values**                    | Up to 8 active values shown inline                                 |
| **Currency / Number**                  | Precision (total digits) and decimal places                        |
| **Text**                               | Maximum character length                                           |
| **Required / Updateable / Createable** | Field-level access flags                                           |
| **Unique / External ID / Encrypted**   | Special field flags                                                |
| **Default Value**                      | Configured default if present                                      |
| **History Tracked**                    | Whether field history tracking is enabled (Yes / No)               |

---

## Installation

### From source (developer mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the `SF Field Inspector` folder
6. Navigate to any Salesforce Lightning record page — the extension activates automatically

### Requirements

- Google Chrome (or any Chromium-based browser)
- A Salesforce org with Lightning Experience enabled
- Pages must match the pattern `/lightning/r/*/view` (standard record pages)

---

## How to use

1. Open any Salesforce record page (e.g. an Account, Contact, Opportunity)
2. Hover over a **field label** or **field value** for ~0.4 seconds
3. The metadata tooltip appears — move your mouse into the tooltip to keep it open
4. Click **Copy API Name** to copy the field's API name to your clipboard
5. Click **Check FLS ↗** to open the field's profile/permission set access in [Salesforce Inspector Reloaded](#fls--salesforce-inspector-reloaded)
6. Click **✕** or click anywhere outside the tooltip to dismiss it

---

## FLS — Salesforce Inspector Reloaded

The **Check FLS ↗** button opens [Salesforce Inspector Reloaded](https://chrome.google.com/webstore/detail/salesforce-inspector-relo/hpijlohoihegkfehhibggnkbjhoemldh) with the following SOQL pre-filled in the Data Export tab:

```sql
SELECT Parent.Label, Parent.Profile.Name, Parent.IsOwnedByProfile, PermissionsRead, PermissionsEdit
FROM FieldPermissions
WHERE SobjectType = 'Account'
  AND Field = 'Account.Industry'
ORDER BY Parent.IsOwnedByProfile DESC, Parent.Profile.Name
```

`Parent.IsOwnedByProfile` is the flag to distinguish record types:

- `true` — the row is a **Profile**
- `false` — the row is a **Permission Set** or Permission Set Group

Salesforce Inspector Reloaded must be installed separately for this button to work. If it is not installed the button opens a blank tab.

---

## Supported field types

All standard and custom field types are supported, including:

Text · Text Area · Checkbox · Number · Currency · Percent · Date · Date/Time · Time · Email · Phone · URL · Picklist · Multi-Select Picklist · Lookup · Master-Detail · Formula · Auto Number · Record ID · Geolocation · Encrypted Text · File (Base64)

---

## Permissions

| Permission                                                                | Why it is needed                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `cookies`                                                                 | Reads the `sid` session cookie (even when HttpOnly) to authenticate REST API calls |
| `clipboardWrite`                                                          | Powers the **Copy API Name** button                                                |
| Host access to `*.salesforce.com`, `*.lightning.force.com`, `*.force.com` | Required to inject the content script and call the Salesforce REST/Tooling APIs    |

No data ever leaves your browser to any third-party server. All API calls go directly to your own Salesforce org.

---

## How the session ID is obtained

The extension tries four strategies in order and stops at the first that succeeds:

1. **`window.$A.getContext().sessionId`** — reads the session Lightning is actively using (most reliable)
2. **`my.salesforce.com` cookie** — background service worker reads the HttpOnly `sid` cookie
3. **`lightning.force.com` cookie** — fallback when the `my.salesforce.com` session is stale
4. **`document.cookie`** — direct read (only works if `sid` is not HttpOnly)

On a 401 response the session cache is cleared and all four strategies are retried once automatically.

---

## APIs used

| API                    | Endpoint                                                                    | Purpose                                    |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| Salesforce REST API    | `GET /services/data/`                                                       | Resolve the latest API version             |
| Salesforce REST API    | `GET /services/data/v{ver}/sobjects/{Object}/describe`                      | Fetch all field metadata for the object    |
| Salesforce Tooling API | `GET /services/data/v{ver}/tooling/query/?q=SELECT ... FROM EntityParticle` | Check if field history tracking is enabled |

All results are cached in memory for 5 minutes so repeated hovers on the same object do not generate additional API calls.

---

## File structure

```
SF Field Inspector/
├── manifest.json       # Chrome extension manifest (MV3)
├── content.js          # Main logic — shadow DOM traversal, tooltip, API calls
├── page_bridge.js      # Runs in MAIN world to access window.$A / window.sforce
├── background.js       # Service worker — reads HttpOnly sid cookie
├── styles.css          # Tooltip styles (scoped to #sf-fi-tooltip)
└── popup.html          # Extension popup (toolbar icon click)
```

---

## Troubleshooting

**Tooltip does not appear**

- Confirm you are on a `/lightning/r/` record page, not a list view or Setup page
- Try reloading the Salesforce page after installing the extension

**"Session expired" error**

- Click **↺ Reload Page** in the tooltip, or manually refresh the Salesforce page
- Salesforce sessions expire after the configured idle timeout (default 2 hours)

**"Field not found" error**

- The field may be a compound field (Address, Name) or an internal system field not returned by the describe API
- Hover directly over an individual sub-field (e.g. Street, City) rather than the compound wrapper

**"Check FLS ↗" opens a blank tab**

- Install [Salesforce Inspector Reloaded](https://chrome.google.com/webstore/detail/salesforce-inspector-relo/hpijlohoihegkfehhibggnkbjhoemldh) from the Chrome Web Store
