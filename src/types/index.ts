// User types
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Application types
export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  position: string;
  status: ApplicationStatus;
  applicationDate: Date;
  location?: string;
  jobDescription?: string;
  notes?: string;
  sourceLink?: string;
  reminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// File types
export interface FileMetadata {
  id: string;
  applicationId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: Date;
}

// Audit types
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  id: string;
  userId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  beforeData?: any;
  afterData?: any;
  timestamp: Date;
}

// DTOs
export interface CreateApplicationDTO {
  companyName: string;
  position: string;
  status: ApplicationStatus;
  applicationDate: string;
  location?: string;
  jobDescription?: string;
  notes?: string;
  sourceLink?: string;
  reminderDate?: string;
}

export interface UpdateApplicationDTO {
  companyName?: string;
  position?: string;
  status?: ApplicationStatus;
  applicationDate?: string;
  location?: string;
  jobDescription?: string;
  notes?: string;
  sourceLink?: string;
  reminderDate?: string;
}

export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Statistics types
export interface UserStatistics {
  totalApplications: number;
  interviewCount: number;
  offerCount: number;
  rejectedCount: number;
}

export interface SystemStatistics {
  totalUsers: number;
  totalApplications: number;
  topCompanies: CompanyStats[];
  averageResponseTime: number;
}

export interface CompanyStats {
  companyName: string;
  applicationCount: number;
}

export interface Activity {
  id: string;
  companyName: string;
  position: string;
  status: ApplicationStatus;
  applicationDate: Date;
}

// Auth types
export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// Request extensions
export interface AuthRequest extends Express.Request {
  user?: User;
}

// Application Analysis types (Sprint 1)
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
  createdAt: Date;
  updatedAt: Date;
}
