# Get Started

Get Salesforce Field Inspector running in under a minute.

---

## Requirements

- **Browser** — Google Chrome or Microsoft Edge
- **Salesforce** — Lightning Experience enabled on your org
- **Page type** — Standard Lightning record pages (`/lightning/r/*/view`)
- **Permission** — API Enabled on your Salesforce user profile

---

## Installation

### From Source (Developer Mode)

1. [Download or clone the repository](https://github.com/amrit-suman/Salesforce-Field-Inspector)
2. Open Chrome or Edge and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `Salesforce-Field-Inspector` folder
6. Navigate to any Salesforce Lightning record page — the extension activates automatically

---

## How to Use

1. Open any Salesforce record page (Account, Contact, Opportunity, or any custom object)
2. Hover over a **field label** or **field value** for ~0.8 seconds
3. The metadata tooltip appears — move your mouse into it to keep it open
4. Click **Copy API Name** to copy the field's API name to your clipboard
5. Click **Check FLS ↗** to open field-level security analysis in Salesforce Inspector
6. Click **✕** or anywhere outside the tooltip to dismiss it

---

## Check FLS Button

The **Check FLS ↗** button requires one of the following extensions to be installed:

- **Salesforce Inspector Advanced** *(takes priority if both are installed)*
- **Salesforce Inspector Reloaded**

Both are available on the Chrome Web Store. If neither is installed, clicking the button shows an installation prompt.

---

## Troubleshooting

**Tooltip does not appear**
- Confirm you are on a `/lightning/r/` record page — not a list view, Setup page, or App Builder
- Reload the Salesforce page after installing the extension

**"Session expired" error**
- Click **↺ Reload Page** in the tooltip or manually refresh the Salesforce page
- Sessions expire after the configured idle timeout (default 2 hours in Salesforce)

**"Field not found" error**
- The field may be a compound field (Name, Address) or an internal system field
- Hover directly over a sub-field (e.g. City or Street) rather than the compound wrapper

**"Check FLS ↗" shows an alert**
- Install **Salesforce Inspector Advanced** or **Salesforce Inspector Reloaded** from the Chrome Web Store and ensure it is enabled
