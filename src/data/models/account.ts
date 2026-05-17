export type AccountKind = 'asset' | 'liability';

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  color: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountInput = {
  name: string;
  kind: AccountKind;
  balance: number;
  color: string;
  icon: string;
  sortOrder?: number;
  isDefault?: boolean;
};

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, 'isDefault'>> & {
  isDefault?: boolean;
};
