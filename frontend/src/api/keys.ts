export const queryKeys = {
  resumes: {
    all: ["resumes"] as const,
  },
  runs: {
    all: ["runs"] as const,
    detail: (runId: number) => ["runs", runId] as const,
  },
};
