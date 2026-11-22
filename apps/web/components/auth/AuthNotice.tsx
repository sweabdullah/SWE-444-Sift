import type { ReactNode } from "react";
import { AuthIcon } from "./AuthIcon";
export function AuthNotice({
  children,
  tone = "neutral",
  id,
}: {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
  id?: string;
}) {
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      tabIndex={-1}
      className={`flex gap-3 rounded-md border p-4 text-sm leading-6 outline-none ${tone === "success" ? "border-ice bg-ice/30" : "border-line bg-mist"}`}
    >
      <span className="mt-0.5 shrink-0">
        <AuthIcon kind={tone === "success" ? "check" : tone === "error" ? "alert" : "lock"} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
