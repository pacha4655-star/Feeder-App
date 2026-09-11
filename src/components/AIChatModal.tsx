import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  MapPin,
  AlertTriangle,
  RotateCcw,
  Compass,
  Heart,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  actions?: { type: string; label: string; targetId?: string }[];
}

const STARTER_PROMPTS = [
  { icon: '🚨', label: 'Emergency: Injured street animal triage', text: 'I found an injured animal on the street. What immediate first-aid steps should I take?' },
  { icon: '🍗', label: 'Safe vs Toxic Foods', text: 'What foods are strictly safe to feed street dogs and cats, and what is toxic?' },
  { icon: '🍼', label: 'Orphaned newborn kitten care', text: 'How do I care for a 2-week-old orphaned kitten safely?' },
  { icon: '☀️', label: 'Heatstroke & dehydration signs', text: 'What are the signs of heatstroke and dehydration in street animals, and how do I help?' },
  { icon: '📍', label: 'Rescues & Feeders near me', text: 'Are there any urgent animal rescues or community feeders active near my location?' },
];

export const AIChatModal: React.FC = () => {
  const {
    showAIChat,
    setShowAIChat,
    selectedLocation,
    userCoords,
    user,
    setCurrentTab,
    setShowCreateHelp,
    setShowAdoptionFosterHub,
    helpRequests,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! 🐾 I'm **Pawsy**. How can I help you and your animal friends today?`,
      timestamp: 'Just now',
      suggestions: [
        '🐾 Pet health question',
        '🥗 Safe & toxic foods guide',
        '🩺 Find nearby vet clinics',
        '🚨 Emergency first aid steps'
      ],
      actions: [
        { type: 'open_map', label: 'Explore Nearby Map 📍' },
        { type: 'open_help', label: 'Open Urgent Help 🚨' }
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (showAIChat) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [showAIChat, messages]);

  if (!showAIChat) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history turns with expanded 10-turn window
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        text: m.content
      }));

      const response = await api.sendChatMessage(text, history, {
        location: selectedLocation,
        userCoords: userCoords || undefined,
        userRole: user?.roles?.[0] || 'Animal Lover'
      });

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: 'Just now',
        suggestions: response.suggestions,
        actions: response.actions
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't process that right now. Please try again, or check the Nearby Map for local veterinary clinics.`,
        timestamp: 'Just now',
        suggestions: [
          'Retry: ' + text,
          '🩺 Find Nearby Vets',
          '🚨 Open Urgent Help'
        ],
        actions: [
          { type: 'open_map', label: 'Explore Nearby Map 📍' },
          { type: 'open_help', label: 'Open Urgent Help 🚨' }
        ]
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: { type: string; label: string; targetId?: string }) => {
    setShowAIChat(false);
    if (action.type === 'open_help') {
      setCurrentTab('help');
    } else if (action.type === 'open_map') {
      setCurrentTab('nearby');
    } else if (action.type === 'open_adoptions') {
      setShowAdoptionFosterHub(true);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: `Chat history cleared. 🐾 I'm **Pawsy**, how can I help you and your animals today?`,
        timestamp: 'Just now',
        suggestions: [
          '🐾 Pet health question',
          '🥗 Safe foods guide',
          '🩺 Find Nearby Vets'
        ]
      }
    ]);
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px]">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Process bold tokens **bold**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          if (line.startsWith('• ') || line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-green-600 font-bold">•</span>
                <div className="flex-1">{formattedLine}</div>
              </div>
            );
          }

          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^\d+\./)?.[0];
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-green-700 font-bold">{num}</span>
                <div className="flex-1">{formattedLine}</div>
              </div>
            );
          }

          return <div key={idx}>{formattedLine}</div>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl lg:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[90vh] sm:h-[650px] animate-in slide-in-from-bottom-6 duration-200"
        id="ai-chat-modal-container"
      >
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-green-800 to-green-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner">
                🐾
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-green-800" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">Pawsy • Feeder AI</h2>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-semibold tracking-wide">
                  Gemini AI
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-green-100 font-medium">
                <MapPin className="w-2.5 h-2.5" />
                <span className="truncate max-w-[170px]">{selectedLocation}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              title="Reset conversation"
              className="p-1.5 rounded-full text-green-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAIChat(false)}
              className="p-1.5 rounded-full text-green-200 hover:text-white hover:bg-white/10 transition-colors"
              id="close-ai-chat-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Community Banner */}
        <div className="px-3.5 py-1.5 bg-green-50/80 border-b border-green-100/80 flex items-center justify-between text-[11px] text-green-800">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            Vetted First-Aid & Welfare Knowledge
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            {helpRequests.filter(h => h.status !== 'resolved').length} open alerts near you
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/60">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-end gap-1.5 max-w-[90%] sm:max-w-[85%]">
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-[11px] flex-shrink-0 mb-1 shadow-xs">
                    🐾
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-green-700 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    renderFormattedText(msg.content)
                  )}

                  {/* Actions inside assistant message */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleActionClick(act)}
                          className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                        >
                          <span>{act.label}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up suggestions pills */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2 pl-7 flex flex-wrap gap-1.5 max-w-full">
                  {msg.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSendMessage(sug)}
                      className="px-2.5 py-1 bg-white hover:bg-green-50 border border-slate-200/80 hover:border-green-300 text-slate-700 hover:text-green-800 rounded-full text-[11px] font-medium transition-all text-left shadow-2xs"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-end gap-1.5 max-w-[80%]">
              <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-[11px] flex-shrink-0 mb-1">
                🐾
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-green-700" />
                <span>Pawsy is formulating safe animal guidance...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Starter Chips (when chat is short) */}
        {messages.length <= 2 && (
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {STARTER_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.text)}
                className="px-2.5 py-1 bg-white hover:bg-green-50 border border-slate-200 text-slate-700 hover:text-green-800 rounded-full text-[11px] font-medium flex-shrink-0 flex items-center gap-1 transition-colors shadow-2xs"
              >
                <span>{p.icon}</span>
                <span className="truncate max-w-[130px]">{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-100">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder={`Ask Pawsy about animal care in ${selectedLocation}...`}
              disabled={isLoading}
              className="flex-1 py-2 px-3.5 text-xs sm:text-[13px] bg-slate-100/90 border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-green-600 focus:bg-white text-slate-800 placeholder-slate-400 transition-all disabled:opacity-50"
              id="ai-chat-input"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-9 h-9 rounded-2xl bg-green-700 hover:bg-green-800 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 flex-shrink-0"
              id="ai-chat-send-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-1.5 text-center text-[10px] text-slate-400">
            For critical trauma, bleeding, or poisoning, visit a licensed veterinary clinic immediately.
          </div>
        </div>
      </div>
    </div>
  );
};
