"use client";

import { BookOpen, CheckCircle, GraduationCap, Sliders } from "../icons";
import type { FlowView } from "./FlowWorkspace";

type Props = {
  activeView: FlowView;
  onSelect: (view: FlowView) => void;
};

export function FlowNavigation({ activeView, onSelect }: Props) {
  const items: Array<{ view: FlowView; label: string; icon: typeof BookOpen }> = [
    { view: "flow", label: "Flow", icon: Sliders },
    { view: "reading", label: "Read Later", icon: BookOpen },
    { view: "learning", label: "Growth", icon: GraduationCap },
    { view: "completed", label: "Completed", icon: CheckCircle },
  ];
  return (
    <section className="sidebarSection moduleNavigation">
      {items.map(({ view, label, icon: Icon }) => (
        <button
          className={`sidebarNavButton ${activeView === view ? "active" : ""}`}
          aria-current={activeView === view ? "page" : undefined}
          key={view}
          onClick={() => onSelect(view)}
        >
          <Icon /><span>{label}</span>
        </button>
      ))}
    </section>
  );
}
