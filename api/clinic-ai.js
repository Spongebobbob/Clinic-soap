export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const soap = (body.soap || "").trim();
  if (!soap) {
    return new Response(JSON.stringify({ error: "Missing SOAP text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY on server" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
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
      return new Response(
        JSON.stringify({ error: "OpenAI error", detail: errText }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await apiResp.json();
    const answer =
      data.choices?.[0]?.message?.content?.trim() || "No answer from AI.";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Network or server error", detail: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
