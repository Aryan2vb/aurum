import {
  buildFirmIdentity,
  clearFirmIdentitySettingsCache,
  readFirmIdentitySettingsCache,
  writeFirmIdentitySettingsCache,
} from './firmIdentity';

beforeEach(() => {
  sessionStorage.clear();
});

describe('buildFirmIdentity', () => {
  it('uses invoice settings company name over the organization fallback', () => {
    expect(buildFirmIdentity({
      companyName: 'Raj Kumar Jewellers',
      logoUrl: 'https://cdn.example.com/rk-logo.png',
      gstin: '23ABCDE1234F1Z5',
      invoiceNumberPrefix: 'RK',
    }, 'Old Org Name')).toEqual({
      displayName: 'Raj Kumar Jewellers',
      logoUrl: 'https://cdn.example.com/rk-logo.png',
      gstin: '23ABCDE1234F1Z5',
      invoicePrefix: 'RK',
      initials: 'RK',
      metaLabel: 'GSTIN 23ABCDE1234F1Z5',
      documentTitle: 'Raj Kumar Jewellers · Aurum',
    });
  });

  it('falls back to organization name when settings are empty', () => {
    expect(buildFirmIdentity({}, 'Mangal Jewellers')).toMatchObject({
      displayName: 'Mangal Jewellers',
      logoUrl: '',
      initials: 'MJ',
      documentTitle: 'Mangal Jewellers · Aurum',
    });
  });

  it('generates compact initials from multi-word firm names', () => {
    expect(buildFirmIdentity({}, 'Shree Ganesh Gold Palace').initials).toBe('SG');
    expect(buildFirmIdentity({}, 'Aurum').initials).toBe('AU');
  });

  it('uses invoice prefix when GSTIN is missing', () => {
    expect(buildFirmIdentity({
      companyName: 'Mangal Jewellers',
      invoiceNumberPrefix: 'MJ',
    }, 'Fallback').metaLabel).toBe('Prefix MJ');
  });

  it('hides metadata when GSTIN and invoice prefix are missing', () => {
    expect(buildFirmIdentity({
      companyName: 'Mangal Jewellers',
    }, 'Fallback').metaLabel).toBe('');
  });

  it('stores only firm identity settings in session cache', () => {
    writeFirmIdentitySettingsCache({
      companyName: 'Raj Kumar Jewellers',
      logoUrl: 'https://cdn.example.com/logo.png',
      gstin: '23ABCDE1234F1Z5',
      invoiceNumberPrefix: 'RK',
      declaration: 'not identity',
    });

    expect(readFirmIdentitySettingsCache()).toEqual({
      companyName: 'Raj Kumar Jewellers',
      logoUrl: 'https://cdn.example.com/logo.png',
      gstin: '23ABCDE1234F1Z5',
      invoiceNumberPrefix: 'RK',
    });
  });

  it('clears cached firm identity settings', () => {
    writeFirmIdentitySettingsCache({ companyName: 'Raj Kumar Jewellers' });

    clearFirmIdentitySettingsCache();

    expect(readFirmIdentitySettingsCache()).toBe(null);
  });
});
