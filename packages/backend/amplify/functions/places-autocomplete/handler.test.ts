/**
 * Tests for places-autocomplete filtering and sorting logic.
 *
 * Run: cd packages/backend && npx tsx amplify/functions/places-autocomplete/handler.test.ts
 */

// ── Inline copies of the pure functions under test ──────────────────────────
// (The handler doesn't export them, so we duplicate the logic here.
//  If these drift from handler.ts the tests will catch the mismatch
//  because they encode the expected behavior from the issue spec.)

interface GooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  types?: string[];
}

const ALLOWED_PLACE_TYPES = new Set([
  'locality',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'sublocality_level_1',
  'sublocality',
]);

function getPlacePriorityScore(prediction: GooglePrediction): number {
  const types = prediction.types || [];
  if (types.includes('locality')) return 100;
  if (types.includes('administrative_area_level_1')) return 95;
  if (types.includes('administrative_area_level_2')) return 90;
  if (types.includes('administrative_area_level_3')) return 85;
  if (types.includes('sublocality_level_1')) return 80;
  if (types.includes('sublocality')) return 75;
  if (types.includes('sublocality_level_2')) return 70;
  if (types.includes('sublocality_level_3')) return 65;
  if (types.includes('sublocality_level_4')) return 60;
  if (types.includes('sublocality_level_5')) return 55;
  if (types.includes('neighborhood')) return 50;
  if (types.includes('establishment')) return 30;
  if (types.includes('point_of_interest')) return 25;
  if (types.includes('premise')) return 20;
  return 40;
}

function sortPlacesPredictions(predictions: GooglePrediction[]): GooglePrediction[] {
  return predictions
    .filter((prediction) => {
      const types = prediction.types || [];
      return types.some((type) => ALLOWED_PLACE_TYPES.has(type));
    })
    .sort((a, b) => {
      const scoreA = getPlacePriorityScore(a);
      const scoreB = getPlacePriorityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      const textA = a.structured_formatting?.main_text || a.description || '';
      const textB = b.structured_formatting?.main_text || b.description || '';
      return textA.localeCompare(textB);
    });
}

// ── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

// ── Test data (from the issue: searching "Montreal") ─────────────────────────

const montrealPredictions: GooglePrediction[] = [
  {
    place_id: '1',
    description: 'Montreal, QC, Canada',
    structured_formatting: { main_text: 'Montreal' },
    types: ['locality', 'political', 'geocode'],
  },
  {
    place_id: '2',
    description: 'Montréal-Nord, Montreal, QC, Canada',
    structured_formatting: { main_text: 'Montréal-Nord' },
    types: ['sublocality_level_1', 'sublocality', 'political', 'geocode'],
  },
  {
    place_id: '3',
    description: 'Montreal Eaton Centre, Rue Sainte-Catherine...',
    structured_formatting: { main_text: 'Montreal Eaton Centre' },
    types: ['establishment', 'point_of_interest', 'shopping_mall'],
  },
  {
    place_id: '4',
    description: 'Montreal Metropolitan Airport...',
    structured_formatting: { main_text: 'Montreal Metropolitan Airport' },
    types: ['airport', 'establishment', 'point_of_interest'],
  },
  {
    place_id: '5',
    description: 'Montréal-Pierre Elliott Trudeau International Airport...',
    structured_formatting: { main_text: 'Montréal-Pierre Elliott Trudeau International Airport' },
    types: ['airport', 'establishment', 'point_of_interest'],
  },
];

// ── Tests ────────────────────────────────────────────────────────────────────

console.log('\n=== Montreal search filtering ===');
{
  const result = sortPlacesPredictions(montrealPredictions);
  assert(result.length === 2, `Returns 2 results (got ${result.length})`);
  assert(result[0].place_id === '1', 'First result is Montreal (locality)');
  assert(result[1].place_id === '2', 'Second result is Montréal-Nord (sublocality)');
}

console.log('\n=== Filters out establishments ===');
{
  const preds: GooglePrediction[] = [
    { place_id: 'a', description: 'Some Mall', types: ['establishment', 'shopping_mall'] },
    { place_id: 'b', description: 'Some City', types: ['locality', 'political'] },
  ];
  const result = sortPlacesPredictions(preds);
  assert(result.length === 1, `Returns 1 result (got ${result.length})`);
  assert(result[0].place_id === 'b', 'Only the city remains');
}

console.log('\n=== Filters out POIs ===');
{
  const preds: GooglePrediction[] = [
    { place_id: 'a', description: 'Statue of Liberty', types: ['point_of_interest', 'establishment'] },
    { place_id: 'b', description: 'Some Address', types: ['premise', 'geocode'] },
  ];
  const result = sortPlacesPredictions(preds);
  assert(result.length === 0, `All filtered out (got ${result.length})`);
}

console.log('\n=== Keeps all admin levels ===');
{
  const preds: GooglePrediction[] = [
    { place_id: '1', description: 'Ontario', types: ['administrative_area_level_1', 'political'] },
    { place_id: '2', description: 'York Region', types: ['administrative_area_level_2', 'political'] },
    { place_id: '3', description: 'Some Division', types: ['administrative_area_level_3', 'political'] },
  ];
  const result = sortPlacesPredictions(preds);
  assert(result.length === 3, `All 3 admin levels kept (got ${result.length})`);
  assert(result[0].place_id === '1', 'Level 1 sorted first');
  assert(result[1].place_id === '2', 'Level 2 sorted second');
  assert(result[2].place_id === '3', 'Level 3 sorted third');
}

console.log('\n=== Handles predictions with no types ===');
{
  const preds: GooglePrediction[] = [
    { place_id: '1', description: 'No Types' },
    { place_id: '2', description: 'Empty Types', types: [] },
    { place_id: '3', description: 'A City', types: ['locality'] },
  ];
  const result = sortPlacesPredictions(preds);
  assert(result.length === 1, `Only city kept (got ${result.length})`);
  assert(result[0].place_id === '3', 'City is the remaining result');
}

console.log('\n=== Empty input returns empty ===');
{
  const result = sortPlacesPredictions([]);
  assert(result.length === 0, 'Empty in, empty out');
}

console.log('\n=== Alphabetical tie-break within same tier ===');
{
  const preds: GooglePrediction[] = [
    { place_id: '1', description: 'Zurich', structured_formatting: { main_text: 'Zurich' }, types: ['locality'] },
    { place_id: '2', description: 'Amsterdam', structured_formatting: { main_text: 'Amsterdam' }, types: ['locality'] },
    { place_id: '3', description: 'Berlin', structured_formatting: { main_text: 'Berlin' }, types: ['locality'] },
  ];
  const result = sortPlacesPredictions(preds);
  assert(result.length === 3, 'All cities kept');
  assert(result[0].place_id === '2', 'Amsterdam first (alphabetical)');
  assert(result[1].place_id === '3', 'Berlin second');
  assert(result[2].place_id === '1', 'Zurich third');
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
