/**
 * geminiTriageService.js
 * ───────────────────────
 * AI Symptom Triage + Clinical Health Advisor powered by Google Gemini API.
 */

const FALLBACK_SPECIALTIES = [
  "General Physicians",
  "Cardiologists",
  "Dermatologists",
  "Neurologists",
  "Pediatricians",
  "Dentists"
];

// Fallback intelligent triage with bilingual (English + Hindi/Hinglish) keyword understanding
function fallbackRuleBasedTriage(symptomsText) {
  const raw = typeof symptomsText === "string" ? symptomsText : (symptomsText?.symptoms || symptomsText?.query || "");
  const text = (raw || "").toLowerCase();

  // 1. Cardiac / Chest Emergency
  if (
    text.includes("chest pain") || text.includes("chhati") || text.includes("heart") ||
    text.includes("left arm") || text.includes("numb") || text.includes("attack") ||
    text.includes("palpitation") || text.includes("saans") || text.includes("breath")
  ) {
    return {
      specialty: "Cardiologists",
      urgency: "EMERGENCY",
      reason: "Chest pain radiating to the arm or shortness of breath is a critical warning sign of acute cardiac distress or coronary syndrome.",
      advice: "Seek immediate emergency medical attention or call an ambulance (112 / 911) right now. Avoid exertion, remain seated in an upright position, loosen tight clothing, and do not drive yourself.",
      possibleConditions: ["Acute Coronary Syndrome", "Angina Pectoris", "Myocardial Infarction"]
    };
  }

  // 2. Dental issues
  if (text.includes("tooth") || text.includes("teeth") || text.includes("gum") || text.includes("dant") || text.includes("cavity") || text.includes("jaw")) {
    return {
      specialty: "Dentists",
      urgency: text.includes("severe") || text.includes("swelling") || text.includes("bahut") ? "HIGH" : "MEDIUM",
      reason: "Oral and dental symptoms indicate localized infection, dental caries, or periodontal inflammation requiring dental intervention.",
      advice: "Rinse gently with warm salt water 3-4 times daily. Avoid excessively hot, cold, or hard foods. For acute pain, an over-the-counter analgesic like Paracetamol (500mg) or Ibuprofen (400mg) after food can provide temporary relief. Please schedule a dentist visit for an examination.",
      possibleConditions: ["Dental Pulpitis", "Gingival Infection", "Dental Abscess"]
    };
  }

  // 3. Sprain / Twisted Ankle / Musculoskeletal Injury
  if (text.includes("ankle") || text.includes("sprain") || text.includes("moch") || text.includes("twist") || text.includes("knee") || text.includes("exercise") || text.includes("kasrat")) {
    return {
      specialty: "General Physicians",
      urgency: "MEDIUM",
      reason: "Acute soft-tissue sprain or ligament strain requires physical evaluation to rule out micro-fractures before intense rehab.",
      advice: "In the first 48-72 hours, follow the R.I.C.E. protocol: Rest (avoid bearing weight), Ice (15-20 mins every 3 hours), Compression (gentle crepe bandage), Elevation (prop leg above heart level). Do NOT perform heavy running or stretching immediately. Gentle mobility exercises you can do after pain subsides: (1) Ankle alphabet (draw letters in the air with toes), (2) Gentle ankle circles, (3) Towel scrunches. If you cannot bear weight at all, consult a doctor for an X-ray.",
      possibleConditions: ["Ankle Ligament Sprain", "Tendonitis", "Soft Tissue Contusion"]
    };
  }

  // 4. Fever / Infection / Medicine questions
  if (text.includes("fever") || text.includes("bukhar") || text.includes("dawai") || text.includes("medicine") || text.includes("goli") || text.includes("tap")) {
    return {
      specialty: "General Physicians",
      urgency: text.includes("high") || text.includes("102") || text.includes("103") || text.includes("bahut") ? "HIGH" : "LOW",
      reason: "Systemic febrile illness requires monitoring to identify underlying bacterial or viral etiology.",
      advice: "For mild to moderate fever, Paracetamol (500mg or 650mg after meals every 6-8 hours, maximum 3000mg/day) is the standard safe antipyretic. Drink plenty of electrolyte fluids (coconut water, ORS, warm soups) and ensure complete rest. Do not take unprescribed antibiotics. If fever exceeds 102°F, lasts longer than 3 days, or is accompanied by chills or breathing difficulty, consult a General Physician immediately.",
      possibleConditions: ["Viral Febrile Illness", "Seasonal Flu", "Acute Pharyngitis"]
    };
  }

  // 5. Dermatologist (Skin, rash, itching)
  if (text.includes("skin") || text.includes("rash") || text.includes("itch") || text.includes("khujli") || text.includes("acne") || text.includes("allergy")) {
    return {
      specialty: "Dermatologists",
      urgency: text.includes("spreading") || text.includes("fever") ? "HIGH" : "MEDIUM",
      reason: "Cutaneous manifestations including erythema or pruritus suggest contact dermatitis, allergic response, or fungal infection.",
      advice: "Keep the affected area clean, dry, and cool. Avoid scratching to prevent secondary bacterial infection. Apply a mild calamine lotion or gentle fragrance-free moisturizer. If there is severe swelling or spreading hives, see a specialist promptly.",
      possibleConditions: ["Contact Dermatitis", "Urticaria (Allergic Hives)", "Eczema"]
    };
  }

  // 6. Neurologist (Headache, migraine, dizziness)
  if (text.includes("headache") || text.includes("sir dard") || text.includes("migraine") || text.includes("dizzy") || text.includes("chakkar") || text.includes("seizure")) {
    const isSevere = text.includes("worst") || text.includes("faint") || text.includes("seizure") || text.includes("vomit");
    return {
      specialty: "Neurologists",
      urgency: isSevere ? "EMERGENCY" : "HIGH",
      reason: "Neurological symptoms involving recurring cephalalgia or balance loss require formal neuro-cranial evaluation.",
      advice: "Rest in a quiet, darkened room. Stay well hydrated. For mild tension headache, rest and mild OTC analgesics may help. If headache is sudden, severe ('thunderclap'), accompanied by speech difficulty, facial drooping, or limb weakness, seek emergency hospital care immediately.",
      possibleConditions: ["Migraine with Aura", "Tension-type Headache", "Cervicogenic Headache"]
    };
  }

  // 7. Pediatricians (Child health)
  if (text.includes("child") || text.includes("baby") || text.includes("kid") || text.includes("bacha") || text.includes("bachhe") || text.includes("infant")) {
    return {
      specialty: "Pediatricians",
      urgency: "MEDIUM",
      reason: "Pediatric presentations require age-weight adjusted dosages and specialized child healthcare oversight.",
      advice: "Ensure the child drinks small sips of water or ORS frequently to prevent dehydration. Keep a log of temperature. Never administer adult medications or aspirin to children. Consult a Pediatrician for age-appropriate prescriptions.",
      possibleConditions: ["Pediatric Viral Infection", "Gastroenteritis", "Upper Respiratory Infection"]
    };
  }

  // Default constitutional response
  return {
    specialty: "General Physicians",
    urgency: "LOW",
    reason: "A primary care consultation is recommended for diagnostic evaluation and physical examination.",
    advice: "Monitor your symptoms closely and maintain adequate rest. If you are experiencing pain, fever, or persistent discomfort, avoid self-medicating with unprescribed strong drugs and consult a qualified General Physician for a tailored treatment plan.",
    possibleConditions: ["General Malaise", "Early Viral Syndrome", "Fatigue / Dehydration"]
  };
}

