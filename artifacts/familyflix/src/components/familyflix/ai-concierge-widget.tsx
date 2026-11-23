import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Mic,
  MicOff,
  Send,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  CreditCard,
  Settings,
  ChevronRight,
  Shield,
  Zap,
  Info,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { BrandLogo } from "@/components/familyflix/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  action?: {
    type: string;
    slug?: string;
    name?: string;
    url?: string;
    posterUrl?: string | null;
    backdropUrl?: string | null;
    items?: Array<{ id: string; name: string; slug: string; year?: number; posterUrl?: string | null; url: string }>;
    balance?: number;
    plan?: string;
    monthlyAllowance?: number;
  } | null;
  timestamp: Date;
}

export function AiConciergeWidget() {
  const [location, navigate] = useLocation();

  // -------------------------------------------------------------
  // EXACT PAGE VISIBILITY CHECK
  // ONLY: Profile (/account, /profile, /settings), Terms (/terms), About (/about), Developers (/developers)
  // -------------------------------------------------------------
  const isAllowedPage = (() => {
    const p = location.toLowerCase();
    return (
      p === "/account" ||
      p === "/profile" ||
      p === "/settings" ||
      p === "/terms" ||
      p === "/about" ||
      p.startsWith("/developers")
    );
  })();

  if (!isAllowedPage) {
    return null;
  }

  return <AiConciergeInner navigate={navigate} />;
}

