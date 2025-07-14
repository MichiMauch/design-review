export interface Comment {
  id: string;
  x: number; // X-Koordinate der Markierung
  y: number; // Y-Koordinate der Markierung
  text: string; // Kommentar-Text
  timestamp: Date;
}

export interface PreviewData {
  url: string;
  imageUrl: string;
  comments: Comment[];
  mode: 'browse' | 'comment';
}

export interface ScreenshotApiResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface JiraConfig {
  serverUrl: string;
  username: string;
  apiToken: string;
  projectKey?: string;
}

export interface JiraIssue {
  summary: string;
  description: string;
  labels: string[];
  attachments?: string[];
}

export type Mode = 'browse' | 'comment';

export interface ScreenshotOptions {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

export interface ApiError {
  message: string;
  status: number;
}