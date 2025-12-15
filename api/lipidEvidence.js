// lipidEvidence.js
// ==================================================
// SOURCE-LIMITED EVIDENCE PACK + NHI DECISION HELPERS
// ==================================================
// Contents include:
// - ESC/EAS Dyslipidaemia Guideline – Focused Update 2025 (as summarized/quoted in user's doc)
// - ACC/AHA 2018 Cholesterol Guideline (as summarized/quoted in user's doc)
// - Taiwan NHI lipid drug reimbursement regulation (2.6.1) + operational primary-prevention thresholds
//
// IMPORTANT:
// - Where exact table wording is not present in the uploaded excerpt, quote is set to null
//   and "note" explains it's an operational definition for engineering use.
// ==================================================

export const lipidEvidence = {
  // ==================================================
  // 1) LDL-C TREATMENT TARGETS (ESC/EAS 2025)
  // ==================================================
  ldlTargets: [
    {
      id: "ESC2025_LDL_VERY_HIGH_RISK",
      appliesTo: "Very-high-risk ASCVD",
      target: "LDL-C <55 mg/dL (<1.4 mmol/L) AND ≥50% reduction from baseline",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Figure 1; Table 3 (Cardiovascular risk categories)",
      quote:
        "Very-high-risk patients: LDL-C <1.4 mmol/L (<55 mg/dL) and a ≥50% reduction from baseline is recommended.",
    },
    {
      id: "ESC2025_LDL_HIGH_RISK",
      appliesTo: "High-risk",
      target: "LDL-C <70 mg/dL (<1.8 mmol/L) AND ≥50% reduction from baseline",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Figure 1; Table 3",
      quote:
        "High-risk patients: LDL-C <1.8 mmol/L (<70 mg/dL) and a ≥50% reduction from baseline is recommended.",
    },
    {
      id: "ESC2025_LDL_DM_VERY_HIGH",
      appliesTo: "Diabetes with target-organ damage OR very-high CV risk",
      target: "LDL-C <55 mg/dL",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Table 3 (Risk categorization)",
      quote:
        "DM with target organ damage, ≥3 major risk factors, or early onset of T1DM of long duration (>20 years) are classified as very-high risk.",
    },
    {
      id: "ESC2025_LDL_DM_HIGH",
      appliesTo: "Diabetes without target-organ damage but high risk",
      target: "LDL-C <70 mg/dL",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Figure 1; Table 3",
      quote: null,
      note:
        "Target inferred from ESC high-risk LDL target; diabetes-specific target sentence not present verbatim in uploaded excerpt.",
    },
    {
      id: "ESC2025_LDL_CKD_SEVERE",
      appliesTo: "Severe CKD (eGFR <30 mL/min/1.73 m²)",
      target: "LDL-C <55 mg/dL",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Table 3",
      quote:
        "Severe CKD (eGFR <30 mL/min/1.73 m²) is classified as very-high cardiovascular risk.",
    },
    {
      id: "ESC2025_LDL_CKD_MODERATE",
      appliesTo: "Moderate CKD (eGFR 30–59 mL/min/1.73 m²)",
      target: "LDL-C <70 mg/dL",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      section: "Table 3",
      quote: null,
      note:
        "Moderate CKD categorized as high risk; LDL target inferred from high-risk category in uploaded summary.",
    },
  ],

  // ==================================================
  // 2) ESC vs ACC TREATMENT DECISION ENGINE (EXPANDED)
  // ==================================================
  treatmentLogic: [
    {
      id: "ESC2025_TARGET_STRATEGY",
      guideline: "ESC/EAS Dyslipidaemia Guideline – Focused Update",
      year: 2025,
      rule:
        "ESC/EAS uses explicit LDL-C treatment targets according to total cardiovascular risk.",
      quote:
        "Treatment goals for LDL-C are defined according to cardiovascular risk categories.",
      section: "Figure 1 (as summarized/quoted in uploaded doc)",
    },
    {
      id: "ACC2018_THRESHOLD_STRATEGY",
      guideline: "ACC/AHA Cholesterol Guideline",
      year: 2018,
      rule:
        "ACC/AHA does NOT define fixed LDL-C targets; it uses LDL-C threshold (70 mg/dL) to consider adding non-statin therapy in very-high-risk ASCVD.",
      quote:
        "In very high-risk ASCVD, use an LDL-C threshold of 70 mg/dL to consider addition of nonstatins.",
      section: "Section 4.4",
    },
    {
      id: "ESC2025_EZETIMIBE_POSITION",
      guideline: "ESC/EAS 2025",
      year: 2025,
      rule:
        "When LDL target not achieved on maximally tolerated statin, add ezetimibe before considering PCSK9 inhibitor.",
      quote:
        "The strategy of ezetimibe before PCSK9 inhibitor is recommended.",
      section: "Recommendation Table (as quoted in uploaded doc)",
    },
    {
      id: "ACC2018_PCSK9_POSITION",
      guideline: "ACC/AHA 2018",
      year: 2018,
      rule:
        "In very-high-risk ASCVD, if LDL-C remains ≥70 mg/dL on maximally tolerated LDL-lowering therapy, PCSK9 inhibitor is reasonable.",
      quote:
        "On maximally tolerated LDL-C lowering therapy with LDL-C 70 mg/dL or higher, it is reasonable to add a PCSK9 inhibitor.",
      section: "Section 4.4",
      cor_loe: "IIa B-R",
    },
    {
      id: "ESC2025_HIGH_INTENSITY_DEFINITION",
      guideline: "ESC/EAS 2025",
      year: 2025,
      rule: "Effect-based: high-intensity statin = ≥50% LDL-C reduction.",
      quote: null,
      note:
        "Operational: ESC focuses on achieved LDL reduction/targets; exact dose table not included in uploaded excerpt.",
    },
    {
      id: "ACC2018_HIGH_INTENSITY_DEFINITION",
      guideline: "ACC/AHA 2018",
      year: 2018,
      rule: "Dose-based: high-intensity statin defined by specific statin doses.",
      quote: null,
      note:
        "Operational: ACC/AHA uses dose-intensity tables; not reproduced verbatim in uploaded excerpt.",
    },
  ],

  // ==================================================
  // 3) NON-STATIN THERAPY (ADD-ON)
  // ==================================================
  nonStatinTherapy: [
    {
      id: "ESC2025_EZETIMIBE_FIRST_ADDON",
      appliesTo: "Not at LDL target on maximally tolerated statin",
      action: "Add ezetimibe before PCSK9 inhibitor",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "The strategy of ezetimibe before PCSK9 inhibitor is recommended.",
    },
    {
      id: "ACC2018_PCSK9_VERY_HIGH",
      appliesTo:
        "Very-high-risk ASCVD with LDL-C ≥70 mg/dL despite maximally tolerated LDL-C lowering therapy",
      action: "Reasonable to add PCSK9 inhibitor",
      guideline: "ACC/AHA 2018",
      year: 2018,
      cor_loe: "IIa B-R",
      quote:
        "On maximally tolerated LDL-C lowering therapy with LDL-C 70 mg/dL or higher, it is reasonable to add a PCSK9 inhibitor.",
    },
    {
      id: "BEMPEDOIC_ACC2018_NOT_LISTED",
      appliesTo: "Bempedoic acid",
      action: "Not covered as a recommendation item in ACC/AHA 2018 (per uploaded note).",
      guideline: "ACC/AHA 2018",
      year: 2018,
      quote: null,
      note:
        "User's uploaded summary indicated no ACC/AHA 2018 COR/LOE item to cite for bempedoic acid.",
    },
  ],

  // ==================================================
  // 4) STATIN INTOLERANCE / SAMS
  // ==================================================
  statinIntolerance: [
    {
      id: "ACC2018_SAMS_MODERATE_INTENSITY",
      appliesTo: "ASCVD patients who cannot tolerate high-intensity statin",
      action:
        "Use moderate-intensity statin (expected 30–49% LDL-C reduction)",
      guideline: "ACC/AHA 2018",
      year: 2018,
      cor_loe: "I B-NR",
      section: "Section 4.2",
      quote:
        "In patients in whom high-intensity statin therapy is contraindicated or who experience statin-associated side effects, moderate-intensity statin therapy should be initiated or continued.",
    },
  ],

  // ==================================================
  // 5) Lp(a) – MEASUREMENT & CLINICAL SIGNIFICANCE (FULL)
  // ==================================================
  lipoproteinA: [
    {
      id: "ESC2025_LPA_MEASURE_ONCE",
      appliesTo: "All adults",
      recommendation: "Measure Lp(a) at least once in a lifetime",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Lp(a) measurement should be considered at least once in every adult’s lifetime.",
    },
    {
      id: "ESC2025_LPA_PRIORITY_GROUPS",
      appliesTo: "High-yield screening groups",
      groups: [
        "Familial hypercholesterolemia",
        "Premature ASCVD without other risk factors",
        "Family history of premature ASCVD or high Lp(a)",
        "Moderate-risk or around treatment decision thresholds",
      ],
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Screening is particularly relevant in younger patients with FH or premature ASCVD… or in individuals at moderate risk or around treatment decision thresholds.",
    },
    {
      id: "ESC2025_LPA_POSTMENOPAUSE",
      appliesTo: "Postmenopausal women",
      recommendation: "Second measurement may be reasonable",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Lp(a) levels may increase after menopause and a second measurement is reasonable.",
    },
    {
      id: "ESC2025_LPA_CAUSALITY_ASCVD_AVS",
      appliesTo: "ASCVD / Aortic valve stenosis risk",
      clinicalMeaning:
        "Likely causal association with ASCVD and aortic valve stenosis",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Epidemiologic and genetic studies… support a likely causal association… with higher risk of ASCVD and aortic valve stenosis.",
    },
    {
      id: "ESC2025_LPA_RISK_THRESHOLD",
      appliesTo: "Lp(a) >50 mg/dL (≥105 nmol/L)",
      clinicalMeaning: "Clinically relevant CV risk threshold",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Lp(a) becomes clinically relevant above 50 mg/dL (105 nmol/L).",
    },
    {
      id: "ESC2025_LPA_RISK_ENHANCER",
      appliesTo: "Lp(a) >50 mg/dL",
      clinicalMeaning: "Considered a CV risk-enhancing factor",
      guideline: "ESC/EAS 2025",
      year: 2025,
      section: "Recommendation Table 4 (as quoted in uploaded doc)",
      quote:
        "Lp(a) levels above 50 mg/dL should be considered a cardiovascular risk-enhancing factor.",
    },
    {
      id: "ESC2025_LPA_INTENSIVE_LDL",
      appliesTo: "Elevated Lp(a) / residual high risk",
      recommendation:
        "Early risk factor management and more intensive LDL-C lowering is reasonable",
      guideline: "ESC/EAS 2025",
      year: 2025,
      quote:
        "Early risk factor management and more intensive LDL-C lowering is reasonable.",
    },
  ],

  // ==================================================
  // 6) TAIWAN NHI – REIMBURSEMENT (SECONDARY + PRIMARY OPERATIONAL)
  // ==================================================
  nhi: [
    // -----------------------------
    // Secondary prevention (2.6.1)
    // -----------------------------
    {
      id: "NHI_2_6_1_SEC_PREV_ELIGIBILITY",
      appliesTo: "Secondary prevention (適用對象/定義)",
      eligibility: [
        "History of ACS",
        "Coronary atherosclerosis with prior PCI or CABG",
      ],
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
      note:
        "Eligibility definition is based on user's uploaded NHI table summary excerpt.",
    },
    {
      id: "NHI_2_6_1_SEC_PREV_LDL_THRESHOLD_AND_GOAL",
      appliesTo: "Secondary prevention",
      startThreshold: "LDL-C ≥ 70 mg/dL",
      goal: "LDL-C < 70 mg/dL",
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
      note:
        "Threshold/goal based on user's uploaded NHI table summary excerpt.",
    },
    {
      id: "NHI_2_6_1_SEC_PREV_NONPHARM_PARALLEL_ALLOWED",
      appliesTo: "Secondary prevention",
      rule:
        "Non-pharmacologic therapy can be performed in parallel with pharmacologic therapy (no need to complete 3–6 months lifestyle trial first).",
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
      note:
        "Operational: exemption from mandatory pre-trial lifestyle-only period per uploaded excerpt.",
    },
    {
      id: "NHI_2_6_1_CVD_DEFINITION",
      appliesTo: "心血管疾病定義（條文附註）",
      definition: {
        coronaryAtherosclerosisIncludes: [
          "Angina",
          "Catheterization-proven lesion",
          "Ischemic ECG changes",
          "Positive stress test (report required)",
        ],
        ischemicCerebrovascularDiseaseIncludes: [
          "Cerebral infarction",
          "TIA (requires neurologist confirmation)",
          "Symptomatic carotid stenosis (requires neurologist confirmation)",
        ],
      },
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
      note: "Definitions included in user's uploaded excerpt/summary.",
    },
    {
      id: "NHI_2_6_1_FOLLOWUP_FREQUENCY",
      appliesTo: "追蹤與續用規定：抽血追蹤頻率（處方規定）",
      followUp: [
        { period: "Year 1", frequency: "Every 3–6 months" },
        { period: "From Year 2 onward", frequency: "At least every 6–12 months" },
      ],
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
    },
    {
      id: "NHI_2_6_1_SAFETY_MONITORING",
      appliesTo: "續用時需注意事項（處方規定）",
      mustMonitor: ["Liver function abnormality", "Rhabdomyolysis"],
      riskNote:
        "Missing follow-up/safety documentation may be used as reimbursement denial rationale.",
      source: "全民健康保險降膽固醇藥物給付規定表 (2.6.1)",
      quote: null,
    },

    // -----------------------------------------
    // Primary prevention (OPERATIONAL THRESHOLDS)
    // -----------------------------------------
    {
      id: "NHI_PRIMARY_PREV_ONE_RISK_FACTOR",
      appliesTo: "Primary prevention with ≥1 cardiovascular risk factor",
      ldlThreshold: "LDL-C ≥160 mg/dL",
      action: "Eligible for lipid-lowering drug reimbursement (operational rule)",
      source: "全民健康保險降膽固醇藥物給付規定表",
      quote: null,
      note:
        "Operational NHI threshold (not verbatim in uploaded excerpt). Use for decision support; confirm against official table if needed.",
    },
    {
      id: "NHI_PRIMARY_PREV_TWO_RISK_FACTORS",
      appliesTo: "Primary prevention with ≥2 cardiovascular risk factors",
      ldlThreshold: "LDL-C ≥130 mg/dL",
      action: "Eligible for lipid-lowering drug reimbursement (operational rule)",
      source: "全民健康保險降膽固醇藥物給付規定表",
      quote: null,
      note:
        "Operational NHI threshold (not verbatim in uploaded excerpt). Use for decision support; confirm against official table if needed.",
    },
    // --- Taiwan NHI reimbursement: LDL/TC (from the official table you provided) ---
{
  id: "NHI_LDL_SEC_PREV_ACS_OR_CAD_1080201",
  appliesTo: "Secondary prevention: ACS history, PCI/CABG, or coronary atherosclerotic disease",
  nonPharm: "Nonpharm and drug therapy can be concurrent",
  startThreshold: { ldl_mgdl_gte: 70 },
  goal: { ldl_mgdl_lt: 70 },
  followUp: "Year 1: lipid check q3–6 months; Year ≥2: at least q6–12 months; monitor adverse effects (e.g., liver function abnormality, rhabdomyolysis).",
  source: "Taiwan NHI lipid-lowering reimbursement table (108/2/1)",
  quote: null,
},

{
  id: "NHI_LDL_CVD_OR_DM",
  appliesTo: "Patients with cardiovascular disease or diabetes",
  nonPharm: "Nonpharm and drug therapy can be concurrent",
  startThreshold: { tc_mgdl_gte: 160, or_ldl_mgdl_gte: 100 },
  goal: { tc_mgdl_lt: 160, or_ldl_mgdl_lt: 100 },
  source: "Taiwan NHI lipid-lowering reimbursement table",
  quote: null,
},

{
  id: "NHI_LDL_PRIMARY_PREV_RF_GTE2",
  appliesTo: "Primary prevention with ≥2 risk factors",
  nonPharm: "3–6 months lifestyle/nonpharmacologic therapy before starting medication",
  startThreshold: { tc_mgdl_gte: 200, or_ldl_mgdl_gte: 130 },
  goal: { tc_mgdl_lt: 200, or_ldl_mgdl_lt: 130 },
  source: "Taiwan NHI lipid-lowering reimbursement table",
  quote: null,
},

{
  id: "NHI_LDL_PRIMARY_PREV_RF_EQ1",
  appliesTo: "Primary prevention with 1 risk factor",
  nonPharm: "3–6 months lifestyle/nonpharmacologic therapy before starting medication",
  startThreshold: { tc_mgdl_gte: 240, or_ldl_mgdl_gte: 160 },
  goal: { tc_mgdl_lt: 240, or_ldl_mgdl_lt: 160 },
  source: "Taiwan NHI lipid-lowering reimbursement table",
  quote: null,
},

{
  id: "NHI_LDL_PRIMARY_PREV_RF_EQ0",
  appliesTo: "Primary prevention with 0 risk factors",
  nonPharm: "3–6 months lifestyle/nonpharmacologic therapy before starting medication",
  startThreshold: { ldl_mgdl_gte: 190 },
  goal: { ldl_mgdl_lt: 190 },
  source: "Taiwan NHI lipid-lowering reimbursement table",
  quote: null,
},

// --- Taiwan NHI reimbursement: Triglyceride-lowering (from the TG table you provided) ---
{
  id: "NHI_TG_CVD_OR_DM",
  appliesTo: "Patients with cardiovascular disease or diabetes",
  nonPharm: "Nonpharm and drug therapy can be concurrent",
  startThreshold: {
    tg_mgdl_gte: 200,
    and_either: ["tc_hdl_ratio_gt_5", "hdl_mgdl_lt_40"],
  },
  goal: { tg_mgdl_lt: 200 },
  followUp: "Year 1: q3–6 months; Year ≥2: at least q6–12 months; monitor adverse effects (e.g., liver function abnormality, rhabdomyolysis).",
  source: "Taiwan NHI triglyceride-lowering reimbursement table",
  quote: null,
},

{
  id: "NHI_TG_NO_CVD_TG_GTE200_WITH_DYSRATIO_OR_LOWHDL",
  appliesTo: "No cardiovascular disease",
  nonPharm: "3–6 months lifestyle/nonpharmacologic therapy before starting medication",
  startThreshold: {
    tg_mgdl_gte: 200,
    and_either: ["tc_hdl_ratio_gt_5", "hdl_mgdl_lt_40"],
  },
  goal: { tg_mgdl_lt: 200 },
  source: "Taiwan NHI triglyceride-lowering reimbursement table",
  quote: null,
},

{
  id: "NHI_TG_NO_CVD_TG_GTE500",
  appliesTo: "No cardiovascular disease",
  nonPharm: "Nonpharm and drug therapy can be concurrent",
  startThreshold: { tg_mgdl_gte: 500 },
  goal: { tg_mgdl_lt: 500 },
  source: "Taiwan NHI triglyceride-lowering reimbursement table",
  quote: null,
},

  ],
};

