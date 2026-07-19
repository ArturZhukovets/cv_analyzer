export const queryKeys = {
  resumes: {
    all: ["resumes"] as const,
  },
  runs: {
    detail: (runId: number) => ["runs", runId] as const,
  },
};
