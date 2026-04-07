import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import { searchCustomers } from '../../services/customersService';
import { createInvoice, createDraft, getInvoiceSettings } from '../../services/invoicesService';
import { generateInvoiceHtml, generateJewelleryInvoiceHtml, generateModernInvoiceHtml } from '../../utils/invoiceTemplates';
import { calcInvoiceTotals } from '../../utils/invoiceCalc';
import styles from './CreateInvoicePage.module.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultItem = () => ({
  slNo: 1,
  description: '',
  hsnSac: '71131910',
  quantity: 1,
  unit: 'GMS',
  rate: 0,
  makingCharges: 0,
  metalType: 'GOLD',
  purity: '22K',
  grossWeight: 0,
  stoneWeight: 0,
  makingChargesType: 'PER_GRAM',
  stoneCharges: 0,
  netWeight: 0,
  huid: '',
  amount: 0,
});

const metalOptions = ['GOLD', 'SILVER', 'PLATINUM'];
const makingOptions = [
  { value: 'FLAT_PER_ITEM', label: 'Flat' },
  { value: 'PER_GRAM', label: '/gm' },
  { value: 'PERCENTAGE_ON_METAL', label: '%' },
];

const paymentModes = ['UPI', 'CASH', 'BANK_TRANSFER', 'CREDIT'];

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('classic');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [autoCreateUdhar, setAutoCreateUdhar] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchDebounceRef = useRef(null);

  const [invoiceData, setInvoiceData] = useState({
    buyer: { name: '', phone: '', address: '', stateCode: '' },
    taxes: { cgstRate: 1.5, sgstRate: 1.5, taxType: 'CGST_SGST' },
    hallmarkCharges: 0,
    metadata: { modeOfPayment: 'UPI', deliveryNote: '', destination: '' },
    declaration: 'We declare that this invoice shows the actual price of the goods described.',
    items: [defaultItem()],
    company: { name: '', address: '', gstin: '', state: '', stateCode: '' },
  });

  const [previewHtml, setPreviewHtml] = useState('');

  // Fetch settings on mount
  useEffect(() => {
    getInvoiceSettings()
      .then(settings => {
        setInvoiceData(prev => ({
          ...prev,
          company: {
            name: settings.companyName || '',
            address: settings.address || '',
            gstin: settings.gstin || '',
            state: settings.state || '',
            stateCode: settings.stateCode || '',
          },
          taxes: {
            cgstRate: settings.defaultCgstRate ?? 1.5,
            sgstRate: settings.defaultSgstRate ?? 1.5,
          },
          declaration: settings.declaration || prev.declaration,
        }));
        if (settings.defaultTemplate) setTheme(settings.defaultTemplate);
      })
      .catch(console.error);
  }, []);

  const calc = useMemo(() =>
    calcInvoiceTotals(invoiceData.items, invoiceData.hallmarkCharges, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate, paidAmount),
  [invoiceData, paidAmount]);

  // Regenerate preview on data change
  useEffect(() => {
    const hydratedItems = invoiceData.items.map(item => {
      const netWeight = (parseFloat(item.grossWeight) || 0) - (parseFloat(item.stoneWeight) || 0);
      const metalValue = netWeight * (parseFloat(item.rate) || 0);
      const makingAmount = item.makingChargesType === 'PER_GRAM'
        ? (parseFloat(item.makingCharges) || 0) * netWeight
        : item.makingChargesType === 'PERCENTAGE_ON_METAL'
        ? (metalValue * (parseFloat(item.makingCharges) || 0)) / 100
        : parseFloat(item.makingCharges) || 0;
      const amount = metalValue + makingAmount + (parseFloat(item.stoneCharges) || 0) + (item.huid ? 45 : 0);
      return { ...item, netWeight, amount };
    });

    const subtotal = hydratedItems.reduce((s, i) => s + i.amount, 0);
    const cgst = subtotal * (invoiceData.taxes.cgstRate / 100);
    const sgst = subtotal * (invoiceData.taxes.sgstRate / 100);
    const total = subtotal + cgst + sgst + (parseFloat(invoiceData.hallmarkCharges) || 0);
    const roundOff = Math.round(total) - total;

    const hydratedData = {
      ...invoiceData,
      items: hydratedItems,
      taxes: { ...invoiceData.taxes, cgstAmount: cgst, sgstAmount: sgst, totalTaxAmount: cgst + sgst },
      totalAmount: total,
      roundOff,
    };

    try {
      if (theme === 'modern') setPreviewHtml(generateModernInvoiceHtml(hydratedData));
      else if (theme === 'jewellery') setPreviewHtml(generateJewelleryInvoiceHtml(hydratedData));
      else setPreviewHtml(generateInvoiceHtml(hydratedData));
    } catch (e) { /* silent */ }
  }, [invoiceData, theme]);

  const performSearch = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    try {
      setSearching(true);
      const data = await searchCustomers({ query: q });
      setSearchResults(data.data || data || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchDebounceRef.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchDebounceRef.current = setTimeout(() => performSearch(q), 400);
  };

  const handleCustomerSelect = (c) => {
    setSelectedCustomerId(c.id);
    setSearchQuery('');
    setSearchResults([]);
    setInvoiceData(prev => ({
      ...prev,
      buyer: {
        name: c.fullName || c.name || '',
        phone: c.contactDetails?.[0]?.primaryPhone || c.phone || '',
        address: c.locations?.[0]?.village || c.locations?.[0]?.district || '',
        stateCode: c.locations?.[0]?.stateCode || c.stateCode || '',
      }
    }));
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setInvoiceData(prev => ({ ...prev, buyer: { name: '', phone: '', address: '', stateCode: '' } }));
  };

  const updateItem = (idx, field, value) => {
    const newItems = invoiceData.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => setInvoiceData(prev => ({
    ...prev,
    items: [...prev.items, { ...defaultItem(), slNo: prev.items.length + 1 }]
  }));

  const removeItem = (idx) => {
    if (invoiceData.items.length === 1) return;
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, slNo: i + 1 }))
    }));
  };

  const isCredit = invoiceData.metadata.modeOfPayment === 'CREDIT';

  const buildPayload = () => {
    const payload = {
      customerId: selectedCustomerId,
      invoiceDate: invoiceDate,
      placeOfSupply: invoiceData.buyer.stateCode || '07',
      paidAmount: parseFloat(paidAmount) || 0,
      autoCreateUdhar: isCredit ? true : autoCreateUdhar,
      templateType: theme,
      taxType: invoiceData.taxes.taxType,
      notes: invoiceData.declaration,
      modeOfPayment: invoiceData.metadata.modeOfPayment,
      buyerAddress: invoiceData.buyer.address,
      buyerState: invoiceData.buyer.state || '',
      items: invoiceData.items.map(item => {
        const purityLabel = item.purity || '22K';
        const purityNum = parseFloat(purityLabel.replace(/[Kk]/, ''));
        const isKarat = purityLabel.toUpperCase().includes('K');
        const netWeight = (parseFloat(item.grossWeight) || 0) - (parseFloat(item.stoneWeight) || 0);
        return {
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: parseFloat(item.quantity) || 1,
          metalType: item.metalType || 'GOLD',
          metalRate: parseFloat(item.rate) || 0,
          purityLabel,
          purityValue: isKarat ? purityNum : (purityNum / 1000) * 24,
          purityBasis: isKarat ? 24 : 1000,
          grossWeight: parseFloat(item.grossWeight) || 0,
          stoneWeight: parseFloat(item.stoneWeight) || 0,
          makingCharges: parseFloat(item.makingCharges) || 0,
          makingChargesType: item.makingChargesType,
          isHallmarked: !!item.huid,
          huid: item.huid || undefined,
          netWeight,
        };
      }),
    };
    return payload;
  };

  const canSubmit = selectedCustomerId &&
    invoiceData.items.length > 0 &&
    invoiceData.items.every(i => i.description && i.hsnSac && parseFloat(i.grossWeight) > 0 && parseFloat(i.rate) > 0);

  const handleConfirm = async () => {
    if (!selectedCustomerId) { alert('Select a customer first'); return; }
    try {
      setLoading('confirm');
      const res = await createInvoice(buildPayload());
      if (res?.id) navigate(`/invoices`);
      else alert('Failed to create invoice');
    } catch (e) { console.error(e); alert('Network error'); }
    finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) { alert('Select a customer first'); return; }
    try {
      setLoading('draft');
      const res = await createDraft(buildPayload());
      if (res?.id) navigate(`/invoices`);
      else alert('Failed to save draft');
    } catch (e) { console.error(e); alert('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <DashboardTemplate headerTitle="Create Invoice" headerTabs={[]}>
      <div className={styles.pageWrapper}>

        {/* ── Form Body ── */}
        <div className={styles.formBody}>

          {/* Customer */}
          {!invoiceData.buyer.name ? (
            <div className={styles.customerSearchWrap}>
              <Icon name="search" size={13} className={styles.customerSearchIcon} />
              <input
                className={styles.customerSearchInput}
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searching && <Icon name="loader" size={13} className={styles.searchLoading} />}
              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map(c => (
                    <div key={c.id} className={styles.searchResultItem} onClick={() => handleCustomerSelect(c)}>
                      <Avatar name={c.fullName || c.name || '?'} size="sm" />
                      <div className={styles.searchResultInfo}>
                        <strong>{c.fullName || c.name}</strong>
                        <span>{c.contactDetails?.[0]?.primaryPhone || c.phone || 'No phone'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.selectedCustomer}>
              <Avatar name={invoiceData.buyer.name} size="sm" />
              <div className={styles.selectedCustomerText}>
                <strong>{invoiceData.buyer.name}</strong>
                <span>{invoiceData.buyer.phone}</span>
              </div>
              <button className={styles.changeBtn} onClick={clearCustomer}>Change</button>
            </div>
          )}

          {/* Items */}
          <div className={styles.itemsHeader}>
            <h3>Line Items</h3>
            <button className={styles.addItemBtn} onClick={addItem}>
              <Icon name="add" size={12} /> Add
            </button>
          </div>

          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Metal</th>
                <th>Purity</th>
                <th>Gross(g)</th>
                <th>Stone(g)</th>
                <th>Net(g)</th>
                <th>24K Rate ₹/g</th>
                <th>HSN</th>
                <th>Making</th>
                <th>HUID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-tertiary)', width: 24 }}>{idx + 1}</td>
                  <td><input placeholder="Item description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></td>
                  <td>
                    <div className={styles.metalCell}>
                      {metalOptions.map(m => (
                        <button key={m} className={item.metalType === m ? styles.activeMetal : ''} onClick={() => updateItem(idx, 'metalType', m)}>
                          {m[0]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: 56 }}><input style={{ width: 48 }} placeholder="22K" value={item.purity} onChange={e => updateItem(idx, 'purity', e.target.value)} /></td>
                  <td style={{ width: 64 }}><input type="number" style={{ width: 56 }} placeholder="0.00" value={item.grossWeight} onChange={e => updateItem(idx, 'grossWeight', e.target.value)} /></td>
                  <td style={{ width: 64 }}><input type="number" style={{ width: 56 }} placeholder="0.00" value={item.stoneWeight} onChange={e => updateItem(idx, 'stoneWeight', e.target.value)} /></td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{((parseFloat(item.grossWeight) || 0) - (parseFloat(item.stoneWeight) || 0)).toFixed(3)}</td>
                  <td style={{ width: 72 }}><input type="number" style={{ width: 64 }} placeholder="₹/g" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} /></td>
                  <td style={{ width: 80 }}><input style={{ width: 72 }} placeholder="HSN" value={item.hsnSac} onChange={e => updateItem(idx, 'hsnSac', e.target.value)} /></td>
                  <td style={{ width: 88 }}>
                    <select style={{ width: 80, fontSize: '0.7rem', padding: '0.25rem' }} value={item.makingChargesType} onChange={e => updateItem(idx, 'makingChargesType', e.target.value)}>
                      {makingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={{ width: 72 }}><input style={{ width: 64 }} placeholder="HUID" value={item.huid} onChange={e => updateItem(idx, 'huid', e.target.value)} /></td>
                  <td>
                    <button className={styles.removeRowBtn} onClick={() => removeItem(idx)} disabled={invoiceData.items.length === 1}>
                      <Icon name="close" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Advanced Section */}
          <button className={styles.advancedToggle} onClick={() => setShowAdvanced(v => !v)}>
            <span>Advanced</span>
            <Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={12} />
          </button>

          {showAdvanced && (
            <div className={styles.advancedSection}>
              <div className={styles.advField}>
                <label>Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className={styles.advField}>
                <label>Tax Type</label>
                <select value={invoiceData.taxes.taxType} onChange={e => {
                    const newType = e.target.value;
                    let cgst = invoiceData.taxes.cgstRate;
                    if (newType === 'NONE') cgst = 0;
                    setInvoiceData(prev => ({ ...prev, taxes: { ...prev.taxes, taxType: newType, cgstRate: cgst, sgstRate: cgst } }));
                }}>
                  <option value="CGST_SGST">GST (CGST+SGST)</option>
                  <option value="IGST">IGST</option>
                  <option value="NONE">NONE</option>
                </select>
              </div>
              <div className={styles.advField}>
                <label>State Code</label>
                <input value={invoiceData.buyer.stateCode} onChange={e => setInvoiceData(prev => ({ ...prev, buyer: { ...prev.buyer, stateCode: e.target.value } }))} placeholder="07" />
              </div>
              <div className={styles.advField}>
                <label>Payment Mode</label>
                <select value={invoiceData.metadata.modeOfPayment} onChange={e => setInvoiceData(prev => ({ ...prev, metadata: { ...prev.metadata, modeOfPayment: e.target.value } }))}>
                  {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.advField}>
                <label>Tax CGST/SGST %</label>
                <input type="number" step="0.1" value={invoiceData.taxes.cgstRate} onChange={e => setInvoiceData(prev => ({ ...prev, taxes: { ...prev.taxes, cgstRate: parseFloat(e.target.value) || 0, sgstRate: parseFloat(e.target.value) || 0 } }))} disabled={invoiceData.taxes.taxType === 'NONE'} />
              </div>
              <div className={styles.advField}>
                <label>Hallmark Charges ₹</label>
                <input type="number" value={invoiceData.hallmarkCharges} onChange={e => setInvoiceData(prev => ({ ...prev, hallmarkCharges: parseFloat(e.target.value) || 0 }))} placeholder="0" />
              </div>
              <div className={styles.advField}>
                <label>Auto-Udhar creation</label>
                <input type="checkbox" checked={autoCreateUdhar} onChange={e => setAutoCreateUdhar(e.target.checked)} disabled={isCredit} />
              </div>
              {!isCredit && (
                <div className={styles.advField}>
                  <label>Amount Received ₹</label>
                  <input type="number" value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Bottom Bar ── */}
        <div className={styles.bottomBar}>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalAmount}>{fmt(calc.total)}</span>
            <div className={styles.taxBreakdown}>
              <span>CGST {invoiceData.taxes.cgstRate}% + SGST {invoiceData.taxes.sgstRate}%</span>
              {calc.outstanding > 0 && <span style={{ color: '#f59e0b' }}>Bal: {fmt(calc.outstanding)}</span>}
            </div>
          </div>

          <div className={styles.actionBtns}>
            <button className={`${styles.previewToggleBtn} ${showPreview ? styles.active : ''}`} onClick={() => setShowPreview(v => !v)}>
              <Icon name="eye" size={14} /> Preview
            </button>
            <button className={`${styles.draftBtn}`} onClick={handleSaveDraft} disabled={!!loading || !canSubmit}>
              Draft
            </button>
            <button className={`${styles.confirmBtn}`} onClick={handleConfirm} disabled={!!loading || !canSubmit}>
              {loading === 'confirm' ? 'Creating...' : 'Confirm & Pay'}
            </button>
          </div>
        </div>

        {/* ── Preview Drawer ── */}
        {showPreview && <div className={styles.previewOverlay} onClick={() => setShowPreview(false)} />}
        <div className={`${styles.previewDrawer} ${showPreview ? styles.open : ''}`}>
          <div className={styles.previewDrawerHeader}>
            <h3>Invoice Preview</h3>
            <button className={styles.closeBtn} onClick={() => setShowPreview(false)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className={styles.previewTabs}>
            {['classic', 'modern', 'jewellery'].map(t => (
              <button key={t} className={theme === t ? styles.activeTab : ''} onClick={() => setTheme(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.previewIframe}>
            <iframe srcDoc={previewHtml} title="Preview" />
          </div>
        </div>

      </div>
    </DashboardTemplate>
  );
};

export default CreateInvoicePage;
