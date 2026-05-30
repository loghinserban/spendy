import { Prisma, PrismaClient } from "../generated/prisma/client";
import { ExpenseService } from "../src/services/expenseService";
import { ExpenseInput } from "../src/types";

const { mockDeep } = require("jest-mock-extended") as {
  mockDeep: <T>() => any;
};

type DeepMockProxy<T> = any;

type PrismaExpenseRecord = {
  id: string;
  title: string;
  amount: Prisma.Decimal;
  date: Date;
  notes: string | null;
  category: {
    id: string;
    name: string;
  };
  paymentMethod: {
    id: string;
    name: string;
  };
};

const buildExpenseRecord = (overrides: Partial<PrismaExpenseRecord> = {}): PrismaExpenseRecord => ({
  id: "expense-1",
  title: "Groceries",
  amount: new Prisma.Decimal("45.50"),
  date: new Date("2026-04-23T00:00:00.000Z"),
  notes: "Weekly shopping",
  category: {
    id: "category-1",
    name: "Food",
  },
  paymentMethod: {
    id: "payment-1",
    name: "Card",
  },
  ...overrides,
});

const buildExpenseInput = (overrides: Partial<ExpenseInput> = {}): ExpenseInput => ({
  title: "Groceries",
  amount: 45.5,
  category: "Food",
  date: "2026-04-23",
  paymentMethod: "Card",
  notes: "Weekly shopping",
  ...overrides,
});

