export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

// Basic d20 roll
export const rollDice = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};
