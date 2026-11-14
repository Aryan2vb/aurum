import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardTemplate from "../../components/templates/DashboardTemplate/DashboardTemplate";
import Icon from "../../components/atoms/Icon/Icon";
import DatePicker from "../../components/molecules/DatePicker/DatePicker";
import Avatar from "../../components/atoms/Avatar/Avatar";
import SlideOver from "../../components/atoms/SlideOver/SlideOver";
import CustomerInspectorPanel from "../../components/organisms/CustomerInspectorPanel/CustomerInspectorPanel";
import {
  getDocuments, searchCustomers,
} from "../../services/customersService";
import {
  getInvoiceById,
  getInvoiceSettings,
  createInvoice,
  createDraft,
  updateInvoice,
  getNextSequence,
  getMissingSequences,
  getSequenceAvailability,
} from "../../services/invoicesService";
import { getAdvanceBalance } from "../../services/advanceService";
import {
  generateInvoiceHtml,
  generateJewelleryInvoiceHtml,
  generateModernInvoiceHtml,
  INVOICE_TEMPLATES,
  resolveInvoiceTemplate,
} from "../../utils/invoiceTemplates";
import {
  sortPaymentsByDate,
  buildMergedInvoicePayments,
  getTotalPaidWithAdvances,
  getTotalAdvanceApplied,
  buildAdvanceAllocations,
} from "../../utils/invoicePayments";
import AdvanceReceiptPicker from "../../components/molecules/AdvanceReceiptPicker/AdvanceReceiptPicker";
import { calcInvoiceTotals, parsePurity, resolveTaxRates } from "../../utils/invoiceCalc";
import { getHighValueInvoiceKycError } from "../../utils/customerKyc";
import { getFooterLibrary } from "../../services/footerLibraryService";
import ConfirmationModal from "../../components/atoms/ConfirmationModal/ConfirmationModal";
import styles from "./CreateInvoicePage.module.css";