// ==================================================
// NHI – CARDIOVASCULAR RISK FACTORS (OPERATIONAL)
// ==================================================
// NOTE: These are engineering-operational definitions, unless you paste exact NHI table text.
// You can later replace quote:null with exact quotes once you paste official wording.

export const nhiRiskFactors = [
  {
    id: "NHI_RF_HTN",
    name: "Hypertension",
    definition: "高血壓",
    source: "Taiwan NHI lipid-lowering reimbursement table",
    quote: null,
  },
  {
    id: "NHI_RF_AGE",
    name: "Age threshold",
    definition: "男性 ≥45 歲；女性 ≥55 歲或停經者",
    source: "Taiwan NHI lipid-lowering reimbursement table",
    quote: null,
  },
  {
    id: "NHI_RF_FH_PREMATURE_CAD",
    name: "Family history of premature CAD",
    definition: "早發性冠心病家族史：男性 ≤55 歲；女性 ≤65 歲",
    source: "Taiwan NHI lipid-lowering reimbursement table",
    quote: null,
  },
  {
    id: "NHI_RF_LOW_HDL",
    name: "Low HDL-C",
    definition: "HDL-C < 40 mg/dL",
    source: "Taiwan NHI lipid-lowering reimbursement table",
    quote: null,
  },
];


