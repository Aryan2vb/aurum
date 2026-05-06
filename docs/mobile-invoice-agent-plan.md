# Mobile Invoice Agent Plan

## Product Intent

Create invoices from mobile without opening the desktop billing flow. The first version should feel like a Telegram-style billing assistant: staff sends a short invoice message, the system asks only for missing details, then returns a reviewable invoice preview and shareable HTML/PDF.

## Current Frontend Invoice Payloads

### Desktop create/edit invoice

Source: `src/pages/CreateInvoicePage/CreateInvoicePage.js`

The desktop form posts to:

- `POST /invoices` through `createInvoice(payload)`
- `POST /invoices/draft` through `createDraft(payload)`
- `PATCH /invoices/:id` through `updateInvoice(id, payload)`

Current payload shape:

```js
{
  customerId,
  invoiceDate,
  payments: [
    {
      mode,
      amount,
      reference
    }
  ],
  paidAmount,
  autoCreateUdhar,
  templateType,
  modeOfPayment,
  items: [
    {
      description,
      hsnSac,
      quantity,
      metalType,
      metalRate,
      purityLabel,
      purityValue,
      purityBasis,
      grossWeight,
      stoneWeight,
      makingCharges,
      makingChargesType,
      stoneCharges,
      isHallmarked,
      hallmarkingCharge,
      huid
    }
  ]
}
```

### Mobile create invoice

Source: `src/pages/CreateInvoicePage/CreateInvoicePageMobile.js`

The mobile form posts to:

- `POST /invoices` through `createInvoice(payload)`
- `POST /invoices/draft` through `createDraft(payload)`

Current payload shape:

```js
{
  customerId,
  placeOfSupply,
  invoiceDate,
  templateType,
  modeOfPayment,
  metalRateSource,
  metalRateDate,
  taxType,
  cgstRate,
  sgstRate,
  igstRate,
  buyerAddress,
  buyerState,
  buyerStateCode,
  autoCreateUdhar,
  paidAmount,
  notes,
  deliveryNote,
  dispatchDocNo,
  destination,
  termsOfDelivery,
  items: [
    {
      slNo,
      description,
      hsnSac,
      quantity,
      unit,
      metalType,
      metalRate,
      purityLabel,
      purityValue,
      purityBasis,
      effectiveRate,
      grossWeight,
      stoneWeight,
      netWeight,
      makingCharges,
      makingChargesType,
      makingChargesAmount,
      stoneCharges,
      isHallmarked,
      hallmarkingCharge,
      huid,
      taxableAmount,
      totalAmount,
      unitPrice
    }
  ]
}
```

## Agent Input Model

The agent should convert natural chat into a draft invoice payload. It should not finalize silently.

Minimum fields to extract:

- customer name or customer phone
- article description
- gross weight
- stone weight, optional
- metal type
- purity
- metal rate per gram
- making charge value
- making charge type: per gram, flat, or percentage on metal
- paid amount, optional
- payment mode, optional
- invoice or estimate intent

Fields the agent should infer from organization settings:

- organization ID from authenticated Telegram user
- template type
- GST rates and tax type
- HSN defaults by metal
- invoice prefix/series
- company details
- default payment mode
- default hallmarking charge

## Authentication Model

Do not authenticate through typed shop codes.

Use this flow:

1. Admin creates staff invite from the web dashboard.
2. Backend generates one-time Telegram deep link.
3. Staff opens bot through that link.
4. Backend links Telegram user ID to organization and role.
5. Every invoice request resolves organization from Telegram user ID.

Optional extra check:

- ask Telegram user to share phone number
- match it against the invited staff phone

## Proposed Backend Endpoints

### Parse chat into invoice draft

`POST /invoice-agent/parse`

Input:

```js
{
  channel: "telegram",
  channelUserId: "123456789",
  message: "Ramesh chain 12.4g 22k rate 6250 making 850",
  activeOrganizationId
}
```

Output:

```js
{
  status: "NEEDS_CONFIRMATION",
  missingFields: [],
  draft: {
    customer,
    items,
    payments,
    totals
  },
  previewHtmlUrl
}
```

### Confirm draft invoice

`POST /invoice-agent/drafts/:draftId/confirm`

This should call the existing invoice creation path after the user confirms the reviewed draft.

## MVP Flow

1. Telegram user sends invoice text.
2. Backend authenticates Telegram user and resolves organization.
3. Agent extracts fields.
4. If customer is ambiguous, bot asks user to choose or create.
5. If any billing field is missing, bot asks one compact follow-up.
6. Backend creates a draft preview, not a final invoice.
7. Bot returns total breakdown and preview link.
8. User taps confirm.
9. Backend creates invoice through current `/invoices` API.
10. Bot returns HTML/PDF share link.

## Product Decisions To Make

- Telegram first, then WhatsApp later.
- Estimate mode and invoice mode should both exist.
- Agent should create drafts first; final invoice only after explicit confirmation.
- Existing mobile and desktop payloads should be normalized before the bot depends on them.
- Organization settings should be the source of truth for tax, template, company, and default invoice behavior.

