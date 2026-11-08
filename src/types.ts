export type EventType =
  | 'meeting'
  | 'email'
  | 'task'
  | 'terminal'
  | 'file'
  | 'browser'
  | 'ide'
  | 'ai'
  | 'app'
  | 'system';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  detail: string;
  severity?: number;
  tags?: string[];
}

export interface ProblemEntry {
  id: string;
  title: string;
  description: string;
  assignee: string;
  severity: number;
  userRating: number;
  aiScore: number;
  recurrenceCount: number;
  captureLevel: CaptureLevel;
  events: ActivityEvent[];
  solution: string;
  prevention?: string;
  meetingContext?: string;
  createdAt: string;
}

export type CaptureLevel =
  | 'notes-only'
  | 'terminal-only'
  | 'key-events'
  | 'partial-screen'
  | 'full-screen'
  | 'full-plus-prevention';

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  events: ActivityEvent[];
  chatbotQuestions: { question: string; answer: string }[];
}