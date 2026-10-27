import { Server as SocketServer, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-streams-adapter";

import redis from "../config/redis.ts";
import { allowUrls } from "../common/utils/constant.ts";
import { AIProcessingJob } from "../queues/ai/ai.producer.ts";
import { db } from "../prisma/db.ts";

export default class Websocket {
  static io: SocketServer;

  static run(app: any) {
    Websocket.io = new SocketServer(app.server, {
      adapter: createAdapter(redis),
      cors: {
        origin: allowUrls,
        credentials: true,
      },
    });

    Websocket.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token || typeof token !== "string") {
          return next(new Error("Authentication required"));
        }

        const user = app.jwt.verify(token);

        socket.data.user = user;

        next();
      } catch {
        next(new Error("Invalid or expired token"));
      }
    });

    Websocket.io.on("connection", (socket: Socket) => {
      const user = socket.data.user as JwtPayload;

      if (!user) {
        socket.disconnect(true);
        return;
      }

      socket.on("message", (message) => {
        AIProcessingJob({ userId: user.sub, input: message });

        db.orm.public.Message.create({
          userId: user.sub.toString(),
          content: message,
          sender: "USER",
        });
      });

      socket.join(user.sub.toString());
    });
  }

  /**
   * Send a notification to a user.
   */
  static async sendNotification(
    userId: string,
    type: "success" | "error",
    notification: string,
  ) {
    this.io.to(userId).emit("notification", { notification, type });
  }

  /**
   * Tell a user's client to navigate to a route.
   */
  static async sendNavigationSignal(userId: string, route: string) {
    this.io.to(userId).emit("navigation", { route });
  }

  /**
   * Deliver a message to a user.
   */
  static async sendMessage(userId: string, message: string) {
    this.io.to(userId).emit("message", { message });
  }

  /**
   * Notify a user that a stream has started.
   */
  static async startStream(userId: string, sessionId: string) {
    this.io.to(userId).emit("stream:start", { sessionId });
  }

  /**
   * Send stream data to a user's client.
   */
  static async streamData(userId: string, sessionId: string, data: any) {
    this.io.to(userId).emit("stream:data", {
      sessionId,
      data,
    });
  }

  /**
   * Notify a user that a stream has ended.
   */
  static async endStream(userId: string, sessionId: string) {
    this.io.to(userId).emit("stream:end", { sessionId });
  }
}
