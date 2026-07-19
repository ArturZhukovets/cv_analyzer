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
