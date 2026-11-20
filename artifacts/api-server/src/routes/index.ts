import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import userRouter from "./user";
import copyrightIntakeRouter from "./copyright-intake";
import adminTitlesRouter from "./admin-titles";
import adminContentRouter from "./admin-content";
import adminOperationsRouter from "./admin-operations";
import seriesEpisodesRouter from "./series-episodes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicRouter);
router.use(userRouter);
router.use(copyrightIntakeRouter);
router.use(adminTitlesRouter);
router.use(adminContentRouter);
router.use(adminOperationsRouter);
router.use(seriesEpisodesRouter);

export default router;
