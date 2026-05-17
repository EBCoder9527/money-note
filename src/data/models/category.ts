export type CategoryType = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  sortOrder?: number;
  isDefault?: boolean;
};

export type UpdateCategoryInput = Partial<Omit<CreateCategoryInput, 'isDefault'>> & {
  isDefault?: boolean;
};
