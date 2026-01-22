'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Square, Loader2, Settings, Globe, Users, Plus, X, Sparkles } from 'lucide-react';
import { AudioVisualizer } from './audio-visualizer';
import { useSettings } from '@/hooks/use-settings';
import { cn, formatTimestamp } from '@/lib/utils';
import { TranscriptionResult, Utterance, SpeakerInfo } from '@/types/transcription';
import { Button } from '@/components/ui/button';

// Update tray recording indicator (Tauri only)
async function setTrayRecordingState(recording: boolean) {
  if (typeof window === 'undefined' || !window.__TAURI__) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_recording_state', { recording });
  } catch (e) {
    console.error('Failed to update tray state:', e);
  }
}

// Show and focus the Tauri window (for background recording completion)
async function showAndFocusWindow() {
  if (typeof window === 'undefined' || !window.__TAURI__) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.show();
    await win.setFocus();
  } catch (e) {
    console.error('Failed to show window:', e);
  }
}

interface LiveUtterance {
  id: string;
  speaker: number;
  text: string;
  start: number;
  end: number;
  isFinal: boolean;
  language?: string;
}

interface LiveRecorderProps {
  onRecordingStart: () => void;
  onRecordingComplete: (transcription: TranscriptionResult) => void;
  isProcessing: boolean;
  onOpenSettings?: () => void;
}

// Language code to name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  pl: 'Polish',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  uk: 'Ukrainian',
};

