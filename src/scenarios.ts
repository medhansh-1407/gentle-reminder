import type { Scenario, ActivityEvent, ProblemEntry } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'fired-engineer',
    title: 'The Fired Engineer',
    subtitle: "Sarah's auth module lost after termination — replaced by knowledge graph",
    description:
      'Sarah is a backend engineer at a Pune fintech start-up. Monday: "Sarah, you own the authentication module for the client demo." Wednesday: stuck on a token-refresh bug. Friday: tried 5 libraries, nothing works. Deadline missed, Sarah is let go Monday. New hire Arjun opens an empty repository and asks: why is auth broken? Gentle Reminder shows every command, file, meeting, and AI query Sarah made.',
    events: [
      {
        id: 'e1',
        timestamp: '2024-03-11T09:30:00',
        type: 'meeting',
        title: 'Team meeting — Auth module assigned',
        detail: 'Manager: "Sarah, you own the authentication module for the client demo, ready by Friday."',
        tags: ['assignment'],
      },
      {
        id: 'e2',
        timestamp: '2024-03-13T14:20:00',
        type: 'slack',
        title: '"Stuck on token refresh" flagged',
        detail: 'Slack message to #backend-help: "Stuck on token refresh issue, none of the 3 libraries handle refresh expiry correctly"',
        tags: ['warning', 'stuck'],
      },
      {
        id: 'e3',
        timestamp: '2024-03-15T10:00:00',
        type: 'terminal',
        title: 'npm install attempts',
        detail: 'npm install passport-oauth2 → failed. npm install oauth2orize → failed. npm install simple-oauth2 → failed.',
        tags: ['failed', 'library'],
      },
      {
        id: 'e4',
        timestamp: '2024-03-15T11:30:00',
        type: 'file',
        title: 'auth/refresh.ts edited',
        detail: 'Created custom refresh endpoint in auth/refresh.ts (uncommitted, never pushed)',
        tags: ['code-edit'],
      },
      {
        id: 'e5',
        timestamp: '2024-03-18T10:00:00',
        type: 'system',
        title: 'Employee exits — HR trigger fires',
        detail: 'HR signals termination. System immediately snapshots Sarah\'s activity graph and local work files to secure server.',
        tags: ['hr-trigger', 'snapshot'],
      },
      {
        id: 'e6',
        timestamp: '2024-03-19T09:00:00',
        type: 'chatbot',
        title: 'Arjun asks chatbot',
        detail: '"Why is auth broken? What was Sarah doing on Project X?"',
        tags: ['query'],
      },
    ],
    chatbotQuestions: [
      {
        question: 'Why is auth broken? What was Sarah doing on Project X?',
        answer:
          'Sarah was assigned the auth module on Monday. She tried 5 token libraries; libraries 1-4 failed on refresh expiry. In her last session she was testing a custom refresh endpoint in auth/refresh.ts (uncommitted, restored from her snapshot). Next step she had planned: rotate the signing key. Evidence: 3 terminal sessions, 2 meetings, 1 Slack thread.',
      },
    ],
  },
  {
    id: 'recurring-crash',
    title: 'The Recurring Server Crash',
    subtitle: 'Crash #47: from panic to prevention',
    description:
      'Every Monday morning: "The server crashed over the weekend." The IT team debugs by hand each time, spends two hours, restarts nginx, moves on. Nobody writes it down. Nobody notices it is the same crash for the sixth time. Gentle Reminder detects recurrence, escalates severity to 8-10, triggers full recording, prevention flag, and auto ticket.',
    events: [
      {
        id: 'c1',
        timestamp: '2024-02-05T08:00:00',
        type: 'terminal',
        title: 'Crash 1 — Fixed manually, rated 4',
        detail: 'journalctl -u nginx shows OOM kill. Restart nginx. User rates fix "4". No recurrence detected yet.',
        tags: ['crash', 'oom'],
      },
      {
        id: 'c2',
        timestamp: '2024-02-12T08:00:00',
        type: 'terminal',
        title: 'Crash 2 — Same OOM pattern',
        detail: 'journalctl -u nginx shows OOM kill again. AI sees similar logs to Crash 1. Recurrence count: 1.',
        tags: ['crash', 'oom', 'recurring'],
      },
      {
        id: 'c3',
        timestamp: '2024-02-19T08:00:00',
        type: 'system',
        title: 'Crash 3 — AI sees similar logs',
        detail: 'AI matches crash signature against Crash 1 and 2. Recurrence count: 2. Severity escalated from 4 to 6.',
        tags: ['crash', 'oom', 'recurring'],
      },
      {
        id: 'c4',
        timestamp: '2024-02-26T08:00:00',
        type: 'terminal',
        title: 'Crash 6 — Flagged RECURRING',
        detail: 'Same Sunday 02:00 backup cron job pattern detected 6 times. Severity escalated to 8. Auto ticket created: "Implement permanent fix".',
        tags: ['crash', 'oom', 'recurring', 'auto-ticket'],
      },
      {
        id: 'c5',
        timestamp: '2024-03-04T08:00:00',
        type: 'chatbot',
        title: 'Crash 7 — Root cause shown instantly',
        detail: 'Chatbot: "This has happened 6 times. Cause: Sunday 02:00 backup cron job exhausts memory and kills nginx. Quick fix: journalctl -u nginx, restart service. Permanent fix: reschedule job and cap memory."',
        tags: ['solution'],
      },
    ],
    chatbotQuestions: [
      {
        question: 'The server crashed again. What should I do?',
        answer:
          'This has happened 6 times. Cause identified: the Sunday 02:00 backup cron job exhausts memory and kills nginx. Quick fix (3 min): journalctl -u nginx, then restart the service. Permanent fix: reschedule the job and cap its memory. A prevention ticket was created after crash #6.',
      },
    ],
  },
  {
    id: 'meeting-deadline',
    title: 'The Meeting That Saved a Deadline',
    subtitle: 'Tuesday stand-up: where knowledge is born',
    description:
      'In Tuesday\'s stand-up, the manager says: "I need the Q3 report by Friday, Priya, you\'re on it." Nobody writes it down. Thursday: Priya silently stuck on a data import, too shy to ask. Most teams discover the blocker Friday afternoon — too late. Gentle Reminder hears the assignment in the meeting, auto-creates the task, detects Priya\'s struggle via repeated searches, and alerts a backup engineer on Thursday morning.',
    events: [
      {
        id: 'm1',
        timestamp: '2024-03-12T09:00:00',
        type: 'meeting',
        title: 'Assignment heard in meeting',
        detail: 'Manager: "I need the Q3 report by Friday, Priya, you\'re on it."',
        tags: ['assignment'],
      },
      {
        id: 'm2',
        timestamp: '2024-03-12T09:15:00',
        type: 'task',
        title: 'Task + deadline auto-created',
        detail: 'System creates task "Q3 Report", owner: Priya, deadline: Friday 17:00, linked to meeting transcript.',
        tags: ['auto-task'],
      },
      {
        id: 'm3',
        timestamp: '2024-03-13T14:00:00',
        type: 'browser',
        title: 'Repeated searches on data import',
        detail: 'Priya searches "csv date format parse" 5+ times in 20 minutes. AI flags as struggle pattern.',
        tags: ['struggle', 'search'],
      },
      {
        id: 'm4',
        timestamp: '2024-03-14T11:00:00',
        type: 'system',
        title: '"Priya needs help" alert',
        detail: 'Pattern analysis spots 5+ searches on same term + terminal activity with no file edits. Alert sent to backup engineer.',
        tags: ['alert', 'nudge'],
      },
      {
        id: 'm5',
        timestamp: '2024-03-15T16:00:00',
        type: 'chatbot',
        title: 'Report delivered',
        detail: 'Backup engineer shares previous import fix. Report ships on time, client happy.',
        tags: ['resolved'],
      },
    ],
    chatbotQuestions: [
      {
        question: 'How did we handle the CSV data import for the Q3 report last time?',
        answer:
          'Priya hit this on Thursday. The import failed on mixed date formats. Fix used by the backup engineer: normalise the date column before loading, then re-run import_q3.py. Source: stand-up (Tue), Priya\'s session (Wed-Thu), helper\'s terminal history.',
      },
    ],
  },
  {
    id: 'one-question',
    title: 'The One Question Hero',
    subtitle: 'How a single "4" saved two hours',
    description:
      'Rahul, a developer, fixes a stubborn login bug just before lunch. He does not want to write documentation. The app asks one thing: "How hard was this to fix? (1-10)" and he taps 4 and moves on. That is all the effort he spends on knowledge capture. AI sees 12 terminal commands, log analysis, and failed attempts → overrides low rating, escalates to severity 7, switches on full recording.',
    events: [
      {
        id: 'o1',
        timestamp: '2024-03-14T12:30:00',
        type: 'terminal',
        title: 'Fix session begins',
        detail: '12 terminal commands run: inspect Set-Cookie headers, check env config, clear cookies, retest login flow.',
        tags: ['debug'],
      },
      {
        id: 'o2',
        timestamp: '2024-03-14T12:35:00',
        type: 'file',
        title: '3 failed attempts',
        detail: 'Attempt 1: cookie flag missing. Attempt 2: wrong env var. Attempt 3: Secure flag on non-HTTPS staging host — root cause found.',
        tags: ['failed'],
      },
      {
        id: 'o3',
        timestamp: '2024-03-14T12:45:00',
        type: 'chatbot',
        title: 'Rahul rates fix "4"',
        detail: 'Micro-tracker: "How hard was this to fix?" Rahul taps 4. AI sees 12 commands + 3 failures + log analysis → overrides rating, escalates to severity 7.',
        tags: ['rating'],
      },
      {
        id: 'o4',
        timestamp: '2024-03-15T09:00:00',
        type: 'chatbot',
        title: 'Next day — new dev asks chatbot',
        detail: '"Users get logged out immediately after login. How do I fix it?" Chatbot finds Rahul\'s session and returns exact steps.',
        tags: ['query'],
      },
    ],
    chatbotQuestions: [
      {
        question: 'Users get logged out immediately after login. How do I fix it?',
        answer:
          'Rahul fixed this yesterday (rated 4, AI severity 7). Cause: session cookie marked Secure on a non-HTTPS staging host. Steps: 1) inspect Set-Cookie headers, 2) set the flag from environment config, 3) clear cookies and retest. Files: config/session.ts.',
      },
    ],
  },
  {
    id: 'privacy-control',
    title: 'The Privacy-Conscious Employee',
    subtitle: 'My computer, my choice: trust is what makes adoption possible',
    description:
      'Meera, a senior tester, is uncomfortable with any monitoring tool. On her first day the app shows exactly what is and is not tracked, with a clear on/off toggle for each category, and tells her where the data lives. Meera tracks IDE and terminal but not web browsing. Data stays encrypted on her company device with an audit log.',
    events: [
      {
        id: 'p1',
        timestamp: '2024-03-01T09:00:00',
        type: 'system',
        title: 'Clear privacy notice',
        detail: 'App shows exactly what is tracked and what is not, with per-category on/off toggles.',
        tags: ['privacy'],
      },
      {
        id: 'p2',
        timestamp: '2024-03-01T09:05:00',
        type: 'system',
        title: 'Toggles per category',
        detail: 'Tracked: IDE and terminal. Not tracked: Personal browsing, passwords, banking, health.',
        tags: ['privacy', 'toggle'],
      },
      {
        id: 'p3',
        timestamp: '2024-03-15T10:00:00',
        type: 'file',
        title: 'IDE session captured',
        detail: 'File edits in VS Code captured (tracking ON). Data stored locally, encrypted (AES-256).',
        tags: ['captured'],
      },
      {
        id: 'p4',
        timestamp: '2024-03-15T10:30:00',
        type: 'browser',
        title: 'Web browsing NOT tracked',
        detail: 'Personal browsing session excluded per privacy toggle. AI never reads banking, health, or password fields.',
        tags: ['excluded'],
      },
    ],
    chatbotQuestions: [
      {
        question: 'What does the app know about my browsing?',
        answer:
          'Nothing. Web tracking is switched off in your settings. Currently tracked: IDE and terminal only. Stored locally, encrypted (AES-256). You can pause tracking, review every record, or request deletion at any time.',
      },
    ],
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function scenarioToProblem(scenario: Scenario): ProblemEntry {
  const events: ActivityEvent[] = scenario.events;
  return {
    id: `prob-${scenario.id}`,
    title: scenario.title,
    description: scenario.subtitle,
    assignee: scenario.title.split(' ')[0],
    severity: 8,
    userRating: 4,
    aiScore: 7,
    recurrenceCount: scenario.id === 'recurring-crash' ? 6 : scenario.id === 'fired-engineer' ? 3 : 0,
    captureLevel: 'full-screen',
    events,
    solution: scenario.chatbotQuestions[0]?.answer || '',
    meetingContext: scenario.events.find((e) => e.type === 'meeting')?.detail,
    createdAt: new Date().toISOString(),
  };
}