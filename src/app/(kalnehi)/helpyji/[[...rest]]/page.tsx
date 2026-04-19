import { notFound } from "next/navigation";

/** Legacy product path; chat UI removed — always 404 for direct navigation. */
export default function HelpyJiRemovedPage() {
  notFound();
}
