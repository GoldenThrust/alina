import { Server as SocketServer, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-streams-adapter";

import redis from "../config/redis.ts";
import { allowUrls } from "../common/utils/constant.ts";
import { fileManager } from "../common/files/file.ts";
import { AIProcessingJob } from "../queues/ai/ai.producer.ts";
import { ORM } from "../prisma/db.ts";

const testData = [
  {
    id: "session-1",
    textChunks: [
      "Hello, this is a test message.",
      "This is the second chunk of the message.",
      "And this is the final chunk of the message.",
    ],
    images: [
      "uploads/image/test/image1.jpg",
      "uploads/image/test/image2.jpg",
      "uploads/image/test/image3.jpg",
    ],
  },
  {
    id: "session-2",
    textChunks: [
      "This is another test message.",
      "Here is the second chunk of this message.",
    ],
    images: ["uploads/image/test/image.jpg", "uploads/image/test/image4.jpg"],
  },
];
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

      socket.on("message", async ({ content, attachments = [] }) => {
        try {
          const imagesPaths = (attachments as Array<string>).filter((attachment: any) => !!attachment);
          const input = [
            imagesPaths.length > 0
              ? `The user uploaded ${imagesPaths.length} image(s). Image path(s): ${imagesPaths.join(", ")}.`
              : null,
            content,
          ]
            .filter(Boolean)
            .join("\n\n");

          await Promise.all([
            AIProcessingJob({
              userId: user.sub,
              input: {
                type: "text",
                text: input,
              },
            }),

            ORM.Message().create({
              userId: user.sub.toString(),
              sessionId: "default",
              sender: "USER",
              content,
              images: imagesPaths ?? [],
            }),
          ]);
        } catch (error) {
          console.error("Error handling message event:", error);
        }
      });
      // setTimeout(() => {
      //   for (let i = 0; i < testData.length; i++) {
      //     const session = testData[i];
      //     Websocket.startStream(user.sub, session.id);
      //     setTimeout(() => {
      //       for (let j = 0; j < session.textChunks.length; j++) {
      //         setTimeout(() => {
      //           Websocket.streamData(user.sub, session.id, session.textChunks[j]);
      //         }, 1000 * j);
      //       }

      //       setTimeout(() => {
      //         Websocket.streamImages(
      //           user.sub,
      //           session.id,
      //           session.images.slice(0, 2),
      //         );
      //       }, 5000);
      //       setTimeout(() => {
      //         Websocket.streamImages(
      //           user.sub,
      //           session.id,
      //           session.images.slice(2, 4),
      //         );
      //       }, 8000);
      //     }, 5000 * i);
      //     Websocket.endStream(user.sub, session.id);
      //   }
      // }, 5000);

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
  static async streamData(userId: string, sessionId: string, data: string) {
    this.io.to(userId).emit("stream:data", {
      sessionId,
      data,
    });
  }

  static async streamImages(
    userId: string,
    sessionId: string,
    images: string[],
  ) {
    this.io.to(userId).emit("stream:images", {
      sessionId,
      images,
    });
  }
  /**
   * Notify a user that a stream has ended.
   */
  static async endStream(userId: string, sessionId: string) {
    this.io.to(userId).emit("stream:end", { sessionId });
  }
}
