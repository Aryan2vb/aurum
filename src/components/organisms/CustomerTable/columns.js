import React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import Checkbox from '../../atoms/Checkbox/Checkbox';

const columnHelper = createColumnHelper();

// ============================================
// COMPUTED FIELD HELPERS
// ============================================

// Calculate age from DOB
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Calculate days since created
export const daysSinceCreated = (createdAt) => {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Check if customer has phone
export const hasPhone = (contactDetails) => {
  return !!(contactDetails?.[0]?.primaryPhone);
};

// Calculate contact completeness score (0-100)
export const contactCompletenessScore = (customer) => {
  let score = 0;
  const weights = {
    fullName: 15,
    gender: 10,
    dateOfBirth: 15,
    primaryPhone: 20,
    secondaryPhone: 10,
    preferredContactMethod: 10,
    location: 20,
  };
  
  if (customer.fullName) score += weights.fullName;
  if (customer.gender) score += weights.gender;
  if (customer.dateOfBirth) score += weights.dateOfBirth;
  if (customer.contactDetails?.[0]?.primaryPhone) score += weights.primaryPhone;
  if (customer.contactDetails?.[0]?.secondaryPhone) score += weights.secondaryPhone;
  if (customer.contactDetails?.[0]?.preferredContactMethod) score += weights.preferredContactMethod;
  if (customer.locations?.length > 0) score += weights.location;
  
  return score;
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

// ============================================
// CELL COMPONENTS
// ============================================

// Avatar class based on first letter
const getAvatarClass = (name) => {
  if (!name) return 'avatar-default';
  const letter = name.charAt(0).toUpperCase();
  const classes = { G: 'avatar-g', M: 'avatar-m', D: 'avatar-d', A: 'avatar-a', U: 'avatar-u', P: 'avatar-p', L: 'avatar-l', I: 'avatar-i', R: 'avatar-r', S: 'avatar-s', K: 'avatar-k', B: 'avatar-b' };
  return classes[letter] || 'avatar-default';
};

// Status Pill
const StatusPill = ({ status }) => {
  const config = {
    ACTIVE: { bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' },
    INACTIVE: { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' },
    CLOSED: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    SUSPENDED: { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
  };
  const style = config[status] || config.INACTIVE;
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : '—';
  return <span className="customer-status-pill" style={{ backgroundColor: style.bg, color: style.color }}>{label}</span>;
};

// Gender display
const GenderCell = ({ gender }) => {
  if (!gender) return <span className="cell-empty">—</span>;
  const labels = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', PREFER_NOT_TO_SAY: 'Not specified' };
  return <span className="cell-text-muted">{labels[gender] || gender}</span>;
};

// Contact method badge
const ContactCell = ({ method }) => {
  if (!method) return <span className="cell-empty">—</span>;
  
  const icons = {
    CALL: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    WHATSAPP: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    SMS: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    VISIT: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    EMAIL: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  };
  
  const label = method.charAt(0) + method.slice(1).toLowerCase();
  return (
    <span className="contact-method-badge">
      <span className={`contact-method-icon ${method === 'WHATSAPP' ? 'whatsapp-icon' : ''}`}>
        {icons[method] || icons.CALL}
      </span>
      <span>{label}</span>
    </span>
  );
};

// Boolean pill (for Has Phone column)
const BooleanPill = ({ value, trueLabel = 'Yes', falseLabel = 'No' }) => {
  if (value === null || value === undefined) return <span className="cell-empty">—</span>;
  return (
    <span className={`boolean-pill ${value ? 'boolean-true' : 'boolean-false'}`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
};

// Score bar (for completeness)
const ScoreBar = ({ score }) => {
  const getColor = (s) => {
    if (s >= 80) return '#4ade80';
    if (s >= 50) return '#fbbf24';
    return '#ef4444';
  };
  return (
    <div className="score-cell">
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${score}%`, backgroundColor: getColor(score) }} />
      </div>
      <span className="score-value">{score}%</span>
    </div>
  );
};

// Days ago display
const DaysAgoCell = ({ days }) => {
  if (days === null) return <span className="cell-empty">—</span>;
  const label = days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  return <span className="cell-days-ago">{label}</span>;
};

// ============================================
// TANSTACK AGGREGATION FUNCTIONS
// ============================================

// Count aggregation
export const countAggregation = (columnId, leafRows) => leafRows.length;

// Mean/Average aggregation
export const meanAggregation = (columnId, leafRows, childRows) => {
  const values = leafRows.map(row => row.getValue(columnId)).filter(v => v !== null && v !== undefined);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

// Min aggregation
export const minAggregation = (columnId, leafRows) => {
  const values = leafRows.map(row => row.getValue(columnId)).filter(v => v !== null && v !== undefined);
  return values.length ? Math.min(...values) : null;
};

// Max aggregation
export const maxAggregation = (columnId, leafRows) => {
  const values = leafRows.map(row => row.getValue(columnId)).filter(v => v !== null && v !== undefined);
  return values.length ? Math.max(...values) : null;
};

// Count truthy values
export const countTruthyAggregation = (columnId, leafRows) => {
  return leafRows.filter(row => row.getValue(columnId)).length;
};

// Status count aggregation
export const statusCountAggregation = (columnId, leafRows) => {
  const counts = { ACTIVE: 0, INACTIVE: 0, CLOSED: 0, SUSPENDED: 0 };
  leafRows.forEach(row => {
    const status = row.getValue(columnId);
    if (counts[status] !== undefined) counts[status]++;
  });
  return counts;
};

// ============================================
// COLUMN DEFINITIONS
// ============================================

export const customerColumns = [
  // Checkbox
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox 
        checked={table.getIsAllRowsSelected()} 
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()} 
      />
    ),
    cell: ({ row }) => (
      <Checkbox 
        checked={row.getIsSelected()} 
        onChange={row.getToggleSelectedHandler()} 
      />
    ),
    size: 40,
    enableSorting: false,
  },

  // Full Name (Primary identifier)
  columnHelper.accessor('fullName', {
    id: 'fullName',
    header: 'Customer',
    cell: (info) => {
      const name = info.getValue() || '';
      const initial = name.charAt(0)?.toUpperCase() || '?';
      return (
        <div className="cell-name">
          <div className={`name-avatar ${getAvatarClass(name)}`}>{initial}</div>
          <span className="name-text">{name || '—'}</span>
        </div>
      );
    },
    size: 160,
    aggregationFn: countAggregation,
    meta: { type: 'user' },
  }),

  // Customer Code
  columnHelper.accessor('customerCode', {
    id: 'customerCode',
    header: 'Code',
    cell: (info) => <span className="cell-code">{info.getValue() || '—'}</span>,
    size: 110,
    meta: { type: 'text' },
  }),

  // Status
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    cell: (info) => <StatusPill status={info.getValue()} />,
    size: 100,
    aggregationFn: statusCountAggregation,
    meta: { type: 'status', filterType: 'enum', filterOptions: ['ACTIVE', 'INACTIVE', 'CLOSED', 'SUSPENDED'] },
  }),

  // Primary Phone
  columnHelper.accessor(
    (row) => row.contactDetails?.[0]?.primaryPhone ?? null,
    {
      id: 'primaryPhone',
      header: 'Phone',
      cell: (info) => {
        const phone = info.getValue();
        return phone ? <span className="cell-phone">{phone}</span> : <span className="cell-empty">—</span>;
      },
      size: 130,
      aggregationFn: countTruthyAggregation,
      meta: { type: 'phone' },
    }
  ),

  // Preferred Contact
  columnHelper.accessor(
    (row) => row.contactDetails?.[0]?.preferredContactMethod ?? null,
    {
      id: 'preferredContact',
      header: 'Contact',
      cell: (info) => <ContactCell method={info.getValue()} />,
      size: 120,
      meta: { type: 'tag', filterType: 'enum', filterOptions: ['CALL', 'WHATSAPP', 'SMS', 'VISIT', 'EMAIL'] },
    }
  ),

  // Gender
  columnHelper.accessor('gender', {
    id: 'gender',
    header: 'Gender',
    cell: (info) => <GenderCell gender={info.getValue()} />,
    size: 90,
    meta: { type: 'tag', filterType: 'enum', filterOptions: ['MALE', 'FEMALE', 'OTHER'] },
  }),

  // ============================================
  // CALCULATED COLUMNS
  // ============================================

  // Age (Computed from dateOfBirth)
  columnHelper.accessor(
    (row) => calculateAge(row.dateOfBirth),
    {
      id: 'age',
      header: 'Age',
      cell: (info) => {
        const age = info.getValue();
        return age !== null ? <span className="cell-age">{age}</span> : <span className="cell-empty">—</span>;
      },
      size: 70,
      aggregationFn: meanAggregation,
      meta: { type: 'number', computed: true, filterType: 'range' },
    }
  ),

  // Days Since Created (Computed)
  columnHelper.accessor(
    (row) => daysSinceCreated(row.createdAt),
    {
      id: 'daysSinceCreated',
      header: 'Days Old',
      cell: (info) => <DaysAgoCell days={info.getValue()} />,
      size: 100,
      aggregationFn: meanAggregation,
      meta: { type: 'number', computed: true },
    }
  ),

  // Has Phone (Boolean computed)
  columnHelper.accessor(
    (row) => hasPhone(row.contactDetails),
    {
      id: 'hasPhone',
      header: 'Has Phone',
      cell: (info) => <BooleanPill value={info.getValue()} />,
      size: 95,
      aggregationFn: countTruthyAggregation,
      meta: { type: 'boolean', computed: true, filterType: 'boolean' },
    }
  ),

  // Contact Completeness Score (Computed)
  columnHelper.accessor(
    (row) => contactCompletenessScore(row),
    {
      id: 'completeness',
      header: 'Completeness',
      cell: (info) => <ScoreBar score={info.getValue()} />,
      size: 130,
      aggregationFn: meanAggregation,
      meta: { type: 'number', computed: true },
    }
  ),

  // ============================================
  // STANDARD COLUMNS
  // ============================================

  // Created At
  columnHelper.accessor('createdAt', {
    id: 'createdAt',
    header: 'Created',
    cell: (info) => <span className="cell-date">{formatDate(info.getValue())}</span>,
    size: 110,
    aggregationFn: minAggregation,
    meta: { type: 'date', filterType: 'dateRange' },
  }),

  // Created By
  columnHelper.accessor(
    (row) => row.createdBy?.email ?? null,
    {
      id: 'createdBy',
      header: 'Created By',
      cell: (info) => {
        const email = info.getValue();
        return email ? <span className="cell-email">{email}</span> : <span className="cell-empty">—</span>;
      },
      size: 150,
      meta: { type: 'link' },
    }
  ),
];

export const defaultColumnOrder = [
  'select', 'fullName', 'customerCode', 'status', 'primaryPhone',
  'preferredContact', 'gender', 'age', 'daysSinceCreated', 'hasPhone',
  'completeness', 'createdAt', 'createdBy',
];

// Column type mapping for icons
export const columnTypes = {
  fullName: 'user',
  customerCode: 'text',
  status: 'status',
  primaryPhone: 'phone',
  preferredContact: 'tag',
  gender: 'tag',
  age: 'number',
  daysSinceCreated: 'number',
  hasPhone: 'boolean',
  completeness: 'number',
  createdAt: 'date',
  createdBy: 'link',
};
