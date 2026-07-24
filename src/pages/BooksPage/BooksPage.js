import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import {
  assignUnassignedMovements,
  createFinanceTransaction,
  createFinancialAccount,
  deleteFinanceTransaction,
  getAccountLedger,
  getFinanceBook,
  getFinancialAccounts,
  getUnassignedMovements,
  getUnmatchedBankCredits,
  ignoreBankStatementLine,
  matchBankStatementLine,
  updateFinancialAccount,
  uploadBankStatement,
} from '../../services/financeService';
import { clearPaymentAccountCache } from '../../components/molecules/PaymentAccountSelect/PaymentAccountSelect';
import './BooksPage.css';

const TYPES = ['CASH', 'BANK'];
const ENTRY_TYPES = [
  ['MONEY_IN', 'Money In'],
  ['MONEY_OUT', 'Money Out'],
  ['TRANSFER', 'Transfer'],
];
const CREATE_ACCOUNT_FIELDS = [
  'type', 'name', 'bankName', 'accountNumber', 'ifsc', 'notes', 'openingBalance', 'openingDate',
];
const UPDATE_ACCOUNT_FIELDS = [
  'name', 'bankName', 'accountNumber', 'ifsc', 'notes',
];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const list = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const accountName = (account) => account?.name || account?.bankName || 'Account';
const isCashOrBank = (account) => account?.type === 'CASH' || account?.type === 'BANK';
const emptyAccount = (type = 'BANK') => ({
  type, name: '', bankName: '', accountNumber: '', ifsc: '',
  notes: '', openingBalance: '', openingDate: today(),
});
const emptyEntry = () => ({
  category: 'MONEY_IN',
  entryDate: today(),
  accountId: '',
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  reference: '',
  notes: '',
});

