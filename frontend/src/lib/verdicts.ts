import type { Recommendation } from "@/api/types";

export const VERDICTS: Record<Recommendation, { label: string; badge: string; rail: string }> = {
  strong_fit: {
    label: "Strong fit",
    badge: "border-fit-strong/40 bg-fit-strong/10 text-fit-strong",
    rail: "bg-fit-strong",
  },
  possible_fit: {
    label: "Possible fit",
    badge: "border-fit-possible/40 bg-fit-possible/10 text-fit-possible",
    rail: "bg-fit-possible",
  },
  stretch: {
    label: "Stretch",
    badge: "border-fit-stretch/40 bg-fit-stretch/10 text-fit-stretch",
    rail: "bg-fit-stretch",
  },
  not_a_fit: {
    label: "Not a fit",
    badge: "border-fit-none/40 bg-fit-none/10 text-fit-none",
    rail: "bg-fit-none",
  },
};
