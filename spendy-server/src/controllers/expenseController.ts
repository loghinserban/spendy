import { Request, Response } from "express";
import { expenseService } from "../services/expenseService";
import {
  ValidationError,
  validateExpensePayload,
  validatePaginationQuery,
} from "../utils/validation";

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    // OWASP ZAP: never trust client-provided owner IDs; scope every query to authenticated user.
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const { page, limit } = validatePaginationQuery(req.query);
    const result = await expenseService.getExpenses(page, limit, ownerUserId);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(error, res);
  }
};

export const getExpenseById = async (req: Request, res: Response): Promise<void> => {
  // OWASP ZAP: enforce identity context before loading any resource by ID.
  const ownerUserId = req.user?.id;
  if (!ownerUserId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const id = getParamId(req.params.id);
  if (!id) {
    res.status(400).json({ message: "Invalid expense id." });
    return;
  }

  const expense = await expenseService.getExpenseById(id, ownerUserId);

  if (!expense) {
    res.status(404).json({ message: "Expense not found." });
    return;
  }

  res.status(200).json(expense);
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    // OWASP ZAP: ownership is server-assigned from auth context, not request body.
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const payload = validateExpensePayload(req.body);
    const createdExpense = await expenseService.createExpense(payload, ownerUserId);
    res.status(201).json(createdExpense);
  } catch (error) {
    handleControllerError(error, res);
  }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    // OWASP ZAP: block IDOR by requiring authenticated owner for updates.
    const ownerUserId = req.user?.id;
    if (!ownerUserId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const id = getParamId(req.params.id);
    if (!id) {
      res.status(400).json({ message: "Invalid expense id." });
      return;
    }

    const payload = validateExpensePayload(req.body);
    const updatedExpense = await expenseService.updateExpense(id, payload, ownerUserId);

    if (!updatedExpense) {
      res.status(404).json({ message: "Expense not found." });
      return;
    }

    res.status(200).json(updatedExpense);
  } catch (error) {
    handleControllerError(error, res);
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  // OWASP ZAP: block IDOR by deleting only records owned by authenticated user.
  const ownerUserId = req.user?.id;
  if (!ownerUserId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const id = getParamId(req.params.id);
  if (!id) {
    res.status(400).json({ message: "Invalid expense id." });
    return;
  }

  const deleted = await expenseService.deleteExpense(id, ownerUserId);

  if (!deleted) {
    res.status(404).json({ message: "Expense not found." });
    return;
  }

  res.status(204).send();
};

export const getStatistics = async (req: Request, res: Response): Promise<void> => {
  // OWASP ZAP: do not leak cross-user aggregates; statistics are owner-scoped.
  const ownerUserId = req.user?.id;
  if (!ownerUserId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const statistics = await expenseService.getStatistics(ownerUserId);
  res.status(200).json(statistics);
};

const handleControllerError = (error: unknown, res: Response): void => {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({ message: error.message, errors: error.details });
    return;
  }

  res.status(500).json({ message: "Internal server error." });
};

const getParamId = (id: string | string[] | undefined): string | null => {
  if (typeof id !== "string") {
    return null;
  }

  const trimmed = id.trim();
  return trimmed ? trimmed : null;
};

