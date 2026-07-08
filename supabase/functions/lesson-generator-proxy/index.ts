import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type ProxyResourceInput = {
  name: string;
  color: string;
  ohm: number;
  enHint?: string;
};

type ProxyRequest = {
  requestId?: string;
  target?: {
    courseId?: string;
    lessonId?: string;
    sectionId?: string | null;
  };
  generation?: {
    theme?: string;
    topicLevel?: number;
    sentenceLength?: string;
    resources?: ProxyResourceInput[];
    iValue?: number;
    uTotal?: number;
    settings?: Record<string, unknown>;
  };
};

const DEFAULT_BASE_URL = "https://chunks-generator-gu5ft5gagq-uw.a.run.app";
const TIMEOUT_MS = Number(Deno.env.get("CHUNKS_M2M_TIMEOUT_MS") || 45000);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  }
});

function validateRequest(payload: ProxyRequest) {
  if (!payload.target?.courseId || !payload.target?.lessonId) {
    return "target.courseId and target.lessonId are required.";
  }
  if (!payload.generation?.resources || payload.generation.resources.length === 0) {
    return "generation.resources must include at least one item.";
  }
  for (const [index, resource] of payload.generation.resources.entries()) {
    if (!resource.name?.trim()) return `generation.resources[${index}].name is required.`;
    if (!resource.color?.trim()) return `generation.resources[${index}].color is required.`;
    if (!Number.isFinite(Number(resource.ohm)) || Number(resource.ohm) <= 0) {
      return `generation.resources[${index}].ohm must be a positive number.`;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ status: "error", errorMessage: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);

  const apiKey = Deno.env.get("CHUNKS_M2M_API_KEY");

  let payload: ProxyRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ status: "error", errorMessage: "Invalid JSON body.", code: "BAD_JSON" }, 400);
  }

  const validationError = validateRequest(payload);
  if (validationError) {
    return json({ status: "error", errorMessage: validationError, code: "BAD_REQUEST" }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
  const baseUrl = (Deno.env.get("CHUNKS_M2M_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");

  try {
    const generation = payload.generation!;
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest"
    };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const upstream = await fetch(`${baseUrl}/api/generate-sentence`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(generation)
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok || result.status === "error") {
      return json({
        status: "error",
        errorMessage: result.error || result.message || `Lesson generator failed with HTTP ${upstream.status}`,
        code: result.code || `UPSTREAM_${upstream.status}`,
        traceId: result.trace_id
      }, upstream.ok ? 502 : upstream.status);
    }

    if (result.status === "processing") {
      return json({
        status: "processing",
        candidateId: payload.requestId || crypto.randomUUID(),
        message: result.message || "Sentence generation started. Save is disabled until a complete candidate is available."
      });
    }

    const data = result.data || {};
    if (!data.engSentence || !data.vieSentence || typeof data.totalOhm !== "number") {
      return json({ status: "error", errorMessage: "Lesson generator returned an incomplete candidate.", code: "INCOMPLETE_CANDIDATE" }, 502);
    }

    return json({
      status: "success",
      candidate: {
        candidateId: payload.requestId || crypto.randomUUID(),
        courseId: payload.target!.courseId!,
        lessonId: payload.target!.lessonId!,
        sectionId: payload.target!.sectionId || null,
        engSentence: data.engSentence,
        vieSentence: data.vieSentence,
        resourcesUsed: data.resourcesUsed || [],
        rTotal: typeof data.rTotal === "number" ? data.rTotal : null,
        iValue: typeof data.iValue === "number" ? data.iValue : null,
        uTotal: typeof data.uTotal === "number" ? data.uTotal : null,
        totalOhm: typeof data.totalOhm === "number" ? data.totalOhm : null,
        difficultyLabel: data.difficultyLabel || null,
        generatedAt: data.generatedAt || new Date().toISOString()
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({
      status: "error",
      errorMessage: message.includes("abort") || message.includes("timeout") ? "Lesson generator timed out." : message,
      code: message.includes("abort") || message.includes("timeout") ? "TIMEOUT" : "PROXY_ERROR"
    }, 504);
  } finally {
    clearTimeout(timeout);
  }
});
