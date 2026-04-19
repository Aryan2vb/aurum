import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import SearchBar from '../../components/molecules/SearchBar/SearchBar';
import Input from '../../components/atoms/Input/Input';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import { searchCustomers } from '../../services/customersService';
import { createInvoice, createDraft, getInvoiceSettings } from '../../services/invoicesService';
import { calcInvoiceTotals } from '../../utils/invoiceCalc';
import styles from './CreateInvoicePageMobile.module.css';

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
    modeOfPayment: "CASH"
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

const CreateInvoicePageMobile = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('jewellery');
  const [paidAmount, setPaidAmount] = useState(0);
  const [autoCreateUdhar, setAutoCreateUdhar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceState);
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
        setSettingsLoading(true);
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
            modeOfPayment: "CASH" // Keep default payment mode
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
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Live totals for Calculation Hub
  const calc = React.useMemo(() =>
    calcInvoiceTotals(invoiceData.items, invoiceData.hallmarkCharges, invoiceData.taxes.cgstRate, invoiceData.taxes.sgstRate, paidAmount),
  [invoiceData, paidAmount]);

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
    
    // Auto-calculate net weight when gross or stone weight changes
    if (field === 'grossWeight' || field === 'stoneWeight') {
      const grossWeight = parseFloat(newItems[index].grossWeight) || 0;
      const stoneWeight = parseFloat(newItems[index].stoneWeight) || 0;
      newItems[index].netWeight = grossWeight - stoneWeight;
      
      // Auto-calculate amount
      const rate = parseFloat(newItems[index].rate) || 0;
      const makingCharges = parseFloat(newItems[index].makingCharges) || 0;
      const stoneCharges = parseFloat(newItems[index].stoneCharges) || 0;
      const hallmarkingCharge = newItems[index].huid ? 45 : 0;
      newItems[index].amount = (newItems[index].netWeight * rate) + makingCharges + stoneCharges + hallmarkingCharge;
    }
    
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
    invoiceDate: new Date().toISOString().slice(0, 10),
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
    deliveryNote: '',
    dispatchDocNo: '',
    destination: '',
    termsOfDelivery: '',
    items: invoiceData.items.map(item => {
      const purityLabel = item.purity || '22K';
      const purityNum = parseFloat(purityLabel.replace(/[Kk]/, ''));
      const isKarat = purityLabel.toUpperCase().includes('K');
      const purityBasis = isKarat ? 24 : 1000;
      const purityValue = isKarat ? purityNum : (purityNum / 1000) * 24;
      
      return {
        slNo: item.slNo,
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity.toString(),
        unit: item.unit,
        metalType: item.metalType,
        metalRate: item.rate.toString(),
        purityLabel: item.purity,
        purityValue: purityValue.toString(),
        purityBasis: purityBasis,
        effectiveRate: item.rate.toString(),
        grossWeight: item.grossWeight.toString(),
        stoneWeight: item.stoneWeight.toString(),
        netWeight: item.netWeight.toString(),
        makingCharges: item.makingCharges.toString(),
        makingChargesType: item.makingChargesType,
        makingChargesAmount: item.makingChargesType === 'FLAT_PER_ITEM' 
          ? item.makingCharges.toString()
          : (item.makingChargesType === 'PER_GRAM' 
            ? (item.makingCharges * item.netWeight).toString()
            : ((item.makingCharges * item.rate * item.netWeight) / 100).toString()
          ),
        stoneCharges: item.stoneCharges.toString(),
        isHallmarked: !!item.huid,
        hallmarkingCharge: item.huid ? '45' : '0',
        huid: item.huid || undefined,
        taxableAmount: item.amount.toString(),
        totalAmount: item.amount.toString(),
        unitPrice: item.rate.toString()
      };
    }),
  });

  const handleConfirm = async () => {
    try {
      setLoading('confirm');
      const payload = buildPayload();
      const response = await createInvoice(payload);
      console.log('Invoice created:', response);
      navigate(`/invoices/${response.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading('draft');
      const payload = buildPayload();
      const response = await createDraft(payload);
      console.log('Draft saved:', response);
      navigate(`/invoices/${response.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = selectedCustomerId &&
    invoiceData.items.length > 0 &&
    invoiceData.items.every(i => i.description && i.hsnSac && parseFloat(i.grossWeight) > 0 && parseFloat(i.rate) > 0) &&
    !settingsLoading;

  // Show loading state while fetching settings
  if (settingsLoading) {
    return (
      <MobileTemplate title="Create Invoice">
        <div className={styles.mobileContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}>
              <Icon name="loader" size={24} color="var(--color-primary)" />
            </div>
            <p className={styles.loadingText}>Loading invoice settings...</p>
          </div>
        </div>
      </MobileTemplate>
    );
  }

  const headerAction = (
    <button className={styles.headerSaveBtn} onClick={handleSaveDraft} disabled={!canSubmit || loading}>
      <Icon name="save" size={20} />
    </button>
  );

  return (
    <MobileTemplate title="New Invoice" headerAction={headerAction}>
      <div className={styles.mobileContainer}>
        {/* Customer Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Customer Details</h2>
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <SearchBar
                placeholder="Search by name or number..."
                value={searchQuery}
                onChange={handleSearch}
                showIcon={true}
              />
              {searching && <div className={styles.searchResults}><div className={styles.searchLoading}>Searching...</div></div>}
              {!searching && searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map(customer => (
                    <div key={customer.id} className={styles.searchResultItem} onClick={() => handleCustomerSelect(customer)}>
                      <div className={styles.searchResultAvatar}>
                        {(customer.fullName || customer.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.searchResultInfo}>
                        <div className={styles.searchResultName}>{customer.fullName || customer.name}</div>
                        <div className={styles.searchResultPhone}>{customer.contactDetails?.[0]?.primaryPhone || customer.phone || 'No phone'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {invoiceData.buyer.name && (
            <div className={styles.customerInfo}>
              <div className={styles.customerHeader}>
                <Avatar name={invoiceData.buyer.name} size="small" />
                <div>
                  <h3 className={styles.customerName}>{invoiceData.buyer.name}</h3>
                  <p className={styles.customerPhone}>{invoiceData.buyer.phone}</p>
                </div>
              </div>
              <div className={styles.customerDetails}>
                <p className={styles.customerAddress}>{invoiceData.buyer.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Invoice Details</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Date</label>
              <Input 
                type="date" 
                value={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setInvoiceData({...invoiceData, metadata: {...invoiceData.metadata, invoiceDate: e.target.value}})}
              />
            </div>
            <div className={styles.formField}>
              <label>Payment Mode</label>
              <div className={styles.paymentModes}>
                {['CASH', 'CREDIT', 'UPI'].map(mode => (
                  <button
                    key={mode}
                    className={`${styles.paymentMode} ${invoiceData.metadata.modeOfPayment === mode ? styles.active : ''}`}
                    onClick={() => setInvoiceData({...invoiceData, metadata: {...invoiceData.metadata, modeOfPayment: mode}})}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Items</h2>
            <button className={styles.addItemBtn} onClick={addItem}>
              <Icon name="plus" size={16} />
              Add Item
            </button>
          </div>

          <div className={styles.itemsList}>
            {invoiceData.items.map((item, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemNumber}>Item {index + 1}</span>
                  {invoiceData.items.length > 1 && (
                    <button className={styles.removeItemBtn} onClick={() => removeItem(index)}>
                      <Icon name="x" size={16} />
                    </button>
                  )}
                </div>

                <div className={styles.itemFields}>
                  <Input
                    placeholder="Description (e.g. 22K Gold Chain)"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className={styles.fullWidth}
                  />
                  
                  <div className={styles.metalSelector}>
                    {['GOLD', 'SILVER', 'PLATINUM'].map(metal => (
                      <button
                        key={metal}
                        className={`${styles.metalBtn} ${item.metalType === metal ? styles.active : ''}`}
                        onClick={() => updateItem(index, 'metalType', metal)}
                      >
                        {metal.charAt(0) + metal.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div className={styles.row3}>
                    <Input
                      type="number"
                      placeholder="Metal Rate ₹/gm"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                    />
                    <Input
                      value={item.hsnSac}
                      onChange={(e) => updateItem(index, 'hsnSac', e.target.value)}
                      placeholder="HSN/SAC"
                    />
                  </div>

                  <div className={styles.row3}>
                    <Input
                      type="number"
                      placeholder="Gross wt (g)"
                      value={item.grossWeight}
                      onChange={(e) => updateItem(index, 'grossWeight', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Stone wt (g)"
                      value={item.stoneWeight}
                      onChange={(e) => updateItem(index, 'stoneWeight', e.target.value)}
                    />
                    <Input
                      placeholder="HUID (optional)"
                      value={item.huid}
                      onChange={(e) => updateItem(index, 'huid', e.target.value)}
                    />
                  </div>

                  <div className={styles.makingChargesRow}>
                    <div className={styles.makingChargesType}>
                      {['FLAT_PER_ITEM', 'PER_GRAM', 'PERCENTAGE_ON_METAL'].map(type => (
                        <button
                          key={type}
                          className={`${styles.makingTypeBtn} ${item.makingChargesType === type ? styles.active : ''}`}
                          onClick={() => updateItem(index, 'makingChargesType', type)}
                        >
                          {type === 'FLAT_PER_ITEM' ? 'Flat' : type === 'PER_GRAM' ? '/gm' : '%'}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Making charges"
                      value={item.makingCharges}
                      onChange={(e) => updateItem(index, 'makingCharges', e.target.value)}
                    />
                  </div>

                  <div className={styles.itemAmount}>
                    <span>Amount: {fmt(item.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Summary */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Tax Summary</h2>
          <div className={styles.taxSummary}>
            <div className={styles.taxRow}>
              <span>Subtotal</span>
              <span>{fmt(calc.subtotal)}</span>
            </div>
            <div className={styles.taxRow}>
              <span>CGST ({invoiceData.taxes.cgstRate}%)</span>
              <span>{fmt(calc.cgst)}</span>
            </div>
            <div className={styles.taxRow}>
              <span>SGST ({invoiceData.taxes.sgstRate}%)</span>
              <span>{fmt(calc.sgst)}</span>
            </div>
            <div className={styles.taxDivider} />
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.totalAmount}>{fmt(calc.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {!isCredit && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Payment</h2>
            <div className={styles.paymentSection}>
              <div className={styles.paymentField}>
                <label>Amount Received (₹)</label>
                <Input
                  type="number"
                  value={paidAmount}
                  min={0}
                  max={calc.total}
                  onChange={e => setPaidAmount(Math.min(parseFloat(e.target.value) || 0, calc.total))}
                />
              </div>
              <div className={styles.balanceInfo}>
                <span>Balance: </span>
                <span className={calc.outstanding > 0 ? styles.balanceDue : styles.balancePaid}>
                  {fmt(calc.outstanding)}
                </span>
              </div>
              {calc.outstanding > 0 && (
                <label className={styles.udharToggle}>
                  <input
                    type="checkbox"
                    checked={autoCreateUdhar}
                    onChange={e => setAutoCreateUdhar(e.target.checked)}
                  />
                  <span>Create udhar for balance</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <textarea
            className={styles.notesField}
            placeholder="Add notes or declaration..."
            value={invoiceData.declaration}
            onChange={(e) => setInvoiceData({...invoiceData, declaration: e.target.value})}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className={styles.actionSection}>
          <button 
            className={styles.createDraftBtn} 
            onClick={handleSaveDraft} 
            disabled={!canSubmit || loading}
          >
            {loading === 'draft' ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            className={styles.createInvoiceBtn} 
            onClick={handleConfirm} 
            disabled={!canSubmit || loading}
          >
            {loading === 'confirm' ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </MobileTemplate>
  );
};

export default CreateInvoicePageMobile;
