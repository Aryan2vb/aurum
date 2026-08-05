import React, { useEffect, useState } from 'react';
import { getFinancialAccounts } from '../../../services/financeService';
import { bankAccounts, paymentNeedsBankAccount } from '../../../utils/paymentAccounts';
import './PaymentAccountSelect.css';

let accountsRequest;
const loadAccounts = () => {
  if (!accountsRequest) {
    accountsRequest = getFinancialAccounts().catch((error) => {
      accountsRequest = null;
      throw error;
    });
  }
  return accountsRequest;
};

export const clearPaymentAccountCache = () => {
  accountsRequest = null;
};

const PaymentAccountSelect = ({
  mode,
  value = '',
  onChange = () => {},
  className = '',
  label = 'Bank account',
}) => {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const required = paymentNeedsBankAccount(mode);

  useEffect(() => {
    if (!required) return undefined;
    let active = true;
    setError('');
    loadAccounts()
      .then((data) => {
        if (!active) return;
        setAccounts(bankAccounts(data?.data || data?.accounts || data || []));
      })
      .catch(() => {
        if (active) setError('Could not load bank accounts');
      });
    return () => { active = false; };
  }, [required, mode]);

  useEffect(() => {
    if (!required && value) onChange('');
  }, [required, value, onChange]);

  if (!required) return null;

  return (
    <label className={`payment-account-field ${className}`}>
      <span>{label} <span aria-hidden="true">*</span></span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select bank account…</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}{account.bankName ? ` · ${account.bankName}` : ''}
          </option>
        ))}
      </select>
      {error && <small>{error}. Add or manage accounts in Cash &amp; Bank.</small>}
      {!error && accounts.length === 0 && <small>No bank account configured.</small>}
    </label>
  );
};

export default PaymentAccountSelect;
