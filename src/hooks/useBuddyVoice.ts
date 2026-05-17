import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BUDDY_SCRIPTS } from '@/constants/buddyScripts';
import {
  defaultCommandFor,
  parseCommand,
  type BuddyCommand,
  type BuddySceneKind,
} from '@/lib/buddyCommands';
import { hasAiApi } from '@/lib/aiApi';
import { speakTts, subscribeTtsState } from '@/lib/tts';
import { transcribeAudio, VAD_CONFIG } from '@/lib/stt';
import { askVoice, type ScreenContext } from '@/lib/voiceAsk';

type VoiceState = 'idle' | 'speaking';

export interface VoiceContext {
  screenContext: ScreenContext;
  frameUri?: string | null;
  lat?: number | null;
  lon?: number | null;
}

interface UseBuddyVoiceArgs {
  sceneKind: BuddySceneKind;
  enabled: boolean;
  onCommand: (cmd: BuddyCommand) => void;
  onTranscript?: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onPermissionDenied?: () => void;
  onAssistantSpeech?: (text: string) => void;
  getVoiceContext?: () => VoiceContext | Promise<VoiceContext>;
}

function mockTranscriptFor(sceneKind: BuddySceneKind): string | null {
  if (sceneKind === 'mode_select') return 'spor';
  if (sceneKind === 'walk_duration') return 'yirmi dakika';
  if (sceneKind === 'sport_equipment') return 'sıradaki hareket';
  if (sceneKind === 'walk_active') return 'önümde ne var';
  return null;
}

function mockAnswerFor(sceneKind: BuddySceneKind): string | null {
  if (sceneKind === 'walk_active') return BUDDY_SCRIPTS.walkWarnings[0];
  if (sceneKind === 'sport_navigating') return BUDDY_SCRIPTS.sportSearching;
  if (sceneKind === 'sport_done') return BUDDY_SCRIPTS.sportDone;
  return null;
}

export function useBuddyVoice({
  sceneKind,
  enabled,
  onCommand,
  onTranscript,
  onListeningChange,
  onPermissionDenied,
  onAssistantSpeech,
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
  const failureCount = useRef(0);
  const sceneKindRef = useRef(sceneKind);
  const enabledRef = useRef(enabled);
  const isTranscribing = useRef(false);
  const permissionGranted = useRef(false);
  const recorderReady = useRef(false);

  sceneKindRef.current = sceneKind;
  enabledRef.current = enabled;

  useEffect(() => {
    failureCount.current = 0;
    voiceState.current = 'idle';
    aboveThresholdMs.current = 0;
    silenceMs.current = 0;
    segmentMs.current = 0;
  }, [sceneKind]);

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
      if (!uri) {
        isTranscribing.current = false;
        if (enabledRef.current) await startRecording();
        return;
      }
      const sk = sceneKindRef.current;
      let transcript = '';
      try {
        transcript = await transcribeAudio(uri);
      } catch (err) {
        console.warn('[voice] /stt fail, mock transcript kullanılıyor', err);
      }
      if (!transcript) {
        // MOCK: Servis yoksa kullanıcı gerçekten konuşmuş gibi sahneye uygun cevap üret.
        transcript = mockTranscriptFor(sk) ?? '';
      }
      if (transcript) onTranscript?.(transcript);

      const cmd = parseCommand(transcript, sk);
      if (cmd) {
        failureCount.current = 0;
        onCommand(cmd);
      } else if (transcript) {
        let aiHandled = false;
        if (getVoiceContext && hasAiApi()) {
          try {
            const ctx = await getVoiceContext();
            const answer = await askVoice({
              transcript,
              screenContext: ctx.screenContext,
              frameUri: ctx.frameUri,
              lat: ctx.lat,
              lon: ctx.lon,
            });
            const reply = answer.answer_speak_text.trim();
            if (reply) {
              failureCount.current = 0;
              await speakAssistant(reply);
              aiHandled = true;
            }
            if (answer.requires_action === 'switch_to_sport') {
              onCommand({ kind: 'select_sport' });
            } else if (answer.requires_action === 'switch_to_buddy') {
              onCommand({ kind: 'select_walk' });
            }
          } catch (err) {
            console.warn('[voice] /voice/ask fail', err);
          }
        }
        if (!aiHandled) {
          const mockAnswer = mockAnswerFor(sk);
          if (mockAnswer) {
            failureCount.current = 0;
            await speakAssistant(mockAnswer);
            aiHandled = true;
          }
        }
        if (!aiHandled) {
          failureCount.current += 1;
          if (failureCount.current === 1) {
            await speakAssistant('Anlayamadım, tekrar söyler misiniz?');
          } else {
            const fallback = defaultCommandFor(sk);
            failureCount.current = 0;
            if (fallback) onCommand(fallback);
          }
        }
      }
    } catch (err) {
      console.warn('[voice] utterance handling failed', err);
    } finally {
      isTranscribing.current = false;
      voiceState.current = 'idle';
      aboveThresholdMs.current = 0;
      silenceMs.current = 0;
      segmentMs.current = 0;
      if (enabledRef.current) {
        setTimeout(() => {
          void startRecording();
        }, 80);
      }
    }
  }, [
    recorder,
    onCommand,
    onTranscript,
    onListeningChange,
    startRecording,
    getVoiceContext,
    speakAssistant,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        await speakAssistant(BUDDY_SCRIPTS.micPermissionDenied);
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
  }, [enabled, recorder, startRecording, onListeningChange, onPermissionDenied, speakAssistant]);

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
  }, [enabled, recorderState.isRecording, recorderState.metering, handleUtterance]);

  return { listening, metering: recorderState.metering ?? null, isSpeaking };
}
