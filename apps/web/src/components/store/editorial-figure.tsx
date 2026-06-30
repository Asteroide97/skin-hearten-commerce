import { cn } from "@/lib/utils";

type EditorialFigureTone = "blush" | "linen" | "mist" | "sand";
type EditorialFigureFrame = "portrait" | "texture" | "vanity";

const toneStyles: Record<EditorialFigureTone, string> = {
  blush: "bg-[#f4e7df]",
  linen: "bg-[#f8f2ea]",
  mist: "bg-[#edf1eb]",
  sand: "bg-[#efe4d7]",
};

type EditorialFigureProps = {
  label: string;
  title: string;
  description?: string;
  tone?: EditorialFigureTone;
  frame?: EditorialFigureFrame;
  className?: string;
};

export function EditorialFigure({
  label,
  title,
  description,
  tone = "linen",
  frame = "portrait",
  className,
}: EditorialFigureProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[2.3rem] border border-stone-200/80 p-5 sm:p-6",
        toneStyles[tone],
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.78),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.24),transparent_62%)]" />
      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="flex items-center gap-4">
          <p className="section-label text-stone-600">{label}</p>
          <span className="h-px flex-1 bg-stone-300/80" />
        </div>
        <FigureArtwork frame={frame} />
        <div className="space-y-3">
          <h3 className="max-w-md font-serif text-[2rem] leading-[0.96] text-stone-950 sm:text-[2.35rem]">
            {title}
          </h3>
          {description ? (
            <p className="max-w-sm text-sm leading-7 text-stone-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FigureArtwork({ frame }: { frame: EditorialFigureFrame }) {
  if (frame === "texture") {
    return (
      <div className="relative h-[210px] overflow-hidden rounded-[1.8rem] border border-white/65 bg-white/45">
        <div className="absolute left-8 top-7 h-28 w-28 rounded-full bg-white/80 blur-2xl" />
        <div className="absolute bottom-8 left-8 h-28 w-40 rounded-[2.2rem] border border-white/80 bg-white/72" />
        <div className="absolute right-8 top-8 h-16 w-16 rounded-full border border-white/85 bg-white/68" />
        <div className="absolute bottom-10 right-10 h-24 w-24 rounded-[38%_62%_54%_46%/41%_46%_54%_59%] bg-[#edd8ca]/85" />
      </div>
    );
  }

  if (frame === "vanity") {
    return (
      <div className="relative h-[240px] overflow-hidden rounded-[1.8rem] border border-white/65 bg-white/45">
        <div className="absolute inset-x-8 bottom-12 h-px bg-stone-300/80" />
        <div className="absolute left-14 bottom-12 h-32 w-24 rounded-[2.8rem_2.8rem_1.5rem_1.5rem] border border-white/80 bg-white/80" />
        <div className="absolute left-24 bottom-32 h-6 w-4 rounded-full bg-white/88" />
        <div className="absolute left-1/2 bottom-12 h-24 w-20 -translate-x-1/2 rounded-[1.6rem] border border-white/80 bg-white/72" />
        <div className="absolute right-16 bottom-12 h-20 w-20 rounded-full border border-white/80 bg-[#f0ddd0]/88" />
        <div className="absolute right-12 top-10 h-24 w-24 rounded-full bg-white/78 blur-2xl" />
      </div>
    );
  }

  return (
    <div className="relative h-[300px] overflow-hidden rounded-[1.95rem] border border-white/65 bg-white/45">
      <div className="absolute left-1/2 top-10 h-28 w-28 -translate-x-1/2 rounded-full bg-white/82 blur-2xl" />
      <div className="absolute bottom-0 left-1/2 h-56 w-36 -translate-x-1/2 rounded-[3.1rem_3.1rem_1.8rem_1.8rem] border border-white/85 bg-white/78" />
      <div className="absolute bottom-16 left-[60%] h-40 w-24 rotate-[7deg] rounded-[1.7rem] border border-white/82 bg-white/68" />
      <div className="absolute bottom-9 left-[23%] h-10 w-20 rounded-full bg-[#ead7c7]/92" />
    </div>
  );
}
