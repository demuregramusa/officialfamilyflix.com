import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  X,
  Bot,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Play,
  Sparkles,
  Clapperboard,
  Tv,
  Film,
  Loader2,
  ChevronDown,
  AudioWaveform,
} from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import { useListPublicTitles } from "@workspace/api-client-react";

export interface HumanVoiceOption {
  id: string;
  name: string;
  description: string;
  flag: string;
  locale: string;
}

export const HUMAN_VOICES: HumanVoiceOption[] = [
  { id: "emma", name: "Emma", description: "Warm, Conversational & Friendly (US)", flag: "🇺🇸", locale: "en-US" },
  { id: "james", name: "James", description: "Cinema Host & Natural Delivery (US)", flag: "🇺🇸", locale: "en-US" },
  { id: "olivia", name: "Olivia", description: "Warm & Elegant Human Voice (UK)", flag: "🇬🇧", locale: "en-GB" },
  { id: "william", name: "William", description: "Classic Broadcast Host (UK)", flag: "🇬🇧", locale: "en-GB" },
  { id: "liam", name: "Liam", description: "Casual & Friendly Human Voice (AU)", flag: "🇦🇺", locale: "en-AU" },
  { id: "chloe", name: "Chloe", description: "Bright & Expressive Human Voice (CA)", flag: "🇨🇦", locale: "en-CA" },
];

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  suggestedTitles?: Array<{
    name: string;
    slug: string;
    kind: string;
    year?: number | null;
    posterUrl?: string | null;
    genres?: string[];
  }>;
}

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const { voiceChatEnabled, setVoiceChatEnabled, humanVoice, setHumanVoice } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      sender: "assistant",
      text: "Hello! I'm your FamilyFlix AI Movie Concierge. Ask me to recommend movies or TV shows, explore genres, or find anything you want to stream. What are you in the mood for?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch catalog for smart recommendation lookup
  const { data: catalogTitles } = useListPublicTitles({ limit: 100 });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Stop any active human speech audio
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
    }
    return () => {
      stopSpeaking();
    };
  }, [isOpen, stopSpeaking]);

  // Speak response strictly with real high-definition natural human voice audio
  const speakText = useCallback(
    (text: string, voiceOverride?: string) => {
      if (!voiceChatEnabled) return;
      stopSpeaking();

      const cleaned = text
        .replace(/[*_#`~[\]()]/g, "")
        .replace(/\bhttps?:\/\/\S+/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleaned) return;

      const chosenVoice = voiceOverride || humanVoice || "emma";
      const audioUrl = `/api/ai/tts?text=${encodeURIComponent(cleaned)}&voice=${encodeURIComponent(chosenVoice)}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        setIsSpeaking(false);
        // Strictly prevent any robotic synthesis. Only play if verified natural online voice is available
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const voices = window.speechSynthesis.getVoices();
          const ROBOTIC_VOICE_NAMES = ["David", "Zira", "Mark", "Hazel", "George", "Desktop", "eSpeak", "Festival", "SAPI"];
          const naturalVoice = voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              !ROBOTIC_VOICE_NAMES.some((bad) => v.name.includes(bad)) &&
              (v.name.includes("Natural") ||
                v.name.includes("Online") ||
                v.name.includes("Neural") ||
                v.name.includes("Google") ||
                v.name.includes("Samantha"))
          );
          if (naturalVoice) {
            const utterance = new SpeechSynthesisUtterance(cleaned);
            utterance.voice = naturalVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          }
        }
      };

      audio.play().catch((err) => {
        // Autoplay may require prior user interaction
        console.warn("Audio playback initiated, awaiting user interaction:", err);
        setIsSpeaking(false);
      });
    },
    [voiceChatEnabled, humanVoice, stopSpeaking]
  );

  // Preview chosen human voice
  const handlePreviewVoice = (vId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const opt = HUMAN_VOICES.find((v) => v.id === vId) || HUMAN_VOICES[0];
    setHumanVoice(opt.id);
    speakText(`Hi, I'm ${opt.name}! I'm here to recommend the best movies and TV shows for you on FamilyFlix.`, opt.id);
  };

  // Speech Recognition (Mic Input)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  };

  // Conversational response engine with strict security guardrails
  const generateResponse = async (userPrompt: string) => {
    setIsThinking(true);
    const lower = userPrompt.toLowerCase();

    // STRICT GUARDRAIL: Block any attempt to inspect internal code, credentials or DB
    const forbiddenPatterns = [
      /password/i,
      /secret/i,
      /database/i,
      /postgres/i,
      /better_auth/i,
      /server path/i,
      /api_key/i,
      /system prompt/i,
      /internal/i,
      /drop table/i,
      /select from/i,
      /admin38274/i,
    ];

    if (forbiddenPatterns.some((pattern) => pattern.test(lower))) {
      await new Promise((r) => setTimeout(r, 600));
      setIsThinking(false);
      const safeReply =
        "As your FamilyFlix Cinema Concierge, I focus exclusively on recommending movies, TV shows, and helping you discover titles in our catalog. What kind of entertainment would you like to watch?";
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "assistant",
          text: safeReply,
          timestamp: "Just now",
        },
      ]);
      speakText(safeReply);
      return;
    }

    // Catalog Matching
    const allTitles = catalogTitles || [];
    let matched = allTitles.filter((t) => {
      const nameMatch = lower.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(lower);
      const genreMatch = t.genres?.some((g) => lower.includes(g.toLowerCase()));
      const synopsisMatch = t.synopsis?.toLowerCase().includes(lower);
      return nameMatch || genreMatch || synopsisMatch;
    });

    // If specific queries like "comedy", "tv", "series", "action", "kids"
    const isLookingForTV = lower.includes("tv") || lower.includes("show") || lower.includes("series") || lower.includes("episode");
    if (isLookingForTV) {
      const tvTitles = allTitles.filter((t) => t.kind === "series");
      if (tvTitles.length) matched = [...tvTitles, ...matched];
    }

    const uniqueMatched = Array.from(
      new Map(matched.map((item) => [item.slug, item])).values()
    ).slice(0, 3);

    await new Promise((r) => setTimeout(r, 700));
    setIsThinking(false);

    let replyText = "";
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      replyText = "Hello! Ready for movie night? I can suggest top-rated movies, trending TV series, or find comedies and family animations for you.";
    } else if (isLookingForTV && uniqueMatched.length > 0) {
      replyText = `We have fantastic TV series streaming in full right now, including "${uniqueMatched[0].name}". You can watch every episode starting with Season 1 below!`;
    } else if (uniqueMatched.length > 0) {
      replyText = `Here are top recommendations that match your taste: "${uniqueMatched[0].name}". You can stream it in high definition right now!`;
    } else {
      const fallbackPicks = allTitles.slice(0, 2);
      replyText = "I searched through our catalog! Here are trending titles and popular favorites you'll love watching:";
      uniqueMatched.push(...fallbackPicks);
    }

    const newMessage: Message = {
      id: String(Date.now()),
      sender: "assistant",
      text: replyText,
      timestamp: "Just now",
      suggestedTitles: uniqueMatched.map((m) => ({
        name: m.name,
        slug: m.slug,
        kind: m.kind,
        year: m.year,
        posterUrl: m.posterUrl,
        genres: m.genres,
      })),
    };

    setMessages((prev) => [...prev, newMessage]);
    speakText(replyText);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;
    stopSpeaking();

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    generateResponse(text);
  };

  const currentVoiceOption = HUMAN_VOICES.find((v) => v.id === humanVoice) || HUMAN_VOICES[0];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] max-h-[720px] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#1b122c] via-[#12161b] to-[#0c1014] shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md shadow-purple-600/40">
              <Bot size={22} className="text-white" />
              {isSpeaking && (
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">FamilyFlix AI Concierge</h3>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-purple-300 border border-purple-500/30">
                  Assistant
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Natural Human Voices & Smart Search
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Human Voice Persona Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setVoiceDropdownOpen(!voiceDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-500/20 transition"
                title="Select Human Voice"
              >
                <span>{currentVoiceOption.flag}</span>
                <span>{currentVoiceOption.name}</span>
                <ChevronDown size={12} className="text-purple-300/70" />
              </button>

              {voiceDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#1a1429] p-2 shadow-2xl z-50 animate-fade-in text-left">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/40">
                    Human Voice Cast (Zero Robots)
                  </div>
                  <div className="space-y-1 mt-1">
                    {HUMAN_VOICES.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setHumanVoice(v.id);
                          setVoiceDropdownOpen(false);
                          handlePreviewVoice(v.id);
                        }}
                        className={`flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition ${
                          humanVoice === v.id
                            ? "bg-purple-600/30 text-purple-200 border border-purple-500/40"
                            : "hover:bg-white/5 text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{v.flag}</span>
                          <div>
                            <div className="text-xs font-bold leading-none">{v.name}</div>
                            <div className="text-[10px] text-white/40 leading-tight mt-0.5">
                              {v.description}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(v.id, e)}
                          className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/70 hover:bg-purple-500 hover:text-white"
                          title="Preview Voice"
                        >
                          Play
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Mute / Speak Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !voiceChatEnabled;
                setVoiceChatEnabled(next);
                if (!next) stopSpeaking();
              }}
              className={`grid size-8 place-items-center rounded-full border transition ${
                voiceChatEnabled
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
              }`}
              title={voiceChatEnabled ? "Human Voice Output Active" : "Voice Output Muted"}
            >
              {voiceChatEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Audio Wave Visualizer while Speaking with Real Human Voice */}
        {isSpeaking && (
          <div className="flex items-center justify-between bg-purple-600/20 px-6 py-2 border-b border-purple-500/20 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-1 h-3.5">
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-2"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3.5"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-1.5"></span>
              </div>
              <span className="text-xs font-semibold text-emerald-300">
                Speaking with Natural Human Voice ({currentVoiceOption.name})...
              </span>
            </div>
            <button
              onClick={stopSpeaking}
              className="text-[11px] font-bold text-white/70 hover:text-white underline"
            >
              Stop
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "border border-white/10 bg-white/[0.05] text-white/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>{msg.text}</span>
                  {msg.sender === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="text-white/40 hover:text-purple-300 shrink-0 transition"
                      title="Listen with Natural Human Voice"
                    >
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>

                {/* Embedded Movie / TV Recommendations with Play Now */}
                {msg.suggestedTitles && msg.suggestedTitles.length > 0 && (
                  <div className="mt-3.5 space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Recommended to Watch:
                    </span>
                    <div className="grid gap-2">
                      {msg.suggestedTitles.map((title) => (
                        <div
                          key={title.slug}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-2.5 hover:border-purple-500/40 transition"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {title.posterUrl ? (
                              <img
                                src={title.posterUrl}
                                alt={title.name}
                                className="size-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="grid size-10 place-items-center rounded-lg bg-white/5 text-white/40">
                                {title.kind === "series" ? <Tv size={16} /> : <Film size={16} />}
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs font-bold text-white truncate">
                                  {title.name}
                                </span>
                                {title.kind === "series" && (
                                  <span className="rounded bg-purple-500/20 px-1 py-0.2 text-[8px] font-bold text-purple-300 border border-purple-500/30 shrink-0">
                                    TV
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40">
                                {title.year || "Catalog Feature"} • {title.genres?.[0] || "Public Domain"}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/title/${title.slug}`}
                            onClick={() => {
                              stopSpeaking();
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 transition shrink-0"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Play</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[10px] text-white/30">{msg.timestamp}</span>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Loader2 size={14} className="animate-spin text-purple-400" />
              <span>FamilyFlix Concierge is searching titles...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 p-3 sm:p-4 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`grid size-10 place-items-center rounded-2xl border transition ${
                isListening
                  ? "border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title={isListening ? "Listening... Speak now" : "Speak to Concierge"}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for movies, TV series, or genres..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-none focus:border-purple-500/50 focus:bg-white/10 transition"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="grid size-10 place-items-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-40 transition"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
