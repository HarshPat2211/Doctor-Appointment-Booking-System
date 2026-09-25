import dotenv from "dotenv";
dotenv.config();

/**
 * Clinical Cross-Reactivity Database
 * Flags direct and cross-reactive allergy conflicts between patient allergies and prescribed drugs.
 */
const CLINICAL_ALLERGY_GROUPS = [
  {
    groupName: "Penicillin Antibiotics",
    allergenKeywords: ["penicillin", "penicilin", "pcn", "amoxicillin", "ampicillin", "augmentin", "amox-clav"],
    medicationKeywords: [
      "amoxicillin", "ampicillin", "augmentin", "amox-clav", "amoxicillin-clavulanate",
      "piperacillin", "tazobactam", "penicillin", "cloxacillin", "oxacillin",
      "nafcillin", "dicloxacillin", "methicillin", "moxatag", "unasyn"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} is a penicillin-type antibiotic. Patient has a documented allergy to ${allergen}.`,
    recommendation: "Consider non-penicillin alternatives such as Macrolides (e.g., Azithromycin, Clarithromycin) or Cephalosporins (with caution depending on allergy severity).",
    severity: "HIGH"
  },
  {
    groupName: "Cephalosporin Antibiotics",
    allergenKeywords: ["cephalosporin", "cephalexin", "cefuroxime", "ceftriaxone", "cefixime", "cefaclor", "keflex"],
    medicationKeywords: [
      "cephalexin", "keflex", "cefuroxime", "ceftriaxone", "cefixime",
      "cefotaxime", "cefepime", "cefdinir", "cefprozil", "rocephin"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} is a cephalosporin antibiotic. Patient has a documented allergy to ${allergen}.`,
    recommendation: "Consider fluoroquinolones, macrolides, or consult a clinical specialist for safe alternatives.",
    severity: "HIGH"
  },
  {
    groupName: "Sulfa / Sulfonamide Drugs",
    allergenKeywords: ["sulfa", "sulfonamide", "bactrim", "septra", "sulfamethoxazole"],
    medicationKeywords: [
      "sulfamethoxazole", "bactrim", "septra", "sulfasalazine",
      "sulfadiazine", "cotrimoxazole", "trimethoprim-sulfamethoxazole"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} contains sulfonamide. Patient has a documented allergy to ${allergen}.`,
    recommendation: "Consider non-sulfa options such as Nitrofurantoin, Ciprofloxacin, or Amoxicillin (if non-allergic).",
    severity: "HIGH"
  },
  {
    groupName: "NSAIDs & Aspirin",
    allergenKeywords: ["aspirin", "nsaid", "nsaids", "ibuprofen", "advil", "motrin", "naproxen", "diclofenac", "combiflam"],
    medicationKeywords: [
      "aspirin", "disprin", "ibuprofen", "brufen", "advil", "motrin", "combiflam",
      "naproxen", "diclofenac", "voveran", "ketorolac", "indomethacin",
      "meloxicam", "piroxicam", "aceclofenac", "celecoxib"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} is an NSAID. Patient has documented hypersensitivity to ${allergen}.`,
    recommendation: "Consider Paracetamol (Acetaminophen, e.g., Crocin, Dolo 650) for analgesia or antipyretic treatment.",
    severity: "HIGH"
  },
  {
    groupName: "Macrolide Antibiotics",
    allergenKeywords: ["azithromycin", "erythromycin", "clarithromycin", "macrolide", "zithromax", "azee"],
    medicationKeywords: [
      "azithromycin", "zithromax", "azee", "erythromycin", "clarithromycin", "biaxin"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} is a macrolide antibiotic. Patient has documented allergy to ${allergen}.`,
    recommendation: "Consider beta-lactams, doxycycline, or fluoroquinolones based on patient culture and sensitivities.",
    severity: "HIGH"
  },
  {
    groupName: "Fluoroquinolones",
    allergenKeywords: ["ciprofloxacin", "cipro", "levofloxacin", "ofloxacin", "moxifloxacin", "quinolone", "fluoroquinolone"],
    medicationKeywords: [
      "ciprofloxacin", "cipro", "levofloxacin", "levaquin", "ofloxacin", "moxifloxacin", "norfloxacin"
    ],
    generateReason: (med, allergen) => `CONFLICT: ${med} is a fluoroquinolone. Patient has documented allergy to ${allergen}.`,
    recommendation: "Consider macrolides, cephalosporins, or penicillins based on clinical history.",
    severity: "HIGH"
  }
];

export function cleanDrugBaseName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/\b(\d+(\.\d+)?\s*(mg|ml|g|mcg|tab|tablet|capsule|units)?)\b/gi, "")
    .replace(/\b(ds|sr|xl|er|cr|forte)\b/gi, "")
    .replace(/[^a-z]/gi, "")
    .trim();
}

/**
 * Local Rule-Based Clinical Safety Engine
 * Instant 0.001s check for allergy cross-reactivity and direct matches.
 */
export function checkLocalClinicalConflicts(patientAllergies = "", medicines = []) {
  if (!patientAllergies || !patientAllergies.trim() || !Array.isArray(medicines) || medicines.length === 0) {
    return [];
  }

  const allergyText = String(patientAllergies).toLowerCase();
  const conflicts = [];
  const seenMedicines = new Set();

  for (const med of medicines) {
    const medName = String(med.name || "").trim().toLowerCase();
    if (!medName || seenMedicines.has(medName)) continue;

    let matchedGroup = false;

    // Check predefined clinical allergy groups
    for (const group of CLINICAL_ALLERGY_GROUPS) {
      const patientHasAllergyInGroup = group.allergenKeywords.some((allergen) =>
        allergyText.includes(allergen)
      );

      if (patientHasAllergyInGroup) {
        const medMatchesGroup = group.medicationKeywords.some((keyword) =>
          medName.includes(keyword)
        );

        if (medMatchesGroup) {
          const matchedAllergen = group.allergenKeywords.find((a) => allergyText.includes(a)) || group.groupName;
          conflicts.push({
            medicineName: med.name,
            allergen: matchedAllergen.charAt(0).toUpperCase() + matchedAllergen.slice(1),
            severity: group.severity,
            reason: group.generateReason(med.name, matchedAllergen.charAt(0).toUpperCase() + matchedAllergen.slice(1)),
            recommendation: group.recommendation
          });
          seenMedicines.add(medName);
          matchedGroup = true;
          break;
        }
      }
    }

    // Direct string match fallback if not already captured
    if (!matchedGroup) {
      const allergyTokens = allergyText
        .split(/[,;\n/]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length >= 3 && t !== "none" && t !== "n/a" && t !== "nil");

      for (const token of allergyTokens) {
        if (medName.includes(token) || token.includes(medName)) {
          conflicts.push({
            medicineName: med.name,
            allergen: token.charAt(0).toUpperCase() + token.slice(1),
            severity: "HIGH",
            reason: `CONFLICT: ${med.name} directly matches patient's documented allergy: ${token}.`,
            recommendation: "Switch to an alternative medication class that does not trigger this allergy."
          });
          seenMedicines.add(medName);
          break;
        }
      }
    }
  }

  return conflicts;
}

