"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultTranslate, type Translate } from "./translate";

interface EditorContextValue {
  t: Translate;
}

const EditorContext = createContext<EditorContextValue>({ t: defaultTranslate });

export interface EditorProviderProps {
  /** Host translator. Defaults to the English passthrough. */
  t?: Translate;
  children: ReactNode;
}

/** Provides the injectable translator to headless editor primitives. */
export function EditorProvider({ t = defaultTranslate, children }: EditorProviderProps) {
  return <EditorContext.Provider value={{ t }}>{children}</EditorContext.Provider>;
}

/** Access the active translator. Falls back to English if no provider. */
export function useTranslate(): Translate {
  return useContext(EditorContext).t;
}
