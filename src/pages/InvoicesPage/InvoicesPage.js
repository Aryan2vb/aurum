import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import Avatar from '../../components/atoms/Avatar/Avatar';
import Icon from '../../components/atoms/Icon/Icon';
import { getInvoices, getInvoiceHtmlUrl } from '../../services/invoicesService';
import styles from './InvoicesPage.module.css';

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await getInvoices();
      if (response && response.data) {
        setInvoices(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    return styles[status.toLowerCase()] || '';
  };

  return (
    <DashboardTemplate headerTitle="Invoices">
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2>Invoices Overview</h2>
          <button 
            className={styles.createBtn} 
            onClick={() => navigate('/invoices/new')}
          >
            <Icon name="add" size={16} /> Create Invoice
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Loading invoices...
          </div>
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
               <h3>Recent Invoices</h3>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                          <Icon name="fileText" size={24} />
                        </div>
                        <p>No invoices found. Create your first invoice!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => {
                    const customerName = inv.customer?.fullName || 'Unknown Customer';
                    const customerCode = inv.customer?.customerCode || 'GUEST';
                    
                    return (
                      <tr key={inv.id}>
                        <td>
                          <span style={{ fontWeight: '500', color: '#0f172a' }}>
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td>
                          <div className={styles.identityCell}>
                            <Avatar name={customerName} size="sm" />
                            <div className={styles.identityInfo}>
                              <strong>{customerName}</strong>
                              <span>Code: {customerCode}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569' }}>
                          {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className={styles.amountCell}>
                          ₹{inv.totalAmount?.toLocaleString('en-IN') || 0}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${getStatusClass(inv.status)}`}>
                            {inv.status || 'UNKNOWN'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={styles.viewBtn}
                            onClick={() => window.open(getInvoiceHtmlUrl(inv.id), '_blank')}
                          >
                            <Icon name="eye" size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardTemplate>
  );
};

export default InvoicesPage;