export function LiveRecorder({
  onRecordingStart,
  onRecordingComplete,
  isProcessing,
  onOpenSettings
}: LiveRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [utterances, setUtterances] = useState<LiveUtterance[]>([]);
  const [interimText, setInterimText] = useState('');
  const [interimSpeaker, setInterimSpeaker] = useState<number | null>(null);
  const [detectedLanguages, setDetectedLanguages] = useState<Set<string>>(new Set());
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [speakerCount, setSpeakerCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Speaker smoothing - track last speaker info to handle early recording inconsistencies
  const lastSpeakerRef = useRef<{ speaker: number; endTime: number } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Flag to immediately stop processing when user stops recording
  const isStoppingRef = useRef<boolean>(false);

  const { settings, isLoading: settingsLoading, keyValidation } = useSettings();

  // Check if required API keys are configured AND valid
  const hasRequiredKeys = useMemo(() => {
    if (settingsLoading) return true;

    if (settings.transcriptionProvider === 'deepgram') {
      if (!settings.apiKeys.deepgram) return false;
      if (keyValidation.deepgram === false) return false;
    } else if (settings.transcriptionProvider === 'elevenlabs') {
      if (!settings.apiKeys.elevenlabs) return false;
      if (keyValidation.elevenlabs === false) return false;
    }

    return true;
  }, [settings.transcriptionProvider, settings.apiKeys.deepgram, settings.apiKeys.elevenlabs, keyValidation, settingsLoading]);

  // Update speaker count
  useEffect(() => {
    const speakers = new Set(utterances.map(u => u.speaker));
    setSpeakerCount(speakers.size);
  }, [utterances]);

  // Initialize session (called during countdown) - sets up mic, WebSocket, but doesn't start recording
  const initializeSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not available.');
        return false;
      }

      isStoppingRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Reset state
      setUtterances([]);
      setInterimText('');
      setInterimSpeaker(null);
      setDetectedLanguages(new Set());
      setRecordingDuration(0);
      setSpeakerCount(0);
      audioChunksRef.current = [];
      lastSpeakerRef.current = null;

      // Audio analysis for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      // Resume AudioContext if suspended (browser policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // Higher resolution for better visualization
      analyser.smoothingTimeConstant = 0.7; // Smooth out the visualization
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder for backup (don't start yet)
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      // WebSocket for real-time transcription (connect but don't send audio yet)
      if (settings.transcriptionProvider === 'deepgram' && settings.apiKeys.deepgram) {
        const params = new URLSearchParams({
          model: 'nova-3',
          smart_format: 'true',
          diarize: 'true',
          punctuate: 'true',
          interim_results: 'true',
          language: 'multi',
          endpointing: '300',
        });

        const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
        const socket = new WebSocket(wsUrl, ['token', settings.apiKeys.deepgram]);
        socketRef.current = socket;

        // Set up message handler (will only process when recording)
        socket.onmessage = (event) => {
          // Immediately ignore if stopping
          if (isStoppingRef.current) return;

          try {
            const data = JSON.parse(event.data);

            if (data.type === 'Results') {
              const alternative = data.channel?.alternatives?.[0];
              if (!alternative) return;

              const text = alternative.transcript;
              if (!text) return;

              const isFinal = data.is_final;
              const words = alternative.words || [];

              const channelLang = data.channel?.detected_language;
              const altLanguages = alternative.languages as string[] | undefined;

              if (channelLang) {
                setDetectedLanguages(prev => new Set([...Array.from(prev), channelLang]));
              }
              if (altLanguages && altLanguages.length > 0) {
                setDetectedLanguages(prev => {
                  const newSet = new Set(Array.from(prev));
                  altLanguages.forEach(lang => newSet.add(lang));
                  return newSet;
                });
              }

              if (isFinal && text.trim()) {
                // Check again in case stop was called
                if (isStoppingRef.current) return;

                const utteranceStart = data.start || 0;
                const recordingTime = (Date.now() - startTimeRef.current) / 1000;
                const lastSpeaker = lastSpeakerRef.current;
                const timeSinceLastUtterance = lastSpeaker ? utteranceStart - lastSpeaker.endTime : Infinity;

                const shouldSmooth = lastSpeaker && (
                  (recordingTime < 10 && timeSinceLastUtterance < 1.5) ||
                  timeSinceLastUtterance < 0.5
                );

                if (words.length === 0) {
                  const smoothedSpeaker = shouldSmooth ? lastSpeaker!.speaker : 0;
                  const endTime = (data.start || 0) + (data.duration || 1);
                  lastSpeakerRef.current = { speaker: smoothedSpeaker, endTime };

                  const newUtterance: LiveUtterance = {
                    id: `utt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    speaker: smoothedSpeaker,
                    text: text.trim(),
                    start: data.start || 0,
                    end: endTime,
                    isFinal: true,
                    language: channelLang || 'en',
                  };
                  // Prepend new utterance (newest at top during recording)
                  setUtterances(prev => [newUtterance, ...prev]);
                } else {
                  const newUtterances: LiveUtterance[] = [];
                  const rawSpeaker = words[0].speaker ?? 0;
                  let currentSpeaker = shouldSmooth ? lastSpeaker!.speaker : rawSpeaker;
                  let currentLang = words[0].language || channelLang || 'en';
                  let currentWords: string[] = [];
                  let currentStart = words[0].start;
                  let currentEnd = words[0].end;

                  for (const word of words) {
                    const rawWordSpeaker = word.speaker ?? 0;
                    const wordLang = word.language || channelLang || 'en';

                    if (wordLang) {
                      setDetectedLanguages(prev => new Set([...Array.from(prev), wordLang]));
                    }

                    const wordGap = currentEnd > 0 ? word.start - currentEnd : 0;
                    const allowWordSplit = recordingTime > 10 || wordGap > 0.5;
                    const speakerChanged = allowWordSplit && rawWordSpeaker !== currentSpeaker;
                    const langChanged = wordLang !== currentLang;

                    if ((speakerChanged || langChanged) && currentWords.length > 0) {
                      newUtterances.push({
                        id: `utt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        speaker: currentSpeaker,
                        text: currentWords.join(' '),
                        start: currentStart,
                        end: currentEnd,
                        isFinal: true,
                        language: currentLang,
                      });
                      currentSpeaker = rawWordSpeaker;
                      currentLang = wordLang;
                      currentWords = [word.punctuated_word || word.word];
                      currentStart = word.start;
                    } else {
                      currentWords.push(word.punctuated_word || word.word);
                    }
                    currentEnd = word.end;
                  }

                  if (currentWords.length > 0) {
                    newUtterances.push({
                      id: `utt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      speaker: currentSpeaker,
                      text: currentWords.join(' '),
                      start: currentStart,
                      end: currentEnd,
                      isFinal: true,
                      language: currentLang,
                    });
                  }

                  if (newUtterances.length > 0) {
                    const lastUtterance = newUtterances[newUtterances.length - 1];
                    lastSpeakerRef.current = { speaker: lastUtterance.speaker, endTime: lastUtterance.end };
                    // Prepend new utterances (newest at top during recording)
                    // Reverse so newest of this batch is at top
                    setUtterances(prev => [...newUtterances.reverse(), ...prev]);
                  }
                }

                setInterimText('');
                setInterimSpeaker(null);
              } else if (!isFinal && text.trim()) {
                const speaker = words[0]?.speaker ?? null;
                setInterimText(text);
                setInterimSpeaker(speaker);
              }
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        socket.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
        };
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize session:', error);
      alert('Failed to access microphone. Please check permissions.');
      return false;
    }
  }, [settings.transcriptionProvider, settings.apiKeys.deepgram]);

  // Begin actual recording (called after countdown finishes)
  const beginRecording = useCallback(() => {
    if (!streamRef.current) return;

    startTimeRef.current = Date.now();

    // Start audio level visualization using time domain data (better for voice)
    const bufferLength = analyserRef.current?.fftSize || 512;
    const dataArray = new Uint8Array(bufferLength);
    const updateLevel = () => {
      if (analyserRef.current && !isStoppingRef.current) {
        // Use time domain data for more responsive voice visualization
        analyserRef.current.getByteTimeDomainData(dataArray);
        // Calculate RMS (root mean square) for better volume detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
          sum += value * value;
        }
        const rms = Math.sqrt(sum / bufferLength);
        // Scale up the RMS value for better visibility (voice is typically quiet)
        const scaledLevel = Math.min(1, rms * 3);
        setAudioLevel(scaledLevel);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };
    updateLevel();

    // Duration timer
    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Start the backup MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start(1000);
    }

    // Start sending audio to WebSocket
    if (socketRef.current && streamRef.current) {
      const audioMediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      });
      audioRecorderRef.current = audioMediaRecorder;

      audioMediaRecorder.ondataavailable = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN && e.data.size > 0 && !isStoppingRef.current) {
          socketRef.current.send(e.data);
        }
      };

      audioMediaRecorder.start(100);
    }

    setIsRecording(true);
    setTrayRecordingState(true);
    onRecordingStart();
  }, [onRecordingStart]);

  const stopRecording = useCallback(async () => {
    // Immediately stop processing any new data
    isStoppingRef.current = true;
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsSessionActive(false);
    setTrayRecordingState(false);

    // Build final result
    const duration = (Date.now() - startTimeRef.current) / 1000;

    // Sort utterances chronologically (oldest first) for the final result
    // During recording, they were prepended (newest first) for live view
    const chronologicalUtterances = [...utterances].sort((a, b) => a.start - b.start);

    const allText = chronologicalUtterances.map(u => u.text).join(' ');
    const wordCount = allText.split(/\s+/).filter(w => w).length;

    const speakerSet = new Set(chronologicalUtterances.map(u => u.speaker));
    const speakers: SpeakerInfo[] = Array.from(speakerSet).map(id => ({
      id,
      totalSpeakingTime: chronologicalUtterances.filter(u => u.speaker === id).reduce((sum, u) => sum + (u.end - u.start), 0),
      utteranceCount: chronologicalUtterances.filter(u => u.speaker === id).length,
      averageConfidence: 1,
    }));

    const finalUtterances: Utterance[] = chronologicalUtterances.map(u => ({
      id: u.id,
      speaker: u.speaker,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: 1,
      words: [],
      language: u.language,
    }));

    const languageCounts: Record<string, number> = {};
    chronologicalUtterances.forEach(u => {
      const lang = u.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });
    const primaryLanguage = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

    const result: TranscriptionResult = {
      transcript: allText,
      utterances: finalUtterances,
      speakers,
      detectedLanguage: primaryLanguage,
      detectedLanguages: Array.from(detectedLanguages),
      languageConfidence: 1,
      metadata: {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        duration,
        wordCount,
        speakerCount: speakers.length,
        provider: settings.transcriptionProvider,
        model: 'nova-3',
      },
    };

    // Show the window when recording completes (for background recording)
    showAndFocusWindow();

    onRecordingComplete(result);
  }, [utterances, detectedLanguages, settings.transcriptionProvider, onRecordingComplete]);

  const cancelSession = useCallback(() => {
    // Clean up any initialized resources (from countdown)
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsSessionActive(false);
    setCountdown(null);
    setUtterances([]);
    setInterimText('');
    setInterimSpeaker(null);
    setDetectedLanguages(new Set());
    setRecordingDuration(0);
    setSpeakerCount(0);
  }, []);

  // Start recording with a 3-second countdown
  // Initialize the session during countdown so WebSocket is ready
  const startWithCountdown = useCallback(async () => {
    setCountdown(3);

    // Initialize session immediately (mic permission, WebSocket connection)
    // This happens during countdown so recording can start instantly after
    const initialized = await initializeSession();
    if (!initialized) {
      setCountdown(null);
      setIsSessionActive(false);
      return;
    }

    // Countdown from 3 to 1, then start recording
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        // Start actual recording now that countdown is done
        beginRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [initializeSession, beginRecording]);

  // Global hotkey listener
  useEffect(() => {
    const handleHotkey = () => {
      if (isRecording || countdown !== null) {
        // If recording or counting down, stop/cancel
        if (countdown !== null) {
          // Cancel during countdown - cleanup initialized resources
          cancelSession();
        } else {
          stopRecording();
        }
      } else if (!isProcessing && hasRequiredKeys) {
        setIsSessionActive(true);
        startWithCountdown();
      }
    };

    window.addEventListener('toggle-recording', handleHotkey);
    return () => window.removeEventListener('toggle-recording', handleHotkey);
  }, [isRecording, countdown, isProcessing, hasRequiredKeys, startWithCountdown, stopRecording, cancelSession]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isDisabled = isProcessing || !hasRequiredKeys;

  // ===== STATE 1: Idle - Show "New Recording" card =====
  if (!isSessionActive && !isRecording && !isProcessing) {
    return (
      <div className="flex flex-col items-center">
        {/* API Key Warning */}
        {!hasRequiredKeys && (
          <div className="mb-6 w-full max-w-md animate-fade-in-up">
            <div className="rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--warning))]/10">
                  <Settings className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[hsl(var(--warning-foreground))]">
                    API keys required
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure your transcription API keys to start recording.
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="mt-3 text-sm font-medium text-primary hover:underline"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Recording Card */}
        <div
          onClick={hasRequiredKeys ? () => setIsSessionActive(true) : undefined}
          className={cn(
            'group relative w-full max-w-md rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300',
            hasRequiredKeys
              ? 'cursor-pointer border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'
              : 'cursor-not-allowed opacity-60'
          )}
        >
          {/* Mic Icon */}
          <div className={cn(
            'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl transition-all duration-300',
            hasRequiredKeys
              ? 'bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110'
              : 'bg-muted'
          )}>
            <Plus className={cn(
              'h-8 w-8 transition-colors',
              hasRequiredKeys ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          <h3 className="text-lg font-semibold">New Recording</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click to start a new voice recording session
          </p>

          {/* Keyboard shortcut hint */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span className="rounded bg-muted px-1.5 py-0.5 mono text-[10px]">
              {typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}+Shift+R
            </span>
            <span>for quick start</span>
          </div>
        </div>
      </div>
    );
  }

  // ===== STATE 2: Session active, ready to record (or counting down) =====
  if (isSessionActive && !isRecording && !isProcessing) {
    return (
      <div className="flex flex-col items-center animate-scale-in">
        {/* Ready to Record Panel */}
        <div className="relative w-full max-w-md rounded-3xl border bg-card p-8 shadow-soft-lg">
          {/* Close button */}
          <button
            onClick={cancelSession}
            className="absolute right-4 top-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center">
            {/* Record button or Countdown */}
            {countdown !== null ? (
              /* Countdown display */
              <div className="h-24 w-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <span className="text-5xl font-bold text-primary">{countdown}</span>
              </div>
            ) : (
              <button
                onClick={startWithCountdown}
                disabled={isDisabled}
                className={cn(
                  'btn-record h-24 w-24 mb-6',
                  isDisabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <Mic className="h-10 w-10" />
              </button>
            )}

            <h3 className="text-xl font-semibold">
              {countdown !== null ? 'Get ready...' : 'Ready to record'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              {countdown !== null
                ? 'Recording will start in a moment'
                : 'Click the button above or press Enter to start'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== STATE 3: Processing Overlay =====
  if (isProcessing) {
    return (
      <div className="animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20">
          {/* Processing animation */}
          <div className="relative mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" style={{ width: 120, height: 120 }} />
            {/* Spinning ring */}
            <div
              className="rounded-full border-4 border-transparent border-t-primary animate-spin"
              style={{ width: 120, height: 120 }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-2">Processing your recording</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Saving transcription and generating insights...
          </p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // ===== STATE 4: Recording =====
  return (
    <div className="animate-fade-in">
      {/* Recording Panel */}
      <div className="rounded-3xl border bg-card shadow-soft-lg overflow-hidden">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {/* Recording indicator */}
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-destructive/10">
              <div className="status-dot status-dot-recording" />
              <span className="text-sm font-medium mono">
                {formatDuration(recordingDuration)}
              </span>
            </div>

            {/* Stats */}
            {speakerCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{speakerCount}</span>
              </div>
            )}

            {detectedLanguages.size > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{Array.from(detectedLanguages).map(l => l.toUpperCase()).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            className="btn-record btn-record-stop h-10 w-10"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>

        {/* Audio Visualizer */}
        <div className="px-6 py-4 border-b bg-gradient-to-b from-primary/5 to-transparent">
          <WaveformVisualizer level={audioLevel} />
        </div>

        {/* Transcript */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          {utterances.length === 0 && !interimText ? (
            <div className="empty-state py-12">
              <div className="empty-state-icon">
                <Mic className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Listening... Start speaking
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Interim text - shown at top since newest content is first */}
              {interimText && (
                <div className="transcript-segment opacity-50">
                  <div className={cn(
                    'shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                    interimSpeaker !== null
                      ? `speaker-badge-${interimSpeaker % 6}`
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {interimSpeaker !== null ? `S${interimSpeaker + 1}` : '...'}
                  </div>
                  <p className="text-sm italic text-muted-foreground">{interimText}</p>
                </div>
              )}

              {utterances.map((utterance) => (
                <TranscriptSegment key={utterance.id} utterance={utterance} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Transcript segment component
function TranscriptSegment({ utterance }: { utterance: LiveUtterance }) {
  const langName = utterance.language ? LANGUAGE_NAMES[utterance.language] || utterance.language.toUpperCase() : null;
  const speakerIndex = utterance.speaker % 6;

  return (
    <div className="transcript-segment">
      <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium speaker-badge-${speakerIndex}`}>
        S{utterance.speaker + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-medium speaker-text-${speakerIndex}`}>
            Speaker {utterance.speaker + 1}
          </span>
          <span className="text-xs text-muted-foreground mono">
            {formatTimestamp(utterance.start)}
          </span>
          {langName && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {langName}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{utterance.text}</p>
      </div>
    </div>
  );
}

// Waveform visualizer with animation
function WaveformVisualizer({ level }: { level: number }) {
  const bars = 32;
  const [tick, setTick] = useState(0);

  // Animate the waveform at 30fps
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 33);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }).map((_, i) => {
        // Create organic wave pattern
        const centerDistance = Math.abs(i - bars / 2) / (bars / 2);
        const baseWave = Math.sin((i / bars) * Math.PI * 3 + tick * 0.12) * 0.5 + 0.5;
        const secondWave = Math.sin((i / bars) * Math.PI * 5 - tick * 0.08) * 0.3;

        // Base height (idle animation) + level-responsive height
        const baseHeight = 4 + baseWave * 8; // 4-12px when silent
        const levelHeight = level * 48 * (1 - centerDistance * 0.5); // Up to 48px when loud
        const combinedHeight = baseHeight + levelHeight + secondWave * level * 16;
        const height = Math.max(4, Math.min(60, combinedHeight));

        return (
          <div
            key={i}
            className="rounded-full bg-primary"
            style={{
              width: '3px',
              height: `${height}px`,
              opacity: 0.5 + level * 0.5,
              transition: 'height 0.05s ease-out, opacity 0.1s ease-out',
            }}
          />
        );
      })}
    </div>
  );
}

