import type { CategoryType } from './category';

export type TransactionType = CategoryType;

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  occurredAt: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: number;
  categoryId: string;
  occurredAt: string;
  note?: string;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;
