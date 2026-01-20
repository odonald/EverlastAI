'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './audio-visualizer';
import { useSettings } from '@/hooks/use-settings';
import { transcribe } from '@/lib/transcription';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isProcessing: boolean;
}

export function VoiceRecorder({ onTranscriptionComplete, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { settings } = useSettings();

  const startRecording = useCallback(async () => {
    console.log('startRecording called');
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not available');
        alert('Microphone access is not available. On macOS, you may need to build the app (pnpm tauri:build) and grant microphone permission, or try running in a browser at http://localhost:3000');
        return;
      }

      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
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
        console.log('Recording stopped, processing audio...');
        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created:', audioBlob.size, 'bytes');
        stream.getTracks().forEach((track) => track.stop());

        setIsTranscribing(true);
        try {
          console.log('Starting transcription with provider:', settings.transcriptionProvider);
          const apiKey = settings.transcriptionProvider === 'deepgram'
            ? settings.apiKeys.deepgram
            : settings.apiKeys.elevenlabs;
          console.log('API key available:', apiKey ? `yes (${apiKey.slice(0, 8)}...)` : 'NO - Please add API key in Settings');

          if (!apiKey) {
            alert(`Please add your ${settings.transcriptionProvider === 'deepgram' ? 'Deepgram' : 'ElevenLabs'} API key in Settings.`);
            setIsTranscribing(false);
            return;
          }

          const text = await transcribe(audioBlob, settings.transcriptionProvider, apiKey);
          console.log('Transcription result:', text);

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
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onTranscriptionComplete, settings.transcriptionProvider]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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

    // Listen for custom event from Tauri
    window.addEventListener('toggle-recording', handleHotkey);
    return () => window.removeEventListener('toggle-recording', handleHotkey);
  }, [isRecording, startRecording, stopRecording]);

  const isLoading = isTranscribing || isProcessing;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isLoading}
        className={cn(
          'relative flex h-32 w-32 items-center justify-center rounded-full transition-all',
          'focus:outline-none focus:ring-4 focus:ring-primary/30',
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-primary hover:bg-primary/90',
          isLoading && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* Pulsing ring when recording */}
        {isRecording && (
          <div className="absolute inset-0 animate-ping rounded-full bg-red-500/50" />
        )}

        {isLoading ? (
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        ) : isRecording ? (
          <Square className="h-12 w-12 text-white" />
        ) : (
          <Mic className="h-12 w-12 text-white" />
        )}
      </button>

      {/* Audio Visualizer */}
      <AudioVisualizer level={audioLevel} isRecording={isRecording} />

      {/* Status Text */}
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? isTranscribing
            ? 'Transcribing...'
            : 'Processing...'
          : isRecording
            ? 'Recording... Click to stop'
            : 'Click to start recording'}
      </p>

      {/* Audio level indicator during recording */}
      {isRecording && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Level:</span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-green-500 transition-all duration-75"
              style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
            />
          </div>
          <span>{Math.round(audioLevel * 100)}%</span>
        </div>
      )}
    </div>
  );
}
