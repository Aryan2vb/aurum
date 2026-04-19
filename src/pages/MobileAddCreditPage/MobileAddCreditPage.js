import React from 'react';
import './MobileAddCreditPage.css';

import MobileTemplate from '../../components/templates/MobileTemplate/MobileTemplate';
import Icon from '../../components/atoms/Icon/Icon';

const MobileAddCreditPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = '/credits';
  };

  const headerAction = (
    <button className="mobile-text-button" onClick={() => window.history.back()}>
      Cancel
    </button>
  );

  return (
    <MobileTemplate title="New Udhar" headerAction={headerAction}>
      <div className="mobile-add-credit">
        <form className="mobile-add-credit__form" onSubmit={handleSubmit}>
          <div className="mobile-form-group">
            <label className="mobile-form-label">Customer Name</label>
            <div className="mobile-input-wrapper">
              <input
                type="text"
                className="mobile-form-input"
                placeholder="Ex. Rajesh Kumar"
                required
              />
            </div>
          </div>

          <div className="mobile-form-group">
            <label className="mobile-form-label">Phone Number (Optional)</label>
            <div className="mobile-input-wrapper">
              <input
                type="tel"
                className="mobile-form-input"
                placeholder="+91 00000 00000"
              />
            </div>
          </div>

          <div className="form-row-dual">
            <div className="mobile-form-group">
              <label className="mobile-form-label">Total Amount</label>
              <div className="mobile-input-wrapper">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  className="mobile-form-input has-prefix"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="mobile-form-group">
              <label className="mobile-form-label">Amount Paid</label>
              <div className="mobile-input-wrapper">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  className="mobile-form-input has-prefix"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="mobile-form-group">
            <label className="mobile-form-label">Due Date</label>
            <div className="mobile-input-wrapper">
              <input
                type="date"
                className="mobile-form-input"
                required
              />
            </div>
          </div>

          <div className="mobile-form-group">
            <label className="mobile-form-label">Notes</label>
            <div className="mobile-input-wrapper">
              <textarea
                className="mobile-form-input is-textarea"
                placeholder="Add any specific details..."
                rows="3"
              ></textarea>
            </div>
          </div>

          <div className="form-footer-action">
            <button type="submit" className="mobile-submit-button">
              Create Entry
            </button>
          </div>
        </form>
      </div>
    </MobileTemplate>
  );
};

export default MobileAddCreditPage;


// export default MobileAddCreditPage;