/**
 * Calls Gemini API to analyze patient symptoms and return structured triage data.
 * @param {string} symptoms
 * @returns {Promise<{ specialty: string, urgency: string, reason: string, advice: string, possibleConditions: string[] }>}
 */
export async function analyzeSymptomsWithGemini(symptoms) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return fallbackRuleBasedTriage(symptoms);
  }

  const prompt = `You are an empathetic, highly knowledgeable clinical AI doctor and medical advisor on a healthcare platform.
A patient asks or describes:
"${symptoms}"

Understand the patient's language accurately (English, Hindi, or Hinglish).
Analyze their query and produce a strict JSON response with these exact keys:
{
  "specialty": "<Exact category: 'General Physicians' | 'Cardiologists' | 'Dermatologists' | 'Neurologists' | 'Pediatricians' | 'Dentists'>",
  "urgency": "<'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'>",
  "reason": "<1-2 sentence medical explanation of why this specialty was recommended>",
  "advice": "<A thorough, direct, empathetic, and actionable answer addressing EXACTLY what the patient asked! If they asked which medicine to take (e.g. for fever, headache, acidity, cold), explain standard safe OTC options like Paracetamol with dosage limits & safety precautions, plus when to see a doctor. If they asked about exercises or home care for an injury (e.g. sprain, backache), provide specific safe exercises and precautions. If it is an emergency, advise immediate emergency care. Never use generic filler — answer their actual question!>",
  "possibleConditions": ["<2-3 possible clinical conditions or differential diagnoses>"]
}

Guidelines:
- If symptoms indicate chest pain, radiating arm pain, breathing difficulty, or stroke symptoms -> urgency: 'EMERGENCY', specialty: 'Cardiologists' or 'General Physicians'.
- If symptoms involve teeth/gums -> 'Dentists'.
- If symptoms involve skin/rash/acne/itching -> 'Dermatologists'.
- If symptoms involve brain/migraines/nerves/seizures -> 'Neurologists'.
- If symptoms involve infants/children -> 'Pediatricians'.
- For fever, cold, stomach issues, sprains, injuries, general questions -> 'General Physicians'.
- Output VALID JSON ONLY. No markdown fences, no conversational preamble.`;

  // Prioritize fast, high-quality models
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // 8.5-second timeout gives Gemini enough time to produce rich, thorough medical answers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
            responseMimeType: "application/json"
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[geminiTriageService] Model ${model} status ${response.status}, trying next.`);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) continue;

      const parsed = JSON.parse(rawText.trim());

      // Normalize specialty to match platform categories
      let normSpecialty = parsed.specialty || "General Physicians";
      const match = FALLBACK_SPECIALTIES.find(
        (s) => s.toLowerCase() === normSpecialty.toLowerCase() ||
               s.toLowerCase().includes(normSpecialty.toLowerCase()) ||
               normSpecialty.toLowerCase().includes(s.toLowerCase().slice(0, 5))
      );
      if (match) normSpecialty = match;

      return {
        specialty: normSpecialty,
        urgency: ["EMERGENCY", "HIGH", "MEDIUM", "LOW"].includes(parsed.urgency) ? parsed.urgency : "MEDIUM",
        reason: parsed.reason || "Specialist consultation recommended based on reported symptoms.",
        advice: parsed.advice || "Ensure adequate rest, monitor your condition closely, and schedule a consultation.",
        possibleConditions: Array.isArray(parsed.possibleConditions) ? parsed.possibleConditions : []
      };
    } catch (err) {
      console.warn(`[geminiTriageService] Model ${model} attempt bypassed (${err.message}).`);
    }
  }

  // Smart bilingual fallback if API fails or times out
  return fallbackRuleBasedTriage(symptoms);
}
