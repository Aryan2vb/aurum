import React from 'react';
import {
  FiSearch,
  FiBarChart2,
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiMessageSquare,
  FiMail,
  FiSettings,
  FiHelpCircle,
  FiMessageCircle,
  FiLink,
  FiShare2,
  FiBell,
  FiPlus,
  FiFilter,
  FiDownload,
  FiMaximize2,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiPieChart,
  FiLock,
  FiMenu,
  FiLogOut,
  FiZap,
  FiSun,
  FiMoon,
  FiX,
  FiEye,
  FiEyeOff,
  FiMove,
  FiChevronUp,
  FiChevronDown,
  FiMoreVertical,
  FiPhone,
  FiList,
  FiGrid,
  FiCheck,
  FiCheckCircle,
  FiFileText,
  FiEdit,
  FiCreditCard,
  FiCircle,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiSidebar,
  FiHome,
  FiDollarSign,
} from 'react-icons/fi';
import { MdExpandMore } from 'react-icons/md';
import { IoMdSettings } from 'react-icons/io';
import './Icon.css';

const Icon = ({ name, size = 20, color, className = '', ...props }) => {
  const iconMap = {
    search: FiSearch,
    dashboard: FiBarChart2,
    product: FiPackage,
    order: FiShoppingCart,
    customer: FiUsers,
    user: FiUsers,
    message: FiMessageSquare,
    email: FiMail,
    automation: IoMdSettings,
    analytics: FiTrendingUp,
    integration: FiLink,
    settings: FiSettings,
    help: FiHelpCircle,
    feedback: FiMessageCircle,
    rocket: FiZap,
    arrowLeft: FiChevronLeft,
    arrowRight: FiChevronRight,
    collapse: FiChevronLeft,
    expand: FiChevronRight,
    share: FiShare2,
    notification: FiBell,
    add: FiPlus,
    filter: FiFilter,
    export: FiDownload,
    fullscreen: FiMaximize2,
    expandMore: MdExpandMore,
    pieChart: FiPieChart,
    lock: FiLock,
    menu: FiMenu,
    logout: FiLogOut,
    sun: FiSun,
    moon: FiMoon,
    close: FiX,
    eye: FiEye,
    eyeOff: FiEyeOff,
    grip: FiMove,
    chevronUp: FiChevronUp,
    chevronDown: FiChevronDown,
    more: FiMoreVertical,
    phone: FiPhone,
    whatsapp: FiMessageSquare,
    credit: FiPackage,
    reminder: FiBell,
    list: FiList,
    grid: FiGrid,
    check: FiCheck,
    checkCircle: FiCheckCircle,
    file: FiFileText,
    edit: FiEdit,
    workspace: FiGrid,
    udhar: FiCreditCard,
    deals: FiCreditCard,
    status: FiCircle,
    gender: FiUser,
    age: FiMenu,
    date: FiCalendar,
    contact: FiMessageCircle,
    location: FiMapPin,
    sidebar: FiSidebar,
    invoice: FiFileText,
    payment: FiCreditCard,
    home: FiHome,
    dollar: FiDollarSign,
  };

  const IconComponent = iconMap[name] || FiBarChart2;

  // Use CSS variable for color if not explicitly provided
  const iconColor = color || 'var(--text-primary)';

  return (
    <IconComponent
      className={`icon icon-${name} ${className}`}
      size={size}
      color={iconColor}
      {...props}
    />
  );
};

export default Icon;

