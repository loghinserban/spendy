import { Prisma, PrismaClient } from "../../generated/prisma/client";
import { getPrismaClient } from "../utils/prismaClient";
import {
  Expense,
  ExpenseInput,
  ExpenseStatistics,
  PaginatedExpenses,
  StatisticsBreakdown,
} from "../types";

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: {
    category: true;
    paymentMethod: true;
  };
}>;

type ExpenseStatsRow = Prisma.ExpenseGetPayload<{
  select: {
    amount: true;
    category: {
      select: {
        name: true;
      };
    };
    paymentMethod: {
      select: {
        name: true;
      };
    };
  };
}>;

class ExpenseService {
  private static instance: ExpenseService;

  constructor(private readonly prisma: PrismaClient) {}

  static getInstance(): ExpenseService {
    if (!ExpenseService.instance) {
      ExpenseService.instance = new ExpenseService(getPrismaClient());
    }

    return ExpenseService.instance;
  }

  async getExpenses(page: number, limit: number, ownerUserId: string): Promise<PaginatedExpenses> {
    const ownershipFilter: Prisma.ExpenseWhereInput = { userId: ownerUserId };
    const [totalItems, expenses] = await Promise.all([
      this.prisma.expense.count({ where: ownershipFilter }),
      this.prisma.expense.findMany({
        where: ownershipFilter,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          category: true,
          paymentMethod: true,
        },
      }),
    ]);

    return {
      data: expenses.map((expense) => this.toExpense(expense)),
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    };
  }

  async getExpenseById(id: string, ownerUserId: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId: ownerUserId },
      include: {
        category: true,
        paymentMethod: true,
      },
    });

    return expense ? this.toExpense(expense) : null;
  }

  async createExpense(payload: ExpenseInput, ownerUserId: string): Promise<Expense> {
    return this.persistExpense(payload, ownerUserId);
  }

  async addExpenses(expenses: Expense[]): Promise<Expense[]> {
    if (expenses.length === 0) {
      return [];
    }

    return Promise.all(expenses.map((expense: any) => this.persistExpense(expense)));
  }

  async updateExpense(id: string, payload: ExpenseInput, ownerUserId: string): Promise<Expense | null> {
    const existingExpense = await this.prisma.expense.findFirst({
      where: { id, userId: ownerUserId },
    });

    if (!existingExpense) {
      return null;
    }

    return this.persistExpense(payload, ownerUserId, id);
  }

  async deleteExpense(id: string, ownerUserId: string): Promise<boolean> {
    const existingExpense = await this.prisma.expense.findFirst({
      where: { id, userId: ownerUserId },
    });

    if (!existingExpense) {
      return false;
    }

    await this.prisma.expense.delete({ where: { id } });
    return true;
  }

  async getStatistics(ownerUserId: string): Promise<ExpenseStatistics> {
    const ownershipFilter: Prisma.ExpenseWhereInput = { userId: ownerUserId };
    const [totalExpenses, aggregation, breakdownRows] = await Promise.all([
      this.prisma.expense.count({ where: ownershipFilter }),
      this.prisma.expense.aggregate({
        where: ownershipFilter,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.expense.findMany({
        where: ownershipFilter,
        select: {
          amount: true,
          category: {
            select: {
              name: true,
            },
          },
          paymentMethod: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const totalAmount = Number(aggregation._sum.amount ?? 0);

    return {
      totalExpenses,
      totalAmount,
      averageAmount: totalExpenses === 0 ? 0 : totalAmount / totalExpenses,
      byCategory: this.buildBreakdown(breakdownRows, (row) => row.category.name),
      byPaymentMethod: this.buildBreakdown(breakdownRows, (row) => row.paymentMethod.name),
    };
  }

  async reset(): Promise<void> {
    await this.prisma.expense.deleteMany();
    await this.prisma.category.deleteMany();
    await this.prisma.paymentMethod.deleteMany();
  }

  private async persistExpense(payload: ExpenseInput, ownerUserId?: string, id?: string): Promise<Expense> {
    const [category, paymentMethod] = await Promise.all([
      this.prisma.category.upsert({
        where: { name: payload.category },
        update: {},
        create: { name: payload.category },
      }),
      this.prisma.paymentMethod.upsert({
        where: { name: payload.paymentMethod },
        update: {},
        create: { name: payload.paymentMethod },
      }),
    ]);

    const baseData = {
      title: payload.title,
      amount: new Prisma.Decimal(payload.amount),
      date: this.parseDate(payload.date),
      notes: payload.notes ?? null,
      categoryId: category.id,
      paymentMethodId: paymentMethod.id,
    };

    const createData: Prisma.ExpenseUncheckedCreateInput = {
      ...baseData,
      ...(ownerUserId ? { userId: ownerUserId } : {}),
    };

    const updateData: Prisma.ExpenseUncheckedUpdateInput = {
      ...baseData,
      ...(ownerUserId ? { userId: ownerUserId } : {}),
    };

    const expense: ExpenseWithRelations = id
      ? await this.prisma.expense.update({
          where: { id },
          data: updateData,
          include: {
            category: true,
            paymentMethod: true,
          },
        })
      : await this.prisma.expense.create({
          data: createData,
          include: {
            category: true,
            paymentMethod: true,
          },
        });

    return this.toExpense(expense);
  }

  private toExpense(expense: ExpenseWithRelations): Expense {
    const dto: Expense = {
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category.name as Expense["category"],
      date: this.formatDate(expense.date),
      paymentMethod: expense.paymentMethod.name as Expense["paymentMethod"],
    };

    if (expense.notes !== null) {
      dto.notes = expense.notes;
    }

    return dto;
  }

  private buildBreakdown(
    rows: ExpenseStatsRow[],
    resolveKey: (row: ExpenseStatsRow) => string,
  ): Record<string, StatisticsBreakdown> {
    return rows.reduce<Record<string, StatisticsBreakdown>>((accumulator, row) => {
      const key = resolveKey(row);
      const bucket = accumulator[key] ?? { count: 0, totalAmount: 0 };

      bucket.count += 1;
      bucket.totalAmount += Number(row.amount);
      accumulator[key] = bucket;
      return accumulator;
    }, {});
  }

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}

export { ExpenseService };

export const expenseService = ExpenseService.getInstance();


