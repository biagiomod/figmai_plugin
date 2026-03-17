"use strict";

/**
 * ACE Lambda API — private/work entry point.
 *
 * Receives AWS Lambda (HTTP API v1/v2) events, authenticates via Bearer token,
 * and dispatches to modular service handlers. The static ACE frontend is hosted
 * separately and calls this API over HTTP.
 *
 * Route inventory:
 *   GET  /api/health                      — public, no auth
 *   GET  /api/build-info                  — public, no auth
 *   GET  /api/auth/me                     — no auth (stub)
 *   GET  /api/auth/bootstrap-allowed      — no auth
 *   POST /api/auth/bootstrap              — no auth (first-run only)
 *   POST /api/auth/login                  — no auth
 *   POST /api/auth/logout                 — no auth
 *   GET  /api/model                       — Bearer
 *   POST /api/validate                    — Bearer
 *   POST /api/save                        — Bearer
 *   POST /api/publish                     — Bearer
 *   GET  /api/kb/registry                 — Bearer
 *   POST /api/kb/normalize                — Bearer
 *   POST /api/kb                          — Bearer
 *   GET  /api/kb/:id                      — Bearer
 *   PATCH /api/kb/:id                     — Bearer
 *   DELETE /api/kb/:id                    — Bearer
 *   GET  /api/users                       — Bearer
 *   POST /api/users                       — Bearer
 *   PATCH /api/users/:id                  — Bearer
 *   POST /api/test/connection             — Bearer
 *   POST /api/test/assistant              — Bearer
 */

const { json, corsHeaders, errorResponse } = require("./responseUtils");
const { isAuthorized } = require("./authUtils");
const { s3Info } = require("./storageService");
const { handleAuth } = require("./authService");
const {
  getModel,
  validate,
  saveModel,
  publishModel,
} = require("./configService");
const { handleKb } = require("./kbService");
const { handleUsers } = require("./userService");
const { handleTest } = require("./testService");

const SERVICE_NAME = process.env.SERVICE_NAME || "ace-lambda";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "0.1.0";
const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || "";
const GIT_COMMIT_SHA = process.env.GIT_COMMIT_SHA || "";

// Paths that bypass Bearer-token auth
const PUBLIC_PATHS = new Set(["/api/health", "/api/build-info"]);
const AUTH_PATHS = new Set([
  "/figma-admin/api/auth/me",
  "/figma-admin/api/auth/bootstrap-allowed",
  "/figma-admin/api/auth/bootstrap",
  "/figma-admin/api/auth/bootstrap/create-first-account",
  "/figma-admin/api/auth/login",
  "/figma-admin/api/auth/logout",
]);

exports.lambdaHandler = async (event) => {
  const method = (
    event.httpMethod ||
    event.requestContext?.http?.method ||
    "GET"
  ).toUpperCase();

  const rawPath = event.path || event.rawPath || "/";
  const path = rawPath.replace(/\/$/, "") || "/";
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const body = event.body || null;
  const requestId = event.requestContext?.requestId || `req-${Date.now()}`;
  const startMs = Date.now();

  // CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "" };
  }

  // Bearer-token auth guard
  if (!PUBLIC_PATHS.has(path) && !AUTH_PATHS.has(path)) {
    if (!isAuthorized(event)) {
      logRequest({
        requestId,
        method,
        path,
        status: 401,
        latencyMs: Date.now() - startMs,
      });
      return addRequestId(
        json(401, { error: "Unauthorized" }, origin),
        requestId,
      );
    }
  }

  let response;
  try {
    response = await dispatch(method, path, body, requestId, origin);
  } catch (err) {
    console.error("[handler] Unhandled error:", err);
    response = json(
      500,
      { error: err.message || "Internal server error" },
      origin,
    );
  }

  response.headers = { ...response.headers, "x-request-id": requestId };
  logRequest({
    requestId,
    method,
    path,
    status: response.statusCode,
    latencyMs: Date.now() - startMs,
  });
  return response;
};

async function dispatch(method, path, body, requestId, origin) {
  // Health / build info
  if (path === "/api/health") return handleHealth(origin);
  if (path === "/api/build-info") return handleBuildInfo(origin);

  // Auth
  if (path.startsWith("/api/auth/"))
    return handleAuth(method, path, body, origin);

  // Config
  if (method === "GET" && path === "/api/model") return getModel(origin);
  if (method === "POST" && path === "/api/validate")
    return validate(body, origin);
  if (method === "POST" && path === "/api/save")
    return saveModel(body, requestId, origin);
  if (method === "POST" && path === "/api/publish")
    return publishModel(requestId, origin);

  // Knowledge bases
  if (path.startsWith("/api/kb"))
    return handleKb(method, path, body, requestId, origin);

  // Users
  if (path.startsWith("/api/users"))
    return handleUsers(method, path, body, requestId, origin);

  // Test routes
  if (path.startsWith("/api/test/"))
    return handleTest(method, path, body, origin);

  return json(404, { error: "Not found", path }, origin);
}

function handleHealth(origin) {
  const info = s3Info();
  return json(
    200,
    {
      status: "ok",
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      buildTimestamp: BUILD_TIMESTAMP || undefined,
      gitCommitSha: GIT_COMMIT_SHA || undefined,
      storage: {
        type: "s3",
        bucket: info.bucket,
        prefix: info.prefix,
        region: info.region,
      },
    },
    origin,
  );
}

function handleBuildInfo(origin) {
  return json(
    200,
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      buildId: BUILD_TIMESTAMP || "local",
      builtAt: BUILD_TIMESTAMP || undefined,
      gitCommitSha: GIT_COMMIT_SHA || undefined,
    },
    origin,
  );
}

function addRequestId(response, requestId) {
  return {
    ...response,
    headers: { ...(response.headers || {}), "x-request-id": requestId },
  };
}

function logRequest({ requestId, method, path, status, latencyMs }) {
  console.log(
    JSON.stringify({
      type: "request",
      requestId,
      method,
      path,
      status,
      latencyMs,
    }),
  );
}
