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
  getBankStatementInbox,
  deleteBankStatementLine,
  deleteBankStatementLinesBulk,
  ignoreBankStatementLine,
  matchBankStatementLine,
  matchBankStatementLinesBulk,
  unmatchBankStatementLine,
  updateFinancialAccount,
  uploadBankStatement,
} from '../../services/financeService';
import { clearPaymentAccountCache } from '../../components/molecules/PaymentAccountSelect/PaymentAccountSelect';
import Toast from '../../components/atoms/Toast/Toast';
import { FiCornerUpLeft, FiEyeOff, FiLink, FiTrash2, FiUpload } from 'react-icons/fi';
import {
  bankMatchOptions,
  bulkMatchOptions,
  dayKey,
  dayLabel,
  groupByDay,
  indexByDay,
  inPeriod,
  matchFitTag,
  paymentFillPct,
  paymentOptionLabel,
} from './reconcileHelpers';
import ReconciliationTimeline from './ReconciliationTimeline';
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
  'name', 'bankName', 'accountNumber', 'ifsc', 'notes', 'openingBalance', 'openingDate',
];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentFill = (amount, remaining) => {
  const { linked, amount: amt, pct } = paymentFillPct(amount, remaining);
  return (
    <div className="payment-fill">
      <div className="payment-fill-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="payment-fill-label">{money(linked)} / {money(amt)}</span>
    </div>
  );
};