// ==================================================
// ENGINE HELPERS (NO LLM REQUIRED)
// ==================================================

function _isFiniteNum(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function _parseLdlMgdl(ldl) {
  if (_isFiniteNum(ldl)) return ldl;
  if (typeof ldl !== "string") return null;
  const m = ldl.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function _normalizeText(s) {
  return (s || "")
    .toString()
    .replace(/\r/g, "\n")
    .replace(/[，、]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/\u00A0/g, " ")
    .toLowerCase();
}

function _hasAny(text, patterns) {
  return patterns.some((p) => {
    if (p instanceof RegExp) return p.test(text);
    return text.includes(String(p).toLowerCase());
  });
}

function _pickNumberAfterLabels(text, labels) {
  for (const lab of labels) {
    const re = new RegExp(`${lab}\\s*[:=]?\\s*(\\d{2,3}(?:\\.\\d+)?)`, "i");
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function _parseAgeSex(text) {
  let age = null;
  let sex = null;

  // "71f", "65 m", "65yo m"
  const m1 = text.match(/\b(\d{1,3})\s*(y\/o|yo|yr|yrs|year|years)?\s*(m|f)\b/i);
  if (m1) {
    age = Number(m1[1]);
    sex = m1[3].toUpperCase();
  }

  if (!sex) {
    if (/\bmale\b/.test(text) || /\bman\b/.test(text)) sex = "M";
    if (/\bfemale\b/.test(text) || /\bwoman\b/.test(text)) sex = "F";
  }

  if (!age) {
    const m2 = text.match(/\bage\s*[:=]?\s*(\d{1,3})\b/i);
    if (m2) age = Number(m2[1]);
  }

  return { age: _isFiniteNum(age) ? age : null, sex };
}

// ----------------------------------------------------
// 1) Count NHI risk factors
// ----------------------------------------------------
export function countNhiRiskFactors(patient) {
  const matched = [];

  const sex = patient?.sex;
  const age = patient?.age;

  if (sex === "M" && _isFiniteNum(age) && age >= 45) {
    matched.push({ id: "NHI_RF_AGE_MALE", label: "Age male ≥45" });
  }
  if (sex === "F" && _isFiniteNum(age) && age >= 55) {
    matched.push({ id: "NHI_RF_AGE_FEMALE", label: "Age female ≥55" });
  }
  if (Boolean(patient?.hasHTN) || Boolean(patient?.onAntiHTNMeds)) {
    matched.push({ id: "NHI_RF_HYPERTENSION", label: "Hypertension" });
  }
  if (Boolean(patient?.hasDM)) {
    matched.push({ id: "NHI_RF_DIABETES", label: "Diabetes" });
  }
  if (Boolean(patient?.currentSmoker)) {
    matched.push({ id: "NHI_RF_SMOKING", label: "Current smoking" });
  }
  if (Boolean(patient?.fhPrematureASCVD)) {
    matched.push({ id: "NHI_RF_FAMILY_HISTORY", label: "FH premature ASCVD" });
  }

  return { count: matched.length, matched };
}

// ----------------------------------------------------
// 2) Extract minimal patient state from SOAP free text
// ----------------------------------------------------
export function extractPatientStateFromSoap(soap) {
  const t = _normalizeText(soap);
  const { age, sex } = _parseAgeSex(t);

  const LDL = _pickNumberAfterLabels(t, [
    "ldl-c",
    "ldl c",
    "ldl",
    "low-density lipoprotein",
    "low density lipoprotein",
    "低密度膽固醇",
    "低密度",
  ]);

  const hasACS = _hasAny(t, [
    /\bacs\b/,
    "acute coronary syndrome",
    "unstable angina",
    /\bstemi\b/,
    /\bnstemi\b/,
    "myocardial infarction",
    /\bami\b/,
    "acute mi",
    "急性冠心症",
    "心肌梗塞",
  ]);

  const hasPCI = _hasAny(t, [
    /\bpci\b/,
    "stent",
    "ptca",
    "percutaneous coronary intervention",
    "支架",
  ]);

  const hasCABG = _hasAny(t, [
    /\bcabg\b/,
    "coronary artery bypass",
    "bypass surgery",
    "繞道手術",
  ]);

  const hasHTN = _hasAny(t, [
    /\bhtn\b/,
    "hypertension",
    "high blood pressure",
    "高血壓",
  ]);

  const onAntiHTNMeds = _hasAny(t, [
    // common meds (best-effort list)
    "amlodipine",
    "norvasc",
    "losartan",
    "valsartan",
    "candesartan",
    "telmisartan",
    "olmesartan",
    "irbesartan",
    "enalapril",
    "lisinopril",
    "ramipril",
    "perindopril",
    "bisoprolol",
    "carvedilol",
    "metoprolol",
    "nebivolol",
    "hctz",
    "hydrochlorothiazide",
    "indapamide",
    "chlorthalidone",
    "spironolactone",
    "eplerenone",
    "降壓藥",
  ]);

  const hasDM = _hasAny(t, [
    /\bdm\b/,
    "diabetes",
    "type 2 diabetes",
    "type 1 diabetes",
    "糖尿病",
    // meds
    "metformin",
    "glucophage",
    "sitagliptin",
    "linagliptin",
    "empagliflozin",
    "dapagliflozin",
    "canagliflozin",
    "liraglutide",
    "semaglutide",
    "insulin",
    "lantus",
    "humalog",
  ]);

  const currentSmoker = _hasAny(t, [
    "smoker",
    "smoking",
    "current smoker",
    "cigarette",
    "pack-year",
    "抽菸",
    "吸菸",
  ]);

  const fhPrematureASCVD = _hasAny(t, [
    "family history of premature",
    "fh premature",
    "premature cad in family",
    "早發心血管家族史",
    "早發心臟病家族史",
    "家族史 早發",
  ]);

  return {
    age,
    sex, // "M"|"F"|null
    LDL, // number|null
    hasACS,
    hasPCI,
    hasCABG,
    hasHTN,
    onAntiHTNMeds,
    hasDM,
    currentSmoker,
    fhPrematureASCVD,
    _debug: { extractedFrom: "soap", ageSexFound: { age, sex } },
  };
}

// ----------------------------------------------------
// 3) Determine NHI reimbursement eligibility
// ----------------------------------------------------
export function getNhiEligibility(patient) {
  const ldl = _parseLdlMgdl(patient?.LDL);
  const rf = countNhiRiskFactors(patient);

  // Secondary prevention definition (uploaded summary): ACS or PCI/CABG for coronary atherosclerosis
  const isSecondary =
    Boolean(patient?.hasACS) || Boolean(patient?.hasPCI) || Boolean(patient?.hasCABG);

  const result = {
    category: isSecondary ? "secondary_prevention" : "primary_prevention",
    ldl_mgdl: ldl,
    riskFactorCount: rf.count,
    matchedRiskFactors: rf.matched,
    eligible: false,
    threshold_mgdl: null,
    goal_mgdl: null,
    rationale: [],
    reminders: [],
  };

  if (!_isFiniteNum(ldl)) {
    result.rationale.push("LDL value missing/invalid → cannot determine NHI eligibility.");
    return result;
  }

  if (isSecondary) {
    result.threshold_mgdl = 70;
    result.goal_mgdl = 70; // goal is <70
    if (ldl >= 70) {
      result.eligible = true;
      result.rationale.push("Secondary prevention (ACS/PCI/CABG) + LDL ≥70 → eligible per NHI 2.6.1 logic.");
    } else {
      result.eligible = false;
      result.rationale.push("Secondary prevention present but LDL <70 → does not meet NHI start threshold (2.6.1).");
    }
    result.reminders.push("Follow-up lipids: Year 1 every 3–6 months; Year ≥2 every 6–12 months.");
    result.reminders.push("Document safety monitoring: liver function abnormality and rhabdomyolysis.");
    result.reminders.push("Lifestyle modification may be done in parallel with drug therapy (no mandatory lifestyle-only trial first).");
    return result;
  }

  // Primary prevention operational thresholds:
  // - ≥2 RF: LDL ≥130
  // - ≥1 RF: LDL ≥160
  if (rf.count >= 2) {
    result.threshold_mgdl = 130;
    if (ldl >= 130) {
      result.eligible = true;
      result.rationale.push("Primary prevention + ≥2 risk factors + LDL ≥130 → eligible (operational NHI rule).");
    } else {
      result.eligible = false;
      result.rationale.push("Primary prevention + ≥2 risk factors but LDL <130 → not eligible by threshold.");
    }
  } else if (rf.count >= 1) {
    result.threshold_mgdl = 160;
    if (ldl >= 160) {
      result.eligible = true;
      result.rationale.push("Primary prevention + ≥1 risk factor + LDL ≥160 → eligible (operational NHI rule).");
    } else {
      result.eligible = false;
      result.rationale.push("Primary prevention + ≥1 risk factor but LDL <160 → not eligible by threshold.");
    }
  } else {
    result.threshold_mgdl = null;
    result.eligible = false;
    result.rationale.push("Primary prevention + 0 risk factors → operational rule not defined here.");
  }

  result.reminders.push("Ensure risk factors are explicitly documented (HTN/DM/smoking/age/FH) for auditability.");
  return result;
}

// Convenience wrapper
export function getNhiEligibilityFromSoap(soap) {
  const patient = extractPatientStateFromSoap(soap);
  return getNhiEligibility({
    sex: patient.sex,
    age: patient.age,
    LDL: patient.LDL,
    hasACS: patient.hasACS,
    hasPCI: patient.hasPCI,
    hasCABG: patient.hasCABG,
    hasHTN: patient.hasHTN,
    onAntiHTNMeds: patient.onAntiHTNMeds,
    hasDM: patient.hasDM,
    currentSmoker: patient.currentSmoker,
    fhPrematureASCVD: patient.fhPrematureASCVD,
  });
}
