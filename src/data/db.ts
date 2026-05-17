import Dexie, { type Table } from 'dexie';
import type { Account, Budget, Category, Transaction } from './models';
import { seedDefaultAccounts } from './seeds/defaultAccounts';
import { seedDefaultCategories } from './seeds/defaultCategories';

export class LedgerDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  accounts!: Table<Account, string>;

  constructor() {
    super('personal-ledger');

    this.version(1).stores({
      transactions: 'id, type, categoryId, occurredAt, createdAt',
      categories: 'id, type, name, sortOrder, isDefault',
      budgets: 'id, month, categoryId',
    });

    this.version(2).stores({
      transactions: 'id, type, categoryId, occurredAt, createdAt',
      categories: 'id, type, name, sortOrder, isDefault',
      budgets: 'id, month, categoryId',
      accounts: 'id, kind, name, sortOrder, isDefault',
    });

    this.on('populate', async () => {
      await seedDefaultCategories(this);
      await seedDefaultAccounts(this);
    });
  }
}

export const db = new LedgerDatabase();
