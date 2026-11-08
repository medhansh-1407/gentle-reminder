import React, { useState, useCallback, useMemo } from 'react';
import {
  Layers,
  Terminal,
  FileText,
  Globe,
  Database,
  Monitor,
  Brain,
  Bot,
  BarChart3,
  ShieldAlert,
  Play,
  LayoutDashboard,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Activity,
  FileCheck,
} from 'lucide-react';
import { calculateDynamicSeverity, chatbotSearch, type ProblemEntry, type ActivityEvent } from './aiEngine';
import { SCENARIOS, getScenarioById, scenarioToProblem } from './scenarios';

const VIEW_SCENARIOS = 'scenarios';
const VIEW_LOGGER = 'logger';
const VIEW_AI = 'ai';
const VIEW_GRAPH = 'graph';
const VIEW_CHATBOT = 'chatbot';
const VIEW_DASHBOARD = 'dashboard';

function App() {
  const [view, setView] = useState<string>(VIEW_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [problems, setProblems] = useState<ProblemEntry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [currentSessionEvents, setCurrentSessionEvents] = useState<ActivityEvent[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState<{ problem: ProblemEntry; confidence: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const navigateTo = useCallback((v: string) => {
    setView(v);
    setChatResult(null);
    setChatQuery('');
  }, []);

  // Select scenario → load its events into activity log
  const selectScenario = useCallback((id: string) => {
    const scenario = getScenarioById(id);
    if (!scenario) return;
    setSelectedScenarioId(id);
    setActivityLog(scenario.events);
    setCurrentSessionEvents([...scenario.events]);
    const problem = scenarioToProblem(scenario);
    setProblems([problem, ...problems]);
    navigateTo(VIEW_LOGGER);
  }, [problems, navigateTo]);

  // Rate the current fix → AI inference
  const rateFix = useCallback((rating: number) => {
    setUserRating(rating);
    const current = activityLog[activityLog.length - 1];
    if (!current) return;

    const breakdown = calculateDynamicSeverity(rating, currentSessionEvents, problems, current.title);
    const captureConfig: Record<string, string> = {
      'notes-only': 'Notes only — no recording',
      'terminal-only': 'Terminal + key events captured',
      'key-events': 'Key events + partial screen recording',
      'full-screen': 'Full screen recording + terminal + files',
      'full-plus-prevention': 'Full screen recording + meeting transcripts + prevention guidance + auto ticket',
    };

    const newProblem: ProblemEntry = {
      id: `prob-${Date.now()}`,
      title: current.title,
      description: current.detail,
      assignee: 'Current User',
      severity: breakdown.dynamicSeverity,
      userRating: rating,
      aiScore: breakdown.aiScore,
      recurrenceCount: breakdown.recurrenceCount,
      captureLevel: breakdown.captureLevel,
      events: [...currentSessionEvents],
      solution: breakdown.recurrenceCount > 0
        ? 'Auto-generated prevention ticket created for recurring issue.'
        : 'Documented fix steps from captured activity log.',
      prevention: breakdown.recurrenceCount > 0
        ? `Root cause: ${current.detail}. Recommended: Investigate pattern and implement permanent fix.`
        : undefined,
      meetingContext: current.tags?.includes('meeting') ? current.detail : undefined,
      createdAt: new Date().toISOString(),
    };

    setProblems([newProblem, ...problems]);
    setIsRecording(breakdown.captureLevel === 'full-screen' || breakdown.captureLevel === 'full-plus-prevention');

    alert(
      `AI Inference Complete\n\n` +
      `User Rating: ${rating}/10\n` +
      `AI Score: ${breakdown.aiScore}/10\n` +
      `Recurrences: ${breakdown.recurrenceCount}\n` +
      `Dynamic Severity: ${breakdown.dynamicSeverity}/10\n` +
      `Capture Level: ${breakdown.captureLevel.replace('-', ' ')}\n` +
      `Recording: ${isRecording ? 'ON' : 'OFF'}\n\n` +
      `Reasoning:\n${breakdown.reasoning.join('\n')}`
    );
  }, [activityLog, currentSessionEvents, problems]);

  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    const result = chatbotSearch(chatQuery, problems);
    setChatResult(result);
  }, [chatQuery, problems]);

  const severityColor = (s: number) => {
    if (s <= 3) return 'text-green-600 bg-green-50 border-green-100';
    if (s <= 6) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const severityLabel = (s: number) => {
    if (s <= 3) return 'Simple';
    if (s <= 6) return 'Moderate';
    return 'Critical';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gentle Reminder</h1>
            <p className="text-slate-300 text-sm">Coders in Pune Hackathon — Round 2 Build</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex gap-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => navigateTo(VIEW_SCENARIOS)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_SCENARIOS
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" /> Scenarios
        </button>
        <button
          onClick={() => navigateTo(VIEW_LOGGER)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_LOGGER
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4 mr-2" /> Activity Logger
        </button>
        <button
          onClick={() => navigateTo(VIEW_AI)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_AI
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Brain className="w-4 h-4 mr-2" /> AI Inference
        </button>
        <button
          onClick={() => navigateTo(VIEW_GRAPH)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_GRAPH
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" /> Knowledge Graph
        </button>
        <button
          onClick={() => navigateTo(VIEW_CHATBOT)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_CHATBOT
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-4 h-4 mr-2" /> Chatbot
        </button>
        <button
          onClick={() => navigateTo(VIEW_DASHBOARD)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === VIEW_DASHBOARD
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-2" /> Senior Dashboard
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Scenarios View */}
        {view === VIEW_SCENARIOS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Real-World Scenarios</h2>
                <p className="text-slate-600">
                  Pick a scenario to see Gentle Reminder capture the full computer log, run AI inference,
                  and preserve knowledge before someone leaves.
                </p>
              </div>
              <button
                onClick={() => {
                  setActivityLog([]);
                  setCurrentSessionEvents([]);
                  setUserRating(null);
                  setProblems([]);
                  setIsRecording(false);
                }}
                className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Clear all data
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SCENARIOS.map((scenario) => (
                <div
                  key={scenario.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer group"
                  onClick={() => selectScenario(scenario.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Play className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{scenario.title}</h3>
                  <p className="text-slate-500 text-sm mb-3">{scenario.subtitle}</p>
                  <p className="text-slate-600 text-xs leading-relaxed mb-4">{scenario.description}</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded">
                    <ArrowRight className="w-3 h-3" /> Open scenario
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Logger View */}
        {view === VIEW_LOGGER && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Activity Logger</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newEvent: ActivityEvent = {
                      id: `evt-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      type: 'terminal',
                      title: 'Manual terminal command',
                      detail: 'npm install express --save',
                      tags: ['manual'],
                    };
                    setCurrentSessionEvents((prev) => [...prev, newEvent]);
                    setActivityLog((prev) => [...prev, newEvent]);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-colors"
                >
                  <Terminal className="w-4 h-4 mr-2" /> Add Event
                </button>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRecording ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isRecording ? 'Recording ON' : 'Recording OFF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live event stream */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Live Event Stream
                  {currentSessionEvents.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                      {currentSessionEvents.length} events
                    </span>
                  )}
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto border border-slate-100 rounded-lg p-4 bg-slate-50">
                  {currentSessionEvents.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">No events captured yet. Select a scenario or add events.</p>
                  ) : (
                    currentSessionEvents.map((ev) => (
                      <div key={ev.id} className="flex gap-3 p-3 bg-white rounded border border-slate-100">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-blue-50 text-blue-600 shrink-0">
                          {ev.type.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{ev.title}</div>
                          <div className="text-xs text-slate-500 truncate">{ev.detail}</div>
                          <div className="text-xs text-slate-400 mt-1">{ev.timestamp.split('T')[1]?.slice(0, 5)}</div>
                          {ev.tags && ev.tags.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {ev.tags.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rating panel */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4">Rate This Fix</h3>
                <p className="text-slate-600 text-sm mb-6">
                  How hard was this to fix? (1-10)
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                    <button
                      key={r}
                      onClick={() => rateFix(r)}
                      className={`w-8 h-8 rounded-lg font-bold transition-all border ${
                        userRating === r
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {userRating !== null && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-emerald-700 text-sm font-medium mb-2">Rating submitted: {userRating}/10</p>
                    <p className="text-emerald-600 text-xs">
                      AI will now analyze the captured log and determine capture level.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Inference View */}
        {view === VIEW_AI && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">AI Inference Engine</h2>
            <p className="text-slate-600">
              The AI analyzes the captured computer log — failed attempts, terminal usage, file switching,
              session length, recurrence — and decides what to keep.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {problems.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{p.title}</h3>
                      <p className="text-slate-500 text-sm">{p.assignee}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${severityColor(p.severity)}`}>
                      {p.severity}/10 {severityLabel(p.severity)}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>User Rating</span>
                      <span className="font-bold">{p.userRating}/10</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>AI Score</span>
                      <span className="font-bold">{p.aiScore}/10</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Recurrences</span>
                      <span className="font-bold">{p.recurrenceCount}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Capture Level</span>
                      <span className="font-bold capitalize">{p.captureLevel.replace('-', ' ')}</span>
                    </div>
                  </div>
                  {p.events.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-100">
                      <p className="text-xs font-bold text-slate-500 mb-2">Sample Events:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {p.events.slice(0, 3).map((e) => (
                          <li key={e.id} className="truncate">
                            {e.type}: {e.title}
                          </li>
                        ))}
                        {p.events.length > 3 && (
                          <li className="text-slate-400 italic">+{p.events.length - 3} more events</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Graph View */}
        {view === VIEW_GRAPH && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Knowledge Graph</h2>
            <p className="text-slate-600">
              Every problem linked to its solution steps — timestamp → action → result → next action.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {problems.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="text-slate-500 text-sm mb-2">{p.description}</p>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${severityColor(p.severity)}`}>
                      Severity {p.severity}/10
                    </div>
                  </div>
                  <div className="space-y-2">
                    {p.events.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-2 p-2 rounded bg-slate-50 border-b border-slate-100 last:border-0">
                        <span className="w-16 h-16 rounded flex items-center justify-center text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-700">{e.title}</div>
                          <div className="text-[10px] text-slate-500 truncate">{e.detail}</div>
                        </div>
                        {i < p.events.length - 1 && (
                          <span className="text-slate-300 text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-emerald-50 rounded border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700 mb-1">Solution:</p>
                    <p className="text-sm text-emerald-800">{p.solution}</p>
                    {p.prevention && (
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-700 mb-1">Prevention:</p>
                        <p className="text-sm text-amber-800">{p.prevention}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chatbot View */}
        {view === VIEW_CHATBOT && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Local Chatbot</h2>
            <p className="text-slate-600">
              Ask in plain language. The chatbot searches the knowledge graph and returns the exact steps
              an expert used before.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatResult ? (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <p className="text-sm text-slate-700">{chatResult.problem.title}</p>
                      <p className="text-sm text-slate-600">{chatResult.problem.solution}</p>
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500">Evidence:</p>
                        <ul className="text-xs text-slate-500 space-y-1">
                          {chatResult.problem.events.slice(0, 3).map((e) => (
                            <li key={e.id}>{e.detail}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-slate-400 text-sm">Ask a question like "Why is auth broken?"</p>
                  </div>
                )}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2 border-t border-slate-200 pt-4">
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Ask
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Senior Dashboard View */}
        {view === VIEW_DASHBOARD && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Senior Dashboard</h2>
            <p className="text-slate-600">
              Team oversight: error trends, severity distribution, recurrence tracking, knowledge coverage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="text-slate-500 text-xs font-bold mb-1">Total Problems</div>
                <div className="text-3xl font-bold">{problems.length}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="text-slate-500 text-xs font-bold mb-1">Critical (8-10)</div>
                <div className="text-3xl font-bold text-red-600">
                  {problems.filter((p) => p.severity >= 8).length}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="text-slate-500 text-xs font-bold mb-1">Recurring</div>
                <div className="text-3xl font-bold text-amber-600">
                  {problems.filter((p) => p.recurrenceCount > 0).length}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="text-slate-500 text-xs font-bold mb-1">Avg Severity</div>
                <div className="text-3xl font-bold">
                  {problems.length > 0
                    ? Math.round((problems.reduce((sum, p) => sum + p.severity, 0) / problems.length) * 10) / 10
                    : 0
                  }
                  <span className="text-sm font-normal text-slate-500">/10</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">Team Problem Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 text-slate-500 font-semibold">Problem</th>
                      <th className="pb-3 text-slate-500 font-semibold">Severity</th>
                      <th className="pb-3 text-slate-500 font-semibold">Recurrences</th>
                      <th className="pb-3 text-slate-500 font-semibold">Capture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {problems.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3">{p.title}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${severityColor(p.severity)}`}>
                            {p.severity}/10
                          </span>
                        </td>
                        <td className="py-3">{p.recurrenceCount}</td>
                        <td className="py-3 text-xs text-slate-600 capitalize">{p.captureLevel.replace('-', ' ')}</td>
                      </tr>
                    ))}
                    {problems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No problems yet. Select a scenario and rate a fix to generate data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;