# Inventory / Purchases / Cash & Bank — UAT Test Cases

**Branch:** `feat/inventory` (aurum + back-aurum)  
**Audience:** Product managers, QA, business owners  
**How to use:** For each case, mark **Pass / Fail / Blocked**, note who tested and date. Failures need a screenshot + short description.

**Roles used in cases**
| Role | Can use Stock / Purchases / Cash & Bank |
|------|----------------------------------------|
| OWNER, ADMIN, STAFF | Yes |
| VIEWER | No (should be blocked) |

**Suggested test shop setup**
1. At least one **Cash** account and one **Bank** account in Cash & Bank.
2. One customer with advance balance (optional for advance cases).
3. One supplier / vendor (can create during purchase tests).
4. Sample HDFC delimited bank statement (`.txt`) for reconcile tests.

---

## 1. Access & navigation

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| A-01 | Staff can open new menus | Log in as STAFF. Look at sidebar. | See **Stock**, **Purchases**, **Cash & Bank Book**. |
| A-02 | Viewer cannot open new menus | Log in as VIEWER. Try `/stock`, `/purchases`, `/books`. | Access denied / redirected. Menus not available (or not usable). |
| A-03 | Pages load without errors | Open each of Stock, Purchases, Cash & Bank. | Page loads; no blank screen or error toast on open. |

---

## 2. Stock (metal inventory)

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| S-01 | See stock balances | Open **Stock**. | List of metal + purity balances (may be empty at first). |
| S-02 | Set opening balance | Add opening stock for e.g. Gold 22K, quantity 100 g. Save. | Balance shows 100 g. Ledger/history shows opening entry. |
| S-03 | Purchase increases stock | Create a purchase with Gold 22K net weight 50 g (see Purchases). Return to Stock. | Gold 22K balance increases by ~50 g. |
| S-04 | Sale decreases stock | Finalize a sale invoice with Gold 22K item weight 10 g. Check Stock. | Gold 22K balance decreases by ~10 g. |
| S-05 | Stock ledger trail | Open stock history / ledger for that purity. | See purchase in, sale out, running balance makes sense. |
| S-06 | Manage purities | Add a custom purity label for Gold (if UI allows). | New purity appears and can be used on stock/purchase/invoice. |
| S-07 | Negative stock behaviour | Sell more weight than available (if system allows). | Either blocked with clear message, **or** allowed with a warning — note which; product decision already leans warn-only today. |

---

## 3. Purchases & vendors

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| P-01 | Create purchase bill | Purchases → new bill. Pick/create vendor, add line items (metal, purity, weight, rate), set date. Save. | Bill appears in list with correct totals. |
| P-02 | Pay with cash | On create/edit, add CASH payment for part/full amount. | Paid amount updates; status UNPAID / PARTIAL / PAID as expected. |
| P-03 | Pay with UPI/bank — account required | Add UPI (or NEFT) payment **without** selecting bank account. Try save. | Error: must select a bank account. Cannot save. |
| P-04 | Pay with UPI/bank — account selected | Select bank account, save. | Save succeeds. Cash & Bank shows money **out** of that bank for the payment. |
| P-05 | Edit purchase keeps bank account | Open an existing UPI-paid purchase. Confirm bank account still selected. Save without changing payments. | Account still filled; no “account required” error; treasury still correct. |
| P-06 | Cannot overpay | Enter payments totaling more than bill value. | Blocked with clear message. |
| P-07 | Insufficient bank funds | Pay from a bank account with balance lower than payment (if funds check is on). | Blocked with clear message. |
| P-08 | Supplier attachment | Attach supplier invoice image/PDF. Save. Open bill. | Attachment visible / downloadable. |
| P-09 | Purchase bill book | Select one or more bills → generate bill book / print view. | Pages show bill header + attachment (or “attachment missing” placeholder). No broken/unsafe links. |
| P-10 | Record extra payment later | On a PARTIAL purchase, record another payment with bank account. | Paid amount and status update; books update. |
| P-11 | Vendor reuse | Create bill with new vendor name, then create another bill picking same vendor. | Vendor appears in list; no duplicate chaos. |

---

## 4. Cash & Bank book

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| B-01 | Create cash account | Books → add Cash account with name + opening balance. | Account listed; opening balance reflected. |
| B-02 | Create bank account | Add Bank account (name, bank name, optional IFSC/number). | Account listed as BANK and selectable on payments. |
| B-03 | Manual money in / out | Create a manual money-in and money-out on an account. | Ledger shows both; balance changes correctly. |
| B-04 | Transfer between accounts | Transfer from Bank A to Cash (or Bank B). | Both ledgers move; totals conserved (out = in). |
| B-05 | Invoice UPI hits bank book | Record invoice payment UPI → selected bank. Open that bank ledger. | Sale receipt appears for that amount/date. |
| B-06 | Purchase UPI hits bank book | Pay a purchase via UPI from same bank. | Purchase payment appears as outflow. |
| B-07 | Advance receive hits books | Receive customer advance via UPI into a bank. | Inflow on that bank; customer advance balance up. |
| B-08 | Advance refund hits books | Refund advance via UPI from a bank. | Outflow; advance balance down. |

