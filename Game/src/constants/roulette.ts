export const RED_NUMBERS: number[] = [
  1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36,
];

export const NUMBER_ROWS: number[][] = [
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
];

export const CHIP_VALUES = [5, 10, 50, 100, 500, 5000] as const;
export type ChipValue = typeof CHIP_VALUES[number];

export type BetType = 'RED' | 'BLACK' | 'ODD' | 'EVEN' | 'NUMBER' | '1ST12' | '2ND12' | '3RD12' | '1TO18' | '19TO36' | 'FOUR_BLOCK';

export interface SelectedBet {
  type: BetType;
  value?: number | number[]; // For NUMBER or FOUR_BLOCK, value is the number(s)
}

export interface LastBet {
  betType: BetType;
  betValue?: number | number[];
  amount: number;
  result: 'Won' | 'Lost';
}

export type RoundStatus =
  | 'BETTING_OPEN'
  | 'BETTING_CLOSED'
  | 'SPINNING'
  | 'RESULT_DISPLAY';