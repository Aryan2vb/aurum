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
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  updatePurchaseAttachment,
  getPurchaseBillBookHtml,
} from '../../services/purchasesService';
import { getVendors, createVendor, updateVendor } from '../../services/vendorsService';
import { getPresignedUrl, uploadToR2, deleteAsset } from '../../services/uploadService';
import { getFinancialAccounts } from '../../services/financeService';
import ImportExportMenu from '../../components/molecules/ImportExportMenu/ImportExportMenu';
import PurchaseDetailSlideOver from '../../components/molecules/PurchaseDetailSlideOver/PurchaseDetailSlideOver';
import PaymentAccountSelect from '../../components/molecules/PaymentAccountSelect/PaymentAccountSelect';
import { PAYMENT_MODES, financialAccountIdFrom, paymentNeedsBankAccount, withFinancialAccount } from '../../utils/paymentAccounts';
import { buildPurchaseBillBookRequest } from '../../utils/billBookExport';
import { getMetalPurities } from '../../services/metalPuritiesService';
import { purityLabelsForMetal, withOrphanPurityOption } from '../../utils/metalPurities';
import './PurchasesPage.css';

const columnHelper = createColumnHelper();
const PURCHASE_PAYMENT_MODES = PAYMENT_MODES.filter((mode) => !['CREDIT', 'OLD_GOLD'].includes(mode));
const fmtAmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWeight = (n) => `${Number(n || 0).toFixed(3)} g`;
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const round3 = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;
const purchaseGoldWeight = (p) =>
  num(p.totalGoldWeight || (p.metalType === 'GOLD' ? p.totalWeight : 0));
const purchaseSilverWeight = (p) =>
  num(p.totalSilverWeight || (p.metalType === 'SILVER' ? p.totalWeight : 0));
const fmtMetalWeights = (p) => {
  const gold = purchaseGoldWeight(p);
  const silver = purchaseSilverWeight(p);
  const parts = [];
  if (gold > 0) parts.push(`Au ${fmtWeight(gold)}`);
  if (silver > 0) parts.push(`Ag ${fmtWeight(silver)}`);
  return parts.length ? parts.join(' · ') : fmtWeight(0);
};
const todayInput = () => new Date().toISOString().slice(0, 10);
const statusLabel = (status) => ({
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
}[status] || status || 'Unpaid');

const emptyItem = () => ({
  itemName: '',
  metalType: 'GOLD',
  purity: '22K',
  netWeight: '',
  rate: '',
  hallmarkCharge: '',
  otherCharges: '',
});

