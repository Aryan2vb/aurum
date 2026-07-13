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
import { getAdvanceBalance, applyAdvanceToInvoice, getAdvanceLedger } from "../../services/advanceService";
import {
  generateInvoiceHtml,
  generateJewelleryInvoiceHtml,
  generateModernInvoiceHtml,
} from "../../utils/invoiceTemplates";
import { calcInvoiceTotals, parsePurity } from "../../utils/invoiceCalc";
import { getHighValueInvoiceKycError } from "../../utils/customerKyc";
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

const getPaymentDateError = (payments, invoiceDate) => {
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

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [theme, setTheme] = useState("classic");
  const [sequenceData, setSequenceData] = useState(null);
  const [manualSequence, setManualSequence] = useState("");
  const [sequenceAvailability, setSequenceAvailability] = useState(null);
  const [missingPanelOpen, setMissingPanelOpen] = useState(false);
  const [missingSequencesData, setMissingSequencesData] = useState(null);
  const [missingSequencesLoading, setMissingSequencesLoading] = useState(false);
  const [missingSequencesError, setMissingSequencesError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null);
  const [nameFormat, setNameFormat] = useState("default");
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(null); // available advance for selected customer
  const [advanceApplied, setAdvanceApplied] = useState(0);   // amount user wants to apply now
  const [advanceDate, setAdvanceDate] = useState('');         // date of the advance receipt (editable)
  const [advanceLedgerEntries, setAdvanceLedgerEntries] = useState([]); // raw receipt history
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
  const pendingItemDescriptionFocusRef = useRef(false);
  const sequenceEditedRef = useRef(false);
  const lastSuggestedSequenceRef = useRef(null);

  const paidAmount = useMemo(
    () => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [payments],
  );

  const [invoiceData, setInvoiceData] = useState({
    buyer: { name: "", phone: "", address: "", stateCode: "" },
    taxes: { cgstRate: 1.5, sgstRate: 1.5, taxType: "CGST_SGST" },
    metadata: { modeOfPayment: "UPI", deliveryNote: "", destination: "" },
    declaration:
      "We declare that this invoice shows the actual price of the goods described.",
    items: [defaultItem()],
    company: { name: "", address: "", gstin: "", state: "", stateCode: "" },
    status: "DRAFT",
  });

  const [previewHtml, setPreviewHtml] = useState("");
  const canEditSequence =
    !id || (invoiceData.status === "DRAFT" && Boolean(selectedCustomerId));

  // Fetch settings or existing invoice
  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getInvoiceSettings();
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
            taxType: settings.defaultTaxType || prev.taxes.taxType,
          },
          declaration: settings.declaration || prev.declaration,
        }));
        if (settings.defaultTemplate) setTheme(settings.defaultTemplate);

        if (id) {
          const inv = await getInvoiceById(id);
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
          if (inv.payments?.length) {
            setPayments(
              inv.payments.map((p) => ({
                mode: p.mode,
                amount: p.amount,
                reference: p.reference || "",
                paidAt: toDateInputValue(p.paidAt || p.createdAt),
                originalPaidAt: toDateInputValue(p.paidAt || p.createdAt),
              })),
            );
          } else {
            setPayments([
              {
                mode: inv.modeOfPayment || "UPI",
                amount: inv.paidAmount || 0,
                paidAt: toDateInputValue(inv.invoiceDate),
              },
            ]);
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
    () =>
      calcInvoiceTotals(
        invoiceData.items,
        invoiceData.taxes.cgstRate,
        invoiceData.taxes.sgstRate,
        paidAmount,
      ),
    [invoiceData, paidAmount],
  );

  // Regenerate preview on data change — uses calcInvoiceTotals (single source of truth)
  useEffect(() => {
    const previewCalc = calcInvoiceTotals(
      invoiceData.items,
      invoiceData.taxes.cgstRate,
      invoiceData.taxes.sgstRate,
      paidAmount,
    );

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
          cgstRate: invoiceData.taxes?.cgstRate || 1.5,
          sgstRate: invoiceData.taxes?.sgstRate || 1.5,
          igstRate: invoiceData.taxes?.igstRate || 0,
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
        cgstAmount: previewCalc.cgst,
        sgstAmount: previewCalc.sgst,
        totalTaxAmount: previewCalc.cgst + previewCalc.sgst,
      },
      totalAmount: previewCalc.total,
      roundOff: previewCalc.roundOff,
      cashReceived: parseFloat(paidAmount) || 0,
      amtBalance: previewCalc.outstanding,
      hsnSummary: hsnSummary,
      payments: payments.map((p) => ({
        mode: p.mode,
        amount: parseFloat(p.amount) || 0,
        paidAt: p.paidAt,
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
  }, [invoiceData, theme, paidAmount, invoiceDate, payments, sequenceData, manualSequence, id]);

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
    setAdvanceApplied(0);
    setAdvanceDate('');
    setAdvanceLedgerEntries([]);
    getAdvanceBalance(c.id)
      .then((data) => setAdvanceBalance(parseFloat(data?.availableAdvance || 0)))
      .catch(() => setAdvanceBalance(0));
    getAdvanceLedger(c.id)
      .then((entries) => {
        const arr = Array.isArray(entries) ? entries : [];
        setAdvanceLedgerEntries(arr);
        // Default the date picker to the most recent receipt date
        const received = arr
          .filter((e) => e.type === 'ADVANCE_RECEIVED')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (received.length > 0) {
          setAdvanceDate(toDateInputValue(received[0].createdAt));
        }
      })
      .catch(() => {});
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
    setAdvanceApplied(0);
    setAdvanceDate('');
    setAdvanceLedgerEntries([]);
    setInvoiceData((prev) => ({
      ...prev,
      buyer: { name: "", phone: "", address: "", stateCode: "" },
    }));
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
    const payload = {
      customerId: selectedCustomerId,
      buyerName: invoiceData.buyer.name || undefined,
      invoiceDate: invoiceDate,
      manualSequence:
        canEditSequence && Number.isFinite(parsedManualSequence)
          ? parsedManualSequence
          : undefined,
      payments: payments.map((p) => ({
        mode: p.mode,
        amount: parseFloat(p.amount) || 0,
        reference: p.reference || undefined,
        paidAt: p.paidAt,
      })),
      paidAmount, // keep for backward compatibility
      autoCreateUdhar: autoCreateUdhar,
      templateType: theme,
      modeOfPayment: payments[0]?.mode || "UPI",
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
    const paymentDateError = getPaymentDateError(payments, invoiceDate);
    if (paymentDateError) {
      alert(paymentDateError);
      return;
    }

    const total = calcInvoiceTotals(
      invoiceData.items,
      invoiceData.taxes.cgstRate,
      invoiceData.taxes.sgstRate,
      paidAmount,
    ).total;

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
        // Apply advance immediately if the user specified an amount
        if (advanceApplied > 0) {
          try {
            await applyAdvanceToInvoice(res.id, {
              amount: advanceApplied,
              paidAt: advanceDate || undefined,
              notes: 'Advance payment',
            });
          } catch (err) {
            // Invoice was saved — warn but don't block navigation
            alert(`Invoice saved, but advance could not be applied: ${err.message}`);
          }
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
    const paymentDateError = getPaymentDateError(payments, invoiceDate);
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
                      <button
                        className={styles.changeBtn}
                        onClick={clearCustomer}
                      >
                        Change
                      </button>
                    </div>

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
              {/* Advance balance badge — informational only, input is in the payments section */}
              {selectedCustomerId && advanceBalance > 0 && (
                <div className={styles.advanceBanner}>
                  <span className={styles.advanceBannerIcon}>💰</span>
                  <span className={styles.advanceBannerText}>
                    ₹{advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} advance available — enter amount below to apply
                  </span>
                </div>
              )}
              <div className={styles.dateAndSeqGroup}>
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
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
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

            {/* Advanced Section */}
            <button
              className={styles.advancedToggle}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span>Advanced</span>
              <Icon
                name={showAdvanced ? "chevron-up" : "chevron-down"}
                size={12}
              />
            </button>

            {showAdvanced && (
              <div className={styles.advancedSection}>
                <div className={styles.advField}>
                  <label>Tax Type</label>
                  <select
                    value={invoiceData.taxes.taxType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let cgst = invoiceData.taxes.cgstRate;
                      if (newType === "NONE") cgst = 0;
                      setInvoiceData((prev) => ({
                        ...prev,
                        taxes: {
                          ...prev.taxes,
                          taxType: newType,
                          cgstRate: cgst,
                          sgstRate: cgst,
                        },
                      }));
                    }}
                  >
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
                    <button
                      type="button"
                      className={styles.addSmallBtn}
                      onClick={handleAddPayment}
                    >
                      + Add Mode
                    </button>
                  </div>
                  {payments.map((p, idx) => (
                    <div key={idx} className={styles.paymentRow}>
                      <select
                        value={p.mode}
                        onChange={(e) =>
                          handleUpdatePayment(idx, "mode", e.target.value)
                        }
                        className={styles.paymentModeSelect}
                      >
                        {paymentModes.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <div className={styles.paymentAmountWrap}>
                        <span className={styles.currencyPrefix}>₹</span>
                        <input
                          type="number"
                          value={p.amount}
                          onChange={(e) =>
                            handleUpdatePayment(idx, "amount", e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <input
                        type="date"
                        value={p.paidAt || invoiceDate}
                        max={[invoiceDate, toDateInputValue()].sort()[0]}
                        required
                        onChange={(e) =>
                          handleUpdatePayment(idx, "paidAt", e.target.value)
                        }
                        className={styles.paymentDateInput}
                        aria-label={`Payment date ${idx + 1}`}
                      />
                      {payments.length > 1 && (
                        <button
                          type="button"
                          className={styles.removePaymentBtn}
                          onClick={() => handleRemovePayment(idx)}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Advance row — only shown when selected customer has advance balance */}
                  {advanceBalance > 0 && (
                    <div className={styles.advanceRowWrap}>
                      <div className={styles.paymentRow}>
                        <div className={styles.advanceRowLabel}>
                          <span className={styles.advancePill}>Advance</span>
                          <span className={styles.advanceRowAvail}>
                            avail: ₹{advanceBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={styles.paymentAmountWrap}>
                          <span className={styles.currencyPrefix}>₹</span>
                          <input
                            type="number"
                            min="0"
                            max={advanceBalance}
                            step="0.01"
                            value={advanceApplied || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setAdvanceApplied(Math.min(val, advanceBalance));
                            }}
                          />
                        </div>
                        <input
                          type="date"
                          value={advanceDate}
                          max={toDateInputValue()}
                          className={styles.paymentDateInput}
                          aria-label="Advance payment date"
                          onChange={(e) => setAdvanceDate(e.target.value)}
                        />
                        {advanceApplied > 0 && (
                          <button
                            type="button"
                            className={styles.removePaymentBtn}
                            onClick={() => setAdvanceApplied(0)}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>

                      {/* Advance receipt history — shows when/how deposits were made */}
                      {advanceLedgerEntries.length > 0 && (
                        <div className={styles.advanceHistory}>
                          <span className={styles.advanceHistoryLabel}>Deposits:</span>
                          {advanceLedgerEntries
                            .filter((e) => e.type === 'ADVANCE_RECEIVED')
                            .map((e) => (
                              <span key={e.id} className={styles.advanceHistoryChip}>
                                ₹{parseFloat(e.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                {' on '}
                                {toDateInputValue(e.createdAt)}
                                {e.paymentMethod ? ` · ${e.paymentMethod}` : ''}
                              </span>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.advField}>
                  <label>Tax CGST/SGST %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={invoiceData.taxes.cgstRate}
                    onChange={(e) =>
                      setInvoiceData((prev) => ({
                        ...prev,
                        taxes: {
                          ...prev.taxes,
                          cgstRate: parseFloat(e.target.value) || 0,
                          sgstRate: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    disabled={invoiceData.taxes.taxType === "NONE"}
                  />
                </div>
                <div className={styles.advField}>
                  <label>Auto-Udhar creation</label>
                  <input
                    type="checkbox"
                    checked={autoCreateUdhar}
                    onChange={(e) => setAutoCreateUdhar(e.target.checked)}
                  />
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
                <span>
                  CGST {invoiceData.taxes.cgstRate}% + SGST{" "}
                  {invoiceData.taxes.sgstRate}%
                </span>
                {advanceApplied > 0 && (
                  <span style={{ color: "#10b981" }}>
                    Advance: −{fmt(advanceApplied)}
                  </span>
                )}
                {(calc.outstanding - advanceApplied) > 0 && (
                  <span style={{ color: "#f59e0b" }}>
                    Bal: {fmt(Math.max(0, calc.outstanding - advanceApplied))}
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
              {["classic", "modern", "jewellery"].map((t) => (
                <button
                  key={t}
                  className={theme === t ? styles.activeTab : ""}
                  onClick={() => setTheme(t)}
                >
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
