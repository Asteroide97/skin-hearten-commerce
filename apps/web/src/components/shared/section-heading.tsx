type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p>
      ) : null}
      <h2 className="font-serif text-3xl text-stone-900 sm:text-4xl">{title}</h2>
      {description ? <p className="text-sm leading-7 text-stone-600 sm:text-base">{description}</p> : null}
    </div>
  );
}

