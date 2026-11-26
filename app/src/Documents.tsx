import { useState, type FormEvent } from "react";
import type { CalendarEvent, DocumentRecord } from "./types";
import { getDeviceId } from "./device";
import { fromDateKey, toDateKey } from "./dates";
import { SendReminders } from "./ReminderPanel";
import "./documents.css";

type Props = {
  records: DocumentRecord[]; events: CalendarEvent[]; today: string;
  onSave: (doc: DocumentRecord) => Promise<void>;
  onSchedule: (doc: DocumentRecord, event?: CalendarEvent) => void;
  onView: (event: CalendarEvent) => void;
};

export function Documents({ records, events, today, onSave, onSchedule, onView }: Props) {
  const [selected, select] = useState<string>();
  const [form, setForm] = useState<"edit" | "appointment" | "renew" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const doc = records.find(r => r.id === selected);
  const byId = new Map(events.map(e => [e.id, e]));
  const eventFor = (d: DocumentRecord) => d.renewalEventId ? byId.get(d.renewalEventId) : undefined;
  const progress = (event?: CalendarEvent) => !event ? "Not scheduled" : event.startDate < today ? `${event.startDate} · Pending confirmation` : event.startDate;
  const event = doc && eventFor(doc);
  const soon = fromDateKey(today); soon.setDate(soon.getDate() + 30);
  const open = (id?: string, next: typeof form = null) => { select(id); setForm(next); setError(""); };
  async function persist(next: DocumentRecord) {
    setBusy(true);
    try {
      await onSave({ ...next, updatedAt: new Date().toISOString(), deviceId: getDeviceId() });
      open(next.id);
    } catch { setError("Could not save this document. Please try again."); }
    finally { setBusy(false); }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    if (form === "edit") {
      if (!field("name")) { setError("Enter a document name."); return; }
      void persist({ ...(doc ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), name: field("name"), expiry: field("expiry"), notes: field("notes"), updatedAt: "", deviceId: getDeviceId() });
    } else if (form === "renew" && doc) {
      if (field("expiry") <= doc.expiry) { setError("Enter an expiry date later than the current expiry."); return; }
      void persist({ ...doc, expiry: field("expiry"), renewalEventId: undefined, appointment: undefined });
    } else if (form === "appointment" && doc) {
      void persist({ ...doc, appointment: { date: field("date"), time: field("time") } });
    }
  }
  return <section className="documentsArea">
    <header><h1>Documents</h1>{!doc && !form && <button className="primaryButton" onClick={() => open(undefined, "edit")}>+ Add</button>}</header>
    {!form && !doc ? <div className="documentCard">
      {records.length === 0 && <p>No documents yet.</p>}
      {[...records].sort((a,b) => a.expiry.localeCompare(b.expiry) || a.name.localeCompare(b.name)).map(d => <button className="documentRow" key={d.id} onClick={() => open(d.id)}>
        <strong>{d.name}</strong><span><time className={d.expiry <= toDateKey(soon) ? "expiryNear" : ""}>Expires {d.expiry}</time> · {progress(eventFor(d))}</span>
      </button>)}
    </div> : <div className="documentCard documentDetail">
      {form ? <form key={form} className="eventForm" onSubmit={submit}>
        <h2>{form === "edit" ? doc ? "Edit document" : "Add document" : form === "renew" ? "Record renewal" : "Booking reminder"}</h2>
        {form === "edit" && <label>Name<input name="name" required defaultValue={doc?.name} /></label>}
        {form !== "appointment" && <label>{form === "renew" ? "New expiry date" : "Expiry date"}<input name="expiry" type="date" required defaultValue={form === "edit" ? doc?.expiry : ""} /></label>}
        {form === "edit" && <label>Notes<textarea name="notes" rows={3} defaultValue={doc?.notes} /></label>}
        {form === "appointment" && <><label>Date<input name="date" type="date" required defaultValue={doc?.appointment?.date} /></label><label>Time<input name="time" type="time" required defaultValue={doc?.appointment?.time ?? "09:00"} /></label></>}
        {form === "renew" && <p>The calendar event stays in your history. This clears the current booking reminder. Update any reminders already sent to Apple Reminders manually.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="documentActions"><button className="primaryButton" disabled={busy}>Save</button><button type="button" className="secondaryButton" disabled={busy} onClick={() => open(doc?.id)}>Cancel</button></div>
      </form> : doc && <>
        <button className="textButton" onClick={() => open()}>‹ All documents</button>
        <h2>{doc.name}</h2><dl><dt>Expiry date</dt><dd>{doc.expiry}</dd><dt>Renewal appointment</dt><dd>{progress(event)} {event && !event.allDay && event.startTime}</dd>
        <dt>Booking reminder</dt><dd>{doc.appointment ? `${doc.appointment.date} · ${doc.appointment.time}` : "None"}</dd></dl>
        {doc.notes && <p className="documentNotes">{doc.notes}</p>}
        <div className="documentActions"><button className="primaryButton" onClick={() => event ? onView(event) : onSchedule(doc)}>{event ? "View in calendar" : "Schedule renewal"}</button>
        {event && <button className="secondaryButton" onClick={() => onSchedule(doc,event)}>Edit schedule</button>}</div>
        <div className="documentActions"><button className="textButton" onClick={() => open(doc.id,"edit")}>Edit document</button><button className="textButton" onClick={() => open(doc.id,"appointment")}>{doc.appointment ? "Edit booking reminder" : "Add booking reminder"}</button><button className="textButton" onClick={() => open(doc.id,"renew")}>Record renewal</button></div>
        {doc.appointment && <><SendReminders draft={{ title: `预约换领${doc.name}`, startDate:doc.appointment.date, allDay:false, notes:doc.notes }} rules={[{ id:doc.id, kind:"absolute", ...doc.appointment }]} />
          <button className="textButton" disabled={busy} onClick={() => void persist({...doc, appointment:undefined})}>Remove booking reminder</button></>}
        {error && <p role="alert">{error}</p>}
      </>}
    </div>}
  </section>;
}
