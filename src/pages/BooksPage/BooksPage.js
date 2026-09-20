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
  backfillFinanceBooks,
  getBankStatementInbox,
  deleteBankStatementLine,
  deleteBankStatementLinesBulk,
  ignoreBankStatementLine,
  matchBankStatementLine,
  matchBankStatementLinesBulk,
  createAndMatchBankStatementLine,
  unmatchBankStatementLine,
  updateFinancialAccount,
  uploadBankStatement,
} from '../../services/financeService';
import { clearPaymentAccountCache } from '../../components/molecules/PaymentAccountSelect/PaymentAccountSelect';
import { usePermission } from '../../hooks/usePermission';
import Toast from '../../components/atoms/Toast/Toast';
import Icon from '../../components/atoms/Icon/Icon';
import DateRangeFilter, { parseLocalYmd, toLocalYmd } from '../../components/molecules/DateRangeFilter/DateRangeFilter';
import DatePicker from '../../components/molecules/DatePicker/DatePicker';
import AdvancePanel from '../../components/organisms/AdvancePanel/AdvancePanel';
import {
  bankMatchOptions,
  bulkMatchOptions,
  CREATE_CASH_DEPOSIT,
  CREATE_LOAN,
  CREATE_ADVANCE,
  CREATE_MONEY_OUT,
  CREATE_MATCH_OPTIONS,
  CREATE_DEBIT_OPTIONS,
  dayKey,
  dayLabel,
  groupByDay,
  indexByDay,
  inPeriod,
  isCreateMatchId,
  matchFitTag,
  matchKindOf,
  paymentFillPct,
  paymentOptionLabel,
  RECONCILE_SIDES,
} from './reconcileHelpers';
import { buildManualEntryPayload, ENTRY_TYPES, ledgerTypeLabel } from './entryPayload';
import ReconciliationTimeline from './ReconciliationTimeline';
import './BooksPage.css';

