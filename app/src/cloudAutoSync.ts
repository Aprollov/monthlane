import { fetchRemoteBackup, pushBackup, synchronize, type CloudConfig, type CloudSession } from "./cloud";
import { exportBackup, importBackup } from "./database";

export const CLOUD_CONFIG_KEY = "monthlane-cloud-config";
export const CLOUD_SESSION_KEY = "monthlane-cloud-session";
export const CLOUD_LAST_SYNC_KEY = "monthlane-last-sync";
export const CLOUD_SYNC_STATUS_KEY = "monthlane-sync-status";


export type SyncStatus = { at: string; status: "success" | "failed"; message?: string };

const loadJson = <T,>(key: string): T | undefined => {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return undefined; }
};

const saveSession = (session: CloudSession) => {
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
};

export const recordSyncStatus = (status: "success" | "failed", message?: string) => {
  const at = new Date().toISOString();
  localStorage.setItem(CLOUD_LAST_SYNC_KEY, at);
  localStorage.setItem(CLOUD_SYNC_STATUS_KEY, JSON.stringify({ at, status, message } satisfies SyncStatus));
};

export const getSyncStatus = (): SyncStatus | undefined => {
  const at = localStorage.getItem(CLOUD_LAST_SYNC_KEY);
  if (!at) return undefined;
  const stored = loadJson<SyncStatus>(CLOUD_SYNC_STATUS_KEY);
  if (stored?.at) return stored;
  return { at, status: "success" };
};

const loadCloudConnection = () => {
  const config = loadJson<CloudConfig>(CLOUD_CONFIG_KEY);
  const session = loadJson<CloudSession>(CLOUD_SESSION_KEY);
  if (!config?.url || !config.anonKey || !session) return undefined;
  return { config, session };
};

/** Two-way smart sync: download cloud data, merge with local, then upload the merged result. */
export const syncConnectedCloud = async (): Promise<boolean> => {
  const connection = loadCloudConnection();
  if (!connection) return false;
  try {
    const result = await synchronize(connection.config, connection.session, await exportBackup());
    await importBackup(result.backup);
    saveSession(result.session);
    recordSyncStatus("success");
    return true;
  } catch (error) {
    recordSyncStatus("failed", error instanceof Error ? error.message : "Sync failed.");
    throw error;
  }
};

/** Download only: replace local data with the cloud backup. */
export const restoreConnectedCloud = async (): Promise<boolean> => {
  const connection = loadCloudConnection();
  if (!connection) return false;
  try {
    const { backup, session } = await fetchRemoteBackup(connection.config, connection.session);
    if (backup) await importBackup(backup, "replace");
    saveSession(session);
    recordSyncStatus("success");
    return Boolean(backup);
  } catch (error) {
    recordSyncStatus("failed", error instanceof Error ? error.message : "Restore failed.");
    throw error;
  }
};

/** Upload only: push the local backup to the cloud, replacing the cloud copy. */
export const uploadConnectedCloud = async (): Promise<boolean> => {
  const connection = loadCloudConnection();
  if (!connection) return false;
  try {
    const session = await pushBackup(connection.config, connection.session, await exportBackup());
    saveSession(session);
    recordSyncStatus("success");
    return true;
  } catch (error) {
    recordSyncStatus("failed", error instanceof Error ? error.message : "Upload failed.");
    throw error;
  }
};

let startupSyncStarted = false;

/** Runs the automatic background sync once per page load, even under React StrictMode. */
export const runStartupSync = async (): Promise<boolean> => {
  if (startupSyncStarted) return false;
  startupSyncStarted = true;
  try {
    return await syncConnectedCloud();
  } catch {
    return false;
  }
};
