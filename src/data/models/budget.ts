export type Budget = {
  id: string;
  month: string;
  amount: number;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBudgetInput = {
  month: string;
  amount: number;
  categoryId?: string;
};

export type UpdateBudgetInput = Partial<CreateBudgetInput>;
