import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import { CustomerTable } from '../../components/organisms/CustomerTable';
import { mockCustomers } from '../../components/organisms/CustomerTable/mockData';
import { getCustomers, searchCustomers, bulkCreateCustomers } from '../../services/customersService';
import Toast from '../../components/atoms/Toast/Toast';
import './CustomersPage.css';

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: [],
    gender: [],
    preferredContact: [],
    ageMin: null,
    ageMax: null,
    hasPhone: null,
    createdStart: null,
    createdEnd: null,
    address: '',
  });
  const searchDebounceTimerRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchCustomers = useCallback(async (page = 1, limit = 10, search = '', filterParams = {}) => {
      try {
        setLoading(true);
        
        // Build search parameters
        const searchParams = {
          page: page.toString(),
          limit: limit.toString(),
        };
        
        // Add search query if provided
        if (search && search.trim()) {
          searchParams.query = search.trim();
        }
        
        // Add filters
        if (filterParams.status && filterParams.status.length > 0) {
          searchParams.status = filterParams.status.join(',');
        }
        if (filterParams.gender && filterParams.gender.length > 0) {
          searchParams.gender = filterParams.gender.join(',');
        }
        // Address filter - searches across village, tehsil, district, state, pincode
        if (filterParams.address && filterParams.address.trim()) {
          searchParams.address = filterParams.address.trim();
        }
        if (filterParams.phone && filterParams.phone.trim()) {
          searchParams.phone = filterParams.phone.trim();
        }
        
        // Use search API if there's a search query or active filters, otherwise use regular getCustomers
        const hasActiveFilters = Object.keys(filterParams).some(key => {
          const value = filterParams[key];
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === 'string') return value.trim().length > 0;
          return value !== null && value !== undefined;
        });
        
        const response = (search && search.trim()) || hasActiveFilters
          ? await searchCustomers(searchParams)
          : await getCustomers(page, limit);
        
        // Handle different response formats
        let customerList = [];
        let paginationData = null;
        
        if (Array.isArray(response)) {
          // Simple array response
          customerList = response;
        } else if (response?.data && Array.isArray(response.data)) {
          // Response with data and pagination
          customerList = response.data;
          paginationData = response.pagination || response.meta || null;
        } else if (response?.customers && Array.isArray(response.customers)) {
          // Alternative response format
          customerList = response.customers;
          paginationData = response.pagination || response.meta || null;
        } else {
          customerList = [];
        }
        
        setCustomers(customerList);
        
        // Update pagination state
        if (paginationData) {
          setPagination({
            total: paginationData.total || customerList.length,
            totalPages: paginationData.totalPages || Math.ceil((paginationData.total || customerList.length) / limit),
            page: paginationData.page || page,
            limit: paginationData.limit || limit,
          });
        } else {
          // Fallback pagination if API doesn't return it
          setPagination({
            total: customerList.length,
            totalPages: Math.ceil(customerList.length / limit),
            page: page,
            limit: limit,
          });
        }
        
        const isSearchingOrFiltering = (search && search.trim()) || hasActiveFilters;
        
        // If no customers from API, use mock data ONLY if we are not actively filtering/searching
        // This prevents falling back to mock data when a filter correctly returns 0 results
        if (customerList.length === 0 && !isSearchingOrFiltering) {
          setUseMockData(true);
        } else {
          // If we had mock data before but now have an active filter, keep using mock data
          if (useMockData && isSearchingOrFiltering && customerList.length === 0) {
             setUseMockData(true);
          } else {
             setUseMockData(false);
          }
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          navigate('/login', { replace: true });
          return;
        }
      // Fall back to mock data on error
      setUseMockData(true);
      } finally {
        setLoading(false);
      }
  }, [navigate, useMockData]);

  // Debounced search handler
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    
    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    
    // Debounce search API call
    searchDebounceTimerRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      fetchCustomers(1, pageSize, query, filters);
    }, 500);
  }, [pageSize, filters, fetchCustomers]);

  // Handle filter changes with debouncing
  const handleFiltersChange = useCallback((newFiltersOrUpdater) => {
    // Handle both function and object updates
    const newFilters = typeof newFiltersOrUpdater === 'function' 
      ? newFiltersOrUpdater(filters)
      : newFiltersOrUpdater;
    
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
    
    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    
    // Debounce filter API call
    searchDebounceTimerRef.current = setTimeout(() => {
      fetchCustomers(1, pageSize, searchQuery, newFilters);
    }, 500);
  }, [pageSize, searchQuery, fetchCustomers, filters]);

  // Fetch customers when page, pageSize change (filters handled separately)
  useEffect(() => {
    // Clear any pending search debounce
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    fetchCustomers(currentPage, pageSize, searchQuery, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);


  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  const handleCustomerCreated = useCallback(async (newCustomer) => {
    // Refresh the customer list after creation
    await fetchCustomers(currentPage, pageSize, searchQuery, filters);
  }, [fetchCustomers, currentPage, pageSize, searchQuery, filters]);

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // CSV parsing function - converts CSV to API format
  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return []; // Need at least header + 1 data row

    // Parse header row
    const headerLine = lines[0];
    const headers = [];
    let currentHeader = '';
    let inQuotes = false;
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headers.push(currentHeader.trim().replace(/^"|"$/g, '').toLowerCase());
        currentHeader = '';
      } else {
        currentHeader += char;
      }
    }
    headers.push(currentHeader.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Parse data rows
    const customers = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = [];
      let currentValue = '';
      inQuotes = false;
      
      // Parse CSV row with proper quote handling
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim().replace(/^"|"$/g, '')); // Add last value
      
      // Build customer object matching API format
      const customer = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        if (!value) return;
        
        const headerLower = header.toLowerCase();
        
        // Map CSV columns to API format matching CreateCustomerDto
        if (headerLower === 'fullname' || headerLower === 'name' || headerLower === 'customer name') {
          customer.fullName = value;
        } else if (headerLower === 'primaryphone' || headerLower === 'phone' || headerLower === 'mobile') {
          if (!customer.contactDetails) {
            customer.contactDetails = {};
          }
          customer.contactDetails.primaryPhone = value.replace(/\D/g, ''); // Remove non-digits
        } else if (headerLower === 'secondaryphone' || headerLower === 'alternatephone') {
          if (!customer.contactDetails) {
            customer.contactDetails = {};
          }
          customer.contactDetails.secondaryPhone = value.replace(/\D/g, '');
        } else if (headerLower === 'phoneownertype' || headerLower === 'phone owner') {
          // Enum: SELF, FAMILY, NEIGHBOR, OTHER
          if (!customer.contactDetails) {
            customer.contactDetails = {};
          }
          const phoneOwnerUpper = value.toUpperCase();
          if (['SELF', 'FAMILY', 'NEIGHBOR', 'OTHER'].includes(phoneOwnerUpper)) {
            customer.contactDetails.phoneOwnerType = phoneOwnerUpper;
          }
        } else if (headerLower === 'preferredcontactmethod' || headerLower === 'contact method' || headerLower === 'preferred contact') {
          // Enum: CALL, WHATSAPP, SMS, VISIT, EMAIL
          if (!customer.contactDetails) {
            customer.contactDetails = {};
          }
          const contactMethodUpper = value.toUpperCase();
          if (['CALL', 'WHATSAPP', 'SMS', 'VISIT', 'EMAIL'].includes(contactMethodUpper)) {
            customer.contactDetails.preferredContactMethod = contactMethodUpper;
          }
        } else if (headerLower === 'gender') {
          // Enum: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
          const genderUpper = value.toUpperCase();
          if (['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(genderUpper)) {
            customer.gender = genderUpper;
          }
        } else if (headerLower === 'dateofbirth' || headerLower === 'dob' || headerLower === 'birthdate') {
          customer.dateOfBirth = value; // Should be ISO date string
        } else if (headerLower === 'isdobestimated' || headerLower === 'dob estimated') {
          customer.isDobEstimated = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value === '1';
        } else if (headerLower === 'fathername' || headerLower === 'father') {
          customer.fatherName = value;
        } else if (headerLower === 'mothername' || headerLower === 'mother') {
          customer.motherName = value;
        } else if (headerLower === 'spousename' || headerLower === 'spouse') {
          customer.spouseName = value;
        }
      });
      
      // Only add if has at least fullName (required field)
      if (customer.fullName) {
        // Only include contactDetails if it has at least primaryPhone
        if (customer.contactDetails && !customer.contactDetails.primaryPhone) {
          delete customer.contactDetails;
        }
        customers.push(customer);
      }
    }
    console.log(customers);
    console.log(customers.length);
    return customers;
  };

  // Handle CSV file upload
  const handleCSVUpload = useCallback(async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      setToast(null);

      // Read file
      const text = await file.text();
      
      // Parse CSV
      const customers = parseCSV(text);
      
      if (customers.length === 0) {
        setToast({ 
          type: 'error', 
          message: 'No valid customers found in CSV. Please check the format.' 
        });
        setUploading(false);
        return;
      }

      // Call bulk create API
      const response = await bulkCreateCustomers(customers);
      console.log(response);
      
      setToast({ 
        type: 'success', 
        message: `Successfully imported ${customers.length} customer(s)` 
      });

      // Refresh customer list
      await fetchCustomers(currentPage, pageSize, searchQuery, filters);
      
    } catch (err) {
      console.error('Error uploading CSV:', err);
      setToast({ 
        type: 'error', 
        message: err.message || 'Failed to upload customers. Please check the CSV format.' 
      });
    } finally {
      setUploading(false);
    }
  }, [fetchCustomers, currentPage, pageSize, searchQuery, filters]);

  const displayData = useMockData ? mockCustomers : customers;

  return (
    <DashboardTemplate headerTitle="Customers" headerTabs={[]}>
      <div className="customers-page-wrapper">
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
        <CustomerTable 
          data={displayData} 
          isLoading={loading || uploading}
          onCustomerCreated={handleCustomerCreated}
          onCSVUpload={handleCSVUpload}
          pagination={useMockData ? null : pagination}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          useClientSideFiltering={useMockData}
        />
      </div>
    </DashboardTemplate>
  );
};

export default CustomersPage;
