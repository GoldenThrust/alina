export function initQueues() {
    import("./worker/ai");
    import("./worker/game");
    import("./worker/join");
    import("./worker/vote");
  console.log("Queues initialized");
}