const fmt = (n) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toDateInputValue = (value = new Date()) => {
  if (typeof value === "string") return value.slice(0, 10);

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPaymentDateError = (payments, invoiceDate, selectedAdvances = []) => {
  const today = toDateInputValue();
  if (payments.some((payment) => !payment.paidAt)) {
    return "Select a date for every payment";
  }
  if (
    payments.some((payment) => payment.paidAt > today)
  ) {
    return "Payment date cannot be in the future";
  }
  if (
    payments.some(
      (payment) =>
        payment.paidAt > invoiceDate &&
        payment.paidAt !== payment.originalPaidAt,
    )
  ) {
    return "Payment date cannot be after the invoice date";
  }
  const invalidAdv = selectedAdvances.find((a) => {
    const amt = parseFloat(a.applyAmount) || 0;
    return amt <= 0 || amt > (parseFloat(a.remainingAmount) || 0);
  });
  if (invalidAdv) {
    return "Every selected advance receipt must have an amount between ₹0.01 and its remaining balance";
  }
  if (
    selectedAdvances.some(
      (a) => a.transactionDate && invoiceDate && toDateInputValue(a.transactionDate) > invoiceDate,
    )
  ) {
    return "Selected advance receipt date cannot be after the invoice date";
  }
  return "";
};

const defaultItem = () => ({
  slNo: 1,
  description: "",
  hsnSac: "711319",
  quantity: 1,
  unit: "GMS",
  rate: 0,
  makingCharges: 0,
  metalType: "GOLD",
  grossWeight: 0,
  stoneWeight: 0,
  makingChargesType: "PER_GRAM",
  stoneCharges: 0,
  netWeight: 0,
  huid: "",
  hallmarkCharge: "",
  purity: "None",
  amount: 0,
});

const metalOptions = ["GOLD", "SILVER", "PLATINUM"];
const makingOptions = [
  { value: "FLAT_PER_ITEM", label: "Flat" },
  { value: "PER_GRAM", label: "/gm" },
  { value: "PERCENTAGE_ON_METAL", label: "%" },
];

const paymentModes = [
  "UPI",
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "CARD",
  "OLD_GOLD",
  "OTHER",
];
const purityOptions = ["None", "916/22k", "833/20k", "75/18k", "F"];

const formatRelativeName = (fullName = '', relativeName = '', relationType = '', gender = '') => {
  const fName = (fullName || '').trim();
  const rName = (relativeName || '').trim();
  if (!rName) return fName;

  const isFemale = String(gender).toUpperCase() === 'FEMALE';
  let connector = 's/o';

  if (relationType === 'father' || relationType === 'mother') {
    connector = isFemale ? 'd/o' : 's/o';
  } else if (relationType === 'spouse') {
    connector = isFemale ? 'w/o' : 'h/o';
  }

  const fParts = fName.split(/\s+/);
  const rParts = rName.split(/\s+/);

  const fLast = fParts[fParts.length - 1]?.toLowerCase();
  const rLast = rParts[rParts.length - 1]?.toLowerCase();

  if (fLast && rLast && fLast === rLast && fParts.length > 1) {
    const fFirstPart = fParts.slice(0, -1).join(' ');
    return `${fFirstPart} ${connector} ${rName}`;
  }

  return `${fName} ${connector} ${rName}`;
};

const detectNameFormat = (buyerName, customer) => {
  if (!customer) return 'default';
  const cleanName = (buyerName || '').trim();

  if (customer.fatherName && cleanName === formatRelativeName(customer.fullName, customer.fatherName, 'father', customer.gender)) {
    return 'father';
  }
  if (customer.motherName && cleanName === formatRelativeName(customer.fullName, customer.motherName, 'mother', customer.gender)) {
    return 'mother';
  }
  if (customer.spouseName && cleanName === formatRelativeName(customer.fullName, customer.spouseName, 'spouse', customer.gender)) {
    return 'spouse';
  }
  return 'default';
};

const formatCustomerAddress = (location) =>
  [
    location?.village,
    location?.tehsil,
    location?.district,
    location?.state,
  ]
    .filter(Boolean)
    .join(" ");

// Totals for the tax type currently selected (NONE/IGST zero out the CGST/SGST rates).
const calcTotalsForTaxes = (items, taxes, paidAmount) => {
  const t = resolveTaxRates(taxes);
  return calcInvoiceTotals(items, t.cgstRate, t.sgstRate, paidAmount, t.igstRate);
};

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [theme, setTheme] = useState("standard");
  const [sequenceData, setSequenceData] = useState(null);
  const [manualSequence, setManualSequence] = useState("");
  const [sequenceAvailability, setSequenceAvailability] = useState(null);
  const [missingPanelOpen, setMissingPanelOpen] = useState(false);
  const [missingSequencesData, setMissingSequencesData] = useState(null);
  const [missingSequencesLoading, setMissingSequencesLoading] = useState(false);
  const [missingSequencesError, setMissingSequencesError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState("preview");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null);
  const [nameFormat, setNameFormat] = useState("default");
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(null); // available advance for selected customer
  const [selectedAdvances, setSelectedAdvances] = useState([]); // receipt-level picked advances
  const [lockedAdvancePayments, setLockedAdvancePayments] = useState([]); // finalized invoice's existing advance payments
  const [billToSwitchOpen, setBillToSwitchOpen] = useState(false);
  const [billToQuery, setBillToQuery] = useState("");
  const [billToResults, setBillToResults] = useState([]);
  const [billToSearching, setBillToSearching] = useState(false);
  const billToDebounceRef = useRef(null);
  const [payments, setPayments] = useState([]);
  const [autoCreateUdhar, setAutoCreateUdhar] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(toDateInputValue());
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: undefined,
    cancelText: undefined,
  });
  const searchDebounceRef = useRef(null);
  const firstItemDescriptionRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(76);
  const pendingItemDescriptionFocusRef = useRef(false);

  // Keep the preview drawer's bottom edge flush with the (variable-height) Grand Total bar.
  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setBottomBarHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const sequenceEditedRef = useRef(false);
  const lastSuggestedSequenceRef = useRef(null);

  const directPaidAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [payments],
  );

  const lockedAdvanceAmount = useMemo(
    () => lockedAdvancePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [lockedAdvancePayments],
  );

  const advanceAppliedAmount = useMemo(
    () => getTotalAdvanceApplied(selectedAdvances) + lockedAdvanceAmount,
    [selectedAdvances, lockedAdvanceAmount],
  );

  const paidAmount = useMemo(
    () => getTotalPaidWithAdvances(payments, selectedAdvances) + lockedAdvanceAmount,
    [payments, selectedAdvances, lockedAdvanceAmount],
  );

  const [invoiceData, setInvoiceData] = useState({
    buyer: { name: "", phone: "", address: "", stateCode: "" },
    taxes: { cgstRate: 1.5, sgstRate: 1.5, igstRate: 0, taxType: "CGST_SGST" },
    metadata: { modeOfPayment: "UPI", deliveryNote: "", destination: "" },
    declaration:
      "We declare that this invoice shows the actual price of the goods described.",
    items: [defaultItem()],
    company: { name: "", address: "", gstin: "", state: "", stateCode: "" },
    status: "DRAFT",
  });

  const [previewHtml, setPreviewHtml] = useState("");
  const [footerLibrary, setFooterLibrary] = useState({ folders: [], assets: [] });
  const [selectedFooterAssetId, setSelectedFooterAssetId] = useState("");
  const [footerFolderFilter, setFooterFolderFilter] = useState("");
  const canEditSequence =
    !id || (invoiceData.status === "DRAFT" && Boolean(selectedCustomerId));

  // Fetch settings or existing invoice
  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getInvoiceSettings();
        const footerData = await getFooterLibrary().catch(() => ({ folders: [], assets: [] }));
        setFooterLibrary(footerData);
        setInvoiceData((prev) => ({
          ...prev,
          company: {
            name: settings.companyName || "",
            address: settings.address || "",
            gstin: settings.gstin || "",
            state: settings.state || "",
            stateCode: settings.stateCode || "",
          },
          taxes: {
            ...prev.taxes,
            cgstRate: settings.defaultCgstRate ?? 1.5,
            sgstRate: settings.defaultSgstRate ?? 1.5,
            igstRate: settings.defaultIgstRate ?? 0,
            taxType: settings.defaultTaxType || prev.taxes.taxType,
          },
          declaration: settings.declaration || prev.declaration,
        }));
        if (!id) {
          setTheme(resolveInvoiceTemplate(null, settings.defaultTemplate));
          setSelectedFooterAssetId(footerData.assets.find((asset) => asset.isDefault)?.id || "");
        }

        if (id) {
          const inv = await getInvoiceById(id);
          setSelectedFooterAssetId(inv.footerAssetId || inv.companySnapshot?.data?.footerAssetId || "");
          // Open in the format this invoice was saved with, not the org default
          setTheme(resolveInvoiceTemplate(inv.templateType, settings.defaultTemplate));
          setSelectedCustomerId(inv.customerId);
          setSelectedCustomerObj(inv.customer);
          if (inv.customer) {
            const detected = detectNameFormat(
              inv.buyerSnapshot?.data?.name || inv.buyerSnapshot?.name || "",
              inv.customer
            );
            setNameFormat(detected);
          }
          if (inv.status === "DRAFT" && inv.sequence) {
            sequenceEditedRef.current = true;
            setManualSequence(String(inv.sequence));
          }
          if (inv.customerId) {
            getAdvanceBalance(inv.customerId)
              .then((data) => setAdvanceBalance(parseFloat(data?.availableAdvance || 0)))
              .catch(() => setAdvanceBalance(0));
          }
          const rawPayments = Array.isArray(inv.payments) ? inv.payments : [];
          const directPayments = rawPayments.filter((p) => p.source !== "ADVANCE");
          const advancePayments = rawPayments.filter((p) => p.source === "ADVANCE");

          if (inv.status === "DRAFT") {
            setLockedAdvancePayments([]);
            const draftAllocs = Array.isArray(inv.draftAdvanceAllocations)
              ? inv.draftAdvanceAllocations
              : Array.isArray(inv.advanceAllocations)
                ? inv.advanceAllocations
                : [];
            setSelectedAdvances(
              draftAllocs.map((a) => ({
                advanceEntryId: a.advanceEntryId || a.sourceLedgerEntryId,
                sourceCustomerId: a.sourceCustomerId || inv.customerId,
                sourceCustomerName: a.sourceCustomerName || inv.customer?.fullName || "",
                transactionDate: a.transactionDate || a.paidAt || "",
                paymentMethod: a.paymentMethod || a.mode || "CREDIT",
                reference: a.reference || "",
                description: a.description || "",
                originalAmount: parseFloat(a.originalAmount || a.amount) || 0,
                remainingAmount: parseFloat(a.remainingAmount ?? a.amount) || 0,
                applyAmount: parseFloat(a.amount ?? a.applyAmount) || 0,
              })),
            );
          } else {
            setSelectedAdvances([]);
            setLockedAdvancePayments(
              advancePayments.map((p) => ({
                mode: p.mode,
                amount: parseFloat(p.amount) || 0,
                reference: p.reference || "",
                paidAt: toDateInputValue(p.paidAt || p.createdAt),
                source: "ADVANCE",
                sourceCustomerName: p.sourceCustomerName,
              })),
            );
          }

          if (directPayments.length > 0) {
            setPayments(
              sortPaymentsByDate(directPayments.map((p) => ({
                mode: p.mode,
                amount: p.amount,
                reference: p.reference || "",
                paidAt: toDateInputValue(p.paidAt || p.createdAt),
                originalPaidAt: toDateInputValue(p.paidAt || p.createdAt),
              }))),
            );
          } else if (rawPayments.length === 0) {
            setPayments([
              {
                mode: inv.modeOfPayment || "UPI",
                amount: inv.paidAmount || 0,
                paidAt: toDateInputValue(inv.invoiceDate),
              },
            ]);
          } else {
            setPayments([]);
          }
          setInvoiceDate(inv.invoiceDate?.slice(0, 10));
          setInvoiceData((prev) => ({
            ...prev,
            items: inv.items.map((i) => ({
              ...i,
              rate: i.metalRate,
              makingCharges: i.makingCharges,
              purity: i.purityLabel || i.purity || "None",
              hallmarkCharge: parseFloat(i.hallmarkingCharge) || 0,
            })),
            metadata: {
              ...prev.metadata,
              invoiceNo: inv.invoiceNumber || "",
              modeOfPayment: inv.modeOfPayment || "UPI",
              deliveryNote: inv.deliveryNote || "",
              destination: inv.destination || "",
            },
            buyer: {
              name: inv.buyerSnapshot?.data?.name || inv.buyerSnapshot?.name || inv.customer?.fullName || "",
              phone:
                inv.buyerSnapshot?.data?.phone ||
                inv.buyerSnapshot?.phone ||
                inv.customer?.contactDetails?.[0]?.primaryPhone ||
                "",
              address:
                inv.buyerSnapshot?.data?.address ||
                inv.buyerSnapshot?.address ||
                (inv.customer?.locations?.[0]
                  ? `${inv.customer.locations[0].village || ""} ${inv.customer.locations[0].district || ""}`.trim()
                  : ""),
              stateCode:
                inv.buyerSnapshot?.data?.stateCode ||
                inv.buyerSnapshot?.stateCode ||
                inv.customer?.locations?.[0]?.stateCode ||
                "",
            },
            // Show the tax this invoice was saved with, not the org default
            taxes: {
              ...prev.taxes,
              taxType: inv.taxType || prev.taxes.taxType,
              cgstRate: parseFloat(inv.cgstRate) || 0,
              sgstRate: parseFloat(inv.sgstRate) || 0,
              igstRate: parseFloat(inv.igstRate) || 0,
            },
            status: inv.status,
          }));
        }
      } catch (err) {
        console.error("Failed to load invoice/settings", err);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const selected = footerLibrary.assets.find((asset) => asset.id === selectedFooterAssetId);
    if (!selected) return;
    setInvoiceData((prev) => ({ ...prev, company: { ...prev.company, footerImage: selected.publicUrl } }));
  }, [footerLibrary.assets, selectedFooterAssetId]);

  useEffect(() => {
    if (!canEditSequence || !invoiceDate) return;

    let cancelled = false;
    const previousSuggested = lastSuggestedSequenceRef.current;

    const loadSequence = async () => {
      try {
        const seq = await getNextSequence(invoiceDate);
        if (cancelled) return;

        setSequenceData(seq);
        setManualSequence((prev) => {
          if (
            !sequenceEditedRef.current ||
            prev === "" ||
            String(prev) === String(previousSuggested)
          ) {
            return String(seq.nextSequence);
          }
          return prev;
        });
        lastSuggestedSequenceRef.current = seq.nextSequence;
      } catch (e) {
        if (!cancelled) console.error("Failed to fetch next sequence", e);
      }
    };

    loadSequence();
    return () => {
      cancelled = true;
    };
  }, [canEditSequence, invoiceDate]);

  useEffect(() => {
    const parsedManualSequence = parseInt(manualSequence, 10);

    if (
      !canEditSequence ||
      !sequenceData ||
      !Number.isFinite(parsedManualSequence) ||
      parsedManualSequence < 1
    ) {
      setSequenceAvailability(null);
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      try {
        const availability = await getSequenceAvailability(parsedManualSequence, invoiceDate, id);
        if (!cancelled) setSequenceAvailability(availability);
      } catch (e) {
        if (!cancelled) setSequenceAvailability(null);
      }
    };

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [canEditSequence, id, invoiceDate, manualSequence, sequenceData]);

  const duplicateSequenceMessage =
    sequenceAvailability && sequenceAvailability.available === false
      ? `Invoice number ${sequenceAvailability.invoiceNumber} already exists`
      : "";

  const loadMissingSequences = async () => {
    setMissingPanelOpen(true);
    setMissingSequencesLoading(true);
    setMissingSequencesError("");

    try {
      const data = await getMissingSequences(invoiceDate);
      setMissingSequencesData(data);
    } catch (e) {
      setMissingSequencesError(e.message || "Failed to load missing invoice numbers");
    } finally {
      setMissingSequencesLoading(false);
    }
  };

  const selectMissingSequence = (sequence) => {
    sequenceEditedRef.current = true;
    setManualSequence(String(sequence));
    setMissingPanelOpen(false);
  };

  const calc = useMemo(
    () => calcTotalsForTaxes(invoiceData.items, invoiceData.taxes, paidAmount),
    [invoiceData, paidAmount],
  );

  // Regenerate preview on data change — uses calcInvoiceTotals (single source of truth)
  useEffect(() => {
    const appliedTax = resolveTaxRates(invoiceData.taxes);
    const previewCalc = calcTotalsForTaxes(invoiceData.items, invoiceData.taxes, paidAmount);

    const hydratedItems = previewCalc.hydratedItems.map((item, idx) => ({
      ...item,
      slNo: idx + 1,
      hsnSac: item.hsnSac || "71131910",
      quantity: item.quantity || 1,
      unit: item.unit || "GMS",
      purity: item.purity || "None",
    }));

    const hsnSummaryMap = {};
    hydratedItems.forEach((item) => {
      const hsn = item.hsnSac || "71131910";
      if (!hsnSummaryMap[hsn]) {
        hsnSummaryMap[hsn] = {
          hsnSac: hsn,
          taxableValue: 0,
          cgstRate: appliedTax.cgstRate,
          sgstRate: appliedTax.sgstRate,
          igstRate: appliedTax.igstRate,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTaxAmount: 0,
        };
      }
      hsnSummaryMap[hsn].taxableValue += item.amount || 0;
    });

    const hsnSummary = Object.values(hsnSummaryMap).map((s) => {
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
        ...appliedTax,
        cgstAmount: previewCalc.cgst,
        sgstAmount: previewCalc.sgst,
        igstAmount: previewCalc.igst,
        totalTaxAmount: previewCalc.cgst + previewCalc.sgst + previewCalc.igst,
      },
      totalAmount: previewCalc.total,
      roundOff: previewCalc.roundOff,
      cashReceived: parseFloat(paidAmount) || 0,
      amtBalance: previewCalc.outstanding,
      hsnSummary: hsnSummary,
      payments: sortPaymentsByDate([
        ...buildMergedInvoicePayments(payments, selectedAdvances),
        ...lockedAdvancePayments,
      ]).map((p) => ({
        mode: p.mode,
        amount: parseFloat(p.amount) || 0,
        paidAt: p.paidAt,
        source: p.source,
        sourceCustomerName: p.sourceCustomerName,
      })),
      metadata: {
        ...invoiceData.metadata,
        invoiceNo:
          id && invoiceData.status !== "DRAFT" && invoiceData.metadata?.invoiceNo
            ? invoiceData.metadata.invoiceNo
            : sequenceData && manualSequence
              ? `${sequenceData.prefix}/${manualSequence}/${sequenceData.financialYear}`
              : "PREVIEW",
        date: invoiceDate,
      },
    };

    try {
      if (theme === "modern")
        setPreviewHtml(generateModernInvoiceHtml(hydratedData));
      else if (theme === "jewellery")
        setPreviewHtml(generateJewelleryInvoiceHtml(hydratedData));
      else setPreviewHtml(generateInvoiceHtml(hydratedData));
    } catch (e) {
      /* silent */
    }
  }, [invoiceData, theme, paidAmount, invoiceDate, payments, selectedAdvances, lockedAdvancePayments, sequenceData, manualSequence, id]);

  const performSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return [];
    }
    try {
      setSearching(true);
      const data = await searchCustomers({ query: q });
      const results = data.data || data || [];
      setSearchResults(results);
      return results;
    } catch {
      setSearchResults([]);
      return [];
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchDebounceRef.current);
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounceRef.current = setTimeout(() => performSearch(q), 400);
  };

  const handleNameFormatChange = useCallback((format, customer = selectedCustomerObj) => {
    if (!customer) return;
    setNameFormat(format);
    let targetName = customer.fullName || '';
    if (format === 'father' && customer.fatherName) {
      targetName = formatRelativeName(customer.fullName, customer.fatherName, 'father', customer.gender);
    } else if (format === 'mother' && customer.motherName) {
      targetName = formatRelativeName(customer.fullName, customer.motherName, 'mother', customer.gender);
    } else if (format === 'spouse' && customer.spouseName) {
      targetName = formatRelativeName(customer.fullName, customer.spouseName, 'spouse', customer.gender);
    }
    setInvoiceData(prev => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        name: targetName
      }
    }));
  }, [selectedCustomerObj]);

  const handleCustomerSelect = (c) => {
    pendingItemDescriptionFocusRef.current = true;
    setSelectedCustomerId(c.id);
    setSelectedCustomerObj(c);
    setNameFormat("default");
    setSearchQuery("");
    setSearchResults([]);
    setInvoiceData((prev) => ({
      ...prev,
      buyer: {
        name: c.fullName || c.name || "",
        phone: c.contactDetails?.[0]?.primaryPhone || c.phone || "",
        address: formatCustomerAddress(c.locations?.[0]),
        stateCode: c.locations?.[0]?.stateCode || c.stateCode || "",
      },
    }));
    // Load this customer's advance balance and most recent advance date in background
    setAdvanceBalance(null);
    setSelectedAdvances([]);
    getAdvanceBalance(c.id)
      .then((data) => setAdvanceBalance(parseFloat(data?.availableAdvance || 0)))
      .catch(() => setAdvanceBalance(0));
  };

  useEffect(() => {
    if (
      !pendingItemDescriptionFocusRef.current ||
      !selectedCustomerId ||
      isCustomerPanelOpen
    )
      return;

    pendingItemDescriptionFocusRef.current = false;
    window.requestAnimationFrame(() => {
      firstItemDescriptionRef.current?.focus();
    });
  }, [selectedCustomerId, isCustomerPanelOpen]);

  const handleCustomerSearchKeyDown = async (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;

    clearTimeout(searchDebounceRef.current);
    const results =
      searchResults.length > 0 ? searchResults : await performSearch(query);

    if (results.length > 0) {
      handleCustomerSelect(results[0]);
    } else {
      setIsCustomerPanelOpen(true);
    }
  };

  const clearCustomer = () => {
    setSelectedCustomerId("");
    setSelectedCustomerObj(null);
    setNameFormat("default");
    setAdvanceBalance(null);
    setSelectedAdvances([]);
    setLockedAdvancePayments([]);
    setBillToSwitchOpen(false);
    setBillToQuery("");
    setBillToResults([]);
    setInvoiceData((prev) => ({
      ...prev,
      buyer: { name: "", phone: "", address: "", stateCode: "" },
    }));
  };

  const handleBillToSearchChange = (e) => {
    const q = e.target.value;
    setBillToQuery(q);
    clearTimeout(billToDebounceRef.current);
    if (q.length < 2) {
      setBillToResults([]);
      setBillToSearching(false);
      return;
    }
    setBillToSearching(true);
    billToDebounceRef.current = setTimeout(async () => {
      try {
        const data = await searchCustomers({ query: q });
        const results = (data.data || data || []).filter(
          (c) => c.id !== selectedCustomerId,
        );
        setBillToResults(results);
      } catch {
        setBillToResults([]);
      } finally {
        setBillToSearching(false);
      }
    }, 350);
  };

  const handleBillToSelect = (newCustomer) => {
    const prevName = selectedCustomerObj?.fullName || selectedCustomerObj?.name || invoiceData.buyer.name;
    // Preserve already-picked advances from the previous customer (tag sourceCustomerName if missing)
    setSelectedAdvances((prev) =>
      prev.map((a) => ({
        ...a,
        sourceCustomerName: a.sourceCustomerName || prevName,
      })),
    );
    setSelectedCustomerId(newCustomer.id);
    setSelectedCustomerObj(newCustomer);
    setNameFormat("default");
    setBillToSwitchOpen(false);
    setBillToQuery("");
    setBillToResults([]);
    setInvoiceData((prev) => ({
      ...prev,
      buyer: {
        name: newCustomer.fullName || newCustomer.name || "",
        phone: newCustomer.contactDetails?.[0]?.primaryPhone || newCustomer.phone || "",
        address: formatCustomerAddress(newCustomer.locations?.[0]),
        stateCode: newCustomer.locations?.[0]?.stateCode || newCustomer.stateCode || "",
      },
    }));
    setAdvanceBalance(null);
    getAdvanceBalance(newCustomer.id)
      .then((data) => setAdvanceBalance(parseFloat(data?.availableAdvance || 0)))
      .catch(() => setAdvanceBalance(0));
  };

  const updateItem = (idx, field, value) => {
    let newItems = [...invoiceData.items];
    const updatedItem = { ...newItems[idx], [field]: value };

    // Side-effects for metal type selection
    if (field === "metalType" && value === "SILVER") {
      updatedItem.makingChargesType = "PER_GRAM"; // Common for Silver
      updatedItem.hsnSac = "711311";
    } else if (field === "metalType" && value === "GOLD") {
      updatedItem.makingChargesType = "PER_GRAM";
      updatedItem.hsnSac = "711319";
    }

    newItems[idx] = updatedItem;
    setInvoiceData((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () =>
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { ...defaultItem(), slNo: prev.items.length + 1 }],
    }));

  const removeItem = (idx) => {
    if (invoiceData.items.length === 1) return;
    setInvoiceData((prev) => ({
      ...prev,
      items: prev.items
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, slNo: i + 1 })),
    }));
  };

  const handleAddPayment = () => {
    setPayments([
      ...payments,
      { mode: "CASH", amount: 0, paidAt: invoiceDate },
    ]);
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
    const parsedManualSequence = parseInt(manualSequence, 10);
    const paymentsByDate = sortPaymentsByDate(payments);
    const advAllocations = buildAdvanceAllocations(selectedAdvances);
    const mergedPayments = buildMergedInvoicePayments(payments, selectedAdvances);
    const payload = {
      customerId: selectedCustomerId,
      footerAssetId: selectedFooterAssetId || undefined,
      buyerName: invoiceData.buyer.name || undefined,
      invoiceDate: invoiceDate,
      manualSequence:
        canEditSequence && Number.isFinite(parsedManualSequence)
          ? parsedManualSequence
          : undefined,
      payments: paymentsByDate.map((p) => ({
        mode: p.mode,
        amount: parseFloat(p.amount) || 0,
        reference: p.reference || undefined,
        paidAt: p.paidAt,
      })),
      ...(advAllocations.length > 0 || (id && invoiceData.status === "DRAFT")
        ? { advanceAllocations: advAllocations }
        : {}),
      paidAmount, // keep for backward compatibility
      autoCreateUdhar: autoCreateUdhar,
      templateType: theme,
      ...resolveTaxRates(invoiceData.taxes),
      modeOfPayment: mergedPayments[0]?.mode || lockedAdvancePayments[0]?.mode || "UPI",
      items: invoiceData.items.map((item) => {
        const { purityValue, purityBasis } = parsePurity(
          item.purity && item.purity !== "None" ? item.purity : "22K",
        );
        return {
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: parseFloat(item.quantity) || 1,
          metalType: item.metalType || "GOLD",
          metalRate: parseFloat(item.rate) || 0,
          purityLabel: item.purity && item.purity !== "None" ? item.purity : "",
          purityValue,
          purityBasis,
          grossWeight: parseFloat(item.grossWeight) || 0,
          stoneWeight: parseFloat(item.stoneWeight) || 0,
          makingCharges: parseFloat(item.makingCharges) || 0,
          makingChargesType: item.makingChargesType,
          stoneCharges: parseFloat(item.stoneCharges) || 0,
          isHallmarked: !!item.huid || parseFloat(item.hallmarkCharge) > 0,
          hallmarkingCharge: parseFloat(item.hallmarkCharge) || 0,
          huid: item.huid || undefined,
        };
      }),
    };
    return payload;
  };

  const buildFutureSequenceWarning = (onConfirm) => {
    const parsedManualSequence = parseInt(manualSequence, 10);
    const nextSequence = Number(sequenceData?.nextSequence);

    if (
      !canEditSequence ||
      !Number.isFinite(parsedManualSequence) ||
      !Number.isFinite(nextSequence) ||
      parsedManualSequence <= nextSequence
    ) {
      return false;
    }

    setConfirmation({
      isOpen: true,
      title: "Skip invoice numbers?",
      type: "warning",
      message: (
        <>
          The next invoice number is{" "}
          <span className="confirmation-modal-highlight">{nextSequence}</span>,
          but you entered{" "}
          <span className="confirmation-modal-highlight">{parsedManualSequence}</span>.
          <br />
          <br />
          This invoice will use{" "}
          <strong>
            {sequenceData.prefix}/{parsedManualSequence}/{sequenceData.financialYear}
          </strong>
          . Skipped numbers{" "}
          <strong>
            {nextSequence}
            {parsedManualSequence - nextSequence > 1 ? `-${parsedManualSequence - 1}` : ""}
          </strong>{" "}
          will stay available for manual entry later.
        </>
      ),
      confirmText: "Use this number",
      cancelText: "Go back",
      onConfirm,
    });
    return true;
  };

  const canSubmit =
    selectedCustomerId &&
    invoiceData.items.length > 0 &&
    invoiceData.items.every(
      (i) =>
        i.description &&
        i.hsnSac &&
        parseFloat(i.grossWeight) > 0 &&
        parseFloat(i.rate) > 0,
    );

  const getInvoiceKycError = async (total) => {
    const thresholdError = getHighValueInvoiceKycError(total, []);
    if (!thresholdError) return '';

    try {
      const documents = await getDocuments(selectedCustomerId);
      return getHighValueInvoiceKycError(total, Array.isArray(documents) ? documents : []);
    } catch (error) {
      return getHighValueInvoiceKycError(total, []);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      alert("Select a customer first");
      return;
    }
    const paymentDateError = getPaymentDateError(payments, invoiceDate, selectedAdvances);
    if (paymentDateError) {
      alert(paymentDateError);
      return;
    }

    const total = calcTotalsForTaxes(invoiceData.items, invoiceData.taxes, paidAmount).total;

    if (advanceAppliedAmount > total) {
      alert("Total applied advance exceeds the invoice total. Reduce an advance receipt amount first.");
      return;
    }

    const kycError = await getInvoiceKycError(total);
    if (kycError) {
      alert(kycError);
      return;
    }

    const proceedWithSave = async () => {
      setConfirmation((prev) => ({ ...prev, isOpen: false }));
      try {
        setLoading(true);
        const currentPayload = buildPayload();
        let res;
        if (id) {
          res = await updateInvoice(id, { ...currentPayload, finalize: true });
        } else {
          res = await createInvoice(currentPayload);
        }
        if (!res?.id) {
          alert("Failed to finalize invoice");
          return;
        }
        navigate(`/invoices`);
      } catch (err) {
        console.error(err);
        alert(err.message || "Error saving invoice");
      } finally {
        setLoading(false);
      }
    };

    // Check for overpayment
    if (paidAmount > total) {
      setConfirmation({
        isOpen: true,
        title: "Overpayment Detected",
        type: "danger",
        message: (
          <>
            Total payments (
            <span className="confirmation-modal-highlight">
              ₹{paidAmount.toLocaleString()}
            </span>
            ) exceed the invoice total (
            <span className="confirmation-modal-highlight">
              ₹{total.toLocaleString()}
            </span>
            ).
            <br />
            <br />
            This will create a credit balance of{" "}
            <strong style={{ color: "#ef4444" }}>
              ₹{(paidAmount - total).toLocaleString()}
            </strong>{" "}
            for this customer.
            <br />
            <br />
            Are you sure you want to record this overpayment?
          </>
        ),
        onConfirm: proceedWithSave,
      });
      return;
    }

    // Warning for finalized invoices
    if (
      id &&
      invoiceData.status !== "DRAFT" &&
      invoiceData.status !== "CANCELLED"
    ) {
      setConfirmation({
        isOpen: true,
        title: "Update Finalized Invoice",
        type: "warning",
        message:
          "This invoice is already finalized. Saving changes will automatically update the customer's ledger and udhar records. Proceed?",
        confirmText: undefined,
        cancelText: undefined,
        onConfirm: proceedWithSave,
      });
      return;
    }

    if (buildFutureSequenceWarning(proceedWithSave)) return;

    await proceedWithSave();
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) {
      alert("Select a customer first");
      return;
    }
    const paymentDateError = getPaymentDateError(payments, invoiceDate, selectedAdvances);
    if (paymentDateError) {
      alert(paymentDateError);
      return;
    }

    const proceedWithSaveDraft = async () => {
      setConfirmation((prev) => ({ ...prev, isOpen: false }));
      try {
        setLoading("draft");
        const currentPayload = buildPayload();
        let res;
        if (id) {
          res = await updateInvoice(id, currentPayload);
        } else {
          res = await createDraft(currentPayload);
        }
        if (res?.id) navigate(`/invoices`);
        else alert("Failed to save draft");
      } catch (e) {
        console.error(e);
        alert(e.message || "Network error");
      } finally {
        setLoading(false);
      }
    };

    // Warning for finalized invoices
    if (
      id &&
      invoiceData.status !== "DRAFT" &&
      invoiceData.status !== "CANCELLED"
    ) {
      setConfirmation({
        isOpen: true,
        title: "Update Finalized Invoice",
        type: "warning",
        message:
          "This invoice is already finalized. Saving changes will automatically update the customer's ledger and udhar records. Proceed?",
        confirmText: undefined,
        cancelText: undefined,
        onConfirm: proceedWithSaveDraft,
      });
      return;
    }

    if (buildFutureSequenceWarning(proceedWithSaveDraft)) return;

    await proceedWithSaveDraft();
  };

  return (
    <>
      <DashboardTemplate headerTitle="Create Invoice" headerTabs={[]}>
        <div className={styles.pageWrapper}>
          {/* ── Form Body ── */}
          <div className={styles.formBody}>
            {/* Customer + Date row */}
            <div className={styles.topRow}>
              <div className={styles.topRowCustomer}>
                {!invoiceData.buyer.name ? (
                  <div className={styles.customerSearchWrap}>
                    <Icon
                      name="search"
                      size={13}
                      className={styles.customerSearchIcon}
                    />
                    <input
                      className={styles.customerSearchInput}
                      placeholder="Search customer by name or phone..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleCustomerSearchKeyDown}
                    />
                    {searching && (
                      <Icon
                        name="loader"
                        size={13}
                        className={styles.searchLoading}
                      />
                    )}
                    {(searchResults.length > 0 ||
                      (searchQuery.length >= 2 && !searching)) && (
                      <div className={styles.searchResults}>
                        {searchResults.map((c) => {
                          const customerAddress = formatCustomerAddress(
                            c.locations?.[0],
                          );

                          return (
                            <div
                              key={c.id}
                              className={styles.searchResultItem}
                              onClick={() => handleCustomerSelect(c)}
                            >
                              <Avatar
                                name={c.fullName || c.name || "?"}
                                size="sm"
                              />
                              <div className={styles.searchResultInfo}>
                                <strong>{c.fullName || c.name}</strong>
                                <span className={styles.searchResultMeta}>
                                  {c.contactDetails?.[0]?.primaryPhone ||
                                    c.phone ||
                                    "No phone"}
                                </span>
                              </div>
                              {customerAddress && (
                                <span className={styles.searchResultAddress}>
                                  <Icon name="location" size={12} />
                                  {customerAddress}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <div
                          className={styles.addNewCustomerItem}
                          onClick={() => setIsCustomerPanelOpen(true)}
                        >
                          <div className={styles.addIconCircle}>
                            <Icon name="add" size={14} />
                          </div>
                          <div className={styles.searchResultInfo}>
                            <strong>Add "{searchQuery}" as new customer</strong>
                            <span>
                              Create a new record and select automatically
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.selectedCustomerContainer}>
                    <div className={styles.selectedCustomer}>
                      <Avatar name={invoiceData.buyer.name} size="sm" />
                      <div className={styles.selectedCustomerText}>
                        <strong>{invoiceData.buyer.name}</strong>
                        <span>{invoiceData.buyer.phone}</span>
                      </div>
                      {invoiceData.buyer.address && (
                        <span className={styles.selectedCustomerAddress}>
                          <Icon name="location" size={11} />
                          {invoiceData.buyer.address}
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.changeBtn}
                        onClick={() => setBillToSwitchOpen((v) => !v)}
                        title="Keep picked advances and issue bill in another customer's name"
                      >
                        Bill to someone else
                      </button>
                      <button
                        type="button"
                        className={styles.changeBtn}
                        onClick={clearCustomer}
                      >
                        Change
                      </button>
                    </div>

                    {billToSwitchOpen && (
                      <div className={styles.billToSwitchBox}>
                        <div className={styles.billToSwitchInputRow}>
                          <input
                            className={styles.billToSwitchInput}
                            placeholder="Switch Bill-To customer (keeps picked advances)..."
                            value={billToQuery}
                            onChange={handleBillToSearchChange}
                            autoFocus
                          />
                          <button
                            type="button"
                            className={styles.changeBtn}
                            onClick={() => {
                              setBillToSwitchOpen(false);
                              setBillToQuery("");
                              setBillToResults([]);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {billToSearching && (
                          <div className={styles.billToSwitchEmpty}>Searching...</div>
                        )}
                        {billToResults.length > 0 && (
                          <div className={styles.billToSwitchResults}>
                            {billToResults.map((c) => (
                              <div
                                key={c.id}
                                className={styles.searchResultItem}
                                onClick={() => handleBillToSelect(c)}
                              >
                                <Avatar
                                  name={c.fullName || c.name || "?"}
                                  size="sm"
                                />
                                <div className={styles.searchResultInfo}>
                                  <strong>{c.fullName || c.name}</strong>
                                  <span className={styles.searchResultMeta}>
                                    {c.contactDetails?.[0]?.primaryPhone || c.phone || "No phone"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedCustomerObj && (selectedCustomerObj.fatherName || selectedCustomerObj.motherName || selectedCustomerObj.spouseName) && (
                      <div className={styles.nameFormatSelector}>
                        <span className={styles.nameFormatLabel}>Name format on invoice:</span>
                        <div className={styles.nameFormatOptions}>
                          <label className={styles.nameFormatOption}>
                            <input
                              type="radio"
                              name="nameFormat"
                              value="default"
                              checked={nameFormat === 'default'}
                              onChange={() => handleNameFormatChange('default')}
                            />
                            <span>Name only</span>
                          </label>
                          {selectedCustomerObj.fatherName && (
                            <label className={styles.nameFormatOption}>
                              <input
                                type="radio"
                                name="nameFormat"
                                value="father"
                                checked={nameFormat === 'father'}
                                onChange={() => handleNameFormatChange('father')}
                              />
                              <span>Name / Father Name ({formatRelativeName(selectedCustomerObj.fullName, selectedCustomerObj.fatherName, 'father', selectedCustomerObj.gender)})</span>
                            </label>
                          )}
                          {selectedCustomerObj.motherName && (
                            <label className={styles.nameFormatOption}>
                              <input
                                type="radio"
                                name="nameFormat"
                                value="mother"
                                checked={nameFormat === 'mother'}
                                onChange={() => handleNameFormatChange('mother')}
                              />
                              <span>Name / Mother Name ({formatRelativeName(selectedCustomerObj.fullName, selectedCustomerObj.motherName, 'mother', selectedCustomerObj.gender)})</span>
                            </label>
                          )}
                          {selectedCustomerObj.spouseName && (
                            <label className={styles.nameFormatOption}>
                              <input
                                type="radio"
                                name="nameFormat"
                                value="spouse"
                                checked={nameFormat === 'spouse'}
                                onChange={() => handleNameFormatChange('spouse')}
                              />
                              <span>Name / Spouse Name ({formatRelativeName(selectedCustomerObj.fullName, selectedCustomerObj.spouseName, 'spouse', selectedCustomerObj.gender)})</span>
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <aside className={styles.invoiceControls}>
                <div className={styles.dateAndSeqGroup}>
                  <div className={styles.seqField}>
                  <div className={styles.seqHeader}>
                    <label className={styles.dateLabel}>Invoice No.</label>
                    {canEditSequence ? (
                      <button
                        type="button"
                        className={styles.missingSeqBtn}
                        onClick={loadMissingSequences}
                      >
                        Missing numbers
                      </button>
                    ) : null}
                  </div>
                  {canEditSequence && sequenceData ? (
                    <div className={styles.seqInputWrapper}>
                      <span className={styles.seqPrefix}>{sequenceData.prefix} / </span>
                      <input
                        type="number"
                        className={styles.seqInput}
                        value={manualSequence}
                        onChange={(e) => {
                          sequenceEditedRef.current = true;
                          setManualSequence(e.target.value);
                        }}
                        min="1"
                      />
                      <span className={styles.seqSuffix}> / {sequenceData.financialYear}</span>
                    </div>
                  ) : (
                    <div className={styles.staticSeqWrapper}>
                      <span className={styles.staticSeq}>
                        {id && invoiceData.metadata.invoiceNo && invoiceData.metadata.invoiceNo !== 'PREVIEW'
                          ? invoiceData.metadata.invoiceNo
                          : 'Auto-generated'}
                      </span>
                    </div>
                  )}
                  {duplicateSequenceMessage ? (
                    <div className={styles.sequenceWarning}>
                      {duplicateSequenceMessage}
                    </div>
                  ) : null}
                  </div>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>Invoice Date</label>
                  <DatePicker
                    triggerClassName={styles.dateInput}
                    value={invoiceDate}
                    onChange={setInvoiceDate}
                  />
                </div>
                <div className={styles.formatField}>
                  <label className={styles.dateLabel}>Invoice Format</label>
                  <div
                    className={styles.formatSwitch}
                    role="radiogroup"
                    aria-label="Invoice format"
                    title="Print format for this invoice only. Change the default in Settings."
                  >
                    {INVOICE_TEMPLATES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={theme === t.value}
                        className={`${styles.formatOption} ${theme === t.value ? styles.formatOptionActive : ""}`}
                        onClick={() => setTheme(t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              </aside>
            </div>

            {/* Advance balance badge — informational only, selection is in the payments section */}
            {selectedCustomerId && advanceBalance > 0 && (
              <div className={styles.advanceBanner}>
                <span className={styles.advanceBannerIcon}>💰</span>
                <span className={styles.advanceBannerText}>
                  ₹{advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} advance available — select receipts below to apply
                </span>
              </div>
            )}

            {/* Items */}
            <section className={styles.itemsSection}>
              <div className={styles.itemsHeader}>
                <div>
                  <h3>Line Items</h3>
                  <p>Jewellery, metal, weight and making details</p>
                </div>
                <button className={styles.addItemBtn} onClick={addItem}>
                  <Icon name="add" size={12} /> Add Item
                </button>
              </div>

              <div className={styles.itemCards}>
                {invoiceData.items.map((item, idx) => (
                <div key={idx} className={styles.itemCard}>
                  {/* Top row: index + description + remove */}
                  <div className={styles.itemCardTop}>
                    <span className={styles.itemIndex}>{idx + 1}</span>
                    <input
                      ref={idx === 0 ? firstItemDescriptionRef : null}
                      className={styles.itemDescInput}
                      placeholder="Item description..."
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                    />
                    <button
                      className={styles.removeRowBtn}
                      onClick={() => removeItem(idx)}
                      disabled={invoiceData.items.length === 1}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>

                  {/* Field grid */}
                  <div className={styles.itemFieldGrid}>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Metal</span>
                      <div className={styles.metalCell}>
                        {metalOptions.map((m) => (
                          <button
                            key={m}
                            className={
                              item.metalType === m ? styles.activeMetal : ""
                            }
                            onClick={() => updateItem(idx, "metalType", m)}
                          >
                            {m[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Qty</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", e.target.value)
                        }
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Gross (g)</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0.000"
                        value={item.grossWeight}
                        onChange={(e) =>
                          updateItem(idx, "grossWeight", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Stone (g)</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0.000"
                        value={item.stoneWeight}
                        onChange={(e) =>
                          updateItem(idx, "stoneWeight", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Net (g)</span>
                      <div className={styles.fieldComputed}>
                        {(
                          (parseFloat(item.grossWeight) || 0) -
                          (parseFloat(item.stoneWeight) || 0)
                        ).toFixed(3)}
                      </div>
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Purity</span>
                      <select
                        className={styles.fieldSelect}
                        value={item.purity}
                        onChange={(e) =>
                          updateItem(idx, "purity", e.target.value)
                        }
                      >
                        {purityOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        {!purityOptions.includes(item.purity) && (
                          <option value={item.purity}>{item.purity}</option>
                        )}
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Metal Rate ₹/g</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(idx, "rate", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>HSN</span>
                      <input
                        className={styles.fieldInput}
                        placeholder="71131910"
                        value={item.hsnSac}
                        onChange={(e) =>
                          updateItem(idx, "hsnSac", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Making Type</span>
                      <select
                        className={styles.fieldSelect}
                        value={item.makingChargesType}
                        onChange={(e) =>
                          updateItem(idx, "makingChargesType", e.target.value)
                        }
                      >
                        {makingOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Making ₹</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0"
                        value={item.makingCharges}
                        onChange={(e) =>
                          updateItem(idx, "makingCharges", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Stone ₹</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0"
                        value={item.stoneCharges}
                        onChange={(e) =>
                          updateItem(idx, "stoneCharges", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>HUID</span>
                      <input
                        className={styles.fieldInput}
                        placeholder="—"
                        value={item.huid}
                        onChange={(e) =>
                          updateItem(idx, "huid", e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>HM Charge ₹</span>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        placeholder="0"
                        value={item.hallmarkCharge}
                        onChange={(e) =>
                          updateItem(idx, "hallmarkCharge", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </section>

            {/* Payments / Split — now above Advanced */}
            <div className={styles.paymentsSection}>
              <div className={styles.sectionHeader}>
                <label>Payments / Split</label>
                <button
                  type="button"
                  className={styles.addSmallBtn}
                  onClick={handleAddPayment}
                >
                  + Add Mode
                </button>
              </div>
              {payments.length > 0 && (
                <div className={styles.paymentTableHeader} aria-hidden="true">
                  <span>Mode</span>
                  <span>Amount</span>
                  <span>Payment date</span>
                  <span></span>
                </div>
              )}
              {payments.map((p, idx) => (
                <div key={idx} className={styles.paymentRow}>
                  <div className={styles.paymentField}>
                    <label htmlFor={`payment-mode-${idx}`}>Payment mode</label>
                    <select
                      id={`payment-mode-${idx}`}
                      value={p.mode}
                      onChange={(e) =>
                        handleUpdatePayment(idx, "mode", e.target.value)
                      }
                      className={styles.paymentModeSelect}
                    >
                      {paymentModes.map((m) => (
                        <option key={m} value={m}>
                          {m.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.paymentField}>
                    <label htmlFor={`payment-amount-${idx}`}>Amount</label>
                    <div className={styles.paymentAmountWrap}>
                      <span className={styles.currencyPrefix}>₹</span>
                      <input
                        id={`payment-amount-${idx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.amount}
                        onChange={(e) =>
                          handleUpdatePayment(idx, "amount", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className={styles.paymentField}>
                    <label htmlFor={`payment-date-${idx}`}>Payment date</label>
                    <DatePicker
                      id={`payment-date-${idx}`}
                      value={p.paidAt || invoiceDate}
                      max={[invoiceDate, toDateInputValue()].sort()[0]}
                      required
                      align="right"
                      onChange={(ymd) => handleUpdatePayment(idx, "paidAt", ymd)}
                      triggerClassName={styles.paymentDateInput}
                    />
                  </div>
                  <div className={styles.paymentAction}>
                    <span aria-hidden="true">Action</span>
                    <button
                      type="button"
                      className={styles.removePaymentBtn}
                      onClick={() => handleRemovePayment(idx)}
                      aria-label={`Remove ${p.mode} payment`}
                      title="Remove payment"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Transaction-level Advance Receipt Picker (new invoices & drafts) */}
              {selectedCustomerId && (!id || invoiceData.status === "DRAFT") && (
                <div className={styles.advanceRowWrap}>
                  <AdvanceReceiptPicker
                    primaryCustomerId={selectedCustomerId}
                    primaryCustomerName={
                      selectedCustomerObj?.fullName ||
                      selectedCustomerObj?.name ||
                      invoiceData.buyer.name
                    }
                    selectedAdvances={selectedAdvances}
                    onSelectedAdvancesChange={setSelectedAdvances}
                    invoiceDate={invoiceDate}
                    invoiceTotal={calc.total}
                    directPaymentsTotal={directPaidAmount}
                  />
                </div>
              )}

              {/* Locked advance summary when editing an already-finalized invoice */}
              {id && invoiceData.status !== "DRAFT" && lockedAdvancePayments.length > 0 && (
                <div className={styles.advanceRowWrap}>
                  <div className={styles.advanceHistory}>
                    <span className={styles.advanceHistoryLabel}>
                      Applied Advances (locked):
                    </span>
                    {lockedAdvancePayments.map((p, idx) => (
                      <span key={idx} className={styles.advanceHistoryChip}>
                        {p.mode} · ₹{Number(p.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        {p.paidAt ? ` · ${p.paidAt}` : ''}
                        {p.sourceCustomerName ? ` (from ${p.sourceCustomerName})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Section */}
            <button
              className={styles.advancedToggle}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span>Advanced</span>
              <Icon
                name={showAdvanced ? "chevronUp" : "chevronDown"}
                size={12}
              />
            </button>

            {showAdvanced && (
              <div className={styles.advancedSection}>
                <div className={styles.settingsCard}>
                  <div className={styles.sectionHeader}>
                    <label>Tax &amp; Settings</label>
                  </div>
                  <div className={styles.settingsTableHeader} aria-hidden="true">
                    <span>Tax type</span>
                    <span>Tax %</span>
                  </div>
                  <div className={styles.settingsRow}>
                    <div className={styles.paymentField}>
                      <label htmlFor="invoice-tax-type">Tax type</label>
                      <select
                        id="invoice-tax-type"
                    value={invoiceData.taxes.taxType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      // Rates stay in state so switching back restores them; NONE/IGST
                      // are applied through resolveTaxRates. IGST starts at CGST + SGST.
                      setInvoiceData((prev) => ({
                        ...prev,
                        taxes: {
                          ...prev.taxes,
                          taxType: newType,
                          igstRate:
                            newType === "IGST" && !prev.taxes.igstRate
                              ? (parseFloat(prev.taxes.cgstRate) || 0) + (parseFloat(prev.taxes.sgstRate) || 0)
                              : prev.taxes.igstRate,
                        },
                      }));
                    }}
                    className={styles.paymentModeSelect}
                  >
                    <option value="CGST_SGST">GST (CGST+SGST)</option>
                    <option value="IGST">IGST</option>
                    <option value="NONE">NONE</option>
                  </select>
                    </div>
                    <div className={styles.paymentField}>
                      <label htmlFor="invoice-tax-rate">Tax %</label>
                      <input
                        id="invoice-tax-rate"
                        type="number"
                        step="0.1"
                        value={
                          invoiceData.taxes.taxType === "IGST"
                            ? invoiceData.taxes.igstRate
                            : invoiceData.taxes.taxType === "NONE"
                              ? 0
                              : invoiceData.taxes.cgstRate
                        }
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setInvoiceData((prev) => ({
                            ...prev,
                            taxes:
                              prev.taxes.taxType === "IGST"
                                ? { ...prev.taxes, igstRate: rate }
                                : { ...prev.taxes, cgstRate: rate, sgstRate: rate },
                          }));
                        }}
                        disabled={invoiceData.taxes.taxType === "NONE"}
                        className={styles.paymentDateInput}
                      />
                    </div>
                  </div>
                  <label className={styles.udharCell} htmlFor="invoice-auto-udhar">
                    <span>Auto-Udhar · create credit for unpaid balance</span>
                    <input
                      id="invoice-auto-udhar"
                      type="checkbox"
                      checked={autoCreateUdhar}
                      onChange={(e) => setAutoCreateUdhar(e.target.checked)}
                    />
                  </label>
                </div>
                {/* <div className={styles.advField}>
                <label>State Code</label>
                <input value={invoiceData.buyer.stateCode} onChange={e => setInvoiceData(prev => ({ ...prev, buyer: { ...prev.buyer, stateCode: e.target.value } }))} placeholder="07" />
              </div> */}
              </div>
            )}
          </div>

          {/* ── Sticky Bottom Bar ── */}
          <div className={styles.bottomBar} ref={bottomBarRef}>
            <div className={styles.totalBox}>
              <span className={styles.totalLabel}>Grand Total</span>
              <span className={styles.totalAmount}>{fmt(calc.total)}</span>
              <div className={styles.taxBreakdown}>
                <span>
                  {(() => {
                    const t = resolveTaxRates(invoiceData.taxes);
                    if (t.taxType === "NONE") return "No tax";
                    if (t.taxType === "IGST") return `IGST ${t.igstRate}%`;
                    return `CGST ${t.cgstRate}% + SGST ${t.sgstRate}%`;
                  })()}
                </span>
                {advanceAppliedAmount > 0 && (
                  <span style={{ color: "#10b981" }}>
                    Advance: −{fmt(advanceAppliedAmount)}
                  </span>
                )}
                {calc.outstanding > 0 && (
                  <span style={{ color: "#f59e0b" }}>
                    Bal: {fmt(calc.outstanding)}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.actionBtns}>
              <button
                className={`${styles.previewToggleBtn} ${showPreview ? styles.active : ""}`}
                onClick={() => setShowPreview((v) => !v)}
              >
                <Icon name="eye" size={14} /> Preview
              </button>
              <button
                className={`${styles.draftBtn}`}
                onClick={handleSaveDraft}
                disabled={!!loading || !canSubmit}
              >
                {id ? "Update Draft" : "Save Draft"}
              </button>
              <button
                className={`${styles.confirmBtn}`}
                onClick={handleSubmit}
                disabled={!!loading || !canSubmit}
              >
                {loading === true
                  ? "Processing..."
                  : id
                    ? "Confirm & Finalize"
                    : "Confirm & Pay"}
              </button>
            </div>
          </div>

          {/* ── Preview Drawer ── */}
          {showPreview && (
            <div
              className={styles.previewOverlay}
              onClick={() => setShowPreview(false)}
            />
          )}
          <div
            className={`${styles.previewDrawer} ${showPreview ? styles.open : ""}`}
            style={{ "--bottom-bar-height": `${bottomBarHeight}px` }}
          >
            <div className={styles.previewDrawerHeader}>
              <h3>Invoice Preview</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowPreview(false)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className={styles.previewTabs}>
              {INVOICE_TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  className={previewTab === "preview" && theme === t.value ? styles.activeTab : ""}
                  onClick={() => {
                    setTheme(t.value);
                    setPreviewTab("preview");
                  }}
                >
                  {t.label}
                </button>
              ))}
              <button
                className={previewTab === "footer" ? styles.activeTab : ""}
                onClick={() => setPreviewTab("footer")}
              >
                Footer
              </button>
            </div>

            {previewTab === "footer" ? (
              <section className={styles.footerPicker} aria-label="Footer design">
                <div className={styles.footerPickerHeader}>
                  <div>
                    <span className={styles.dateLabel}>Footer design</span>
                    <p>Choose the banner for this invoice</p>
                  </div>
                  {selectedFooterAssetId && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFooterAssetId(
                          footerLibrary.assets.find((asset) => asset.isDefault)?.id || ""
                        )
                      }
                    >
                      Use default
                    </button>
                  )}
                </div>
                {(() => {
                  const activeAssets = footerLibrary.assets.filter(
                    (asset) => asset.status === "ACTIVE"
                  );
                  const foldersWithAssets = footerLibrary.folders.filter((folder) =>
                    activeAssets.some((asset) => asset.folderId === folder.id)
                  );
                  const visibleAssets = activeAssets.filter(
                    (asset) => !footerFolderFilter || asset.folderId === footerFolderFilter
                  );
                  return (
                    <>
                      {foldersWithAssets.length > 0 && (
                        <div className={styles.footerFolderTabs}>
                          <button
                            type="button"
                            onClick={() => setFooterFolderFilter("")}
                            className={footerFolderFilter ? styles.footerFolderTab : styles.footerFolderTabActive}
                          >
                            All
                          </button>
                          {foldersWithAssets.map((folder) => (
                            <button
                              type="button"
                              onClick={() => setFooterFolderFilter(folder.id)}
                              className={footerFolderFilter === folder.id ? styles.footerFolderTabActive : styles.footerFolderTab}
                              key={folder.id}
                            >
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={styles.footerChoices}>
                        {visibleAssets.map((asset) => (
                          <button
                            type="button"
                            key={asset.id}
                            onClick={() => setSelectedFooterAssetId(asset.id)}
                            className={`${styles.footerChoice} ${selectedFooterAssetId === asset.id ? styles.footerChoiceActive : ""}`}
                          >
                            <img src={asset.publicUrl} alt={asset.name} />
                            <span>
                              {asset.name}
                              {asset.isDefault ? " · Default" : ""}
                            </span>
                          </button>
                        ))}
                        {!activeAssets.length && (
                          <span className={styles.footerEmpty}>
                            No active footer designs. Add one in Settings.
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </section>
            ) : (
              <div className={styles.previewIframe}>
                <iframe srcDoc={previewHtml} title="Preview" />
              </div>
            )}
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

      <SlideOver
        isOpen={missingPanelOpen}
        onClose={() => setMissingPanelOpen(false)}
        title="Missing Invoice Numbers"
        width={420}
      >
        <div className={styles.missingSeqPanel}>
          {missingSequencesLoading ? (
            <div className={styles.missingSeqState}>Checking missing numbers...</div>
          ) : missingSequencesError ? (
            <div className={styles.missingSeqError}>{missingSequencesError}</div>
          ) : (
            <>
              <div className={styles.missingSeqMeta}>
                <span>{missingSequencesData?.prefix || sequenceData?.prefix || "INV"}</span>
                <span>{missingSequencesData?.financialYear || sequenceData?.financialYear}</span>
              </div>
              {missingSequencesData?.missingDetails?.length ? (
                <div className={styles.missingSeqList}>
                  {missingSequencesData.missingDetails.map((detail) => (
                    <button
                      type="button"
                      key={detail.sequence}
                      className={styles.missingSeqItem}
                      onClick={() => selectMissingSequence(detail.sequence)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span>{detail.invoiceNumber}</span>
                        {(detail.minDate || detail.maxDate) && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            Expected: {detail.minDate ? new Date(detail.minDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Start'}
                            {' — '}
                            {detail.maxDate ? new Date(detail.maxDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Now'}
                          </span>
                        )}
                      </div>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  ))}
                </div>
              ) : missingSequencesData?.missingSequences?.length ? (
                <div className={styles.missingSeqList}>
                  {missingSequencesData.missingSequences.map((sequence) => (
                    <button
                      type="button"
                      key={sequence}
                      className={styles.missingSeqItem}
                      onClick={() => selectMissingSequence(sequence)}
                    >
                      <span>
                        {missingSequencesData.prefix}/{sequence}/{missingSequencesData.financialYear}
                      </span>
                      <Icon name="arrowRight" size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.missingSeqState}>
                  No missing invoice numbers for this financial year.
                </div>
              )}
            </>
          )}
        </div>
      </SlideOver>

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        isLoading={Boolean(loading)}
      />
    </>
  );
};

export default CreateInvoicePage;
