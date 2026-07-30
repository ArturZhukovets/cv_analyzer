import type {
  CoverLetterRead,
  ExtractedResume,
  ResumeDetail,
  ResumeRead,
  RunAskResponse,
  RunMessageRead,
  RunCreate,
  RunDetailRead,
  RunRead,
  RunSummaryRead,
} from "@/api/types";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // non-JSON error body — keep statusText
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function getHealth(): Promise<{ message: string }> {
  return request("/resume/health");
}

export function listResumes(): Promise<ResumeRead[]> {
  return request("/resume");
}

export function getResume(resumeId: number): Promise<ResumeDetail> {
  return request(`/resume/${resumeId}`);
}

export function updateResume(
  resumeId: number,
  payload: ExtractedResume,
): Promise<ResumeDetail> {
  return request(`/resume/${resumeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteResume(resumeId: number): Promise<void> {
  return request(`/resume/${resumeId}`, { method: "DELETE" });
}

export function uploadResume(file: File): Promise<ResumeRead> {
  const formData = new FormData();
  formData.append("file", file);
  // No manual Content-Type: the browser sets the multipart boundary.
  return request("/resume/upload", { method: "POST", body: formData });
}

export function createRun(payload: RunCreate): Promise<RunRead> {
  return request("/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getRun(runId: number): Promise<RunDetailRead> {
  return request(`/runs/${runId}`);
}

export function listRuns(): Promise<RunSummaryRead[]> {
  return request("/runs");
}

export function askRun(runId: number, question: string): Promise<RunAskResponse> {
  return request(`/runs/${runId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export function getRunMessages(runId: number): Promise<RunMessageRead[]> {
  return request(`/runs/${runId}/messages`);
}

export function createCoverLetter(jobId: number, regenerate = false): Promise<CoverLetterRead> {
  return request(`/jobs/${jobId}/cover-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regenerate }),
  });
}