const fitBadge = (tag) => {
  if (!tag) return null;
  return <span className={`fit-badge fit-badge--${tag.toLowerCase()}`}>{tag}</span>;
};
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
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);
  const [assignAccountId, setAssignAccountId] = useState('');
  const [reconcileAccountId, setReconcileAccountId] = useState('');
  const [unmatchedCredits, setUnmatchedCredits] = useState([]);
  const [unmatchedPayments, setUnmatchedPayments] = useState([]);
  const [linkedCredits, setLinkedCredits] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState({});
  const [bulkMatchPaymentId, setBulkMatchPaymentId] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const [timelineGrain, setTimelineGrain] = useState('day');
  const [timelineMonth, setTimelineMonth] = useState(() => today().slice(0, 7));
  const [accountForm, setAccountForm] = useState(null);
  const [entryForm, setEntryForm] = useState(null);
  const [editingAccountId, setEditingAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
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

  const loadBooksQuiet = useCallback(async () => {
    await Promise.all([loadBook(), loadLedger()]);
  }, [loadBook, loadLedger]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      await Promise.all([loadAccounts(), loadBook(), loadLedger()]);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not load finance books' });
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadBook, loadLedger]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (activeView !== 'unassigned') return;
    getUnassignedMovements()
      .then((data) => setUnassigned(list(data, ['movements', 'entries', 'rows'])))
      .catch((err) => setToast({ type: 'error', message: err.message || 'Could not load unassigned movements' }));
  }, [activeView]);

  const loadUnmatched = useCallback(async (accountId = reconcileAccountId) => {
    const id = accountId || undefined;
    const data = await getBankStatementInbox(id);
    const rows = list(data, ['unmatched']);
    const payments = list(data, ['payments']);
    setUnmatchedCredits(rows);
    setUnmatchedPayments(payments);
    setLinkedCredits(list(data, ['matched']));
    const byDay = indexByDay(payments, 'paidAt');
    setSelectedMatch((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        if (next[row.id]) return;
        const options = bankMatchOptions(
          row.txnDate,
          row.credit,
          row.suggestions,
          byDay.get(dayKey(row.txnDate)) || [],
        );
        if (options[0]?.paymentId) next[row.id] = options[0].paymentId;
      });
      return next;
    });
  }, [reconcileAccountId]);

  useEffect(() => {
    if (activeView !== 'reconcile') return;
    loadUnmatched().catch((err) => setToast({ type: 'error', message: err.message || 'Could not load reconcile inbox' }));
  }, [activeView, loadUnmatched]);

  const bankAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'BANK' && account.isActive !== false),
    [accounts],
  );

  const creditsByDay = useMemo(() => groupByDay(unmatchedCredits, 'txnDate'), [unmatchedCredits]);
  const paymentsByDay = useMemo(() => groupByDay(unmatchedPayments, 'paidAt'), [unmatchedPayments]);
  const linkedByDay = useMemo(() => groupByDay(linkedCredits, 'txnDate'), [linkedCredits]);
  const paymentsIndexByDay = useMemo(() => indexByDay(unmatchedPayments, 'paidAt'), [unmatchedPayments]);
  const selectedCreditIdSet = useMemo(() => new Set(selectedCreditIds), [selectedCreditIds]);
  const matchOptionsByCreditId = useMemo(() => {
    const map = {};
    for (const row of unmatchedCredits) {
      map[row.id] = bankMatchOptions(
        row.txnDate,
        row.credit,
        row.suggestions,
        paymentsIndexByDay.get(dayKey(row.txnDate)) || [],
      );
    }
    return map;
  }, [unmatchedCredits, paymentsIndexByDay]);
  const visibleCreditsByDay = useMemo(
    () => (selectedDayFilter ? creditsByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : creditsByDay),
    [creditsByDay, selectedDayFilter],
  );
  const visiblePaymentsByDay = useMemo(
    () => (selectedDayFilter ? paymentsByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : paymentsByDay),
    [paymentsByDay, selectedDayFilter],
  );
  const visibleLinkedByDay = useMemo(
    () => (selectedDayFilter ? linkedByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : linkedByDay),
    [linkedByDay, selectedDayFilter],
  );
  const visibleUnmatchedCredits = useMemo(
    () => (selectedDayFilter ? unmatchedCredits.filter((row) => inPeriod(row.txnDate, selectedDayFilter)) : unmatchedCredits),
    [unmatchedCredits, selectedDayFilter],
  );
  const periodLabel = selectedDayFilter?.label
    || (selectedDayFilter?.start === selectedDayFilter?.end
      ? dayLabel(selectedDayFilter?.start)
      : `${dayLabel(selectedDayFilter?.start)} – ${dayLabel(selectedDayFilter?.end)}`);

  const setDayFilter = (period) => {
    setSelectedDayFilter(period);
    if (period?.start) setTimelineMonth(period.start.slice(0, 7));
    setSelectedCreditIds((ids) => {
      if (!period) return ids;
      const keep = new Set(unmatchedCredits.filter((row) => inPeriod(row.txnDate, period)).map((row) => row.id));
      return ids.filter((id) => keep.has(id));
    });
  };

  const setGrain = (grain) => {
    setTimelineGrain(grain);
    setSelectedDayFilter(null);
  };

  const bulkSelection = useMemo(() => {
    if (selectedCreditIds.length < 2) return null;
    const selected = unmatchedCredits.filter((row) => selectedCreditIdSet.has(row.id));
    if (selected.length < 2) return null;
    const day = dayKey(selected[0].txnDate);
    if (selected.some((row) => dayKey(row.txnDate) !== day)) {
      return { mixedDay: true, selected, sum: 0, candidates: [], preferredId: '' };
    }
    const sum = selected.reduce((total, row) => total + Number(row.credit || 0), 0);
    const candidates = bulkMatchOptions(
      paymentsIndexByDay.get(day) || [],
      sum,
      selected[0].txnDate,
    );
    const preferredId = candidates.find((row) => row.completes)?.paymentId || candidates[0]?.paymentId || '';
    return { mixedDay: false, selected, sum, candidates, preferredId };
  }, [selectedCreditIds, selectedCreditIdSet, unmatchedCredits, paymentsIndexByDay]);

  const bulkSelectedId = bulkSelection?.candidates.some((row) => row.paymentId === bulkMatchPaymentId)
    ? bulkMatchPaymentId
    : (bulkSelection?.preferredId || '');
  const bulkSelectedPayment = bulkSelection?.candidates.find((row) => row.paymentId === bulkSelectedId);

  useEffect(() => {
    setBulkMatchPaymentId(bulkSelection?.preferredId || '');
  }, [bulkSelection?.preferredId, selectedCreditIds]);

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => account.type === type && account.isActive !== false),
    [accounts, type],
  );
  const rows = selectedAccountId ? ledgerRows : bookRows;

  const openAccount = (account) => {
    if (account) {
      setEditingAccountId(account.id);
      setAccountForm({
        ...emptyAccount(account.type),
        ...account,
        openingBalance: account.openingBalance ?? '',
        openingDate: account.openingDate
          ? String(account.openingDate).slice(0, 10)
          : today(),
      });
    } else {
      setEditingAccountId('');
      setAccountForm(emptyAccount(type));
    }
  };

  const handleUploadClick = () => {
    const accountId = reconcileAccountId || selectedAccountId || bankAccounts[0]?.id;
    if (!accountId) {
      setToast({ type: 'error', message: 'Create or select a bank account before uploading a statement' });
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
      setToast({ type: 'error', message: 'Create or select a bank account before uploading a statement' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const result = await uploadBankStatement(accountId, file);
      setReconcileAccountId(accountId);
      setActiveView('reconcile');
      setToast({
        type: 'success',
        message:
        `Imported ${result.imported ?? 0} new rows`
        + ` (${result.skipped ?? 0} duplicates skipped)`
        + ` — ${result.credits ?? 0} credits / ${result.debits ?? 0} debits`,
      });
      await loadUnmatched(accountId);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not upload statement' });
    } finally {
      setSaving(false);
    }
  };

  const ignoreCredit = async (lineId) => {
    setSaving(true);
    setToast(null);
    try {
      await ignoreBankStatementLine(lineId);
      setUnmatchedCredits((rows) => rows.filter((row) => row.id !== lineId));
      setToast({ type: 'success', message: 'Credit ignored' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not ignore line' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCredit = async (lineId) => {
    if (!window.confirm('Delete this statement line? This cannot be undone.')) return;
    setSaving(true);
    setToast(null);
    try {
      await deleteBankStatementLine(lineId);
      setUnmatchedCredits((rows) => rows.filter((row) => row.id !== lineId));
      setSelectedCreditIds((ids) => ids.filter((id) => id !== lineId));
      setToast({ type: 'success', message: 'Statement line deleted' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not delete line' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedCredits = async () => {
    const ids = selectedCreditIds;
    if (!ids.length) return;
    const label = `${ids.length} statement line${ids.length === 1 ? '' : 's'}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setSaving(true);
    setToast(null);
    try {
      await deleteBankStatementLinesBulk(ids);
      setUnmatchedCredits((rows) => rows.filter((row) => !ids.includes(row.id)));
      setSelectedCreditIds([]);
      setToast({ type: 'success', message: `Deleted ${ids.length} statement line${ids.length === 1 ? '' : 's'}` });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not delete selected lines' });
      await loadUnmatched();
      setSelectedCreditIds([]);
    } finally {
      setSaving(false);
    }
  };

  const unlinkCredit = async (lineId) => {
    if (!window.confirm('Unlink this matched credit? The payment will show as unmatched again.')) return;
    setSaving(true);
    setToast(null);
    try {
      await unmatchBankStatementLine(lineId);
      setLinkedCredits((rows) => rows.filter((row) => row.id !== lineId));
      setToast({ type: 'success', message: 'Credit unlinked' });
      await loadUnmatched();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not unlink credit' });
    } finally {
      setSaving(false);
    }
  };

  const confirmCredit = async (line) => {
    const options = matchOptionsByCreditId[line.id] || [];
    const paymentId = selectedMatch[line.id] || options[0]?.paymentId;
    if (!paymentId) {
      setToast({
        type: 'error',
        message: 'Pick a same-day booked payment before confirming',
      });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const result = await matchBankStatementLine(line.id, paymentId);
      const remaining = Number(result?.payment?.remaining ?? 0);
      setToast({
        type: 'success',
        message: remaining > 1
          ? `Linked ${money(line.credit)} → ${result?.payment?.invoiceNumber || 'payment'} (${money(remaining)} still open on payment)`
          : `Linked ${money(line.credit)} → ${result?.payment?.invoiceNumber || 'payment'}`,
      });
      setSelectedCreditIds((ids) => ids.filter((id) => id !== line.id));
      await Promise.all([loadUnmatched(), loadBooksQuiet()]);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not link payment' });
    } finally {
      setSaving(false);
    }
  };

  const linkSelectedCredits = async () => {
    const ids = selectedCreditIds;
    const selected = unmatchedCredits.filter((row) => selectedCreditIdSet.has(row.id));
    if (selected.length < 2) {
      setToast({ type: 'error', message: 'Select at least two credits to link as a split' });
      return;
    }
    const day = dayKey(selected[0].txnDate);
    if (selected.some((row) => dayKey(row.txnDate) !== day)) {
      setToast({ type: 'error', message: 'Selected credits must be on the same day' });
      return;
    }
    const sum = selected.reduce((total, row) => total + Number(row.credit || 0), 0);
    const candidates = bulkSelection?.candidates?.length
      ? bulkSelection.candidates
      : bulkMatchOptions(unmatchedPayments, sum, selected[0].txnDate);
    if (!candidates.length) {
      setToast({
        type: 'error',
        message: `No same-day payment with enough remaining for ${money(sum)}`,
      });
      return;
    }
    const paymentId = bulkSelectedId || candidates[0].paymentId;
    if (!candidates.some((c) => c.paymentId === paymentId)) {
      setToast({ type: 'error', message: 'Pick a same-day payment that can absorb the selected credits' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const result = await matchBankStatementLinesBulk(ids, paymentId);
      setSelectedCreditIds([]);
      setBulkMatchPaymentId('');
      setToast({
        type: 'success',
        message: `Linked ${selected.length} credits (${money(sum)}) → ${result?.payment?.invoiceNumber || 'payment'}`,
      });
      await Promise.all([loadUnmatched(), loadBooksQuiet()]);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not link selected credits' });
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const fields = editingAccountId ? UPDATE_ACCOUNT_FIELDS : CREATE_ACCOUNT_FIELDS;
      const payload = Object.fromEntries(fields
        .filter((key) => accountForm[key] !== '' && accountForm[key] != null)
        .map((key) => [
          key,
          key === 'openingBalance' ? Number(accountForm[key]) : accountForm[key],
        ]));
      if (editingAccountId) await updateFinancialAccount(editingAccountId, payload);
      else await createFinancialAccount(payload);
      clearPaymentAccountCache();
      setAccountForm(null);
      setToast({ type: 'success', message: editingAccountId ? 'Account updated' : 'Account created' });
      await refresh();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not save account' });
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
    setToast(null);
    try {
      await createFinanceTransaction(entryPayload());
      setEntryForm(null);
      setToast({ type: 'success', message: 'Entry recorded' });
      await refresh();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not record entry' });
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
      setToast({ type: 'error', message: err.message || 'Could not delete entry' });
    }
  };

  const assign = async (ids) => {
    if (!ids.length || !assignAccountId) return;
    setSaving(true);
    try {
      await assignUnassignedMovements(ids, assignAccountId);
      setUnassigned((current) => current.filter((row) => !ids.includes(row.id)));
      setSelectedMovementIds([]);
      setToast({ type: 'success', message: `${ids.length} movement${ids.length === 1 ? '' : 's'} assigned` });
      await refresh();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not assign movements' });
    } finally {
      setSaving(false);
    }
  };

  const renderAccountOptions = (filter) => accounts
    .filter((account) => account.isActive !== false && isCashOrBank(account) && (!filter || filter(account)))
    .map((account) => <option key={account.id} value={account.id}>{accountName(account)}</option>);

  return (
    <DashboardTemplate headerTitle="Cash & Bank" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <main className="books-page">

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
          <div className="books-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              hidden
              onChange={handleStatementFile}
            />
            <button className="secondary" onClick={() => openAccount()}>Manage accounts</button>
            <button className="primary" onClick={() => setEntryForm(emptyEntry())}>+ New entry</button>
          </div>
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
                <h2>Month-end bank check</h2>
              </div>
              <div className="reconcile-toolbar">
                <div className="reconcile-toolbar-filters">
                  <select
                    className="reconcile-select"
                    value={reconcileAccountId}
                    onChange={(e) => {
                      setReconcileAccountId(e.target.value);
                      setSelectedCreditIds([]);
                      setBulkMatchPaymentId('');
                    }}
                  >
                    <option value="">All bank accounts</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{accountName(account)}</option>
                    ))}
                  </select>

                  <button
                    className="reconcile-btn reconcile-btn--delete"
                    type="button"
                    disabled={!selectedCreditIds.length || saving}
                    onClick={deleteSelectedCredits}
                    title="Delete selected credits"
                  >
                    <FiTrash2 size={15} aria-hidden />
                    {selectedCreditIds.length ? `Delete (${selectedCreditIds.length})` : 'Delete'}
                  </button>
                  <button
                    className="reconcile-btn reconcile-btn--upload"
                    type="button"
                    onClick={handleUploadClick}
                    disabled={saving}
                  >
                    <FiUpload size={15} aria-hidden />
                    Upload Bank Statement
                  </button>
                  {bulkSelection && !bulkSelection.mixedDay && (
                      <div className="reconcile-bulk">
                        <div className="reconcile-pick">
                          <select
                            className="reconcile-select reconcile-select--wide"
                            value={bulkSelectedId}
                            onChange={(e) => setBulkMatchPaymentId(e.target.value)}
                            disabled={!bulkSelection.candidates.length}
                          >
                            {!bulkSelection.candidates.length && (
                              <option value="">No payment with remaining ≥ {money(bulkSelection.sum)}</option>
                            )}
                            {bulkSelection.candidates.map((option) => (
                              <option key={option.paymentId} value={option.paymentId}>
                                {paymentOptionLabel(option, bulkSelection.sum)}
                              </option>
                            ))}
                          </select>
                          {fitBadge(bulkSelectedPayment?.fit)}
                        </div>
                        <button
                          className="reconcile-btn reconcile-btn--link"
                          type="button"
                          disabled={saving || !bulkSelection.candidates.length}
                          onClick={linkSelectedCredits}
                        >
                          <FiLink size={15} aria-hidden />
                          Link {money(bulkSelection.sum)}
                        </button>
                      </div>
                  )}
                </div>
              </div>
            </div>
            <ReconciliationTimeline
              grain={timelineGrain}
              onGrainChange={setGrain}
              anchor={timelineMonth}
              onAnchorChange={setTimelineMonth}
              selectedPeriod={selectedDayFilter}
              onSelectPeriod={setDayFilter}
              unmatchedCredits={unmatchedCredits}
              linkedCredits={linkedCredits}
            />
            <div className="ledger-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={visibleUnmatchedCredits.length > 0 && selectedCreditIds.length === visibleUnmatchedCredits.length}
                        onChange={(e) => setSelectedCreditIds(
                          e.target.checked ? visibleUnmatchedCredits.map((row) => row.id) : [],
                        )}
                      />
                    </th>
                    <th>Narration</th>
                    <th>Ref</th>
                    <th className="amount">Credit</th>
                    <th>Booked payment</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleCreditsByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={6}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => {
                        const options = matchOptionsByCreditId[row.id] || [];
                        const defaultPaymentId = selectedMatch[row.id] || options[0]?.paymentId || '';
                        const selectedOption = options.find((option) => option.paymentId === defaultPaymentId);
                        return (
                          <tr key={row.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedCreditIdSet.has(row.id)}
                                onChange={(e) => setSelectedCreditIds((ids) => (
                                  e.target.checked ? [...ids, row.id] : ids.filter((id) => id !== row.id)
                                ))}
                              />
                            </td>
                            <td className="narration-cell">{row.narration || '—'}</td>
                            <td>{row.refNumber || '—'}</td>
                            <td className="amount in">{money(row.credit)}</td>
                            <td>
                              <div className="reconcile-pick">
                                <select
                                  value={defaultPaymentId}
                                  onChange={(e) => setSelectedMatch((m) => ({ ...m, [row.id]: e.target.value }))}
                                >
                                  <option value="">
                                    {options.length ? 'Select payment…' : 'No same-day payment'}
                                  </option>
                                  {options.map((option) => (
                                    <option key={option.paymentId} value={option.paymentId}>
                                      {paymentOptionLabel(option, row.credit)}
                                    </option>
                                  ))}
                                </select>
                                {fitBadge(selectedOption?.fit || matchFitTag(row.credit, selectedOption))}
                              </div>
                            </td>
                            <td className="reconcile-actions">
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--link"
                                type="button"
                                disabled={saving || !defaultPaymentId}
                                onClick={() => confirmCredit(row)}
                              >
                                <FiLink size={13} aria-hidden />
                                Link
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost"
                                type="button"
                                disabled={saving}
                                onClick={() => ignoreCredit(row.id)}
                              >
                                <FiEyeOff size={13} aria-hidden />
                                Ignore
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost-danger"
                                type="button"
                                disabled={saving}
                                onClick={() => deleteCredit(row.id)}
                                title="Delete line"
                              >
                                <FiTrash2 size={13} aria-hidden />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {!visibleCreditsByDay.length && (
                    <tr>
                      <td colSpan="6" className="empty-row">
                        {selectedDayFilter
                          ? `No unmatched bank credits on ${periodLabel}.`
                          : 'No unmatched bank credits. Upload an HDFC delimited statement to begin.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="unassigned-banner" style={{ marginTop: 24 }}>
              <div>
                <h2>Booked payments not fully on statement yet</h2>
                <p>
                  Non-cash payments with remaining amount to link. Same-day bank credits can fill
                  a larger payment in pieces (splits).
                </p>
              </div>
            </div>
            <div className="ledger-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Mode</th>
                    <th>Ref</th>
                    <th className="amount">Amount</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePaymentsByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={7}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => (
                        <tr key={row.paymentId}>
                          <td>{row.invoiceNumber || '—'}</td>
                          <td>{row.customerName || '—'}</td>
                          <td>{row.mode || '—'}</td>
                          <td>{row.reference || '—'}</td>
                          <td className="amount">{money(row.amount)}</td>
                          <td>{paymentFill(row.amount, row.remaining)}</td>
                          <td>{row.invoiceStatus || '—'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {!visiblePaymentsByDay.length && (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        {selectedDayFilter
                          ? `No open booked payments on ${periodLabel}.`
                          : 'All recent non-cash payments are fully linked, or none exist yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="unassigned-banner" style={{ marginTop: 24 }}>
              <div>
                <h2>Linked{visibleLinkedByDay.reduce((n, block) => n + block.rows.length, 0) ? ` (${visibleLinkedByDay.reduce((n, block) => n + block.rows.length, 0)})` : ''}</h2>
                <p>Statement credits already matched to booked invoice payments.</p>
              </div>
            </div>
            <div className="ledger-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Narration</th>
                    <th>Bank ref</th>
                    <th className="amount">Credit</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Mode</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleLinkedByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={7}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="narration-cell">{row.narration || '—'}</td>
                          <td>{row.refNumber || '—'}</td>
                          <td className="amount in">{money(row.credit)}</td>
                          <td>
                            <span className="linked-invoice">{row.invoiceNumber || '—'}</span>
                            {row.invoiceStatus ? <small className="automatic">{row.invoiceStatus}</small> : null}
                          </td>
                          <td>{row.customerName || '—'}</td>
                          <td>{row.mode || '—'}</td>
                          <td className="reconcile-actions">
                            <button
                              className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost"
                              type="button"
                              disabled={saving}
                              onClick={() => unlinkCredit(row.id)}
                            >
                              <FiCornerUpLeft size={13} aria-hidden />
                              Unlink
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {!visibleLinkedByDay.length && (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        {selectedDayFilter
                          ? `No linked credits on ${periodLabel}.`
                          : 'No linked credits yet. Link a bank credit above to see it here.'}
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
                <label>Opened on<input type="date" value={accountForm.openingDate} onChange={(e) => setAccountForm((f) => ({ ...f, openingDate: e.target.value }))} /></label>
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
