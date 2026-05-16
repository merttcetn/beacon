import { Audio } from 'expo-av';
import Constants from 'expo-constants';

const FAL_TTS_ENDPOINT = 'https://fal.run/fal-ai/elevenlabs/tts/multilingual-v2';
const VOICE = 'Aria';

interface FalTtsResponse {
  audio?: { url?: string };
  data?: {
    audio?: { url?: string };
  };
}

let currentSound: Audio.Sound | null = null;
let requestId = 0;

const audioUrlCache = new Map<string, string>();

function getFalKey() {
  const extra = Constants.expoConfig?.extra as { FAL_KEY?: string } | undefined;
  return extra?.FAL_KEY ?? '';
}

async function unloadCurrentSound() {
  const sound = currentSound;
  currentSound = null;
  if (!sound) return;

  try {
    await sound.stopAsync();
  } catch {
    // Sound may already be stopped or unloaded.
  }

  try {
    await sound.unloadAsync();
  } catch {
    // Nothing useful to recover in the demo flow.
  }
}

async function fetchAudioUrl(text: string) {
  const cached = audioUrlCache.get(text);
  if (cached) return cached;

  const falKey = getFalKey();
  if (!falKey) {
    throw new Error('FAL_KEY tanımlı değil. .env dosyasını ve Expo config extra alanını kontrol et.');
  }

  const response = await fetch(FAL_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice: VOICE,
      language_code: 'tr',
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.15,
      speed: 1,
      apply_text_normalization: 'auto',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`fal.ai TTS hata verdi (${response.status}): ${body.slice(0, 180)}`);
  }

  const data = (await response.json()) as FalTtsResponse;
  const audioUrl = data.audio?.url ?? data.data?.audio?.url;

  if (!audioUrl) {
    throw new Error('fal.ai TTS yanıtında audio.url yok.');
  }

  audioUrlCache.set(text, audioUrl);
  return audioUrl;
}

export async function stopTts() {
  requestId += 1;
  await unloadCurrentSound();
}

export async function speakTts(text: string) {
  const cleanText = text.trim();
  if (!cleanText) return;

  const activeRequest = requestId + 1;
  requestId = activeRequest;

  await unloadCurrentSound();

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    const audioUrl = await fetchAudioUrl(cleanText);
    if (activeRequest !== requestId) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true, volume: 1 },
    );

    if (activeRequest !== requestId) {
      await sound.unloadAsync();
      return;
    }

    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        if (currentSound === sound) currentSound = null;
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (error) {
    if (activeRequest === requestId) {
      console.warn('[tts] fal.ai ElevenLabs TTS oynatılamadı:', error);
    }
  }
}
