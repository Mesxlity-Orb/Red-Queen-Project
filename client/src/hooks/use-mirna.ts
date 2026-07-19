import { useState, useCallback } from 'react';

export type MirnaResponse = {
  message: string;
  isThreat: boolean;
};

export function useMirna() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string): Promise<MirnaResponse | null> => {
    setIsProcessing(true);
    setError(null);

    // Stop any currently playing audio before starting a new request
    const existingAudio = (window as any).redQueenAudio as HTMLAudioElement | undefined;
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.currentTime = 0;
      window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`System Error: ${response.statusText}`);
      }

      const data = await response.json();

      // If backend generated Google Cloud TTS audio, attach event handlers to sync speech video
      if (data.audioData) {
        const audio = new Audio(data.audioData);
        (window as any).redQueenAudio = audio;

        const onStart = () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-start', {
            detail: { isThreat: data.isThreat, responseText: data.response }
          }));
        };

        const onEnd = () => {
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        };

        audio.addEventListener('play', onStart);
        audio.addEventListener('ended', onEnd);
        audio.addEventListener('pause', onEnd);
        audio.addEventListener('error', onEnd);

        audio.play().catch(err => {
          console.warn('[AUDIO ERROR]: Auto-play blocked by browser or failed.', err);
          window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
        });
      } else {
        // No audio returned
        window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
      }

      return {
        message: data.response,
        isThreat: data.isThreat,
      };

    } catch (err: any) {
      setError(err.message || 'Connection to Neural Core failed.');
      window.dispatchEvent(new CustomEvent('redqueen-speech-end'));
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    sendMessage,
    isProcessing,
    error,
  };
}