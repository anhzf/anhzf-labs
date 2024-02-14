import { date, special, transform, union } from 'valibot';

export const timestamp = union([
  date(),
  transform(
    special<{ toDate: () => Date }>((value) => !!(typeof value === 'object'
      && value
      && 'toDate' in value
      && (typeof value.toDate === 'function')
      && (value.toDate() instanceof Date)),
    ),
    (value) => value.toDate(),
  )]);