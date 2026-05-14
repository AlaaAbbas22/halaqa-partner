import type { Metadata } from "next";

import { ChatPage } from "./chat-page";

export const metadata: Metadata = {
  title: "Reflection chat — Tafseer Halaqa",
  description:
    "Select ayahs, then reflect with a Gemini-guided tafseer halaqa focused on meaning and application.",
};

export default function ChatRoutePage() {
  return <ChatPage />;
}
