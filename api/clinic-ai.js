export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export default async function handler(req) {
  // 處理 CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const soap = (body.soap || "").trim();
  if (!soap) {
    return jsonResponse({ error: "Missing SOAP text" }, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "Missing OPENAI_API_KEY on server" },
      500
    );
  }

  const prompt = `
You are an internal medicine and family medicine consultant.
Here is a clinic SOAP note from a primary care visit:

${soap}

Please:
1) List likely diagnoses with brief reasoning (3–6 items, most to least likely).
2) Suggest key focused physical exams and tests that should be considered.
3) Provide an initial management plan (including red flags that need ER or admission).
Keep the answer concise and structured.
`.trim();

  try {
    const apiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You provide concise and safe clinical suggestions. You do NOT replace the clinician's own judgement.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      return jsonResponse(
        { error: "OpenAI error", detail: errText },
        500
      );
    }

    const data = await apiResp.json();
    const answer =
      data.choices?.[0]?.message?.content?.trim() || "No answer from AI.";

    return jsonResponse({ answer }, 200);
  } catch (e) {
    return jsonResponse(
      { error: "Network or server error", detail: String(e) },
      500
    );
  }
}
