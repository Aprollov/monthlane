"use client";

import { useRef, useState } from "react";
import { signIn, signUp, synchronize, type CloudConfig, type CloudSession } from "./cloud";
import { exportBackup, importBackup } from "./database";
import { X } from "./icons";
import type { MonthlaneBackup } from "./types";

const CONFIG_KEY = "monthlane-cloud-config";
const SESSION_KEY = "monthlane-cloud-session";
const LAST_SYNC_KEY = "monthlane-last-sync";

const loadJson = <T,>(key: string): T | undefined => {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return undefined; }
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
};

export function SettingsDrawer({ open, onClose, onChanged, notify }: Props) {
  const [config, setConfig] = useState<CloudConfig>(() => loadJson<CloudConfig>(CONFIG_KEY) ?? { url: "", anonKey: "" });
  const [session, setSession] = useState<CloudSession | undefined>(() => loadJson<CloudSession>(SESSION_KEY));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(() => localStorage.getItem(LAST_SYNC_KEY) ?? "");
  const fileInput = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const saveConfig = () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    notify("Cloud settings saved.");
  };

  const downloadBackup = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `monthlane-backup-${backup.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    notify("Backup downloaded.");
  };

  const restoreBackup = async (file?: File) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as MonthlaneBackup;
      await importBackup(backup);
      await onChanged();
      notify("Backup merged successfully.");
    } catch (restoreError) {
      notify(restoreError instanceof Error ? restoreError.message : "Could not restore this backup.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const authenticate = async (mode: "signin" | "signup") => {
    setBusy(true);
    setError("");
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      if (mode === "signin") {
        const next = await signIn(config, email, password);
        setSession(next);
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        notify("Signed in. You can sync now.");
      } else {
        const result = await signUp(config, email, password);
        if (result.needsConfirmation) notify("Check your email, confirm the account, then sign in.");
        else if (result.session) {
          setSession(result.session);
          localStorage.setItem(SESSION_KEY, JSON.stringify(result.session));
          notify("Account created.");
        }
      }
      setPassword("");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const result = await synchronize(config, session, await exportBackup());
      await importBackup(result.backup);
      await onChanged();
      setSession(result.session);
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.session));
      const syncedAt = new Date().toISOString();
      setLastSync(syncedAt);
      localStorage.setItem(LAST_SYNC_KEY, syncedAt);
      notify("All devices are up to date.");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="drawerScrim" onClick={onClose} aria-label="Close settings" />
      <aside className="eventDrawer settingsDrawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="drawerHeader">
          <div><p className="eyebrow">Preferences & data</p><h2 id="settings-title">Settings</h2></div>
          <button className="iconButton" onClick={onClose} aria-label="Close settings"><X /></button>
        </header>

        <section className="settingsSection">
          <div className="settingsHeading"><div><h3>Backup and restore</h3><p>Keep a portable copy of everything in your calendar.</p></div></div>
          <div className="settingsActions">
            <button className="secondaryButton" onClick={() => void downloadBackup()}>Download backup</button>
            <button className="secondaryButton" onClick={() => fileInput.current?.click()}>Restore backup</button>
            <input ref={fileInput} className="visuallyHidden" type="file" accept="application/json,.json" onChange={(event) => void restoreBackup(event.target.files?.[0])} />
          </div>
          <p className="settingsHint">Restoring safely merges records and keeps the newest version of each event.</p>
        </section>

        <section className="settingsSection">
          <div className="settingsHeading">
            <div><h3>Cloud sync</h3><p>Supabase keeps your calendar synchronized across devices.</p></div>
            <span className={`syncBadge ${session ? "connected" : ""}`}>{session ? "Connected" : "Not connected"}</span>
          </div>

          {!session ? (
            <div className="settingsForm">
              <label>Supabase project URL<input value={config.url} placeholder="https://project.supabase.co" onChange={(event) => setConfig({ ...config, url: event.target.value })} /></label>
              <label>Supabase anon key<input type="password" value={config.anonKey} placeholder="Publishable anon key" onChange={(event) => setConfig({ ...config, anonKey: event.target.value })} /></label>
              <button className="textButton" type="button" onClick={saveConfig}>Save connection settings</button>
              <div className="settingsDivider" />
              <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Password<input type="password" autoComplete="current-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              {error && <p className="settingsError">{error}</p>}
              <div className="settingsActions">
                <button className="primaryButton" disabled={busy || !config.url || !config.anonKey || !email || !password} onClick={() => void authenticate("signin")}>{busy ? "Connecting…" : "Sign in"}</button>
                <button className="secondaryButton" disabled={busy || !config.url || !config.anonKey || !email || !password} onClick={() => void authenticate("signup")}>Create account</button>
              </div>
            </div>
          ) : (
            <div className="accountCard">
              <div><strong>{session.user.email}</strong><span>{lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : "Not synced yet"}</span></div>
              {error && <p className="settingsError">{error}</p>}
              <div className="settingsActions">
                <button className="primaryButton" disabled={busy} onClick={() => void syncNow()}>{busy ? "Syncing…" : "Sync now"}</button>
                <button className="secondaryButton" onClick={() => {
                  setSession(undefined);
                  localStorage.removeItem(SESSION_KEY);
                  notify("Signed out.");
                }}>Sign out</button>
              </div>
            </div>
          )}
          <p className="settingsHint">Your calendar remains available offline. Sync merges changes using each record’s latest edit time.</p>
        </section>
      </aside>
    </>
  );
}
