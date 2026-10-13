type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const BASE_URL = "https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis";
const START_METHOD = "POST";
const HEADERS = {
  "Content-Type": "application/json",
  Authorization:
    "Bearer sk-p-sKOixn1204w8t4Ls3IfQPz-fE04faOZtvGvIRwCXRJ1gs8em7ItV1YbO9fDoDD",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type HttpRequestInit = {
  method: Method;
  headers: Record<string, string>;
  body?: string | object;
};

async function httpRequest(method: Method, fullUrl: string, { headers = {}, body }: RequestInit = {}): Promise<{
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  text: string;
  json: Record<string, any>;
}> {
  const init: RequestInit | any = { method, headers };
  if (body !== undefined)
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(fullUrl, init);
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    status: res.status,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries()),
    text,
    json,
  };
}

async function startTask() {
  const initBody = JSON.stringify({
    dst_actions: [
      "acne",
      "dark_circle_v2",
      "droopy_lower_eyelid",
      "droopy_upper_eyelid",
      "eye_bag",
      "firmness",
      "moisture",
      "oiliness",
      "pore",
      "radiance",
      "redness",
      "age_spot",
      "texture",
      "wrinkle",
      "skin_type",
      "tear_trough",
    ],
    miniserver_args: {
      enable_mask_overlay: false,
    },
    format: "json",
    pf_camera_kit: false,
    src_file_id:
      "r89QbjSOaW2m6NgInLBPAgRj0hRyDOnatxDQ+MGGb9ALbKfeLEmuXUa9yH4wuc2K",
  });
  const { status, ok, json } = await httpRequest(START_METHOD, BASE_URL, {
    headers: HEADERS,
    body: initBody,
  });
  if (!ok) {
    throw new Error("Start request failed: " + status);
  }

  const taskId = json?.data?.task_id;
  if (!taskId) {
    throw new Error("task_id not found in response: " + JSON.stringify(json));
  }
  console.log("[startTask] Task started, id =", taskId);
  return taskId;
}

async function pollTask(taskId: string | number, { intervalMs = 2000, maxAttempts = 300 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pollUrl = BASE_URL + "/" + encodeURIComponent(taskId);
    const { status, ok, json } = await httpRequest("GET", pollUrl, {
      headers: HEADERS,
    });
    if (!ok) {
      throw new Error("Polling failed: " + status);
    }
    const taskStatus = json?.data?.task_status;
    console.log("[pollTask] Attempt", attempt, "status =", taskStatus);
    if (taskStatus === "success") {
      console.log("[pollTask] Success results:", json?.data?.results);
      return json;
    }
    if (taskStatus === "error") {
      throw new Error("Task failed: " + JSON.stringify(json));
    }
    await sleep(intervalMs);
  }
  throw new Error("Max attempts exceeded while polling");
}

(async () => {
  try {
    const taskId = await startTask();
    const finalPayload = await pollTask(taskId);
    console.log(
      "[main] Final response:",
      JSON.stringify(finalPayload, null, 2),
    );
  } catch (e) {
    console.error("[main] Flow error:", e);
    process.exitCode = 1;
  }
})();
