import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { can, type Capability } from "./permissions";

export async function getRequestSession(request: Request) {
  return auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
}

export function requireSession(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  void getRequestSession(request)
    .then((session) => {
      if (!session || session.user.banned) {
        response.status(401).json({ error: "Sign in to continue." });
        return;
      }
      response.locals.session = session;
      next();
    })
    .catch((error: unknown) => {
      request.log?.error({ err: error }, "Could not verify the current session");
      response.status(500).json({ error: "Could not verify the current session." });
    });
}

export function requireCapability(capability: Capability) {
  return (request: Request, response: Response, next: NextFunction) => {
    void getRequestSession(request)
      .then((session) => {
        if (!session || session.user.banned) {
          response.status(401).json({ error: "Sign in to continue." });
          return;
        }
        if (!can(session.user.role, capability)) {
          response.status(403).json({ error: "You do not have permission to do that." });
          return;
        }
        response.locals.session = session;
        next();
      })
      .catch((error: unknown) => {
        request.log?.error({ err: error }, "Could not verify the staff session");
        response.status(500).json({ error: "Could not verify the current session." });
      });
  };
}

export type RequestSession = NonNullable<
  Awaited<ReturnType<typeof getRequestSession>>
>;
