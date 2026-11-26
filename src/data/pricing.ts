/**
 * The single place prices and limits live (docs/features/parent-subscription/). Nothing else
 * in the code states a price or a limit — screens and the server both read this, so changing
 * the pricing is changing this file and nothing else.
 */
export const pricing = {
  /** First week is free, no payment details. */
  trialDays: 7,
  /** The first paid month — after the free week. */
  firstMonthNis: 10,
  /** Every month after the first paid one. */
  laterMonthNis: 30,
  /** Length of one paid period. */
  periodDays: 30,
  maxParents: 2,
  maxChildren: 3,
  maxDevicesPerChild: 3,
  codeTtlMinutes: 10,
} as const;
