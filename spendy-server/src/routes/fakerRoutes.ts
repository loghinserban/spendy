import { Router } from "express";
import { startFaker, stopFaker } from "../controllers/fakerController";

const fakerRouter = Router();

fakerRouter.post("/faker/start", startFaker);
fakerRouter.post("/faker/stop", stopFaker);

export default fakerRouter;

