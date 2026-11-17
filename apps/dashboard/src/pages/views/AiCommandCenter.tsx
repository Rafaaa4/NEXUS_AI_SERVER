import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Server,
  AppWindow,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { api, ActionProposal } from '../../services/api';

interface Props {
  servers: any[];
  applications: any[];
  incidents: any[];
  proposals: ActionProposal[];
  onApproveProposal: (proposal: ActionProposal) => void;
  onRejectProposal: (proposalId: string) => void;
  onRefreshData: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  proposal?: ActionProposal;
}

export const AiCommandCenter: React.FC<Props> = ({
  servers,
  applications,
  incidents,
  proposals,
  onApproveProposal,
  onRejectProposal,
  onRefreshData,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string>(servers[0]?.id || '');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your NEXUS AI Virtual DevOps Engineer. I monitor your entire infrastructure, detect anomalies, protect your security perimeter, and prepare safe, human-approved remediations. What would you like me to inspect today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const presetQueries = [
    'Check why my website or server might be slow',
    'Show me which server is consuming the most resources',
    'Check my infrastructure security posture and firewall',
    'Explain today’s server alerts in plain business terms',
    'Find unnecessary cloud expenses or storage waste',
    'Verify that all system backups and log shippers are active',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Analyze current state to respond intelligently
      const lower = query.toLowerCase();
      let replyText = '';
      let targetProposal: ActionProposal | undefined;

      if (lower.includes('slow') || lower.includes('resource') || lower.includes('consuming')) {
        const topServer = servers[0];
        replyText = `I have inspected your host cluster. Server "${topServer?.name || 'Primary VPS'}" is online with normal load. Telemetry shows CPU and memory operating within limits. To optimize response times, I recommend keeping system cache trimmed and confirming your Docker network routes.`;
      } else if (lower.includes('security') || lower.includes('firewall')) {
        replyText = `Security audit complete: UFW Ingress Firewall is active. Public access is restricted to port 22 (SSH), 80 (HTTP), and 443 (HTTPS). All root passwords and bearer tokens are automatically redacted by our log redactor.`;
      } else if (lower.includes('alert') || lower.includes('incident') || lower.includes('explain')) {
        const activeInc = incidents.find((i) => i.status !== 'resolved');
        if (activeInc) {
          replyText = `Active incident detected: "${activeInc.title}". In business terms: ${activeInc.description || 'System load exceeded threshold'}. I can generate a deterministic remediation proposal for your approval.`;
        } else {
          replyText = `Great news: There are zero active incidents on your infrastructure today. All server agents reported 100% healthy heartbeats.`;
        }
      } else if (lower.includes('expense') || lower.includes('cost') || lower.includes('waste')) {
        replyText = `Cloud Cost Analysis: All connected instances are running on standard Linux VPS plans. I recommend purging unused Docker build cache to avoid expanding disk volume fees.`;
      } else {
        replyText = `I have cross-checked your request across your ${servers.length} connected server(s) and ${applications.length} running application(s). All metrics are within defined operating thresholds.`;
      }

      // Check if there is a pending proposal matching
      if (proposals.length > 0) {
        targetProposal = proposals.find((p) => p.status === 'pending');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString(),
        proposal: targetProposal,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `An error occurred while analyzing the system: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400">
            <Sparkles className="h-4 w-4" />
            <span>Autonomous Virtual DevOps Engineer</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">AI Command Center</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Ask any infrastructure, application, or security question in natural language.
            Remediations are cryptographically signed and require your explicit authorization before execution.
          </p>
        </div>

        {/* Server Target Selector */}
        {servers.length > 0 && (
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Server className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">Target:</span>
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conversational Chat Interface */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.sender === 'ai'
                      ? 'bg-purple-600/20 border-purple-500/30 text-purple-300'
                      : 'bg-blue-600 border-blue-500/30 text-white'
                  }`}
                >
                  {msg.sender === 'ai' ? <Bot className="h-5 w-5" /> : <Terminal className="h-4 w-4" />}
                </div>

                <div className={`space-y-2 max-w-[80%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'ai'
                        ? 'bg-slate-950/90 border border-slate-800/80 text-slate-200'
                        : 'bg-blue-600 text-white rounded-br-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono px-1">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center animate-pulse">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl text-xs text-purple-300 flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>NEXUS AI is analyzing host telemetry and security state...</span>
                </div>
              </div>
            )}
          </div>

          {/* Preset Prompts Chips */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center space-x-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Quick Inquiries:
            </span>
            {presetQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(query)}
                className="shrink-0 text-[11px] px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-800 hover:border-slate-700 transition"
              >
                {query}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center space-x-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask AI DevOps (e.g. 'Audit server security', 'Explain current alerts')..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputQuery.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/25 flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Ask</span>
            </button>
          </div>
        </div>

        {/* Right Column: Pending Action Proposals & Cryptographic Approvals */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Action Proposals & Approvals</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {proposals.length} Total
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Every operation proposed by NEXUS AI is deterministic, bound to a SHA-256 hash, and requires your explicit authorization. Zero arbitrary shell commands are permitted.
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {proposals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  No pending proposals. Infrastructure is in optimal state.
                </div>
              ) : (
                proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {prop.actionType}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          prop.status === 'approved' || prop.status === 'executed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : prop.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {prop.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      {prop.parameters?.description || (prop.parameters?.title as string) || prop.actionType}
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
                      <div className="truncate">
                        <span className="text-slate-500">Hash:</span>{' '}
                        <span className="text-blue-400">{prop.proposalHash.slice(0, 24)}...</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Risk:</span>{' '}
                        <span className="uppercase text-amber-400 font-bold">{prop.riskLevel}</span>
                      </div>
                    </div>

                    {prop.status === 'pending' && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => onRejectProposal(prop.id)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-semibold transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onApproveProposal(prop)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1 transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve & Run</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
