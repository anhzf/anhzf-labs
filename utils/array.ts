export const arrayClean = <T>(array: (T | null | undefined)[]): T[] => array.filter(Boolean) as T[];

export const chunks = <T>(array: T[], size: number): T[][] => Array.from(
  { length: Math.ceil(array.length / size) },
  (_, i) => array.slice(i * size, i * size + size),
);

export const excludes = <T>(array: T[], ...values: T[]): T[] => array.filter((value) => !values.includes(value));
