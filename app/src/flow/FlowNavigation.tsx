"use client";

import { BookOpen, CheckCircle } from "../icons";
import type { FlowView } from "./FlowWorkspace";

type Props = {
  activeView: FlowView;
  onSelect: (view: FlowView) => void;
};

const items: Array<{ view: Exclude<FlowView, "month">; label: string; icon: typeof BookOpen }> = [
  { view: "flow", label: "Flow", icon: BookOpen },
  { view: "completed", label: "Completed", icon: CheckCircle },
];

export function FlowNavigation({ activeView, onSelect }: Props) {
  return (
    <section className="sidebarSection flowNavigation">
      <div className="sectionTitle"><span>Flow</span><BookOpen /></div>
      <div className="flowNavList">
        {items.map(({ view, label, icon: Icon }) => (
          <button className={activeView === view ? "active" : ""} aria-current={activeView === view ? "page" : undefined} key={view} onClick={() => onSelect(view)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
