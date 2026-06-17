import { clearSession, login } from './authService';
import {
  readFirmIdentitySettingsCache,
  writeFirmIdentitySettingsCache,
} from '../utils/firmIdentity';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-token' }),
    }),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('auth session cache handling', () => {
  it('clears firm identity cache before login', async () => {
    writeFirmIdentitySettingsCache({ companyName: 'Old Firm' });

    await login({ email: 'owner@example.com', password: 'password123' });

    expect(readFirmIdentitySettingsCache()).toBe(null);
  });

  it('clears firm identity cache when clearing the session', () => {
    writeFirmIdentitySettingsCache({ companyName: 'Old Firm' });
    localStorage.setItem('authToken', 'old-token');

    clearSession();

    expect(readFirmIdentitySettingsCache()).toBe(null);
    expect(localStorage.getItem('authToken')).toBe(null);
  });
});
