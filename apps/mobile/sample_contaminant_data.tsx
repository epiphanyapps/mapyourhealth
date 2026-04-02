/**
 * Sample usage of ContaminantTable with health effects info buttons
 * This demonstrates how to integrate the new health effects feature
 */

import React from "react"
import { View, ScrollView } from "react-native"

import { ContaminantTable, ContaminantTableRow } from "./app/components/ContaminantTable"
import { Text } from "./app/components/Text"

/**
 * Sample contaminant data with contaminantId for health effects lookup
 * In production, this would come from your API/backend
 */
const sampleContaminantData: ContaminantTableRow[] = [
  // Pesticides with health info
  {
    name: "Bendiocarb",
    contaminantId: "bendiocarb", // Maps to health effects database
    value: 0.05,
    unit: "mg/L",
    whoLimit: 0.1,
    localLimit: 0.08,
    localJurisdictionName: "QUEBEC",
    status: "safe",
  },
  {
    name: "Atrazine", 
    contaminantId: "atrazine",
    value: 2.8,
    unit: "μg/L",
    whoLimit: 3.0,
    localLimit: 5.0,
    localJurisdictionName: "QUEBEC", 
    status: "warning",
  },

  // Heavy metals with health info
  {
    name: "Lead",
    contaminantId: "lead",
    value: 12,
    unit: "μg/L",
    whoLimit: 10,
    localLimit: 5,
    localJurisdictionName: "QUEBEC",
    status: "danger",
  },
  {
    name: "Arsenic",
    contaminantId: "arsenic", 
    value: 8,
    unit: "μg/L",
    whoLimit: 10,
    localLimit: 10,
    localJurisdictionName: "QUEBEC",
    status: "warning",
  },

  // Contaminant without health info (no info button will show)
  {
    name: "Unknown Chemical",
    // No contaminantId = no info button
    value: 15,
    unit: "mg/L", 
    whoLimit: 20,
    localLimit: 18,
    localJurisdictionName: "QUEBEC",
    status: "safe",
  },

  // More contaminants with health info
  {
    name: "Chloroform",
    contaminantId: "chloroform",
    value: 45,
    unit: "μg/L",
    whoLimit: 200, 
    localLimit: 100,
    localJurisdictionName: "QUEBEC",
    status: "safe", 
  },
  {
    name: "Nitrate",
    contaminantId: "nitrate",
    value: 8.5,
    unit: "mg/L",
    whoLimit: 11.3,
    localLimit: 10.0,
    localJurisdictionName: "QUEBEC",
    status: "warning",
  }
]

/**
 * Example screen/component showing the enhanced ContaminantTable
 */
export function WaterQualityScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
          Water Quality Results
        </Text>
        
        <Text style={{ fontSize: 16, marginBottom: 20, color: "#666" }}>
          Tap the info (i) buttons to learn about health effects of specific contaminants.
        </Text>

        <ContaminantTable rows={sampleContaminantData} />

        <View style={{ marginTop: 20, padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8 }}>
            💡 Feature Highlights:
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#666" }}>
            • Info buttons appear next to contaminants with health data{"\n"}
            • Modal opens with comprehensive health effects information{"\n"}
            • Includes short-term effects, long-term risks, and vulnerable populations{"\n"}
            • External links to official EPA/WHO guidelines{"\n"}
            • Fully accessible with screen reader support
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

/**
 * How to add health effects for new contaminants:
 * 
 * 1. Add entry to contaminantHealthEffects.ts:
 * 
 * mercury: {
 *   description: "Mercury is a toxic heavy metal...",
 *   shortTermEffects: "Nausea, diarrhea, skin rashes...",
 *   longTermEffects: "Permanent brain damage, kidney damage...",
 *   vulnerablePopulations: "Developing babies, young children...", 
 *   sources: ["Industrial pollution", "Coal-fired power plants"],
 *   moreInfoUrl: "https://www.epa.gov/mercury/health-effects-exposures-mercury"
 * }
 * 
 * 2. Include contaminantId in your data:
 * 
 * {
 *   name: "Mercury",
 *   contaminantId: "mercury", // Must match key in health effects database
 *   value: 1.2,
 *   unit: "μg/L",
 *   // ... other properties
 * }
 * 
 * The info button will automatically appear and show the health information!
 */