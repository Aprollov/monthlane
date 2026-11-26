import { useState, type FormEvent } from "react";
import type { CalendarEvent, DocumentRecord } from "./types";
import { getDeviceId } from "./device";
import { categoryOf, documentCategories, expiryStatus, type DocumentCategory } from "./documentExpiry";
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
  const [category, setCategory] = useState<DocumentCategory>("ids");
  const [expiry, setExpiry] = useState("");
  const doc = records.find(r => r.id === selected);
  const byId = new Map(events.map(e => [e.id, e]));
  const eventFor = (d: DocumentRecord) => d.renewalEventId ? byId.get(d.renewalEventId) : undefined;
  const progress = (event?: CalendarEvent) => !event ? "Not scheduled" : event.startDate < today ? `${event.startDate} · Pending confirmation` : event.startDate;
  const event = doc && eventFor(doc);
  const open = (id?: string, next: typeof form = null) => {
    const record = records.find(r => r.id === id);
    setCategory(categoryOf(record)); setExpiry(next === "edit" ? record?.expiry ?? "" : "");
    select(id); setForm(next); setError("");
  };
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
      void persist({ ...(doc ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), category, name: field("name"), expiry: field("expiry"), notes: field("notes"), updatedAt: "", deviceId: getDeviceId() });
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
      {Object.entries(documentCategories).map(([key,label]) => {
        const group = records.filter(d => categoryOf(d) === key).sort((a,b) => a.expiry.localeCompare(b.expiry) || a.name.localeCompare(b.name));
        if (!group.length) return null;
        return <section key={key} className="documentGroup"><h2>{label}</h2>{group.map(d => {
          const scheduled = eventFor(d), status = expiryStatus(d,today);
          return <button className="documentRow" key={d.id} onClick={() => open(d.id)}>
            <strong>{d.name}</strong><span><time dateTime={d.expiry}>Expires {d.expiry}</time>
              {scheduled && ` · Renewal ${progress(scheduled)}`}{status && <span className="expiryNear"> · {status}</span>}
            </span></button>;
        })}</section>;
      })}
    </div> : <div className="documentCard documentDetail">
      {form ? <form key={form} className="eventForm" onSubmit={submit}>
        <h2>{form === "edit" ? doc ? "Edit document" : "Add document" : form === "renew" ? "Record renewal" : "Booking reminder"}</h2>
        {form === "edit" && <><label>Category<select value={category} onChange={e => {
          const next = e.target.value as DocumentCategory;
          if (next === "cards") setExpiry(expiry.slice(0,7));
          else if (category === "cards") setExpiry("");
          setCategory(next);
        }}>{Object.entries(documentCategories).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label>{category === "cards" ? "Card nickname" : "Name"}<input name="name" required defaultValue={doc?.name} /></label></>}
        {form !== "appointment" && <label>{form === "renew" ? "New expiry" : "Expiry"} {category === "cards" ? "month" : "date"}<input name="expiry" type={category === "cards" ? "month" : "date"} pattern={category === "cards" ? "[0-9]{4}-(0[1-9]|1[0-2])" : undefined} placeholder={category === "cards" ? "YYYY-MM" : undefined} required value={expiry} onChange={e=>setExpiry(e.target.value)} /></label>}
        {form === "edit" && <label>Notes<textarea name="notes" rows={3} defaultValue={doc?.notes} /></label>}
        {form === "appointment" && <><label>Date<input name="date" type="date" required defaultValue={doc?.appointment?.date} /></label><label>Time<input name="time" type="time" required defaultValue={doc?.appointment?.time ?? "09:00"} /></label></>}
        {form === "renew" && <p>The calendar event stays in your history. This clears the current booking reminder. Update any reminders already sent to Apple Reminders manually.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="documentActions"><button className="primaryButton" disabled={busy}>Save</button><button type="button" className="secondaryButton" disabled={busy} onClick={() => open(doc?.id)}>Cancel</button></div>
      </form> : doc && <>
        <button className="textButton" onClick={() => open()}>‹ All documents</button>
        <h2>{doc.name}</h2><dl><dt>Category</dt><dd>{documentCategories[categoryOf(doc)]}</dd><dt>{categoryOf(doc) === "cards" ? "Expiry month" : "Expiry date"}</dt><dd>{doc.expiry}</dd><dt>Renewal appointment</dt><dd>{progress(event)} {event && !event.allDay && event.startTime}</dd>
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
