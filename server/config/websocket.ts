import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "./index.ts";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import redis from "./redis.ts";

export default class Websocket {
  static io: Server;
  // private static snapshotAccumulator = 0;

  static run(app: HttpServer) {
    Websocket.io = new Server(app, {
      adapter: createAdapter(redis),
      cors: {
        origin: [config.env.CLIENT_URL],
        credentials: true,
      },
    });
  }
}
