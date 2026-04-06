import clsx from "clsx";

const COPY =
  "Photos are saved only on your device for privacy—we never upload them to our servers. They stay even if you don't install the PWA, but will be lost if you clear your browser data.";

type Props = {
  className?: string;
  /** Slightly tighter line height on dense cards */
  compact?: boolean;
};

export function LocalPhotoPrivacyNote({ className, compact }: Props) {
  return (
    <p
      className={clsx(
        "text-[11px] leading-relaxed text-zinc-500",
        compact && "leading-snug",
        className,
      )}
    >
      {COPY}
    </p>
  );
}
