export function AuthIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: "lock" | "source" | "language" | "eye" | "hidden" | "check" | "alert" | "arrow";
  className?: string;
}) {
  const paths = {
    lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12v11H6zM12 14v3",
    source: "M9 5H5v15h14V5h-4M9 3h6v4H9zM8 12h8M8 16h6",
    language: "M3 5h12M9 3v2M6 5c0 5 3 8 7 10M13 5c0 5-3 8-7 10M14 21l4-11 4 11M16 17h4",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    hidden:
      "M3 3l18 18M10 5a13 13 0 0 1 12 7s-1 2-3 4M6 6a20 20 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1M10 10a3 3 0 0 0 4 4",
    check: "M5 12l4 4L19 6",
    alert: "M12 8v5M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    arrow: "M5 12h14M14 7l5 5-5 5",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
