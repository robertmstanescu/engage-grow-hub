type Entry = { title?: string; url?: string; summary?: string };
export declare function buildLlmsTxt(input: {
  brandName?: string;
  founderName?: string;
  city?: string;
  country?: string;
  bookingUrl?: string;
  sections?: ({ title: string; entries: Entry[] } | { title: string; lines: string[] })[];
}): string;
