import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import SearchBar from '../../components/molecules/SearchBar/SearchBar';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import { searchCustomers } from '../../services/customersService';
import { createInvoice, createDraft, getInvoiceSettings } from '../../services/invoicesService';
import { generateInvoiceHtml, generateJewelleryInvoiceHtml, generateModernInvoiceHtml } from '../../utils/invoiceTemplates';
import { calcInvoiceTotals } from '../../utils/invoiceCalc';
import styles from './CreateInvoicePage.module.css';

const defaultInvoiceState = {
  company: {
    name: "",
    address: "",
    gstin: "",
    state: "",
    stateCode: ""
  },
  buyer: {
    name: "",
    address: "",
    phone: "",
    state: "",
    stateCode: ""
  },
  metadata: {
    invoiceNo: "Auto-Generated",
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    modeOfPayment: "UPI"
  },
  items: [],
  taxes: {
    cgstRate: 1.5,
    cgstAmount: 0,
    sgstRate: 1.5,
    sgstAmount: 0,
    totalTaxAmount: 0
  },
  hallmarkCharges: 0,
  hsnSummary: [],
  roundOff: 0,
  totalAmount: 0,
  amountInWords: '',
  taxAmountInWords: '',
  declaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('classic');
  const [step, setStep] = useState(1);
  const [paidAmount, setPaidAmount] = useState(0);
  const [autoCreateUdhar, setAutoCreateUdhar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceState);
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Customer Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceTimerRef = useRef(null);

  // Fetch invoice settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getInvoiceSettings();
        
        // Update invoice data with fetched company settings
        setInvoiceData(prev => ({
          ...prev,
          company: {
            name: settings.companyName || '',
            address: settings.address || '',
            gstin: settings.gstin || '',
            state: settings.state || '',
            stateCode: settings.stateCode || ''
          },
          taxes: {
            cgstRate: settings.defaultCgstRate || 1.5,
            cgstAmount: 0,
            sgstRate: settings.defaultSgstRate || 1.5,
            sgstAmount: 0,
            totalTaxAmount: 0
          },
          declaration: settings.declaration || prev.declaration,
          metadata: {
            ...prev.metadata,
            modeOfPayment: "UPI" // Keep default payment mode
          }
        }));
        
        // Set theme based on settings
        if (settings.defaultTemplate) {
          setTheme(settings.defaultTemplate);
        }
      } catch (error) {
        console.error('Failed to fetch invoice settings:', error);
        // Keep default values if settings fetch fails
      } finally {
      }
    };

    fetchSettings();
  }, []);

  // Live totals for Calculation Hub
  const calc = React.useMemo(() =>
    calcInvoiceTotals(invoiceData.items, invoiceData.hallmarkCharges, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate, paidAmount),
  [invoiceData, paidAmount]);

  useEffect(() => {
    const runGeneration = () => {
      const { hydratedItems, subtotal, cgst, sgst, roundOff, total } = calcInvoiceTotals(
        invoiceData.items, invoiceData.hallmarkCharges, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate
      );
      const hydratedData = {
        ...invoiceData,
        items: hydratedItems,
        taxes: { ...invoiceData.taxes, cgstAmount: cgst, sgstAmount: sgst, totalTaxAmount: cgst + sgst },
        hsnSummary: [{
          hsnSac: hydratedItems[0]?.hsnSac || '71131910',
          taxableValue: subtotal,
          cgstRate: invoiceData.taxes.cgstRate, cgstAmount: cgst,
          sgstRate: invoiceData.taxes.sgstRate, sgstAmount: sgst,
          totalTaxAmount: cgst + sgst,
        }],
        roundOff,
        totalAmount: total,
      };
      try {
        if (theme === 'modern') setPreviewHtml(generateModernInvoiceHtml(hydratedData));
        else if (theme === 'jewellery') setPreviewHtml(generateJewelleryInvoiceHtml(hydratedData));
        else setPreviewHtml(generateInvoiceHtml(hydratedData));
      } catch (e) { console.error('Preview error', e); }
    };
    runGeneration();
  }, [invoiceData, theme]);

  const performSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    try {
      setSearching(true);
      const data = await searchCustomers({ query });
      setSearchResults(data.data || data || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchDebounceTimerRef.current = setTimeout(() => performSearch(query), 500);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.id);
    setSearchQuery('');
    setSearchResults([]);
    setInvoiceData(prev => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        name: customer.fullName || customer.name || '',
        phone: customer.contactDetails?.[0]?.primaryPhone || customer.phone || '',
        address: customer.locations?.[0]?.village || customer.locations?.[0]?.district || 'Unknown Address'
      }
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, {
        slNo: prev.items.length + 1,
        description: "",
        hsnSac: "71131910",
        quantity: 1,
        unit: "GMS",
        rate: 0,
        makingCharges: 0,
        metalType: "GOLD",
        purity: "22K",
        grossWeight: 0,
        stoneWeight: 0,
        makingChargesType: 'FLAT_PER_ITEM',
        stoneCharges: 0,
        netWeight: 0,
        huid: "",
        amount: 0
      }]
    }));
  };

  const removeItem = (index) => {
    if (invoiceData.items.length === 1) return;
    const newItems = invoiceData.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, slNo: i + 1 }));
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const isCredit = invoiceData.metadata.modeOfPayment === 'CREDIT';

  const buildPayload = () => ({
    customerId: selectedCustomerId,
    placeOfSupply: invoiceData.buyer.stateCode || '07',
    invoiceDate: invoiceData.metadata.invoiceDate || new Date().toISOString().slice(0, 10),
    templateType: theme,
    modeOfPayment: invoiceData.metadata.modeOfPayment,
    metalRateSource: 'manual',
    metalRateDate: new Date().toISOString(),
    taxType: invoiceData.taxes.cgstRate > 0 ? 'CGST_SGST' : 'NONE',
    cgstRate: invoiceData.taxes.cgstRate,
    sgstRate: invoiceData.taxes.sgstRate,
    igstRate: 0,
    buyerAddress: invoiceData.buyer.address || '',
    buyerState: invoiceData.buyer.state || '',
    buyerStateCode: invoiceData.buyer.stateCode || '',
    autoCreateUdhar: isCredit ? true : autoCreateUdhar,
    paidAmount: parseFloat(paidAmount) || 0,
    notes: invoiceData.declaration,
    deliveryNote: invoiceData.metadata.deliveryNote || '',
    dispatchDocNo: invoiceData.metadata.dispatchDocNo || '',
    destination: invoiceData.metadata.destination || '',
    termsOfDelivery: invoiceData.metadata.termsOfDelivery || '',
    items: invoiceData.items.map(item => {
      const purityLabel = item.purity || '22K';
      const purityNum = parseFloat(purityLabel.replace(/[Kk]/, ''));
      const isKarat = purityLabel.toUpperCase().includes('K');
      const purityBasis = isKarat ? 24 : 1000;
      const purityValue = isKarat ? purityNum : purityNum / 10;
      return {
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'PCS',
        metalType: item.metalType || 'GOLD',
        metalRate: parseFloat(item.rate) || 0,
        purityLabel,
        purityValue,
        purityBasis,
        grossWeight: parseFloat(item.grossWeight) || 0,
        stoneWeight: parseFloat(item.stoneWeight) || 0,
        makingCharges: parseFloat(item.makingCharges) || 0,
        makingChargesType: item.makingChargesType || 'FLAT_PER_ITEM',
        stoneCharges: parseFloat(item.stoneCharges) || 0,
        isHallmarked: !!item.huid,
        huid: item.huid || undefined,
        taxType: invoiceData.taxes.cgstRate > 0 ? 'CGST_SGST' : 'NONE',
        cgstRate: invoiceData.taxes.cgstRate,
        sgstRate: invoiceData.taxes.sgstRate,
        igstRate: 0,
      };
    }),
  });

  const canSubmit = selectedCustomerId &&
    invoiceData.items.length > 0 &&
    invoiceData.items.every(i => i.description && i.hsnSac && parseFloat(i.grossWeight) > 0 && parseFloat(i.rate) > 0);

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) { alert('Please select a customer first.'); return; }
    try {
      setLoading('draft');
      const response = await createDraft(buildPayload());
      if (response?.id) navigate(`/invoices`);
      else alert('Failed to save draft.');
    } catch (error) {
      console.error(error);
      alert('Network/Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCustomerId) { alert('Please select a customer first.'); return; }
    try {
      setLoading('confirm');
      const response = await createInvoice(buildPayload());
      if (response?.id) navigate(`/invoices`);
      else alert('Failed to create invoice.');
    } catch (error) {
      console.error(error);
      alert('Network/Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardTemplate headerTitle="Create Invoice"  headerTabs={[]}>

      <div className={styles.splitView}>
        <div className={styles.formPane}>
          
          {/* Step Indicator */}
          <div className={styles.stepper}>
            {[{n:1,label:'CUSTOMER'},{n:2,label:'LINE ITEMS'},{n:3,label:'TAX & TOTAL'}].map(({n, label}, i, arr) => (
              <React.Fragment key={n}>
                <button className={`${styles.stepItem} ${step === n ? styles.stepActive : ''} ${step > n ? styles.stepDone : ''}`} onClick={() => setStep(n)}>
                  <span className={styles.stepNum}>{n}</span>
                  <span className={styles.stepLabel}>{label}</span>
                </button>
                {i < arr.length - 1 && <div className={`${styles.stepLine} ${step > n ? styles.stepLineDone : ''}`} />}
              </React.Fragment>
            ))}
          </div>
          
          {step === 1 && <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Select Customer</h3>
            {!invoiceData.buyer.name ? (
              <div className={styles.searchBox}>
                <SearchBar placeholder="Search customer by name or phone..." value={searchQuery} onChange={handleSearch} />
                {searching && <div className={styles.textHint}>Searching...</div>}
                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map(customer => {
                      const name = customer.fullName || customer.name || 'Unknown';
                      const phone = customer.contactDetails?.[0]?.primaryPhone || customer.phone || 'No phone';
                      return (
                        <div key={customer.id} className={styles.searchResultItem} onClick={() => handleCustomerSelect(customer)}>
                          <Avatar name={name} size="md" />
                          <div className={styles.searchResultInfo}>
                            <strong>{name}</strong>
                            <span>{phone}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.selectedCustomer}>
                <Avatar name={invoiceData.buyer.name} size="md" />
                <div style={{ flex: 1 }}>
                  <strong>{invoiceData.buyer.name}</strong>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{invoiceData.buyer.phone} • {invoiceData.buyer.address}</div>
                </div>
                <Button variant="ghost" size="small" onClick={() => { setSelectedCustomerId(''); setInvoiceData(prev => ({...prev, buyer: { ...prev.buyer, name: '' }})); }}>Change</Button>
              </div>
            )}
          </div>}

          {step === 1 && (
            <button className={styles.stepNextBtn} onClick={() => setStep(2)}>Next: Line Items →</button>
          )}

          {step === 2 && <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Line Items</h3>
            {invoiceData.items.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>No items yet. Add your first item below.</p>
            )}
            {invoiceData.items.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <div className={styles.itemRowHeader}>
                  <h4>Item {index + 1}</h4>
                  <button className={styles.removeBtn} onClick={() => removeItem(index)}><Icon name="close" size={14} /></button>
                </div>

                {/* Row 1: Description */}
                <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Description (e.g. 22K Gold Chain)" />

                {/* Row 2: Metal + Purity + Rate */}
                <div className={styles.itemRow3}>
                  <div className={styles.metalToggle}>
                    {['GOLD','SILVER','PLATINUM'].map(m => (
                      <button key={m} className={item.metalType === m ? styles.activeMetal : ''} onClick={() => updateItem(index, 'metalType', m)}>{m[0]+m.slice(1).toLowerCase()}</button>
                    ))}
                  </div>
                  <Input value={item.purity || ''} onChange={(e) => updateItem(index, 'purity', e.target.value)} placeholder="Purity (22K)" style={{ width: 80 }} />
                  <Input type="number" value={item.rate} onChange={(e) => updateItem(index, 'rate', e.target.value)} placeholder="Rate ₹/gm" />
                </div>

                {/* Row 3: Gross Wt + Stone Wt + HSN */}
                <div className={styles.itemRow3}>
                  <Input type="number" value={item.grossWeight} onChange={(e) => updateItem(index, 'grossWeight', e.target.value)} placeholder="Gross wt (g)" />
                  <Input type="number" value={item.stoneWeight} onChange={(e) => updateItem(index, 'stoneWeight', e.target.value)} placeholder="Stone wt (g)" />
                  <Input value={item.hsnSac} onChange={(e) => updateItem(index, 'hsnSac', e.target.value)} placeholder="HSN/SAC" />
                </div>

                {/* Row 4: Making charges */}
                <div className={styles.itemRow3}>
                  <div className={styles.metalToggle}>
                    {[['FLAT_PER_ITEM','Flat'],['PER_GRAM','/gm'],['PERCENTAGE_ON_METAL','%']].map(([val, label]) => (
                      <button key={val} className={item.makingChargesType === val ? styles.activeMetal : ''} onClick={() => updateItem(index, 'makingChargesType', val)}>{label}</button>
                    ))}
                  </div>
                  <Input type="number" value={item.makingCharges} onChange={(e) => updateItem(index, 'makingCharges', e.target.value)} placeholder="Making charges" />
                  <Input value={item.huid || ''} onChange={(e) => updateItem(index, 'huid', e.target.value)} placeholder="HUID (optional)" />
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={addItem} style={{ width: '100%', marginTop: '10px' }}><Icon name="add" size={16} /> {invoiceData.items.length === 0 ? 'Add Item' : 'Add Another Item'}</Button>
          </div>}

          {step === 2 && (
            <div className={styles.stepNavRow}>
              <button className={styles.stepBackBtn} onClick={() => setStep(1)}>← Back</button>
              <button className={styles.stepNextBtn} onClick={() => setStep(3)}>Next: Tax & Total →</button>
            </div>
          )}

          {step === 3 && <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Tax & Total</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldHalf}>
                 <label>Place of Supply (State Code)</label>
                 <Input value={invoiceData.buyer.stateCode} onChange={(e) => setInvoiceData({...invoiceData, buyer: {...invoiceData.buyer, stateCode: e.target.value}})} placeholder="e.g. 07" />
              </div>
              <div className={styles.fieldHalf}>
                 <label>Payment Mode</label>
                 <select className={styles.select} value={invoiceData.metadata.modeOfPayment} onChange={(e) => setInvoiceData({...invoiceData, metadata: {...invoiceData.metadata, modeOfPayment: e.target.value}})}>
                   <option value="UPI">UPI / Digital</option>
                   <option value="CASH">Cash</option>
                   <option value="BANK TRANSFER">Bank Transfer</option>
                   <option value="CREDIT">Udhar / Credit</option>
                 </select>
              </div>
              <div className={styles.fieldHalf}>
                 <label>Hallmark Charges (₹)</label>
                 <Input type="number" value={invoiceData.hallmarkCharges} onChange={(e) => setInvoiceData({...invoiceData, hallmarkCharges: e.target.value})} placeholder="0" />
              </div>
              <div className={styles.fieldHalf}>
                 <label>Tax Rate (CGST %)</label>
                 <Input type="number" step="0.1" value={invoiceData.taxes.cgstRate} onChange={(e) => setInvoiceData({...invoiceData, taxes: {...invoiceData.taxes, cgstRate: parseFloat(e.target.value), sgstRate: parseFloat(e.target.value)}})} />
              </div>
              <div className={styles.fieldFull}>
                 <label>Declaration / Notes</label>
                 <Input value={invoiceData.declaration} onChange={(e) => setInvoiceData({...invoiceData, declaration: e.target.value})} />
              </div>
            </div>
          </div>}

          {step === 3 && (
            <button className={styles.stepBackBtn} onClick={() => setStep(2)}>← Back to Line Items</button>
          )}

          {/* Calculation Hub */}
          <div className={styles.calcHub}>
            <div className={styles.calcHubHeader}>
              <span className={styles.calcHubTitle}>Calculation Hub</span>
              <span className={styles.calcHubIcon}>⊞</span>
            </div>
            <div className={styles.calcRow}>
              <span>Subtotal (Metal + Making)</span>
              <span>{fmt(calc.subtotal)}</span>
            </div>
            <div className={`${styles.calcRow} ${styles.calcTax}`}>
              <span>CGST ({invoiceData.taxes.cgstRate}%) <span className={styles.taxDot}>●</span></span>
              <span>{fmt(calc.cgst)}</span>
            </div>
            <div className={`${styles.calcRow} ${styles.calcTax}`}>
              <span>SGST ({invoiceData.taxes.sgstRate}%) <span className={styles.taxDot}>●</span></span>
              <span>{fmt(calc.sgst)}</span>
            </div>
            <div className={`${styles.calcRow} ${styles.calcMuted}`}>
              <span>Total Taxable Amount</span>
              <span>{fmt(calc.taxable)}</span>
            </div>
            <div className={styles.calcRow}>
              <span>Round Off</span>
              <span>{calc.roundOff >= 0 ? '+' : ''}{fmt(calc.roundOff)}</span>
            </div>
            <div className={styles.calcDivider} />
            <div className={styles.calcPayable}>
              <span className={styles.calcPayableLabel}>PAYABLE AMOUNT</span>
              <span className={styles.calcPayableAmount}>{fmt(calc.total)}</span>
            </div>
            {!isCredit && (
              <div className={styles.calcPaidRow}>
                <label className={styles.calcPaidLabel}>Amount Received (₹)</label>
                <input
                  type="number"
                  className={styles.calcPaidInput}
                  value={paidAmount}
                  min={0}
                  max={calc.total}
                  onChange={e => setPaidAmount(Math.min(parseFloat(e.target.value) || 0, calc.total))}
                />
                <div className={styles.calcOutstanding}>
                  <span>Outstanding</span>
                  <span style={{ color: calc.outstanding > 0 ? '#f59e0b' : '#10b981' }}>{fmt(calc.outstanding)}</span>
                </div>
                {calc.outstanding > 0 && (
                  <label className={styles.calcUdharToggle}>
                    <input
                      type="checkbox"
                      checked={autoCreateUdhar}
                      onChange={e => setAutoCreateUdhar(e.target.checked)}
                    />
                    <span>Create udhar for {fmt(calc.outstanding)} balance</span>
                  </label>
                )}
              </div>
            )}
            {isCredit && (
              <div className={styles.calcCreditNote}>Credit terms apply — udhar will be created</div>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actionPanel}>
            <button className={styles.finalizeBtn} onClick={handleConfirm} disabled={!!loading || !canSubmit}>
              <Icon name="file" size={16} color="white" /> {loading === 'confirm' ? 'Confirming...' : 'Finalize, Pay & Print'}
            </button>
            <button className={styles.draftBtn} onClick={handleSaveDraft} disabled={!!loading || !canSubmit}>
              <Icon name="edit" size={16} /> {loading === 'draft' ? 'Saving...' : 'Hold / Draft Invoice'}
            </button>
            <div className={styles.actionRow}>
              <button className={styles.actionBtn} onClick={() => {}}>
                <Icon name="share" size={18} /><span>SHARE</span>
              </button>
              <button className={styles.actionBtn} onClick={() => {}}>
                <Icon name="eye" size={18} /><span>PREVIEW</span>
              </button>
              <button className={`${styles.actionBtn} ${styles.actionBtnDiscard}`} onClick={() => navigate('/invoices')}>
                <Icon name="close" size={18} color="#ef4444" /><span>DISCARD</span>
              </button>
            </div>
          </div>
        </div>{/* end formPane */}
        <div className={styles.previewPane}>
          <div className={styles.previewTabs}>
            <button className={theme === 'classic' ? styles.activeTab : ''} onClick={() => setTheme('classic')}>Classic</button>
            <button className={theme === 'modern' ? styles.activeTab : ''} onClick={() => setTheme('modern')}>Modern</button>
            <button className={theme === 'jewellery' ? styles.activeTab : ''} onClick={() => setTheme('jewellery')}>Jewellery</button>
          </div>
          <div className={styles.iframeContainer}>
            <iframe srcDoc={previewHtml} title="Invoice Preview" />
          </div>
        </div>
      </div>
    </DashboardTemplate>
  );
};

export default CreateInvoicePage;
