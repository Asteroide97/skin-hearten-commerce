"use client";

import { create } from "zustand";

import type { SkinQuizOpenSource } from "@/lib/skin-quiz";

type SkinQuizState = {
  isOpen: boolean;
  source: SkinQuizOpenSource;
  sessionId: number;
  open: (source: SkinQuizOpenSource) => void;
  close: () => void;
};

export const useSkinQuizStore = create<SkinQuizState>((set) => ({
  isOpen: false,
  source: "home",
  sessionId: 0,
  open: (source) =>
    set((state) => ({
      isOpen: true,
      source,
      sessionId: state.sessionId + 1,
    })),
  close: () =>
    set((state) => ({
      ...state,
      isOpen: false,
    })),
}));
