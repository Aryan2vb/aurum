import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import CustomerUdharSnapshot from '../../components/organisms/CustomerUdharSnapshot/CustomerUdharSnapshot';
import Avatar from '../../components/atoms/Avatar/Avatar';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import Icon from '../../components/atoms/Icon/Icon';
import SearchBar from '../../components/molecules/SearchBar/SearchBar';
import Toast from '../../components/atoms/Toast/Toast';
import SlideOver from '../../components/atoms/SlideOver/SlideOver';
import CustomerCreateForm from '../../components/organisms/CustomerInspectorPanel/CustomerCreateForm';
import { searchCustomers, createCustomer } from '../../services/customersService';
import { getCustomerCreditSummary, createCredit } from '../../services/creditsService';
import './CreateCreditPage.css';

const CreateCreditPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createCustomerSaving, setCreateCustomerSaving] = useState(false);
  const [createCustomerError, setCreateCustomerError] = useState('');
  const searchDebounceTimerRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    totalAmount: '',
    initialPayment: '',
    saleReference: '',
    itemSummary: '',
    description: '',
    creditDate: new Date().toISOString().split('T')[0], // Default to today
    expectedDueDate: '',
    reminderFrequency: 'WEEKLY',
    notes: '',
  });

  // Check if customer is pre-selected from location state
  useEffect(() => {
    if (location.state?.customerId) {
      handleCustomerSelect(location.state.customerId, location.state.customer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Load customer summary when customer is selected
  useEffect(() => {
    if (selectedCustomer?.id) {
      loadCustomerSummary(selectedCustomer.id);
      setFormData((prev) => ({ ...prev, customerId: selectedCustomer.id }));
    }
  }, [selectedCustomer]);

  const loadCustomerSummary = async (customerId) => {
    try {
      const summary = await getCustomerCreditSummary(customerId);
      setCustomerSummary(summary);
    } catch (error) {
      console.error('Error loading customer summary:', error);
    }
  };

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
      console.error('Error searching customers:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Set searching state immediately for better UX
    setSearching(true);

    // Debounce search by 1 second
    searchDebounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 1000);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  const handleCustomerSelect = (customerId, customerData) => {
    const customer = customerData || searchResults.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const showCreateThatCustomer =
    !searching &&
    searchQuery.trim().length >= 2 &&
    searchResults.length === 0;

  const handleCreateCustomerSave = async (customerData) => {
    try {
      setCreateCustomerSaving(true);
      setCreateCustomerError('');
      const created = await createCustomer(customerData);
      const customer = created?.data || created;
      setSelectedCustomer(customer);
      setCreateCustomerOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setToast({ type: 'success', message: 'Customer created. You can now add the Udhar.' });
    } catch (err) {
      setCreateCustomerError(err.message || 'Failed to create customer');
    } finally {
      setCreateCustomerSaving(false);
    }
  };

  const handleCreateCustomerCancel = () => {
    setCreateCustomerOpen(false);
    setCreateCustomerError('');
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerId || !formData.totalAmount) {
      setToast({ type: 'error', message: 'Please select a customer and enter total amount' });
      return;
    }

    try {
      setLoading(true);
      const creditData = {
        customerId: formData.customerId,
        totalAmount: parseFloat(formData.totalAmount),
        ...(formData.initialPayment && { initialPayment: parseFloat(formData.initialPayment) }),
        ...(formData.saleReference && { saleReference: formData.saleReference }),
        ...(formData.itemSummary && { itemSummary: formData.itemSummary }),
        ...(formData.description && { description: formData.description }),
        ...(formData.creditDate && { creditDate: formData.creditDate }),
        ...(formData.expectedDueDate && { expectedDueDate: formData.expectedDueDate }),
        ...(formData.reminderFrequency && { reminderFrequency: formData.reminderFrequency }),
        ...(formData.notes && { notes: formData.notes }),
      };

      const createdCredit = await createCredit(creditData);
      setToast({ type: 'success', message: 'Credit created successfully' });
      
      setTimeout(() => {
        // Navigate to credits list with refresh flag, then to detail page
        navigate(`/credits`, { state: { refresh: true } });
        setTimeout(() => {
          navigate(`/credits/${createdCredit.id || createdCredit.data?.id}`);
        }, 100);
      }, 1000);
    } catch (error) {
      console.error('Error creating credit:', error);
      setToast({
        type: 'error',
        message: error.message || 'Failed to create credit',
      });
    } finally {
      setLoading(false);
    }
  };

  const customerName = selectedCustomer?.fullName || selectedCustomer?.name || '';
  const customerCode = selectedCustomer?.customerCode || '';
  const customerPhone = selectedCustomer?.contactDetails?.[0]?.primaryPhone || selectedCustomer?.phone || '';

  return (
    <DashboardTemplate headerTitle="Create New Udhar" headerTabs={[]}>
      <div className="create-credit-page">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Attio-style Header */}
        <div className="create-credit-header">
          <Button variant="ghost" size="small" onClick={() => navigate('/credits')}>
            <Icon name="arrowLeft" size={16} /> Back
          </Button>
          <h1 className="create-credit-title">Create New Udhar</h1>
        </div>

        <div className="create-credit-content">
          <div className="create-credit-left">
            {/* Customer Selection Section */}
            <div className="create-credit-section">
              <h2 className="create-credit-section-title">Customer</h2>
              {!selectedCustomer ? (
                <div className="create-credit-search">
                  <SearchBar
                    placeholder="Search customer by name, phone, or code..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  {searching && (
                    <div className="create-credit-search-loading">Searching...</div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="create-credit-search-results">
                      {searchResults.map((customer) => {
                        const name = customer.fullName || customer.name || 'Unknown';
                        const code = customer.customerCode || '';
                        const phone = customer.contactDetails?.[0]?.primaryPhone || customer.phone || 'No phone';
                        return (
                          <div
                            key={customer.id}
                            className="create-credit-search-result-item"
                            onClick={() => handleCustomerSelect(customer.id, customer)}
                          >
                            <Avatar name={name} size="md" />
                            <div className="create-credit-search-result-info">
                              <div className="create-credit-search-result-name">
                                {name}
                              </div>
                              <div className="create-credit-search-result-details">
                                {code && `${code} • `}{phone}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {showCreateThatCustomer && (
                    <button
                      type="button"
                      className="create-credit-search-create-row"
                      onClick={() => setCreateCustomerOpen(true)}
                    >
                      <span className="create-credit-search-create-icon">
                        <Icon name="add" size={18} />
                      </span>
                      <div className="create-credit-search-create-text">
                        <span className="create-credit-search-create-label">Create that customer</span>
                        <span className="create-credit-search-create-hint">
                          Add &quot;{searchQuery.trim()}&quot; as a new customer
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="create-credit-selected-customer">
                  <div className="create-credit-customer-identity">
                    <Avatar name={customerName} size="lg" />
                    <div className="create-credit-customer-info">
                      <h3 className="create-credit-customer-name">{customerName}</h3>
                      <div className="create-credit-customer-meta">
                        {customerCode && (
                          <>
                            <span className="create-credit-customer-code">{customerCode}</span>
                            {customerPhone && <span className="create-credit-customer-separator">·</span>}
                          </>
                        )}
                        {customerPhone && (
                          <span className="create-credit-customer-phone">{customerPhone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSummary(null);
                      setFormData((prev) => ({ ...prev, customerId: '' }));
                    }}
                  >
                    <Icon name="edit" size={14} /> Change Customer
                  </Button>
                </div>
              )}
            </div>

            {/* Credit Details Form */}
            {selectedCustomer && (
              <form className="create-credit-form" onSubmit={handleSubmit}>
                <div className="create-credit-section">
                  <h2 className="create-credit-section-title">Credit Details</h2>
                  <div className="create-credit-form-grid">
                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">
                        Total Amount <span className="required">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="50000"
                        value={formData.totalAmount}
                        onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                        required
                      />
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Initial Payment</label>
                      <Input
                        type="number"
                        placeholder="10000 (optional)"
                        value={formData.initialPayment}
                        onChange={(e) => handleInputChange('initialPayment', e.target.value)}
                      />
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Item Summary</label>
                      <Input
                        type="text"
                        placeholder="Gold Necklace 22K, 45g"
                        value={formData.itemSummary}
                        onChange={(e) => handleInputChange('itemSummary', e.target.value)}
                      />
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Sale Reference</label>
                      <Input
                        type="text"
                        placeholder="INV-2024-001"
                        value={formData.saleReference}
                        onChange={(e) => handleInputChange('saleReference', e.target.value)}
                      />
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Credit Date</label>
                      <Input
                        type="date"
                        value={formData.creditDate}
                        onChange={(e) => handleInputChange('creditDate', e.target.value)}
                      />
                      <span className="create-credit-form-hint">
                        When was this credit given? (defaults to today)
                      </span>
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Expected Due Date</label>
                      <Input
                        type="date"
                        value={formData.expectedDueDate}
                        onChange={(e) => handleInputChange('expectedDueDate', e.target.value)}
                      />
                    </div>

                    <div className="create-credit-form-field">
                      <label className="create-credit-form-label">Reminder Frequency</label>
                      <select
                        className="create-credit-form-select"
                        value={formData.reminderFrequency}
                        onChange={(e) => handleInputChange('reminderFrequency', e.target.value)}
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Biweekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>

                    <div className="create-credit-form-field create-credit-form-field-full">
                      <label className="create-credit-form-label">Description</label>
                      <textarea
                        className="create-credit-form-textarea"
                        placeholder="Additional notes about this credit..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="create-credit-form-field create-credit-form-field-full">
                      <label className="create-credit-form-label">Notes</label>
                      <textarea
                        className="create-credit-form-textarea"
                        placeholder="Internal notes..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="create-credit-form-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/credits')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Udhar'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Decision Support Sidebar */}
          {selectedCustomer && customerSummary && (
            <div className="create-credit-right">
              <div className="create-credit-decision-support">
                <h3 className="create-credit-decision-title">Decision Support</h3>
                <CustomerUdharSnapshot
                  customer={selectedCustomer}
                  summary={customerSummary}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <SlideOver
        isOpen={createCustomerOpen}
        onClose={handleCreateCustomerCancel}
        title="Create customer"
      >
        <CustomerCreateForm
          initialFullName={searchQuery.trim()}
          onSave={handleCreateCustomerSave}
          onCancel={handleCreateCustomerCancel}
          isSaving={createCustomerSaving}
          error={createCustomerError}
        />
      </SlideOver>
    </DashboardTemplate>
  );
};

export default CreateCreditPage;
