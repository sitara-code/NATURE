import {
  User,
  Zoo,
  Zookeeper,
  Observation,
  RiskAnalysis,
  Alert,
  TruthRatingData,
  AuditLog,
  SystemStatus,
} from '../types';

const TOKEN_KEY = 'zoo_sentinel_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain, */*');
  }

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new Error(`Network error: Unable to connect to Sentinel server. ${networkErr?.message || ''}`.trim());
  }

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  let data: any = null;
  const isLikelyJson =
    contentType.includes('application/json') ||
    (rawText.trim().startsWith('{') && rawText.trim().endsWith('}')) ||
    (rawText.trim().startsWith('[') && rawText.trim().endsWith(']'));

  if (isLikelyJson) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let errorMsg: string;
    if (data && (data.error || data.message)) {
      errorMsg = data.error || data.message;
    } else if (rawText && !rawText.includes('<html') && !rawText.includes('<!doctype') && !rawText.includes('<!DOCTYPE')) {
      errorMsg = rawText.slice(0, 300);
    } else {
      errorMsg = `Server error (HTTP ${res.status}: ${res.statusText || 'Request Failed'})`;
    }
    throw new Error(errorMsg);
  }

  if (data === null) {
    throw new Error(`Invalid non-JSON response from server (HTTP ${res.status}, content-type: ${contentType || 'unknown'})`);
  }

  if (data && typeof data === 'object' && data.success === false && data.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export const api = {
  // Auth
  zooAdminLogin: (data: { zooId?: string; identifier?: string; email: string; password: string }) =>
    request<{ token: string; user: User; zoo: Zoo }>('/api/auth/zoo-admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  zookeeperLogin: (data: { zooId: string; zookeeperIdentifier: string; accessCode: string }) =>
    request<{ token: string; user: User; zoo: Zoo }>('/api/auth/zookeeper/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  citizenRegister: (data: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    latitude?: number;
    longitude?: number;
    registeredLocation?: string;
    locationPermission: boolean;
  }) =>
    request<{ token: string; user: User }>('/api/auth/citizen/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  citizenLogin: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/citizen/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  masterAdminLogin: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/master-admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: User; zoo?: Zoo | null }>('/api/auth/me'),

  updateCitizenLocation: (latitude: number, longitude: number, permission: boolean) =>
    request<{ status: string }>('/api/citizen/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, permission }),
    }),

  getCitizenSMS: () => request<import('../types.js').DispatchedSMS[]>('/api/citizen/sms'),

  sendTestSMS: () =>
    request<{ success: boolean; message: string; result: any }>('/api/citizen/test-sms', {
      method: 'POST',
    }),

  // Zoos
  getZoos: () => request<Zoo[]>('/api/zoos'),

  updateGeofence: (
    zooId: string,
    polygon: [number, number][],
    centerLat?: number,
    centerLng?: number,
    radiusMeters?: number
  ) =>
    request<Zoo>(`/api/zoos/${zooId}/geofence`, {
      method: 'PUT',
      body: JSON.stringify({ polygon, centerLat, centerLng, radiusMeters }),
    }),

  addZoo: (data: Partial<Zoo>) =>
    request<Zoo>('/api/zoos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyZoo: (zooId: string, verified: boolean) =>
    request<Zoo>(`/api/zoos/${zooId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ verified }),
    }),

  // Zookeepers
  getZookeepers: () => request<Zookeeper[]>('/api/zookeepers'),

  createZookeeper: (data: { fullName: string; badgeNumber: string; email: string }) =>
    request<{ zookeeper: Zookeeper; oneTimeAccessCode: string }>('/api/zookeepers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  regenerateAccessCode: (zookeeperId: string) =>
    request<{ success: boolean; oneTimeAccessCode: string }>(
      `/api/zookeepers/${zookeeperId}/regenerate-code`,
      { method: 'POST' }
    ),

  revokeZookeeperAccess: (zookeeperId: string) =>
    request<{ success: boolean }>(`/api/zookeepers/${zookeeperId}/revoke`, {
      method: 'POST',
    }),

  // Upload
  uploadMedia: async (file: File) => {
    const formData = new FormData();
    formData.append('media', file);
    return request<{ success?: boolean; url: string; type: 'image' | 'video'; size: number; filename: string }>(
      '/api/upload',
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  // Observations
  getObservations: (zooId?: string) =>
    request<Observation[]>(`/api/observations${zooId ? `?zooId=${encodeURIComponent(zooId)}` : ''}`),

  exportMLDatasetCSV: async (): Promise<string> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/api/observations/export-ml-csv', { headers });
    if (!res.ok) {
      throw new Error('Failed to export ML dataset CSV from server.');
    }
    return await res.text();
  },

  submitObservation: (data: {
    species: string;
    totalAnimals: number;
    animalsShowingBehaviour: number;
    durationMinutes: number;
    abnormalityPercentage?: number;
    behaviourCategory: string;
    intensity: number;
    description: string;
    severity?: number;
    latitude?: number;
    longitude?: number;
    gpsAccuracy?: number;
    observedAt: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  }) =>
    request<{
      success: boolean;
      message: string;
      observation: Observation;
      analysis: RiskAnalysis | null;
      mlCsv?: string;
      randomForestScore?: number;
      alert: Alert | null;
      prediction: Record<string, unknown> | null;
    }>('/api/observations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Risk & Alerts
  getCurrentRiskAnalysis: () =>
    request<{ analysis: RiskAnalysis | null; message?: string }>('/api/analysis/current'),

  getAlerts: () => request<Alert[]>('/api/alerts'),

  // Truth Ratings & Audit
  getTruthRatings: () => request<TruthRatingData[]>('/api/truth-ratings'),

  recordTruthOutcome: (data: {
    zooId: string;
    outcome: 'CORRELATED' | 'UNVERIFIED' | 'FALSE_ALARM';
    notes: string;
    eventType?: string;
  }) =>
    request<{ success: boolean; ratings: TruthRatingData[] }>('/api/truth-ratings/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),

  // System Diagnostics
  getSystemStatus: () => request<SystemStatus>('/api/system/status'),

  resetCleanDatabase: () =>
    request<{ success: boolean; message: string }>('/api/admin/system/reset-clean', {
      method: 'POST',
    }),
};
