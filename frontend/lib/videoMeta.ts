export type LessonSegment = {
  id: string;
  title: string;
  startLabel: string;
  startSeconds: number;
  focus: string;
};

export function getYoutubeId(url: string) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getYoutubeThumbnail(url: string) {
  const youtubeId = getYoutubeId(url);
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function secondsToLabel(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins}:00` : `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function buildLessonSegments(title: string, durationSeconds: number) {
  const duration = Math.max(durationSeconds || 0, 240);
  const checkpoints =
    duration >= 2400 ? [0, 0.18, 0.42, 0.68, 0.86] :
    duration >= 1200 ? [0, 0.28, 0.58, 0.82] :
    [0, 0.45, 0.78];

  const labels = [
    'Overview',
    'Core concepts',
    'Guided walkthrough',
    'Applied practice',
    'Wrap-up'
  ];

  const focuses = [
    `What this lesson covers in ${title.toLowerCase()}.`,
    'Key ideas and terminology to understand before moving on.',
    'Step-by-step explanation of the main workflow.',
    'Examples, usage patterns, and practical decision points.',
    'Final recap and what to do next.'
  ];

  return checkpoints.map((ratio, index) => ({
    id: `${title}-${index}`,
    title: labels[index] ?? `Part ${index + 1}`,
    startLabel: secondsToLabel(Math.floor(duration * ratio)),
    startSeconds: Math.floor(duration * ratio),
    focus: focuses[index] ?? 'Continue through the next subtopic in sequence.'
  }));
}
