"use client";

import { Check } from "../icons";

type Props = {
  checked: boolean;
  label: string;
  onChange: () => void;
};

export function TaskCheckbox({ checked, label, onChange }: Props) {
  return (
    <button
      type="button"
      className={`taskCheckbox ${checked ? "checked" : ""}`}
      aria-label={`${checked ? "Reopen" : "Complete"} ${label}`}
      aria-pressed={checked}
      onClick={onChange}
    >
      {checked && <Check />}
    </button>
  );
}
