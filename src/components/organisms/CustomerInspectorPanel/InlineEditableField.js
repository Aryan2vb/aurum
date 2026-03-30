import React, { useState, useRef, useEffect, useCallback } from 'react';
import './InlineEditableField.css';

/**
 * InlineEditableField - A field that appears as static text but becomes
 * an editable input on hover/click.
 * 
 * UX Pattern: Following Attio/Linear's inline editing pattern where:
 * - Default state shows clean, readable text
 * - Hover reveals a subtle background change + pencil icon
 * - Click transforms into an input
 * - Enter saves, Escape cancels
 * - Blur auto-saves (common SaaS pattern for inline edits)
 * 
 * @param {Object} props
 * @param {string} props.label - Display label for the field
 * @param {string|number|null} props.value - Current value to display
 * @param {string} props.fieldKey - Field name/key for updates
 * @param {string} props.type - Input type ('text' | 'date' | 'number' | 'select')
 * @param {Array} props.options - Options for select type
 * @param {Function} props.onSave - Callback when value is saved
 * @param {Function} props.formatValue - Format function for display value
 * @param {boolean} props.isSaving - Whether field is currently saving
 * @param {string} props.placeholder - Placeholder text when no value
 */
const InlineEditableField = ({
  label,
  value,
  fieldKey,
  type = 'text',
  options = [],
  onSave,
  formatValue,
  isSaving = false,
  placeholder = 'Add...',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const inputRef = useRef(null);

  // Format the display value
  const displayValue = formatValue 
    ? formatValue(value) 
    : (value?.toString() ?? '');

  // Sync edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // For dates, convert to input format
      if (type === 'date' && value) {
        const dateStr = value.toString();
        setEditValue(dateStr.split('T')[0]);
      } else {
        setEditValue(value?.toString() ?? '');
      }
    }
  }, [isEditing, value, type]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();
    const originalValue = value?.toString() ?? '';
    
    // Only save if value changed
    if (trimmedValue !== originalValue) {
      setLocalSaving(true);
      try {
        await onSave(fieldKey, trimmedValue);
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setLocalSaving(false);
      }
    }
    setIsEditing(false);
  }, [editValue, value, fieldKey, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value?.toString() ?? '');
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const saving = isSaving || localSaving;

  return (
    <div 
      className="editable-field-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label column - fixed width for alignment */}
      <span className="editable-field-label">
        {label}
      </span>

      {/* Value column - the editable part */}
      <div className="editable-field-value-wrapper">
        {isEditing ? (
          // Edit mode: show input
          <div className="editable-field-input-wrapper">
            {type === 'select' ? (
              <select
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={saving}
                className="editable-field-input"
              >
                <option value="">Select...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={inputRef}
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={saving}
                placeholder={placeholder}
                className="editable-field-input"
              />
            )}
            
            {/* Saving indicator */}
            {saving && (
              <span className="editable-field-saving">
                Saving...
              </span>
            )}
          </div>
        ) : (
          // Display mode: show text, reveal edit affordance on hover
          <div
            onClick={() => setIsEditing(true)}
            className={`editable-field-display ${isHovered ? 'hovered' : ''}`}
          >
            <span className={`editable-field-text ${!displayValue ? 'placeholder' : ''}`}>
              {displayValue || placeholder}
            </span>

            {/* Pencil icon - appears on hover */}
            <span className={`editable-field-pencil ${isHovered ? 'visible' : ''}`}>
              <PencilIcon />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Simple pencil icon component
 */
const PencilIcon = () => (
  <svg
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

export default InlineEditableField;
