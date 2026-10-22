import { Router, type IRouter } from "express";
import footballApiSettingsRouter from "./footballApiSettings";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(footballApiSettingsRouter);

export default router;
