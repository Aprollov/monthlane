import { synchronize, type CloudConfig, type CloudSession } from "./cloud";
import { exportBackup, importBackup } from "./database";

export const CLOUD_CONFIG_KEY = "monthlane-cloud-config";
export const CLOUD_SESSION_KEY = "monthlane-cloud-session";
export const CLOUD_LAST_SYNC_KEY = "monthlane-last-sync";

const loadJson = <T,>(key: string): T | undefined => {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return undefined; }
};

export const syncConnectedCloud = async () => {
  const config = loadJson<CloudConfig>(CLOUD_CONFIG_KEY);
  const session = loadJson<CloudSession>(CLOUD_SESSION_KEY);
  if (!config?.url || !config.anonKey || !session) return false;

  const result = await synchronize(config, session, await exportBackup());
  await importBackup(result.backup);
  localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(result.session));
  localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
  return true;
};
