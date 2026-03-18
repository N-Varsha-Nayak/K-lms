import Link from 'next/link';

type Video = {
  id: number;
  title: string;
  locked: boolean;
  is_completed: boolean;
};

type Section = {
  id: number;
  title: string;
  videos: Video[];
};

type Props = {
  subjectId: number;
  currentVideoId: number;
  sections: Section[];
};

export default function Sidebar({ subjectId, currentVideoId, sections }: Props) {
  return (
    <aside className="card max-h-[75vh] overflow-y-auto p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">Course content</h2>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
            <ul className="space-y-1">
              {section.videos.map((video) => {
                const active = video.id === currentVideoId;
                const classes = [
                  'block rounded-lg px-3 py-2 text-sm transition',
                  video.locked
                    ? 'cursor-not-allowed bg-black/[0.03] text-muted'
                    : 'hover:bg-black/[0.03] text-ink',
                  active ? 'bg-ink text-white hover:bg-ink' : ''
                ].join(' ');

                return (
                  <li key={video.id}>
                    {video.locked ? (
                      <span className={classes}>
                        {video.title}
                        <span className="ml-2 text-xs">Locked</span>
                      </span>
                    ) : (
                      <Link href={`/subjects/${subjectId}/video/${video.id}`} className={classes}>
                        {video.title}
                        {video.is_completed && <span className="ml-2 text-xs">Completed</span>}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
