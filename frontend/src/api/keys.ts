export const queryKeys = {
  resumes: {
    all: ["resumes"] as const,
    detail: (resumeId: number) => ["resumes", resumeId] as const,
  },
  runs: {
    all: ["runs"] as const,
    detail: (runId: number) => ["runs", runId] as const,
    messages: (runId: number) => ["runs", runId, "messages"] as const,
  },
};
