"use client";

import { createContext, useContext, type ReactNode } from "react";

interface FeedbackCopy {
  loading: string;
  error: string;
  retry: string;
}

// The server layout supplies only these strings, rather than bundling both message catalogues.
const FeedbackContext = createContext<FeedbackCopy | null>(null);

export function CardDetailFeedbackProvider({
  copy,
  children,
}: {
  copy: FeedbackCopy;
  children: ReactNode;
}) {
  return <FeedbackContext.Provider value={copy}>{children}</FeedbackContext.Provider>;
}

export function CardDetailFeedback({ retry }: { retry?: () => void }) {
  const copy = useContext(FeedbackContext);
  if (!copy) throw new Error("Card detail feedback requires its locale layout");
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <p role={retry ? "alert" : "status"}>{retry ? copy.error : copy.loading}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="rounded-md border border-line bg-white px-4 py-2 hover:border-platinum-deep"
        >
          {copy.retry}
        </button>
      )}
    </div>
  );
}
