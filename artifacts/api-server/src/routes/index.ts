import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import userRouter from "./user";
import copyrightIntakeRouter from "./copyright-intake";
import adminTitlesRouter from "./admin-titles";
import adminContentRouter from "./admin-content";
import adminOperationsRouter from "./admin-operations";
import seriesEpisodesRouter from "./series-episodes";
import adminMovieArchiveRouter from "./admin-movie-archive";
import categoriesRouter from "./categories";
import developerPortalRouter from "./developer-portal";
import developerV1Router from "./developer-v1";
import adServerRouter from "./ad-server";
import aiConciergeRouter from "./ai-concierge";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/ai-concierge", aiConciergeRouter);
router.use(categoriesRouter);
router.use(developerPortalRouter);
router.use(adServerRouter);
router.use(publicRouter);
router.use(userRouter);
router.use(copyrightIntakeRouter);
router.use(adminTitlesRouter);
router.use(adminContentRouter);
router.use(adminOperationsRouter);
router.use(seriesEpisodesRouter);
router.use(adminMovieArchiveRouter);

export default router;
