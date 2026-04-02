export interface ContaminantHealthEffect {
  id: string
  name: string
  description: string
  healthEffects: string[]
  sources: string[]
}

export const CONTAMINANT_HEALTH_EFFECTS: Record<string, ContaminantHealthEffect> = {
  bendiocarb: {
    id: "bendiocarb",
    name: "Bendiocarb",
    description: "A carbamate insecticide that affects the nervous system.",
    healthEffects: [
      "Nausea and vomiting",
      "Headaches and dizziness",
      "Nervous system effects",
      "Potential reproductive issues",
    ],
    sources: ["Agricultural pesticide runoff", "Contaminated groundwater", "Industrial waste"],
  },
  lead: {
    id: "lead",
    name: "Lead",
    description: "A toxic heavy metal harmful even at low levels.",
    healthEffects: [
      "Brain damage and reduced IQ",
      "Nervous system damage",
      "High blood pressure",
      "Kidney damage",
    ],
    sources: ["Lead pipes and plumbing", "Lead solder in older pipes", "Brass fixtures"],
  },
}

export function getContaminantHealthEffects(contaminantId: string): ContaminantHealthEffect | null {
  return CONTAMINANT_HEALTH_EFFECTS[contaminantId.toLowerCase()] || null
}

export function hasHealthEffectsData(contaminantId: string): boolean {
  return contaminantId.toLowerCase() in CONTAMINANT_HEALTH_EFFECTS
}
