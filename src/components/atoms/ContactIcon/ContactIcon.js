import React from 'react';
import { FiPhone, FiMessageSquare, FiMail } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import './ContactIcon.css';

/**
 * ContactIcon - Shows preferred contact method with deep linking support
 */
const ContactIcon = ({
  method,
  size = 'md',
  clickable = false,
  phoneNumber,
  className = '',
  onClick,
  ...props
}) => {
  const iconMap = {
    CALL: FiPhone,
    WHATSAPP: FaWhatsapp,
    SMS: FiMessageSquare,
    EMAIL: FiMail,
    VISIT: FiPhone, // Placeholder
  };

  const IconComponent = iconMap[method] || FiPhone;

  const handleClick = (e) => {
    if (!clickable || !phoneNumber) return;
    
    if (onClick) {
      onClick(e);
      return;
    }

    // Deep linking
    if (method === 'CALL') {
      window.location.href = `tel:${phoneNumber}`;
    } else if (method === 'WHATSAPP') {
      window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
    } else if (method === 'SMS') {
      window.location.href = `sms:${phoneNumber}`;
    } else if (method === 'EMAIL') {
      window.location.href = `mailto:${phoneNumber}`;
    }
  };

  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const iconSize = sizeMap[size] || 20;
  const clickableClass = clickable ? 'contact-icon-clickable' : '';

  return (
    <span
      className={`contact-icon ${clickableClass} ${className}`}
      onClick={handleClick}
      title={`${method} ${phoneNumber || ''}`}
      {...props}
    >
      <IconComponent size={iconSize} />
    </span>
  );
};

export default ContactIcon;
