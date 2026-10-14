import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "../config/index.ts";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import redis from "../config/redis.ts";

export default class Websocket {
  static io: Server;
  static socket: any;
  // private static snapshotAccumulator = 0;

  static run(app: HttpServer) {
    Websocket.io = new Server(app, {
      adapter: createAdapter(redis),
      cors: {
        origin: [config.env.CLIENT_URL],
        credentials: true,
      },
    });

    Websocket.io.on("connection", (socket) => {
        const user = (socket?.user) as any;
        if (!user) return;

        this.socket = socket;

        socket.join(user.id.toString());
    });
  }

  static async sendNotification(userId: string, notification: any) {

  }

  static async sendNavigationSignal(userId: string, route: string) {}

  static async sendMessage(userId: string, message: string) {

  }

  static async startStream(userId: string, sessionId: string) {

  }

  static async streamData(userId: string, sessionId: string, data: any) {

  }

  static async endStream(userId: string, sessionId: string) {

  }
}
