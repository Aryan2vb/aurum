# OOP / SOLID / Design Patterns — Frontend Items

The full cross-repo plan is in `back-aurum/docs/OOP_SOLID_PATTERNS_PLAN.md`. Frontend items:

| # | Concept | Where | Fix | Effort |
|---|---|---|---|---|
| 1 | Strategy + Factory (OCP) | `src/utils/invoiceTemplates.js`, `src/pages/CreateInvoicePage/CreateInvoicePage.js:532-540` | `{ type: renderer }` lookup map instead of if/else | S |
| 2 | DIP + Facade | `src/services/*.js` | Single `apiClient` owning base URL, auth header, JSON, error parsing | M |
| 3 | Encapsulation | 68 `localStorage.getItem('authToken')` calls across 14 files | `session` module as the only storage gateway | S |
| 4 | OCP / Policy | `src/hooks/usePermission.js:10-16`, `src/App.js`, `ProtectedRoute.js` | `POLICIES` map + `can(role, action)`; behavior-based tests | S–M |
| 6 | SRP | `src/pages/CreateInvoicePage/CreateInvoicePage.js` (74KB) | Pure helpers → `utils/invoiceFormat.js`; extract `useCustomerSearch`, `useInvoiceSequence`, `useInvoicePreview` | L |

Practice order: #3 `session` → #2 `apiClient` (one service at a time) → #4 policy → #6 hook extraction. Run `npm test` after each step.

## Asset uploads

Full analysis: `back-aurum/docs/ASSET_UPLOAD_DESIGN.md`. Frontend gaps:
- `src/services/uploadService.js` builds its own `fetch` and reads `localStorage` directly (items #2/#3).
- Single-file, settings-only uploads: no multi-file, progress, retry, or validation driven by `ASSET_CONFIG`.
- Footers use a separate flow (`footerLibraryService.js`: presign → PUT → complete) from other assets (`getPresignedUrl` → PUT).
- Target: one `useAssetUpload(type, owner)` hook on top of `apiClient`, used by settings, footers, jewellery/inventory photos, and employee photos.
- R2 CORS allows only `content-type`; don't add upload headers without updating the bucket rule.