const emptyPayment = (paidAt = todayInput()) => ({
  mode: 'UPI',
  amount: '',
  paidAt,
  financialAccountId: '',
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
    size: 180,
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
  columnHelper.accessor(row => row.status || 'UNPAID', {
    id: 'status',
    header: 'Status',
    size: 100,
    cell: info => <span className={`purchase-status-badge status-${String(info.getValue()).toLowerCase()}`}>{statusLabel(info.getValue())}</span>,
  }),
  columnHelper.accessor(row => purchaseGoldWeight(row), {
    id: 'goldWeight',
    header: 'Gold',
    size: 95,
    cell: info => fmtWeight(info.getValue()),
  }),
  columnHelper.accessor(row => purchaseSilverWeight(row), {
    id: 'silverWeight',
    header: 'Silver',
    size: 95,
    cell: info => fmtWeight(info.getValue()),
  }),
  columnHelper.accessor(row => row.grandTotal || row.totalAmount, { id: 'grandTotal', header: 'Total', size: 120,
    cell: info => fmtAmt(info.getValue()),
  }),
  columnHelper.accessor(
    row => round2(num(row.grandTotal || row.totalAmount) - num(row.paidAmount)),
    {
      id: 'due',
      header: 'Due',
      size: 110,
      cell: info => {
        const due = num(info.getValue());
        return (
          <span className={due > 0.009 ? 'purchase-due-amt' : 'purchase-due-clear'}>
            {due > 0.009 ? fmtAmt(due) : '—'}
          </span>
        );
      },
    },
  ),
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
    taxType: 'CGST_SGST',
    adjustment: '',
    notes: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [payments, setPayments] = useState([]);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [financialAccountsLoaded, setFinancialAccountsLoaded] = useState(false);
  const [metalPurities, setMetalPurities] = useState([]);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [detailPurchase, setDetailPurchase] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [billBookExporting, setBillBookExporting] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  /** Saved attachment on the purchase being edited (or after load) */
  const [savedAttachment, setSavedAttachment] = useState(null);
  /** Newly picked local File (not yet uploaded) */
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  /** User cleared existing attachment */
  const [attachmentCleared, setAttachmentCleared] = useState(false);
  const attachmentInputRef = React.useRef(null);

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
    const hallmarkCharge = num(item.hallmarkCharge);
    const otherCharges = num(item.otherCharges);
    const totalAmount = round2(metalAmount + hallmarkCharge + otherCharges);
    return { ...item, netWeight, metalAmount, hallmarkCharge, otherCharges, totalAmount };
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
    const adjustment = num(formData.adjustment);
    const baseTotal = hasTax ? round2(subtotal + cgstAmount + sgstAmount + igstAmount) : subtotal;

    return {
      totalGoldWeight: round3(calculatedItems.filter((item) => item.metalType === 'GOLD').reduce((sum, item) => sum + item.netWeight, 0)),
      totalSilverWeight: round3(calculatedItems.filter((item) => item.metalType === 'SILVER').reduce((sum, item) => sum + item.netWeight, 0)),
      totalMetal: round2(calculatedItems.reduce((sum, item) => sum + item.metalAmount, 0)),
      totalHallmarking: round2(calculatedItems.reduce((sum, item) => sum + item.hallmarkCharge, 0)),
      totalOther: round2(calculatedItems.reduce((sum, item) => sum + item.otherCharges, 0)),
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      adjustment,
      grandTotal: round2(baseTotal + adjustment),
    };
  }, [calculatedItems, formData.taxType, formData.adjustment]);

  const paidTotal = useMemo(
    () => round2(payments.reduce((sum, p) => sum + num(p.amount), 0)),
    [payments],
  );
  const remainingBalance = useMemo(
    () => round2(Math.max(0, totals.grandTotal - paidTotal)),
    [totals.grandTotal, paidTotal],
  );
  const insufficientAccountWarnings = useMemo(() => {
    if (editingPurchaseId) return [];
    const activeAccounts = financialAccounts.filter(
      (account) => account.isActive !== false && account.status !== 'INACTIVE',
    );
    const cashAccount = activeAccounts.find((account) => account.type === 'CASH' && account.isDefault)
      || activeAccounts.find((account) => account.type === 'CASH');
    const spendingByAccount = new Map();

    payments.forEach((payment) => {
      const amount = num(payment.amount);
      if (amount <= 0) return;
      const account = payment.mode === 'CASH'
        ? cashAccount
        : activeAccounts.find((candidate) => candidate.id === payment.financialAccountId);
      if (!account) return;
      const existing = spendingByAccount.get(account.id);
      spendingByAccount.set(account.id, {
        account,
        amount: round2((existing?.amount || 0) + amount),
        modes: [...new Set([...(existing?.modes || []), payment.mode])],
      });
    });

    return [...spendingByAccount.values()]
      .map(({ account, amount, modes }) => {
        const available = num(account.currentBalance ?? account.balance ?? account.openingBalance);
        return {
          id: account.id,
          name: account.name || account.bankName || (account.type === 'CASH' ? 'Cash Book' : 'Bank Account'),
          modes: modes.map((mode) => mode.replaceAll('_', ' ')).join(' + '),
          modeValues: modes,
          amount,
          available,
          shortfall: round2(amount - available),
        };
      })
      .filter((warning) => warning.shortfall > 0.01);
  }, [editingPurchaseId, financialAccounts, payments]);

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

  const loadFinancialAccounts = useCallback(async () => {
    setFinancialAccountsLoaded(false);
    try {
      const data = await getFinancialAccounts();
      const accounts = data?.accounts || data?.data?.accounts || data?.data || data;
      setFinancialAccounts(Array.isArray(accounts) ? accounts : []);
      setFinancialAccountsLoaded(true);
    } catch {
      setFinancialAccounts([]);
    }
  }, []);

  const loadMetalPurities = useCallback(async () => {
    try {
      const rows = await getMetalPurities(false);
      setMetalPurities(Array.isArray(rows) ? rows : []);
    } catch {
      setMetalPurities([]);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
    loadVendors();
    loadFinancialAccounts();
    loadMetalPurities();
  }, [loadFinancialAccounts, loadMetalPurities, loadPurchases, loadVendors]);

  const handleHeaderChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'metalType') {
        const labels = purityLabelsForMetal(metalPurities, value);
        updated.purity = labels[0] || (value === 'GOLD' ? '22K' : 'F');
      }
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));

  const addPayment = () => setPayments(prev => [...prev, emptyPayment(formData.purchaseDate || todayInput())]);
  const removePayment = (index) => setPayments(prev => prev.filter((_, i) => i !== index));
  const handlePaymentChange = (index, field, value) => {
    setPayments(prev => prev.map((payment, i) => i === index ? { ...payment, [field]: value } : payment));
  };

  const clearAttachmentState = () => {
    setSavedAttachment(null);
    setPendingFile(null);
    setAttachmentCleared(false);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleAttachmentPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setToast({ type: 'error', message: 'Only JPEG, PNG, WebP, or PDF files are allowed' });
      e.target.value = '';
      return;
    }
    if (file.size > 10_000_000) {
      setToast({ type: 'error', message: 'File must be 10 MB or smaller' });
      e.target.value = '';
      return;
    }
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setAttachmentCleared(false);
  };

  const handleAttachmentRemove = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    if (savedAttachment?.url) {
      setAttachmentCleared(true);
    }
  };

  const syncPurchaseAttachment = async (purchaseId) => {
    if (pendingFile) {
      const { presignedUrl, publicUrl, key } = await getPresignedUrl(
        'PURCHASE_DOC',
        pendingFile,
        purchaseId,
      );
      await uploadToR2(presignedUrl, pendingFile);
      return updatePurchaseAttachment(purchaseId, {
        attachmentUrl: publicUrl,
        attachmentKey: key,
        attachmentName: pendingFile.name,
        attachmentMime: pendingFile.type,
      });
    }
    if (attachmentCleared && savedAttachment) {
      if (savedAttachment.key) {
        try {
          await deleteAsset(savedAttachment.key);
        } catch {
          /* best-effort */
        }
      }
      return updatePurchaseAttachment(purchaseId, {
        attachmentUrl: null,
        attachmentKey: null,
        attachmentName: null,
        attachmentMime: null,
      });
    }
    return null;
  };

  const resetBill = () => {
    setEditingPurchaseId(null);
    setFormData({
      vendorId: '',
      invoiceNumber: '',
      purchaseDate: todayInput(),
      taxType: 'CGST_SGST',
      adjustment: '',
      notes: '',
    });
    setItems([emptyItem()]);
    setPayments([]);
    clearAttachmentState();
  };

  const loadPurchaseIntoForm = useCallback((purchase) => {
    setEditingPurchaseId(purchase.id);
    setIsFormCollapsed(false);
    setFormData({
      vendorId: purchase.vendorId || '',
      invoiceNumber: purchase.invoiceNumber || '',
      purchaseDate: (purchase.purchaseDate || '').slice(0, 10) || todayInput(),
      taxType: purchase.addGst === false
        ? 'NONE'
        : (purchase.taxType === 'CGST_SGST' ? 'CGST_SGST' : purchase.taxType === 'IGST' ? 'IGST' : 'NONE'),
      adjustment: purchase.adjustment != null ? String(purchase.adjustment) : '',
      notes: purchase.notes || '',
    });
    const nextItems = (purchase.items?.length ? purchase.items : []).map((item) => ({
      itemName: item.itemName || '',
      metalType: item.metalType || 'GOLD',
      purity: item.purity || (item.metalType === 'SILVER' ? 'F' : '22K'),
      netWeight: item.netWeight != null ? String(item.netWeight) : '',
      rate: item.rate != null ? String(item.rate) : '',
      hallmarkCharge: item.hallmarkingCharge != null ? String(item.hallmarkingCharge) : '',
      otherCharges: item.otherCharges != null ? String(item.otherCharges) : '',
    }));
    setItems(nextItems.length ? nextItems : [emptyItem()]);
    setPayments((purchase.payments || []).map((p) => ({
      mode: p.mode || 'UPI',
      amount: p.amount != null ? String(p.amount) : '',
      paidAt: (p.paidAt || purchase.purchaseDate || '').slice(0, 10) || todayInput(),
      financialAccountId: financialAccountIdFrom(p),
    })));
    setPendingFile(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAttachmentCleared(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    setSavedAttachment(
      purchase.attachmentUrl
        ? {
            url: purchase.attachmentUrl,
            key: purchase.attachmentKey || null,
            name: purchase.attachmentName || 'Supplier invoice',
            mime: purchase.attachmentMime || '',
          }
        : null,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openPurchaseDetail = (purchase) => {
    setDetailPurchase(purchase);
  };

  const closePurchaseDetail = () => setDetailPurchase(null);

  const handleDetailUpdated = (updated) => {
    setPurchases((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setDetailPurchase((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const handleDetailDeleted = (deletedId) => {
    setPurchases((prev) => prev.filter((p) => p.id !== deletedId));
    setDetailPurchase(null);
    if (editingPurchaseId === deletedId) resetBill();
    setToast({ type: 'success', message: 'Purchase deleted' });
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
    return {
      count: vendorPurchases.length,
      totalAmount,
      goldWeight: vendorPurchases.reduce((sum, p) => sum + purchaseGoldWeight(p), 0),
      silverWeight: vendorPurchases.reduce((sum, p) => sum + purchaseSilverWeight(p), 0),
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
    const validPayments = payments
      .filter((p) => num(p.amount) > 0)
      .map((p) => withFinancialAccount({
        mode: p.mode,
        amount: num(p.amount),
        paidAt: p.paidAt || formData.purchaseDate,
        financialAccountId: p.financialAccountId,
      }));
    if (paidTotal > totals.grandTotal + 0.01) {
      setToast({ type: 'error', message: 'Paid amount cannot exceed bill total' });
      return;
    }
    if (!editingPurchaseId && validPayments.length > 0 && !financialAccountsLoaded) {
      setToast({ type: 'error', message: 'Could not verify Cash & Bank balances. Refresh and try again.' });
      return;
    }
    if (insufficientAccountWarnings.length > 0) {
      const warning = insufficientAccountWarnings[0];
      setToast({
        type: 'error',
        message: `${warning.name} is short by ${fmtAmt(warning.shortfall)}. Add funds or reduce the payment amount.`,
      });
      return;
    }

    const payload = {
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
      adjustment: num(formData.adjustment),
      notes: formData.notes?.trim() || undefined,
      items: validItems.map((item) => ({
        itemName: item.itemName || undefined,
        metalType: item.metalType || 'GOLD',
        purity: item.purity || (item.metalType === 'SILVER' ? 'F' : '22K'),
        grossWeight: num(item.netWeight),
        netWeight: item.netWeight,
        rate: num(item.rate),
        hallmarkingCharge: num(item.hallmarkCharge),
        otherCharges: num(item.otherCharges),
      })),
      payments: validPayments,
    };

    try {
      setIsSubmitting(true);
      let saved;
      if (editingPurchaseId) {
        saved = await updatePurchase(editingPurchaseId, payload);
      } else {
        saved = await createPurchase(payload);
      }

      try {
        const withAttachment = await syncPurchaseAttachment(saved.id);
        if (withAttachment) saved = withAttachment;
        setToast({
          type: 'success',
          message: editingPurchaseId
            ? 'Purchase bill updated and stock rebalanced'
            : 'Purchase bill saved and stock updated',
        });
      } catch (attachErr) {
        setToast({
          type: 'error',
          message: `Bill saved; attachment failed — ${attachErr.message || 'retry from edit'}`,
        });
      }

      resetBill();
      loadPurchases();
      loadFinancialAccounts();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save purchase bill' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((p) => {
      const hay = [
        p.invoiceNumber,
        p.vendor?.name,
        p.vendorName,
        p.vendor?.gstin,
        p.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [purchases, historyQuery]);

  const handleBillBookExport = async () => {
    if (filteredPurchases.length === 0) {
      alert('No purchase bills to export.');
      return;
    }

    const billBookWindow = window.open('', '_blank');
    if (!billBookWindow) {
      alert('Please allow pop-ups to prepare the Bill Book PDF.');
      return;
    }

    billBookWindow.document.write(`<!DOCTYPE html><html><head><title>Preparing Bill Book...</title>
      <style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#374151}
      .status{text-align:center}.spinner{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#111827;border-radius:50%;
      margin:0 auto 16px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style></head>
      <body><div class="status"><div class="spinner"></div><strong>Preparing Bill Book...</strong>
      <p>Large exports may take a moment.</p></div></body></html>`);
    billBookWindow.document.close();

    try {
      setBillBookExporting(true);
      const request = buildPurchaseBillBookRequest({
        purchases: filteredPurchases,
        search: historyQuery,
      });
      const html = await getPurchaseBillBookHtml(request);
      if (billBookWindow.closed) return;
      billBookWindow.document.open();
      billBookWindow.document.write(html);
      billBookWindow.document.close();
    } catch (error) {
      console.error('Purchase Bill Book export failed', error);
      if (billBookWindow.closed) return;
      billBookWindow.document.open();
      billBookWindow.document.write(`<!DOCTYPE html><html><head><title>Bill Book Error</title></head>
        <body style="font-family:Arial,sans-serif;padding:32px"><h2>Could not prepare Bill Book</h2>
        <p id="bill-book-error"></p></body></html>`);
      billBookWindow.document.close();
      billBookWindow.document.getElementById('bill-book-error').textContent =
        error.message || 'Please try again.';
    } finally {
      setBillBookExporting(false);
    }
  };

  const columns = useMemo(() => buildColumns(), []);
  const table = useReactTable({
    data: filteredPurchases,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const colCount = columns.length;
  const purchaseStats = useMemo(() => purchases.reduce((acc, purchase) => {
    const total = Number(purchase.grandTotal || purchase.totalAmount || 0);
    const paid = Number(purchase.paidAmount || 0);
    acc.goldWeight += purchaseGoldWeight(purchase);
    acc.silverWeight += purchaseSilverWeight(purchase);
    acc.totalAmount += total;
    acc.paidAmount += paid;
    acc.dueAmount += Math.max(0, total - paid);
    acc.todayCount += purchase.purchaseDate?.slice(0, 10) === todayInput() ? 1 : 0;
    return acc;
  }, { goldWeight: 0, silverWeight: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0, todayCount: 0 }), [purchases]);

  return (
    <DashboardTemplate headerTitle="Purchases (Inward)" headerTabs={[]}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="purchase-bill-page">
        <div className={`purchase-bill-container glass-panel animate-fade-in ${editingPurchaseId ? 'is-editing' : ''}`}>
          <div className="section-header attio-header-top">
            <div className="purchase-form-title-wrap">
              <h3>{editingPurchaseId ? 'Edit Purchase Bill' : 'New Purchase Bill'}</h3>
              {editingPurchaseId && (
                <span className="purchase-edit-chip">Editing · stock will rebalance on save</span>
              )}
            </div>
            <div className="attio-header-actions">
              <button
                type="button"
                className="attio-action-clear"
                onClick={() => setIsFormCollapsed((v) => !v)}
              >
                {isFormCollapsed ? 'Expand' : 'Collapse'}
              </button>
              <button type="button" className="attio-action-clear" onClick={resetBill}>
                {editingPurchaseId ? 'Cancel Edit' : 'Clear'}
              </button>
              {!isFormCollapsed && (
                <label
                  className={`attio-action-attach ${pendingFile || (savedAttachment && !attachmentCleared) ? 'has-attachment' : ''}`}
                  title={pendingFile?.name || savedAttachment?.name || 'Attach supplier invoice'}
                >
                  <Icon name="clip" size={14} />
                  {pendingFile || (savedAttachment && !attachmentCleared) ? 'Replace Invoice' : 'Attach Invoice'}
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="purchase-attachment-input"
                    onChange={handleAttachmentPick}
                  />
                </label>
              )}
              {!isFormCollapsed && (pendingFile || (savedAttachment && !attachmentCleared)) && (
                <button type="button" className="attio-action-remove-attachment" onClick={handleAttachmentRemove} title="Remove attached invoice">
                  <Icon name="close" size={14} />
                </button>
              )}
              {!isFormCollapsed && (
                <button type="submit" form="purchase-bill-form" className="attio-action-save" disabled={isSubmitting}>
                  <Icon name="checkCircle" size={14} />
                  {isSubmitting ? 'Saving...' : editingPurchaseId ? 'Update Bill' : 'Save Bill'}
                </button>
              )}
            </div>
          </div>
          {!isFormCollapsed && (
          <form id="purchase-bill-form" className="purchase-bill premium-form" onSubmit={handleSubmit}>
                <div className="attio-properties-grid">
                  <div className="attio-field">
                    <span className="attio-prop-label">Party Name *</span>
                    <div className="vendor-select-row">
                      <select name="vendorId" className="inline-input font-medium cursor-pointer" value={formData.vendorId} onChange={handleHeaderChange} required>
                        <option value="">Select supplier...</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <button type="button" className="icon-action-btn" onClick={() => setIsVendorModalOpen(true)} title="Add New Supplier">
                        <Icon name="add" size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="attio-field attio-field-compact">
                    <span className="attio-prop-label">Date</span>
                    <input type="date" name="purchaseDate" className="inline-input cursor-pointer" value={formData.purchaseDate} onChange={handleHeaderChange} required />
                  </div>
                  <div className="attio-field attio-field-compact">
                    <span className="attio-prop-label">Bill No.</span>
                    <input name="invoiceNumber" className="inline-input" value={formData.invoiceNumber} onChange={handleHeaderChange} placeholder="Manual" />
                  </div>
                  <div className="attio-field">
                    <span className="attio-prop-label">Party Type</span>
                    <div className="attio-field-static">
                      <span className="party-badge">Supplier</span>
                    </div>
                  </div>
                  <div className="attio-field attio-field-compact">
                    <span className="attio-prop-label">Mobile No</span>
                    <input className="inline-input text-gray" value={selectedVendor?.phone || ''} placeholder="—" readOnly />
                  </div>
                  <div className="attio-field attio-field-wide attio-field-address">
                    <span className="attio-prop-label">Address</span>
                    <input className="inline-input text-gray" value={selectedVendor?.address || ''} placeholder="—" readOnly />
                  </div>
                </div>

                <div className="purchase-grid-wrap">
                  <table className="purchase-entry-grid simple-grid">
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '40px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Description of Goods</th>
                        <th>Metal</th>
                        <th>Purity</th>
                        <th className="num-col">Quantity (GMS)</th>
                        <th className="num-col">Rate</th>
                        <th className="num-col">HM Charge ₹</th>
                        <th className="num-col">Other ₹</th>
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
                              {withOrphanPurityOption(
                                purityLabelsForMetal(metalPurities, item.metalType || 'GOLD'),
                                item.purity,
                              ).map((label) => (
                                <option key={label} value={label}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="num-col px-2"><input type="number" step="0.001" className="inline-input text-right" placeholder="0.000" value={item.netWeight === 0 ? '' : item.netWeight} onChange={(e) => handleItemChange(index, 'netWeight', e.target.value)} /></td>
                          <td className="num-col px-2"><input type="number" step="0.01" className="inline-input text-right" placeholder="0.00" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} /></td>
                          <td className="num-col px-2"><input type="number" step="0.01" className="inline-input text-right" placeholder="0.00" value={item.hallmarkCharge} onChange={(e) => handleItemChange(index, 'hallmarkCharge', e.target.value)} /></td>
                          <td className="num-col px-2"><input type="number" step="0.01" className="inline-input text-right" placeholder="0.00" value={item.otherCharges} onChange={(e) => handleItemChange(index, 'otherCharges', e.target.value)} /></td>
                          <td className={`computed-cell total-cell num-col pl-2 ${item.totalAmount ? '' : 'is-zero'}`}>{fmtAmt(item.totalAmount)}</td>
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
                        <td className="num-col">{totals.totalHallmarking ? fmtAmt(totals.totalHallmarking) : '—'}</td>
                        <td className="num-col">{totals.totalOther ? fmtAmt(totals.totalOther) : '—'}</td>
                        <td className="num-col">{fmtAmt(totals.taxableAmount)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="attio-totals-section">
                  <div className="attio-footer-left">
                    <div className="purchase-payments-block">
                      <div className="purchase-payments-header">
                        <span className="ctx-label">Payments / Split</span>
                        <button type="button" className="grid-add-btn attio-secondary-btn" style={{ padding: '0.3rem 0.65rem', minHeight: 'auto' }} onClick={addPayment}>
                          + Add Mode
                        </button>
                      </div>
                      {payments.length === 0 ? (
                        <p className="purchase-payments-empty">No payments yet — leave unpaid or add UPI/cash split.</p>
                      ) : (
                        <div className="purchase-payment-table">
                          <div className="purchase-payment-table-head">
                            <span>Mode</span>
                            <span>Account</span>
                            <span className="text-right">Amount</span>
                            <span>Date</span>
                            <span />
                          </div>
                          {payments.map((payment, index) => {
                            const warning = insufficientAccountWarnings.find((item) => (
                              item.modeValues.includes(payment.mode)
                              && (payment.mode === 'CASH' || item.id === payment.financialAccountId)
                            ));
                            const warningMessage = warning
                              ? `${warning.modes}: ${warning.name} is short by ${fmtAmt(warning.shortfall)}`
                              : '';
                            return (
                            <div key={index} className="purchase-payment-row">
                              <div className={`purchase-payment-mode-cell ${warning ? 'has-warning' : ''}`}>
                                <select
                                  className="inline-input cursor-pointer"
                                  value={payment.mode}
                                  onChange={(e) => handlePaymentChange(index, 'mode', e.target.value)}
                                >
                                  {PURCHASE_PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                                </select>
                                {warning && (
                                  <span
                                    className="purchase-payment-mode-warning"
                                    data-tooltip={`${warning.modes} payment exceeds ${warning.name}'s available balance of ${fmtAmt(warning.available)} by ${fmtAmt(warning.shortfall)}. Add funds or reduce this payment.`}
                                    aria-label={warningMessage}
                                    tabIndex={0}
                                  >
                                    <Icon name="warning" size={16} />
                                  </span>
                                )}
                              </div>
                              {paymentNeedsBankAccount(payment.mode) ? (
                                <PaymentAccountSelect
                                  mode={payment.mode}
                                  value={payment.financialAccountId}
                                  onChange={(value) => handlePaymentChange(index, 'financialAccountId', value)}
                                />
                              ) : (
                                <span className="purchase-payment-account-static">Default Cash Book</span>
                              )}
                              <input
                                type="number"
                                step="0.01"
                                className="inline-input text-right"
                                placeholder="0.00"
                                value={payment.amount}
                                onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)}
                              />
                              <input
                                type="date"
                                className="inline-input cursor-pointer"
                                value={payment.paidAt || formData.purchaseDate}
                                onChange={(e) => handlePaymentChange(index, 'paidAt', e.target.value)}
                              />
                              <button type="button" className="grid-remove-btn hover-show" style={{ opacity: 1 }} onClick={() => removePayment(index)} title="Remove payment">
                                <Icon name="delete" size={14} />
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="purchase-footer-metrics">
                      <div className="attio-contextual-totals purchase-payment-summary">
                        <div className="ctx-total">
                          <span className="ctx-label">Paid</span>
                          <span className="ctx-value">{fmtAmt(paidTotal)}</span>
                        </div>
                        <div className="ctx-total">
                          <span className="ctx-label">Remaining</span>
                          <span className="ctx-value">{fmtAmt(remainingBalance)}</span>
                        </div>
                      </div>
                      <div className="attio-contextual-totals metal-weights-box">
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
                  </div>

                  <div className="attio-financials">
                    <div className="attio-financials-card">
                      <div className="fin-row">
                        <span>Taxable Amount</span>
                        <span className="fin-val">{fmtAmt(totals.taxableAmount)}</span>
                      </div>

                      <div className="fin-row fin-tax-row">
                        <select name="taxType" className="inline-input cursor-pointer tax-select" value={formData.taxType} onChange={handleHeaderChange}>
                          <option value="CGST_SGST">Local (CGST + SGST)</option>
                          <option value="IGST">Interstate (IGST)</option>
                          <option value="NONE">No GST</option>
                        </select>
                      </div>

                      {formData.taxType === 'CGST_SGST' && (
                        <>
                          <div className="fin-row">
                            <span>CGST (1.5%)</span>
                            <span className="fin-val">{fmtAmt(totals.cgstAmount)}</span>
                          </div>
                          <div className="fin-row">
                            <span>SGST (1.5%)</span>
                            <span className="fin-val">{fmtAmt(totals.sgstAmount)}</span>
                          </div>
                        </>
                      )}

                      {formData.taxType === 'IGST' && (
                        <div className="fin-row">
                          <span>IGST (3%)</span>
                          <span className="fin-val">{fmtAmt(totals.igstAmount)}</span>
                        </div>
                      )}

                      <div className="fin-row fin-adjustment-row">
                        <span>Adjustment (Less − / Add +)</span>
                        <input
                          type="number"
                          step="0.01"
                          name="adjustment"
                          className="inline-input text-right fin-adjustment-input"
                          placeholder="0.00"
                          value={formData.adjustment}
                          onChange={handleHeaderChange}
                        />
                      </div>

                      <div className="fin-row grand-row">
                        <span className="fin-label-bold">Bill Closing Balance</span>
                        <span className="fin-val-bold">{fmtAmt(totals.grandTotal)}</span>
                      </div>
                      <input
                        name="notes"
                        className="remark-input-box financial-note-input"
                        placeholder="e.g. Note about this bill..."
                        value={formData.notes}
                        onChange={handleHeaderChange}
                      />
                    </div>
                  </div>
                </div>
        </form>
          )}
      </div>

        <div className="purchases-history-panel">
          <div className="purchase-stats-row">
            <div className="purchase-stat"><span>Gold inward</span><strong>{fmtWeight(purchaseStats.goldWeight)}</strong></div>
            <div className="purchase-stat"><span>Silver inward</span><strong>{fmtWeight(purchaseStats.silverWeight)}</strong></div>
            <div className="purchase-stat"><span>Purchase value</span><strong>{fmtAmt(purchaseStats.totalAmount)}</strong></div>
            <div className="purchase-stat"><span>Paid</span><strong>{fmtAmt(purchaseStats.paidAmount)}</strong></div>
            <div className="purchase-stat due-stat"><span>Outstanding</span><strong>{fmtAmt(purchaseStats.dueAmount)}</strong></div>
          </div>
          <div className="attio-table-container">
            <div className="attio-header">
              <div className="attio-header-left">
                <span className="saas-view-label">Purchase History</span>
                <span className="purchase-history-hint">Click a row for details & payments</span>
              </div>
              <div className="attio-header-right">
                <input
                  type="search"
                  className="purchase-history-search"
                  placeholder="Search bill / vendor…"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
                <ImportExportMenu
                  data={filteredPurchases}
                  filename="Purchases"
                  resourceName="purchases"
                  flattenRow={flattenPurchaseRow}
                  isLoading={loading || billBookExporting}
                  onBillBookExport={handleBillBookExport}
                  billBookLabel="Purchase Invoice Book PDF"
                />
                <button className="attio-secondary-btn" onClick={loadPurchases} disabled={loading}><Icon name="refresh" size={14} /><span>Refresh</span></button>
              </div>
            </div>
            <div className="attio-table-wrapper">
              <table className={`attio-table ${loading ? 'attio-skeleton-table' : ''}`}>
                <thead><tr>{table.getHeaderGroups()[0]?.headers.map(header => <th key={header.id} className="attio-th" style={{ width: header.getSize() }}><div className="attio-th-content"><span>{flexRender(header.column.columnDef.header, header.getContext())}</span></div></th>)}</tr></thead>
                <tbody>
                  {loading ? <SkeletonRows cols={colCount} /> : table.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={colCount} className="attio-empty"><Icon name="order" size={36} color="var(--text-tertiary)" /><span>{historyQuery ? 'No matching bills.' : 'No purchase invoices found.'}</span></td></tr>
                  ) : table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className={`purchase-history-row ${detailPurchase?.id === row.original.id ? 'is-active' : ''}`}
                      onClick={() => openPurchaseDetail(row.original)}
                    >
                      {row.getVisibleCells().map(cell => <td key={cell.id} className="attio-td">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                    </tr>
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
                        <span>Gold</span>
                        <strong>{fmtWeight(vendorStats.goldWeight)}</strong>
                      </div>
                      <div className="vendor-stat-mini">
                        <span>Silver</span>
                        <strong>{fmtWeight(vendorStats.silverWeight)}</strong>
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
                                <td>{fmtMetalWeights(p)}</td>
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

      <PurchaseDetailSlideOver
        isOpen={!!detailPurchase}
        purchaseId={detailPurchase?.id}
        initialPurchase={detailPurchase}
        onClose={closePurchaseDetail}
        onEdit={loadPurchaseIntoForm}
        onUpdated={(updated) => {
          handleDetailUpdated(updated);
          setToast({ type: 'success', message: 'Payment recorded' });
        }}
        onDeleted={handleDetailDeleted}
      />
    </DashboardTemplate>
  );
};

export default PurchasesPage;
