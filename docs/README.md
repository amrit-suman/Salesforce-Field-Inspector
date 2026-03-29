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

<a href="https://amrit-suman.github.io/Salesforce-Field-Inspector/#/privacy-policy" target="_blank" rel="noopener noreferrer">🔒 Privacy Policy</a>
