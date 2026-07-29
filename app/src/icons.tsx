import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const Icon = ({ children, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const ChevronLeft = (props: IconProps) => <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>;
export const ChevronRight = (props: IconProps) => <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>;
export const Plus = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const Search = (props: IconProps) => <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>;
export const Sliders = (props: IconProps) => <Icon {...props}><path d="M4 6h16M7 12h10M9 18h6" /></Icon>;
export const Settings = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></Icon>;
export const X = (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const Menu = (props: IconProps) => <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const CalendarIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>;
export const InboxIcon = (props: IconProps) => <Icon {...props}><path d="M4 4h16v14H4zM4 13h4l2 3h4l2-3h4" /></Icon>;
export const Sun = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const BookOpen = (props: IconProps) => <Icon {...props}><path d="M3 5.5A4.5 4.5 0 0 1 7.5 4H11v16H7.5A4.5 4.5 0 0 0 3 21.5zM21 5.5A4.5 4.5 0 0 0 16.5 4H13v16h3.5a4.5 4.5 0 0 1 4.5 1.5z" /></Icon>;
export const CheckCircle = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></Icon>;
export const CalendarCheck = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18m-11 5 2 2 4-4" /></Icon>;
export const Check = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>;
export const Archive = (props: IconProps) => <Icon {...props}><path d="M4 7h16v13H4zM3 4h18v3H3zm6 7h6" /></Icon>;
export const RotateCcw = (props: IconProps) => <Icon {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></Icon>;
export const MoreHorizontal = (props: IconProps) => <Icon {...props}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Icon>;
export const ChevronUp = (props: IconProps) => <Icon {...props}><path d="m6 15 6-6 6 6" /></Icon>;
export const ChevronDown = (props: IconProps) => <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>;
