import { mergeBackups } from "./database";
import type { MonthlaneBackup } from "./types";

export type CloudConfig = { url: string; anonKey: string };
export type CloudSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string };
};

const normalizedUrl = (value: string) => value.trim().replace(/\/+$/, "");

const request = async <T,>(url: string, init: RequestInit, anonKey: string): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    let message = body || `Request failed (${response.status})`;
    try {
      const parsed = JSON.parse(body);
      message = parsed.msg ?? parsed.message ?? parsed.error_description ?? parsed.error ?? message;
    } catch {}
    throw new Error(message);
  }
  return body ? JSON.parse(body) as T : undefined as T;
};

const sessionFromResponse = (result: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}): CloudSession => ({
  accessToken: result.access_token,
  refreshToken: result.refresh_token,
  expiresAt: Date.now() + result.expires_in * 1000,
  user: { id: result.user.id, email: result.user.email ?? "" },
});

export const signIn = async (config: CloudConfig, email: string, password: string) => {
  const result = await request<Parameters<typeof sessionFromResponse>[0]>(
    `${normalizedUrl(config.url)}/auth/v1/token?grant_type=password`,
    { method: "POST", body: JSON.stringify({ email, password }) },
    config.anonKey,
  );
  return sessionFromResponse(result);
};

export const signUp = async (config: CloudConfig, email: string, password: string) => {
  const result = await request<Partial<Parameters<typeof sessionFromResponse>[0]> & { user: { id: string; email?: string } }>(
    `${normalizedUrl(config.url)}/auth/v1/signup`,
    { method: "POST", body: JSON.stringify({ email, password }) },
    config.anonKey,
  );
  if (!result.access_token || !result.refresh_token || !result.expires_in) {
    return { needsConfirmation: true as const };
  }
  return { needsConfirmation: false as const, session: sessionFromResponse(result as Parameters<typeof sessionFromResponse>[0]) };
};

export const refreshSession = async (config: CloudConfig, session: CloudSession) => {
  if (session.expiresAt > Date.now() + 60_000) return session;
  const result = await request<Parameters<typeof sessionFromResponse>[0]>(
    `${normalizedUrl(config.url)}/auth/v1/token?grant_type=refresh_token`,
    { method: "POST", body: JSON.stringify({ refresh_token: session.refreshToken }) },
    config.anonKey,
  );
  return sessionFromResponse(result);
};

export const synchronize = async (
  config: CloudConfig,
  session: CloudSession,
  local: MonthlaneBackup,
) => {
  const activeSession = await refreshSession(config, session);
  const headers = { Authorization: `Bearer ${activeSession.accessToken}` };
  const rows = await request<Array<{ payload: MonthlaneBackup }>>(
    `${normalizedUrl(config.url)}/rest/v1/monthlane_backups?select=payload&user_id=eq.${encodeURIComponent(activeSession.user.id)}`,
    { method: "GET", headers },
    config.anonKey,
  );
  const merged = rows[0]?.payload ? mergeBackups(local, rows[0].payload) : local;
  await request(
    `${normalizedUrl(config.url)}/rest/v1/monthlane_backups?on_conflict=user_id`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: activeSession.user.id,
        payload: merged,
        updated_at: new Date().toISOString(),
      }),
    },
    config.anonKey,
  );
  return { backup: merged, session: activeSession };
};
