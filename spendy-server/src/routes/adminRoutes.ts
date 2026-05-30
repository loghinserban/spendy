import { Router } from "express";
import { getObservationList, reviewObservation, getAuditLogs } from "../controllers/adminController";
import { requireGroup } from "../utils/permissions";

const adminRouter = Router();

adminRouter.get("/observation-list", requireGroup("ADMIN"), getObservationList);
adminRouter.patch("/observation-list/:flagId/review", requireGroup("ADMIN"), reviewObservation);
// Admin audit logs (paginated)
adminRouter.get("/audit-logs", requireGroup("ADMIN"), getAuditLogs);

export default adminRouter;


