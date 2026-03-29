# Features

A complete breakdown of everything Salesforce Field Inspector shows you.

---

## Instant Field Metadata Tooltip

Hover over any field label or value on a Lightning record page for 0.8 seconds and a tooltip appears with the full field metadata — no Setup navigation required.

The tooltip stays open when you move your mouse into it, so you can read or copy values at your own pace.

---

## Field Properties

### API Name
The field's API name is highlighted in blue at the top of the tooltip. Click **Copy API Name** to copy it to your clipboard instantly. The button confirms with a ✓ tick on success.

### Label & Type
The display label as shown in the UI and the human-readable field type (e.g. `Formula (Text)`, `Master-Detail`, `Multi-Select Picklist`).

### Lookup & Master-Detail
For relationship fields, the tooltip shows:
- **Relationship type** — Lookup or Master-Detail
- **Referenced object** — the parent object API name
- **Relationship name** — the relationship API name used in SOQL
- **Cascade delete** — whether child records are deleted when the parent is deleted

### Formula
The full formula body is displayed in a scrollable code block. Useful for reviewing complex formulas without opening the field editor.

### Picklist Values
Active picklist values are shown inline (up to 8). If there are more, a **+N more** link opens the field's picklist values directly in Salesforce Setup in a new tab.

For restricted picklists, a **Restricted: Yes** flag is shown.

### Number & Currency Precision
For numeric fields (Currency, Number, Percent), the tooltip shows total precision (digits) and decimal places (scale).

### Text Length
For text-based fields (Text, Text Area, Email, Phone, URL), the maximum character length is shown.

### Field Access Flags
| Flag | What it means |
|---|---|
| **Required** | Field must have a value on every record |
| **Updateable** | Field value can be changed after record creation |
| **Createable** | Field value can be set when creating a record |
| **Unique** | Field value must be unique across all records |
| **External ID** | Field can be used as an external identifier for upserts |
| **Encrypted** | Field is encrypted at rest (Classic Encryption) |

### Default Value
The configured default value for the field, if one is set.

### History Tracking
Shows **Yes** or **No** for whether field history tracking is enabled. Fetched from the Salesforce Tooling API (`EntityParticle`).

---

## Check FLS — Field-Level Security

The **Check FLS ↗** button opens **Salesforce Inspector Advanced** or **Salesforce Inspector Reloaded** with a pre-built SOQL query in the Data Export tab:

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

Results are ordered with Profiles first, then Permission Sets alphabetically.

---

## Performance

- **5-minute cache** — field metadata is cached per object so repeated hovers on the same object generate no additional API calls
- **Per-field Tooling API cache** — history tracking status is cached per field
- **800ms hover delay** — the tooltip only triggers after the cursor stays on a field for 0.8 seconds, preventing accidental triggers while scrolling

---

## Supported Field Types

All standard and custom Salesforce field types are supported:

Text · Text Area · Long Text Area · Rich Text · Checkbox · Number · Currency · Percent · Date · Date/Time · Time · Email · Phone · URL · Picklist · Multi-Select Picklist · Lookup · Master-Detail · Formula · Auto Number · Record ID · Geolocation · Encrypted Text · File (Base64)

---

## Limitations

- **Lightning Experience only** — does not work on Salesforce Classic, list views, Setup pages, Flow screens, or App Builder
- **Compound fields** — the Name compound field and Address compound field are not directly supported; hover over individual sub-fields (First Name, Street, City, etc.)
- **System fields** — some internal system fields (`IsDeleted`, `SystemModstamp`) may not resolve if they have no visible label in the DOM
- **API access required** — the running user must have API Enabled in their profile or permission set
