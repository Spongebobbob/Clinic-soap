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
    const { soap, mode, age, sex, complaint } = req.body || {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server missing OPENAI_API_KEY env" });
      return;
    }

    let prompt = "";

    // ====== 模式一：問診建議（triage / 初診怪怪主訴用） ======
    if (mode === "triage") {
      if (!complaint || typeof complaint !== "string") {
        res.status(400).json({ error: "Missing 'complaint' field for triage mode" });
        return;
      }

      const safeAge = age ? String(age) : "unknown";
      const safeSex = sex === "M" || sex === "F" ? sex : "Unknown";

      prompt =
        `You are a family medicine physician in Taiwan working in a busy clinic.\n` +
        `Your job is to help a junior doctor handle an INITIAL, UNSTRUCTURED CHIEF COMPLAINT.\n\n` +
        `The doctor is afraid of missing important diagnoses and red flags,\n` +
        `so you MUST:\n` +
        `- Classify the symptom into a main category (e.g. chest pain, dyspnea, abdominal pain, bloating, headache, dizziness/vertigo, fever, cough, palpitations, edema, fatigue, weight loss, urinary, psychiatric, musculoskeletal, skin, others).\n` +
        `- Propose STRUCTURED history questions the doctor can ask in Mandarin, with short English hints in parentheses.\n` +
        `- Highlight red-flag questions that must be asked.\n` +
        `- Suggest key physical exam focus.\n` +
        `- Suggest likely symptom category and initial differential diagnoses.\n\n` +
        `Patient info:\n` +
        `Age: ${safeAge}\n` +
        `Sex: ${safeSex}   (M/F)\n` +
        `Chief complaint (patient's own words, may be vague or in colloquial Chinese):\n` +
        `"""${complaint}"""\n\n` +
        `Please respond in the following format, in Chinese with short English hints:\n\n` +
        `1) Symptom category（症狀分類）\n` +
        `- 主分類: ______\n` +
        `- 可能相關系統: ______\n\n` +
        `2) Urgency level（急重症風險）\n` +
        `- 分級: 綠色 / 黃色 / 紅色\n` +
        `- 一句話理由: ______\n\n` +
        `3) 建議先問的重點病史問題（一般問診）\n` +
        `請用條列，直接給我可以照念的問句（中文 + 括號內英文提示），大約 6–10 題：\n` +
        `- 例：什麼時候開始這個不舒服的？(When did it start?)\n\n` +
        `4) Red flag 問診（一定要問）\n` +
        `請列出 4–8 題，專門用來排除危險診斷：\n\n` +
        `5) 建議的身體檢查（Physical exam focus）\n` +
        `條列簡短項目，供醫師快速掃描：\n` +
        `- General / vital signs:\n` +
        `- 心肺：\n` +
        `- 腹部 / 神經 / 其他：（視情況）\n\n` +
        `6) 可能的鑑別診斷（Differential diagnosis）\n` +
        `請列 3–6 個，以「最常見或最重要不要漏掉」為主，每個後面加 1 行簡短理由：\n` +
        `- ______ ：理由：______\n\n` +
        `注意：\n` +
        `- 不要幫我寫完整病歷，只要「問診問題建議 + 重點 PE + 鑑別診斷」即可。\n` +
        `- 假設醫師只有 3–5 分鐘可以問問題，請挑「最有用、最有資訊量」的問題。\n` +
        `- 重點是讓醫師在遇到罕見或怪怪的主訴時，不會腦袋一片空白。\n`;

   // ====== 模式二：SOAP 類（Plan / Next step） ======
} else {
  if (!soap || typeof soap !== "string") {
    res.status(400).json({ error: "Missing 'soap' field in body" });
    return;
  }

  // ✅ Next step 用：IM consultant prompt
  if (mode === "im_consult") {
    prompt =
      "You are an internal medicine consultant.\n" +
      "Here is a clinic SOAP note:\n\n" +
      soap +
      "\n\nPlease:\n" +
      "1) Rewrite the \"PI\" (present illness) section into fluent, concise English, as if written by a native internal-medicine physician for a clinic note.\n" +
      "2) List likely diagnoses with brief reasoning.\n" +
      "3) Suggest key physical exams and tests.\n" +
      "4) Provide an initial management plan.\n" +
      "Answer in concise English bullet points.";
  } else {
    // ✅ Plan（預設）：沿用你原本 guideline-heavy prompt（完整保留）
    prompt =
      "You are a family medicine clinical decision support system practicing in Taiwan.\n\n" +

      "You are assisting a physician in an outpatient clinic with limited time.\n" +
      "Your goal is to provide SAFE, GUIDELINE-BASED, and PRACTICAL recommendations.\n\n" +

      "IMPORTANT RULES (must follow):\n" +
      "- Base your recommendations on established international clinical guidelines (e.g., ACC/AHA, ESC/EAS, ADA, KDIGO, CANMAT, VA/DoD, NICE).\n" +
      "- If a recommendation is guideline-based, you MUST explicitly cite the guideline name and year.\n" +
      "- If Taiwan National Health Insurance (NHI) reimbursement rules are relevant, list them separately and clearly.\n" +
      "- Do NOT invent guidelines or citations.\n" +
      "- If evidence is uncertain or guideline recommendations differ, state this explicitly.\n" +
      "- Be concise and clinically realistic.\n\n" +

      "--------------------------------------------------\n\n" +

      "Here is a clinic SOAP note:\n\n" +
      soap +
      "\n\n" +

      "--------------------------------------------------\n\n" +

      "Please do the following:\n\n" +

      "1) Rewrite the \"PI\" (present illness) section into fluent, concise English,\n" +
      "   as if written by a native internal medicine physician for a clinic note.\n\n" +

      "2) Assessment:\n" +
      "   - Summarize the most likely working diagnosis or clinical problem in 1–2 lines.\n" +
      "   - Prioritize by clinical importance and risk.\n\n" +

      "3) Differential diagnoses (if applicable):\n" +
      "   - List 3–5 reasonable differentials.\n" +
      "   - Give one short justification for each.\n\n" +

      "4) Suggested evaluation:\n" +
      "   - Key physical examinations to focus on.\n" +
      "   - Key laboratory tests or imaging if indicated.\n" +
      "   - Keep this practical for an outpatient clinic.\n\n" +

      "5) Management plan:\n" +
      "   - Provide an initial, stepwise management plan.\n" +
      "   - Use bullet points.\n" +
      "   - Clearly distinguish between what should be done now and what to reassess later.\n\n" +

      "6) Evidence & guideline support (MANDATORY SECTION):\n" +
      "   - Cite relevant guideline(s) with full name and year.\n" +
      "   - Specify the section or table if known.\n" +
      "   - Quote ONE key sentence verbatim when appropriate.\n" +
      "   - If multiple guidelines apply, briefly explain their relationship.\n\n" +

      "7) Taiwan NHI reimbursement considerations (if applicable):\n" +
      "   - State whether the recommended treatment is NHI-covered.\n" +
      "   - List key reimbursement criteria or target thresholds if relevant.\n" +
      "   - Clearly distinguish medical recommendation from reimbursement limitation.\n\n" +

      "--------------------------------------------------\n\n" +

      "Formatting requirements:\n" +
      "- Use clear section headers.\n" +
      "- Keep the total output concise and readable.\n" +
      "- Prioritize clinical usefulness over completeness.\n" +
      "- Write in professional, neutral medical English.";
  }
}

    // 呼叫 OpenAI（/v1/responses）
    const apiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        max_output_tokens: 2000,
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
