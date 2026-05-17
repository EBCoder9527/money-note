import { db } from '@/data/db';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '@/data/models';
import { createId, nowIso } from '@/data/utils/entity';
import { isMonthKey } from '@/utils/date';

function normalizeBudgetInput(input: CreateBudgetInput): Budget {
  const timestamp = nowIso();

  return {
    id: createId('bdg'),
    month: input.month,
    amount: input.amount,
    categoryId: input.categoryId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function assertBudgetInput(input: CreateBudgetInput | UpdateBudgetInput) {
  if (input.month !== undefined && !isMonthKey(input.month)) {
    throw new Error('Budget month must use YYYY-MM format.');
  }

  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Budget amount must be greater than 0.');
  }

  if (input.categoryId) {
    const category = await db.categories.get(input.categoryId);

    if (!category) {
      throw new Error('Category does not exist.');
    }
  }
}

export const budgetRepository = {
  async list(): Promise<Budget[]> {
    return db.budgets.orderBy('month').reverse().toArray();
  },

  async listByMonth(month: string): Promise<Budget[]> {
    return db.budgets.where('month').equals(month).toArray();
  },

  async getByMonth(month: string): Promise<Budget | undefined> {
    if (!isMonthKey(month)) {
      throw new Error('Budget month must use YYYY-MM format.');
    }

    const budgets = await db.budgets.where('month').equals(month).toArray();
    return budgets.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  },

  async getById(id: string): Promise<Budget | undefined> {
    return db.budgets.get(id);
  },

  async create(input: CreateBudgetInput): Promise<string> {
    await assertBudgetInput(input);

    const existingBudget = await db.budgets.where('month').equals(input.month).first();

    if (existingBudget) {
      throw new Error('Budget already exists for this month.');
    }

    const budget = normalizeBudgetInput(input);
    await db.budgets.add(budget);
    return budget.id;
  },

  async upsertMonthlyBudget(month: string, amount: number): Promise<string> {
    await assertBudgetInput({ month, amount });

    return db.transaction('rw', db.budgets, async () => {
      const existingBudgets = await db.budgets.where('month').equals(month).toArray();
      const sortedBudgets = existingBudgets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const [primaryBudget, ...duplicateBudgets] = sortedBudgets;

      if (primaryBudget) {
        await db.budgets.update(primaryBudget.id, {
          amount,
          categoryId: undefined,
          updatedAt: nowIso(),
        });

        if (duplicateBudgets.length > 0) {
          await db.budgets.bulkDelete(duplicateBudgets.map((budget) => budget.id));
        }

        return primaryBudget.id;
      }

      const budget = normalizeBudgetInput({ month, amount });
      await db.budgets.add(budget);
      return budget.id;
    });
  },

  async update(id: string, input: UpdateBudgetInput): Promise<void> {
    await assertBudgetInput(input);
    await db.budgets.update(id, {
      ...input,
      updatedAt: nowIso(),
    });
  },

  async remove(id: string): Promise<void> {
    await db.budgets.delete(id);
  },
};
