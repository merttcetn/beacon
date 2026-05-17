import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import { AI_API_URL, assertAiApi } from './aiApi';

let currentSound: Audio.Sound | null = null;
let requestId = 0;
let audioModeInitialized = false;

async function ensureAudioMode() {
  if (audioModeInitialized) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
  audioModeInitialized = true;
}

const audioFileCache = new Map<string, string>();

type TtsListener = (isSpeaking: boolean) => void;
const ttsListeners = new Set<TtsListener>();
let ttsIsSpeaking = false;

function emitTtsState(next: boolean) {
  if (ttsIsSpeaking === next) return;
  ttsIsSpeaking = next;
  ttsListeners.forEach((l) => l(next));
}

export function subscribeTtsState(listener: TtsListener): () => void {
  ttsListeners.add(listener);
  listener(ttsIsSpeaking);
  return () => {
    ttsListeners.delete(listener);
  };
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

function textHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function extensionForContentType(contentType: string | null): string {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'audio/mpeg' || normalized === 'audio/mp3') return 'mp3';
  if (normalized === 'audio/wav' || normalized === 'audio/x-wav') return 'wav';
  if (normalized === 'audio/mp4' || normalized === 'audio/aac') return 'm4a';
  if (normalized === 'audio/flac') return 'flac';
  return 'mp3';
}

async function fetchAudioFile(text: string): Promise<string> {
  const cached = audioFileCache.get(text);
  if (cached) return cached;

  assertAiApi();

  const form = new FormData();
  form.append('text', text);

  const response = await fetch(`${AI_API_URL}/tts`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`/tts hata verdi (${response.status}): ${body.slice(0, 180)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    const payload = await response.json().catch(() => null);
    throw new Error(`/tts unavailable: ${JSON.stringify(payload).slice(0, 180)}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const extension = extensionForContentType(contentType);

  const file = new File(Paths.cache, `tts-${textHash(text)}.${extension}`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);

  audioFileCache.set(text, file.uri);
  return file.uri;
}

export async function stopTts() {
  requestId += 1;
  await unloadCurrentSound();
  emitTtsState(false);
}

export async function speakTts(text: string) {
  const cleanText = text.trim();
  if (!cleanText) return;

  const activeRequest = requestId + 1;
  requestId = activeRequest;

  await unloadCurrentSound();
  emitTtsState(true);

  try {
    await ensureAudioMode();

    const audioUri = await fetchAudioFile(cleanText);
    if (activeRequest !== requestId) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
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
        if (activeRequest === requestId) emitTtsState(false);
      }
    });
  } catch (error) {
    if (activeRequest === requestId) {
      console.warn('[tts] /tts oynatılamadı, sessiz kalınıyor:', error);
      emitTtsState(false);
    }
  }
}
