"use client";

import { CardDetailFeedback } from "@/components/CardDetailFeedback";

export default function Error({ retry }: { retry: () => void }) {
  // Next's retry refreshes the server render and clears the error boundary together.
  return <CardDetailFeedback retry={retry} />;
}
