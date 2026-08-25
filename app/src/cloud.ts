import { mergeBackups, normalizeBackup } from "./database.ts";
import type { MonthlaneBackup, MonthlaneBackupV2 } from "./types.ts";

export type CloudConfig = { url: string; anonKey: string };
export type CloudSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string };
};

export type TaskSyncSummary = {
  added: number;
  updated: number;
  deleted: number;
  conflicts: number;
};

export const summarizeTaskSync = (localInput: MonthlaneBackup, mergedInput: MonthlaneBackup): TaskSyncSummary => {
  const local = normalizeBackup(localInput);
  const merged = normalizeBackup(mergedInput);
  const localById = new Map(local.tasks.map((task) => [task.id, task]));
  const conflicts = merged.tasks.filter((task) => task.id.includes("-conflict-") && !localById.has(task.id)).length;
  const added = merged.tasks.filter((task) => !task.id.includes("-conflict-") && !localById.has(task.id)).length;
  const updatedTasks = merged.tasks.filter((task) => {
    const existing = localById.get(task.id);
    return Boolean(existing && task.updatedAt > existing.updatedAt);
  });
  return {
    added,
    updated: updatedTasks.filter((task) => !task.deletedAt).length,
    deleted: updatedTasks.filter((task) => task.deletedAt).length,
    conflicts,
  };
};

export const taskSyncSummaryText = (summary: TaskSyncSummary) => {
  const noun = (count: number) => count === 1 ? "task" : "tasks";
  const parts = [
    summary.added && `${summary.added} ${noun(summary.added)} added`,
    summary.updated && `${summary.updated} ${noun(summary.updated)} updated`,
    summary.deleted && `${summary.deleted} ${noun(summary.deleted)} deleted`,
    summary.conflicts && `${summary.conflicts} conflict${summary.conflicts === 1 ? "" : "s"} created`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All devices are up to date.";
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

export const fetchRemoteBackup = async (config: CloudConfig, session: CloudSession) => {
  const activeSession = await refreshSession(config, session);
  const headers = { Authorization: `Bearer ${activeSession.accessToken}` };
  const rows = await request<Array<{ payload: MonthlaneBackup }>>(
    `${normalizedUrl(config.url)}/rest/v1/monthlane_backups?select=payload&user_id=eq.${encodeURIComponent(activeSession.user.id)}`,
    { method: "GET", headers },
    config.anonKey,
  );
  return { backup: rows[0]?.payload as MonthlaneBackup | undefined, session: activeSession };
};

export const pushBackup = async (
  config: CloudConfig,
  session: CloudSession,
  backup: MonthlaneBackup,
) => {
  const activeSession = await refreshSession(config, session);
  await request(
    `${normalizedUrl(config.url)}/rest/v1/monthlane_backups?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeSession.accessToken}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: activeSession.user.id,
        payload: backup,
        updated_at: new Date().toISOString(),
      }),
    },
    config.anonKey,
  );
  return activeSession;
};

export const synchronize = async (
  config: CloudConfig,
  session: CloudSession,
  local: MonthlaneBackup,
) => {
  const { backup: remote, session: activeSession } = await fetchRemoteBackup(config, session);
  const merged = remote ? mergeBackups(local, remote) : normalizeBackup(local);
  const summary = summarizeTaskSync(local, merged);
  await pushBackup(config, activeSession, merged);
  return { backup: merged as MonthlaneBackupV2, session: activeSession, summary };
};
