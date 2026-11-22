import { logger } from "./logger";

// Voice locales supported for high-definition natural human speech
const VOICE_MAP: Record<string, string> = {
  emma: "en-US",
  "en-us": "en-US",
  james: "en-US",
  olivia: "en-GB",
  "en-gb": "en-GB",
  william: "en-GB",
  liam: "en-AU",
  "en-au": "en-AU",
  chloe: "en-CA",
  "en-ca": "en-CA",
  default: "en-US",
};

// In-memory audio cache for instant playback (up to 200 phrases)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 200;

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[*_#`~[\]()]/g, "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split long text into natural human conversational breath chunks (~160 chars max)
 * strictly splitting at sentence or clause boundaries.
 */
function splitIntoNaturalChunks(text: string, maxLen = 160): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  // Split on sentence terminals first (.!?)
  const sentenceRegex = /[^.!?]+[.!?]+|\s*[^.!?]+$/g;
  const sentences = cleaned.match(sentenceRegex) || [cleaned];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split on commas or conjunctions if a single sentence is long
      const words = trimmed.split(/\s+/);
      let current = "";
      for (const word of words) {
        if ((current + " " + word).trim().length <= maxLen) {
          current = (current + " " + word).trim();
        } else {
          if (current) chunks.push(current);
          current = word;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Fetch a single audio fragment from high-definition speech synthesis
 */
async function fetchAudioFragment(phrase: string, lang: string): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(phrase)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Referer": "https://translate.google.com/",
      "Accept": "audio/mpeg, audio/*;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`TTS provider returned HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates natural human speech audio (MP3) for given text
 */
export async function generateHumanSpeech(text: string, voiceKey = "emma"): Promise<Buffer> {
  const normalizedVoice = (voiceKey || "emma").toLowerCase();
  const lang = VOICE_MAP[normalizedVoice] || VOICE_MAP.default;

  const cacheKey = `${lang}:${text.trim().toLowerCase()}`;
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const chunks = splitIntoNaturalChunks(text, 160);
  if (chunks.length === 0) {
    throw new Error("No pronounceable text provided");
  }

  // Fetch audio fragments in parallel with order preserved
  const audioBuffers: Buffer[] = [];
  for (const chunk of chunks) {
    try {
      const buffer = await fetchAudioFragment(chunk, lang);
      audioBuffers.push(buffer);
    } catch (err) {
      logger.warn({ err, chunk }, "Failed to synthesize speech chunk, skipping chunk");
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error("Could not synthesize audio for the requested text");
  }

  const combinedAudio = Buffer.concat(audioBuffers);

  // Store in cache
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(cacheKey, combinedAudio);

  return combinedAudio;
}
