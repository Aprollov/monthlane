"use client";

import { BookOpen, CalendarCheck, CheckCircle, InboxIcon, Sun } from "../icons";
import type { FlowBucket } from "../types";
import type { FlowView } from "./FlowWorkspace";

type Props = {
  activeView: FlowView;
  activeBucket: FlowBucket;
  onSelect: (view: FlowView) => void;
  onSelectBucket: (bucket: FlowBucket) => void;
};

const buckets: Array<{ bucket: FlowBucket; label: string; icon: typeof BookOpen }> = [
  { bucket: "inbox", label: "Inbox", icon: InboxIcon },
  { bucket: "thisWeek", label: "This Week", icon: CalendarCheck },
  { bucket: "today", label: "Today", icon: Sun },
];

export function FlowNavigation({ activeView, activeBucket, onSelect, onSelectBucket }: Props) {
  return (
    <>
      <section className="sidebarSection flowNavigation">
        <div className="sectionTitle"><span>Flow</span><BookOpen /></div>
        <div className="flowNavList flowSubnav">
          {buckets.map(({ bucket, label, icon: Icon }) => (
            <button
              className={activeView === "flow" && activeBucket === bucket ? "active" : ""}
              aria-current={activeView === "flow" && activeBucket === bucket ? "page" : undefined}
              key={bucket}
              onClick={() => onSelectBucket(bucket)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="sidebarSection moduleNavigation">
        <button className={`sidebarNavButton ${activeView === "reading" ? "active" : ""}`} onClick={() => onSelect("reading")}>
          <BookOpen /><span>Read Later</span>
        </button>
        <button className={`sidebarNavButton ${activeView === "completed" ? "active" : ""}`} onClick={() => onSelect("completed")}>
          <CheckCircle /><span>Completed</span>
        </button>
      </section>
    </>
  );
}
