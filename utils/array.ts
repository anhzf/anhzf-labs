export const arrayClean = <T>(array: (T | null | undefined)[]): T[] => array.filter(Boolean) as T[];