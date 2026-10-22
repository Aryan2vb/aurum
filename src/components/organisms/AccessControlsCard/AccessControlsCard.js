import React, { useCallback, useEffect, useState } from 'react';
import { getAccessPolicy, updateAccessPolicy } from '../../../services/organizationService';
import { useAccessPolicy } from '../../../contexts/AccessPolicyContext';
import './AccessControlsCard.css';

export const MODULE_LABELS = [
  { key: 'customers', label: 'Customers' },
  { key: 'credits', label: 'Udhar' },
  { key: 'advance', label: 'Advance' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'reports', label: 'Reports' },
];

const DELEGATED_ROLES = ['ADMIN', 'STAFF', 'VIEWER'];
const ROLE_LABELS = { ADMIN: 'Admin', STAFF: 'Staff', VIEWER: 'Viewer' };

/** Friendly timezone picker — value is still IANA for the API. */
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'UTC', label: 'UTC' },
];

const defaultModuleAccess = () =>
  Object.fromEntries(MODULE_LABELS.map(({ key }) => [key, [...DELEGATED_ROLES]]));

const fromApi = (policy) => ({
  accessWindowEnabled: !!policy.accessWindowEnabled,
  accessWindowStart: policy.accessWindowStart || '09:00',
  accessWindowEnd: policy.accessWindowEnd || '20:00',
  timezone: policy.timezone || 'Asia/Kolkata',
  moduleAccess: { ...defaultModuleAccess(), ...(policy.moduleAccess || {}) },
});

const AccessControlsCard = () => {
  const { setFromWhoami } = useAccessPolicy();
  const [policy, setPolicy] = useState({
    accessWindowEnabled: false,
    accessWindowStart: '09:00',
    accessWindowEnd: '20:00',
    timezone: 'Asia/Kolkata',
    moduleAccess: defaultModuleAccess(),
  });
  const [status, setStatus] = useState({ loading: false, error: null, success: null });

  const load = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true, error: null }));
    try {
      setPolicy(fromApi(await getAccessPolicy()));
      setStatus({ loading: false, error: null, success: null });
    } catch (e) {
      setStatus({ loading: false, error: e.message || 'Failed to load access policy', success: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setStatus({ loading: true, error: null, success: null });
    try {
      const saved = await updateAccessPolicy({
        accessWindowEnabled: policy.accessWindowEnabled,
        accessWindowStart: String(policy.accessWindowStart || '').slice(0, 5),
        accessWindowEnd: String(policy.accessWindowEnd || '').slice(0, 5),
        timezone: policy.timezone,
        moduleAccess: policy.moduleAccess,
      });
      setPolicy(fromApi(saved));
      setFromWhoami({ accessPolicy: { modules: saved.modulesForRole } });
      setStatus({ loading: false, error: null, success: 'Access settings saved' });
      setTimeout(() => setStatus((s) => ({ ...s, success: null })), 2500);
    } catch (e) {
      setStatus({ loading: false, error: e.message || 'Failed to save', success: null });
    }
  };

  const toggleModuleRole = (moduleKey, role) => {
    setPolicy((prev) => {
      const current = new Set(prev.moduleAccess[moduleKey] || []);
      if (current.has(role)) current.delete(role);
      else current.add(role);
      return {
        ...prev,
        moduleAccess: {
          ...prev.moduleAccess,
          [moduleKey]: DELEGATED_ROLES.filter((r) => current.has(r)),
        },
      };
    });
  };

  const set = (patch) => setPolicy((p) => ({ ...p, ...patch }));
  const tzKnown = TIMEZONE_OPTIONS.some((o) => o.value === policy.timezone);

  return (
    <div className="s-card access-card">
      <div className="s-card-header">
        <div>
          <div className="s-card-title">Access controls</div>
          <div className="s-card-subtitle">Non-owner hours &amp; module visibility</div>
        </div>
        <button className="s-btn s-btn-primary" type="button" disabled={status.loading} onClick={save}>
          {status.loading ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="access-body">
        {(status.error || status.success) && (
          <div className={status.error ? 's-feedback-err' : 's-feedback-ok'}>
            {status.error || status.success}
          </div>
        )}

        <div className={`access-hours${policy.accessWindowEnabled ? ' is-on' : ''}`}>
          <div className="access-hours-controls">
            <input
              type="time"
              className="access-time"
              aria-label="From"
              value={policy.accessWindowStart}
              disabled={!policy.accessWindowEnabled}
              onChange={(e) => set({ accessWindowStart: e.target.value })}
            />
            <span className="access-hours-sep">→</span>
            <input
              type="time"
              className="access-time"
              aria-label="To"
              value={policy.accessWindowEnd}
              disabled={!policy.accessWindowEnabled}
              onChange={(e) => set({ accessWindowEnd: e.target.value })}
            />
            <select
              className="access-tz"
              aria-label="Timezone"
              disabled={!policy.accessWindowEnabled}
              value={policy.timezone}
              onChange={(e) => set({ timezone: e.target.value })}
            >
              {!tzKnown && <option value={policy.timezone}>{policy.timezone}</option>}
              {TIMEZONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`access-enforce-btn${policy.accessWindowEnabled ? ' is-on' : ''}`}
            aria-pressed={policy.accessWindowEnabled}
            onClick={() => set({ accessWindowEnabled: !policy.accessWindowEnabled })}
          >
            {policy.accessWindowEnabled ? 'Login enforced' : 'Login not enforced'}
          </button>
        </div>

        <div className="access-modules">
          <div className="access-modules-head">
            <span className="access-modules-title">Modules</span>
            <div className="access-role-legend" aria-hidden="true">
              {DELEGATED_ROLES.map((role) => (
                <span key={role} className="access-role-tag">
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          </div>

          <div className="access-module-list" role="table" aria-label="Module visibility by role">
            {MODULE_LABELS.map(({ key, label }) => (
              <div key={key} className="access-module-item" role="row">
                <span className="access-module-name" role="cell">{label}</span>
                <div className="access-module-roles" role="cell">
                  {DELEGATED_ROLES.map((role) => (
                    <label key={role} className="access-module-check">
                      <input
                        type="checkbox"
                        aria-label={`${label} for ${ROLE_LABELS[role].toLowerCase()}`}
                        checked={(policy.moduleAccess[key] || []).includes(role)}
                        onChange={() => toggleModuleRole(key, role)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControlsCard;
