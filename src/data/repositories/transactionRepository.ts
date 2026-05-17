import { db } from '@/data/db';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
  UpdateTransactionInput,
} from '@/data/models';
import { createId, nowIso } from '@/data/utils/entity';

function normalizeTransactionInput(input: CreateTransactionInput): Transaction {
  const timestamp = nowIso();

  return {
    id: createId('txn'),
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    occurredAt: input.occurredAt,
    note: input.note?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const transactionRepository = {
  async list(): Promise<Transaction[]> {
    return db.transactions.orderBy('occurredAt').reverse().toArray();
  },

  async listByDateRange(startIso: string, endIso: string): Promise<Transaction[]> {
    const transactions = await db.transactions
      .where('occurredAt')
      .between(startIso, endIso, true, true)
      .sortBy('occurredAt');

    return transactions.reverse();
  },

  async listByType(type: TransactionType): Promise<Transaction[]> {
    return db.transactions.where('type').equals(type).reverse().sortBy('occurredAt');
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  },

  async create(input: CreateTransactionInput): Promise<string> {
    if (input.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0.');
    }

    const category = await db.categories.get(input.categoryId);

    if (!category) {
      throw new Error('Category does not exist.');
    }

    if (category.type !== input.type) {
      throw new Error('Transaction type must match category type.');
    }

    const transaction = normalizeTransactionInput(input);
    await db.transactions.add(transaction);
    return transaction.id;
  },

  async update(id: string, input: UpdateTransactionInput): Promise<void> {
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('Transaction amount must be greater than 0.');
    }

    if (input.categoryId || input.type) {
      const current = await db.transactions.get(id);
      const nextCategoryId = input.categoryId ?? current?.categoryId;
      const nextType = input.type ?? current?.type;

      if (!current || !nextCategoryId || !nextType) {
        throw new Error('Transaction does not exist.');
      }

      const category = await db.categories.get(nextCategoryId);

      if (!category || category.type !== nextType) {
        throw new Error('Transaction type must match category type.');
      }
    }

    await db.transactions.update(id, {
      ...input,
      note: input.note?.trim() || undefined,
      updatedAt: nowIso(),
    });
  },

  async remove(id: string): Promise<void> {
    await db.transactions.delete(id);
  },
};