const BooksPage = () => {
  const [type, setType] = useState('CASH');
  const [accounts, setAccounts] = useState([]);
  const [bookRows, setBookRows] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [ledgerRows, setLedgerRows] = useState([]);
  const [dates, setDates] = useState({ dateFrom: '', dateTo: '' });
  const [activeView, setActiveView] = useState('book');
  const [unassigned, setUnassigned] = useState([]);
  const [selectedMovementIds, setSelectedMovementIds] = useState([]);
  const [assignAccountId, setAssignAccountId] = useState('');
  const [reconcileAccountId, setReconcileAccountId] = useState('');
  const [unmatchedCredits, setUnmatchedCredits] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({});
  const [accountForm, setAccountForm] = useState(null);
  const [entryForm, setEntryForm] = useState(null);
  const [editingAccountId, setEditingAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const loadAccounts = useCallback(async () => {
    const data = await getFinancialAccounts();
    setAccounts(list(data, ['accounts']));
  }, []);

  const loadBook = useCallback(async () => {
    const data = await getFinanceBook({ type, ...dates });
    setBookRows(list(data, ['entries', 'rows', 'transactions']));
  }, [type, dates]);

  const loadLedger = useCallback(async () => {
    if (!selectedAccountId) {
      setLedgerRows([]);
      return;
    }
    const data = await getAccountLedger(selectedAccountId, dates);
    setLedgerRows(list(data, ['entries', 'rows', 'transactions']));
  }, [selectedAccountId, dates]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadAccounts(), loadBook(), loadLedger()]);
    } catch (err) {
      setError(err.message || 'Could not load finance books');
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadBook, loadLedger]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (activeView !== 'unassigned') return;
    getUnassignedMovements()
      .then((data) => setUnassigned(list(data, ['movements', 'entries', 'rows'])))
      .catch((err) => setError(err.message || 'Could not load unassigned movements'));
  }, [activeView]);

  const loadUnmatched = useCallback(async (accountId = reconcileAccountId) => {
    const data = await getUnmatchedBankCredits(accountId || undefined);
    const rows = list(data, ['lines', 'entries', 'rows']);
    setUnmatchedCredits(rows);
    setSelectedMatch((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (!next[row.id] && row.suggestions?.[0]?.invoiceId) {
          next[row.id] = row.suggestions[0].invoiceId;
        }
      });
      return next;
    });
  }, [reconcileAccountId]);

  useEffect(() => {
    if (activeView !== 'reconcile') return;
    loadUnmatched().catch((err) => setError(err.message || 'Could not load unmatched credits'));
  }, [activeView, loadUnmatched]);

  const bankAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'BANK' && account.isActive !== false),
    [accounts],
  );

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => account.type === type && account.isActive !== false),
    [accounts, type],
  );
  const rows = selectedAccountId ? ledgerRows : bookRows;

  const openAccount = (account) => {
    if (account) {
      setEditingAccountId(account.id);
      setAccountForm({ ...emptyAccount(account.type), ...account });
    } else {
      setEditingAccountId('');
      setAccountForm(emptyAccount(type));
    }
  };

  const handleUploadClick = () => {
    const accountId = reconcileAccountId || selectedAccountId || bankAccounts[0]?.id;
    if (!accountId) {
      setError('Create or select a bank account before uploading a statement');
      return;
    }
    setReconcileAccountId(accountId);
    fileInputRef.current?.click();
  };

  const handleStatementFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const accountId = reconcileAccountId || selectedAccountId || bankAccounts[0]?.id;
    if (!accountId) {
      setError('Create or select a bank account before uploading a statement');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await uploadBankStatement(accountId, file);
      setReconcileAccountId(accountId);
      setActiveView('reconcile');
      setMessage(
        `Imported ${result.imported ?? 0} new rows`
        + ` (${result.skipped ?? 0} duplicates skipped)`
        + ` — ${result.credits ?? 0} credits / ${result.debits ?? 0} debits`,
      );
      await loadUnmatched(accountId);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not upload statement');
    } finally {
      setSaving(false);
    }
  };

  const ignoreCredit = async (lineId) => {
    setSaving(true);
    setError('');
    try {
      await ignoreBankStatementLine(lineId);
      setUnmatchedCredits((rows) => rows.filter((row) => row.id !== lineId));
      setMessage('Credit ignored');
    } catch (err) {
      setError(err.message || 'Could not ignore line');
    } finally {
      setSaving(false);
    }
  };

  const confirmCredit = async (line) => {
    const invoiceId = selectedMatch[line.id] || line.suggestions?.[0]?.invoiceId;
    if (!invoiceId) {
      setError('Pick an invoice suggestion before confirming');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await matchBankStatementLine(line.id, invoiceId);
      setUnmatchedCredits((rows) => rows.filter((row) => row.id !== line.id));
      setMessage(`Matched ${money(line.credit)} to invoice`);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not match payment');
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fields = editingAccountId ? UPDATE_ACCOUNT_FIELDS : CREATE_ACCOUNT_FIELDS;
      const payload = Object.fromEntries(fields
        .filter((key) => accountForm[key] !== '')
        .map((key) => [
          key,
          key === 'openingBalance' ? Number(accountForm[key]) : accountForm[key],
        ]));
      if (editingAccountId) await updateFinancialAccount(editingAccountId, payload);
      else await createFinancialAccount(payload);
      clearPaymentAccountCache();
      setAccountForm(null);
      setMessage(editingAccountId ? 'Account updated' : 'Account created');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not save account');
    } finally {
      setSaving(false);
    }
  };

  const entryPayload = () => {
    const form = entryForm;
    const amount = Math.abs(Number(form.amount));
    const base = {
      amount,
      occurredAt: form.entryDate,
      reference: form.reference || undefined,
      description: form.notes || undefined,
    };
    if (form.category === 'TRANSFER') {
      const fromAccount = accounts.find((account) => account.id === form.fromAccountId);
      const toAccount = accounts.find((account) => account.id === form.toAccountId);
      if (!isCashOrBank(fromAccount) || !isCashOrBank(toAccount)) {
        throw new Error('Transfers require cash or bank accounts');
      }
      if (fromAccount.id === toAccount.id) {
        throw new Error('Choose different source and destination accounts');
      }
      const type = fromAccount.type === 'BANK' && toAccount.type === 'BANK'
        ? 'BANK_BANK_TRANSFER'
        : 'CASH_BANK_TRANSFER';
      return { ...base, type, fromAccountId: form.fromAccountId, toAccountId: form.toAccountId };
    }
    if (!form.accountId) throw new Error('Choose an account');
    return {
      ...base,
      type: 'ADJUSTMENT',
      accountId: form.accountId,
      amount: form.category === 'MONEY_OUT' ? -amount : amount,
    };
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    if (!Number(entryForm.amount)) return;
    setSaving(true);
    setError('');
    try {
      await createFinanceTransaction(entryPayload());
      setEntryForm(null);
      setMessage('Entry recorded');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not record entry');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (row) => {
    if (row.isAutomatic || (row.sourceType && row.sourceType !== 'MANUAL') || !window.confirm('Delete this manual entry?')) return;
    try {
      await deleteFinanceTransaction(row.transactionId || row.id);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not delete entry');
    }
  };

  const assign = async (ids) => {
    if (!ids.length || !assignAccountId) return;
    setSaving(true);
    try {
      await assignUnassignedMovements(ids, assignAccountId);
      setUnassigned((current) => current.filter((row) => !ids.includes(row.id)));
      setSelectedMovementIds([]);
      setMessage(`${ids.length} movement${ids.length === 1 ? '' : 's'} assigned`);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not assign movements');
    } finally {
      setSaving(false);
    }
  };

  const renderAccountOptions = (filter) => accounts
    .filter((account) => account.isActive !== false && isCashOrBank(account) && (!filter || filter(account)))
    .map((account) => <option key={account.id} value={account.id}>{accountName(account)}</option>);

  return (
    <DashboardTemplate headerTitle="Cash & Bank" headerTabs={[]}>
      <main className="books-page">
        {(message || error) && (
          <div className={`books-notice ${error ? 'error' : ''}`}>
            {error || message}
            <button onClick={() => { setError(''); setMessage(''); }} aria-label="Dismiss">×</button>
          </div>
        )}

        <header className="books-toolbar">
          <div>
            <h1>Cash & bank</h1>
            <p>Balances and movements across your cash and bank accounts.</p>
          </div>
          <div className="books-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              hidden
              onChange={handleStatementFile}
            />
            <button className="secondary" type="button" onClick={handleUploadClick} disabled={saving}>
              Upload statement
            </button>
            <button className="secondary" onClick={() => openAccount()}>Manage accounts</button>
            <button className="primary" onClick={() => setEntryForm(emptyEntry())}>+ New entry</button>
          </div>
        </header>

        <nav className="books-tabs" aria-label="Finance views">
          {TYPES.map((item) => (
            <button
              key={item}
              className={activeView === 'book' && type === item ? 'active' : ''}
              onClick={() => { setType(item); setSelectedAccountId(''); setActiveView('book'); }}
            >
              {item === 'CASH' ? 'Cash' : 'Bank'}
            </button>
          ))}
          <button
            className={activeView === 'reconcile' ? 'active' : ''}
            onClick={() => setActiveView('reconcile')}
          >
            Reconcile{unmatchedCredits.length ? ` (${unmatchedCredits.length})` : ''}
          </button>
          <button className={activeView === 'unassigned' ? 'active' : ''} onClick={() => setActiveView('unassigned')}>
            Unassigned{unassigned.length ? ` (${unassigned.length})` : ''}
          </button>
        </nav>

        {activeView === 'book' ? (
          <>
            <section className="account-cards">
              {visibleAccounts.map((account) => (
                <button
                  key={account.id}
                  className={`account-card ${selectedAccountId === account.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAccountId(selectedAccountId === account.id ? '' : account.id)}
                >
                  <span>{accountName(account)}</span>
                  <strong>{money(account.currentBalance ?? account.balance ?? account.openingBalance)}</strong>
                  <small>{account.bankName || account.type}</small>
                  <span className="account-edit" onClick={(event) => { event.stopPropagation(); openAccount(account); }}>Edit</span>
                </button>
              ))}
              {!visibleAccounts.length && !loading && (
                <button className="account-card empty" onClick={() => openAccount()}>
                  <strong>+ Add {type.toLowerCase()} account</strong>
                  <small>Set an opening balance to begin.</small>
                </button>
              )}
            </section>

            <section className="books-ledger">
              <div className="ledger-heading">
                <div>
                  <h2>{selectedAccountId ? accountName(accounts.find((a) => a.id === selectedAccountId)) : `${type} book`}</h2>
                  {selectedAccountId && <button onClick={() => setSelectedAccountId('')}>Show combined book</button>}
                </div>
                <div className="date-filters">
                  <label>From<input type="date" value={dates.dateFrom} onChange={(e) => setDates((d) => ({ ...d, dateFrom: e.target.value }))} /></label>
                  <label>To<input type="date" value={dates.dateTo} onChange={(e) => setDates((d) => ({ ...d, dateTo: e.target.value }))} /></label>
                </div>
              </div>
              <div className="ledger-scroll">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Particulars / Source</th><th>Ref</th><th className="amount">In</th><th className="amount">Out</th><th className="amount">Running balance</th><th /></tr></thead>
                  <tbody>
                    {rows.map((row) => {
                      const incoming = row.in ?? row.credit ?? (row.direction === 'IN' ? row.amount : 0);
                      const outgoing = row.out ?? row.debit ?? (row.direction === 'OUT' ? row.amount : 0);
                      const automatic = Boolean(row.isAutomatic || (row.sourceType && row.sourceType !== 'MANUAL'));
                      return (
                        <tr key={row.id}>
                          <td>{String(row.entryDate || row.date || row.createdAt || '').slice(0, 10) || '—'}</td>
                          <td><span className="entry-type">{row.category || row.type || 'Entry'}</span></td>
                          <td>{row.particulars || row.description || row.source || row.notes || '—'}{automatic && <small className="automatic">Automatic</small>}</td>
                          <td>{row.reference || row.referenceNumber || '—'}</td>
                          <td className="amount in">{incoming ? money(incoming) : '—'}</td>
                          <td className="amount out">{outgoing ? money(outgoing) : '—'}</td>
                          <td className="amount balance">{money(row.runningBalance ?? row.balance)}</td>
                          <td>{!automatic && <button className="delete-entry" onClick={() => removeEntry(row)}>Delete</button>}</td>
                        </tr>
                      );
                    })}
                    {!rows.length && !loading && <tr><td colSpan="8" className="empty-row">No entries in this period.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : activeView === 'reconcile' ? (
          <section className="books-ledger reconcile">
            <div className="unassigned-banner">
              <div>
                <h2>Unmatched bank credits</h2>
                <p>Upload HDFC Delimited (.txt) daily, then confirm invoice matches. Debits are stored but not matched here.</p>
              </div>
              <div className="assign-controls">
                <select
                  value={reconcileAccountId}
                  onChange={(e) => setReconcileAccountId(e.target.value)}
                >
                  <option value="">All bank accounts</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{accountName(account)}</option>
                  ))}
                </select>
                <button className="secondary" type="button" onClick={handleUploadClick} disabled={saving}>
                  Upload statement
                </button>
              </div>
            </div>
            <div className="ledger-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Narration</th>
                    <th>Ref</th>
                    <th className="amount">Credit</th>
                    <th>Suggested invoice</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {unmatchedCredits.map((row) => (
                    <tr key={row.id}>
                      <td>{String(row.txnDate || '').slice(0, 10)}</td>
                      <td className="narration-cell">{row.narration || '—'}</td>
                      <td>{row.refNumber || '—'}</td>
                      <td className="amount in">{money(row.credit)}</td>
                      <td>
                        <select
                          value={selectedMatch[row.id] || ''}
                          onChange={(e) => setSelectedMatch((m) => ({ ...m, [row.id]: e.target.value }))}
                        >
                          <option value="">Select invoice…</option>
                          {(row.suggestions || []).map((suggestion) => (
                            <option key={suggestion.invoiceId} value={suggestion.invoiceId}>
                              {suggestion.invoiceNumber}
                              {' · '}
                              {suggestion.customerName}
                              {' · '}
                              {money(suggestion.remainingBalance)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="reconcile-actions">
                        <button
                          className="primary"
                          type="button"
                          disabled={saving || !(selectedMatch[row.id] || row.suggestions?.[0]?.invoiceId)}
                          onClick={() => confirmCredit(row)}
                        >
                          Confirm
                        </button>
                        <button className="link-button" type="button" disabled={saving} onClick={() => ignoreCredit(row.id)}>
                          Ignore
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!unmatchedCredits.length && (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        No unmatched credits. Upload an HDFC delimited statement to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="books-ledger unassigned">
            <div className="unassigned-banner">
              <div><h2>Historical unassigned movements</h2><p>Choose the account where these imported payments belong.</p></div>
              <div className="assign-controls">
                <select value={assignAccountId} onChange={(e) => setAssignAccountId(e.target.value)}>
                  <option value="">Select account…</option>{renderAccountOptions()}
                </select>
                <button className="primary" disabled={!selectedMovementIds.length || !assignAccountId || saving} onClick={() => assign(selectedMovementIds)}>Assign selected</button>
              </div>
            </div>
            <div className="ledger-scroll">
              <table>
                <thead><tr><th><input type="checkbox" checked={unassigned.length > 0 && selectedMovementIds.length === unassigned.length} onChange={(e) => setSelectedMovementIds(e.target.checked ? unassigned.map((row) => row.id) : [])} /></th><th>Date</th><th>Source</th><th>Mode</th><th>Reference</th><th className="amount">Amount</th><th /></tr></thead>
                <tbody>
                  {unassigned.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" checked={selectedMovementIds.includes(row.id)} onChange={(e) => setSelectedMovementIds((ids) => e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id))} /></td>
                      <td>{String(row.entryDate || row.date || row.createdAt || '').slice(0, 10)}</td>
                      <td>{row.particulars || row.source || row.description || 'Payment'}</td>
                      <td>{row.mode || row.paymentMethod || '—'}</td>
                      <td>{row.reference || row.referenceNumber || '—'}</td>
                      <td className="amount">{money(row.amount)}</td>
                      <td><button className="link-button" disabled={!assignAccountId || saving} onClick={() => assign([row.id])}>Assign</button></td>
                    </tr>
                  ))}
                  {!unassigned.length && <tr><td colSpan="7" className="empty-row">Everything is assigned.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {accountForm && (
          <div className="books-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setAccountForm(null)}>
            <form className="books-modal" onSubmit={saveAccount}>
              <header><div><h2>{editingAccountId ? 'Edit account' : 'New account'}</h2><p>Balances start from the opening date.</p></div><button type="button" onClick={() => setAccountForm(null)}>×</button></header>
              <div className="form-grid">
                <label>Type<select disabled={Boolean(editingAccountId)} value={accountForm.type} onChange={(e) => setAccountForm(emptyAccount(e.target.value))}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Name<input required value={accountForm.name} onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} placeholder="Petty cash / HDFC current" /></label>
                {accountForm.type === 'BANK' && <>
                  <label>Bank name<input value={accountForm.bankName} onChange={(e) => setAccountForm((f) => ({ ...f, bankName: e.target.value }))} /></label>
                  <label>Account number<input value={accountForm.accountNumber} onChange={(e) => setAccountForm((f) => ({ ...f, accountNumber: e.target.value }))} /></label>
                  <label>IFSC<input value={accountForm.ifsc} onChange={(e) => setAccountForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))} /></label>
                </>}
                <label>Opening balance<input type="number" step="0.01" value={accountForm.openingBalance} onChange={(e) => setAccountForm((f) => ({ ...f, openingBalance: e.target.value }))} /></label>
                {!editingAccountId && <label>Opened on<input type="date" value={accountForm.openingDate} onChange={(e) => setAccountForm((f) => ({ ...f, openingDate: e.target.value }))} /></label>}
                <label className="wide">Notes<textarea value={accountForm.notes} onChange={(e) => setAccountForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              </div>
              <footer><button type="button" className="secondary" onClick={() => setAccountForm(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button></footer>
            </form>
          </div>
        )}

        {entryForm && (
          <div className="books-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEntryForm(null)}>
            <form className="books-modal" onSubmit={saveEntry}>
              <header><div><h2>New finance entry</h2><p>Automatic invoice and purchase movements are recorded elsewhere.</p></div><button type="button" onClick={() => setEntryForm(null)}>×</button></header>
              <div className="form-grid">
                <label>Entry type<select value={entryForm.category} onChange={(e) => setEntryForm({ ...emptyEntry(), category: e.target.value })}>{ENTRY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Date<input required type="date" value={entryForm.entryDate} onChange={(e) => setEntryForm((f) => ({ ...f, entryDate: e.target.value }))} /></label>
                {entryForm.category === 'TRANSFER' ? (
                  <>
                    <label>From account<select required value={entryForm.fromAccountId} onChange={(e) => setEntryForm((f) => ({ ...f, fromAccountId: e.target.value }))}><option value="">Select…</option>{renderAccountOptions()}</select></label>
                    <label>To account<select required value={entryForm.toAccountId} onChange={(e) => setEntryForm((f) => ({ ...f, toAccountId: e.target.value }))}><option value="">Select…</option>{renderAccountOptions()}</select></label>
                  </>
                ) : (
                  <label>Account<select required value={entryForm.accountId} onChange={(e) => setEntryForm((f) => ({ ...f, accountId: e.target.value }))}><option value="">Select…</option>{renderAccountOptions()}</select></label>
                )}
                <label>Amount<input required min="0.01" step="0.01" type="number" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} /></label>
                <label>Reference<input value={entryForm.reference} onChange={(e) => setEntryForm((f) => ({ ...f, reference: e.target.value }))} /></label>
                <label className="wide">Notes<textarea value={entryForm.notes} onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              </div>
              <footer><button type="button" className="secondary" onClick={() => setEntryForm(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Record entry'}</button></footer>
            </form>
          </div>
        )}
      </main>
    </DashboardTemplate>
  );
};

export default BooksPage;
