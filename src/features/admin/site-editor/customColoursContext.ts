import { createContext, useContext } from "react";

export interface CustomColoursHost {
  target: HTMLElement | null;
  report: (id: string, inUse: boolean) => void;
}

export const CustomColoursContext = createContext<CustomColoursHost | null>(null);

/** The "Custom colours" group a ColorField should render into, if any. */
export const useCustomColoursHost = () => useContext(CustomColoursContext);
