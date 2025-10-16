import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { IpMonitoringService } from "./ip-monitoring.service";

@Injectable()
export class IpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpLoggingMiddleware.name);

  constructor(private readonly ipMonitoringService: IpMonitoringService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const ipAddress = this.getClientIp(req);
      const userAgent = req.get("User-Agent") || "Unknown";
      const action = this.determineAction(req);

      // Skip logging for health checks and static assets
      if (this.shouldSkipLogging(req)) {
        return next();
      }

      // Check if IP is blocked
      const isBlocked = await this.ipMonitoringService.isIpBlocked(ipAddress);

      if (isBlocked) {
        this.logger.warn(
          `Blocked IP ${ipAddress} attempted to access ${req.path}`,
        );
        return res.status(403).json({
          message: "Access denied",
          code: "IP_BLOCKED",
        });
      }

      // Log the activity asynchronously
      this.logActivityAsync(ipAddress, userAgent, action, req, res);

      next();
    } catch (error) {
      this.logger.error("Error in IP logging middleware:", error);
      next();
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];

    if (forwarded) {
      return Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(",")[0].trim();
    }

    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return (
      req.connection.remoteAddress || req.socket.remoteAddress || "unknown"
    );
  }

  private determineAction(req: Request): string {
    const path = req.path;
    const method = req.method;

    // Authentication actions
    if (path.includes("/auth/login")) return "login";
    if (path.includes("/auth/logout")) return "logout";
    if (path.includes("/auth/refresh")) return "token_refresh";

    // Exam actions
    if (path.includes("/attempts") && method === "POST") return "exam_start";
    if (path.includes("/attempts") && method === "PATCH") {
      if (path.includes("/submit")) return "exam_submit";
      if (path.includes("/pause")) return "exam_pause";
      if (path.includes("/resume")) return "exam_resume";
      return "exam_update";
    }

    // Answer actions
    if (path.includes("/answers") && method === "POST") return "answer_submit";
    if (path.includes("/answers") && method === "PATCH") return "answer_update";

    // Admin actions
    if (path.includes("/admin/") && method === "GET") return "admin_view";
    if (path.includes("/admin/") && method === "POST") return "admin_create";
    if (path.includes("/admin/") && method === "PATCH") return "admin_update";
    if (path.includes("/admin/") && method === "DELETE") return "admin_delete";

    // Student actions
    if (path.includes("/students") && method === "GET") return "student_view";
    if (path.includes("/students") && method === "POST")
      return "student_create";
    if (path.includes("/students") && method === "PATCH")
      return "student_update";

    // Results actions
    if (path.includes("/results") && method === "GET") return "results_view";
    if (path.includes("/results") && method === "POST")
      return "results_generate";

    // Default action based on method
    switch (method) {
      case "GET":
        return "view";
      case "POST":
        return "create";
      case "PATCH":
        return "update";
      case "DELETE":
        return "delete";
      default:
        return "unknown";
    }
  }

  private shouldSkipLogging(req: Request): boolean {
    const path = req.path;

    // Skip health checks, static assets, and monitoring endpoints
    return (
      path === "/health" ||
      path === "/metrics" ||
      path.startsWith("/static/") ||
      path.startsWith("/assets/") ||
      path.includes("favicon") ||
      path.includes(".css") ||
      path.includes(".js") ||
      path.includes(".png") ||
      path.includes(".jpg") ||
      path.includes(".svg")
    );
  }

  private async logActivityAsync(
    ipAddress: string,
    userAgent: string,
    action: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // Extract user ID from JWT token if available
      const userId = (req as any).user?.id;

      // Extract exam ID from URL params if available
      const examId = req.params.examId || req.params.id;

      await this.ipMonitoringService.logActivity({
        ipAddress,
        userAgent,
        action,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userId,
        examId,
        metadata: {
          referer: req.get("Referer"),
          origin: req.get("Origin"),
          contentType: req.get("Content-Type"),
          contentLength: req.get("Content-Length"),
        },
      });
    } catch (error) {
      this.logger.error("Error logging activity:", error);
    }
  }
}
