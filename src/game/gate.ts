// The grown-up question: numbers written as words, past the times tables young kids know.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

/** A number from 0 to 19, in words. */
export const numberWord = (n: number): string => ONES[n];

/** A teen times a single digit, like "fourteen times six": past the times tables young kids know. */
export function gateQuestion(rand: () => number = Math.random): { text: string; answer: number } {
  const a = 12 + Math.floor(rand() * 8);
  const b = 3 + Math.floor(rand() * 7);
  return { text: `What is ${numberWord(a)} times ${numberWord(b)}?`, answer: a * b };
}
