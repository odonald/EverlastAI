import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.__TAURI__
Object.defineProperty(window, '__TAURI__', {
  value: undefined,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {}
  stop() {
    if (this.onstop) this.onstop();
  }
}

Object.defineProperty(window, 'MediaRecorder', {
  value: MockMediaRecorder,
});

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});

// Mock AudioContext
class MockAudioContext {
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    };
  }
}

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
});
