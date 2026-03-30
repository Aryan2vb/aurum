import React, { useState, useEffect, useMemo } from 'react';
import DateDisplay from '../../atoms/DateDisplay/DateDisplay';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import { getMetaTrackings, addMetaTracking } from '../../../services/customersService';
import './CustomerNotes.css';

const CustomerNotes = ({ customerId, customer, credits = [], onRefresh }) => {
  const [metaTrackings, setMetaTrackings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getMetaTrackings(customerId);
      const notes = Array.isArray(data) ? data : (data?.data || []);
      setMetaTrackings(notes);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const allNotes = useMemo(() => {
    const notes = [];

    // Add meta tracking notes
    metaTrackings.forEach((tracking) => {
      if (tracking.notes) {
        notes.push({
          type: 'note',
          date: tracking.createdAt,
          text: tracking.notes,
          source: tracking.source,
          id: tracking.id,
        });
      }
    });

    // Add credit notes
    credits.forEach((credit) => {
      if (credit.notes) {
        notes.push({
          type: 'credit_note',
          date: credit.createdAt,
          text: credit.notes,
          creditId: credit.id,
          creditItemSummary: credit.itemSummary,
        });
      }
    });

    // Sort by date (newest first)
    notes.sort((a, b) => new Date(b.date) - new Date(a.date));

    return notes;
  }, [metaTrackings, credits]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      await addMetaTracking(customerId, {
        notes: newNote.trim(),
        source: 'MANUAL',
      });
      setNewNote('');
      setShowAddForm(false);
      await loadNotes();
      onRefresh?.();
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Failed to add note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-notes">
        <div className="customer-notes-loading">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="customer-notes">
      <div className="customer-notes-header">
        <h2 className="customer-notes-title">Notes & Interactions</h2>
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Icon name="add" size={14} />
          Add Note
        </Button>
      </div>

      {showAddForm && (
        <div className="customer-notes-add-form">
          <textarea
            className="customer-notes-textarea"
            placeholder="Add a note about this customer..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <div className="customer-notes-form-actions">
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                setShowAddForm(false);
                setNewNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleAddNote}
              disabled={!newNote.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      <div className="customer-notes-content">
        {allNotes.length === 0 ? (
          <div className="customer-notes-empty">
            <p>No notes found</p>
            <span className="customer-notes-empty-hint">
              Add notes to track interactions and important information about this customer
            </span>
          </div>
        ) : (
          <div className="customer-notes-list">
            {allNotes.map((note, index) => (
              <div key={`${note.type}-${note.id || note.creditId}-${index}`} className="customer-notes-item">
                <div className="customer-notes-item-header">
                  <div className="customer-notes-item-meta">
                    <span className="customer-notes-item-type">
                      {note.type === 'credit_note' ? 'Credit Note' : 'Note'}
                    </span>
                    {note.source && (
                      <>
                        <span className="customer-notes-item-dot">·</span>
                        <span className="customer-notes-item-source">{note.source}</span>
                      </>
                    )}
                    {note.creditItemSummary && (
                      <>
                        <span className="customer-notes-item-dot">·</span>
                        <span className="customer-notes-item-credit">{note.creditItemSummary}</span>
                      </>
                    )}
                  </div>
                  <DateDisplay date={note.date} format="relative" size="sm" />
                </div>
                <p className="customer-notes-item-text">{note.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerNotes;
