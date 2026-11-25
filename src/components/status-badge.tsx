const STATUS_CLASS: Record<string, string> = {
  NEW: "badge-status-new",
  AWAITING_CONTACT: "badge-status-awaiting",
  CONTACTED: "badge-status-contacted",
  MEETING_SET: "badge-status-meeting",
  FOLLOW_UP: "badge-status-follow",
  ACTIVE: "badge-status-active",
  QUALIFIED: "badge-status-follow",
  PROPOSAL: "badge-status-meeting",
  WON: "badge-status-active",
  CLOSED: "badge-status-closed",
  LOST: "badge-status-unsuitable",
  UNSUITABLE: "badge-status-unsuitable",
  ARCHIVED: "badge-status-archived",
};

export function StatusBadge({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const cls = STATUS_CLASS[code] || "badge";
  return <span className={`badge ${cls}`}>{label || code}</span>;
}
