import request from "supertest";
import app from "../src/server";
import { expenseService } from "../src/services/expenseService";
import { fakerService } from "../src/services/fakerService";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../src/types";

jest.mock("../src/services/expenseService", () => ({
  expenseService: {
    addExpenses: jest.fn(),
    deleteExpense: jest.fn(),
    getExpenseById: jest.fn(),
    getExpenses: jest.fn(),
    getStatistics: jest.fn(),
    reset: jest.fn(),
    createExpense: jest.fn(),
    updateExpense: jest.fn(),
  },
}));

const mockedExpenseService = expenseService as jest.Mocked<typeof expenseService>;

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("FakerService", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    fakerService.stop();
    fakerService.setBroadcastHandler(() => {
      // no-op for tests unless overridden
    });
    mockedExpenseService.addExpenses.mockResolvedValue([]);
    mockedExpenseService.reset.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    fakerService.stop();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("generates valid expense entities", () => {
    const generated = fakerService.generateBatch(5);

    expect(generated).toHaveLength(5);

    for (const expense of generated) {
      expect(expense.id).toEqual(expect.any(String));
      expect(expense.title).toEqual(expect.any(String));
      expect(expense.title.length).toBeGreaterThan(0);
      expect(typeof expense.amount).toBe("number");
      expect(expense.amount).toBeGreaterThan(0);
      expect(EXPENSE_CATEGORIES).toContain(expense.category);
      expect(PAYMENT_METHODS).toContain(expense.paymentMethod);
      expect(expense.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("defaults to one item for non-positive batch counts", () => {
    expect(fakerService.generateBatch(0)).toHaveLength(1);
  });

  it("generates notes when faker requests them", () => {
    const fakerModule = require("@faker-js/faker");
    const originalBoolean = fakerModule.faker.datatype.boolean;

    fakerModule.faker.datatype.boolean = () => true;

    const generated = fakerService.generateBatch(1);

    expect(generated[0]?.notes).toBe("Generated note");

    fakerModule.faker.datatype.boolean = originalBoolean;
  });

  it("reports already-running when start is called twice", () => {
    const first = fakerService.start();
    const second = fakerService.start();

    expect(first.running).toBe(true);
    expect(second.message).toContain("already running");
  });

  it("reports already-stopped when stop is called twice", () => {
    const firstStop = fakerService.stop();
    const secondStop = fakerService.stop();

    expect(firstStop.running).toBe(false);
    expect(secondStop.message).toContain("already stopped");
  });

  it("persists generated batches asynchronously and broadcasts the created rows", async () => {
    const broadcastSpy = jest.fn();
    mockedExpenseService.addExpenses.mockImplementation(async (expenses) => expenses);
    fakerService.setBroadcastHandler(broadcastSpy);

    fakerService.start();
    jest.advanceTimersByTime(5000);
    await flushMicrotasks();

    expect(fakerService.isRunning()).toBe(true);
    expect(mockedExpenseService.addExpenses).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(broadcastSpy.mock.calls[0][0]).toHaveLength(3);
  });

  it("stops interval generation", async () => {
    mockedExpenseService.addExpenses.mockImplementation(async (expenses) => expenses);
    fakerService.start();
    jest.advanceTimersByTime(5000);
    await flushMicrotasks();

    const beforeStop = mockedExpenseService.addExpenses.mock.calls.length;
    fakerService.stop();
    jest.advanceTimersByTime(10000);
    await flushMicrotasks();

    const afterStop = mockedExpenseService.addExpenses.mock.calls.length;

    expect(beforeStop).toBeGreaterThan(0);
    expect(afterStop).toBe(beforeStop);
    expect(fakerService.isRunning()).toBe(false);
  });
});

describe("Faker endpoints", () => {
  beforeEach(() => {
    fakerService.stop();
    mockedExpenseService.addExpenses.mockResolvedValue([]);
    mockedExpenseService.reset.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    fakerService.stop();
    jest.clearAllMocks();
  });

  it("POST /faker/start returns 200", async () => {
    const response = await request(app).post("/faker/start");

    expect(response.status).toBe(200);
    expect(response.body.running).toBe(true);

    await request(app).post("/faker/stop");
  });

  it("POST /faker/stop returns 200", async () => {
    await request(app).post("/faker/start");

    const response = await request(app).post("/faker/stop");

    expect(response.status).toBe(200);
    expect(response.body.running).toBe(false);
  });
});


