'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Square, Loader2, Settings } from 'lucide-react';
import { AudioVisualizer } from './audio-visualizer';
import { useSettings } from '@/hooks/use-settings';
import { transcribe } from '@/lib/transcription';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';

// Update tray recording indicator
async function setTrayRecordingState(recording: boolean) {
  try {
    await invoke('set_recording_state', { recording });
  } catch (e) {
    console.error('Failed to update tray state:', e);
  }
}

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isProcessing: boolean;
  onOpenSettings?: () => void;
}

export function VoiceRecorder({ onTranscriptionComplete, isProcessing, onOpenSettings }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { settings } = useSettings();

  // Check if required API keys/endpoints are configured
  const { hasRequiredKeys, missingKeys } = useMemo(() => {
    const missing: string[] = [];

    // Check transcription provider
    if (settings.transcriptionProvider === 'deepgram' && !settings.apiKeys.deepgram) {
      missing.push('Deepgram API key');
    } else if (settings.transcriptionProvider === 'elevenlabs' && !settings.apiKeys.elevenlabs) {
      missing.push('ElevenLabs API key');
    }
    // Whisper just needs endpoint (has default)

    // Check LLM provider
    if (settings.llmProvider === 'openai' && !settings.apiKeys.openai) {
      missing.push('OpenAI API key');
    } else if (settings.llmProvider === 'anthropic' && !settings.apiKeys.anthropic) {
      missing.push('Anthropic API key');
    }
    // Ollama just needs endpoint (has default)

    return {
      hasRequiredKeys: missing.length === 0,
      missingKeys: missing,
    };
  }, [settings]);

  const startRecording = useCallback(async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone access is not available. On macOS, you may need to build the app (pnpm tauri:build) and grant microphone permission, or try running in a browser at http://localhost:3000');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Analyze audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        setIsTranscribing(true);
        try {
          // Get the appropriate key or endpoint based on provider
          let apiKeyOrEndpoint: string | undefined;
          if (settings.transcriptionProvider === 'deepgram') {
            apiKeyOrEndpoint = settings.apiKeys.deepgram;
            if (!apiKeyOrEndpoint) {
              alert('Please add your Deepgram API key in Settings.');
              setIsTranscribing(false);
              return;
            }
          } else if (settings.transcriptionProvider === 'elevenlabs') {
            apiKeyOrEndpoint = settings.apiKeys.elevenlabs;
            if (!apiKeyOrEndpoint) {
              alert('Please add your ElevenLabs API key in Settings.');
              setIsTranscribing(false);
              return;
            }
          } else if (settings.transcriptionProvider === 'whisper') {
            apiKeyOrEndpoint = settings.whisperEndpoint;
          }

          const text = await transcribe(audioBlob, settings.transcriptionProvider, apiKeyOrEndpoint);

          if (!text) {
            console.warn('Empty transcription result');
            onTranscriptionComplete('[No speech detected]');
          } else {
            onTranscriptionComplete(text);
          }
        } catch (error) {
          console.error('Transcription failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Transcription failed: ${errorMessage}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTrayRecordingState(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onTranscriptionComplete, settings.transcriptionProvider, settings.apiKeys, settings.whisperEndpoint]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTrayRecordingState(false);
    }
  }, [isRecording]);

  // Listen for global hotkey from Tauri
  useEffect(() => {
    const handleHotkey = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    window.addEventListener('toggle-recording', handleHotkey);
    return () => {
      window.removeEventListener('toggle-recording', handleHotkey);
    };
  }, [isRecording, startRecording, stopRecording]);

  const isLoading = isTranscribing || isProcessing;
  const isDisabled = isLoading || !hasRequiredKeys;

  return (
    <div className="flex shrink-0 flex-col items-center gap-4 sm:gap-6">
      {/* Missing API Keys Warning */}
      {!hasRequiredKeys && (
        <div className="w-full max-w-xs rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-center">
          <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
            Missing API Keys
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add {missingKeys.join(' and ')} {missingKeys.length === 1 ? 'key' : 'keys'} to start recording
          </p>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Settings className="h-3 w-3" />
              Open Settings
            </button>
          )}
        </div>
      )}

      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isDisabled}
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-full transition-all sm:h-32 sm:w-32',
          'focus:outline-none focus:ring-4 focus:ring-primary/30',
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-primary hover:bg-primary/90',
          isDisabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* Pulsing ring when recording */}
        {isRecording && (
          <div className="absolute inset-0 animate-ping rounded-full bg-red-500/50" />
        )}

        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-white sm:h-12 sm:w-12" />
        ) : isRecording ? (
          <Square className="h-8 w-8 text-white sm:h-12 sm:w-12" />
        ) : (
          <Mic className="h-8 w-8 text-white sm:h-12 sm:w-12" />
        )}
      </button>

      {/* Audio Visualizer */}
      <AudioVisualizer level={audioLevel} isRecording={isRecording} />

      {/* Status Text */}
      <p className="text-xs text-muted-foreground sm:text-sm">
        {!hasRequiredKeys
          ? 'Configure API keys to start'
          : isLoading
            ? isTranscribing
              ? 'Transcribing...'
              : 'Processing...'
            : isRecording
              ? 'Recording... Click to stop'
              : 'Click to start recording'}
      </p>
    </div>
  );
}
