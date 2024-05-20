export const omit = <T extends Record<string, never>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> => Object
  .fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;

export const pick = <T extends Record<string, never>, K extends keyof T>(obj: T, ...keys: K[]) => Object
  .fromEntries(
    Object.entries(obj).filter(([key]) => keys.includes(key as K)),
  ) as Pick<T, K>;
