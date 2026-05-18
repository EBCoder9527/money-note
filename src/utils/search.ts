import dayjs from 'dayjs';
import type { Category, Transaction } from '@/data/models';
import { formatPlainAmount } from '@/utils/money';

export type SearchableTransaction = Transaction & {
  category?: Category;
};

export function searchTransactions<T extends SearchableTransaction>(
  transactions: T[],
  keyword: string,
): T[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    const amount = formatPlainAmount(transaction.amount);
    const amountWithoutTrailingZeros = amount.replace(/\.00$/, '');
    const note = transaction.note?.toLowerCase() ?? '';
    const categoryName = transaction.category?.name.toLowerCase() ?? '';
    const occurredAt = dayjs(transaction.occurredAt);
    const dateText = [
      occurredAt.format('YYYY-MM-DD'),
      occurredAt.format('MM-DD'),
      occurredAt.format('M-D'),
      occurredAt.format('YYYY年M月D日'),
    ].join(' ');

    return [amount, amountWithoutTrailingZeros, note, categoryName, dateText].some((field) =>
      field.toLowerCase().includes(normalizedKeyword),
    );
  });
}
