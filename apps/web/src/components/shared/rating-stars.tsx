import { StarIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  rating: number;
  reviewCount?: number;
  className?: string;
};

export function RatingStars({ rating, reviewCount, className }: RatingStarsProps) {
  const fullStars = Math.round(rating);

  return (
    <div className={cn("flex items-center gap-2 text-sm text-stone-600", className)}>
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            className={index < fullStars ? "text-amber-500" : "text-stone-300"}
            key={`${rating}-${index}`}
          />
        ))}
      </div>
      <span className="font-medium text-current">{rating.toFixed(1)}</span>
      {reviewCount ? <span className="text-current opacity-70">({reviewCount})</span> : null}
    </div>
  );
}
