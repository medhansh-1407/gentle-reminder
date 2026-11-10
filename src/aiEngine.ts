export type SeverityBreakdown = {
  userRating: number;
  aiScore: number;
  recurrenceCount: number;
  dynamicSeverity: number;
  captureLevel: CaptureLevel;
  reasoning: string[];
};

export type CaptureLevel =
  | 'notes-only'
  | 'terminal-only'
  | 'key-events'
  | 'partial-screen'
  | 'full-screen'
  | 'full-plus-prevention';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  eventType: string;
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

export function calculateDynamicSeverity(
  userRating: number,
  events: ActivityEvent[],
  existingProblems: ProblemEntry[],
  currentTitle: string
): SeverityBreakdown {
  const reasoning: string[] = [];

  // Base AI score from user rating (min 5 if user rated)
  let aiScore = Math.max(userRating, 5);

  // Count failure indicators from events
  const terminalCommands = events.filter((e) => e.eventType === 'terminal').length;
  const failedAttempts = events.filter(
    (e) => e.tags?.includes('failed') || e.detail.toLowerCase().includes('fail')
  ).length;
  const fileSwitches = events.filter((e) => e.eventType === 'file').length;
  const aiInteractions = events.filter((e) => e.eventType === 'ai').length;
  const sessionDuration =
    events.length > 1
      ? Math.max(0, new Date(events[events.length - 1].timestamp).getTime() -
          new Date(events[0].timestamp).getTime()) /
        1000
      : 0;

  const longSession = sessionDuration > 1800; // 30 min

  if (failedAttempts > 2) {
    aiScore += 2;
    reasoning.push(`${failedAttempts} failed attempts detected — increases complexity`);
  }
  if (terminalCommands > 3) {
    aiScore += 1;
    reasoning.push(`${terminalCommands} terminal commands — technical debugging`);
  }
  if (fileSwitches > 10) {
    aiScore += 2;
    reasoning.push(`${fileSwitches} file switches — complex workflow`);
  }
  if (aiInteractions > 0) {
    aiScore += 1;
    reasoning.push(`${aiInteractions} AI assistant interactions — novel problem space`);
  }
  if (longSession) {
    aiScore += 1;
    reasoning.push(`Long session (>30 min) — sustained focus required`);
  }

  aiScore = Math.min(aiScore, 10);

  // Recurrence detection — semantic similarity on title/keywords
  const keywordScore = (text: string) => {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    return new Set(words);
  };

  const currentKeywords = keywordScore(currentTitle + ' ' + events.map((e) => e.detail).join(' '));
  let recurrenceCount = 0;

  for (const p of existingProblems) {
    const pKeywords = keywordScore(p.title + ' ' + p.description);
    const intersection = [...currentKeywords].filter((w) => pKeywords.has(w));
    if (intersection.length >= 2) {
      recurrenceCount++;
    }
  }

  if (recurrenceCount > 0) {
    reasoning.push(`Recurring problem — seen ${recurrenceCount} time(s) before`);
  }

  // Dynamic severity = user rating + AI + recurrence escalation
  const recurrenceEscalation = Math.min(recurrenceCount * 2, 5);
  const aiMultiplier = aiScore >= 8 ? 1.2 : aiScore <= 3 ? 0.8 : 1.0;

  let dynamicSeverity =
    Math.ceil(Math.max(userRating, 5) * aiMultiplier + recurrenceEscalation);
  dynamicSeverity = Math.min(Math.max(dynamicSeverity, 1), 10);

  // Determine capture level
  let captureLevel: CaptureLevel = 'notes-only';
  if (dynamicSeverity <= 3) captureLevel = 'notes-only';
  else if (dynamicSeverity <= 5) captureLevel = 'terminal-only';
  else if (dynamicSeverity <= 7) captureLevel = 'key-events';
  else if (dynamicSeverity <= 9) captureLevel = 'full-screen';
  else captureLevel = 'full-plus-prevention';

  return {
    userRating,
    aiScore,
    recurrenceCount,
    dynamicSeverity,
    captureLevel,
    reasoning,
  };
}

export function generatePreventionTicket(problem: ProblemEntry): string {
  return [
    `PREVENTION TICKET: ${problem.title}`,
    `Severity: ${problem.severity}/10 (escalated due to recurrence)`,
    `Occurrences: ${problem.recurrenceCount}`,
    `Root cause: ${problem.description}`,
    `Recommended fix: ${problem.solution}`,
    `Prevention: ${problem.prevention || 'Investigate root cause and implement permanent fix'}`,
  ].join('\n');
}

export function chatbotSearch(
  query: string,
  problems: ProblemEntry[]
): { problem: ProblemEntry; confidence: number } | null {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean);
  if (qWords.length === 0) return null;

  let best: { problem: ProblemEntry; confidence: number } | null = null;

  for (const p of problems) {
    const text = (p.title + ' ' + p.description + ' ' + p.solution + ' ' +
      p.events.map((e) => e.detail).join(' ')).toLowerCase();
    let matches = 0;
    for (const w of qWords) {
      if (text.includes(w)) matches++;
    }
    const confidence = matches / qWords.length;
    if (confidence > 0.3 && (!best || confidence > best.confidence)) {
      best = { problem: p, confidence };
    }
  }

  return best;
}