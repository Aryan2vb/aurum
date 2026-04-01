import { React, useState, useEffect } from 'react';
import { useTheme, LIGHT_THEMES, THEME_LABELS, THEME_SWATCHES } from '../../contexts/ThemeContext';
import { usePermission } from '../../hooks/usePermission';
import {
  addOrganizationMember,
  getOrganizationMembers,
  updateOrganizationMemberRole,
  removeOrganizationMember,
} from '../../services/organizationService';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import './SettingsPage.css';

const SettingsPage = () => {
  const { can } = usePermission();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF');
  const [formStatus, setFormStatus] = useState({ loading: false, error: null, success: null });

  useEffect(() => {
    if (can('admin')) fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try { setMembers((await getOrganizationMembers()) || []); }
    catch (e) { console.error(e); }
    finally { setLoadingMembers(false); }
  };

  const handleRoleChange = async (id, r) => {
    try { await updateOrganizationMemberRole(id, r); await fetchMembers(); }
    catch (e) { alert(e.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this member?')) return;
    try { await removeOrganizationMember(id); await fetchMembers(); }
    catch (e) { alert(e.message || 'Failed'); }
  };

  const reset = () => {
    setFullName(''); setEmail(''); setPassword(''); setRole('STAFF');
    setFormStatus({ loading: false, error: null, success: null });
  };

  const close = () => { setIsModalOpen(false); reset(); };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, error: null, success: null });
    try {
      await addOrganizationMember({ email, fullName, password, role });
      setFormStatus({ loading: false, error: null, success: 'Added!' });
      await fetchMembers();
      setTimeout(close, 1000);
    } catch (err) {
      setFormStatus({ loading: false, error: err.message, success: null });
    }
  };

  const logout = async () => {
    if (!window.confirm('Sign out of Aurum?')) return;
    try { const { logout: lo } = require('../../services/authService'); await lo(localStorage.getItem('authToken')); } catch (_) {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
  };

  return (
    <DashboardTemplate headerTitle="Settings" headerTabs={[]}>
      <div className="settings-page">

        {/* ────────── TEAM ────────── */}
        {can('admin') && (
          <section className="settings-section">
            <div className="s-card">
              {/* Card header = title + action anchored together */}
              <div className="s-card-header">
                <div>
                  <div className="s-card-title">Team Members</div>
                  <div className="s-card-subtitle">Manage workspace access</div>
                </div>
                <button className="s-btn s-btn-primary" onClick={() => setIsModalOpen(true)}>
                  Add Member
                </button>
              </div>

              {/* Rows */}
              {loadingMembers ? (
                <div className="m-empty">Loading…</div>
              ) : members.length === 0 ? (
                <div className="m-empty">No members yet</div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="m-row">
                    <div className="m-avatar">
                      {m.fullName ? m.fullName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="m-identity">
                      <span className="m-name">{m.fullName || 'Unknown'}</span>
                      <span className="m-email">{m.email}</span>
                    </div>
                    <div className="m-meta">
                      {can('manage-roles') ? (
                        <select className="m-role-select" value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}>
                          <option value="OWNER">Owner</option>
                          <option value="ADMIN">Admin</option>
                          <option value="STAFF">Staff</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span className={`m-badge m-badge-${m.role}`}>{m.role}</span>
                      )}
                      <span className="m-date">
                        {new Date(m.joinedAt).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                      {can('delete') && (
                        <button className="m-remove" onClick={() => handleDelete(m.id)}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ────────── APPEARANCE ────────── */}
        <section className="settings-section">
          <div className="s-card">
            <div className="s-card-header">
              <div>
                <div className="s-card-title">Appearance</div>
                <div className="s-card-subtitle">Choose how Aurum looks for you</div>
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p className="theme-label">Light</p>
              <div className="theme-grid">
                {LIGHT_THEMES.map((id) => <ThemeSwatch key={id} id={id} />)}
              </div>
              <div className="theme-sep" />
              <p className="theme-label">Dark</p>
              <div className="theme-grid" style={{ maxWidth: 190 }}>
                <ThemeSwatch id="dark" />
              </div>
            </div>
          </div>
        </section>

        {/* ────────── ACCOUNT ────────── */}
        <section className="settings-section">
          <div className="s-card">
            <div className="s-card-header">
              <div>
                <div className="s-card-title">Account</div>
                <div className="s-card-subtitle">Session &amp; security</div>
              </div>
            </div>
            <div className="signout-body">
              <span className="signout-label">End your current session on this device</span>
              <button className="s-btn s-btn-danger" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </section>

      </div>

      {/* ────────── ADD MEMBER MODAL ────────── */}
      {isModalOpen && (
        <div className="s-overlay" onClick={close}>
          <div className="s-modal" onClick={(e) => e.stopPropagation()}>
            <div className="s-modal-head">
              <span className="s-modal-title">Add Member</span>
              <button className="s-modal-close" onClick={close}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="s-modal-body">
                <div className="s-field">
                  <label htmlFor="fn" className="s-field-label">Full Name</label>
                  <input id="fn" type="text" className="s-field-input" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Smith" />
                </div>
                <div className="s-field">
                  <label htmlFor="em" className="s-field-label">Email</label>
                  <input id="em" type="email" className="s-field-input" value={email}
                    onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
                </div>
                <div className="s-field">
                  <label htmlFor="pw" className="s-field-label">Password</label>
                  <input id="pw" type="password" className="s-field-input" value={password}
                    onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" />
                  <span className="s-field-hint">They can change this after first login</span>
                </div>
                <div className="s-field">
                  <label htmlFor="rl" className="s-field-label">Role</label>
                  <select id="rl" className="s-field-input" value={role}
                    onChange={(e) => setRole(e.target.value)}>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
                {formStatus.error && <div className="s-feedback-err">{formStatus.error}</div>}
                {formStatus.success && <div className="s-feedback-ok">{formStatus.success}</div>}
              </div>
              <div className="s-modal-foot">
                <button type="button" className="s-btn s-btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="s-btn s-btn-primary" disabled={formStatus.loading}>
                  {formStatus.loading ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardTemplate>
  );
};

function ThemeSwatch({ id }) {
  const { theme, setTheme } = useTheme();
  const [accent, bg] = THEME_SWATCHES[id] || [undefined, undefined];
  const active = theme === id;
  return (
    <button type="button"
      className={`theme-card${active ? ' theme-card--active' : ''}`}
      onClick={() => setTheme(id)} aria-pressed={active} aria-label={THEME_LABELS[id]}>
      <div className="theme-preview">
        <span className="theme-accent" style={{ background: accent }} />
        <span className="theme-bg" style={{ background: bg }} />
      </div>
      <span className="theme-name">{THEME_LABELS[id]}</span>
    </button>
  );
}

export default SettingsPage;