---

## 5. Bank statement reconcile (HDFC)

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| R-01 | Upload statement | Books → pick bank account → upload HDFC delimited `.txt`. | Credits appear under unmatched; duplicates on re-upload are skipped. |
| R-02 | Suggestions appear | For a statement credit matching a booked UPI payment amount. | Suggestion shows invoice / customer / amount. |
| R-03 | Link suggested payment | Confirm link on a suggestion. | Line becomes matched; payment leaves “not on statement” list. |
| R-04 | Link non-suggested payment | If suggestion missed, open dropdown and pick from **all** unmatched booked payments. | Can still link successfully. |
| R-05 | Wrong bank rejected | Payment booked to Bank A; try match to Bank B statement credit. | Error: different bank account. |
| R-06 | Amount mismatch rejected | Try link payment whose amount differs by more than ~₹1. | Error; no match saved. |
| R-07 | Ignore / delete credit | Ignore a junk credit; or delete an unmatched line. | Line removed from unmatched queue as designed. |
| R-08 | Unmatch | Unlink a previously matched credit. | Line back to unmatched; payment available again. |
| R-09 | After match, books stay correct | Match a payment that had no account at booking (if any). | Payment gets statement bank; treasury movement assigned to that bank. |
| R-10 | Edit invoice payments after match | Change payments on an invoice that was bank-matched. | Old match is cleared (not left pointing at deleted payment). |

---

## 6. Invoices — payments & bank accounts

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| I-01 | Create invoice cash payment | New invoice, CASH payment, finalize. | Saves; stock reduced; cash book updated if cash account exists. |
| I-02 | Create invoice UPI without account | UPI payment, leave bank blank, finalize. | Blocked: select bank account. |
| I-03 | Create invoice UPI with account | Select bank, finalize. | Saves; bank book shows receipt. |
| I-04 | Edit invoice keeps bank account | Re-open finalized/draft invoice with UPI payment. | Bank account still shown; re-save does not wipe it. |
| I-05 | Record payment modal | From invoice detail, record UPI payment with bank. | Remaining balance drops; bank book updates; bankMatched may stay false until reconcile. |
| I-06 | Apply advance on create | Customer has advance. On create invoice, enter cash + advance so Bal shows ~0. Finalize. | Advance applied only up to remaining after cash; no “invoice saved but advance failed” for over-apply. |
| I-07 | Apply advance from invoice detail | On PARTIAL/UNPAID invoice with customer advance, use Apply Advance. | Paid increases; advance balance decreases; remaining payable correct. |
| I-08 | Invoice detail money summary | Invoice with both cash and advance. | Paid (cash/other) and Advance Applied shown clearly; **Balance** = total − all paid (including advance). No double-count look. |
| I-09 | Bank match badge on payment | After reconcile match, open invoice. | Payment shows matched / bank match info. |

---

## 7. Advances (with accounts)

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| V-01 | Receive advance UPI | Advance page/panel: receive amount via UPI + bank account. | Customer advance ↑; bank book inflow. |
| V-02 | Receive advance without bank | UPI without account. | Blocked. |
| V-03 | Refund advance | Refund via UPI + bank. | Advance ↓; bank outflow. |
| V-04 | Transfer advance | Transfer advance between two customers (if enabled). | Source ↓, destination ↑; totals conserved. |

---

## 8. Reports / weights (if used in your shop)

| ID | What to check | Steps | Expected result |
|----|---------------|-------|-----------------|
| W-01 | Period weight totals | Run reports for a period with sales. | Gross/net weight by purity aggregates look right vs invoices. |

---

## 9. Regression smoke (must not break old flows)

| ID | What to check | Expected |
|----|---------------|----------|
| G-01 | Create / finalize / PDF / WhatsApp invoice | Still works. |
| G-02 | Customer create / search | Still works. |
| G-03 | Udhar / credits collect payment | Still works; non-cash still asks for bank where required. |
| G-04 | Draft invoice → finalize | Still works. |
| G-05 | Cancel unpaid/partial invoice | Cancels; stock/finance cleaned appropriately. |

---

## Severity guide for bugs found

| Severity | Meaning |
|----------|---------|
| **Blocker** | Cannot complete purchase, sale settlement, or bank reconcile for real work |
| **High** | Wrong money/stock in books; account wiped on edit; match to wrong bank |
| **Medium** | Confusing UI, missing suggestion but manual link works, wording issues |
| **Low** | Cosmetic, copy, layout |

---

## Sign-off

| Area | Tester | Date | Pass? | Notes |
|------|--------|------|-------|-------|
| Access | | | | |
| Stock | | | | |
| Purchases | | | | |
| Cash & Bank | | | | |
| Bank reconcile | | | | |
| Invoices + advances | | | | |
| Regression | | | | |

**Ready for production?** Yes / No / Yes with known issues: _______________
