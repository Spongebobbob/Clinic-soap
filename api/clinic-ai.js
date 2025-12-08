// api/clinic-ai.js

export default async function handler(req, res) {
  // --- CORS 設定，讓 github.io 可以呼叫這個 API ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 預檢請求（preflight）
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // 只接受 POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { soap } = req.body || {};

    if (!soap || typeof soap !== "string") {
      res.status(400).json({ error: "Missing 'soap' field in body" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server missing OPENAI_API_KEY env" });
      return;
    }

    // 組合要丟給模型的 prompt（單一字串即可）
    const prompt =
      "You are an internal medicine consultant.\n" +
      "Here is a clinic SOAP note:\n\n" +
      soap +
      "\n\nPlease:\n" +
      "1) Rewrite the \"PI\" (present illness) section into fluent, concise English, as if written by a native internal-medicine physician for a clinic note.\n" +
      "2) List likely diagnoses with brief reasoning.\n" +
      "3) Suggest key physical exams and tests.\n" +
      "4) Provide an initial management plan.\n" +
      "Answer in concise English bullet points.";

    // 呼叫 OpenAI（改用新的 /v1/responses endpoint）
    const apiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1-mini", // 也可以換成 gpt-4.1、gpt-4.1-mini 等
        input: prompt,
        max_output_tokens: 800,
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      res.status(502).json({
        error: "OpenAI API error",
        detail: errText.slice(0, 1000),
      });
      return;
    }

    const data = await apiResp.json();

    // 新的 Responses API 回傳格式
    const answer =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    res.status(200).json({ answer });
  } catch (err) {
    console.error("clinic-ai error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
