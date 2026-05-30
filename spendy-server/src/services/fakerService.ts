import { randomUUID } from "crypto";
import { EXPENSE_CATEGORIES, Expense, PAYMENT_METHODS } from "../types";
import { expenseService } from "./expenseService";

const { faker }: { faker: typeof import("@faker-js/faker").faker } = require("@faker-js/faker");

type BroadcastHandler = (expenses: Expense[]) => void;

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_BATCH_SIZE = 3;

const resolvePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

class FakerService {
  private static instance: FakerService;

  private timer: NodeJS.Timeout | null = null;

  private readonly intervalMs = resolvePositiveInteger(process.env.FAKER_INTERVAL_MS, DEFAULT_INTERVAL_MS);

  private readonly batchSize = resolvePositiveInteger(process.env.FAKER_BATCH_SIZE, DEFAULT_BATCH_SIZE);

  private broadcastHandler: BroadcastHandler = () => {
    // No-op until server wires WebSocket broadcasting.
  };

  private constructor() {}

  static getInstance(): FakerService {
    if (!FakerService.instance) {
      FakerService.instance = new FakerService();
    }

    return FakerService.instance;
  }

  setBroadcastHandler(handler: BroadcastHandler): void {
    this.broadcastHandler = handler;
  }

  start(): { running: boolean; message: string } {
    if (this.timer) {
      return { running: true, message: "Faker generator is already running." };
    }

    this.timer = setInterval(() => {
      void (async () => {
        const generated = this.generateBatch(this.batchSize);
        const created = await expenseService.addExpenses(generated);
        this.broadcastHandler(created);
      })();
    }, this.intervalMs);

    return { running: true, message: "Faker generator started." };
  }

  stop(): { running: boolean; message: string } {
    if (!this.timer) {
      return { running: false, message: "Faker generator is already stopped." };
    }

    clearInterval(this.timer);
    this.timer = null;
    return { running: false, message: "Faker generator stopped." };
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  generateBatch(count: number): Expense[] {
    const safeCount = Number.isInteger(count) && count > 0 ? count : 1;
    return Array.from({ length: safeCount }, () => this.generateExpense());
  }

  private generateExpense(): Expense {
    const category = faker.helpers.arrayElement(EXPENSE_CATEGORIES);
    const paymentMethod = faker.helpers.arrayElement(PAYMENT_METHODS);

    const expense: Expense = {
      id: randomUUID(),
      title: faker.commerce.productName(),
      amount: Number(faker.finance.amount({ min: 1, max: 1000, dec: 2 })),
      category,
      date: faker.date.recent({ days: 45 }).toISOString().slice(0, 10),
      paymentMethod,
    };

    if (faker.datatype.boolean()) {
      expense.notes = faker.lorem.sentence();
    }

    return expense;
  }
}

export const fakerService = FakerService.getInstance();

