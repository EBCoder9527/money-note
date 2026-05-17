import { db } from '@/data/db';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/data/models';
import { createId, nowIso } from '@/data/utils/entity';
import { seedDefaultAccounts } from '@/data/seeds/defaultAccounts';
import { normalizeAmount } from '@/utils/money';

function normalizeAccountInput(input: CreateAccountInput): Account {
  const timestamp = nowIso();

  return {
    id: createId('acc'),
    name: input.name.trim(),
    kind: input.kind,
    balance: normalizeAmount(input.balance),
    color: input.color,
    icon: input.icon,
    sortOrder: input.sortOrder ?? Date.now(),
    isDefault: input.isDefault ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const accountRepository = {
  async ensureDefaultAccounts(): Promise<void> {
    await seedDefaultAccounts(db);
  },

  async list(): Promise<Account[]> {
    return db.accounts.orderBy('sortOrder').toArray();
  },

  async create(input: CreateAccountInput): Promise<string> {
    const account = normalizeAccountInput(input);
    await db.accounts.add(account);
    return account.id;
  },

  async update(id: string, input: UpdateAccountInput): Promise<void> {
    const nextInput = {
      ...input,
      name: input.name?.trim(),
      balance: input.balance === undefined ? undefined : normalizeAmount(input.balance),
      updatedAt: nowIso(),
    };

    await db.accounts.update(id, nextInput);
  },

  async remove(id: string): Promise<void> {
    await db.accounts.delete(id);
  },
};
