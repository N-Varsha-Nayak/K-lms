"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/apiClient';
import { getYoutubeId } from '../lib/videoMeta';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target: { seekTo: (seconds: number, allowSeekAhead: boolean) => void } }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => {
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      };
      PlayerState: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Props = {
  subjectId: number;
  videoId: number;
  youtubeUrl: string;
  initialPositionSeconds: number;
  locked: boolean;
  unlockReason: string;
  previousVideoId: number | null;
  nextVideoId: number | null;
  seekToSeconds?: number | null;
};

export default function VideoPlayer({
  subjectId,
  videoId,
  youtubeUrl,
  initialPositionSeconds,
  locked,
  unlockReason,
  previousVideoId,
  nextVideoId,
  seekToSeconds
}: Props) {
  const router = useRouter();
  const playerRef = useRef<{ getCurrentTime: () => number; seekTo: (seconds: number, allowSeekAhead: boolean) => void } | null>(null);
  const [statusText, setStatusText] = useState('');

  const youtubeId = useMemo(() => getYoutubeId(youtubeUrl), [youtubeUrl]);

  useEffect(() => {
    if (locked || !youtubeId) return;

    const mountPlayer = () => {
      playerRef.current = new window.YT!.Player('youtube-player', {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            if (initialPositionSeconds > 0) {
              event.target.seekTo(initialPositionSeconds, true);
            }
          },
          onStateChange: async (event) => {
            if (window.YT && event.data === window.YT.PlayerState.ENDED) {
              setStatusText('Marking complete...');
              const result = await apiRequest<{ next_video_id: number | null }>(
                `/progress/videos/${videoId}`,
                {
                  method: 'POST',
                  auth: true,
                  body: {
                    last_position_seconds: 0,
                    is_completed: true
                  }
                }
              );
              setStatusText('Completed');
              if (result.next_video_id) {
                router.push(`/subjects/${subjectId}/video/${result.next_video_id}`);
                router.refresh();
              }
            }
          }
        }
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = mountPlayer;

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [initialPositionSeconds, locked, router, subjectId, videoId, youtubeId]);

  useEffect(() => {
    if (locked || !playerRef.current || typeof seekToSeconds !== 'number') return;
    playerRef.current.seekTo(seekToSeconds, true);
  }, [locked, seekToSeconds]);

  useEffect(() => {
    if (locked) return;

    const timer = setInterval(async () => {
      if (!playerRef.current) return;
      const position = Math.floor(playerRef.current.getCurrentTime() || 0);
      await apiRequest(`/progress/videos/${videoId}`, {
        method: 'POST',
        auth: true,
        body: {
          last_position_seconds: position,
          is_completed: false
        }
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [locked, videoId]);

  if (locked) {
    return <div className="card p-6 text-sm text-muted">{unlockReason}</div>;
  }

  if (!youtubeId) {
    return <div className="card p-6 text-sm text-red-600">Invalid YouTube URL</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="aspect-video w-full bg-black" id="youtube-player" />
      </div>
      <div className="flex items-center gap-3">
        {previousVideoId ? (
          <button
            className="btn-muted"
            onClick={() => {
              router.push(`/subjects/${subjectId}/video/${previousVideoId}`);
              router.refresh();
            }}
          >
            Previous
          </button>
        ) : null}
        {nextVideoId ? (
          <button
            className="btn"
            onClick={() => {
              router.push(`/subjects/${subjectId}/video/${nextVideoId}`);
              router.refresh();
            }}
          >
            Next
          </button>
        ) : null}
        {statusText ? <span className="text-sm text-muted">{statusText}</span> : null}
      </div>
    </div>
  );
}
