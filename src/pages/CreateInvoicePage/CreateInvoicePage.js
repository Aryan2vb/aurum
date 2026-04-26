import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import CustomerInspectorPanel from '../../components/organisms/CustomerInspectorPanel/CustomerInspectorPanel';
import { searchCustomers } from '../../services/customersService';
import { getInvoiceById, getInvoiceSettings, createInvoice, createDraft, updateInvoice } from '../../services/invoicesService';
import { generateInvoiceHtml, generateJewelleryInvoiceHtml, generateModernInvoiceHtml } from '../../utils/invoiceTemplates';
import { calcInvoiceTotals, parsePurity } from '../../utils/invoiceCalc';
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
  grossWeight: 0,
  stoneWeight: 0,
  makingChargesType: 'PER_GRAM',
  stoneCharges: 0,
  netWeight: 0,
  huid: '',
  hallmarkCharge: '',
  purity: 'None',
  amount: 0,
});

const metalOptions = ['GOLD', 'SILVER', 'PLATINUM'];
const makingOptions = [
  { value: 'FLAT_PER_ITEM', label: 'Flat' },
  { value: 'PER_GRAM', label: '/gm' },
  { value: 'PERCENTAGE_ON_METAL', label: '%' },
];

const paymentModes = ['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'OLD_GOLD', 'OTHER'];
const purityOptions = ['None', '916/22k', '833/20k', '75/18k', 'F'];

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [theme, setTheme] = useState('classic');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [payments, setPayments] = useState([{ mode: 'UPI', amount: 0 }]);
  const [autoCreateUdhar, setAutoCreateUdhar] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchDebounceRef = useRef(null);

  const paidAmount = useMemo(() => 
    payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  , [payments]);

  const [invoiceData, setInvoiceData] = useState({
    buyer: { name: '', phone: '', address: '', stateCode: '' },
    taxes: { cgstRate: 1.5, sgstRate: 1.5, taxType: 'CGST_SGST' },
    metadata: { modeOfPayment: 'UPI', deliveryNote: '', destination: '' },
    declaration: 'We declare that this invoice shows the actual price of the goods described.',
    items: [defaultItem()],
    company: { name: '', address: '', gstin: '', state: '', stateCode: '' },
    status: 'DRAFT',
  });

  const [previewHtml, setPreviewHtml] = useState('');

  // Fetch settings or existing invoice
  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getInvoiceSettings();
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
            ...prev.taxes,
            cgstRate: settings.defaultCgstRate ?? 1.5,
            sgstRate: settings.defaultSgstRate ?? 1.5,
            taxType: settings.defaultTaxType || prev.taxes.taxType,
          },
          declaration: settings.declaration || prev.declaration,
        }));
        if (settings.defaultTemplate) setTheme(settings.defaultTemplate);

        if (id) {
          const inv = await getInvoiceById(id);
          setSelectedCustomerId(inv.customerId);
          if (inv.payments?.length) {
            setPayments(inv.payments.map(p => ({ mode: p.mode, amount: p.amount, reference: p.reference || '' })));
          } else {
            setPayments([{ mode: inv.modeOfPayment || 'UPI', amount: inv.paidAmount || 0 }]);
          }
          setInvoiceDate(inv.invoiceDate?.slice(0, 10));
          setInvoiceData(prev => ({
            ...prev,
            items: inv.items.map(i => ({
              ...i,
              rate: i.metalRate,
              makingCharges: i.makingCharges,
              purity: i.purityLabel || i.purity || 'None',
              hallmarkCharge: parseFloat(i.hallmarkingCharge) || 0,
            })),
            metadata: {
              ...prev.metadata,
              modeOfPayment: inv.modeOfPayment || 'UPI',
              deliveryNote: inv.deliveryNote || '',
              destination: inv.destination || '',
            },
            buyer: {
              name: inv.buyerSnapshot?.name || inv.customer?.fullName || '',
              phone: inv.buyerSnapshot?.phone || inv.customer?.contactDetails?.[0]?.primaryPhone || '',
              address: inv.buyerSnapshot?.address || (inv.customer?.locations?.[0] ? `${inv.customer.locations[0].village || ''} ${inv.customer.locations[0].district || ''}`.trim() : ''),
              stateCode: inv.buyerSnapshot?.stateCode || inv.customer?.locations?.[0]?.stateCode || '',
            },
            status: inv.status,
          }));
        }
      } catch (err) {
        console.error('Failed to load invoice/settings', err);
      }
    };
    loadData();
  }, [id]);

  const calc = useMemo(() =>
    calcInvoiceTotals(invoiceData.items, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate, paidAmount),
  [invoiceData, paidAmount]);

  // Regenerate preview on data change — uses calcInvoiceTotals (single source of truth)
  useEffect(() => {
    const previewCalc = calcInvoiceTotals(invoiceData.items, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate, paidAmount);

    const hydratedItems = previewCalc.hydratedItems.map((item, idx) => ({
      ...item,
      slNo: idx + 1,
      hsnSac: item.hsnSac || '71131910',
      quantity: item.quantity || 1,
      unit: item.unit || 'GMS',
      purity: item.purity || 'None',
    }));

    const hsnSummaryMap = {};
    hydratedItems.forEach(item => {
      const hsn = item.hsnSac || '71131910';
      if (!hsnSummaryMap[hsn]) {
        hsnSummaryMap[hsn] = {
          hsnSac: hsn,
          taxableValue: 0,
          cgstRate: invoiceData.taxes?.cgstRate || 1.5,
          sgstRate: invoiceData.taxes?.sgstRate || 1.5,
          igstRate: invoiceData.taxes?.igstRate || 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTaxAmount: 0
        };
      }
      hsnSummaryMap[hsn].taxableValue += (item.amount || 0);
    });

    const hsnSummary = Object.values(hsnSummaryMap).map(s => {
      s.cgstAmount = (s.taxableValue * s.cgstRate) / 100;
      s.sgstAmount = (s.taxableValue * s.sgstRate) / 100;
      s.igstAmount = (s.taxableValue * s.igstRate) / 100;
      s.totalTaxAmount = s.cgstAmount + s.sgstAmount + s.igstAmount;
      return s;
    });

    const hydratedData = {
      ...invoiceData,
      items: hydratedItems,
      taxes: {
        ...invoiceData.taxes,
        cgstAmount: previewCalc.cgst,
        sgstAmount: previewCalc.sgst,
        totalTaxAmount: previewCalc.cgst + previewCalc.sgst,
      },
      totalAmount: previewCalc.total,
      roundOff: previewCalc.roundOff,
      cashReceived: parseFloat(paidAmount) || 0,
      amtBalance: previewCalc.outstanding,
      hsnSummary: hsnSummary,
      payments: payments.map(p => ({ mode: p.mode, amount: parseFloat(p.amount) || 0 })),
      metadata: {
        ...invoiceData.metadata,
        invoiceNo: 'PREVIEW',
        date: invoiceDate,
      },
    };

    try {
      if (theme === 'modern') setPreviewHtml(generateModernInvoiceHtml(hydratedData));
      else if (theme === 'jewellery') setPreviewHtml(generateJewelleryInvoiceHtml(hydratedData));
      else setPreviewHtml(generateInvoiceHtml(hydratedData));
    } catch (e) { /* silent */ }
  }, [invoiceData, theme, paidAmount, invoiceDate, payments]);

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
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
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
    let newItems = [...invoiceData.items];
    const updatedItem = { ...newItems[idx], [field]: value };
    
    // Side-effects for metal type selection
    if (field === 'metalType' && value === 'SILVER') {
      updatedItem.makingChargesType = 'PER_GRAM'; // Common for Silver
    } else if (field === 'metalType' && value === 'GOLD') {
      updatedItem.makingChargesType = 'PER_GRAM';
    }
    
    newItems[idx] = updatedItem;
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



  const handleAddPayment = () => {
    setPayments([...payments, { mode: 'CASH', amount: 0 }]);
  };

  const handleRemovePayment = (index) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const handleUpdatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const buildPayload = () => {
    const payload = {
      customerId: selectedCustomerId,
      invoiceDate: invoiceDate,
      payments: payments.map(p => ({
        mode: p.mode,
        amount: parseFloat(p.amount) || 0,
        reference: p.reference || undefined
      })),
      paidAmount, // keep for backward compatibility
      autoCreateUdhar: autoCreateUdhar,
      templateType: theme,
      modeOfPayment: payments[0]?.mode || 'UPI',
      items: invoiceData.items.map(item => {
        const { purityValue, purityBasis } = parsePurity(item.purity && item.purity !== 'None' ? item.purity : '22K');
        return {
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: parseFloat(item.quantity) || 1,
          metalType: item.metalType || 'GOLD',
          metalRate: parseFloat(item.rate) || 0,
          purityLabel: item.purity && item.purity !== 'None' ? item.purity : '',
          purityValue,
          purityBasis,
          grossWeight: parseFloat(item.grossWeight) || 0,
          stoneWeight: parseFloat(item.stoneWeight) || 0,
          makingCharges: parseFloat(item.makingCharges) || 0,
          makingChargesType: item.makingChargesType,
          stoneCharges: parseFloat(item.stoneCharges) || 0,
          isHallmarked: !!item.huid,
          hallmarkingCharge: parseFloat(item.hallmarkCharge) || 0,
          huid: item.huid || undefined,
        };
      }),
    };
    return payload;
  };

  const canSubmit = selectedCustomerId &&
    invoiceData.items.length > 0 &&
    invoiceData.items.every(i => i.description && i.hsnSac && parseFloat(i.grossWeight) > 0 && parseFloat(i.rate) > 0);

  const handleSubmit = async () => {
    if (!selectedCustomerId) { alert('Select a customer first'); return; }

    // Warning for finalized invoices
    if (id && invoiceData.status !== 'DRAFT' && invoiceData.status !== 'CANCELLED') {
      if (!window.confirm('This invoice is already finalized. Saving changes will automatically update the customer\'s ledger and udhar records. Proceed?')) {
        return;
      }
    }

    try {
      setLoading(true);
      let res;
      if (id) {
        res = await updateInvoice(id, { ...buildPayload(), finalize: true });
      } else {
        res = await createInvoice(buildPayload());
      }
      if (res?.id) navigate(`/invoices`);
      else alert('Failed to finalize invoice');
    } catch (e) { console.error(e); alert('Network error'); }
    finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) { alert('Select a customer first'); return; }

    // Warning for finalized invoices
    if (id && invoiceData.status !== 'DRAFT' && invoiceData.status !== 'CANCELLED') {
      if (!window.confirm('This invoice is already finalized. Saving changes will automatically update the customer\'s ledger and udhar records. Proceed?')) {
        return;
      }
    }

    try {
      setLoading('draft');
      let res;
      if (id) {
        res = await updateInvoice(id, buildPayload());
      } else {
        res = await createDraft(buildPayload());
      }
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

          {/* Customer + Date row */}
          <div className={styles.topRow}>
            <div className={styles.topRowCustomer}>
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
                  {(searchResults.length > 0 || (searchQuery.length >= 2 && !searching)) && (
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
                      <div className={styles.addNewCustomerItem} onClick={() => setIsCustomerPanelOpen(true)}>
                        <div className={styles.addIconCircle}>
                          <Icon name="add" size={14} />
                        </div>
                        <div className={styles.searchResultInfo}>
                          <strong>Add "{searchQuery}" as new customer</strong>
                          <span>Create a new record and select automatically</span>
                        </div>
                      </div>
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
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>Invoice Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className={styles.itemsHeader}>
            <h3>Line Items</h3>
            <button className={styles.addItemBtn} onClick={addItem}>
              <Icon name="add" size={12} /> Add
            </button>
          </div>

          <div className={styles.itemCards}>
            {invoiceData.items.map((item, idx) => (
              <div key={idx} className={styles.itemCard}>
                {/* Top row: index + description + remove */}
                <div className={styles.itemCardTop}>
                  <span className={styles.itemIndex}>{idx + 1}</span>
                  <input className={styles.itemDescInput} placeholder="Item description..." value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <button className={styles.removeRowBtn} onClick={() => removeItem(idx)} disabled={invoiceData.items.length === 1}>
                    <Icon name="close" size={12} />
                  </button>
                </div>

                {/* Field grid */}
                <div className={styles.itemFieldGrid}>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Metal</span>
                    <div className={styles.metalCell}>
                      {metalOptions.map(m => (
                        <button key={m} className={item.metalType === m ? styles.activeMetal : ''} onClick={() => updateItem(idx, 'metalType', m)}>{m[0]}</button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Qty</span>
                    <input className={styles.fieldInput} type="number" placeholder="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>

                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Gross (g)</span>
                    <input className={styles.fieldInput} type="number" placeholder="0.000" value={item.grossWeight} onChange={e => updateItem(idx, 'grossWeight', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Stone (g)</span>
                    <input className={styles.fieldInput} type="number" placeholder="0.000" value={item.stoneWeight} onChange={e => updateItem(idx, 'stoneWeight', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Net (g)</span>
                    <div className={styles.fieldComputed}>{((parseFloat(item.grossWeight) || 0) - (parseFloat(item.stoneWeight) || 0)).toFixed(3)}</div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Metal Rate ₹/g</span>
                    <input className={styles.fieldInput} type="number" placeholder="0" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>HSN</span>
                    <input className={styles.fieldInput} placeholder="71131910" value={item.hsnSac} onChange={e => updateItem(idx, 'hsnSac', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Making Type</span>
                    <select className={styles.fieldSelect} value={item.makingChargesType} onChange={e => updateItem(idx, 'makingChargesType', e.target.value)}>
                      {makingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Making ₹</span>
                    <input className={styles.fieldInput} type="number" placeholder="0" value={item.makingCharges} onChange={e => updateItem(idx, 'makingCharges', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Stone ₹</span>
                    <input className={styles.fieldInput} type="number" placeholder="0" value={item.stoneCharges} onChange={e => updateItem(idx, 'stoneCharges', e.target.value)} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>HM Charge ₹</span>
                    <input className={styles.fieldInput} type="number" placeholder="0" value={item.hallmarkCharge} onChange={e => updateItem(idx, 'hallmarkCharge', e.target.value)} disabled={!item.huid} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Purity</span>
                    <select className={styles.fieldSelect} value={item.purity} onChange={e => updateItem(idx, 'purity', e.target.value)}>
                      {purityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                      {!purityOptions.includes(item.purity) && <option value={item.purity}>{item.purity}</option>}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>HUID</span>
                    <input className={styles.fieldInput} placeholder="—" value={item.huid} onChange={e => updateItem(idx, 'huid', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Advanced Section */}
          <button className={styles.advancedToggle} onClick={() => setShowAdvanced(v => !v)}>
            <span>Advanced</span>
            <Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={12} />
          </button>

          {showAdvanced && (
            <div className={styles.advancedSection}>

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
              {/* <div className={styles.advField}>
                <label>State Code</label>
                <input value={invoiceData.buyer.stateCode} onChange={e => setInvoiceData(prev => ({ ...prev, buyer: { ...prev.buyer, stateCode: e.target.value } }))} placeholder="07" />
              </div> */}
              <div className={styles.paymentsSection}>
                <div className={styles.sectionHeader}>
                  <label>Payments / Split</label>
                  <button type="button" className={styles.addSmallBtn} onClick={handleAddPayment}>
                    + Add Mode
                  </button>
                </div>
                {payments.map((p, idx) => (
                  <div key={idx} className={styles.paymentRow}>
                    <select 
                      value={p.mode} 
                      onChange={e => handleUpdatePayment(idx, 'mode', e.target.value)}
                      className={styles.paymentModeSelect}
                    >
                      {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className={styles.paymentAmountWrap}>
                      <span className={styles.currencyPrefix}>₹</span>
                      <input 
                        type="number" 
                        value={p.amount} 
                        onChange={e => handleUpdatePayment(idx, 'amount', e.target.value)} 
                        placeholder="0"
                      />
                    </div>
                    {payments.length > 1 && (
                      <button type="button" className={styles.removePaymentBtn} onClick={() => handleRemovePayment(idx)}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.advField}>
                <label>Tax CGST/SGST %</label>
                <input type="number" step="0.1" value={invoiceData.taxes.cgstRate} onChange={e => setInvoiceData(prev => ({ ...prev, taxes: { ...prev.taxes, cgstRate: parseFloat(e.target.value) || 0, sgstRate: parseFloat(e.target.value) || 0 } }))} disabled={invoiceData.taxes.taxType === 'NONE'} />
              </div>
              <div className={styles.advField}>
                <label>Auto-Udhar creation</label>
                <input type="checkbox" checked={autoCreateUdhar} onChange={e => setAutoCreateUdhar(e.target.checked)} />
              </div>
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
              {id ? 'Update Draft' : 'Save Draft'}
            </button>
            <button className={`${styles.confirmBtn}`} onClick={handleSubmit} disabled={!!loading || !canSubmit}>
              {loading === true ? 'Processing...' : id ? 'Confirm & Finalize' : 'Confirm & Pay'}
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

        {/* ── Customer Create Panel ── */}
        <CustomerInspectorPanel
          isOpen={isCustomerPanelOpen}
          onClose={() => setIsCustomerPanelOpen(false)}
          mode="create"
          initialData={{ fullName: searchQuery }}
          onSuccess={(newCustomer) => {
            if (newCustomer) {
              handleCustomerSelect(newCustomer);
            }
            setIsCustomerPanelOpen(false);
          }}
        />

      </div>
    </DashboardTemplate>
  );
};

export default CreateInvoicePage;
