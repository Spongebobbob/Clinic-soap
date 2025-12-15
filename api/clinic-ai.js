// api/clinic-ai.js
// =====================================================
// Clinic SOAP AI endpoint (Vercel / Next.js API route)
// Modes:
// - triage: 問診建議（怪怪主訴）
// - im_consult: 內科顧問（英文精簡 + DDx + eval + plan）
// - plan (default): guideline-heavy CDS + Taiwan NHI considerations
//
// IMPORTANT:
// - For lipid-related decisions, this endpoint injects an evidence pack
//   from ./lipidEvidence.js so the model bases reasoning on YOUR guideline file.
// =====================================================

import { lipidEvidence, nhiRiskFactors } from "./lipidEvidence.js";

// -------------------------
// Utilities
// -------------------------
function safeStr(x, fallback = "") {
  return typeof x === "string" ? x : fallback;
}

function clampNum(x, min, max, fallback = null) {
  const n = Number(x);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function compact(obj) {
  // Remove undefined/null keys for cleaner prompts
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// -------------------------
// Evidence Pack Builder
// -------------------------
function buildLipidEvidenceContext() {
  // Keep this reasonably compact; you can expand later if needed.
  // The model must treat this as authoritative, source-limited evidence.
  const targets = (lipidEvidence?.ldlTargets || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    target: e.target,
    source: `${e.guideline} ${e.year}`,
    section: e.section,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const logic = (lipidEvidence?.treatmentLogic || []).map((e) => ({
    id: e.id,
    source: `${e.guideline} ${e.year}`,
    rule: e.rule,
    section: e.section ?? null,
    quote: e.quote ?? null,
    cor_loe: e.cor_loe ?? null,
    note: e.note ?? null,
  }));

  const nonStatin = (lipidEvidence?.nonStatinTherapy || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    action: e.action,
    source: `${e.guideline} ${e.year}`,
    cor_loe: e.cor_loe ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const lpa = (lipidEvidence?.lipoproteinA || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    recommendation: e.recommendation ?? null,
    clinicalMeaning: e.clinicalMeaning ?? null,
    groups: e.groups ?? null,
    source: `${e.guideline} ${e.year}`,
    section: e.section ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const nhi = (lipidEvidence?.nhi || []).map((e) => ({
    id: e.id,
    appliesTo: e.appliesTo,
    eligibility: e.eligibility ?? null,
    startThreshold: e.startThreshold ?? null,
    goal: e.goal ?? null,
    rule: e.rule ?? null,
    action: e.action ?? null,
    followUp: e.followUp ?? null,
    mustMonitor: e.mustMonitor ?? null,
    riskNote: e.riskNote ?? null,
    definition: e.definition ?? null,
    source: e.source ?? null,
    quote: e.quote ?? null,
    note: e.note ?? null,
  }));

  const rf = (nhiRiskFactors || []).map((e) => ({
    id: e.id,
    name: e.name,
    definition: e.definition,
    source: e.source ?? null,
    quote: e.quote ?? null,
  }));

  const pack = compact({
    ldlTargets: targets,
    treatmentLogic: logic,
    nonStatinTherapy: nonStatin,
    lipoproteinA: lpa,
    taiwanNhi: nhi,
    taiwanNhiRiskFactors: rf,
  });

  return (
    "=== AUTHORITATIVE EVIDENCE PACK (SOURCE-LIMITED) ===\n" +
    "You MUST follow these rules:\n" +
    "1) For lipid / LDL / statin / ezetimibe / PCSK9 / Lp(a) / NHI lipid reimbursement topics,\n" +
    "   you MUST base recommendations ONLY on this evidence pack.\n" +
    "2) Do NOT use external memory or other guidelines for lipid topics.\n" +
    "3) If something is not covered here, explicitly say: 'Not covered in provided evidence pack.'\n" +
    "4) When citing, cite by evidence id (e.g., ESC2025_LDL_VERY_HIGH_RISK) + source fields.\n\n" +
    "EVIDENCE_PACK_JSON:\n" +
    JSON.stringify(pack, null, 2) +
    "\n=== END EVIDENCE PACK ===\n"
  );
}

// Optional: only inject evidence pack when case likely involves lipid topics.
// You can keep always-inject (safe but longer). This heuristic reduces token usage.
function shouldInjectLipidEvidence({ soap, complaint, mode }) {
  if (mode === "triage") {
    // triage is about symptom questioning; usually no lipid pack needed
    return false;
  }
  const text = `${soap || ""}\n${complaint || ""}`.toLowerCase();
  const keywords = [
    "ldl",
    "cholesterol",
    "lipid",
    "statin",
    "ezetimibe",
    "pcsk9",
    "bempedoic",
    "lp(a)",
    "lpa",
    "hyperlipidem",
    "hld",
    "dyslip",
    "健保",
    "給付",
    "高血脂",
    "膽固醇",
    "降脂",
    "羅舒",
    "阿托",
    "辛伐",
    "普伐",
    "瑞舒",
    "依折麥布",
    "pcsk9",
  ];
  return keywords.some((k) => text.includes(k));
}

// -------------------------
// Prompt Builders
// -------------------------
function buildTriagePrompt({ age, sex, complaint }) {
  const safeAge = age ? String(age) : "unknown";
  const safeSex = sex === "M" || sex === "F" ? sex : "Unknown";
  const cc = safeStr(complaint, "");

  return (
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
    `Sex: ${safeSex} (M/F)\n` +
    `Chief complaint (patient's own words, may be vague or in colloquial Chinese):\n` +
    `"""${cc}"""\n\n` +
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
    `- 重點是讓醫師在遇到罕見或怪怪的主訴時，不會腦袋一片空白。\n`
  );
}

function buildImConsultPrompt({ soap }) {
  return (
    "You are an internal medicine consultant.\n" +
    "Here is a clinic SOAP note:\n\n" +
    soap +
    "\n\nPlease:\n" +
    "1) Rewrite the \"PI\" (present illness) section into fluent, concise English, as if written by a native internal-medicine physician for a clinic note.\n" +
    "2) List likely diagnoses with brief reasoning.\n" +
    "3) Suggest key physical exams and tests.\n" +
    "4) Provide an initial management plan.\n" +
    "Answer in concise English bullet points."
  );
}

function buildPlanPrompt({ soap, injectEvidence }) {
  const evidenceBlock = injectEvidence
    ? "\n\n" + buildLipidEvidenceContext() + "\n\n"
    : "";

  return (
    "You are a family medicine clinical decision support system practicing in Taiwan.\n\n" +
    "You are assisting a physician in an outpatient clinic with limited time.\n" +
    "Your goal is to provide SAFE, GUIDELINE-BASED, and PRACTICAL recommendations.\n\n" +

    "IMPORTANT RULES (must follow):\n" +
    "- If you are provided an evidence pack, you MUST use it as the primary source.\n" +
    "- If a recommendation is guideline-based, you MUST explicitly cite the guideline name and year.\n" +
    "- If Taiwan National Health Insurance (NHI) reimbursement rules are relevant, list them separately and clearly.\n" +
    "- Do NOT invent guidelines or citations.\n" +
    "- If evidence is uncertain or guideline recommendations differ, state this explicitly.\n" +
    "- Be concise and clinically realistic.\n\n" +

    evidenceBlock +

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
    "   - If an evidence pack is provided, cite by evidence id + source.\n\n" +

    "7) Taiwan NHI reimbursement considerations (if applicable):\n" +
    "   - State whether the recommended treatment is NHI-covered.\n" +
    "   - List key reimbursement criteria or target thresholds if relevant.\n" +
    "   - Clearly distinguish medical recommendation from reimbursement limitation.\n\n" +

    "--------------------------------------------------\n\n" +
    "Formatting requirements:\n" +
    "- Use clear section headers.\n" +
    "- Keep the total output concise and readable.\n" +
    "- Prioritize clinical usefulness over completeness.\n" +
    "- Write in professional, neutral medical English."
  );
}

// -------------------------
// Main Handler
// -------------------------
export default async function handler(req, res) {
  // --- CORS for github.io / static frontends ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const mode = safeStr(body.mode, "plan"); // triage / im_consult / plan(default)

    const soap = safeStr(body.soap, "");
    const complaint = safeStr(body.complaint, "");
    const age = clampNum(body.age, 0, 120, null);
    const sex = body.sex === "M" || body.sex === "F" ? body.sex : "Unknown";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server missing OPENAI_API_KEY env" });
      return;
    }

    // Model & output tokens (allow override from client, but safe defaults)
    const model = safeStr(body.model, "gpt-4.1-mini");
    const maxOut = clampNum(body.max_output_tokens, 200, 3000, 2000);

    let prompt = "";

    if (mode === "triage") {
      if (!complaint) {
        res.status(400).json({ error: "Missing 'complaint' field for triage mode" });
        return;
      }
      prompt = buildTriagePrompt({ age, sex, complaint });
    } else if (mode === "im_consult") {
      if (!soap) {
        res.status(400).json({ error: "Missing 'soap' field in body" });
        return;
      }
      prompt = buildImConsultPrompt({ soap });
    } else {
      // plan (default)
      if (!soap) {
        res.status(400).json({ error: "Missing 'soap' field in body" });
        return;
      }
      const injectEvidence = shouldInjectLipidEvidence({ soap, complaint, mode });
      prompt = buildPlanPrompt({ soap, injectEvidence });
    }

    // Call OpenAI Responses API
    const apiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: maxOut,
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text();
      res.status(502).json({
        error: "OpenAI API error",
        detail: errText.slice(0, 1200),
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
