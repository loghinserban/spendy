import { Request, Response } from "express";
import { fakerService } from "../services/fakerService";

export const startFaker = (_req: Request, res: Response): void => {
  const result = fakerService.start();
  res.status(200).json(result);
};

export const stopFaker = (_req: Request, res: Response): void => {
  const result = fakerService.stop();
  res.status(200).json(result);
};

