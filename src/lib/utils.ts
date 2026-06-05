export function toObjectIdOrNull(value: string) {
  return value;
}

import { computeMockCallScore, type MockCallScores } from "@/lib/mock-call";

/** @deprecated Use computeMockCallScore from @/lib/mock-call */
export function computeFinalScore(params: MockCallScores) {
  return computeMockCallScore(params);
}

export function parseDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${input}`);
  }
  return date;
}
