export type RhythmInput = {
  points: {date: string; rank: number | null; high: boolean | null}[];
  firstHigh: boolean | null;
  streak: number;
  signals: string[];
};
export function describeThemeRhythm(item: RhythmInput): {
  label: string;
  tone: string;
  sequence: string;
  recentTop3: {date: string; rank: number}[];
};
