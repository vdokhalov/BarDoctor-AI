import { Router, type IRouter } from "express";
import healthRouter   from "./health";
import aiRouter       from "./ai";
import priorityRouter from "./priority";
import smartRouter    from "./smart";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai",       aiRouter);
router.use("/priority", priorityRouter);
router.use("/smart",    smartRouter);

export default router;
