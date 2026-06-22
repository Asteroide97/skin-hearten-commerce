"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { SkinQuizOpenSource } from "@/lib/skin-quiz";
import { useSkinQuizStore } from "@/store/skin-quiz-store";

type SkinQuizTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  source: SkinQuizOpenSource;
};

export function SkinQuizTrigger({
  children,
  className,
  onClick,
  source,
  type = "button",
  ...props
}: SkinQuizTriggerProps) {
  const open = useSkinQuizStore((state) => state.open);

  return (
    <button
      {...props}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        open(source);
      }}
      type={type}
    >
      {children ?? "Encontrar mi rutina"}
    </button>
  );
}
