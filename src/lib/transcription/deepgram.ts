import { getApiKey } from '@/lib/storage';

export async function transcribeWithDeepgram(audioBlob: Blob, providedKey?: string): Promise<string> {
  const apiKey = providedKey || await getApiKey('deepgram');

  if (!apiKey) {
    throw new Error('Deepgram API key not configured. Please add your API key in Settings.');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': audioBlob.type || 'audio/webm',
    },
    body: arrayBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram transcription failed: ${error}`);
  }

  const result = await response.json();

  return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

export interface DeepgramStreamingOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export function createDeepgramStream(options: DeepgramStreamingOptions) {
  let socket: WebSocket | null = null;

  const start = async () => {
    const apiKey = await getApiKey('deepgram');

    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true`,
      ['token', apiKey]
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const isFinal = data.is_final;

      if (transcript) {
        options.onTranscript(transcript, isFinal);
      }
    };

    socket.onerror = () => {
      options.onError(new Error('WebSocket error'));
    };

    socket.onclose = () => {
      options.onClose();
    };

    return new Promise<void>((resolve) => {
      socket!.onopen = () => resolve();
    });
  };

  const send = (audioData: ArrayBuffer) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(audioData);
    }
  };

  const stop = () => {
    if (socket) {
      socket.close();
      socket = null;
    }
  };

  return { start, send, stop };
}
