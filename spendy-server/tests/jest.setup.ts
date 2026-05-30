jest.mock("@faker-js/faker", () => {
  const faker = {
    helpers: {
      arrayElement: <T>(items: T[]): T => items[0]!,
    },
    commerce: {
      productName: () => "Generated expense",
    },
    finance: {
      amount: ({ min }: { min: number; max: number; dec: number }) => `${min + 1}`,
    },
    date: {
      recent: () => new Date("2026-04-23T00:00:00.000Z"),
    },
    datatype: {
      boolean: () => false,
    },
    lorem: {
      sentence: () => "Generated note",
    },
  };

  return { faker };
});

