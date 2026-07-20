import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { ApiError, listRuns } from "@/api/client";
import { queryKeys } from "@/api/keys";
import RunList, { RunListSkeleton } from "@/components/RunList";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function HistoryPage() {
  useDocumentTitle("Your analyses");
  const runsQuery = useQuery({ queryKey: queryKeys.runs.all, queryFn: listRuns });

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your analyses</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Opening one shows its saved results — it won't start a new analysis.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-sm text-sm font-medium text-accent hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          New analysis
        </Link>
      </div>

      {runsQuery.isLoading && (
        <div className="mt-6">
          <RunListSkeleton rows={4} />
        </div>
      )}

      {runsQuery.isError && (
        <p className="mt-6 text-sm text-fit-none">
          Couldn't load history:{" "}
          {runsQuery.error instanceof ApiError
            ? runsQuery.error.detail
            : "something went wrong."}
        </p>
      )}

      {runsQuery.data?.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-ink-muted">
          Nothing here yet.{" "}
          <Link to="/" className="text-accent hover:underline">
            Run your first analysis
          </Link>{" "}
          and it will show up here.
        </p>
      )}

      {runsQuery.data && runsQuery.data.length > 0 && (
        <div className="mt-6">
          <RunList runs={runsQuery.data} />
        </div>
      )}
    </section>
  );
}
