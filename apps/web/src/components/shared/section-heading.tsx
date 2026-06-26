import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl space-y-3", className)}>
      {eyebrow ? (
        <p className={cn("text-xs font-semibold uppercase tracking-[0.3em] text-stone-500", eyebrowClassName)}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn("font-serif text-3xl text-stone-900 sm:text-4xl", titleClassName)}>{title}</h2>
      {description ? (
        <p className={cn("text-sm leading-7 text-stone-600 sm:text-base", descriptionClassName)}>{description}</p>
      ) : null}
    </div>
  );
}
