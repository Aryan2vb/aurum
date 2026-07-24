import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Icon from '../../components/atoms/Icon/Icon';
import Toast from '../../components/atoms/Toast/Toast';
import DateDisplay from '../../components/atoms/DateDisplay/DateDisplay';
import { getPurchases, createPurchase } from '../../services/purchasesService';
import { getVendors, createVendor, updateVendor } from '../../services/vendorsService';
import ImportExportMenu from '../../components/molecules/ImportExportMenu/ImportExportMenu';
import './PurchasesPage.css';

const columnHelper = createColumnHelper();
const fmtAmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWeight = (n) => `${Number(n || 0).toFixed(3)} g`;
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const round3 = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const emptyItem = () => ({
  itemName: '',
  metalType: 'GOLD',
  purity: '22K',
  netWeight: '',
  rate: '',
});

const SkeletonRows = ({ rows = 5, cols = 7 }) => (
  <>{Array.from({ length: rows }).map((_, ri) => (
    <tr key={ri}>{Array.from({ length: cols }).map((__, ci) => (
      <td key={ci} className="attio-td"><div className="skeleton-cell"><div className="skeleton-bar" style={{ width: ['40%','60%','80%'][(ri+ci)%3] }} /></div></td>
    ))}</tr>
  ))}</>
);

const buildColumns = () => [
  columnHelper.accessor(row => row.invoiceNumber || row.id?.slice(0, 8), { id: 'invoiceNumber', header: 'Bill #', size: 110 }),
  columnHelper.accessor(row => row.purchaseDate || row.invoiceDate, { id: 'purchaseDate', header: 'Date', size: 120,
    cell: info => info.getValue() ? <DateDisplay date={info.getValue()} format="absolute" size="sm" /> : '—',
  }),
  columnHelper.accessor(row => row.vendor?.name || '—', {
    id: 'vendorName',
    header: 'Vendor',
    size: 190,
    cell: info => {
      const vendor = info.row.original.vendor;
      return (
        <div className="vendor-cell">
          <strong>{vendor?.name || '—'}</strong>
          {(vendor?.gstin || vendor?.phone) && <span>{vendor.gstin || vendor.phone}</span>}
        </div>
      );
    },
  }),
  columnHelper.accessor(row => row.items?.length || 1, { id: 'items', header: 'Items', size: 80 }),
  columnHelper.accessor(row => row.totalGoldWeight || (row.metalType === 'GOLD' ? row.totalWeight : 0), {
    id: 'goldWeight',
    header: 'Gold',
    size: 110,
    cell: info => fmtWeight(info.getValue()),
  }),
  columnHelper.accessor(row => row.totalSilverWeight || (row.metalType === 'SILVER' ? row.totalWeight : 0), {
    id: 'silverWeight',
    header: 'Silver',
    size: 110,
    cell: info => fmtWeight(info.getValue()),
  }),
  columnHelper.accessor(row => row.grandTotal || row.totalAmount, { id: 'grandTotal', header: 'Total', size: 130,
    cell: info => fmtAmt(info.getValue()),
  }),
];

const flattenPurchaseRow = (p) => {
  const sgst = Number(p.sgstAmount || 0);
  const cgst = Number(p.cgstAmount || 0);
  const igst = Number(p.igstAmount || 0);
  return {
    'NAME': p.vendorName || p.vendor?.name || '-',
    'GSTIN': p.vendorGstin || p.vendor?.gstin || '-',
    'STATE CODE': p.vendorStateCode || p.vendor?.stateCode || '-',
    'STATE NAME': p.vendorStateName || p.vendor?.stateName || '-',
    'INVOICE NO': p.invoiceNumber || '-',
    'INVOICE DATE': p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-GB') : '-',
    'INVOICE VALUE': Number(p.grandTotal || p.totalAmount || 0),
    'TAXABLE VALUE': Number(p.taxableAmount || 0),
    'SGST': sgst,
    'CGST': cgst,
    'IGST': igst,
    'TOTAL TAX': sgst + cgst + igst,
    'GOLD (GM)': Number(p.totalGoldWeight || 0),
    'SILVER (GM)': Number(p.totalSilverWeight || 0),
  };
};

const PurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isVendorSubmitting, setIsVendorSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({ name: '', phone: '', gstin: '', address: '', stateCode: '', stateName: '' });
  const [formData, setFormData] = useState({
    vendorId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    taxType: 'IGST',
    notes: '',
  });
  const [items, setItems] = useState([emptyItem()]);

  // Manage Vendor UI State
  const [selectedVendorIdForManage, setSelectedVendorIdForManage] = useState(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [isEditingVendor, setIsEditingVendor] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === formData.vendorId),
    [vendors, formData.vendorId]
  );

  const calculatedItems = useMemo(() => items.map((item) => {
    const netWeight = num(item.netWeight);
    const rate = num(item.rate);
    const metalAmount = round2(netWeight * rate);
    const totalAmount = metalAmount;
    return { ...item, netWeight, metalAmount, totalAmount };
  }), [items]);

  const totals = useMemo(() => {
    const subtotal = round2(calculatedItems.reduce((sum, item) => sum + item.totalAmount, 0));
    const isIgst = formData.taxType === 'IGST';
    const isCgst = formData.taxType === 'CGST_SGST';
    const hasTax = isIgst || isCgst;
    
    const taxableAmount = subtotal; // Assume exclusive
    const cgstAmount = isCgst ? round2(taxableAmount * 1.5 / 100) : 0;
    const sgstAmount = isCgst ? round2(taxableAmount * 1.5 / 100) : 0;
    const igstAmount = isIgst ? round2(taxableAmount * 3.0 / 100) : 0;
    
    return {
      totalGoldWeight: round3(calculatedItems.filter((item) => item.metalType === 'GOLD').reduce((sum, item) => sum + item.netWeight, 0)),
      totalSilverWeight: round3(calculatedItems.filter((item) => item.metalType === 'SILVER').reduce((sum, item) => sum + item.netWeight, 0)),
      totalMetal: round2(calculatedItems.reduce((sum, item) => sum + item.metalAmount, 0)),
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal: hasTax ? round2(subtotal + cgstAmount + sgstAmount + igstAmount) : subtotal,
    };
  }, [calculatedItems, formData.taxType]);

  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPurchases();
      setPurchases(res || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to load purchases' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const res = await getVendors();
      setVendors(res || []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
    loadVendors();
  }, [loadPurchases, loadVendors]);

  const handleHeaderChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'metalType') {
        updated.purity = value === 'GOLD' ? '22K' : 'F';
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  const resetBill = () => {
    setFormData(prev => ({
      ...prev,
      invoiceNumber: '',
      dueDate: '',
      notes: '',
    }));
    setItems([emptyItem()]);
  };

  const handleVendorChange = (e) => {
    const { name, value } = e.target;
    setVendorFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    if (!vendorFormData.name.trim()) {
      setToast({ type: 'error', message: 'Vendor name is required' });
      return;
    }

    try {
      setIsVendorSubmitting(true);
      if (isEditingVendor && selectedVendorIdForManage) {
        await updateVendor(selectedVendorIdForManage, {
          name: vendorFormData.name.trim(),
          phone: vendorFormData.phone || null,
          gstin: vendorFormData.gstin || null,
          address: vendorFormData.address || null,
          stateCode: vendorFormData.stateCode || null,
          stateName: vendorFormData.stateName || null,
        });
        setToast({ type: 'success', message: 'Vendor updated successfully!' });
      } else {
        const newVendor = await createVendor({
          name: vendorFormData.name.trim(),
          phone: vendorFormData.phone || undefined,
          gstin: vendorFormData.gstin || undefined,
          address: vendorFormData.address || undefined,
          stateCode: vendorFormData.stateCode || undefined,
          stateName: vendorFormData.stateName || undefined,
        });
        setToast({ type: 'success', message: 'Vendor created successfully!' });
        setFormData(prev => ({ ...prev, vendorId: newVendor.id }));
      }
      
      await loadVendors();
      // Keep selected vendor active or reset if it was a new creation
      if (!isEditingVendor) {
        setIsVendorModalOpen(false);
        setVendorFormData({ name: '', phone: '', gstin: '', address: '', stateCode: '', stateName: '' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save vendor' });
    } finally {
      setIsVendorSubmitting(false);
    }
  };

  const handleSelectVendorForManage = (vendor) => {
    setSelectedVendorIdForManage(vendor.id);
    setVendorFormData({
      name: vendor.name || '',
      phone: vendor.phone || '',
      gstin: vendor.gstin || '',
      address: vendor.address || '',
      stateCode: vendor.stateCode || '',
      stateName: vendor.stateName || '',
    });
    setIsEditingVendor(true);
  };

  const handleStartNewVendor = () => {
    setSelectedVendorIdForManage(null);
    setVendorFormData({ name: '', phone: '', gstin: '', address: '', stateCode: '', stateName: '' });
    setIsEditingVendor(false);
  };

  const filteredManageVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(vendorSearchQuery.toLowerCase()) || 
      (v.gstin && v.gstin.toLowerCase().includes(vendorSearchQuery.toLowerCase()))
    );
  }, [vendors, vendorSearchQuery]);

  const vendorPurchases = useMemo(() => {
    if (!selectedVendorIdForManage) return [];
    return purchases.filter(p => p.vendorId === selectedVendorIdForManage);
  }, [purchases, selectedVendorIdForManage]);

  const vendorStats = useMemo(() => {
    const totalAmount = vendorPurchases.reduce((sum, p) => sum + num(p.grandTotal || p.totalAmount), 0);
    const totalWeight = vendorPurchases.reduce((sum, p) => sum + num(p.totalWeight), 0);
    return {
      count: vendorPurchases.length,
      totalAmount,
      totalWeight,
    };
  }, [vendorPurchases]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendorId) {
      setToast({ type: 'error', message: 'Please select a vendor' });
      return;
    }
    const validItems = calculatedItems.filter((item) => item.netWeight > 0);
    if (validItems.length === 0) {
      setToast({ type: 'error', message: 'Add at least one item with net weight greater than 0' });
      return;
    }

    try {
      setIsSubmitting(true);
      await createPurchase({
        vendorId: formData.vendorId,
        invoiceNumber: formData.invoiceNumber || undefined,
        purchaseDate: formData.purchaseDate,
        addGst: formData.taxType !== 'NONE',
        gstInclusive: false,
        taxType: formData.taxType === 'NONE' ? undefined : formData.taxType,
        cgstRate: formData.taxType === 'CGST_SGST' ? 1.5 : 0,
        sgstRate: formData.taxType === 'CGST_SGST' ? 1.5 : 0,
        igstRate: formData.taxType === 'IGST' ? 3.0 : 0,
        metalType: validItems[0].metalType,
        purity: validItems[0].purity,
        totalWeight: validItems.reduce((sum, item) => sum + item.netWeight, 0),
        rate: validItems[0].rate ? parseFloat(validItems[0].rate) : 0,
        totalAmount: totals.grandTotal,
        notes: formData.notes?.trim() || undefined,
        items: validItems.map((item) => ({
          itemType: 'P',
          itemName: item.itemName || undefined,
          metalType: item.metalType,
          purity: item.purity,
          pieces: 1,
          grossWeight: num(item.netWeight),
          lessWeight: 0,
          netWeight: item.netWeight,
          rate: num(item.rate),
          labour: 0,
          otherCharges: 0,
          discount: 0,
        })),
      });
      setToast({ type: 'success', message: 'Purchase bill saved and stock updated' });
      resetBill();
      loadPurchases();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to record purchase bill' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(() => buildColumns(), []);
  const table = useReactTable({
    data: purchases, columns,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  const colCount = columns.length;
  const purchaseStats = useMemo(() => purchases.reduce((acc, purchase) => {
    acc.totalWeight += Number(purchase.totalWeight || 0);
    acc.totalAmount += Number(purchase.grandTotal || purchase.totalAmount || 0);
    acc.todayCount += purchase.purchaseDate?.slice(0, 10) === new Date().toISOString().slice(0, 10) ? 1 : 0;
    return acc;
  }, { totalWeight: 0, totalAmount: 0, todayCount: 0 }), [purchases]);

  return (
    <DashboardTemplate headerTitle="Purchases (Inward)" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="purchase-bill-page">
        <div className="purchase-bill-container glass-panel animate-fade-in">
          <div className="section-header attio-header-top">
            <h3>Record New Purchase Bill</h3>
            <div className="attio-header-actions">
              <button type="button" className="attio-action-clear" onClick={resetBill}>Clear Form</button>
              <button type="submit" form="purchase-bill-form" className="attio-action-save" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Bill'}</button>
            </div>
          </div>
          <form id="purchase-bill-form" className="purchase-bill premium-form" onSubmit={handleSubmit}>
                <div className="attio-properties-grid">
                  <div className="attio-property group">
                    <span className="attio-prop-label">Party Name *</span>
                    <div className="vendor-select-row flex-1">
                      <select name="vendorId" className="inline-input font-medium cursor-pointer" value={formData.vendorId} onChange={handleHeaderChange} required>
                        <option value="">Select supplier...</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <button type="button" className="icon-action-btn" onClick={() => setIsVendorModalOpen(true)} title="Add New Supplier">
                        <Icon name="add" size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="attio-property group">
                    <span className="attio-prop-label">Date</span>
                    <input type="date" name="purchaseDate" className="inline-input cursor-pointer" value={formData.purchaseDate} onChange={handleHeaderChange} required />
                  </div>
                  <div className="attio-property group">
                    <span className="attio-prop-label">Bill No.</span>
                    <input name="invoiceNumber" className="inline-input" value={formData.invoiceNumber} onChange={handleHeaderChange} placeholder="Manual" />
                  </div>
                  <div className="attio-property group">
                    <span className="attio-prop-label">Party Type</span>
                    <div className="flex-1 px-1-5">
                      <span className="party-badge">Supplier</span>
                    </div>
                  </div>
                  <div className="attio-property group">
                    <span className="attio-prop-label">Mobile No</span>
                    <input className="inline-input text-gray" value={selectedVendor?.phone || ''} readOnly />
                  </div>
                  <div className="attio-property group">
                    <span className="attio-prop-label">Address</span>
                    <input className="inline-input text-gray" value={selectedVendor?.address || ''} readOnly />
                  </div>
                </div>

                <div className="purchase-grid-wrap">
                  <table className="purchase-entry-grid simple-grid">
                    <colgroup>
                      <col style={{ width: 'auto' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '50px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Description of Goods</th>
                        <th>Metal</th>
                        <th>Purity</th>
                        <th className="num-col">Quantity (GMS)</th>
                        <th className="num-col">Rate</th>
                        <th className="num-col">Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculatedItems.map((item, index) => (
                        <tr key={index} className="attio-grid-row">
                          <td className="pr-2"><input value={item.itemName} className="inline-input" onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} placeholder="e.g. Gold Ornaments MIX" /></td>
                          <td className="px-2">
                            <select value={item.metalType} className="inline-input cursor-pointer" onChange={(e) => handleItemChange(index, 'metalType', e.target.value)}>
                              <option value="GOLD">GOLD</option>
                              <option value="SILVER">SILVER</option>
                            </select>
                          </td>
                          <td className="px-2">
                            <select value={item.purity} className="inline-input cursor-pointer" onChange={(e) => handleItemChange(index, 'purity', e.target.value)}>
                              {item.metalType === 'GOLD' ? <><option value="24K">24K</option><option value="22K">22K</option><option value="20K">20K</option><option value="18K">18K</option><option value="75">75</option></> : <><option value="F">F</option><option value="925">925</option><option value="22">22</option></>}
                            </select>
                          </td>
                          <td className="num-col px-2"><input type="number" step="0.001" className="inline-input text-right" value={item.netWeight === 0 ? '' : item.netWeight} onChange={(e) => handleItemChange(index, 'netWeight', e.target.value)} /></td>
                          <td className="num-col px-2"><input type="number" step="0.01" className="inline-input text-right" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} /></td>
                          <td className="computed-cell total-cell num-col pl-2">{fmtAmt(item.totalAmount)}</td>
                          <td className="center-col">
                            <button type="button" className="grid-remove-btn hover-show" onClick={() => removeItem(index)} disabled={items.length === 1} title="Remove Item"><Icon name="delete" size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><button type="button" className="grid-add-btn attio-secondary-btn" style={{ padding: '0.4rem 0.8rem', minHeight: 'auto', marginTop: '0.5rem' }} onClick={addItem}>+ Add Item</button></td>
                        <td className="num-col">{calculatedItems.reduce((sum, item) => sum + item.netWeight, 0).toFixed(3)} GMS</td>
                        <td></td>
                        <td className="num-col">{fmtAmt(totals.taxableAmount)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="attio-totals-section">
                  <div className="attio-footer-left">
                    <input 
                      name="notes" 
                      className="remark-input-box" 
                      placeholder="e.g. Gold Ornaments MIX"
                      value={formData.notes} 
                      onChange={handleHeaderChange} 
                    />
                    <div className="attio-contextual-totals">
                      <div className="ctx-total">
                        <span className="ctx-label">Total Gold Wt.</span>
                        <span className="ctx-value">{fmtWeight(totals.totalGoldWeight)}</span>
                      </div>
                      <div className="ctx-total">
                        <span className="ctx-label">Total Silver Wt.</span>
                        <span className="ctx-value">{fmtWeight(totals.totalSilverWeight)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="attio-financials">
                    <div className="fin-row">
                      <span>Taxable Amount</span>
                      <span className="fin-val">{fmtAmt(totals.taxableAmount)}</span>
                    </div>
                    
                    <div className="fin-row flex-center">
                      <select name="taxType" className="inline-input cursor-pointer tax-select" value={formData.taxType} onChange={handleHeaderChange} style={{ paddingLeft: 0, fontWeight: 500 }}>
                        <option value="NONE">No GST</option>
                        <option value="IGST">Interstate (IGST)</option>
                        <option value="CGST_SGST">Local (CGST + SGST)</option>
                      </select>
                    </div>

                    {formData.taxType === 'CGST_SGST' && (
                      <>
                        <div className="fin-row">
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>CGST (1.5%)</span>
                          <span className="fin-val">{fmtAmt(totals.cgstAmount)}</span>
                        </div>
                        <div className="fin-row">
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>SGST (1.5%)</span>
                          <span className="fin-val">{fmtAmt(totals.sgstAmount)}</span>
                        </div>
                      </>
                    )}

                    {formData.taxType === 'IGST' && (
                      <div className="fin-row">
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>IGST (3%)</span>
                        <span className="fin-val">{fmtAmt(totals.igstAmount)}</span>
                      </div>
                    )}

                    <div className="fin-row grand-row">
                      <span className="fin-label-bold">Bill Closing Balance</span>
                      <span className="fin-val-bold">{fmtAmt(totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>
        </form>
      </div>

        <div className="purchases-history-panel">
          <div className="purchase-stats-row">
            <div className="purchase-stat"><span>Total inward</span><strong>{fmtWeight(purchaseStats.totalWeight)}</strong></div>
            <div className="purchase-stat"><span>Purchase value</span><strong>{fmtAmt(purchaseStats.totalAmount)}</strong></div>
            <div className="purchase-stat"><span>Today</span><strong>{purchaseStats.todayCount} bills</strong></div>
          </div>
          <div className="attio-table-container">
            <div className="attio-header">
              <div className="attio-header-left">
                <span className="saas-view-label">Purchase History</span>
              </div>
              <div className="attio-header-right">
                <ImportExportMenu
                  data={purchases}
                  filename="Purchases"
                  resourceName="purchases"
                  flattenRow={flattenPurchaseRow}
                  isLoading={loading}
                />
                <button className="attio-secondary-btn" onClick={loadPurchases} disabled={loading}><Icon name="refresh" size={14} /><span>Refresh</span></button>
              </div>
            </div>
            <div className="attio-table-wrapper">
              <table className={`attio-table ${loading ? 'attio-skeleton-table' : ''}`}>
                <thead><tr>{table.getHeaderGroups()[0]?.headers.map(header => <th key={header.id} className="attio-th" style={{ width: header.getSize() }}><div className="attio-th-content"><span>{flexRender(header.column.columnDef.header, header.getContext())}</span></div></th>)}</tr></thead>
                <tbody>
                  {loading ? <SkeletonRows cols={colCount} /> : table.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={colCount} className="attio-empty"><Icon name="order" size={36} color="var(--text-tertiary)" /><span>No purchase invoices found.</span></td></tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr key={row.id}>{row.getVisibleCells().map(cell => <td key={cell.id} className="attio-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isVendorModalOpen && (
        <div className="stock-modal-backdrop animate-fade-in">
          <div className="stock-modal-content glass-panel vendor-modal-wide">
            <div className="stock-modal-header">
              <h3>Manage Suppliers</h3>
              <button className="stock-modal-close" onClick={() => setIsVendorModalOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            
            <div className="vendor-manage-layout">
              {/* Left Column: Search & List */}
              <div className="vendor-manage-sidebar">
                <div className="vendor-search-wrap">
                  <input
                    type="text"
                    className="saas-input vendor-search-input"
                    placeholder="Search suppliers..."
                    value={vendorSearchQuery}
                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className="attio-secondary-btn add-vendor-btn"
                    onClick={handleStartNewVendor}
                  >
                    + New
                  </button>
                </div>
                
                <div className="vendor-list-scroll">
                  {filteredManageVendors.length === 0 ? (
                    <div className="no-vendors-found">No suppliers found.</div>
                  ) : (
                    filteredManageVendors.map(v => (
                      <div
                        key={v.id}
                        className={`vendor-list-item ${selectedVendorIdForManage === v.id ? 'active' : ''}`}
                        onClick={() => handleSelectVendorForManage(v)}
                      >
                        <span className="vendor-item-name">{v.name}</span>
                        {v.gstin && <span className="vendor-item-sub">{v.gstin}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Edit/Create Form + History */}
              <div className="vendor-manage-main">
                <form onSubmit={handleVendorSubmit} className="stock-modal-form vendor-edit-form">
                  <h4 className="vendor-form-title">
                    {isEditingVendor ? 'Edit Supplier Details' : 'Add New Supplier'}
                  </h4>
                  
                  <div className="vendor-form-grid">
                    <div className="form-group">
                      <label>Supplier Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="saas-input"
                        value={vendorFormData.name}
                        onChange={handleVendorChange}
                        placeholder="e.g. Acme Gold Traders"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>GSTIN</label>
                      <input
                        type="text"
                        name="gstin"
                        className="saas-input"
                        value={vendorFormData.gstin}
                        onChange={handleVendorChange}
                        placeholder="e.g. 27AAAAA1111A1Z1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        className="saas-input"
                        value={vendorFormData.phone}
                        onChange={handleVendorChange}
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                    <div className="form-group">
                      <label>State Name</label>
                      <input
                        type="text"
                        name="stateName"
                        className="saas-input"
                        value={vendorFormData.stateName}
                        onChange={handleVendorChange}
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                    <div className="form-group">
                      <label>State Code</label>
                      <input
                        type="text"
                        name="stateCode"
                        className="saas-input"
                        value={vendorFormData.stateCode}
                        onChange={handleVendorChange}
                        placeholder="e.g. 27"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Address</label>
                      <textarea
                        name="address"
                        className="saas-textarea"
                        value={vendorFormData.address}
                        onChange={handleVendorChange}
                        placeholder="Address details..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="stock-modal-actions vendor-actions">
                    {isEditingVendor && (
                      <button
                        type="button"
                        className="attio-secondary-btn"
                        onClick={handleStartNewVendor}
                      >
                        Clear Selection
                      </button>
                    )}
                    <button
                      type="submit"
                      className="attio-primary-btn"
                      disabled={isVendorSubmitting}
                    >
                      {isVendorSubmitting ? 'Saving...' : isEditingVendor ? 'Update Supplier' : 'Save Supplier'}
                    </button>
                  </div>
                </form>

                {isEditingVendor && selectedVendorIdForManage && (
                  <div className="vendor-history-section">
                    <h4 className="vendor-form-title">Purchase History & Stats</h4>
                    <div className="vendor-stats-mini-row">
                      <div className="vendor-stat-mini">
                        <span>Total Bills</span>
                        <strong>{vendorStats.count}</strong>
                      </div>
                      <div className="vendor-stat-mini">
                        <span>Total Weight</span>
                        <strong>{fmtWeight(vendorStats.totalWeight)}</strong>
                      </div>
                      <div className="vendor-stat-mini">
                        <span>Total Value</span>
                        <strong>{fmtAmt(vendorStats.totalAmount)}</strong>
                      </div>
                    </div>

                    <div className="vendor-history-table-wrapper">
                      {vendorPurchases.length === 0 ? (
                        <div className="no-history">No purchase history found for this supplier.</div>
                      ) : (
                        <table className="vendor-history-table">
                          <thead>
                            <tr>
                              <th>Bill No.</th>
                              <th>Date</th>
                              <th>Items</th>
                              <th>Weight</th>
                              <th className="text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorPurchases.map(p => (
                              <tr key={p.id}>
                                <td>{p.invoiceNumber || p.id.slice(0, 8)}</td>
                                <td>{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-GB') : '-'}</td>
                                <td>{p.items?.length || 1}</td>
                                <td>{fmtWeight(p.totalWeight)}</td>
                                <td className="text-right">{fmtAmt(p.grandTotal || p.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardTemplate>
  );
};

export default PurchasesPage;
