import React, { useEffect, useMemo, useState } from 'react';
import SlideOver from '../../atoms/SlideOver/SlideOver';
import DatePicker from '../DatePicker/DatePicker';
import Icon from '../../atoms/Icon/Icon';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import PaymentAccountSelect from '../PaymentAccountSelect/PaymentAccountSelect';
import { deletePurchase, getPurchase, recordPurchasePayment, updatePurchaseAttachment } from '../../../services/purchasesService';
import { getPresignedUrl, uploadToR2 } from '../../../services/uploadService';
import { PAYMENT_MODES as ALL_PAYMENT_MODES, withFinancialAccount } from '../../../utils/paymentAccounts';
import './PurchaseDetailSlideOver.css';

const PAYMENT_MODES = ALL_PAYMENT_MODES.filter((mode) => !['CREDIT', 'OLD_GOLD'].includes(mode));

const fmtAmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWeight = (n) => `${Number(n || 0).toFixed(3)} g`;
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const todayInput = () => new Date().toISOString().slice(0, 10);

const statusLabel = (status) =>
  ({ UNPAID: 'Unpaid', PARTIAL: 'Partial', PAID: 'Paid', CANCELLED: 'Cancelled' }[status] ||
  status ||
  'Unpaid');

const PurchaseDetailSlideOver = ({
  isOpen,
  onClose,
  purchaseId,
  initialPurchase,
  onEdit,
  onUpdated,
  onDeleted,
}) => {
  const [purchase, setPurchase] = useState(initialPurchase || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [payError, setPayError] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const attachmentInputRef = React.useRef(null);
  const [paymentForm, setPaymentForm] = useState({
    mode: 'UPI',
    amount: '',
    paidAt: todayInput(),
    reference: '',
    financialAccountId: '',
  });

  const remaining = useMemo(() => {
    if (!purchase) return 0;
    return round2(num(purchase.grandTotal || purchase.totalAmount) - num(purchase.paidAmount));
  }, [purchase]);

  const canPay =
    remaining > 0.009 && purchase?.status !== 'CANCELLED' && purchase?.status !== 'PAID';

  useEffect(() => {
    if (!isOpen || !purchaseId) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setPayError(null);
      setShowPayForm(false);
      if (initialPurchase?.id === purchaseId) {
        setPurchase(initialPurchase);
        const due = round2(
          num(initialPurchase.grandTotal || initialPurchase.totalAmount) -
            num(initialPurchase.paidAmount),
        );
        setPaymentForm({
          mode: 'UPI',
          amount: due > 0 ? String(due) : '',
          paidAt: todayInput(),
          reference: '',
          financialAccountId: '',
        });
      }

      try {
        const fresh = await getPurchase(purchaseId);
        if (!cancelled && fresh) {
          setPurchase(fresh);
          const due = round2(num(fresh.grandTotal || fresh.totalAmount) - num(fresh.paidAmount));
          setPaymentForm({
            mode: 'UPI',
            amount: due > 0 ? String(due) : '',
            paidAt: todayInput(),
            reference: '',
            financialAccountId: '',
          });
        }
      } catch (err) {
        if (!cancelled && !(initialPurchase?.id === purchaseId)) {
          setError(err.message || 'Failed to load purchase');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // initialPurchase only used as instant seed when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, purchaseId]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!purchase || !canPay) return;

    const amount = num(paymentForm.amount);
    if (amount <= 0) {
      setPayError('Enter a payment amount');
      return;
    }
    if (amount > remaining + 0.01) {
      setPayError(`Amount exceeds remaining ${fmtAmt(remaining)}`);
      return;
    }

    try {
      setIsPaying(true);
      setPayError(null);
      const updated = await recordPurchasePayment(purchase.id, withFinancialAccount({
        amount,
        paymentMethod: paymentForm.mode,
        financialAccountId: paymentForm.financialAccountId,
        paidAt: paymentForm.paidAt || todayInput(),
        reference: paymentForm.reference || undefined,
      }));
      setPurchase(updated);
      setShowPayForm(false);
      onUpdated?.(updated, 'payment');
      const due = round2(num(updated.grandTotal || updated.totalAmount) - num(updated.paidAmount));
      setPaymentForm({
        mode: 'UPI',
        amount: due > 0 ? String(due) : '',
        paidAt: todayInput(),
        reference: '',
        financialAccountId: '',
      });
    } catch (err) {
      setPayError(err.message || 'Failed to record payment');
    } finally {
      setIsPaying(false);
    }
  };

  const handleAttachmentFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !purchase?.id) return;

    try {
      setIsUploadingAttachment(true);
      const { presignedUrl, publicUrl, key } = await getPresignedUrl(
        'PURCHASE_DOC',
        file,
        purchase.id,
      );
      await uploadToR2(presignedUrl, file);
      const updated = await updatePurchaseAttachment(purchase.id, {
        attachmentUrl: publicUrl,
        attachmentKey: key,
        attachmentName: file.name,
        attachmentMime: file.type,
      });
      setPurchase((prev) => ({ ...prev, ...updated }));
      onUpdated?.(updated, 'attachment');
    } catch (err) {
      setPayError(err.message || 'Failed to upload invoice document');
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const handleEdit = () => {
    if (!purchase) return;
    onEdit?.(purchase);
    onClose?.();
  };

  const handleDelete = async () => {
    if (!purchase?.id || isDeleting) return;
    const billLabel = purchase.invoiceNumber || purchase.id.slice(0, 8);
    const ok = window.confirm(
      `Delete bill ${billLabel}? This permanently removes it from history and reverses stock. This cannot be undone.`,
    );
    if (!ok) return;

    setIsDeleting(true);
    setPayError(null);
    try {
      await deletePurchase(purchase.id);
      onDeleted?.(purchase.id);
      onClose?.();
    } catch (err) {
      setPayError(err.message || 'Failed to delete purchase');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const vendor = purchase?.vendor;
  const billNo = purchase?.invoiceNumber || purchase?.id?.slice(0, 8) || 'Purchase';
  const payments = purchase?.payments || [];
  const items = purchase?.items || [];

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={`Bill ${billNo}`}
      width={560}
      className="purchase-detail-slideover"
    >
      <div className="pds-root">
        {loading && !purchase ? (
          <div className="pds-loading">
            <div className="pds-spinner" />
            <p>Loading bill…</p>
          </div>
        ) : error && !purchase ? (
          <div className="pds-error">
            <Icon name="close" size={20} />
            <p>{error}</p>
          </div>
        ) : purchase ? (
          <>
            <div className="pds-hero">
              <div className="pds-hero-left">
                <div className="pds-vendor-name">{vendor?.name || purchase.vendorName || '—'}</div>
                <div className="pds-vendor-meta">
                  {[vendor?.gstin || purchase.vendorGstin, vendor?.phone]
                    .filter(Boolean)
                    .join(' · ') || 'Supplier'}
                </div>
                {(vendor?.address || purchase.vendorStateName) && (
                  <div className="pds-vendor-meta">
                    {[vendor?.address, purchase.vendorStateName || vendor?.stateName]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
              <div className="pds-hero-right">
                <span className={`purchase-status-badge status-${String(purchase.status || 'UNPAID').toLowerCase()}`}>
                  {statusLabel(purchase.status)}
                </span>
                <div className="pds-meta-row">
                  <span>Date</span>
                  <span>
                    {purchase.purchaseDate ? (
                      <DateDisplay date={purchase.purchaseDate} format="absolute" size="sm" />
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="pds-balance-card">
              <div className="pds-balance-strip">
                <div>
                  <span>Total</span>
                  <strong>{fmtAmt(purchase.grandTotal || purchase.totalAmount)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{fmtAmt(purchase.paidAmount)}</strong>
                </div>
                <div className={remaining > 0.009 ? 'due' : ''}>
                  <span>Due</span>
                  <strong>{fmtAmt(remaining)}</strong>
                </div>
              </div>
              {canPay && (
                <button
                  type="button"
                  className={`pds-btn pds-payment-cta ${showPayForm ? 'secondary' : 'primary'}`}
                  onClick={() => setShowPayForm((v) => !v)}
                  aria-expanded={showPayForm}
                >
                  <Icon name={showPayForm ? 'close' : 'payment'} size={15} />
                  {showPayForm ? 'Cancel payment' : `Record payment · ${fmtAmt(remaining)} due`}
                </button>
              )}
            </div>

            <div className="pds-utility-actions">
              <button type="button" className="pds-btn secondary" onClick={handleEdit}>
                <Icon name="edit" size={14} />
                Edit bill
              </button>
              {purchase.attachmentUrl ? (
                <>
                  <a
                    href={purchase.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pds-btn secondary"
                  >
                    <Icon name="invoice" size={14} />
                    View supplier invoice
                  </a>
                  <button
                    type="button"
                    className="pds-btn secondary"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                  >
                    <Icon
                      name={isUploadingAttachment ? 'loader' : 'upload'}
                      size={14}
                      className={isUploadingAttachment ? 'spin' : ''}
                    />
                    {isUploadingAttachment ? 'Uploading…' : 'Replace invoice'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="pds-btn secondary"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                >
                  <Icon
                    name={isUploadingAttachment ? 'loader' : 'upload'}
                    size={14}
                    className={isUploadingAttachment ? 'spin' : ''}
                  />
                  {isUploadingAttachment ? 'Uploading…' : 'Upload invoice'}
                </button>
              )}
              <input
                type="file"
                ref={attachmentInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/webp,application/pdf,image/heic,image/heif"
                onChange={handleAttachmentFileSelected}
              />
            </div>
            {payError && !showPayForm && <div className="pds-pay-error">{payError}</div>}

            {showPayForm && canPay && (
              <form className="pds-pay-form" onSubmit={handlePay}>
                <div className="pds-section-title">New payment</div>
                {payError && <div className="pds-pay-error">{payError}</div>}
                <div className="pds-pay-grid">
                  <label>
                    Mode
                    <select
                      value={paymentForm.mode}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, mode: e.target.value }))}
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <PaymentAccountSelect
                    mode={paymentForm.mode}
                    value={paymentForm.financialAccountId}
                    onChange={(value) => setPaymentForm((p) => ({ ...p, financialAccountId: value }))}
                  />
                  <label>
                    Amount
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Paid on
                    <DatePicker
                      value={paymentForm.paidAt}
                      required
                      onChange={(ymd) => setPaymentForm((p) => ({ ...p, paidAt: ymd }))}
                    />
                  </label>
                  <label>
                    Reference
                    <input
                      type="text"
                      placeholder="UPI / cheque ref"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="pds-pay-quick">
                  <button
                    type="button"
                    className="pds-chip"
                    onClick={() => setPaymentForm((p) => ({ ...p, amount: String(remaining) }))}
                  >
                    Full due ({fmtAmt(remaining)})
                  </button>
                </div>
                <button type="submit" className="pds-btn primary block" disabled={isPaying}>
                  {isPaying ? 'Saving…' : 'Save payment'}
                </button>
              </form>
            )}

            <section className="pds-section">
              <div className="pds-section-title">
                Items ({items.length || 1})
              </div>
              <div className="pds-table-wrap">
                <table className="pds-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Metal</th>
                      <th>Wt</th>
                      <th>Rate</th>
                      <th className="num">HM</th>
                      <th className="num">Other</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="pds-empty">No line items</td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.itemName || '—'}</strong>
                            <div className="pds-sub">{item.purity}</div>
                          </td>
                          <td>{item.metalType}</td>
                          <td>{fmtWeight(item.netWeight)}</td>
                          <td>{fmtAmt(item.rate)}</td>
                          <td className="num">{num(item.hallmarkingCharge) > 0 ? fmtAmt(item.hallmarkingCharge) : '—'}</td>
                          <td className="num">{num(item.otherCharges) > 0 ? fmtAmt(item.otherCharges) : '—'}</td>
                          <td className="num">{fmtAmt(item.totalAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pds-weight-row">
                <span>Gold {fmtWeight(purchase.totalGoldWeight)}</span>
                <span>Silver {fmtWeight(purchase.totalSilverWeight)}</span>
              </div>
            </section>

            <section className="pds-section">
              <div className="pds-section-title">Tax & totals</div>
              <div className="pds-summary">
                {num(purchase.totalHallmarkingCharges) > 0 && (
                  <div className="pds-sum-row">
                    <span>Hallmarking</span>
                    <span>{fmtAmt(purchase.totalHallmarkingCharges)}</span>
                  </div>
                )}
                {num(purchase.totalOtherCharges) > 0 && (
                  <div className="pds-sum-row">
                    <span>Other charges</span>
                    <span>{fmtAmt(purchase.totalOtherCharges)}</span>
                  </div>
                )}
                <div className="pds-sum-row">
                  <span>Taxable</span>
                  <span>{fmtAmt(purchase.taxableAmount)}</span>
                </div>
                {num(purchase.cgstAmount) > 0 && (
                  <div className="pds-sum-row">
                    <span>CGST ({purchase.cgstRate}%)</span>
                    <span>{fmtAmt(purchase.cgstAmount)}</span>
                  </div>
                )}
                {num(purchase.sgstAmount) > 0 && (
                  <div className="pds-sum-row">
                    <span>SGST ({purchase.sgstRate}%)</span>
                    <span>{fmtAmt(purchase.sgstAmount)}</span>
                  </div>
                )}
                {num(purchase.igstAmount) > 0 && (
                  <div className="pds-sum-row">
                    <span>IGST ({purchase.igstRate}%)</span>
                    <span>{fmtAmt(purchase.igstAmount)}</span>
                  </div>
                )}
                {num(purchase.adjustment) !== 0 && (
                  <div className="pds-sum-row">
                    <span>Adjustment</span>
                    <span>{fmtAmt(purchase.adjustment)}</span>
                  </div>
                )}
                <div className="pds-sum-row total">
                  <span>Grand total</span>
                  <span>{fmtAmt(purchase.grandTotal || purchase.totalAmount)}</span>
                </div>
              </div>
              {purchase.notes && (
                <div className="pds-notes">
                  <span>Notes</span>
                  <p>{purchase.notes}</p>
                </div>
              )}
            </section>

            <section className="pds-section">
              <div className="pds-section-title">
                Payment history ({payments.length})
              </div>
              {payments.length === 0 ? (
                <div className="pds-empty-card">
                  No payments yet
                  {canPay ? ' — tap Record payment to add one.' : '.'}
                </div>
              ) : (
                <ul className="pds-pay-list">
                  {payments.map((p) => (
                    <li key={p.id} className="pds-pay-item">
                      <div className="pds-pay-item-left">
                        <span className="pds-mode-tag">{p.mode}</span>
                        <div>
                          <strong>{fmtAmt(p.amount)}</strong>
                          {p.reference && <div className="pds-sub">Ref: {p.reference}</div>}
                        </div>
                      </div>
                      <div className="pds-pay-item-right">
                        {p.paidAt ? (
                          <DateDisplay date={p.paidAt} format="absolute" size="sm" />
                        ) : (
                          '—'
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="pds-danger-zone">
              <div>
                <strong>Delete this purchase</strong>
                <span>Permanently removes the bill and reverses its stock movements.</span>
              </div>
              <button
                type="button"
                className="pds-btn danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Icon name="delete" size={14} />
                {isDeleting ? 'Deleting…' : 'Delete bill'}
              </button>
            </section>
          </>
        ) : null}
      </div>
    </SlideOver>
  );
};

export default PurchaseDetailSlideOver;