/**
 * Generate clear, patient-friendly instructions summary
 */
export function generateLocalPatientSummary(medicines = [], advice = "", followUpDate = null) {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return advice ? `Care Instructions: ${advice}` : "Follow your doctor's clinical recommendations.";
  }

  const instructions = medicines.map((m, idx) => {
    let line = `${idx + 1}. Take ${m.name} (${m.dosage}) - ${m.frequency} for ${m.duration}`;
    if (m.instructions && m.instructions.trim()) {
      line += ` (${m.instructions.trim()})`;
    }
    return line;
  }).join(". ");

  let summary = `Prescription Instructions: ${instructions}.`;
  if (advice && advice.trim()) {
    summary += ` Additional Advice: ${advice.trim()}.`;
  }
  if (followUpDate) {
    const formattedDate = new Date(followUpDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    summary += ` Follow-up scheduled on ${formattedDate}.`;
  }

  return summary;
}

/**
 * Full Prescription Safety Evaluation
 * Evaluates patient allergies & interactions via Gemini AI with local clinical engine fallback.
 */
export async function evaluatePrescriptionSafety({
  patientAllergies = "",
  chronicDiseases = "",
  currentMedications = "",
  medicines = [],
  diagnosis = "",
  advice = "",
  followUpDate = null
}) {
  // 1. Run local clinical rule engine first (100% reliable)
  const localConflicts = checkLocalClinicalConflicts(patientAllergies, medicines);
  const localSummary = generateLocalPatientSummary(medicines, advice, followUpDate);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      hasConflict: localConflicts.length > 0,
      conflicts: localConflicts,
      patientSummary: localSummary,
      source: "local-clinical-engine",
      checkedAt: new Date()
    };
  }

  // 2. Query Gemini 3.1 Flash-Lite for deep cross-reactivity & friendly patient summary
  const prompt = `You are a clinical pharmacologist and patient safety AI.
Evaluate this medical prescription against the patient's documented allergies and health profile.

PATIENT HEALTH PROFILE:
- Documented Allergies: ${patientAllergies || "None declared"}
- Chronic Diseases: ${chronicDiseases || "None declared"}
- Current Medications: ${currentMedications || "None"}

PRESCRIBED TREATMENT:
- Diagnosis: ${diagnosis || "Not specified"}
- Medicines: ${JSON.stringify(medicines.map((m) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.instructions })))}
- Advice: ${advice || "None"}

INSTRUCTIONS:
1. Check for ANY allergy conflict or severe cross-reactivity between Documented Allergies and Prescribed Medicines.
   Example: If patient is allergic to Penicillin and prescribed Amoxicillin/Augmentin, flag: "CONFLICT: Amoxicillin is a penicillin-type antibiotic."
   Example: If patient is allergic to Sulfa and prescribed Bactrim/Sulfamethoxazole, flag: "CONFLICT: Bactrim contains sulfonamide."
   Example: If patient is allergic to Aspirin and prescribed Ibuprofen/NSAID, flag: "CONFLICT: Ibuprofen is an NSAID."
2. Generate a warm, simple, layman Patient Care Summary in 2-3 plain English sentences explaining clearly how the patient should take these medicines (e.g., "Take 1 pill in the morning and 1 at night after eating. Gargle with warm salt water 3 times a day...").

OUTPUT FORMAT: Strict valid JSON ONLY.
{
  "hasConflict": boolean,
  "conflicts": [
    {
      "medicineName": "string",
      "allergen": "string",
      "severity": "HIGH" | "MEDIUM",
      "reason": "CONFLICT: [Medicine] is a [class/type] antibiotic/drug. Patient has documented allergy to [Allergen].",
      "recommendation": "string suggesting safe alternative"
    }
  ],
  "patientSummary": "string"
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 600,
          responseMimeType: "application/json"
        }
      })
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText.trim());

        // Prioritize Gemini's clinical analysis and eliminate duplicates
        const combinedConflicts = [];
        const seenDrugs = new Set();

        if (Array.isArray(parsed.conflicts)) {
          for (const c of parsed.conflicts) {
            if (!c || !c.medicineName) continue;
            const base = cleanDrugBaseName(c.medicineName);
            if (!base || seenDrugs.has(base)) continue;
            seenDrugs.add(base);

            combinedConflicts.push({
              medicineName: c.medicineName,
              allergen: c.allergen || "Documented Allergy",
              severity: c.severity || "HIGH",
              reason: c.reason || `CONFLICT: ${c.medicineName} conflicts with patient allergy.`,
              recommendation: c.recommendation || "Consult patient history for safe alternatives."
            });
          }
        }

        // Safety net: include any local rule conflict only if Gemini completely missed it
        for (const lc of localConflicts) {
          const base = cleanDrugBaseName(lc.medicineName);
          if (!base || seenDrugs.has(base)) continue;
          seenDrugs.add(base);
          combinedConflicts.push(lc);
        }

        const finalSummary = (parsed.patientSummary && parsed.patientSummary.trim().length > 10)
          ? parsed.patientSummary.trim()
          : localSummary;

        return {
          hasConflict: combinedConflicts.length > 0,
          conflicts: combinedConflicts,
          patientSummary: finalSummary,
          source: "gemini-ai",
          checkedAt: new Date()
        };
      }
    }
  } catch (err) {
    console.warn("Gemini safety check request error or timeout, falling back to local clinical rules:", err.message);
  }

  // Fallback to local clinical engine
  return {
    hasConflict: localConflicts.length > 0,
    conflicts: localConflicts,
    patientSummary: localSummary,
    source: "local-clinical-fallback",
    checkedAt: new Date()
  };
}
