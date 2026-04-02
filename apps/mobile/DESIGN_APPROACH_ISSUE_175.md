# Design Approach: Water Contaminant Explanations (Issue #175)

## Overview
Add "i" info buttons next to contaminant names in the ContaminantTable to provide health effects information via tooltips/modals.

## Design Decisions

### 1. UI Pattern Choice: Modal over Tooltip
**Rationale:**
- **Mobile-first**: Tooltips are problematic on mobile (no hover, small touch targets)
- **Content volume**: Health effects require more space than tooltips provide
- **Accessibility**: Modals provide better screen reader support
- **Existing patterns**: App already uses React Native Paper with modal support

### 2. Visual Design
**Info Button:**
- Position: Right-aligned in contaminant name cell
- Style: Small circular "i" icon using MaterialCommunityIcons
- Color: Theme's textDim color (subtle but discoverable)
- Size: 16px (accessible touch target with padding)
- Behavior: Press to open modal

**Modal Design:**
- Header: Contaminant name
- Content sections:
  1. **What is it?** - Brief description of the contaminant
  2. **Health Effects** - What does it do to me? (primary user question)
  3. **Sources** - Where does it come from?
  4. **More Info** - External links (if available)
- Style: React Native Paper Modal with consistent theming
- Mobile-responsive: Full-width on mobile, constrained on tablet/web

### 3. Content Structure
Leverage existing `Contaminant` interface with enhanced health effects data:

```typescript
interface ContaminantHealthInfo {
  shortTerm?: string;     // Immediate health effects
  longTerm?: string;      // Chronic exposure effects  
  vulnerable?: string;    // At-risk populations
  sources?: string[];     // Common sources
  moreInfoUrl?: string;   // External link
}
```

### 4. Accessibility
- Info button has proper `accessibilityLabel`
- Modal supports screen readers
- Modal can be dismissed with back button/gesture
- High contrast icon for visibility

### 5. Performance
- Lazy load health effects data
- Modal content pre-structured to avoid layout shifts
- Smooth animations using React Native Paper's built-in transitions

## Implementation Pattern

```typescript
// ContaminantTable enhanced with info buttons
<View style={$nameCell}>
  <View style={$nameWithInfo}>
    <Text style={$cellText}>{row.name}</Text>
    <ContaminantInfoButton 
      contaminantId={row.contaminantId}
      contaminantName={row.name}
    />
  </View>
</View>
```

## User Journey
1. User sees contaminant like "Bendiocarb" with subtle "i" icon
2. User taps info button
3. Modal opens with health effects information
4. User reads "What does it do to me?" content
5. User can access external links for more detailed information
6. User dismisses modal and returns to table

## Responsive Behavior
- **Mobile**: Full-screen modal for better readability
- **Tablet/Web**: Centered modal with max-width constraint
- **Dark mode**: Automatic theme support via app's theme context

## Future Extensibility
- Modal design supports adding more sections (prevention tips, treatment info)
- Health effects data structure allows for localization (French support)
- External links can be dynamically loaded from backend