const TYPES = ['CASH', 'BANK'];
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
  if (!tag || tag === 'Exact') return null;
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
  const [unmatchedDebits, setUnmatchedDebits] = useState([]);
  const [unmatchedPayments, setUnmatchedPayments] = useState([]);
  const [unmatchedPaymentsOut, setUnmatchedPaymentsOut] = useState([]);
  const [linkedCredits, setLinkedCredits] = useState([]);
  const [linkedDebits, setLinkedDebits] = useState([]);
  const [reconcileSide, setReconcileSide] = useState('credit');
  const [selectedMatch, setSelectedMatch] = useState({});
  const [selectedDebitMatch, setSelectedDebitMatch] = useState({});
  const [advanceMatchLine, setAdvanceMatchLine] = useState(null);
  const [bulkMatchPaymentId, setBulkMatchPaymentId] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const [timelineGrain, setTimelineGrain] = useState('day');
  const [timelineMonth, setTimelineMonth] = useState(() => today().slice(0, 7));
  const [accountForm, setAccountForm] = useState(null);
  const [entryForm, setEntryForm] = useState(null);
  const [editingAccountId, setEditingAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyLineIds, setBusyLineIds] = useState(() => new Set());
  const [backfilling, setBackfilling] = useState(false);
  const [toast, setToast] = useState(null);
  const { can } = usePermission();
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

  // Callers fire this without awaiting, so it must surface its own failures.
  const loadBooksQuiet = useCallback(async () => {
    try {
      await Promise.all([loadBook(), loadLedger()]);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not refresh finance books' });
    }
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
    const debitRows = list(data, ['unmatchedDebits']);
    const payments = list(data, ['payments']);
    const paymentsOut = list(data, ['paymentsOut']);
    setUnmatchedCredits(rows);
    setUnmatchedDebits(debitRows);
    setUnmatchedPayments(payments);
    setUnmatchedPaymentsOut(paymentsOut);
    setLinkedCredits(list(data, ['matched']));
    setLinkedDebits(list(data, ['matchedDebits']));
    const byDay = indexByDay(payments, 'paidAt');
    const debitsByDay = indexByDay(paymentsOut, 'paidAt');
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
    setSelectedDebitMatch((prev) => {
      const next = { ...prev };
      debitRows.forEach((row) => {
        if (next[row.id]) return;
        const options = bankMatchOptions(
          row.txnDate,
          row.debit,
          row.suggestions,
          debitsByDay.get(dayKey(row.txnDate)) || [],
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
  const defaultCashId = useMemo(() => {
    const cash = accounts.filter((account) => account.type === 'CASH' && account.isActive !== false);
    return cash.find((account) => account.isDefault)?.id || cash[0]?.id || undefined;
  }, [accounts]);

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
  const paymentsOutIndexByDay = useMemo(() => indexByDay(unmatchedPaymentsOut, 'paidAt'), [unmatchedPaymentsOut]);
  const debitsByDay = useMemo(() => groupByDay(unmatchedDebits, 'txnDate'), [unmatchedDebits]);
  const paymentsOutByDay = useMemo(() => groupByDay(unmatchedPaymentsOut, 'paidAt'), [unmatchedPaymentsOut]);
  const linkedDebitsByDay = useMemo(() => groupByDay(linkedDebits, 'txnDate'), [linkedDebits]);
  const matchOptionsByDebitId = useMemo(() => {
    const map = {};
    for (const row of unmatchedDebits) {
      map[row.id] = bankMatchOptions(
        row.txnDate,
        row.debit,
        row.suggestions,
        paymentsOutIndexByDay.get(dayKey(row.txnDate)) || [],
      );
    }
    return map;
  }, [unmatchedDebits, paymentsOutIndexByDay]);
  const visibleDebitsByDay = useMemo(
    () => (selectedDayFilter ? debitsByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : debitsByDay),
    [debitsByDay, selectedDayFilter],
  );
  const visiblePaymentsOutByDay = useMemo(
    () => (selectedDayFilter ? paymentsOutByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : paymentsOutByDay),
    [paymentsOutByDay, selectedDayFilter],
  );
  const visibleLinkedDebitsByDay = useMemo(
    () => (selectedDayFilter ? linkedDebitsByDay.filter((block) => inPeriod(block.dayKey, selectedDayFilter)) : linkedDebitsByDay),
    [linkedDebitsByDay, selectedDayFilter],
  );
  const sideMeta = RECONCILE_SIDES[reconcileSide];
  const activeUnmatched = reconcileSide === 'credit' ? unmatchedCredits : unmatchedDebits;
  const activeLinked = reconcileSide === 'credit' ? linkedCredits : linkedDebits;
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

  const setLineBusy = (lineId, busy) => {
    setBusyLineIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  };

  const dropLine = (lineId) => {
    setUnmatchedCredits((rows) => rows.filter((row) => row.id !== lineId));
    setUnmatchedDebits((rows) => rows.filter((row) => row.id !== lineId));
    setSelectedCreditIds((ids) => ids.filter((id) => id !== lineId));
  };

  const ignoreLine = async (lineId) => {
    if (busyLineIds.has(lineId)) return;
    setLineBusy(lineId, true);
    setToast(null);
    try {
      await ignoreBankStatementLine(lineId);
      dropLine(lineId);
      setToast({ type: 'success', message: 'Statement line ignored' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not ignore line' });
    } finally {
      setLineBusy(lineId, false);
    }
  };

  const deleteLine = async (lineId) => {
    if (busyLineIds.has(lineId)) return;
    if (!window.confirm('Delete this statement line? This cannot be undone.')) return;
    setLineBusy(lineId, true);
    setToast(null);
    try {
      await deleteBankStatementLine(lineId);
      dropLine(lineId);
      setToast({ type: 'success', message: 'Statement line deleted' });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not delete line' });
    } finally {
      setLineBusy(lineId, false);
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
        message: 'Pick a same-day booked payment, or create a loan / cash deposit / advance',
      });
      return;
    }
    if (paymentId === CREATE_ADVANCE) {
      setAdvanceMatchLine(line);
      return;
    }
    if (busyLineIds.has(line.id)) return;
    setLineBusy(line.id, true);
    setToast(null);
    setUnmatchedCredits((rows) => rows.filter((row) => row.id !== line.id));
    setSelectedCreditIds((ids) => ids.filter((id) => id !== line.id));
    try {
      const createKind = paymentId === CREATE_LOAN
        ? 'LOAN'
        : paymentId === CREATE_CASH_DEPOSIT
          ? 'CASH_DEPOSIT'
          : null;
      const result = isCreateMatchId(paymentId)
        ? await createAndMatchBankStatementLine(line.id, {
            kind: createKind,
            fromAccountId: defaultCashId,
          })
        : await matchBankStatementLine(
          line.id,
          paymentId,
          matchKindOf(options.find((option) => option.paymentId === paymentId)),
        );
      const remaining = Number(result?.payment?.remaining ?? 0);
      if (result?.payment) {
        setUnmatchedPayments((rows) =>
          rows
            .map((row) => (
              (row.paymentId || row.id) === result.payment.id ? { ...row, remaining } : row
            ))
            .filter((row) => Number(row.remaining) > 1),
        );
      }
      const linkedTo = result?.payment?.invoiceNumber || 'entry';
      setToast({
        type: 'success',
        message: remaining > 1
          ? `Linked ${money(line.credit)} → ${linkedTo} (${money(remaining)} still open)`
          : `Linked ${money(line.credit)} → ${linkedTo}`,
      });
      loadBooksQuiet();
    } catch (err) {
      setUnmatchedCredits((rows) =>
        rows.some((row) => row.id === line.id) ? rows : [...rows, line],
      );
      setToast({ type: 'error', message: err.message || 'Could not link payment' });
    } finally {
      setLineBusy(line.id, false);
    }
  };

  const confirmDebit = async (line) => {
    const options = matchOptionsByDebitId[line.id] || [];
    const paymentId = selectedDebitMatch[line.id] || options[0]?.paymentId;
    if (!paymentId) {
      setToast({
        type: 'error',
        message: 'Pick a same-day entry, or create money out / loan return',
      });
      return;
    }
    if (busyLineIds.has(line.id)) return;
    setLineBusy(line.id, true);
    setToast(null);
    setUnmatchedDebits((rows) => rows.filter((row) => row.id !== line.id));
    try {
      const createKind = paymentId === CREATE_LOAN
        ? 'LOAN'
        : paymentId === CREATE_MONEY_OUT
          ? 'MONEY_OUT'
          : null;
      const result = createKind
        ? await createAndMatchBankStatementLine(line.id, { kind: createKind })
        : await matchBankStatementLine(
            line.id,
            paymentId,
            matchKindOf(options.find((option) => option.paymentId === paymentId)),
          );

      const remaining = Number(result?.payment?.remaining ?? 0);
      if (result?.payment) {
        setUnmatchedPaymentsOut((rows) =>
          rows
            .map((row) => ((row.paymentId || row.id) === result.payment.id ? { ...row, remaining } : row))
            .filter((row) => Number(row.remaining) > 1),
        );
      }

      const linkedTo = result?.payment?.invoiceNumber || 'payment';
      setToast({
        type: 'success',
        message: remaining > 1
          ? `Linked ${money(line.debit)} → ${linkedTo} (${money(remaining)} still open)`
          : `Linked ${money(line.debit)} → ${linkedTo}`,
      });
      loadBooksQuiet();
      await loadUnmatched();
    } catch (err) {
      setUnmatchedDebits((rows) =>
        rows.some((row) => row.id === line.id) ? rows : [...rows, line],
      );
      setToast({ type: 'error', message: err.message || 'Could not link debit' });
    } finally {
      setLineBusy(line.id, false);
    }
  };

  const unlinkDebit = async (lineId) => {
    if (!window.confirm('Unlink this matched debit? The purchase payment will show as unmatched again.')) return;
    setSaving(true);
    setToast(null);
    try {
      await unmatchBankStatementLine(lineId);
      setLinkedDebits((rows) => rows.filter((row) => row.id !== lineId));
      setToast({ type: 'success', message: 'Debit unlinked' });
      await loadUnmatched();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not unlink debit' });
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
    const selectedCandidate = candidates.find((c) => c.paymentId === paymentId);
    setSaving(true);
    setToast(null);
    try {
      const result = await matchBankStatementLinesBulk(ids, paymentId, matchKindOf(selectedCandidate));
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

  const saveEntry = async (event) => {
    event.preventDefault();
    if (!Number(entryForm.amount)) return;
    setSaving(true);
    setToast(null);
    try {
      await createFinanceTransaction(buildManualEntryPayload(entryForm, accounts));
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

  const runBackfill = async () => {
    if (backfilling) return;
    const ok = window.confirm(
      'Post existing invoice, purchase, advance, and udhar payments into this shop’s Cash & Bank book? Safe to run more than once.',
    );
    if (!ok) return;
    setBackfilling(true);
    setToast(null);
    try {
      const result = await backfillFinanceBooks();
      const total =
        Number(result?.invoicePayments || 0) +
        Number(result?.purchasePayments || 0) +
        Number(result?.advanceEntries || 0) +
        Number(result?.udharPayments || 0);
      setToast({
        type: 'success',
        message: total
          ? `Books updated from ${total} existing payments`
          : 'No payments found to post into Cash & Bank',
      });
      await refresh();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Could not backfill Cash & Bank' });
    } finally {
      setBackfilling(false);
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
            Reconcile{(unmatchedCredits.length + unmatchedDebits.length)
              ? ` (${unmatchedCredits.length + unmatchedDebits.length})`
              : ''}
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
            {can('admin') && (
              <button className="secondary" disabled={backfilling} onClick={runBackfill}>
                {backfilling ? 'Updating books…' : 'Load past payments'}
              </button>
            )}
            <button className="primary" onClick={() => setEntryForm(emptyEntry())}>+ New entry</button>
          </div>
        </nav>

        {activeView === 'book' ? (
          <>
            <section className="account-cards">
              {visibleAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`account-card ${selectedAccountId === account.id ? 'selected' : ''}`}
                >
                  <button
                    type="button"
                    className="account-card-select"
                    onClick={() => setSelectedAccountId(selectedAccountId === account.id ? '' : account.id)}
                  >
                    <span>{accountName(account)}</span>
                    <strong>{money(account.currentBalance ?? account.balance ?? account.openingBalance)}</strong>
                    <small>{account.bankName || account.type}</small>
                  </button>
                  <button
                    type="button"
                    className="account-edit"
                    onClick={(event) => { event.stopPropagation(); openAccount(account); }}
                  >
                    Edit
                  </button>
                </div>
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
                  <DateRangeFilter
                    label="Period"
                    icon={<Icon name="date" size={14} />}
                    align="right"
                    start={parseLocalYmd(dates.dateFrom)}
                    end={parseLocalYmd(dates.dateTo)}
                    onChange={(s, e) => setDates({
                      dateFrom: toLocalYmd(s) || '',
                      dateTo: toLocalYmd(e) || '',
                    })}
                  />
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
                          <td><span className="entry-type">{ledgerTypeLabel(row)}</span></td>
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
            <div className="reconcile-header">
              <div className="reconcile-header-top">
                <div className="reconcile-header-title">
                  <h2>Bank reconcile</h2>
                  <p className="reconcile-header-stats">
                    <span>{unmatchedCredits.length + unmatchedDebits.length} open</span>
                    <span className="reconcile-header-stat-sep" aria-hidden>·</span>
                    <span>{linkedCredits.length + linkedDebits.length} linked</span>
                  </p>
                </div>
                <div className="reconcile-header-actions">
                  <div className="reconcile-header-controls">
                    <label className="reconcile-field reconcile-field--inline">
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
                    </label>

                    {reconcileSide === 'credit' && (
                      <button
                        className="reconcile-btn reconcile-btn--delete"
                        type="button"
                        disabled={!selectedCreditIds.length || saving}
                        onClick={deleteSelectedCredits}
                        title="Delete selected credits"
                      >
                        <Icon name="delete" size={15} aria-hidden />
                        {selectedCreditIds.length ? `Delete (${selectedCreditIds.length})` : 'Delete'}
                      </button>
                    )}
                    <button
                      className="reconcile-btn reconcile-btn--upload"
                      type="button"
                      onClick={handleUploadClick}
                      disabled={saving}
                    >
                      <Icon name="upload" size={15} aria-hidden />
                      Upload statement
                    </button>
                  </div>
                  <div className="reconcile-segment" role="tablist" aria-label="Statement direction">
                    {Object.values(RECONCILE_SIDES).map((side) => {
                      const count = side.key === 'credit' ? unmatchedCredits.length : unmatchedDebits.length;
                      const iconName = side.key === 'credit' ? 'arrowDownLeft' : 'arrowUpRight';
                      return (
                        <button
                          key={side.key}
                          type="button"
                          role="tab"
                          aria-selected={reconcileSide === side.key}
                          className={`reconcile-segment-btn reconcile-segment-btn--${side.key}${reconcileSide === side.key ? ' is-active' : ''}`}
                          onClick={() => setReconcileSide(side.key)}
                        >
                          <Icon name={iconName} size={15} aria-hidden className="reconcile-segment-icon" />
                          <span className="reconcile-segment-label">{side.label}</span>
                          {count > 0 && (
                            <span className="reconcile-segment-badge">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {reconcileSide === 'credit' && bulkSelection && !bulkSelection.mixedDay && (
                <div className="reconcile-header-bulk">
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
                      <Icon name="link" size={15} aria-hidden />
                      Link {money(bulkSelection.sum)}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <ReconciliationTimeline
              grain={timelineGrain}
              onGrainChange={setGrain}
              anchor={timelineMonth}
              onAnchorChange={setTimelineMonth}
              selectedPeriod={selectedDayFilter}
              onSelectPeriod={setDayFilter}
              unmatchedLines={activeUnmatched}
              linkedLines={activeLinked}
            />
            <div className="reconcile-section-head">
              <div>
                <h3>Unmatched {sideMeta.label.toLowerCase()}</h3>
                <p>Same-day matches appear first. Extra bank amount is allowed; shortfall up to ₹10.</p>
              </div>
              <span className="reconcile-section-count">{activeUnmatched.length}</span>
            </div>
            <div className="ledger-scroll reconcile-table-wrap">
              {reconcileSide === 'credit' ? (
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
                    <th className="amount">{sideMeta.label}</th>
                    <th>{sideMeta.matchLabel}</th>
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
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedMatch((m) => ({ ...m, [row.id]: value }));
                                    if (value === CREATE_ADVANCE) setAdvanceMatchLine(row);
                                  }}
                                  aria-label="Match this credit"
                                >
                                  <option value="">
                                    {options.length ? 'Choose match…' : 'No same-day receipt — create one below'}
                                  </option>
                                  <optgroup label="Create & link">
                                    {CREATE_MATCH_OPTIONS.map((option) => (
                                      <option key={option.paymentId} value={option.paymentId} title={option.hint}>
                                        {option.label} — {option.hint}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {options.length > 0 && (
                                    <optgroup label={options.some((o) => o.suggested) ? 'Suggested & same day' : 'Same day'}>
                                      {options.map((option) => (
                                        <option key={option.paymentId} value={option.paymentId}>
                                          {paymentOptionLabel(option, row.credit)}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                {fitBadge(selectedOption?.fit || matchFitTag(row.credit, selectedOption))}
                              </div>
                            </td>
                            <td className="reconcile-actions">
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--link"
                                type="button"
                                disabled={busyLineIds.has(row.id) || !defaultPaymentId}
                                onClick={() => confirmCredit(row)}
                              >
                                <Icon name="link" size={13} aria-hidden />
                                {busyLineIds.has(row.id) ? 'Linking…' : 'Link'}
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost"
                                type="button"
                                disabled={busyLineIds.has(row.id)}
                                onClick={() => ignoreLine(row.id)}
                              >
                                <Icon name="eyeOff" size={13} aria-hidden />
                                Ignore
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost-danger"
                                type="button"
                                disabled={busyLineIds.has(row.id)}
                                onClick={() => deleteLine(row.id)}
                                title="Delete line"
                              >
                                <Icon name="delete" size={13} aria-hidden />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {!visibleCreditsByDay.length && (
                    <tr>
                      <td colSpan="6" className="empty-row reconcile-empty">
                        <strong>{sideMeta.emptyTitle}</strong>
                        <span>{selectedDayFilter ? `Nothing on ${periodLabel}.` : sideMeta.emptyBody}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              ) : (
              <table>
                <thead>
                  <tr>
                    <th>Narration</th>
                    <th>Ref</th>
                    <th className="amount">{sideMeta.label}</th>
                    <th>{sideMeta.matchLabel}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleDebitsByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={5}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => {
                        const options = matchOptionsByDebitId[row.id] || [];
                        const defaultPaymentId = selectedDebitMatch[row.id] || options[0]?.paymentId || '';
                        const selectedOption = options.find((option) => option.paymentId === defaultPaymentId);
                        return (
                          <tr key={row.id}>
                            <td className="narration-cell">{row.narration || '—'}</td>
                            <td>{row.refNumber || '—'}</td>
                            <td className="amount out">{money(row.debit)}</td>
                            <td>
                              <div className="reconcile-pick">
                                <select
                                  value={defaultPaymentId}
                                  onChange={(e) => setSelectedDebitMatch((m) => ({ ...m, [row.id]: e.target.value }))}
                                  aria-label="Match this debit"
                                >
                                  <option value="">
                                    {options.length ? 'Choose match…' : 'No same-day entry — create money out below'}
                                  </option>
                                  <optgroup label="Create & link">
                                    {CREATE_DEBIT_OPTIONS.map((option) => (
                                      <option key={option.paymentId} value={option.paymentId} title={option.hint}>
                                        {option.label} — {option.hint}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {options.length > 0 && (
                                    <optgroup label={options.some((o) => o.suggested) ? 'Suggested & same day' : 'Same day'}>
                                      {options.map((option) => (
                                        <option key={option.paymentId} value={option.paymentId}>
                                          {paymentOptionLabel(option, row.debit)}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                                {fitBadge(selectedOption?.fit || matchFitTag(row.debit, selectedOption))}
                              </div>
                            </td>
                            <td className="reconcile-actions">
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--link"
                                type="button"
                                disabled={busyLineIds.has(row.id) || !defaultPaymentId}
                                onClick={() => confirmDebit(row)}
                              >
                                <Icon name="link" size={13} aria-hidden />
                                {busyLineIds.has(row.id) ? 'Linking…' : 'Link'}
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost"
                                type="button"
                                disabled={busyLineIds.has(row.id)}
                                onClick={() => ignoreLine(row.id)}
                              >
                                <Icon name="eyeOff" size={13} aria-hidden />
                                Ignore
                              </button>
                              <button
                                className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost-danger"
                                type="button"
                                disabled={busyLineIds.has(row.id)}
                                onClick={() => deleteLine(row.id)}
                                title="Delete line"
                              >
                                <Icon name="delete" size={13} aria-hidden />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {!visibleDebitsByDay.length && (
                    <tr>
                      <td colSpan="5" className="empty-row reconcile-empty">
                        <strong>{RECONCILE_SIDES.debit.emptyTitle}</strong>
                        <span>{selectedDayFilter ? `Nothing on ${periodLabel}.` : RECONCILE_SIDES.debit.emptyBody}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
            </div>

            {reconcileSide === 'credit' ? (
            <>
            <div className="reconcile-section-head">
              <div>
                <h3>{RECONCILE_SIDES.credit.openTitle}</h3>
                <p>{RECONCILE_SIDES.credit.openHint}</p>
              </div>
              <span className="reconcile-section-count">{unmatchedPayments.length}</span>
            </div>
            <div className="ledger-scroll reconcile-table-wrap">
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
                          <td>{row.mode || row.kind || '—'}</td>
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

            <div className="reconcile-section-head">
              <div>
                <h3>Linked {RECONCILE_SIDES.credit.label.toLowerCase()}</h3>
                <p>{RECONCILE_SIDES.credit.linkedHint}</p>
              </div>
              <span className="reconcile-section-count">
                {visibleLinkedByDay.reduce((n, block) => n + block.rows.length, 0)}
              </span>
            </div>
            <div className="ledger-scroll reconcile-table-wrap">
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
                              <Icon name="cornerUpLeft" size={13} aria-hidden />
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
            </>
            ) : (
            <>
            <div className="reconcile-section-head">
              <div>
                <h3>{RECONCILE_SIDES.debit.openTitle}</h3>
                <p>{RECONCILE_SIDES.debit.openHint}</p>
              </div>
              <span className="reconcile-section-count">{unmatchedPaymentsOut.length}</span>
            </div>
            <div className="ledger-scroll reconcile-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Vendor</th>
                    <th>Mode</th>
                    <th>Ref</th>
                    <th className="amount">Amount</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePaymentsOutByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={7}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => (
                        <tr key={row.paymentId}>
                          <td>{row.invoiceNumber || '—'}</td>
                          <td>{row.customerName || '—'}</td>
                          <td>{row.mode || row.kind || '—'}</td>
                          <td>{row.reference || '—'}</td>
                          <td className="amount">{money(row.amount)}</td>
                          <td>{paymentFill(row.amount, row.remaining)}</td>
                          <td>{row.invoiceStatus || '—'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {!visiblePaymentsOutByDay.length && (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        {selectedDayFilter
                          ? `No open purchase payments on ${periodLabel}.`
                          : 'All recent money-out and purchase payments are fully linked, or none exist yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="reconcile-section-head">
              <div>
                <h3>Linked {RECONCILE_SIDES.debit.label.toLowerCase()}</h3>
                <p>{RECONCILE_SIDES.debit.linkedHint}</p>
              </div>
              <span className="reconcile-section-count">
                {visibleLinkedDebitsByDay.reduce((n, block) => n + block.rows.length, 0)}
              </span>
            </div>
            <div className="ledger-scroll reconcile-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Narration</th>
                    <th>Bank ref</th>
                    <th className="amount">Debit</th>
                    <th>Bill</th>
                    <th>Vendor</th>
                    <th>Mode</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleLinkedDebitsByDay.map((block) => (
                    <React.Fragment key={block.dayKey}>
                      <tr className="day-block">
                        <td colSpan={7}>{block.label}</td>
                      </tr>
                      {block.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="narration-cell">{row.narration || '—'}</td>
                          <td>{row.refNumber || '—'}</td>
                          <td className="amount out">{money(row.debit)}</td>
                          <td>{row.invoiceNumber || '—'}</td>
                          <td>{row.customerName || '—'}</td>
                          <td>{row.mode || '—'}</td>
                          <td className="reconcile-actions">
                            <button
                              className="reconcile-btn reconcile-btn--sm reconcile-btn--ghost"
                              type="button"
                              disabled={saving}
                              onClick={() => unlinkDebit(row.id)}
                            >
                              <Icon name="cornerUpLeft" size={13} aria-hidden />
                              Unlink
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {!visibleLinkedDebitsByDay.length && (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        {selectedDayFilter
                          ? `No linked debits on ${periodLabel}.`
                          : 'No linked debits yet. Link a bank debit above to see it here.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
            )}
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
                <label>Opened on<DatePicker value={accountForm.openingDate} onChange={(ymd) => setAccountForm((f) => ({ ...f, openingDate: ymd }))} /></label>
                <label className="wide">Notes<textarea value={accountForm.notes} onChange={(e) => setAccountForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              </div>
              <footer><button type="button" className="secondary" onClick={() => setAccountForm(null)}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button></footer>
            </form>
          </div>
        )}

        {advanceMatchLine && (
          <AdvancePanel
            isOpen
            onClose={() => setAdvanceMatchLine(null)}
            initialAmount={advanceMatchLine.credit}
            lockAmount
            onReceive={async ({ customerId }) => {
              const line = advanceMatchLine;
              setLineBusy(line.id, true);
              setUnmatchedCredits((rows) => rows.filter((row) => row.id !== line.id));
              setSelectedCreditIds((ids) => ids.filter((id) => id !== line.id));
              try {
                const result = await createAndMatchBankStatementLine(line.id, {
                  kind: 'ADVANCE',
                  customerId,
                });
                const remaining = Number(result?.payment?.remaining ?? 0);
                const linkedTo = result?.payment?.invoiceNumber || 'Advance';
                setToast({
                  type: 'success',
                  message: remaining > 1
                    ? `Linked ${money(line.credit)} → ${linkedTo} (${money(remaining)} still open)`
                    : `Linked ${money(line.credit)} → ${linkedTo}`,
                });
                loadBooksQuiet();
                // The advance is already recorded: a failed refresh must not re-add the
                // matched line or report "Failed to record advance".
                try {
                  await loadUnmatched();
                } catch (refreshErr) {
                  console.error('Failed to refresh unmatched credits:', refreshErr);
                }
              } catch (err) {
                setUnmatchedCredits((rows) =>
                  rows.some((row) => row.id === line.id) ? rows : [...rows, line],
                );
                throw err;
              } finally {
                setLineBusy(line.id, false);
              }
            }}
            onSuccess={() => setAdvanceMatchLine(null)}
          />
        )}

        {entryForm && (
          <div className="books-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEntryForm(null)}>
            <form className="books-modal" onSubmit={saveEntry}>
              <header><div><h2>New finance entry</h2><p>Automatic invoice and purchase movements are recorded elsewhere.</p></div><button type="button" onClick={() => setEntryForm(null)}>×</button></header>
              <div className="form-grid">
                <label>Entry type<select value={entryForm.category} onChange={(e) => setEntryForm({ ...emptyEntry(), category: e.target.value })}>{ENTRY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Date<DatePicker required value={entryForm.entryDate} onChange={(ymd) => setEntryForm((f) => ({ ...f, entryDate: ymd }))} /></label>
                {entryForm.category === 'TRANSFER' || entryForm.category === 'CASH_DEPOSIT' ? (
                  <>
                    <label>From account<select required value={entryForm.fromAccountId} onChange={(e) => setEntryForm((f) => ({ ...f, fromAccountId: e.target.value }))}><option value="">Select…</option>{renderAccountOptions(entryForm.category === 'CASH_DEPOSIT' ? (a) => a.type === 'CASH' : undefined)}</select></label>
                    <label>To account<select required value={entryForm.toAccountId} onChange={(e) => setEntryForm((f) => ({ ...f, toAccountId: e.target.value }))}><option value="">Select…</option>{renderAccountOptions(entryForm.category === 'CASH_DEPOSIT' ? (a) => a.type === 'BANK' : undefined)}</select></label>
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
