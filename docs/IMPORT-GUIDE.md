# Import Guide

How to export your bank statements and import them into the Budget App.

---

## Banque Populaire — Export Instructions

1. Log in to [banquepopulaire.fr](https://www.banquepopulaire.fr)
2. Go to **Mon Compte** → **Relevés de compte**
3. Select the account: Compte Chèques (31919086442)
4. Choose the period you want to export (monthly is recommended)
5. Click **Télécharger en PDF**
6. Save the file — it will be named like: `Extrait de compte - 31919086442 - YYYYMMDD.pdf`

**What the app parses from BP PDFs:**
- Transaction date (DD/MM, year from statement header)
- Description (payee name + reference code)
- Amount in European format: `-1.103,90 €`

**Transfer auto-detection in BP PDFs:**
- `Revolut**8633*` → flagged as BP → Revolut transfer
- `VIR INST MNICA ROSAS` → flagged as BP → Joint account transfer
- `Virement vers LIVRET A` → flagged as internal BP savings transfer
- `Virement vers COMPTE CHEQUES` → flagged as internal BP transfer

---

## Revolut — Export Instructions

### Personal Account:
1. Open the Revolut app on your phone
2. Go to your **EUR account**
3. Tap the **↓** (download / statement) button
4. Select **Statement** → **PDF**
5. Choose date range (recommended: monthly or quarterly)
6. Download and save

### Joint Account:
1. Open Revolut app
2. Tap the **Groups** section (the joint account with Monica)
3. Tap the account → **Statement** → **PDF**
4. Same process as above

**File naming:** Revolut exports are named like `account-statement_YYYY-MM-DD_YYYY-MM-DD_en-us_XXXXXX.pdf`

**What the app parses from Revolut PDFs:**
- Date: `Dec 1, 2025` format
- Description: merchant name
- Money Out (debit) and Money In (credit) in English format: `1,234.56`

**Transfer auto-detection in Revolut PDFs:**
- `Top-up by *0518` → flagged as received from BP (card 0518)
- `Transfer from CHRISTIAN FELIPE VALENCIA BAQUERO & MONICA PATRICIA ROSAS MARQUEZ` → flagged as transfer from Joint

---

## Uploading to the App

1. Go to **Import** page (upload icon in sidebar)
2. Select the account this statement belongs to:
   - **BP Checking** → for Banque Populaire PDFs
   - **Revolut Personal** → for your personal Revolut PDF
   - **Revolut Joint** → for the joint account PDF
3. Drag and drop the PDF or click to browse
4. Wait for parsing (~3-5 seconds)
5. **Review the preview table:**
   - Green rows = new transactions (will be imported)
   - Gray rows = transfers (auto-detected, excluded from budget)
   - Red rows = duplicates (already in DB, will be skipped)
6. Edit categories if needed (click the category dropdown in each row)
7. Uncheck any rows you don't want to import
8. Click **Confirm Import**

---

## Duplicate File Protection

If you try to upload the same PDF twice, the app will show:

> "This statement was already imported on [date]. No changes made."

The app detects duplicates using a fingerprint (SHA-256 hash) of the file bytes. Even if you rename the file, the system will still recognize it.

---

## Recommended Import Schedule

| Account | Frequency | When to export |
|---|---|---|
| BP Checking | Monthly | After the 5th (when the monthly statement is generated) |
| Revolut Personal | Monthly | End of month |
| Revolut Joint | Monthly | End of month |

**Tip:** BP statements cover the period from the 5th of one month to the 5th of the next (e.g., `05/11/2025 → 05/12/2025`). Import them in order to keep your data consistent.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| "0 transactions parsed" | PDF layout changed in a bank update | Check the console for parser warnings; contact support |
| Amounts look wrong (e.g., €100 instead of €1000) | Decimal/thousands separator confusion | Report with a sample — the parser may need a regex update |
| Transfer not auto-detected | New account number or description format | Manually un-flag in the review table; report to add to auto-detection rules |
| File won't upload | File is not a PDF, or PDF is password-protected | Export a new PDF without password protection |
