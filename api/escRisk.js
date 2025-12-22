// api/escRisk.js
// =====================================================
// ESC/EAS (conceptual) cardiovascular risk stratification helper
// Goal: prevent LLM from mislabeling "HTN alone" as high risk.
// This is an ENGINEERING rule-engine based on common ESC risk-category patterns.
// You should refine thresholds/criteria to exactly match your evidence pack text.
//
// Output:
// - category: "very_high" | "high" | "moderate" | "low" | "unknown"
// - reasons: string[]
// - ldlTarget: { mgdl: number|null, percentReduction: number|null, evidenceId: string|null }
//
// NOTE: If you later add SCORE2/SCORE2-OP numbers, you can plug them in here.
// =====================================================

function isFiniteNum(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function toNum(x) {
  const n = typeof x === "string" ? Number(x.trim()) : Number(x);
  return Number.isFinite(n) ? n : null;
}

export function escEas2025RiskStratify(patient = {}) {
  // ---------------------------
  // Expected inputs (boolean/number):
  // patient.ascvd: established ASCVD (MI/ACS/PCI/CABG/stroke/TIA/PAD, etc.)
  // patient.diabetes: true/false
  // patient.dmTargetOrganDamage: true/false (albuminuria, retinopathy, neuropathy, etc.)
  // patient.dmMajorRiskFactorCount: number (major RF count in DM context)
  // patient.t1dmLongDuration: true/false (e.g., >20y; optional)
  // patient.ckdEgfr: number
  // patient.sbp: number (office SBP)
  // patient.ldl: number (mg/dL)
  // patient.fh: familial hypercholesterolemia (true/false) (optional)
  // patient.score2RiskCategory: "very_high"|"high"|"moderate"|"low" (optional)
  // ---------------------------

  const reasons = [];

  const ascvd = !!patient.ascvd;

  const diabetes = !!patient.diabetes;
  const dmTOD = !!patient.dmTargetOrganDamage;
  const dmRF = isFiniteNum(patient.dmMajorRiskFactorCount)
    ? patient.dmMajorRiskFactorCount
    : null;
  const t1dmLong = !!patient.t1dmLongDuration;

  const egfr = toNum(patient.ckdEgfr);
  const sbp = toNum(patient.sbp);
  const ldl = toNum(patient.ldl);

  const fh = !!patient.fh;

  // If caller already computed SCORE2 category, honor it (highest wins)
  const score2 = patient.score2RiskCategory || null;

  // Helper: classify CKD
  const severeCKD = isFiniteNum(egfr) && egfr < 30;
  const moderateCKD = isFiniteNum(egfr) && egfr >= 30 && egfr <= 59;

  // Helper: "markedly elevated single risk factor" (engineering thresholds)
  // Typical examples used in ESC tables: SBP >= 180 or LDL >= 190.
  // Adjust to your evidence pack if needed.
  const markedlyHighSBP = isFiniteNum(sbp) && sbp >= 180;
  const markedlyHighLDL = isFiniteNum(ldl) && ldl >= 190;

  // =====================================================
  // 1) VERY-HIGH RISK (highest priority)
  // =====================================================
  if (ascvd) {
    reasons.push("Established ASCVD → very-high risk.");
    return {
      category: "very_high",
      reasons,
      ldlTarget: { mgdl: 55, percentReduction: 50, evidenceId: "ESC2025_LDL_VERY_HIGH_RISK" },
    };
  }

  if (severeCKD) {
    reasons.push("Severe CKD (eGFR <30) → very-high risk.");
    return {
      category: "very_high",
      reasons,
      ldlTarget: { mgdl: 55, percentReduction: 50, evidenceId: "ESC2025_LDL_CKD_SEVERE" },
    };
  }

  // Diabetes very-high patterns
  if (diabetes && (dmTOD || (dmRF !== null && dmRF >= 3) || t1dmLong)) {
    reasons.push("Diabetes with target organ damage or ≥3 major RF or long-duration T1DM → very-high risk.");
    return {
      category: "very_high",
      reasons,
      ldlTarget: { mgdl: 55, percentReduction: 50, evidenceId: "ESC2025_LDL_DM_VERY_HIGH" },
    };
  }

  // SCORE2 override (if provided)
  if (score2 === "very_high") {
    reasons.push("Caller-provided SCORE2 category = very_high.");
    return {
      category: "very_high",
      reasons,
      ldlTarget: { mgdl: 55, percentReduction: 50, evidenceId: "ESC2025_LDL_VERY_HIGH_RISK" },
    };
  }

  // =====================================================
  // 2) HIGH RISK
  // =====================================================
  if (moderateCKD) {
    reasons.push("Moderate CKD (eGFR 30–59) → high risk.");
    return {
      category: "high",
      reasons,
      ldlTarget: { mgdl: 70, percentReduction: 50, evidenceId: "ESC2025_LDL_CKD_MODERATE" },
    };
  }

  if (markedlyHighSBP || markedlyHighLDL) {
    if (markedlyHighSBP) reasons.push("Markedly elevated SBP (≥180 mmHg) → high risk.");
    if (markedlyHighLDL) reasons.push("Markedly elevated LDL-C (≥190 mg/dL) → high risk.");
    return {
      category: "high",
      reasons,
      ldlTarget: { mgdl: 70, percentReduction: 50, evidenceId: "ESC2025_LDL_HIGH_RISK" },
    };
  }

  // Diabetes high-risk (engineering default): DM without TOD but higher risk context
  // In your lipidEvidence.js you have ESC2025_LDL_DM_HIGH with note "inferred"
  if (diabetes) {
    reasons.push("Diabetes without very-high features → high risk (engineering default; refine per your evidence pack).");
    return {
      category: "high",
      reasons,
      ldlTarget: { mgdl: 70, percentReduction: 50, evidenceId: "ESC2025_LDL_DM_HIGH" },
    };
  }

  if (score2 === "high") {
    reasons.push("Caller-provided SCORE2 category = high.");
    return {
      category: "high",
      reasons,
      ldlTarget: { mgdl: 70, percentReduction: 50, evidenceId: "ESC2025_LDL_HIGH_RISK" },
    };
  }

  // =====================================================
  // 3) MODERATE / LOW (we avoid hard LDL targets unless your pack defines them)
  // =====================================================
  // IMPORTANT: HTN alone (esp. young) is NOT automatically high risk.
  // So we intentionally do NOT set mgdl target here unless you add explicit ESC targets.
  const hasSomeRF =
    (!!patient.hypertension) ||
    (!!patient.smoking) ||
    (!!patient.familyHistoryPrematureASCVD) ||
    (!!patient.obesity) ||
    (!!patient.metabolicSyndrome);
// === ESC 2025: Lp(a) is a risk-enhancing factor ONLY ===
  // Guard: Lp(a) missing or not measured must NOT influence risk category
if (patient.lpa === null || patient.lpa === undefined) {
  // explicitly do nothing
}
// Do NOT allow Lp(a) to reclassify risk category
// (Handled in treatment decision, not risk stratification)

  if (hasSomeRF || fh) {
    if (fh) reasons.push("Possible familial hypercholesterolemia noted (needs confirmation).");
    reasons.push("No very-high/high ESC features detected → treat as moderate risk by default; consider lifetime risk & shared decision.");
    return {
      category: "moderate",
      reasons,
      ldlTarget: { mgdl: null, percentReduction: null, evidenceId: null },
    };
  }

  reasons.push("No major ESC very-high/high features detected → low risk by default.");
  return {
    category: "low",
    reasons,
    ldlTarget: { mgdl: null, percentReduction: null, evidenceId: null },
  };
}
