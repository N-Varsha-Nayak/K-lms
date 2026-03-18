type Props = {
  value: number;
};

export default function ProgressBar({ value }: Props) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
