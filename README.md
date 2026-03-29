# Salesforce Field Inspector

A Chrome extension that brings instant field metadata to your fingertips on any Salesforce Lightning record page — built to complement **Salesforce Inspector Advanced** and **Salesforce Inspector Reloaded**.

While Salesforce Inspector excels at data export, SOQL querying, and org-wide inspection, **Salesforce Field Inspector fills the gap on record pages**: hover over any field and instantly see its API name, type, formula, picklist values, history tracking, and more — without leaving the page or opening Setup.

The two extensions work best together. Use this extension to identify the field, then hand off to Salesforce Inspector for deeper data or FLS analysis via the built-in **Check FLS ↗** button.

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
| **Picklist values**                    | Up to 8 active values shown inline; click **+N more** to open all values in Salesforce Setup |
| **Currency / Number**                  | Precision (total digits) and decimal places                        |
| **Text**                               | Maximum character length                                           |
| **Required / Updateable**              | Field-level access flags                                           |
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
5. Select the `SF Field Inspector` folder (the extension directory)
6. Navigate to any Salesforce Lightning record page — the extension activates automatically

### Requirements

- Google Chrome or Microsoft Edge (tested on both)
- A Salesforce org with Lightning Experience enabled
- Pages must match the pattern `/lightning/r/*/view` (standard record pages)

---

## How to use

1. Open any Salesforce record page (e.g. an Account, Contact, Opportunity)
2. Hover over a **field label** or **field value** for ~0.8 seconds
3. The metadata tooltip appears — move your mouse into the tooltip to keep it open
4. Click **Copy API Name** to copy the field's API name to your clipboard
5. Click **Check FLS ↗** to open the field's profile/permission set access in Salesforce Inspector
6. Click **✕** or click anywhere outside the tooltip to dismiss it

---

## FLS — Check Field-Level Security

The **Check FLS ↗** button opens **Salesforce Inspector Advanced** or **Salesforce Inspector Reloaded** (whichever is installed) with the following SOQL pre-filled in the Data Export tab:

```sql
SELECT Parent.Label, Parent.Profile.Name, Parent.IsOwnedByProfile, PermissionsRead, PermissionsEdit
FROM FieldPermissions
WHERE SobjectType = 'Account'
AND Field = 'Account.Industry'
ORDER BY Parent.IsOwnedByProfile DESC, Parent.Profile.Name
```

`Parent.IsOwnedByProfile` distinguishes the permission holder:

- `true` — the row is a **Profile**
- `false` — the row is a **Permission Set** or Permission Set Group

If neither extension is installed, clicking **Check FLS ↗** shows an alert with installation instructions. Salesforce Inspector Advanced takes priority if both are installed.

---

## Limitations

### Page type

- **Lightning Experience only** — the extension only activates on Lightning record pages matching the URL pattern `/lightning/r/*/view`. It does not work on:
  - Salesforce Classic
  - List views, related lists, or list view modals
  - Setup pages (Object Manager, Profiles, etc.)
  - Flow screens, Einstein Analytics, or embedded pages in iframes with a different origin
  - App Builder / Lightning App Builder preview

### Field coverage

- **Compound fields are not supported** — the Name field (split into First Name / Last Name) and Address fields (split into Street, City, State, etc.) are multi-component fields. The describe API returns the compound wrapper (`Name`, `BillingAddress`) but Lightning renders individual sub-components. Hover directly over a sub-field (e.g. City, Street) rather than the compound label.
- **System / internal fields may not resolve** — fields like `SystemModstamp`, `IsDeleted`, `LastReferencedDate`, and certain internal metadata fields are returned by the describe API but may not have a visible label element in the DOM that the extension can target.
- **Child relationship fields** — fields displayed inside related lists or inline-edited child records on a parent record page are not detected; the hover target must be on the primary record form.
- **Geolocation sub-fields** — `Latitude__s` / `Longitude__s` compound sub-fields may not map cleanly to a describe result depending on how Lightning renders them.

### API and session

- **Requires API access** — the running user must have API Enabled in their profile/permission set. Users without API access will see a `403` or authentication error.
- **Session must be active** — the extension reads the `sid` cookie or `window.$A` session. If the Salesforce session expires, a "Session expired" error is shown. Refreshing the page re-establishes the session.
- **Read-only metadata** — the extension only reads field metadata; it does not write, update, or delete any data in your org.
- **API rate limits** — metadata describe calls count against your org's API request limits (24-hour rolling window). Results are cached for 5 minutes per object to minimise calls.

### Browser and environment

- **Tested on Chrome and Edge** — the extension uses Chrome Extension Manifest V3 APIs and has been verified on Google Chrome and Microsoft Edge.
- **Firefox is not supported** — Firefox uses a different extension API and has not been tested.
- **Check FLS requires a companion extension** — the **Check FLS ↗** button requires **Salesforce Inspector Advanced** or **Salesforce Inspector Reloaded** to be installed and enabled. Without one of these, the button shows an alert.
- **No offline support** — all metadata is fetched live from the Salesforce REST and Tooling APIs; the extension does not function without network access to your org.

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
Salesforce Field Inspector/
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

**"Check FLS ↗" shows an alert or does nothing**

- Install **Salesforce Inspector Advanced** or **Salesforce Inspector Reloaded** from the Chrome Web Store and make sure it is enabled
