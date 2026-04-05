import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import SearchBar from '../../components/molecules/SearchBar/SearchBar';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import Icon from '../../components/atoms/Icon/Icon';
import Avatar from '../../components/atoms/Avatar/Avatar';
import { searchCustomers } from '../../services/customersService';
import { createInvoice } from '../../services/invoicesService';
import { generateInvoiceHtml, generateJewelleryInvoiceHtml, generateModernInvoiceHtml } from '../../utils/invoiceTemplates';
import styles from './CreateInvoicePage.module.css';

const defaultInvoiceState = {
  company: {
    name: "RAMAKRISHANA ORNAMENTS",
    address: "NEAR JAGAUTA MATA MANDIR, MAIN MARKET, SEMARIYA, REWA, 486445",
    gstin: "23AJNPS3243DIZC",
    state: "MADHYA PRADESH",
    stateCode: "23"
  },
  buyer: {
    name: "",
    address: "",
    phone: "",
    state: "",
    stateCode: "06"
  },
  metadata: {
    invoiceNo: "Auto-Generated",
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    modeOfPayment: "UPI"
  },
  items: [
    {
      slNo: 1,
      description: "GOLD JEWELLERY\\nOne Pc Gents Ring Gold",
      hsnSac: "71131910",
      quantity: 4.77,
      unit: "GMS",
      rate: 9924.49,
      makingCharges: 500,
      metalType: "GOLD",
      grossWeight: 5.00,
      netWeight: 4.77,
      huid: "",
      amount: 47638.51
    }
  ],
  taxes: {
    cgstRate: 1.5,
    cgstAmount: 714.58,
    sgstRate: 1.5,
    sgstAmount: 714.58,
    totalTaxAmount: 1429.16
  },
  hsnSummary: [],
  roundOff: 0,
  totalAmount: 49068,
  amountInWords: "Indian Rupees Forty Nine Thousand Sixty Eight Only",
  taxAmountInWords: "Indian Rupees One Thousand Four Hundred Twenty Nine Only",
  declaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
};

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState('classic');
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceState);
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Customer Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceTimerRef = useRef(null);

  useEffect(() => {
    // Generate HTML preview whenever data or theme changes
    const runGeneration = () => {
      // Recalculate amounts before preview
      let subtotal = 0;
      const updatedItems = invoiceData.items.map(item => {
        const amount = (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)) + parseFloat(item.makingCharges || 0);
        subtotal += amount;
        return { ...item, amount };
      });
      
      const taxAmt = Math.round(subtotal * (invoiceData.taxes.cgstRate / 100) * 100) / 100;
      const totalTax = taxAmt * 2;
      const gross = subtotal + totalTax;
      const roundedGross = Math.round(gross);
      
      const hydratedData = {
        ...invoiceData,
        items: updatedItems,
        taxes: {
          ...invoiceData.taxes,
          cgstAmount: taxAmt,
          sgstAmount: taxAmt,
          totalTaxAmount: totalTax
        },
        hsnSummary: [{
          hsnSac: updatedItems[0]?.hsnSac || '71131910',
          taxableValue: subtotal,
          cgstRate: invoiceData.taxes.cgstRate,
          cgstAmount: taxAmt,
          sgstRate: invoiceData.taxes.sgstRate,
          sgstAmount: taxAmt,
          totalTaxAmount: totalTax
        }],
        roundOff: roundedGross - gross,
        totalAmount: roundedGross,
      };

      try {
        if (theme === 'modern') setPreviewHtml(generateModernInvoiceHtml(hydratedData));
        else if (theme === 'jewellery') setPreviewHtml(generateJewelleryInvoiceHtml(hydratedData));
        else setPreviewHtml(generateInvoiceHtml(hydratedData));
      } catch (e) {
        console.error('Preview error', e);
      }
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
        grossWeight: 0,
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

  const handleSave = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer first.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        customerId: selectedCustomerId,
        items: invoiceData.items.map(item => ({
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          rate: parseFloat(item.rate),
          makingCharges: parseFloat(item.makingCharges || 0),
          metalType: item.metalType,
          grossWeight: parseFloat(item.grossWeight || 0),
          netWeight: parseFloat(item.netWeight || 0),
          purity: item.purity,
          huid: item.huid,
          amount: (parseFloat(item.quantity) * parseFloat(item.rate)) + parseFloat(item.makingCharges)
        })),
        templateType: theme,
        notes: invoiceData.declaration
      };
      
      const response = await createInvoice(payload);
      if (response && response.id) {
        navigate('/invoices');
      } else {
        alert('Failed to save invoice.');
      }
    } catch (error) {
      console.error(error);
      alert('Network/Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardTemplate headerTitle="Create Invoice">
      <div className={styles.headerToolbar}>
        <div className={styles.tabs}>
           <button className={theme === 'classic' ? styles.activeTab : ''} onClick={() => setTheme('classic')}>Classic (Standard)</button>
           <button className={theme === 'modern' ? styles.activeTab : ''} onClick={() => setTheme('modern')}>Modern (A4)</button>
           <button className={theme === 'jewellery' ? styles.activeTab : ''} onClick={() => setTheme('jewellery')}>Jewellery (Special)</button>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save & Print Invoice'}</button>
      </div>

      <div className={styles.splitView}>
        <div className={styles.formPane}>
          
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>1. Select Customer</h3>
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
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>2. Items</h3>
            {invoiceData.items.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <div className={styles.itemRowHeader}>
                  <h4>Item {index + 1}</h4>
                  <button className={styles.removeBtn} onClick={() => removeItem(index)}><Icon name="close" size={14} /></button>
                </div>
                <div className={styles.fieldGrid}>
                  <div className={styles.fieldFull}>
                    <label>Description</label>
                    <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="e.g. 22K Gold Chain" />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>HSN/SAC</label>
                    <Input value={item.hsnSac} onChange={(e) => updateItem(index, 'hsnSac', e.target.value)} />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>Quantity</label>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>Metal Type</label>
                    <div className={styles.metalToggle}>
                      <button 
                        className={item.metalType === 'GOLD' ? styles.activeMetal : ''} 
                        onClick={() => updateItem(index, 'metalType', 'GOLD')}
                      >Gold</button>
                      <button 
                        className={item.metalType === 'SILVER' ? styles.activeMetal : ''} 
                        onClick={() => updateItem(index, 'metalType', 'SILVER')}
                      >Silver</button>
                    </div>
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>Purity</label>
                    <Input value={item.purity || ''} onChange={(e) => updateItem(index, 'purity', e.target.value)} placeholder="e.g. 22K or 925" />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>Net Weight (gms)</label>
                    <Input type="number" value={item.netWeight} onChange={(e) => updateItem(index, 'netWeight', e.target.value)} />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>Gross Wt (gms)</label>
                    <Input type="number" value={item.grossWeight} onChange={(e) => updateItem(index, 'grossWeight', e.target.value)} />
                  </div>
                  <div className={styles.fieldHalf}>
                    <label>HUID</label>
                    <Input value={item.huid || ''} onChange={(e) => updateItem(index, 'huid', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={addItem} style={{ width: '100%', marginTop: '10px' }}><Icon name="add" size={16} /> Add Another Item</Button>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>3. Invoice Metadata</h3>
            <div className={styles.fieldGrid}>
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
                 <label>Tax Rate (CGST %)</label>
                 <Input type="number" step="0.1" value={invoiceData.taxes.cgstRate} onChange={(e) => setInvoiceData({...invoiceData, taxes: {...invoiceData.taxes, cgstRate: parseFloat(e.target.value), sgstRate: parseFloat(e.target.value)}})} />
              </div>
              <div className={styles.fieldFull}>
                 <label>Declaration / Notes</label>
                 <Input value={invoiceData.declaration} onChange={(e) => setInvoiceData({...invoiceData, declaration: e.target.value})} />
              </div>
            </div>
          </div>
          
        </div>
        <div className={styles.previewPane}>
          <div className={styles.paneHeader}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Live Preview</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Edits map directly to this document format.</p>
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
