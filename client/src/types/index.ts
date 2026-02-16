export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  status: ApplicationStatus;
  applicationDate: string;
  location?: string;
  jobDescription?: string;
  notes?: string;
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  interview: number;
  offer: number;
  rejected: number;
  recentActivity: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  createdAt: string;
  userEmail?: string;
}

// Sprint 1: Application Analysis Types
export interface Strength {
  point: string;
  cv_evidence: string;
}

export interface Gap {
  point: string;
  impact: string;
}

export interface ApplicationAnalysis {
  id: string;
  applicationId: string;
  cvFileId: string;
  jobDescriptionHash: string;
  fitScore: number;
  strengths: Strength[];
  gaps: Gap[];
  suggestions: string[];
  aiRawResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisStats {
  totalAnalyses: number;
  averageFitScore: number;
  highestFitScore: number;
  lowestFitScore: number;
}
