import type { Recommendation } from "@/api/types";
import { VERDICTS } from "@/lib/verdicts";

export default function VerdictBadge({ recommendation }: { recommendation: Recommendation }) {
  const verdict = VERDICTS[recommendation];
  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-[0.12em] uppercase ${verdict.badge}`}
    >
      {verdict.label}
    </span>
  );
}
