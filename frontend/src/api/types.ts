// Mirrors backend/schemas/resume.py 1:1 (snake_case, ISO datetime strings).

export type Seniority = "junior" | "mid" | "senior" | "lead" | "principal";

export interface ExperienceEntry {
  company: string;
  title: string;
  description: string | null;
}

export interface ExtractedResume {
  is_valid_resume: boolean;
  rejection_reason: string | null;
  candidate_name: string | null;
  seniority: Seniority | null;
  total_years_experience: number | null;
  skills: string[];
  experience: ExperienceEntry[];
  profile_text: string | null;
}

export interface ResumeRead {
  id: number;
  filename: string;
  parsed_json: ExtractedResume | null;
  created_at: string;
}

// Mirrors backend/schemas/jobs.py + runs.py 1:1.

export type Recommendation = "strong_fit" | "possible_fit" | "stretch" | "not_a_fit";

// A run-level verdict: the best per-job recommendation, or "invalid" when the
// run's only analyzed postings weren't real job descriptions.
export type RunVerdict = Recommendation | "invalid";

export interface JobSkill {
  name: string;
  matched: boolean;
}

export interface JobAnalysis {
  is_valid_job_posting: boolean;
  rejection_reason: string | null;
  title: string | null;
  company: string | null;
  seniority: Seniority | null;
  years_required: number | null;
  skills: JobSkill[];
  recommendation: Recommendation;
  assessment: string;
}

export interface RunCreate {
  resume_id: number;
  job_texts: string[];
}

export interface RunRead {
  run_id: number;
  resume_id: number;
  created_at: string;
}

export interface RunJobResultRead {
  job_id: number;
  result: JobAnalysis | null;
  error: string | null;
}

export interface RunDetailRead {
  run_id: number;
  resume_id: number;
  created_at: string;
  jobs: RunJobResultRead[];
}

export interface RunSummaryRead {
  run_id: number;
  resume_id: number;
  resume_filename: string;
  candidate_name: string | null;
  top_job_title: string | null;
  job_count: number;
  best_recommendation: RunVerdict | null;
  created_at: string;
}

export interface RunAskResponse {
  run_id: number;
  question: string;
  answer: string;
}

export interface CoverLetterRead {
  job_id: number;
  cover_letter_md: string;
}
