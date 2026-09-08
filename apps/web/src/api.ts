const API_BASE = import.meta.env.VITE_API_URL || '/api';

type Garden = {
  garden_id: string;
  created_at: string;
};

type Session = {
  id: number;
  garden_id: string;
  intention: string;
  duration_minutes: 30 | 45 | 60 | 90 | 120;
  plant_type: PlantId;
  unique_slug: string;
  completed_at: string;
};

type PlantId = 'rose' | 'sunflower' | 'tulip' | 'lavender' | 'cherry' | 'daisy' | 'cactus' | 'orchid' | 'peony' | 'succulent' | 'fern' | 'lotus';

type ApiError = { error: string; detail?: string };

function getToken(): string | null {
  return localStorage.getItem('bloomfocus_token');
}

function setToken(token: string): void {
  localStorage.setItem('bloomfocus_token', token);
}

function clearToken(): void {
  localStorage.removeItem('bloomfocus_token');
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ApiError).error || 'API Error');
  }

  return data as T;
}

export const api = {
  gardens: {
    async create(gardenId: string, pattern: string): Promise<{ token: string; garden: Garden; recovery_code: string }> {
      const data = await fetchJson<{ token: string; garden: Garden; recovery_code: string }>('/gardens', {
        method: 'POST',
        body: JSON.stringify({ garden_id: gardenId, pattern }),
      });
      setToken(data.token);
      return data;
    },

    /** Reset a forgotten pattern with the saved recovery key. Returns a fresh key. */
    async recover(gardenId: string, recoveryCode: string, pattern: string): Promise<{ token: string; garden: Garden; recovery_code: string }> {
      const data = await fetchJson<{ token: string; garden: Garden; recovery_code: string }>('/gardens/recover', {
        method: 'POST',
        body: JSON.stringify({ garden_id: gardenId, recovery_code: recoveryCode, pattern }),
      });
      setToken(data.token);
      return data;
    },

    /** Address on file for reset mail, and whether the server can send at all. */
    async getEmail(): Promise<{ email: string | null; email_enabled: boolean }> {
      return fetchJson<{ email: string | null; email_enabled: boolean }>('/gardens/email');
    },

    /** Attach an address for reset mail, or pass '' to remove it. */
    async setEmail(email: string): Promise<{ email: string | null }> {
      return fetchJson<{ email: string | null }>('/gardens/email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    /** Ask for a reset link. Answers the same way whether or not an address is on file. */
    async forgot(gardenId: string): Promise<{ status: string }> {
      return fetchJson<{ status: string }>('/gardens/forgot', {
        method: 'POST',
        body: JSON.stringify({ garden_id: gardenId }),
      });
    },

    /** Check a reset link is still live, without spending it. */
    async checkResetToken(token: string): Promise<{ valid: boolean; garden_id: string }> {
      return fetchJson<{ valid: boolean; garden_id: string }>('/gardens/reset/check', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },

    /** Spend a reset link from the email and set the new pattern. */
    async resetWithToken(token: string, pattern: string): Promise<{ token: string; garden: Garden }> {
      const data = await fetchJson<{ token: string; garden: Garden }>('/gardens/reset', {
        method: 'POST',
        body: JSON.stringify({ token, pattern }),
      });
      setToken(data.token);
      return data;
    },

    /** Issue a recovery key for the garden already unlocked. Retires any previous one. */
    async issueRecoveryCode(): Promise<{ recovery_code: string }> {
      return fetchJson<{ recovery_code: string }>('/gardens/recovery-code', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async check(gardenId: string): Promise<{ available: boolean }> {
      try {
        await fetchJson<{ exists: boolean }>(`/gardens/check?garden_id=${encodeURIComponent(gardenId)}`);
        return { available: false };
      } catch (err: any) {
        if (err.message === 'not_found') return { available: true };
        throw err;
      }
    },

    async unlock(gardenId: string, pattern: string): Promise<{ token: string; garden: Garden }> {
      const data = await fetchJson<{ token: string; garden: Garden }>('/gardens/unlock', {
        method: 'POST',
        body: JSON.stringify({ garden_id: gardenId, pattern }),
      });
      setToken(data.token);
      return data;
    },

    async me(): Promise<{ garden: Garden }> {
      return fetchJson<{ garden: Garden }>('/gardens/me');
    },
  },

  sessions: {
    async list(limit = 50, before?: string): Promise<{ sessions: Session[] }> {
      let url = `/sessions?limit=${limit}`;
      if (before) url += `&before=${encodeURIComponent(before)}`;
      return fetchJson<{ sessions: Session[] }>(url);
    },

    async create(intention: string, durationMinutes: number, plantType: PlantId): Promise<{ session: Session }> {
      return fetchJson<{ session: Session }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          intention,
          duration_minutes: durationMinutes,
          plant_type: plantType,
        }),
      });
    },

    async getPublic(slug: string): Promise<{ session: Session }> {
      return fetchJson<{ session: Session }>(`/sessions/${slug}`);
    },

    getQrUrl(slug: string): string {
      return `${API_BASE}/qr/${slug}.png`;
    },
  },

  auth: {
    getToken,
    setToken,
    clearToken,
    isAuthenticated(): boolean {
      return !!getToken();
    },
  },
};

export type { Garden, Session, PlantId };