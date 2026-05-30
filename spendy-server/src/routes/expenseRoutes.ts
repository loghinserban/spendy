import { Router } from "express";
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  getStatistics,
  updateExpense,
} from "../controllers/expenseController";
import { checkPermission } from "../utils/permissions";

const expenseRouter = Router();

expenseRouter.get("/expenses", checkPermission("read:expenses"), getExpenses);
expenseRouter.get("/expenses/:id", checkPermission("read:expenses"), getExpenseById);
expenseRouter.post("/expenses", checkPermission("create:expenses"), createExpense);
expenseRouter.put("/expenses/:id", checkPermission("update:expenses"), updateExpense);
expenseRouter.delete("/expenses/:id", checkPermission("delete:expenses"), deleteExpense);
expenseRouter.get("/statistics", checkPermission("read:expenses"), getStatistics);

export default expenseRouter;

