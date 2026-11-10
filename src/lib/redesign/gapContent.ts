/**
 * Gap content: sections the design has and the live site did not.
 * Kept apart from `restyle.ts` so that file's "no words changed" proof
 * stays strict. Everything added here is NEW copy, approved in
 * principle by the owner ("fill the gaps"), and listed for his review.
 */
import type { RestyleContext } from "./restyle";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export const applyGapContent = (rows: Json[], ctx: RestyleContext): Json[] => {
  void ctx;
  return rows;
};
