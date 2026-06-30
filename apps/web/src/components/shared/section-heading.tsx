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
    <div className={cn("max-w-2xl space-y-3.5", className)}>
      {eyebrow ? (
        <p className={cn("section-label", eyebrowClassName)}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-serif text-[2.15rem] leading-[0.98] text-stone-950 sm:text-[2.7rem]",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("max-w-xl text-sm leading-7 text-stone-600 sm:text-[1.01rem]", descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