function AiConciergeInner({ navigate }: { navigate: (path: string) => void }) {
  const { data: sessionData } = authClient.useSession();
  const session = sessionData as unknown as { user?: { id?: string; name?: string; email?: string } } | null | undefined;
  const isAuthenticated = Boolean(session?.user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [assistant, setAssistant] = useState<"raven" | "princeton">("raven");
  const [voiceActivation, setVoiceActivation] = useState(false);
  const [credits, setCredits] = useState({ balance: 100, plan: "free", totalUsed: 0, monthlyAllowance: 100 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Load account AI status and preferences
  const loadAccountStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ai-concierge/account");
      if (!res.ok) return;
      const data = await res.json();
      if (data.assistant) setAssistant(data.assistant);
      if (typeof data.voiceActivationEnabled === "boolean") setVoiceActivation(data.voiceActivationEnabled);
      if (data.credits) setCredits(data.credits);

      // Seed initial welcome message if empty
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        const name = data.user?.name || "Friend";
        const welcome =
          data.assistant === "princeton"
            ? `Hey ${name}, I'm PRINCETON, your FamilyFlix concierge. Ready to help you discover great movies, launch playback, or answer account questions. Try saying "Play a comedy" or "Resume where I left off!"`
            : `Hello ${name}! I'm RAVEN, your personal streaming concierge. I can search over 23,000 titles, resume your movies, and manage your account. How can I assist you today?`;
        return [
          {
            id: "welcome-msg",
            role: "assistant",
            content: welcome,
            timestamp: new Date(),
          },
        ];
      });
    } catch {}
  }, []);

  useEffect(() => {
    loadAccountStatus();
  }, [loadAccountStatus, session?.user?.id]);

  // Save Assistant Preferences
  const savePreferences = async (newAssistant: "raven" | "princeton", newVoiceEnabled: boolean) => {
    setAssistant(newAssistant);
    setVoiceActivation(newVoiceEnabled);
    if (!isAuthenticated) return;
    try {
      await fetch("/api/v1/ai-concierge/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant: newAssistant,
          voiceActivationEnabled: newVoiceEnabled,
        }),
      });
    } catch {}
  };

  // Stop any active speech synthesis or audio
  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  // Text-To-Speech Output with interruption support
  const speakText = useCallback(
    async (text: string, currentAssistant: "raven" | "princeton") => {
      if (audioMuted) return;
      stopSpeech();

      // Clean speech text
      const clean = text.replace(/[*_#`~[\]()]/g, "").trim();
      if (!clean) return;

      // Primary: High-fidelity natural voice via API
      try {
        const res = await fetch("/api/v1/ai-concierge/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, assistant: currentAssistant }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audioElementRef.current = audio;
          setIsSpeaking(true);

          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audio.play();
          return;
        }
      } catch {}

      // Fallback: Modern Web Speech Synthesis API
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.0;
        utterance.pitch = currentAssistant === "raven" ? 1.05 : 0.95;

        // Pick distinct high quality voice
        const voices = window.speechSynthesis.getVoices();
        if (currentAssistant === "raven") {
          const female = voices.find((v) => /female|jenny|samantha|zira|karen/i.test(v.name) && v.lang.startsWith("en"));
          if (female) utterance.voice = female;
        } else {
          const male = voices.find((v) => /male|guy|david|alex|daniel/i.test(v.name) && v.lang.startsWith("en"));
          if (male) utterance.voice = male;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    [audioMuted, stopSpeech]
  );

  // Send message to AI Concierge API
  const handleSendMessage = async (textToSend?: string, fromVoice = false) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    stopSpeech();
    setInput("");
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/v1/ai-concierge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          assistant,
          conversationId,
          isVoice: fromVoice,
        }),
      });

      const data = await res.json();

      if (res.status === 402 || data.error === "credits_exhausted") {
        setShowUpgradeModal(true);
        const errorMsg: ChatMessage = {
          id: "asst-" + Date.now(),
          role: "assistant",
          content:
            "Your available AI credits have been exhausted. Please upgrade your plan or top up credits to continue using RAVEN and PRINCETON.",
          action: { type: "credits_exhausted", balance: 0 },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        speakText(errorMsg.content, assistant);
        setIsLoading(false);
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);
      if (typeof data.creditsRemaining === "number") {
        setCredits((prev) => ({ ...prev, balance: data.creditsRemaining }));
      }
      if (data.assistant && data.assistant !== assistant) {
        setAssistant(data.assistant);
      }

      const botMessage: ChatMessage = {
        id: "asst-" + Date.now(),
        role: "assistant",
        content: data.response || "I'm here to help with your FamilyFlix stream.",
        action: data.action,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      speakText(botMessage.content, data.assistant || assistant);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "I ran into a temporary connection issue. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech Recognition & Wake Word ("Hi RAVEN" / "Hi PRINCETON")
  const startListening = () => {
    stopSpeech();
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please use the text input control.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) {
          // If wake phrase spoken, open window
          if (/^(hi|hey)\s+(raven|princeton)/i.test(transcript)) {
            setIsOpen(true);
          }
          handleSendMessage(transcript, true);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // One-click credit top-up simulation / upgrade checkout
  const handleTopUpCredits = async (amount: number) => {
    if (!isAuthenticated) {
      navigate("/auth/sign-in");
      return;
    }
    try {
      const res = await fetch("/api/v1/ai-concierge/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, referenceId: `topup-${Date.now()}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setCredits((prev) => ({ ...prev, balance: data.balance }));
        setShowUpgradeModal(false);
        const topupMsg: ChatMessage = {
          id: "topup-" + Date.now(),
          role: "assistant",
          content: `Success! I have added ${amount} AI credits to your account. Your new balance is ${data.balance} credits.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, topupMsg]);
        speakText(topupMsg.content, assistant);
      }
    } catch {}
  };

  return (
    <>
      {/* -------------------- FLOATING CHAT BUBBLE -------------------- */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Subtle Notification Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-purple-500/30 bg-[#0e081c]/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span>Ask {assistant === "princeton" ? "PRINCETON" : "RAVEN"}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              stopSpeech();
            }}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 text-white shadow-[0_12px_36px_-6px_rgba(124,58,237,0.7)] ring-2 ring-purple-400/40 hover:scale-105 hover:ring-purple-300 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400/80 cursor-pointer"
            aria-label="Open FamilyFlix AI Concierge"
          >
            <BrandLogo className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black ring-2 ring-black">
              AI
            </span>
          </button>
        </div>
      )}

      {/* -------------------- CHAT WINDOW / PANEL -------------------- */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-white/15 bg-[#0e091d]/95 backdrop-blur-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.95)] ring-1 ring-purple-500/30 transition-all duration-300 ease-out",
            isExpanded
              ? "inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[540px] sm:h-[700px] rounded-3xl"
              : "bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-[390px] h-[580px] max-h-[85vh] rounded-3xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-950/60 via-[#180f33] to-[#0e091d] p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md">
                <BrandLogo className="h-5 w-5 text-white" />
                {isSpeaking && (
                  <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 ring-2 ring-[#0e091d]">
                    <Volume2 size={8} className="text-black" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black tracking-tight text-white">
                    {assistant === "princeton" ? "PRINCETON" : "RAVEN"}
                  </h3>
                  <span className="rounded bg-purple-500/30 px-1.5 py-0.2 text-[9px] font-bold text-purple-300 uppercase">
                    Concierge
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span>{assistant === "princeton" ? "Male voice" : "Female voice"}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{credits.balance} credits</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
                title={audioMuted ? "Unmute Assistant Voice" : "Mute Assistant Voice"}
              >
                {audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Concierge Settings & Persona"
              >
                <Settings size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((e) => !e)}
                className="hidden sm:block rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
                title={isExpanded ? "Collapse Window" : "Expand Window"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsOpen(false);
                }}
                className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Settings Panel (Collapsible) */}
          {showSettings && (
            <div className="border-b border-white/10 bg-[#160d33] p-4 text-xs animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">Assistant Persona</span>
                <span className="text-[10px] text-purple-300">Switch at any time</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => savePreferences("raven", voiceActivation)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-2.5 transition text-left",
                    assistant === "raven"
                      ? "border-purple-400 bg-purple-600/30 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-white">RAVEN</span>
                    {assistant === "raven" && <Check size={14} className="text-purple-300" />}
                  </div>
                  <span className="text-[10px] text-white/60">Female · American · Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => savePreferences("princeton", voiceActivation)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-2.5 transition text-left",
                    assistant === "princeton"
                      ? "border-purple-400 bg-purple-600/30 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-white">PRINCETON</span>
                    {assistant === "princeton" && <Check size={14} className="text-purple-300" />}
                  </div>
                  <span className="text-[10px] text-white/60">Male · American · Alternative</span>
                </button>
              </div>

              {/* Wake Word Setting */}
              <div className="mt-3 flex items-center justify-between pt-2">
                <div>
                  <div className="font-semibold text-white">Voice Activation ("Hi {assistant.toUpperCase()}")</div>
                  <div className="text-[10px] text-white/50">Allow microphone wake word detection</div>
                </div>
                <button
                  type="button"
                  onClick={() => savePreferences(assistant, !voiceActivation)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    voiceActivation ? "bg-purple-600" : "bg-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "block h-4 w-4 rounded-full bg-white transition-transform transform",
                      voiceActivation ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Remaining credits and Top Up */}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <span className="text-white/60 text-[11px]">AI Allowance:</span>{" "}
                  <b className="text-amber-400 font-bold">{credits.balance}</b> / {credits.monthlyAllowance}
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 font-bold text-[10px] transition"
                >
                  Add Credits
                </button>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1 max-w-[85%] text-xs leading-relaxed",
                  msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 shadow-md",
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-xs"
                      : "bg-white/[0.08] text-white/95 border border-white/10 rounded-bl-xs"
                  )}
                >
                  {msg.content}
                </div>

                {/* Siri-Style Interactive Action Cards */}
                {msg.action && (
                  <div className="w-full mt-1.5 space-y-2">
                    {/* 1. Direct Playback Card */}
                    {(msg.action.type === "play_title" || msg.action.type === "resume_playback") && (
                      <div className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-950/40 p-2.5 shadow-lg backdrop-blur-md">
                        {msg.action.posterUrl && (
                          <img
                            src={msg.action.posterUrl}
                            alt=""
                            className="h-16 w-11 rounded-lg object-cover ring-1 ring-white/20"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-white text-xs truncate">{msg.action.name}</h4>
                          <span className="text-[10px] text-purple-300">
                            {msg.action.type === "resume_playback" ? "Resume playback" : "Ready to stream free"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            stopSpeech();
                            setIsOpen(false);
                            if (msg.action?.url) navigate(msg.action.url);
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 font-black text-xs shadow-md transition"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Watch</span>
                        </button>
                      </div>
                    )}

                    {/* 2. Recommendations / Search Results Grid */}
                    {msg.action.items && msg.action.items.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {msg.action.items.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              stopSpeech();
                              setIsOpen(false);
                              navigate(item.url);
                            }}
                            className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-2 hover:bg-white/[0.08] hover:border-purple-400/50 transition cursor-pointer"
                          >
                            {item.posterUrl ? (
                              <img
                                src={item.posterUrl}
                                alt=""
                                className="h-24 w-full rounded-lg object-cover mb-1.5 group-hover:scale-102 transition-transform"
                              />
                            ) : (
                              <div className="h-24 w-full rounded-lg bg-white/5 grid place-items-center mb-1.5">
                                <BrandLogo className="h-6 w-6 text-white/30" />
                              </div>
                            )}
                            <span className="font-bold text-white text-[11px] truncate">{item.name}</span>
                            <span className="text-[10px] text-white/50">{item.year || "Movie"}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 3. Navigation Link */}
                    {msg.action.type === "navigate" && msg.action.url && (
                      <button
                        type="button"
                        onClick={() => {
                          stopSpeech();
                          setIsOpen(false);
                          if (msg.action?.url) navigate(msg.action.url);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/40 bg-purple-600/20 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-600/40 transition"
                      >
                        <span>{msg.action.label || "Go to page"}</span>
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-xs text-purple-300 w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
                <span>{assistant === "princeton" ? "PRINCETON" : "RAVEN"} is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Speaking Audio Interruption Banner */}
          {isSpeaking && (
            <div className="flex items-center justify-between border-t border-purple-500/20 bg-purple-950/60 px-3.5 py-1.5 text-[11px] text-purple-200 animate-fade-in">
              <div className="flex items-center gap-1.5">
                <Volume2 size={13} className="text-amber-400 animate-pulse" />
                <span>Speaking...</span>
              </div>
              <button
                type="button"
                onClick={stopSpeech}
                className="rounded px-2 py-0.5 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white transition"
              >
                Stop
              </button>
            </div>
          )}

          {/* Listening Pulsing Mic State */}
          {isListening && (
            <div className="flex items-center justify-between border-t border-amber-500/30 bg-amber-950/40 px-3.5 py-2 text-[11px] text-amber-200 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="font-semibold">Listening for your command...</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="rounded-full bg-red-600 hover:bg-red-500 text-white px-2.5 py-0.5 text-[10px] font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Footer Controls & Text Input */}
          <div className="border-t border-white/10 bg-[#120a26] p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
                  isListening
                    ? "bg-amber-500 text-black shadow-lg animate-pulse"
                    : "bg-white/[0.08] text-white/70 hover:bg-white/[0.15] hover:text-white"
                )}
                title={isListening ? "Stop Listening" : `Push-to-Talk with ${assistant.toUpperCase()}`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${assistant === "princeton" ? "PRINCETON" : "RAVEN"}...`}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-xs text-white placeholder-white/40 focus:border-purple-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-500 disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-white/40 px-1">
              <span>AI-generated voice · Powered by FamilyFlix</span>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="text-amber-400 hover:underline font-semibold"
              >
                {credits.balance} credits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- INSTANT UPGRADE & TOP-UP MODAL -------------------- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#120a26] p-6 text-white shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-300" />
                <h3 className="font-black text-base">FamilyFlix AI Concierge Credits</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-lg p-1 text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-white/70 leading-relaxed">
              RAVEN and PRINCETON use AI credits for speech synthesis and catalog intelligence. Choose an instant top-up or upgrade to VIP for unlimited streaming and generous credits.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-2xl border border-purple-500/40 bg-purple-950/40 p-3.5">
                <div>
                  <h4 className="font-black text-sm text-white">500 AI Credits Top-Up</h4>
                  <span className="text-[11px] text-purple-300">Instant credit addition to your account</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTopUpCredits(500)}
                  className="rounded-full bg-amber-500 hover:bg-amber-400 text-black px-4 py-1.5 font-bold text-xs transition shadow-md"
                >
                  Add for Free
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-sm text-white">FamilyFlix VIP</h4>
                    <span className="rounded bg-amber-400 text-black px-1.5 text-[9px] font-black">POPULAR</span>
                  </div>
                  <span className="text-[11px] text-white/50">2,000 monthly credits + Ad-Free 1080p stream</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate("/account");
                  }}
                  className="rounded-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 font-bold text-xs transition shadow-md"
                >
                  \$4.99/mo
                </button>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs text-white/40 hover:text-white transition"
              >
                Cancel and return to chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
