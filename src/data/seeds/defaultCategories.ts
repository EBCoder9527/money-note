import type { LedgerDatabase } from '@/data/db';
import type { Category } from '@/data/models';
import { nowIso } from '@/data/utils/entity';

const defaultExpenseCategoryTemplates = [
  { id: 'cat_default_expense_food', name: '餐饮', color: '#ef4444', icon: 'utensils' },
  { id: 'cat_default_expense_transport', name: '交通', color: '#f97316', icon: 'bus' },
  { id: 'cat_default_expense_shopping', name: '购物', color: '#8b5cf6', icon: 'shopping-bag' },
  { id: 'cat_default_expense_housing', name: '住房', color: '#0ea5e9', icon: 'home' },
  { id: 'cat_default_expense_entertainment', name: '娱乐', color: '#ec4899', icon: 'ticket' },
  { id: 'cat_default_expense_healthcare', name: '医疗', color: '#14b8a6', icon: 'heart-pulse' },
  { id: 'cat_default_expense_education', name: '教育', color: '#6366f1', icon: 'book-open' },
  { id: 'cat_default_expense_other', name: '其他', color: '#64748b', icon: 'circle-ellipsis' },
] as const;

const defaultIncomeCategoryTemplates = [
  { id: 'cat_default_income_salary', name: '工资', color: '#0f9f6e', icon: 'wallet' },
  { id: 'cat_default_income_bonus', name: '奖金', color: '#14b8a6', icon: 'badge-plus' },
  { id: 'cat_default_income_investment', name: '理财', color: '#22c55e', icon: 'trending-up' },
  { id: 'cat_default_income_other', name: '其他', color: '#64748b', icon: 'circle-ellipsis' },
] as const;

export function buildDefaultExpenseCategories(): Category[] {
  const timestamp = nowIso();

  return defaultExpenseCategoryTemplates.map((category, index) => ({
    id: category.id,
    type: 'expense',
    name: category.name,
    color: category.color,
    icon: category.icon,
    sortOrder: index + 1,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function buildDefaultIncomeCategories(): Category[] {
  const timestamp = nowIso();

  return defaultIncomeCategoryTemplates.map((category, index) => ({
    id: category.id,
    type: 'income',
    name: category.name,
    color: category.color,
    icon: category.icon,
    sortOrder: index + 1,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function seedDefaultCategories(database: LedgerDatabase) {
  const defaults = [...buildDefaultExpenseCategories(), ...buildDefaultIncomeCategories()];
  const defaultIds = new Set(defaults.map((category) => category.id));
  const defaultKeys = new Set(defaults.map((category) => `${category.type}:${category.name}`));
  const existingDefaults = await database.categories.bulkGet(
    defaults.map((category) => category.id),
  );
  const missingDefaults = defaults.filter((_, index) => !existingDefaults[index]);

  if (missingDefaults.length > 0) {
    await database.categories.bulkAdd(missingDefaults);
  }

  const duplicateDefaults = await database.categories
    .filter(
      (category) =>
        category.isDefault &&
        defaultKeys.has(`${category.type}:${category.name}`) &&
        !defaultIds.has(category.id),
    )
    .toArray();

  const removableDuplicateIds: string[] = [];

  for (const category of duplicateDefaults) {
    const [transactionCount, budgetCount] = await Promise.all([
      database.transactions.where('categoryId').equals(category.id).count(),
      database.budgets.where('categoryId').equals(category.id).count(),
    ]);

    if (transactionCount === 0 && budgetCount === 0) {
      removableDuplicateIds.push(category.id);
    }
  }

  if (removableDuplicateIds.length > 0) {
    await database.categories.bulkDelete(removableDuplicateIds);
  }
}

export async function seedDefaultExpenseCategories(database: LedgerDatabase) {
  await seedDefaultCategories(database);
}
