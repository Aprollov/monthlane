"use client";

import { BookOpen, CalendarCheck, CheckCircle, InboxIcon, Sun } from "../icons";
import type { FlowView } from "./FlowWorkspace";

type Props = {
  activeView: FlowView;
  counts: Record<Exclude<FlowView, "month" | "completed">, number>;
  onSelect: (view: FlowView) => void;
};

const items: Array<{ view: Exclude<FlowView, "month">; label: string; icon: typeof InboxIcon }> = [
  { view: "inbox", label: "Inbox", icon: InboxIcon },
  { view: "thisWeek", label: "This Week", icon: CalendarCheck },
  { view: "today", label: "Today", icon: Sun },
  { view: "laterRead", label: "Later Read", icon: BookOpen },
  { view: "completed", label: "Completed", icon: CheckCircle },
];

export function FlowNavigation({ activeView, counts, onSelect }: Props) {
  return (
    <section className="sidebarSection flowNavigation">
      <div className="sectionTitle"><span>Flow</span><BookOpen /></div>
      <div className="flowNavList">
        {items.map(({ view, label, icon: Icon }) => (
          <button className={activeView === view ? "active" : ""} key={view} onClick={() => onSelect(view)}>
            <Icon />
            <span>{label}</span>
            {view !== "completed" && <small>{counts[view]}</small>}
          </button>
        ))}
      </div>
    </section>
  );
}
