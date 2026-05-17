import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speakTts, subscribeTtsState, waitForTtsIdle } from '@/lib/tts';
import { assist, type NearbyTicket, type ScreenContext } from '@/lib/assist';
import type { AssistResponse } from '@/lib/vlm';

export const VAD_CONFIG = {
  SPEECH_THRESHOLD_DB: -30,
  SPEECH_START_MS: 350,
  SILENCE_END_MS: 1200,
  MAX_UTTERANCE_MS: 5000,
  POLL_INTERVAL_MS: 100,
} as const;

type VoiceState = 'idle' | 'speaking';

export interface VoiceContext {
  frameUri?: string | null;
  lat?: number | null;
  lon?: number | null;
  screenContext?: ScreenContext;
  nearbyTickets?: NearbyTicket[] | null;
}

interface UseBuddyVoiceArgs {
  enabled: boolean;
  onListeningChange?: (listening: boolean) => void;
  onPermissionDenied?: () => void;
  onAssistantSpeech?: (text: string) => void;
  onAssistResult?: (result: AssistResponse) => void;
  onSpeechStart?: () => void;
  onVoiceFlowChange?: (active: boolean) => void;
  getVoiceContext?: () => VoiceContext | Promise<VoiceContext>;
}

export function useBuddyVoice({
  enabled,
  onListeningChange,
  onPermissionDenied,
  onAssistantSpeech,
  onAssistResult,
  onSpeechStart,
  onVoiceFlowChange,
  getVoiceContext,
}: UseBuddyVoiceArgs) {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, VAD_CONFIG.POLL_INTERVAL_MS);

  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsGate = useRef(false);
  const voiceState = useRef<VoiceState>('idle');
  const aboveThresholdMs = useRef(0);
  const silenceMs = useRef(0);
  const segmentMs = useRef(0);
  const enabledRef = useRef(enabled);
  const isTranscribing = useRef(false);
  const permissionGranted = useRef(false);
  const recorderReady = useRef(false);

  enabledRef.current = enabled;

  useEffect(() => {
    const unsub = subscribeTtsState((speaking) => {
      ttsGate.current = speaking;
      setIsSpeaking(speaking);
      if (speaking) {
        voiceState.current = 'idle';
        aboveThresholdMs.current = 0;
        silenceMs.current = 0;
        segmentMs.current = 0;
      }
    });
    return unsub;
  }, []);

  const startRecording = useCallback(async () => {
    if (!recorderReady.current) return;
    if (recorderState.isRecording) return;
    try {
      await recorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recorder.record();
      setListening(true);
      onListeningChange?.(true);
    } catch (err) {
      console.warn('[voice] record start failed', err);
    }
  }, [recorder, recorderState.isRecording, onListeningChange]);

  const speakAssistant = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      onAssistantSpeech?.(clean);
      await speakTts(clean);
      await waitForTtsIdle();
    },
    [onAssistantSpeech],
  );

  const handleUtterance = useCallback(async () => {
    if (isTranscribing.current) return;
    isTranscribing.current = true;
    setListening(false);
    onListeningChange?.(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      if (!getVoiceContext) return;
      try {
        const ctx = await getVoiceContext();
        const result = await assist({
          event: 'voice',
          audioUri: uri,
          screenContext: ctx.screenContext ?? 'buddy_mode',
          frameUri: ctx.frameUri,
          lat: ctx.lat,
          lon: ctx.lon,
          nearbyTickets: ctx.nearbyTickets,
        });
        onAssistResult?.(result);
        const reply = result.speak_text.trim();
        if (reply) await speakAssistant(reply);
      } catch (err) {
        console.warn('[voice] /v1/assist voice fail', err);
      }
    } catch (err) {
      console.warn('[voice] utterance handling failed', err);
    } finally {
      isTranscribing.current = false;
      voiceState.current = 'idle';
      aboveThresholdMs.current = 0;
      silenceMs.current = 0;
      segmentMs.current = 0;
      onVoiceFlowChange?.(false);
      if (enabledRef.current) {
        setTimeout(() => {
          void startRecording();
        }, 80);
      }
    }
  }, [
    recorder,
    onListeningChange,
    startRecording,
    getVoiceContext,
    speakAssistant,
    onAssistResult,
    onVoiceFlowChange,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        onPermissionDenied?.();
        return;
      }
      permissionGranted.current = true;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
      recorderReady.current = true;
      await startRecording();
    })();
    return () => {
      cancelled = true;
      recorderReady.current = false;
      recorder.stop().catch(() => {});
      setListening(false);
      onListeningChange?.(false);
    };
  }, [enabled, recorder, startRecording, onListeningChange, onPermissionDenied]);

  useEffect(() => {
    if (!enabled) return;
    if (!recorderState.isRecording) return;
    if (ttsGate.current) return;
    if (isTranscribing.current) return;

    const db = recorderState.metering;
    if (db == null) return;
    const step = VAD_CONFIG.POLL_INTERVAL_MS;

    if (voiceState.current === 'idle') {
      if (db > VAD_CONFIG.SPEECH_THRESHOLD_DB) {
        aboveThresholdMs.current += step;
        if (aboveThresholdMs.current >= VAD_CONFIG.SPEECH_START_MS) {
          voiceState.current = 'speaking';
          segmentMs.current = aboveThresholdMs.current;
          silenceMs.current = 0;
          onVoiceFlowChange?.(true);
          onSpeechStart?.();
        }
      } else {
        aboveThresholdMs.current = 0;
      }
      return;
    }

    segmentMs.current += step;
    if (db < VAD_CONFIG.SPEECH_THRESHOLD_DB) {
      silenceMs.current += step;
    } else {
      silenceMs.current = 0;
    }

    if (
      silenceMs.current >= VAD_CONFIG.SILENCE_END_MS ||
      segmentMs.current >= VAD_CONFIG.MAX_UTTERANCE_MS
    ) {
      void handleUtterance();
    }
  }, [
    enabled,
    recorderState.isRecording,
    recorderState.metering,
    handleUtterance,
    onSpeechStart,
    onVoiceFlowChange,
  ]);

  return { listening, metering: recorderState.metering ?? null, isSpeaking };
}
