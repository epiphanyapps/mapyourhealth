/**
 * Health Effects Data for Water Contaminants
 * 
 * This module provides detailed health effects information for contaminants
 * to answer the user question: "What does it do to me?"
 */

export interface ContaminantHealthEffect {
  id: string
  name: string
  description: string
  shortTermEffects: string[]
  longTermEffects: string[]
  atRiskPopulations: string[]
  commonSources: string[]
  externalLinks: {
    title: string
    url: string
  }[]
}

export const CONTAMINANT_HEALTH_EFFECTS: Record<string, ContaminantHealthEffect> = {
  'bendiocarb': {
    id: 'bendiocarb',
    name: 'Bendiocarb',
    description: 'A carbamate insecticide that can contaminate water sources through agricultural runoff and improper disposal.',
    shortTermEffects: [
      'Nausea and vomiting',
      'Headaches and dizziness',
      'Muscle weakness',
      'Difficulty breathing'
    ],
    longTermEffects: [
      'Nervous system damage',
      'Reproductive health issues',
      'Potential developmental problems',
      'Liver and kidney damage'
    ],
    atRiskPopulations: [
      'Pregnant women and developing fetuses',
      'Children under 6 years old',
      'People with compromised immune systems',
      'Agricultural workers'
    ],
    commonSources: [
      'Agricultural pesticide runoff',
      'Contaminated groundwater near farms',
      'Improper pesticide disposal',
      'Industrial manufacturing waste'
    ],
    externalLinks: [
      {
        title: 'EPA Bendiocarb Fact Sheet',
        url: 'https://www.epa.gov/ingredients-used-pesticide-products/bendiocarb'
      }
    ]
  },

  'atrazine': {
    id: 'atrazine',
    name: 'Atrazine',
    description: 'A widely used herbicide that can persist in groundwater and surface water sources.',
    shortTermEffects: [
      'Eye and skin irritation',
      'Respiratory irritation',
      'Digestive upset'
    ],
    longTermEffects: [
      'Endocrine system disruption',
      'Increased cancer risk',
      'Reproductive system effects',
      'Cardiovascular problems'
    ],
    atRiskPopulations: [
      'Pregnant women',
      'Children and adolescents',
      'Rural communities',
      'Agricultural workers'
    ],
    commonSources: [
      'Agricultural herbicide application',
      'Groundwater contamination',
      'Surface water runoff',
      'Treatment plant residue'
    ],
    externalLinks: [
      {
        title: 'EPA Atrazine Information',
        url: 'https://www.epa.gov/atrazine'
      }
    ]
  },

  'lead': {
    id: 'lead',
    name: 'Lead',
    description: 'A toxic heavy metal that can cause serious health problems even at low levels.',
    shortTermEffects: [
      'Stomach pain and nausea',
      'Fatigue and irritability',
      'Headaches',
      'Muscle and joint pain'
    ],
    longTermEffects: [
      'Brain damage and reduced IQ',
      'Nervous system damage',
      'High blood pressure',
      'Kidney damage',
      'Reproductive problems'
    ],
    atRiskPopulations: [
      'Children under 6 years old',
      'Pregnant women',
      'People in older homes (pre-1978)',
      'Occupationally exposed workers'
    ],
    commonSources: [
      'Lead pipes and plumbing',
      'Lead solder in older pipes',
      'Brass fixtures and fittings',
      'Industrial contamination'
    ],
    externalLinks: [
      {
        title: 'CDC Lead in Drinking Water',
        url: 'https://www.cdc.gov/nceh/lead/prevention/sources/water.htm'
      },
      {
        title: 'EPA Lead and Copper Rule',
        url: 'https://www.epa.gov/ground-water-and-drinking-water/lead-and-copper-rule'
      }
    ]
  },

  'arsenic': {
    id: 'arsenic',
    name: 'Arsenic',
    description: 'A naturally occurring toxic metalloid that can contaminate groundwater.',
    shortTermEffects: [
      'Stomach pain and nausea',
      'Vomiting and diarrhea',
      'Skin changes and darkening'
    ],
    longTermEffects: [
      'Increased cancer risk (skin, bladder, lung)',
      'Cardiovascular disease',
      'Diabetes',
      'Skin lesions and changes'
    ],
    atRiskPopulations: [
      'People using private wells',
      'Residents in high-arsenic regions',
      'Children and pregnant women',
      'People with poor nutrition'
    ],
    commonSources: [
      'Natural geological deposits',
      'Mining and smelting operations',
      'Agricultural chemicals',
      'Private wells in contaminated areas'
    ],
    externalLinks: [
      {
        title: 'EPA Arsenic in Drinking Water',
        url: 'https://www.epa.gov/ground-water-and-drinking-water/arsenic-drinking-water'
      }
    ]
  },

  'nitrate': {
    id: 'nitrate',
    name: 'Nitrate',
    description: 'A nitrogen compound that can contaminate water through agricultural and sewage sources.',
    shortTermEffects: [
      'Blue baby syndrome (methemoglobinemia) in infants',
      'Difficulty breathing in infants',
      'Digestive issues'
    ],
    longTermEffects: [
      'Potential increased cancer risk',
      'Thyroid problems',
      'Birth defects',
      'Cardiovascular effects'
    ],
    atRiskPopulations: [
      'Infants under 6 months',
      'Pregnant women',
      'People with certain medical conditions',
      'Rural communities with private wells'
    ],
    commonSources: [
      'Agricultural fertilizer runoff',
      'Septic system leachate',
      'Animal waste',
      'Industrial discharge'
    ],
    externalLinks: [
      {
        title: 'EPA Nitrate Information',
        url: 'https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations#Inorganic'
      }
    ]
  }
}

/**
 * Get health effects information for a contaminant
 */
export function getContaminantHealthEffects(contaminantId: string): ContaminantHealthEffect | null {
  return CONTAMINANT_HEALTH_EFFECTS[contaminantId.toLowerCase()] || null
}

/**
 * Check if health effects data is available for a contaminant
 */
export function hasHealthEffectsData(contaminantId: string): boolean {
  return contaminantId.toLowerCase() in CONTAMINANT_HEALTH_EFFECTS
}