describe("ExpenseService", () => {
  let prisma: DeepMockProxy<PrismaClient>;
  let service: ExpenseService;
  const ownerUserId = "user-1";

  beforeEach(() => {
    prisma = mockDeep<PrismaClient>();
    service = new ExpenseService(prisma);
  });

  it("creates an expense and upserts lookup rows", async () => {
    const input = buildExpenseInput();
    const createdRecord = buildExpenseRecord();

    prisma.category.upsert.mockResolvedValue({ id: "category-1", name: "Food" } as never);
    prisma.paymentMethod.upsert.mockResolvedValue({ id: "payment-1", name: "Card" } as never);
    prisma.expense.create.mockResolvedValue(createdRecord as never);

    const result = await service.createExpense(input, ownerUserId);

    expect(prisma.category.upsert).toHaveBeenCalledWith({
      where: { name: input.category },
      update: {},
      create: { name: input.category },
    });
    expect(prisma.paymentMethod.upsert).toHaveBeenCalledWith({
      where: { name: input.paymentMethod },
      update: {},
      create: { name: input.paymentMethod },
    });
    expect(prisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: input.title,
        amount: new Prisma.Decimal(input.amount),
        date: new Date("2026-04-23T00:00:00.000Z"),
        notes: input.notes,
        userId: ownerUserId,
        categoryId: "category-1",
        paymentMethodId: "payment-1",
      }),
      include: {
        category: true,
        paymentMethod: true,
      },
    });
    expect(result).toEqual({
      id: createdRecord.id,
      title: createdRecord.title,
      amount: 45.5,
      category: "Food",
      date: "2026-04-23",
      paymentMethod: "Card",
      notes: "Weekly shopping",
    });
  });

  it("returns a paginated list of expenses", async () => {
    const records = [
      buildExpenseRecord({ id: "expense-6", title: "Fuel", amount: new Prisma.Decimal("20.00") }),
      buildExpenseRecord({ id: "expense-7", title: "Parking", amount: new Prisma.Decimal("8.00") }),
    ];

    prisma.expense.count.mockResolvedValue(12);
    prisma.expense.findMany.mockResolvedValue(records as never);

    const result = await service.getExpenses(2, 5, ownerUserId);

    expect(prisma.expense.count).toHaveBeenCalledWith({ where: { userId: ownerUserId } });
    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: { userId: ownerUserId },
      skip: 5,
      take: 5,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        category: true,
        paymentMethod: true,
      },
    });
    expect(result).toEqual({
      data: [
        {
          id: "expense-6",
          title: "Fuel",
          amount: 20,
          category: "Food",
          date: "2026-04-23",
          paymentMethod: "Card",
          notes: "Weekly shopping",
        },
        {
          id: "expense-7",
          title: "Parking",
          amount: 8,
          category: "Food",
          date: "2026-04-23",
          paymentMethod: "Card",
          notes: "Weekly shopping",
        },
      ],
      page: 2,
      limit: 5,
      totalItems: 12,
      totalPages: 3,
    });
  });

  it("returns a single expense by id or null when missing", async () => {
    prisma.expense.findFirst.mockResolvedValue(buildExpenseRecord() as never);

    const found = await service.getExpenseById("expense-1", ownerUserId);

    expect(prisma.expense.findFirst).toHaveBeenCalledWith({
      where: { id: "expense-1", userId: ownerUserId },
      include: {
        category: true,
        paymentMethod: true,
      },
    });
    expect(found).toEqual({
      id: "expense-1",
      title: "Groceries",
      amount: 45.5,
      category: "Food",
      date: "2026-04-23",
      paymentMethod: "Card",
      notes: "Weekly shopping",
    });

    prisma.expense.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.getExpenseById("missing", ownerUserId)).resolves.toBeNull();
  });

  it("updates an expense when it exists and returns null otherwise", async () => {
    const input: ExpenseInput = {
      title: "Updated groceries",
      amount: 99.99,
      category: "Transport",
      date: "2026-04-23",
      paymentMethod: "Cash",
    };
    const updatedRecord = buildExpenseRecord({
      title: input.title,
      amount: new Prisma.Decimal("99.99"),
      notes: null,
      category: {
        id: "category-2",
        name: "Transport",
      },
      paymentMethod: {
        id: "payment-2",
        name: "Cash",
      },
    });

    prisma.expense.findFirst.mockResolvedValue(buildExpenseRecord() as never);
    prisma.category.upsert.mockResolvedValue({ id: "category-2", name: "Transport" } as never);
    prisma.paymentMethod.upsert.mockResolvedValue({ id: "payment-2", name: "Cash" } as never);
    prisma.expense.update.mockResolvedValue(updatedRecord as never);

    const updated = await service.updateExpense("expense-1", input, ownerUserId);

    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: "expense-1" },
      data: expect.objectContaining({
        title: input.title,
        amount: new Prisma.Decimal(input.amount),
        date: new Date("2026-04-23T00:00:00.000Z"),
        notes: null,
        userId: ownerUserId,
        categoryId: "category-2",
        paymentMethodId: "payment-2",
      }),
      include: {
        category: true,
        paymentMethod: true,
      },
    });
    expect(updated).toEqual({
      id: "expense-1",
      title: "Updated groceries",
      amount: 99.99,
      category: "Transport",
      date: "2026-04-23",
      paymentMethod: "Cash",
      notes: undefined,
    });

    prisma.expense.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.updateExpense("missing", input, ownerUserId)).resolves.toBeNull();
  });

  it("deletes an expense only when it exists", async () => {
    prisma.expense.findFirst.mockResolvedValue(buildExpenseRecord() as never);
    prisma.expense.delete.mockResolvedValue(buildExpenseRecord() as never);

    await expect(service.deleteExpense("expense-1", ownerUserId)).resolves.toBe(true);
    expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: "expense-1" } });

    prisma.expense.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.deleteExpense("missing", ownerUserId)).resolves.toBe(false);
  });

  it("returns statistics built from Prisma aggregates and grouped rows", async () => {
    prisma.expense.count.mockResolvedValue(3);
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal("65.50") } } as never);
    prisma.expense.findMany.mockResolvedValue([
      buildExpenseRecord(),
      buildExpenseRecord({
        id: "expense-2",
        title: "Taxi",
        amount: new Prisma.Decimal("20.00"),
        category: { id: "category-2", name: "Transport" },
        paymentMethod: { id: "payment-2", name: "Cash" },
      }),
      buildExpenseRecord({
        id: "expense-3",
        title: "Coffee",
        amount: new Prisma.Decimal("0.00"),
        category: { id: "category-1", name: "Food" },
        paymentMethod: { id: "payment-2", name: "Cash" },
      }),
    ] as never);

    const statistics = await service.getStatistics(ownerUserId);

    expect(statistics).toEqual({
      totalExpenses: 3,
      totalAmount: 65.5,
      averageAmount: 21.833333333333332,
      byCategory: {
        Food: {
          count: 2,
          totalAmount: 45.5,
        },
        Transport: {
          count: 1,
          totalAmount: 20,
        },
      },
      byPaymentMethod: {
        Card: {
          count: 1,
          totalAmount: 45.5,
        },
        Cash: {
          count: 2,
          totalAmount: 20,
        },
      },
    });
  });

  it("bulk inserts expenses and clears all tables during reset", async () => {
    prisma.category.upsert.mockResolvedValue({ id: "category-1", name: "Food" } as never);
    prisma.paymentMethod.upsert.mockResolvedValue({ id: "payment-1", name: "Card" } as never);
    prisma.expense.create.mockResolvedValue(buildExpenseRecord() as never);

    const result = await service.addExpenses([
      {
        id: "expense-1",
        title: "Groceries",
        amount: 45.5,
        category: "Food",
        date: "2026-04-23",
        paymentMethod: "Card",
        notes: "Weekly shopping",
      },
      {
        id: "expense-2",
        title: "Taxi",
        amount: 20,
        category: "Transport",
        date: "2026-04-23",
        paymentMethod: "Cash",
      },
    ]);

    expect(result).toHaveLength(2);
    expect(prisma.expense.create).toHaveBeenCalledTimes(2);

    prisma.expense.deleteMany.mockResolvedValue({ count: 2 } as never);
    prisma.category.deleteMany.mockResolvedValue({ count: 1 } as never);
    prisma.paymentMethod.deleteMany.mockResolvedValue({ count: 1 } as never);

    await expect(service.reset()).resolves.toBeUndefined();

    expect(prisma.expense.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.paymentMethod.deleteMany).toHaveBeenCalledTimes(1);
  });
});

