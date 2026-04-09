import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Accordion from '@radix-ui/react-accordion';
import InlineEditableField from './InlineEditableField';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import InspectorSkeleton from './InspectorSkeleton';
import CustomerCreateForm from './CustomerCreateForm';
import Toast from '../../atoms/Toast/Toast';
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
  createCustomer,
  // Contact Details
  addContactDetail,
  updateContactDetail,
  deleteContactDetail,
  // Locations
  addLocation,
  updateLocation,
  deleteLocation,
  // Social Contexts
  getSocialContexts,
  addSocialContext,
  updateSocialContext,
  deleteSocialContext,
  // Documents
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  // Accounts
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  // Meta Tracking
  getMetaTrackings,
  addMetaTracking,
  updateMetaTracking,
  deleteMetaTracking,
} from '../../../services/customersService';
import './CustomerInspectorPanel.css';

/**
 * CustomerInspectorPanel - Complete CRUD for all customer data
 */
const CustomerInspectorPanel = ({
  isOpen,
  onClose,
  customerId,
  mode: initialMode,
  onSuccess,
  initialData,
}) => {
  const navigate = useNavigate();
  const mode = initialMode || (customerId ? 'view' : 'create');
  
  // Data state
  const [customer, setCustomer] = useState(null);
  const [socialContexts, setSocialContexts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [metaTrackings, setMetaTrackings] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingField, setSavingField] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Sub-item editing state
  const [editingContact, setEditingContact] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingSocialContext, setEditingSocialContext] = useState(null);
  const [showSocialContextForm, setShowSocialContextForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingMetaTracking, setEditingMetaTracking] = useState(null);
  const [showMetaTrackingForm, setShowMetaTrackingForm] = useState(false);
  const [savingSubItem, setSavingSubItem] = useState(false);
  
  const contentRef = useRef(null);

  // Load customer data
  const loadCustomerData = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const [customerData, socialData, docsData, accountsData, metaData] = await Promise.all([
        getCustomerById(customerId),
        getSocialContexts(customerId).catch(() => []),
        getDocuments(customerId).catch(() => []),
        getAccounts(customerId).catch(() => []),
        getMetaTrackings(customerId).catch(() => []),
      ]);
      
      setCustomer(customerData);
      setSocialContexts(Array.isArray(socialData) ? socialData : []);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setMetaTrackings(Array.isArray(metaData) ? metaData : []);
    } catch (err) {
      setError(err.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen && customerId && mode !== 'create') {
      loadCustomerData();
    } else if (!isOpen) {
      // Reset all state when panel closes
      setCustomer(null);
      setSocialContexts([]);
      setDocuments([]);
      setAccounts([]);
      setMetaTrackings([]);
      setError('');
      setShowContactForm(false);
      setShowLocationForm(false);
      setShowSocialContextForm(false);
      setShowDocumentForm(false);
      setShowAccountForm(false);
      setShowMetaTrackingForm(false);
      setEditingContact(null);
      setEditingLocation(null);
      setEditingSocialContext(null);
      setEditingDocument(null);
      setEditingAccount(null);
      setEditingMetaTracking(null);
    }
  }, [isOpen, customerId, mode, loadCustomerData]);

  const handleScroll = useCallback((e) => {
    setHeaderShadow(e.currentTarget.scrollTop > 0);
  }, []);

  // Field save handler
  const handleFieldSave = useCallback(async (fieldKey, value) => {
    if (!customerId || !customer) return;
    
    setSavingField(fieldKey);
    try {
      const updateData = { [fieldKey]: value || undefined };
      await updateCustomer(customerId, updateData);
      setCustomer(prev => prev ? { ...prev, [fieldKey]: value } : null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update');
      await loadCustomerData();
    } finally {
      setSavingField(null);
    }
  }, [customerId, customer, onSuccess, loadCustomerData]);

  // ============================================
  // CONTACT HANDLERS
  // ============================================
  const handleAddContact = useCallback(async (contactData) => {
    setSavingSubItem(true);
    try {
      await addContactDetail(customerId, contactData);
      await loadCustomerData();
      setShowContactForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateContact = useCallback(async (contactData) => {
    if (!editingContact) return;
    setSavingSubItem(true);
    try {
      await updateContactDetail(customerId, editingContact.id, contactData);
      await loadCustomerData();
      setShowContactForm(false);
      setEditingContact(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update contact');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingContact, loadCustomerData, onSuccess]);

  const handleDeleteContact = useCallback(async (contactId) => {
    if (!window.confirm('Remove this contact?')) return;
    setSavingSubItem(true);
    try {
      await deleteContactDetail(customerId, contactId);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete contact');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // ============================================
  // LOCATION HANDLERS
  // ============================================
  const handleAddLocation = useCallback(async (locationData) => {
    setSavingSubItem(true);
    try {
      await addLocation(customerId, locationData);
      await loadCustomerData();
      setShowLocationForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add location');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateLocation = useCallback(async (locationData) => {
    if (!editingLocation) return;
    setSavingSubItem(true);
    try {
      await updateLocation(customerId, editingLocation.id, locationData);
      await loadCustomerData();
      setShowLocationForm(false);
      setEditingLocation(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update location');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingLocation, loadCustomerData, onSuccess]);

  const handleDeleteLocation = useCallback(async (locationId) => {
    if (!window.confirm('Remove this location?')) return;
    setSavingSubItem(true);
    try {
      await deleteLocation(customerId, locationId);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete location');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // ============================================
  // SOCIAL CONTEXT HANDLERS
  // ============================================
  const handleAddSocialContext = useCallback(async (data) => {
    setSavingSubItem(true);
    try {
      await addSocialContext(customerId, data);
      await loadCustomerData();
      setShowSocialContextForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add social context');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateSocialContext = useCallback(async (data) => {
    if (!editingSocialContext) return;
    setSavingSubItem(true);
    try {
      await updateSocialContext(customerId, editingSocialContext.id, data);
      await loadCustomerData();
      setShowSocialContextForm(false);
      setEditingSocialContext(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update social context');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingSocialContext, loadCustomerData, onSuccess]);

  const handleDeleteSocialContext = useCallback(async (id) => {
    if (!window.confirm('Remove this social context?')) return;
    setSavingSubItem(true);
    try {
      await deleteSocialContext(customerId, id);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete social context');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // ============================================
  // DOCUMENT HANDLERS
  // ============================================
  const handleAddDocument = useCallback(async (data) => {
    setSavingSubItem(true);
    try {
      await addDocument(customerId, data);
      await loadCustomerData();
      setShowDocumentForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add document');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateDocument = useCallback(async (data) => {
    if (!editingDocument) return;
    setSavingSubItem(true);
    try {
      await updateDocument(customerId, editingDocument.id, data);
      await loadCustomerData();
      setShowDocumentForm(false);
      setEditingDocument(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update document');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingDocument, loadCustomerData, onSuccess]);

  const handleDeleteDocument = useCallback(async (id) => {
    if (!window.confirm('Remove this document?')) return;
    setSavingSubItem(true);
    try {
      await deleteDocument(customerId, id);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // ============================================
  // ACCOUNT HANDLERS
  // ============================================
  const handleAddAccount = useCallback(async (data) => {
    setSavingSubItem(true);
    try {
      await addAccount(customerId, data);
      await loadCustomerData();
      setShowAccountForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add account');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateAccount = useCallback(async (data) => {
    if (!editingAccount) return;
    setSavingSubItem(true);
    try {
      await updateAccount(customerId, editingAccount.id, data);
      await loadCustomerData();
      setShowAccountForm(false);
      setEditingAccount(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update account');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingAccount, loadCustomerData, onSuccess]);

  const handleDeleteAccount = useCallback(async (id) => {
    if (!window.confirm('Remove this account?')) return;
    setSavingSubItem(true);
    try {
      await deleteAccount(customerId, id);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // ============================================
  // META TRACKING HANDLERS
  // ============================================
  const handleAddMetaTracking = useCallback(async (data) => {
    setSavingSubItem(true);
    try {
      await addMetaTracking(customerId, data);
      await loadCustomerData();
      setShowMetaTrackingForm(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to add meta tracking');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  const handleUpdateMetaTracking = useCallback(async (data) => {
    if (!editingMetaTracking) return;
    setSavingSubItem(true);
    try {
      await updateMetaTracking(customerId, editingMetaTracking.id, data);
      await loadCustomerData();
      setShowMetaTrackingForm(false);
      setEditingMetaTracking(null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to update meta tracking');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, editingMetaTracking, loadCustomerData, onSuccess]);

  const handleDeleteMetaTracking = useCallback(async (id) => {
    if (!window.confirm('Remove this meta tracking?')) return;
    setSavingSubItem(true);
    try {
      await deleteMetaTracking(customerId, id);
      await loadCustomerData();
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to delete meta tracking');
    } finally {
      setSavingSubItem(false);
    }
  }, [customerId, loadCustomerData, onSuccess]);

  // Create customer handler
  const handleCreate = useCallback(async (customerData) => {
    setIsCreating(true);
    setError('');
    try {
      const newCustomer = await createCustomer(customerData);
      onSuccess?.(newCustomer);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setIsCreating(false);
    }
  }, [onSuccess, onClose]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!customerId) return;
    setIsDeleting(true);
    try {
      await softDeleteCustomer(customerId);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [customerId, onSuccess, onClose]);

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    if (phone.length === 10) return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    return phone;
  };

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text, successMessage = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: successMessage, type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to copy', type: 'error' });
    }
  }, []);

  // Generate WhatsApp link
  const getWhatsAppLink = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `https://wa.me/91${cleanPhone}`;
    }
    return `https://wa.me/${cleanPhone}`;
  };

  // Build activity timeline from customer data
  const buildActivityTimeline = useCallback(() => {
    if (!customer) return [];
    const activities = [];

    // Created activity
    if (customer.createdAt) {
      activities.push({
        type: 'created',
        timestamp: customer.createdAt,
        user: customer.createdBy,
        description: 'Customer created',
      });
    }

    // Updated activity
    if (customer.updatedAt && customer.updatedAt !== customer.createdAt) {
      activities.push({
        type: 'updated',
        timestamp: customer.updatedAt,
        user: customer.updatedBy,
        description: 'Customer updated',
      });
    }

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [customer]);

  const getGenderLabel = (gender) => {
    const labels = { 'MALE': 'Male', 'FEMALE': 'Female', 'OTHER': 'Other', 'PREFER_NOT_TO_SAY': 'Prefer not to say' };
    return gender ? labels[gender] || gender : '';
  };

  const getStatusLabel = (status) => {
    const labels = { 'ACTIVE': 'Active', 'INACTIVE': 'Inactive', 'SUSPENDED': 'Suspended', 'CLOSED': 'Closed', 'DORMANT': 'Dormant' };
    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = { 'ACTIVE': 'status-active', 'INACTIVE': 'status-inactive', 'SUSPENDED': 'status-suspended', 'CLOSED': 'status-closed' };
    return classes[status] || 'status-inactive';
  };

  // Options for selects
  const genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'CLOSED', label: 'Closed' },
  ];

  const contactMethodOptions = [
    { value: 'CALL', label: 'Call' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'SMS', label: 'SMS' },
    { value: 'VISIT', label: 'Visit' },
    { value: 'EMAIL', label: 'Email' },
  ];

  const phoneOwnerOptions = [
    { value: 'SELF', label: 'Self' },
    { value: 'FAMILY', label: 'Family' },
    { value: 'NEIGHBOR', label: 'Neighbor' },
    { value: 'OTHER', label: 'Other' },
  ];

  const incomeRangeOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'VERY_HIGH', label: 'Very High' },
  ];

  const accountStatusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'DORMANT', label: 'Dormant' },
  ];

  const sourceOptions = [
    { value: 'WALK_IN', label: 'Walk-in' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'AGENT', label: 'Agent' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'OTHER', label: 'Other' },
  ];

  const primaryContact = customer?.contactDetails?.[0];
  const primaryLocation = customer?.locations?.[0];
  const age = calculateAge(customer?.dateOfBirth);

  const renderContent = () => {
    // CREATE MODE
    if (mode === 'create') {
      return (
        <>
          <div className="inspector-header">
            <div className="header-top-row">
              <div className="header-identity">
                <Dialog.Title className="customer-name">New customer</Dialog.Title>
                <p className="header-subtitle">Add a new customer to your records</p>
              </div>
            </div>
          </div>
          <CustomerCreateForm
            onSave={handleCreate}
            onCancel={onClose}
            isSaving={isCreating}
            error={error}
            initialFullName={initialData?.fullName}
          />
        </>
      );
    }

    // VIEW MODE - Loading
    if (loading) {
      return <InspectorSkeleton mode="view" />;
    }

    // VIEW MODE - Error
    if (error && !customer) {
      return <ErrorState error={error} onClose={onClose} />;
    }

    // VIEW MODE - Customer loaded
    if (customer) {
      return (
        <>
          {/* HEADER */}
          <div className={`inspector-header ${headerShadow ? 'header-shadow' : ''}`}>
            <div className="header-top-row">
              <div className="header-identity">
                <Dialog.Title className="customer-name">{customer.fullName}</Dialog.Title>
                <div className="customer-code-row">
                  <p className="customer-code">{customer.customerCode}</p>
                  <button
                    className="copy-code-btn"
                    onClick={() => copyToClipboard(customer.customerCode, 'Customer code copied')}
                    aria-label="Copy customer code"
                    title="Copy customer code"
                  >
                    <CopyIcon />
                  </button>
                </div>
              </div>
              
              <span className={`status-pill ${getStatusClass(customer.status)}`}>
                {getStatusLabel(customer.status)}
              </span>
              
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="action-button" aria-label="Customer actions"><MoreIcon /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="dropdown-content" align="end" sideOffset={4}>
                    <DropdownMenu.Item 
                      className="dropdown-item" 
                      onSelect={() => {
                        if (customerId) {
                          navigate(`/customers/${customerId}`);
                          onClose();
                        }
                      }}
                    >
                      View Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="dropdown-item" onSelect={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
                      Edit customer
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="dropdown-separator" />
                    <DropdownMenu.Item className="dropdown-item dropdown-item-danger" onSelect={() => setShowDeleteDialog(true)}>
                      Delete customer
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            
            <div className="header-meta">
              {primaryContact?.primaryPhone && (
                <><span>{formatPhone(primaryContact.primaryPhone)}</span><span className="meta-dot">·</span></>
              )}
              {customer.gender && (
                <><span>{getGenderLabel(customer.gender)}</span><span className="meta-dot">·</span></>
              )}
              {age !== null && (
                <><span>{age} years</span><span className="meta-dot">·</span></>
              )}
              {primaryLocation && (() => {
                const addressParts = [
                  primaryLocation.village,
                  primaryLocation.tehsil,
                  primaryLocation.district,
                ].filter(Boolean);
                return addressParts.length > 0 && <span>{addressParts.join(', ')}</span>;
              })()}
            </div>
            {customerId && (
              <div className="header-actions">
                <button
                  className="view-profile-btn"
                  onClick={() => {
                    navigate(`/customers/${customerId}`);
                    onClose();
                  }}
                >
                  View Full Profile
                </button>
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div ref={contentRef} className="inspector-content" onScroll={handleScroll}>
            {error && <div className="error-banner">{error}</div>}

            {/* ============================================ */}
            {/* PERSONAL SECTION                            */}
            {/* ============================================ */}
            <section className="property-section">
              <h3 className="section-title">Personal</h3>
              <div className="property-list">
                <InlineEditableField label="Full name" value={customer.fullName} fieldKey="fullName" onSave={handleFieldSave} isSaving={savingField === 'fullName'} />
                <InlineEditableField label="Father name" value={customer.fatherName} fieldKey="fatherName" onSave={handleFieldSave} isSaving={savingField === 'fatherName'} placeholder="Add father name..." />
                <InlineEditableField label="Mother name" value={customer.motherName} fieldKey="motherName" onSave={handleFieldSave} isSaving={savingField === 'motherName'} placeholder="Add mother name..." />
                <InlineEditableField label="Spouse name" value={customer.spouseName} fieldKey="spouseName" onSave={handleFieldSave} isSaving={savingField === 'spouseName'} placeholder="Add spouse name..." />
                <InlineEditableField label="Gender" value={customer.gender} fieldKey="gender" type="select" options={genderOptions} onSave={handleFieldSave} isSaving={savingField === 'gender'} formatValue={getGenderLabel} placeholder="Select gender..." />
                <InlineEditableField 
                  label="Date of birth" 
                  value={customer.dateOfBirth} 
                  fieldKey="dateOfBirth" 
                  type="date" 
                  onSave={handleFieldSave} 
                  isSaving={savingField === 'dateOfBirth'} 
                  formatValue={(val) => {
                    if (!val) return '';
                    const formatted = formatDate(val.toString());
                    const ageVal = calculateAge(val.toString());
                    return ageVal !== null ? `${formatted} (${ageVal}y)` : formatted;
                  }}
                  placeholder="Add date of birth..."
                />
                <InlineEditableField 
                  label="DOB estimated" 
                  value={customer.isDobEstimated ? 'Yes' : 'No'} 
                  fieldKey="isDobEstimated" 
                  type="select"
                  options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                  onSave={(key, val) => handleFieldSave(key, val === 'true')} 
                  isSaving={savingField === 'isDobEstimated'} 
                />
              </div>
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* CONTACT SECTION                             */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Contacts</h3>
                <button className="add-button" onClick={() => { setEditingContact(null); setShowContactForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showContactForm ? (
                <ContactForm
                  contact={editingContact}
                  onSave={editingContact ? handleUpdateContact : handleAddContact}
                  onCancel={() => { setShowContactForm(false); setEditingContact(null); }}
                  isSaving={savingSubItem}
                  contactMethodOptions={contactMethodOptions}
                  phoneOwnerOptions={phoneOwnerOptions}
                />
              ) : customer.contactDetails && customer.contactDetails.length > 0 ? (
                <div className="sub-items-list">
                  {customer.contactDetails.map((contact) => (
                    <div key={contact.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">{formatPhone(contact.primaryPhone)}</span>
                        <div className="sub-item-actions">
                          <button
                            className="sub-item-btn icon-btn"
                            onClick={() => window.open(getWhatsAppLink(contact.primaryPhone), '_blank')}
                            title="Open WhatsApp"
                            aria-label="Open WhatsApp"
                          >
                            <WhatsAppIcon />
                          </button>
                          <button
                            className="sub-item-btn icon-btn"
                            onClick={() => copyToClipboard(contact.primaryPhone, 'Phone number copied')}
                            title="Copy phone number"
                            aria-label="Copy phone number"
                          >
                            <CopyIcon />
                          </button>
                          <button className="sub-item-btn" onClick={() => { setEditingContact(contact); setShowContactForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteContact(contact.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        {contact.secondaryPhone && (
                          <div className="sub-item-row"><span className="sub-item-label">Secondary</span><span className="sub-item-value">{formatPhone(contact.secondaryPhone)}</span></div>
                        )}
                        {contact.phoneOwnerType && (
                          <div className="sub-item-row"><span className="sub-item-label">Owner</span><span className="sub-item-badge">{contact.phoneOwnerType.toLowerCase()}</span></div>
                        )}
                        {contact.preferredContactMethod && (
                          <div className="sub-item-row"><span className="sub-item-label">Preferred</span><span className="sub-item-badge">{contact.preferredContactMethod.toLowerCase()}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No contact details added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* LOCATION SECTION                            */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Locations</h3>
                <button className="add-button" onClick={() => { setEditingLocation(null); setShowLocationForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showLocationForm ? (
                <LocationForm
                  location={editingLocation}
                  onSave={editingLocation ? handleUpdateLocation : handleAddLocation}
                  onCancel={() => { setShowLocationForm(false); setEditingLocation(null); }}
                  isSaving={savingSubItem}
                />
              ) : customer.locations && customer.locations.length > 0 ? (
                <div className="sub-items-list">
                  {customer.locations.map((location) => (
                    <div key={location.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">
                          {(() => {
                            const addressParts = [
                              location.village,
                              location.tehsil,
                              location.district,
                            ].filter(Boolean);
                            return addressParts.length > 0 ? addressParts.join(', ') : 'Location';
                          })()}
                        </span>
                        <div className="sub-item-actions">
                          <button className="sub-item-btn" onClick={() => { setEditingLocation(location); setShowLocationForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteLocation(location.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        {(() => {
                          // Build address from available fields
                          const addressParts = [
                            location.village,
                            location.tehsil,
                            location.district,
                            location.state,
                            location.pincode ? `PIN: ${location.pincode}` : null,
                          ].filter(Boolean);
                          const address = addressParts.length > 0 ? addressParts.join(', ') : null;
                          
                          return address ? (
                            <div className="sub-item-row">
                              <span className="sub-item-label">Address</span>
                              <span className="sub-item-value">{address}</span>
                            </div>
                          ) : null;
                        })()}
                        {location.landmark && (
                          <div className="sub-item-row">
                            <span className="sub-item-label">Landmark</span>
                            <span className="sub-item-value">{location.landmark}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No location added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* SOCIAL CONTEXT SECTION                      */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Social Context</h3>
                <button className="add-button" onClick={() => { setEditingSocialContext(null); setShowSocialContextForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showSocialContextForm ? (
                <SocialContextForm
                  socialContext={editingSocialContext}
                  onSave={editingSocialContext ? handleUpdateSocialContext : handleAddSocialContext}
                  onCancel={() => { setShowSocialContextForm(false); setEditingSocialContext(null); }}
                  isSaving={savingSubItem}
                  incomeRangeOptions={incomeRangeOptions}
                />
              ) : socialContexts.length > 0 ? (
                <div className="sub-items-list">
                  {socialContexts.map((sc) => (
                    <div key={sc.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">{sc.occupation || sc.caste || 'Social Context'}</span>
                        <div className="sub-item-actions">
                          <button className="sub-item-btn" onClick={() => { setEditingSocialContext(sc); setShowSocialContextForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteSocialContext(sc.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        {sc.caste && <div className="sub-item-row"><span className="sub-item-label">Caste</span><span className="sub-item-value">{sc.caste}</span></div>}
                        {sc.educationLevel && <div className="sub-item-row"><span className="sub-item-label">Education</span><span className="sub-item-value">{sc.educationLevel}</span></div>}
                        {sc.occupation && <div className="sub-item-row"><span className="sub-item-label">Occupation</span><span className="sub-item-value">{sc.occupation}</span></div>}
                        {sc.incomeRange && <div className="sub-item-row"><span className="sub-item-label">Income</span><span className="sub-item-badge">{sc.incomeRange.toLowerCase()}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No social context added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* DOCUMENTS SECTION                           */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Documents (KYC)</h3>
                <button className="add-button" onClick={() => { setEditingDocument(null); setShowDocumentForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showDocumentForm ? (
                <DocumentForm
                  document={editingDocument}
                  onSave={editingDocument ? handleUpdateDocument : handleAddDocument}
                  onCancel={() => { setShowDocumentForm(false); setEditingDocument(null); }}
                  isSaving={savingSubItem}
                />
              ) : documents.length > 0 ? (
                <div className="sub-items-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">Aadhaar •••• {doc.aadharLast4 || '----'}</span>
                        <div className="sub-item-actions">
                          <button className="sub-item-btn" onClick={() => { setEditingDocument(doc); setShowDocumentForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteDocument(doc.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        <div className="sub-item-row">
                          <span className="sub-item-label">Verification</span>
                          <span className={`verification-badge ${doc.aadharVerified ? 'verified' : 'pending'}`}>
                            {doc.aadharVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No documents added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* ACCOUNTS SECTION                            */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Accounts</h3>
                <button className="add-button" onClick={() => { setEditingAccount(null); setShowAccountForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showAccountForm ? (
                <AccountForm
                  account={editingAccount}
                  onSave={editingAccount ? handleUpdateAccount : handleAddAccount}
                  onCancel={() => { setShowAccountForm(false); setEditingAccount(null); }}
                  isSaving={savingSubItem}
                  statusOptions={accountStatusOptions}
                />
              ) : accounts.length > 0 ? (
                <div className="sub-items-list">
                  {accounts.map((account) => (
                    <div key={account.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">{formatCurrency(account.openingBalance)}</span>
                        <div className="sub-item-actions">
                          <button className="sub-item-btn" onClick={() => { setEditingAccount(account); setShowAccountForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteAccount(account.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        {account.status && <div className="sub-item-row"><span className="sub-item-label">Status</span><span className="sub-item-badge">{account.status.toLowerCase()}</span></div>}
                        {account.openedAt && <div className="sub-item-row"><span className="sub-item-label">Opened</span><span className="sub-item-value">{formatDate(account.openedAt)}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No accounts added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* META TRACKING SECTION                       */}
            {/* ============================================ */}
            <section className="property-section">
              <div className="section-header">
                <h3 className="section-title">Meta / Notes</h3>
                <button className="add-button" onClick={() => { setEditingMetaTracking(null); setShowMetaTrackingForm(true); }}>
                  <PlusIcon /> Add
                </button>
              </div>
              
              {showMetaTrackingForm ? (
                <MetaTrackingForm
                  metaTracking={editingMetaTracking}
                  onSave={editingMetaTracking ? handleUpdateMetaTracking : handleAddMetaTracking}
                  onCancel={() => { setShowMetaTrackingForm(false); setEditingMetaTracking(null); }}
                  isSaving={savingSubItem}
                  sourceOptions={sourceOptions}
                />
              ) : metaTrackings.length > 0 ? (
                <div className="sub-items-list">
                  {metaTrackings.map((mt) => (
                    <div key={mt.id} className="sub-item">
                      <div className="sub-item-header">
                        <span className="sub-item-title">{mt.source || 'Note'}</span>
                        <div className="sub-item-actions">
                          <button className="sub-item-btn" onClick={() => { setEditingMetaTracking(mt); setShowMetaTrackingForm(true); }}>Edit</button>
                          <button className="sub-item-btn danger" onClick={() => handleDeleteMetaTracking(mt.id)}>Remove</button>
                        </div>
                      </div>
                      <div className="sub-item-details">
                        {mt.notes && <div className="sub-item-row"><span className="sub-item-label">Notes</span><span className="sub-item-value">{mt.notes}</span></div>}
                        {mt.registeredOn && <div className="sub-item-row"><span className="sub-item-label">Registered</span><span className="sub-item-value">{formatDate(mt.registeredOn)}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No notes added</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* CUSTOMER STATUS                             */}
            {/* ============================================ */}
            <section className="property-section">
              <h3 className="section-title">Status</h3>
              <div className="property-list">
                <InlineEditableField label="Status" value={customer.status} fieldKey="status" type="select" options={statusOptions} onSave={handleFieldSave} isSaving={savingField === 'status'} formatValue={getStatusLabel} />
              </div>
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* ACTIVITY TIMELINE                           */}
            {/* ============================================ */}
            <section className="property-section">
              <h3 className="section-title">Activity</h3>
              {buildActivityTimeline().length > 0 ? (
                <div className="activity-timeline">
                  {buildActivityTimeline().map((activity, idx) => (
                    <div key={idx} className="activity-item">
                      <div className="activity-icon">
                        {activity.type === 'created' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        )}
                      </div>
                      <div className="activity-content">
                        <div className="activity-description">{activity.description}</div>
                        <div className="activity-meta">
                          {activity.user && (
                            <span className="activity-user">{activity.user.email || activity.user.fullName}</span>
                          )}
                          <span className="activity-time">{formatDate(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-text">No activity recorded</p>
              )}
            </section>

            <div className="section-divider" />

            {/* ============================================ */}
            {/* INTERNAL INFO                               */}
            {/* ============================================ */}
            <Accordion.Root type="multiple" className="accordion-root">
              <Accordion.Item value="internal" className="accordion-item">
                <Accordion.Header>
                  <Accordion.Trigger className="accordion-trigger">
                    <span className="section-title">Internal</span>
                    <ChevronIcon className="accordion-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="accordion-content">
                  <div className="property-list">
                    {customer.createdBy && <div className="property-row"><span className="property-label">Created by</span><span className="property-value">{customer.createdBy.email}</span></div>}
                    <div className="property-row"><span className="property-label">Created</span><span className="property-value muted">{formatDate(customer.createdAt)}</span></div>
                    <div className="property-row"><span className="property-label">Updated</span><span className="property-value muted">{formatDate(customer.updatedAt)}</span></div>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>

            <div style={{ height: '32px' }} />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="inspector-overlay" />
          <Dialog.Content className="inspector-panel">{renderContent()}</Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        customerName={customer?.fullName ?? ''}
        isDeleting={isDeleting}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

// ============================================
// INLINE FORMS
// ============================================

const ContactForm = ({ contact, onSave, onCancel, isSaving, contactMethodOptions, phoneOwnerOptions }) => {
  const [formData, setFormData] = useState({
    primaryPhone: contact?.primaryPhone || '',
    secondaryPhone: contact?.secondaryPhone || '',
    phoneOwnerType: contact?.phoneOwnerType || 'SELF',
    preferredContactMethod: contact?.preferredContactMethod || 'CALL',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.primaryPhone.trim()) return;
    onSave(formData);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field">
        <label>Primary Phone *</label>
        <input type="tel" value={formData.primaryPhone} onChange={(e) => setFormData(p => ({ ...p, primaryPhone: e.target.value }))} placeholder="10-digit number" maxLength={10} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Secondary Phone</label>
        <input type="tel" value={formData.secondaryPhone} onChange={(e) => setFormData(p => ({ ...p, secondaryPhone: e.target.value }))} placeholder="10-digit number" maxLength={10} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Phone Owner</label>
        <select value={formData.phoneOwnerType} onChange={(e) => setFormData(p => ({ ...p, phoneOwnerType: e.target.value }))} disabled={isSaving}>
          {phoneOwnerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="inline-form-field">
        <label>Preferred Method</label>
        <select value={formData.preferredContactMethod} onChange={(e) => setFormData(p => ({ ...p, preferredContactMethod: e.target.value }))} disabled={isSaving}>
          {contactMethodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving || !formData.primaryPhone.trim()} className="inline-form-btn save">{isSaving ? 'Saving...' : (contact ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

const LocationForm = ({ location, onSave, onCancel, isSaving }) => {
  // Build address string from existing location data
  const getInitialAddress = () => {
    if (location) {
      const parts = [
        location.village,
        location.tehsil,
        location.district,
      ].filter(Boolean);
      return parts.join(', ');
    }
    return '';
  };

  const [formData, setFormData] = useState({
    address: getInitialAddress(),
    state: location?.state || 'Madhya Pradesh',
    pincode: location?.pincode || '',
    landmark: location?.landmark || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.address.trim()) return;
    
    // Parse address into village, tehsil, district
    // Simple parsing: split by comma and assign
    const addressParts = formData.address.split(',').map(p => p.trim()).filter(Boolean);
    
    const locationData = {
      village: addressParts[0] || '',
      tehsil: addressParts[1] || '',
      district: addressParts[2] || '',
      state: formData.state || 'Madhya Pradesh',
      pincode: formData.pincode || '',
      landmark: formData.landmark || '',
    };
    
    onSave(locationData);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field">
        <label>Address *</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
          placeholder="Village, Tehsil, District"
          disabled={isSaving}
          rows={3}
          style={{ resize: 'vertical', minHeight: '60px' }}
        />
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Enter: Village, Tehsil, District (comma separated)
        </div>
      </div>
      <div className="inline-form-field">
        <label>State</label>
        <input type="text" value={formData.state} onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))} placeholder="Enter state" disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Pincode</label>
        <input type="text" value={formData.pincode} onChange={(e) => setFormData(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="6-digit pincode" maxLength={6} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Landmark</label>
        <input type="text" value={formData.landmark} onChange={(e) => setFormData(p => ({ ...p, landmark: e.target.value }))} placeholder="Near..." disabled={isSaving} />
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving || !formData.address.trim()} className="inline-form-btn save">{isSaving ? 'Saving...' : (location ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

const SocialContextForm = ({ socialContext, onSave, onCancel, isSaving, incomeRangeOptions }) => {
  const [formData, setFormData] = useState({
    caste: socialContext?.caste || '',
    educationLevel: socialContext?.educationLevel || '',
    occupation: socialContext?.occupation || '',
    incomeRange: socialContext?.incomeRange || 'MEDIUM',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field"><label>Caste</label><input type="text" value={formData.caste} onChange={(e) => setFormData(p => ({ ...p, caste: e.target.value }))} placeholder="Enter caste" disabled={isSaving} /></div>
      <div className="inline-form-field"><label>Education Level</label><input type="text" value={formData.educationLevel} onChange={(e) => setFormData(p => ({ ...p, educationLevel: e.target.value }))} placeholder="e.g. Graduate" disabled={isSaving} /></div>
      <div className="inline-form-field"><label>Occupation</label><input type="text" value={formData.occupation} onChange={(e) => setFormData(p => ({ ...p, occupation: e.target.value }))} placeholder="e.g. Farmer" disabled={isSaving} /></div>
      <div className="inline-form-field">
        <label>Income Range</label>
        <select value={formData.incomeRange} onChange={(e) => setFormData(p => ({ ...p, incomeRange: e.target.value }))} disabled={isSaving}>
          {incomeRangeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving} className="inline-form-btn save">{isSaving ? 'Saving...' : (socialContext ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

const DocumentForm = ({ document, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    aadharLast4: document?.aadharLast4 || '',
    aadharVerified: document?.aadharVerified || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.aadharLast4.trim()) return;
    onSave(formData);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field">
        <label>Aadhaar Last 4 Digits *</label>
        <input type="text" value={formData.aadharLast4} onChange={(e) => setFormData(p => ({ ...p, aadharLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" maxLength={4} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Verified</label>
        <select value={formData.aadharVerified ? 'true' : 'false'} onChange={(e) => setFormData(p => ({ ...p, aadharVerified: e.target.value === 'true' }))} disabled={isSaving}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving || !formData.aadharLast4.trim()} className="inline-form-btn save">{isSaving ? 'Saving...' : (document ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

const AccountForm = ({ account, onSave, onCancel, isSaving, statusOptions }) => {
  const [formData, setFormData] = useState({
    openingBalance: account?.openingBalance || '',
    openedAt: account?.openedAt ? new Date(account.openedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: account?.status || 'ACTIVE',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      openingBalance: parseFloat(formData.openingBalance) || 0,
      openedAt: new Date(formData.openedAt).toISOString(),
    };
    onSave(data);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field">
        <label>Opening Balance</label>
        <input type="number" value={formData.openingBalance} onChange={(e) => setFormData(p => ({ ...p, openingBalance: e.target.value }))} placeholder="0.00" step="0.01" disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Opened Date</label>
        <input type="date" value={formData.openedAt} onChange={(e) => setFormData(p => ({ ...p, openedAt: e.target.value }))} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Status</label>
        <select value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))} disabled={isSaving}>
          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving} className="inline-form-btn save">{isSaving ? 'Saving...' : (account ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

const MetaTrackingForm = ({ metaTracking, onSave, onCancel, isSaving, sourceOptions }) => {
  const [formData, setFormData] = useState({
    registeredOn: metaTracking?.registeredOn ? new Date(metaTracking.registeredOn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: metaTracking?.notes || '',
    source: metaTracking?.source || 'WALK_IN',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      registeredOn: new Date(formData.registeredOn).toISOString(),
    };
    onSave(data);
  };

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="inline-form-field">
        <label>Registration Date</label>
        <input type="date" value={formData.registeredOn} onChange={(e) => setFormData(p => ({ ...p, registeredOn: e.target.value }))} disabled={isSaving} />
      </div>
      <div className="inline-form-field">
        <label>Source</label>
        <select value={formData.source} onChange={(e) => setFormData(p => ({ ...p, source: e.target.value }))} disabled={isSaving}>
          {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="inline-form-field">
        <label>Notes</label>
        <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Add notes..." rows={3} disabled={isSaving} style={{ resize: 'vertical', minHeight: '60px' }} />
      </div>
      <div className="inline-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving} className="inline-form-btn cancel">Cancel</button>
        <button type="submit" disabled={isSaving} className="inline-form-btn save">{isSaving ? 'Saving...' : (metaTracking ? 'Update' : 'Add')}</button>
      </div>
    </form>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const ErrorState = ({ error, onClose }) => (
  <div className="error-state">
    <div className="error-icon">
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p className="error-message">{error}</p>
    <button onClick={onClose} className="error-close-btn">Close</button>
  </div>
);

// Icons
const MoreIcon = () => (
  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" />
  </svg>
);

const ChevronIcon = ({ className }) => (
  <svg className={className} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default CustomerInspectorPanel;
