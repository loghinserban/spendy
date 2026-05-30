export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Utilities",
  "Shopping",
  "Other",
] as const;

export const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Mobile Payment"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  roleId: string;
  role?: Role;
  createdAt: Date;
}

export interface LoginResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  userId?: string;
}

export interface ExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedExpenses {
  data: Expense[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface StatisticsBreakdown {
  count: number;
  totalAmount: number;
}

export interface ExpenseStatistics {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  byCategory: Record<string, StatisticsBreakdown>;
  byPaymentMethod: Record<string, StatisticsBreakdown>;
}

