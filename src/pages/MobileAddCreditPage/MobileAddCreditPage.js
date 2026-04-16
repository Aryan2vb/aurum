import React from 'react';
import './MobileAddCreditPage.css';

const MobileAddCreditPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="mobile-add-credit">
      <header className="mobile-add-credit__header">
        <a href="/mobile/credits" className="mobile-add-credit__back">← Cancel</a>
        <h1 className="mobile-add-credit__title">New Udhar</h1>
        <div style={{ width: 60 }} />
      </header>

      <form className="mobile-add-credit__form" onSubmit={handleSubmit}>
        <div className="mobile-form-group">
          <label className="mobile-form-label">Customer Name</label>
          <input
            type="text"
            className="mobile-form-input"
            placeholder="Enter customer name"
          />
        </div>

        <div className="mobile-form-group">
          <label className="mobile-form-label">Phone Number</label>
          <input
            type="tel"
            className="mobile-form-input"
            placeholder="+91 "
          />
        </div>

        <div className="mobile-form-group">
          <label className="mobile-form-label">Total Amount</label>
          <input
            type="number"
            className="mobile-form-input"
            placeholder="₹0"
          />
        </div>

        <div className="mobile-form-group">
          <label className="mobile-form-label">Amount Paid</label>
          <input
            type="number"
            className="mobile-form-input"
            placeholder="₹0"
          />
        </div>

        <div className="mobile-form-group">
          <label className="mobile-form-label">Due Date</label>
          <input
            type="date"
            className="mobile-form-input"
          />
        </div>

        <button type="submit" className="mobile-add-credit__submit">
          Create Udhar
        </button>
      </form>
    </div>
  );
};

export default MobileAddCreditPage;