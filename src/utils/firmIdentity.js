const DEFAULT_APP_NAME = 'Aurum';
export const FIRM_IDENTITY_SETTINGS_CACHE_KEY = 'aurum.firmIdentity.settings.v1';
export const FIRM_IDENTITY_CACHE_EVENT = 'aurum:firm-identity-cache-change';

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const notifyFirmIdentityCacheChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FIRM_IDENTITY_CACHE_EVENT));
};

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
};

const pickFirmSettings = (settings = {}) => ({
  companyName: clean(settings.companyName),
  logoUrl: clean(settings.logoUrl),
  gstin: clean(settings.gstin),
  invoiceNumberPrefix: clean(settings.invoiceNumberPrefix),
});

export const getFirmInitials = (name) => {
  const words = clean(name).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || DEFAULT_APP_NAME).slice(0, 2).toUpperCase();
};

export const buildFirmIdentity = (settings = {}, fallbackName = DEFAULT_APP_NAME) => {
  const displayName =
    clean(settings.companyName) ||
    clean(fallbackName) ||
    DEFAULT_APP_NAME;
  const logoUrl = clean(settings.logoUrl);
  const gstin = clean(settings.gstin);
  const invoicePrefix = clean(settings.invoiceNumberPrefix);
  const metaLabel = gstin
    ? `GSTIN ${gstin}`
    : invoicePrefix
      ? `Prefix ${invoicePrefix}`
      : '';

  return {
    displayName,
    logoUrl,
    gstin,
    invoicePrefix,
    initials: getFirmInitials(displayName),
    metaLabel,
    documentTitle: `${displayName} · ${DEFAULT_APP_NAME}`,
  };
};

export const readFirmIdentitySettingsCache = () => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const value = storage.getItem(FIRM_IDENTITY_SETTINGS_CACHE_KEY);
    if (!value) return null;
    return pickFirmSettings(JSON.parse(value));
  } catch (error) {
    storage.removeItem(FIRM_IDENTITY_SETTINGS_CACHE_KEY);
    return null;
  }
};

export const writeFirmIdentitySettingsCache = (settings, options = {}) => {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(
    FIRM_IDENTITY_SETTINGS_CACHE_KEY,
    JSON.stringify(pickFirmSettings(settings)),
  );

  if (options.notify) notifyFirmIdentityCacheChange();
};

export const clearFirmIdentitySettingsCache = (options = {}) => {
  const storage = getStorage();
  if (storage) storage.removeItem(FIRM_IDENTITY_SETTINGS_CACHE_KEY);
  if (options.notify) notifyFirmIdentityCacheChange();
};
