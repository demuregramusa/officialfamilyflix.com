import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.all("/api/auth", toNodeHandler(auth));
app.all("/api/auth/{*path}", toNodeHandler(auth));
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  request.log?.error({ err: error }, "Unhandled API request error");
  if (response.headersSent) return;
  response.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
