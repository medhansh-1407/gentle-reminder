import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Video,
} from 'lucide-react';
import { calculateDynamicSeverity, chatbotSearch, type ProblemEntry, type ActivityEvent } from './aiEngine';
import { SCENARIOS, getScenarioById, scenarioToProblem } from './scenarios';

interface CaptureState {
  is_recording: boolean;
  capture_level: string;
  events: ActivityEvent[];
  recording_active: boolean;
  frame_count: number;
  frames_dir: string;
}

const VIEW_SCENARIOS = 'scenarios';
const VIEW_LOGGER = 'logger';
const VIEW_AI = 'ai';
const VIEW_GRAPH = 'graph';
const VIEW_CHATBOT = 'chatbot';
const VIEW_DASHBOARD = 'dashboard';
const VIEW_RECORDING = 'recording';

const isTauri = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

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
  const [recordingStatus, setRecordingStatus] = useState<string>('Initializing...');
  const [recordingPath, setRecordingPath] = useState<string>('');
  const [frames, setFrames] = useState<string[]>([]);
  const [frameCount, setFrameCount] = useState<number>(0);

  const convertFrameUrl = async (path: string): Promise<string> => {
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const cleanPath = path.replace(/\\\\?/g, '').replace(/\\/g, '/');
      return convertFileSrc(cleanPath);
    } catch {
      // Fallback: return the path as-is (will be handled by Tauri's webview)
      return path;
    }
  };

  const loadFrames = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const frameList = await invoke<string[]>('list_recordings');
      const urls = await Promise.all(frameList.map(convertFrameUrl));
      setFrames(urls);
      setFrameCount(frameList.length);
    } catch (err) {
      console.error('Failed to load frames:', err);
    }
  };

  useEffect(() => {
    if (!isTauri()) {
      setIsRecording(false);
      setRecordingStatus('Desktop mode required');
      return;
    }

    const initRecording = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const state = await invoke<CaptureState>('get_capture_state');
        setIsRecording(state.recording_active || false);
        setRecordingStatus(state.recording_active ? 'Recording...' : 'Not recording');

        await loadFrames();

        const pollInterval = setInterval(async () => {
          try {
            const currentState = await invoke<CaptureState>('get_capture_state');
            setIsRecording(currentState.recording_active || false);
            setRecordingStatus(currentState.recording_active ? 'Recording...' : 'Not recording');

            await loadFrames();
          } catch (err) {
            console.error('Poll error:', err);
          }
        }, 2000);

        return () => clearInterval(pollInterval);
      } catch (error) {
        console.error('Failed to initialize recording:', error);
        setRecordingStatus('Error initializing');
      }
    };

    initRecording();
  }, []);

  const navigateTo = useCallback((v: string) => {
    setView(v);
    setChatResult(null);
    setChatQuery('');
  }, []);

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

  const rateFix = useCallback(async (rating: number) => {
    setUserRating(rating);
    const current = activityLog[activityLog.length - 1];
    if (!current) return;

    const breakdown = calculateDynamicSeverity(rating, currentSessionEvents, problems, current.title);

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
    // Recording only escalates, never downgrades - if already recording, stay recording

    let shouldSave = false;
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_knowledge_entry', {
          title: newProblem.title,
          description: newProblem.description,
          severity: newProblem.severity,
          userRating: rating,
          aiScore: newProblem.aiScore,
          recurrenceCount: newProblem.recurrenceCount,
          captureLevel: newProblem.captureLevel,
          solution: newProblem.solution,
          prevention: newProblem.prevention,
          events: newProblem.events,
        });

        const addEventResult = await invoke('add_event', {
          event: current,
        });

        shouldSave = true;
      } catch (error) {
        console.error('Failed to save to backend:', error);
      }
    }

    if (!isTauri() || !shouldSave) {
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
    }
  }, [activityLog, currentSessionEvents, problems]);

  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    const result = chatbotSearch(chatQuery, problems);
    setChatResult(result);
  }, [chatQuery, problems]);

  const startRecording = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ recording_id: string; file_path: string; status: string; started_at: string }>(
        'start_screen_recording',
        { fps: 5 }
      );
      setRecordingPath(result.file_path);
      setRecordingStatus(`Recording started: ${result.recording_id}`);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const path = await invoke<string>('stop_screen_recording');
      setRecordingPath(path);
      setRecordingStatus(`Recording stopped. Files saved to: ${path}`);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, []);

  const checkRecordingStatus = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const status = await invoke<string>('get_recording_status');
      setRecordingStatus(status);
    } catch (error) {
      console.error('Failed to check status:', error);
      setRecordingStatus('Error checking status');
    }
  }, []);

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
    <div className="min-h-screen bg-[#fafaf8] text-[#1a1a1a]">
      <header className="bg-[#1a1a1a] text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#525252] rounded flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gentle Reminder</h1>
            <p className="text-[#8a8a85] text-sm">Coders in Pune Hackathon — Round 2 Build</p>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-[#e3e3de] px-6 py-3 flex gap-4 overflow-x-auto">
        <button
          onClick={() => navigateTo(VIEW_SCENARIOS)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_SCENARIOS
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" /> Scenarios
        </button>
        <button
          onClick={() => navigateTo(VIEW_LOGGER)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_LOGGER
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <Activity className="w-4 h-4 mr-2" /> Activity Logger
        </button>
        <button
          onClick={() => navigateTo(VIEW_AI)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_AI
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <Brain className="w-4 h-4 mr-2" /> AI Inference
        </button>
        <button
          onClick={() => navigateTo(VIEW_GRAPH)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_GRAPH
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" /> Knowledge Graph
        </button>
        <button
          onClick={() => navigateTo(VIEW_CHATBOT)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_CHATBOT
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <Bot className="w-4 h-4 mr-2" /> Chatbot
        </button>
        <button
          onClick={() => navigateTo(VIEW_DASHBOARD)}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            view === VIEW_DASHBOARD
              ? 'bg-[#1a1a1a] text-white'
              : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-2" /> Senior Dashboard
        </button>
        {isTauri() && (
          <button
            onClick={() => navigateTo(VIEW_RECORDING)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              view === VIEW_RECORDING
                ? 'bg-[#1a1a1a] text-white'
                : 'text-[#1a1a1a] hover:bg-[#fafaf8]'
            }`}
          >
            <Video className="w-4 h-4 mr-2" /> Recording
          </button>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === VIEW_SCENARIOS && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Real-World Scenarios</h2>
                <p className="text-[#525252] text-sm">
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
                className="text-[#525252] hover:text-[#1a1a1a] text-sm flex items-center gap-2"
              >
                <History className="w-4 h-4" /> Clear all data
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SCENARIOS.map((scenario) => (
                <div
                  key={scenario.id}
                  className="bg-white rounded border border-[#e3e3de] hover:shadow transition-shadow p-6 cursor-pointer group"
                  onClick={() => selectScenario(scenario.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-[#fafaf8] rounded flex items-center justify-center text-[#525252] group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors">
                      <Play className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{scenario.title}</h3>
                  <p className="text-[#8a8a85] text-sm mb-3">{scenario.subtitle}</p>
                  <p className="text-[#525252] text-xs leading-relaxed mb-4">{scenario.description}</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#525252] bg-[#fafaf8] px-3 py-2 rounded">
                    <ArrowRight className="w-3 h-3" /> Open scenario
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === VIEW_LOGGER && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Activity Logger</h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
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

                    if (isTauri()) {
                      try {
                        const { invoke } = await import('@tauri-apps/api/core');
                        await invoke('add_event', { event: newEvent });
                      } catch (error) {
                        console.error('Failed to add event to backend:', error);
                      }
                    }
                  }}
                  className="px-3 py-2 bg-[#fafaf8] hover:bg-[#e3e3de] rounded text-sm transition-colors"
                >
                  <Terminal className="w-4 h-4 mr-2" /> Add Event
                </button>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isRecording ? 'bg-red-50 text-red-600' : 'bg-[#fafaf8] text-[#525252] hover:bg-[#e3e3de]'
                  }`}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isRecording ? 'Recording ON' : 'Recording OFF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded border border-[#e3e3de] p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Live Event Stream
                  {currentSessionEvents.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded text-xs bg-[#fafaf8] text-[#525252]">
                      {currentSessionEvents.length} events
                    </span>
                  )}
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto border border-[#e3e3de] rounded-lg p-4 bg-[#fafaf8]">
                  {currentSessionEvents.length === 0 ? (
                    <p className="text-[#8a8a85] text-sm italic">No events captured yet. Select a scenario or add events.</p>
                  ) : (
                    currentSessionEvents.map((ev) => (
                      <div key={ev.id} className="flex gap-3 p-3 bg-white rounded border border-[#e3e3de]">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-blue-50 text-blue-600 shrink-0">
                          {ev.type.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{ev.title}</div>
                          <div className="text-xs text-[#8a8a85] truncate">{ev.detail}</div>
                          <div className="text-xs text-[#525252] mt-1">{ev.timestamp.split('T')[1]?.slice(0, 5)}</div>
                          {ev.tags && ev.tags.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {ev.tags.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#fafaf8] text-[#525252]">
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

              <div className="lg:col-span-1 bg-white rounded border border-[#e3e3de] p-6">
                <h3 className="text-lg font-bold mb-4">Rate This Fix</h3>
                <p className="text-[#525252] text-sm mb-6">
                  How hard was this to fix? (1-10)
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                    <button
                      key={r}
                      onClick={() => rateFix(r)}
                      className={`w-8 h-8 rounded font-bold transition-all border ${
                        userRating === r
                          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white'
                          : 'bg-white border-[#e3e3de] text-[#1a1a1a] hover:border-[#525252]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {userRating !== null && (
                  <div className="p-4 bg-green-50 rounded border border-green-100">
                    <p className="text-green-700 text-sm font-medium mb-2">Rating submitted: {userRating}/10</p>
                    <p className="text-green-600 text-xs">
                      AI will now analyze the captured log and determine capture level.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === VIEW_AI && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">AI Inference Engine</h2>
            <p className="text-[#525252]">
              The AI analyzes the captured computer log — failed attempts, terminal usage, file switching,
              session length, recurrence — and decides what to keep.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {problems.map((p) => (
                <div key={p.id} className="bg-white rounded border border-[#e3e3de] p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{p.title}</h3>
                      <p className="text-[#8a8a85] text-sm">{p.assignee}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${severityColor(p.severity)}`}>
                      {p.severity}/10 {severityLabel(p.severity)}
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-[#8a8a85]">
                      <span>User Rating</span>
                      <span className="font-bold">{p.userRating}/10</span>
                    </div>
                    <div className="flex justify-between text-[#8a8a85]">
                      <span>AI Score</span>
                      <span className="font-bold">{p.aiScore}/10</span>
                    </div>
                    <div className="flex justify-between text-[#8a8a85]">
                      <span>Recurrences</span>
                      <span className="font-bold">{p.recurrenceCount}</span>
                    </div>
                    <div className="flex justify-between text-[#8a8a85]">
                      <span>Capture Level</span>
                      <span className="font-bold capitalize">{p.captureLevel.replace('-', ' ')}</span>
                    </div>
                  </div>
                  {p.events.length > 0 && (
                    <div className="mt-4 p-3 bg-[#fafaf8] rounded border border-[#e3e3de]">
                      <p className="text-xs font-bold text-[#525252] mb-2">Sample Events:</p>
                      <ul className="text-xs text-[#8a8a85] space-y-1">
                        {p.events.slice(0, 3).map((e) => (
                          <li key={e.id} className="truncate">
                            {e.type}: {e.title}
                          </li>
                        ))}
                        {p.events.length > 3 && (
                          <li className="text-[#8a8a85] italic">+{p.events.length - 3} more events</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === VIEW_GRAPH && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Knowledge Graph</h2>
            <p className="text-[#525252]">
              Every problem linked to its solution steps — timestamp → action → result → next action.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {problems.map((p) => (
                <div key={p.id} className="bg-white rounded border border-[#e3e3de] p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="text-[#8a8a85] text-sm mb-2">{p.description}</p>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${severityColor(p.severity)}`}>
                      Severity {p.severity}/10
                    </div>
                  </div>
                  <div className="space-y-2">
                    {p.events.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-2 p-2 rounded bg-[#fafaf8] border-b border-[#e3e3de] last:border-0">
                        <span className="w-16 h-16 rounded flex items-center justify-center text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#1a1a1a]">{e.title}</div>
                          <div className="text-[10px] text-[#8a8a85] truncate">{e.detail}</div>
                        </div>
                        {i < p.events.length - 1 && (
                          <span className="text-[#525252] text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded border border-green-100">
                    <p className="text-xs font-bold text-green-700 mb-1">Solution:</p>
                    <p className="text-sm text-green-800">{p.solution}</p>
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

        {view === VIEW_CHATBOT && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Local Chatbot</h2>
            <p className="text-[#525252]">
              Ask in plain language. The chatbot searches the knowledge graph and returns the exact steps
              an expert used before.
            </p>
            <div className="bg-white rounded border border-[#e3e3de] p-6 h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatResult ? (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1 max-w-[80%]">
                      <p className="text-sm text-white">{chatResult.problem.title}</p>
                      <p className="text-sm text-[#8a8a85]">{chatResult.problem.solution}</p>
                      <div className="mt-2 pt-2 border-t border-[#e3e3de]">
                        <p className="text-[10px] font-bold text-[#525252]">Evidence:</p>
                        <ul className="text-xs text-[#8a8a85] space-y-1">
                          {chatResult.problem.events.slice(0, 3).map((e) => (
                            <li key={e.id}>{e.detail}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-[#8a8a85] text-sm">Ask a question like "Why is auth broken?"</p>
                  </div>
                )}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2 border-t border-[#e3e3de] pt-4">
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-3 border border-[#e3e3de] rounded focus:outline-none focus:ring-2 focus:ring-[#525252]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1a1a1a] text-white rounded hover:bg-[#525252] transition-colors"
                >
                  Ask
                </button>
              </form>
            </div>
          </div>
        )}

        {view === VIEW_DASHBOARD && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Senior Dashboard</h2>
            <p className="text-[#525252]">
              Team oversight: error trends, severity distribution, recurrence tracking, knowledge coverage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded border border-[#e3e3de] p-6">
                <div className="text-[#8a8a85] text-xs font-bold mb-1">Total Problems</div>
                <div className="text-3xl font-bold">{problems.length}</div>
              </div>
              <div className="bg-white rounded border border-[#e3e3de] p-6">
                <div className="text-[#8a8a85] text-xs font-bold mb-1">Critical (8-10)</div>
                <div className="text-3xl font-bold text-red-600">
                  {problems.filter((p) => p.severity >= 8).length}
                </div>
              </div>
              <div className="bg-white rounded border border-[#e3e3de] p-6">
                <div className="text-[#8a8a85] text-xs font-bold mb-1">Recurring</div>
                <div className="text-3xl font-bold text-amber-600">
                  {problems.filter((p) => p.recurrenceCount > 0).length}
                </div>
              </div>
              <div className="bg-white rounded border border-[#e3e3de] p-6">
                <div className="text-[#8a8a85] text-xs font-bold mb-1">Avg Severity</div>
                <div className="text-3xl font-bold">
                  {problems.length > 0
                    ? Math.round((problems.reduce((sum, p) => sum + p.severity, 0) / problems.length) * 10) / 10
                    : 0
                  }<span className="text-sm font-normal text-[#8a8a85]">/10</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded border border-[#e3e3de] p-6">
              <h3 className="text-lg font-bold mb-4">Team Problem Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#e3e3de]">
                      <th className="pb-3 text-[#525252] font-semibold">Problem</th>
                      <th className="pb-3 text-[#525252] font-semibold">Severity</th>
                      <th className="pb-3 text-[#525252] font-semibold">Recurrences</th>
                      <th className="pb-3 text-[#525252] font-semibold">Capture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e3de]">
                    {problems.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3">{p.title}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${severityColor(p.severity)}`}>
                            {p.severity}/10
                          </span>
                        </td>
                        <td className="py-3">{p.recurrenceCount}</td>
                        <td className="py-3 text-xs text-[#8a8a85] capitalize">{p.captureLevel.replace('-', ' ')}</td>
                      </tr>
                    ))}
                    {problems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#8a8a85]">
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

        {view === VIEW_RECORDING && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Screen Recording</h2>
                <p className="text-[#525252]">
                  Continuous screen capture of all desktop activity. Recording started automatically when the app launched.
                  Frames are saved as PNG files and will be cleaned up based on problem severity ratings.
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                isRecording ? 'bg-green-100 text-green-700' : 'bg-[#fafaf8] text-[#525252]'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-[#8a8a85]'}`} />
                {recordingStatus}
              </div>
            </div>

            {!isTauri() && (
              <div className="bg-amber-50 border border-amber-100 rounded p-6">
                <p className="text-amber-800">Screen recording requires the Tauri desktop app. This feature is not available in the web demo.</p>
              </div>
            )}

            {isTauri() && (
              <div className="space-y-4">
                <div className="bg-white rounded border border-[#e3e3de] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-[#1a1a1a]">Captured Frames</p>
                      <p className="text-xs text-[#8a8a85] mt-1">{frameCount} frames recorded</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8a8a85]">Storage Location</p>
                      <p className="text-xs text-[#525252] font-mono truncate max-w-[200px]">
                        {frames.length > 0 ? frames[0].split('\\').slice(0, -1).join('\\') + '\\' : ''}
                      </p>
                    </div>
                  </div>

                  {frames.length === 0 ? (
                    <div className="text-center py-12 bg-[#fafaf8] rounded border border-dashed border-[#e3e3de]">
                      <Video className="w-12 h-12 text-[#8a8a85] mx-auto mb-3" />
                      <p className="text-sm text-[#8a8a85]">No frames captured yet</p>
                      <p className="text-xs text-[#525252] mt-1">Recording will appear here as you use your computer</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {frames.slice(-20).reverse().map((frame, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={frame}
                              alt={`Frame ${frameCount - frames.length + idx + 1}`}
                              className="w-full h-32 object-cover rounded border border-[#e3e3de]"
                            />
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                              #{frameCount - frames.length + idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      {frames.length > 20 && (
                        <p className="text-center text-xs text-[#8a8a85] mt-3">
                          Showing last 20 of {frames.length} frames
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-green-50 rounded border border-green-100">
                  <p className="text-xs font-bold text-green-700 mb-2">How it works:</p>
                  <ul className="text-xs text-green-600 space-y-1">
                    <li>• Automatically records your entire screen at 5 FPS</li>
                    <li>• Works across all applications (Chrome, VS Code, etc.)</li>
                    <li>• Frames stored in %LOCALAPPDATA%\gentle-reminder\frames\</li>
                    <li>• Severity 1-3: All frames deleted after rating</li>
                    <li>• Severity 4-5: Keeps last 100 frames</li>
                    <li>• Severity 6+: All frames preserved</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;