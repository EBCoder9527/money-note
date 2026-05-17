import { db } from '@/data/db';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/data/models';
import { createId, nowIso } from '@/data/utils/entity';
import { seedDefaultCategories, seedDefaultExpenseCategories } from '@/data/seeds/defaultCategories';

function normalizeCategoryInput(input: CreateCategoryInput): Category {
  const timestamp = nowIso();

  return {
    id: createId('cat'),
    name: input.name.trim(),
    type: input.type,
    color: input.color,
    icon: input.icon,
    sortOrder: input.sortOrder ?? Date.now(),
    isDefault: input.isDefault ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const categoryRepository = {
  async list(): Promise<Category[]> {
    const categories = await db.categories.orderBy('sortOrder').toArray();
    return categories.filter((category) => !category.deletedAt);
  },

  async listByType(type: Category['type']): Promise<Category[]> {
    const categories = await db.categories.where('type').equals(type).sortBy('sortOrder');
    return categories.filter((category) => !category.deletedAt);
  },

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async create(input: CreateCategoryInput): Promise<string> {
    const category = normalizeCategoryInput(input);
    await db.categories.add(category);
    return category.id;
  },

  async update(id: string, input: UpdateCategoryInput): Promise<void> {
    const category = await db.categories.get(id);

    if (!category) {
      throw new Error('Category does not exist.');
    }

    if (category.isDefault) {
      throw new Error('Default categories cannot be edited.');
    }

    await db.categories.update(id, {
      ...input,
      name: input.name?.trim(),
      updatedAt: nowIso(),
    });
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.categories, db.transactions, db.budgets, async () => {
      const category = await db.categories.get(id);

      if (!category) {
        throw new Error('Category does not exist.');
      }

      if (category.isDefault) {
        throw new Error('Default categories cannot be removed.');
      }

      const linkedTransactions = await db.transactions.where('categoryId').equals(id).count();
      const linkedBudgets = await db.budgets.where('categoryId').equals(id).count();

      if (linkedTransactions > 0 || linkedBudgets > 0) {
        await db.categories.update(id, {
          deletedAt: nowIso(),
          updatedAt: nowIso(),
        });
        return;
      }

      await db.categories.delete(id);
    });
  },

  async ensureDefaultExpenseCategories(): Promise<void> {
    await seedDefaultExpenseCategories(db);
  },

  async ensureDefaultCategories(): Promise<void> {
    await seedDefaultCategories(db);
  },
};
