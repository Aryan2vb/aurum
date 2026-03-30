import React from 'react';
import { useTheme, LIGHT_THEMES, THEME_LABELS, THEME_SWATCHES } from '../../contexts/ThemeContext';
import DashboardTemplate from '../../components/templates/DashboardTemplate/DashboardTemplate';
import './SettingsPage.css';

const SettingsPage = () => (
  <DashboardTemplate headerTitle="Settings" headerTabs={[]}>
    <div className="settings-page">
      <section className="settings-section" id="account">
        <h2 className="settings-section-title">Account</h2>
        <div className="settings-block">
          <button 
            className="attio-primary-btn" 
            style={{ backgroundColor: 'var(--error)' }} 
            onClick={async () => {
              if (window.confirm('Are you sure you want to log out?')) {
                try {
                  const { logout } = require('../../services/authService');
                  await logout(localStorage.getItem('authToken'));
                } catch (e) {}
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userEmail');
                window.location.href = '/login';
              }
            }}
          >
            Log out
          </button>
        </div>
      </section>

      <section className="settings-section" id="appearance">
        <h2 className="settings-section-title">Appearance</h2>

        <div className="settings-block">
          <h3 className="settings-block-title">Light themes</h3>
          <p className="settings-block-desc">Muted and colorful options. Accent and sidebar tints change; base typography stays the same.</p>
          <div className="theme-swatch-grid">
            {LIGHT_THEMES.map((id) => (
              <ThemeSwatchCard key={id} id={id} />
            ))}
          </div>
        </div>

        <div className="settings-block">
          <h3 className="settings-block-title">Dark mode</h3>
          <ThemeSwatchCard id="dark" />
        </div>
      </section>
    </div>
  </DashboardTemplate>
);

function ThemeSwatchCard({ id }) {
  const { theme, setTheme } = useTheme();
  const [accent, bg] = THEME_SWATCHES[id] || [undefined, undefined];
  const selected = theme === id;

  return (
    <button
      type="button"
      className={`theme-swatch-card ${selected ? 'theme-swatch-card--selected' : ''}`}
      onClick={() => setTheme(id)}
      aria-pressed={selected}
      aria-label={`Theme ${THEME_LABELS[id]}`}
    >
      <div className="theme-swatch-preview">
        <span className="theme-swatch-accent" style={{ background: accent }} />
        <span className="theme-swatch-bg" style={{ background: bg }} />
      </div>
      <span className="theme-swatch-label">{THEME_LABELS[id]}</span>
    </button>
  );
}

export default SettingsPage;
