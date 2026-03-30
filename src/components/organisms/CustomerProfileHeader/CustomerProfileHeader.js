import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../atoms/Avatar/Avatar';
import StatusPill from '../../atoms/StatusPill/StatusPill';
import Icon from '../../atoms/Icon/Icon';
import './CustomerProfileHeader.css';

const CustomerProfileHeader = ({
  customer,
  onEdit,
  onNewCredit,
  onRecordPayment,
  onContact,
}) => {
  const navigate = useNavigate();

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    try {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '+91 $1 $2 $3');
  };

  const getStatusClass = (status) => {
    const statusMap = {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      CLOSED: 'closed',
      SUSPENDED: 'suspended',
    };
    return statusMap[status] || 'inactive';
  };

  const primaryContact = customer?.contactDetails?.[0];
  const primaryLocation = customer?.locations?.[0];
  const age = calculateAge(customer?.dateOfBirth);

  return (
    <div className="customer-profile-header">
      {/* Top Nav: Back & Edit */}
      <div className="customer-profile-nav">
        <button className="nav-icon-btn" onClick={() => navigate('/customers')}>
          <Icon name="arrowLeft" size={22} />
        </button>
        <button className="nav-icon-btn" onClick={onEdit}>
          <Icon name="edit" size={20} />
        </button>
      </div>

      {/* Brand Identity / Contact Info */}
      <div className="customer-profile-identity">
        <div className="customer-profile-avatar-wrap">
          <Avatar name={customer?.fullName || ''} size="xl" className="profile-avatar" />
          <div className="customer-profile-status-badge">
            <StatusPill 
              status={customer?.status || 'INACTIVE'} 
              variant={getStatusClass(customer?.status || 'INACTIVE')}
            />
          </div>
        </div>

        <h1 className="customer-profile-title">{customer?.fullName || 'Unknown'}</h1>
        
        <div className="customer-profile-meta">
          {customer?.customerCode && (
            <span className="meta-pill">{customer.customerCode}</span>
          )}
          {primaryContact?.primaryPhone && (
            <span className="meta-text">{formatPhone(primaryContact.primaryPhone)}</span>
          )}
        </div>

        <div className="customer-profile-meta secondary-meta">
          {customer?.gender && <span>{customer.gender}</span>}
          {customer?.gender && age !== null && <span className="meta-dot">·</span>}
          {age !== null && <span>{age} years</span>}
          {primaryLocation && (() => {
            const addressParts = [
              primaryLocation.village,
              primaryLocation.tehsil,
              primaryLocation.district,
            ].filter(Boolean);
            if (addressParts.length > 0) {
              return (
                <>
                  <span className="meta-dot">·</span>
                  <span>{addressParts.join(', ')}</span>
                </>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Quick Actions (Native App Feel) */}
      <div className="customer-profile-quick-actions">
        {primaryContact?.primaryPhone && (
          <button className="quick-action-btn" onClick={onContact}>
            <div className="quick-action-icon call">
              <Icon name="phone" size={22} color="white" />
            </div>
            <span>Call</span>
          </button>
        )}
        <button className="quick-action-btn" onClick={onRecordPayment}>
          <div className="quick-action-icon payment">
            <Icon name="credit" size={22} color="white" />
          </div>
          <span>Payment</span>
        </button>
        <button className="quick-action-btn" onClick={onNewCredit}>
          <div className="quick-action-icon add">
            <Icon name="add" size={22} color="white" />
          </div>
          <span>Credit</span>
        </button>
      </div>
    </div>
  );
};

export default CustomerProfileHeader;
