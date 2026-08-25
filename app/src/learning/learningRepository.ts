import { openMonthlaneDb } from "../database.ts";
import type { LearningProgressLog, LearningTrack } from "../types.ts";

const requestValue = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

export const learningRepository = {
  async listTracks(): Promise<LearningTrack[]> {
    const db = await openMonthlaneDb();
    try {
      const tracks = await requestValue<LearningTrack[]>(
        db.transaction("learningTracks").objectStore("learningTracks").getAll(),
      );
      return tracks.filter((track) => !track.deletedAt);
    } finally {
      db.close();
    }
  },

  async listLogs(): Promise<LearningProgressLog[]> {
    const db = await openMonthlaneDb();
    try {
      const logs = await requestValue<LearningProgressLog[]>(
        db.transaction("learningProgressLogs").objectStore("learningProgressLogs").getAll(),
      );
      return logs.filter((log) => !log.deletedAt);
    } finally {
      db.close();
    }
  },

  async saveTrack(track: LearningTrack) {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction("learningTracks", "readwrite");
      tx.objectStore("learningTracks").put(track);
      await transactionDone(tx);
    } finally {
      db.close();
    }
  },

  async saveLog(log: LearningProgressLog) {
    const db = await openMonthlaneDb();
    try {
      const tx = db.transaction("learningProgressLogs", "readwrite");
      tx.objectStore("learningProgressLogs").put(log);
      await transactionDone(tx);
    } finally {
      db.close();
    }
  },
};
