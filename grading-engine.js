// ═══════════════════════════════════════════════════════════════════
// LEASECHECKR GRADING ENGINE v2.0
// Production scoring module — weighted median, tiered matching,
// phased confidence, segment normalization
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────
// SECTION A: VEHICLE SEGMENT + VALUE LOOKUP
// ─────────────────────────────────────────

const VEHICLE_SEGMENTS = {
  // Format: "Make|Model": { segment: "...", body: "...", defaultMSRP: number }
  // segment: compact_suv_luxury, midsize_suv_mainstream, etc.
  // body: suv, sedan, truck, van, hatchback, coupe, ev_suv
  // defaultMSRP: approximate base MSRP for value band fallback

  // ACURA
  "Acura|Integra":    { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:33500 },
  "Acura|TLX":        { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:40000 },
  "Acura|RDX":        { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:42000 },
  "Acura|MDX":        { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:50000 },
  "Acura|ADX":        { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:38000 },

  // AUDI
  "Audi|A4":          { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:42000 },
  "Audi|A5":          { segment:"compact_sedan_luxury", body:"coupe", defaultMSRP:46000 },
  "Audi|A6":          { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:58000 },
  "Audi|Q3":          { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:40000 },
  "Audi|Q5":          { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:46000 },
  "Audi|Q7":          { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:60000 },
  "Audi|Q8":          { segment:"fullsize_suv_luxury",  body:"suv",   defaultMSRP:74000 },
  "Audi|Q8 e-tron":   { segment:"midsize_suv_luxury",   body:"ev_suv",defaultMSRP:74000 },
  "Audi|e-tron GT":   { segment:"fullsize_sedan_luxury", body:"sedan",defaultMSRP:106000 },

  // BMW
  "BMW|X1":           { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:40000 },
  "BMW|X3":           { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:48000 },
  "BMW|X5":           { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:64000 },
  "BMW|X7":           { segment:"fullsize_suv_luxury",  body:"suv",   defaultMSRP:80000 },
  "BMW|3 Series":     { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:44000 },
  "BMW|5 Series":     { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:56000 },
  "BMW|i4":           { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:52000 },
  "BMW|i5":           { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:68000 },
  "BMW|iX":           { segment:"midsize_suv_luxury",   body:"ev_suv",defaultMSRP:88000 },
  "BMW|i7":           { segment:"fullsize_sedan_luxury", body:"sedan",defaultMSRP:106000 },

  // BUICK
  "Buick|Encore GX":  { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:28000 },
  "Buick|Envista":    { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:24000 },
  "Buick|Envision":   { segment:"compact_suv_mainstream",    body:"suv", defaultMSRP:36000 },
  "Buick|Enclave":    { segment:"midsize_suv_mainstream",    body:"suv", defaultMSRP:46000 },

  // CADILLAC
  "Cadillac|CT4":         { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:36000 },
  "Cadillac|CT5":         { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:40000 },
  "Cadillac|XT4":         { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:38000 },
  "Cadillac|XT5":         { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:46000 },
  "Cadillac|XT6":         { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:52000 },
  "Cadillac|LYRIQ":       { segment:"midsize_suv_luxury",   body:"ev_suv",defaultMSRP:60000 },
  "Cadillac|Escalade":    { segment:"fullsize_suv_luxury",  body:"suv",   defaultMSRP:82000 },
  "Cadillac|Escalade IQ": { segment:"fullsize_suv_luxury",  body:"ev_suv",defaultMSRP:130000 },
  "Cadillac|Vistiq":      { segment:"midsize_suv_luxury",   body:"ev_suv",defaultMSRP:68000 },
  "Cadillac|Optiq":       { segment:"compact_suv_luxury",   body:"ev_suv",defaultMSRP:54000 },

  // CHEVROLET
  "Chevrolet|Trax":        { segment:"subcompact_suv_mainstream", body:"suv",   defaultMSRP:22000 },
  "Chevrolet|Trailblazer": { segment:"subcompact_suv_mainstream", body:"suv",   defaultMSRP:24000 },
  "Chevrolet|Equinox":     { segment:"compact_suv_mainstream",    body:"suv",   defaultMSRP:32000 },
  "Chevrolet|Equinox EV":  { segment:"compact_suv_mainstream",    body:"ev_suv",defaultMSRP:35000 },
  "Chevrolet|Blazer":      { segment:"midsize_suv_mainstream",    body:"suv",   defaultMSRP:38000 },
  "Chevrolet|Traverse":    { segment:"midsize_suv_mainstream",    body:"suv",   defaultMSRP:38000 },
  "Chevrolet|Tahoe":       { segment:"fullsize_suv_mainstream",   body:"suv",   defaultMSRP:58000 },
  "Chevrolet|Silverado":   { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:42000 },
  "Chevrolet|Silverado 1500": { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:42000 },

  // CHRYSLER
  "Chrysler|Pacifica":        { segment:"minivan_mainstream", body:"van", defaultMSRP:40000 },
  "Chrysler|Pacifica Hybrid": { segment:"minivan_mainstream", body:"van", defaultMSRP:52000 },

  // DODGE
  "Dodge|Hornet":  { segment:"compact_suv_mainstream", body:"suv",   defaultMSRP:34000 },
  "Dodge|Charger": { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:34000 },
  "Dodge|Durango": { segment:"midsize_suv_mainstream", body:"suv",   defaultMSRP:40000 },

  // FORD
  "Ford|Escape":          { segment:"compact_suv_mainstream",    body:"suv",   defaultMSRP:32000 },
  "Ford|Bronco Sport":    { segment:"compact_suv_mainstream",    body:"suv",   defaultMSRP:32000 },
  "Ford|Bronco":          { segment:"midsize_suv_mainstream",    body:"suv",   defaultMSRP:38000 },
  "Ford|Explorer":        { segment:"midsize_suv_mainstream",    body:"suv",   defaultMSRP:40000 },
  "Ford|Expedition":      { segment:"fullsize_suv_mainstream",   body:"suv",   defaultMSRP:58000 },
  "Ford|F-150":           { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:38000 },
  "Ford|F-150 Lightning": { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:52000 },
  "Ford|Mustang Mach-E":  { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:44000 },
  "Ford|Mustang":         { segment:"sport_mainstream",          body:"coupe", defaultMSRP:32000 },

  // GENESIS
  "Genesis|G70":              { segment:"compact_sedan_luxury", body:"sedan",  defaultMSRP:40000 },
  "Genesis|G80":              { segment:"midsize_sedan_luxury", body:"sedan",  defaultMSRP:55000 },
  "Genesis|G90":              { segment:"fullsize_sedan_luxury", body:"sedan", defaultMSRP:90000 },
  "Genesis|GV70":             { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:44000 },
  "Genesis|GV80":             { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:55000 },
  "Genesis|Electrified GV70": { segment:"compact_suv_luxury",   body:"ev_suv",defaultMSRP:66000 },
  "Genesis|GV60":             { segment:"compact_suv_luxury",   body:"ev_suv",defaultMSRP:52000 },

  // GMC
  "GMC|Terrain":     { segment:"compact_suv_mainstream",    body:"suv",   defaultMSRP:36000 },
  "GMC|Acadia":      { segment:"midsize_suv_mainstream",    body:"suv",   defaultMSRP:40000 },
  "GMC|Yukon":       { segment:"fullsize_suv_mainstream",   body:"suv",   defaultMSRP:62000 },
  "GMC|Sierra 1500": { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:42000 },
  "GMC|Sierra EV":   { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:60000 },

  // HONDA
  "Honda|Civic":      { segment:"compact_sedan_mainstream", body:"sedan",     defaultMSRP:25000 },
  "Honda|Civic Hybrid": { segment:"compact_sedan_mainstream", body:"sedan",   defaultMSRP:30000 },
  "Honda|Accord":     { segment:"midsize_sedan_mainstream", body:"sedan",     defaultMSRP:30000 },
  "Honda|HR-V":       { segment:"subcompact_suv_mainstream", body:"suv",      defaultMSRP:26000 },
  "Honda|CR-V":       { segment:"compact_suv_mainstream",   body:"suv",       defaultMSRP:33000 },
  "Honda|CR-V Hybrid": { segment:"compact_suv_mainstream",  body:"suv",       defaultMSRP:35000 },
  "Honda|Pilot":      { segment:"midsize_suv_mainstream",   body:"suv",       defaultMSRP:40000 },
  "Honda|Ridgeline":  { segment:"midsize_truck_mainstream", body:"truck",     defaultMSRP:42000 },
  "Honda|Prologue":   { segment:"midsize_suv_mainstream",   body:"ev_suv",    defaultMSRP:48000 },

  // HYUNDAI
  "Hyundai|Elantra":        { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:24000 },
  "Hyundai|Elantra Hybrid": { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:26000 },
  "Hyundai|Sonata":         { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:30000 },
  "Hyundai|Kona":           { segment:"subcompact_suv_mainstream", body:"suv",  defaultMSRP:26000 },
  "Hyundai|Tucson":         { segment:"compact_suv_mainstream",   body:"suv",   defaultMSRP:32000 },
  "Hyundai|Santa Fe":       { segment:"midsize_suv_mainstream",   body:"suv",   defaultMSRP:36000 },
  "Hyundai|Palisade":       { segment:"fullsize_suv_mainstream",  body:"suv",   defaultMSRP:40000 },
  "Hyundai|IONIQ 5":        { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:44000 },
  "Hyundai|IONIQ 6":        { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:44000 },

  // INFINITI
  "Infiniti|Q50":  { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:44000 },
  "Infiniti|QX50": { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:42000 },
  "Infiniti|QX55": { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:48000 },
  "Infiniti|QX60": { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:52000 },
  "Infiniti|QX80": { segment:"fullsize_suv_luxury",  body:"suv",   defaultMSRP:76000 },

  // JEEP
  "Jeep|Compass":          { segment:"compact_suv_mainstream",  body:"suv", defaultMSRP:32000 },
  "Jeep|Renegade":         { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:28000 },
  "Jeep|Grand Cherokee":   { segment:"midsize_suv_mainstream",  body:"suv", defaultMSRP:42000 },
  "Jeep|Grand Cherokee L": { segment:"midsize_suv_mainstream",  body:"suv", defaultMSRP:44000 },
  "Jeep|Wrangler":         { segment:"midsize_suv_mainstream",  body:"suv", defaultMSRP:36000 },
  "Jeep|Wagoneer":         { segment:"fullsize_suv_luxury",     body:"suv", defaultMSRP:62000 },
  "Jeep|Wagoneer S":       { segment:"midsize_suv_luxury",      body:"ev_suv", defaultMSRP:72000 },
  "Jeep|Grand Wagoneer":   { segment:"fullsize_suv_luxury",     body:"suv", defaultMSRP:92000 },

  // KIA
  "Kia|Forte":     { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:22000 },
  "Kia|K5":        { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:28000 },
  "Kia|Sportage":  { segment:"compact_suv_mainstream",   body:"suv",   defaultMSRP:32000 },
  "Kia|Sorento":   { segment:"midsize_suv_mainstream",   body:"suv",   defaultMSRP:36000 },
  "Kia|Telluride": { segment:"midsize_suv_mainstream",   body:"suv",   defaultMSRP:38000 },
  "Kia|EV6":       { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:44000 },
  "Kia|EV9":       { segment:"midsize_suv_mainstream",   body:"ev_suv",defaultMSRP:58000 },
  "Kia|Carnival":  { segment:"minivan_mainstream",       body:"van",   defaultMSRP:36000 },

  // LEXUS
  "Lexus|ES":  { segment:"midsize_sedan_luxury",  body:"sedan", defaultMSRP:44000 },
  "Lexus|IS":  { segment:"compact_sedan_luxury",  body:"sedan", defaultMSRP:42000 },
  "Lexus|NX":  { segment:"compact_suv_luxury",    body:"suv",   defaultMSRP:42000 },
  "Lexus|RX":  { segment:"midsize_suv_luxury",    body:"suv",   defaultMSRP:50000 },
  "Lexus|TX":  { segment:"midsize_suv_luxury",    body:"suv",   defaultMSRP:56000 },
  "Lexus|GX":  { segment:"midsize_suv_luxury",    body:"suv",   defaultMSRP:65000 },
  "Lexus|LX":  { segment:"fullsize_suv_luxury",   body:"suv",   defaultMSRP:92000 },
  "Lexus|RZ":  { segment:"compact_suv_luxury",    body:"ev_suv",defaultMSRP:44000 },

  // LINCOLN
  "Lincoln|Corsair":   { segment:"compact_suv_luxury",  body:"suv", defaultMSRP:40000 },
  "Lincoln|Nautilus":  { segment:"midsize_suv_luxury",  body:"suv", defaultMSRP:46000 },
  "Lincoln|Aviator":   { segment:"midsize_suv_luxury",  body:"suv", defaultMSRP:56000 },
  "Lincoln|Navigator": { segment:"fullsize_suv_luxury", body:"suv", defaultMSRP:82000 },

  // MAZDA
  "Mazda|Mazda3": { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:26000 },
  "Mazda|CX-5":   { segment:"compact_suv_mainstream",  body:"suv",   defaultMSRP:32000 },
  "Mazda|CX-30":  { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:28000 },
  "Mazda|CX-50":  { segment:"compact_suv_mainstream",  body:"suv",   defaultMSRP:32000 },
  "Mazda|CX-70":  { segment:"midsize_suv_mainstream",  body:"suv",   defaultMSRP:42000 },
  "Mazda|CX-90":  { segment:"midsize_suv_mainstream",  body:"suv",   defaultMSRP:42000 },

  // MERCEDES-BENZ
  "Mercedes-Benz|C-Class": { segment:"compact_sedan_luxury", body:"sedan", defaultMSRP:48000 },
  "Mercedes-Benz|E-Class": { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:60000 },
  "Mercedes-Benz|S-Class": { segment:"fullsize_sedan_luxury", body:"sedan",defaultMSRP:118000 },
  "Mercedes-Benz|GLA":     { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:42000 },
  "Mercedes-Benz|GLB":     { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:44000 },
  "Mercedes-Benz|GLC":     { segment:"compact_suv_luxury",   body:"suv",   defaultMSRP:48000 },
  "Mercedes-Benz|GLE":     { segment:"midsize_suv_luxury",   body:"suv",   defaultMSRP:62000 },
  "Mercedes-Benz|GLS":     { segment:"fullsize_suv_luxury",  body:"suv",   defaultMSRP:82000 },
  "Mercedes-Benz|EQB":     { segment:"compact_suv_luxury",   body:"ev_suv",defaultMSRP:50000 },
  "Mercedes-Benz|EQE":     { segment:"midsize_sedan_luxury", body:"sedan", defaultMSRP:76000 },
  "Mercedes-Benz|EQS":     { segment:"fullsize_sedan_luxury", body:"sedan",defaultMSRP:106000 },

  // NISSAN
  "Nissan|Sentra":     { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:22000 },
  "Nissan|Altima":     { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:28000 },
  "Nissan|Kicks":      { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:22000 },
  "Nissan|Rogue":      { segment:"compact_suv_mainstream",   body:"suv",  defaultMSRP:32000 },
  "Nissan|Murano":     { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:40000 },
  "Nissan|Pathfinder": { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:40000 },
  "Nissan|Ariya":      { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:44000 },
  "Nissan|Frontier":   { segment:"midsize_truck_mainstream", body:"truck", defaultMSRP:32000 },

  // RAM
  "Ram|1500":     { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:42000 },
  "Ram|1500 REV": { segment:"fullsize_truck_mainstream", body:"truck", defaultMSRP:60000 },

  // SUBARU
  "Subaru|Impreza":   { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:24000 },
  "Subaru|Crosstrek": { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:30000 },
  "Subaru|Forester":  { segment:"compact_suv_mainstream",   body:"suv",  defaultMSRP:34000 },
  "Subaru|Outback":   { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:32000 },
  "Subaru|Ascent":    { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:38000 },
  "Subaru|Solterra":  { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:44000 },

  // TESLA
  "Tesla|Model 3": { segment:"compact_sedan_mainstream", body:"sedan",  defaultMSRP:42000 },
  "Tesla|Model Y": { segment:"compact_suv_mainstream",   body:"ev_suv", defaultMSRP:48000 },
  "Tesla|Model S": { segment:"fullsize_sedan_luxury",    body:"sedan",  defaultMSRP:80000 },
  "Tesla|Model X": { segment:"fullsize_suv_luxury",      body:"ev_suv", defaultMSRP:88000 },

  // TOYOTA
  "Toyota|Corolla":           { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:24000 },
  "Toyota|Camry":             { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:30000 },
  "Toyota|RAV4":              { segment:"compact_suv_mainstream",   body:"suv",   defaultMSRP:32000 },
  "Toyota|RAV4 Hybrid":       { segment:"compact_suv_mainstream",  body:"suv",   defaultMSRP:34000 },
  "Toyota|RAV4 Prime":        { segment:"compact_suv_mainstream",  body:"suv",   defaultMSRP:44000 },
  "Toyota|Highlander":        { segment:"midsize_suv_mainstream",  body:"suv",   defaultMSRP:40000 },
  "Toyota|Highlander Hybrid": { segment:"midsize_suv_mainstream",  body:"suv",   defaultMSRP:42000 },
  "Toyota|4Runner":           { segment:"midsize_suv_mainstream",  body:"suv",   defaultMSRP:42000 },
  "Toyota|Tacoma":            { segment:"midsize_truck_mainstream", body:"truck", defaultMSRP:34000 },
  "Toyota|Tundra":            { segment:"fullsize_truck_mainstream", body:"truck",defaultMSRP:42000 },
  "Toyota|bZ4X":              { segment:"compact_suv_mainstream",  body:"ev_suv",defaultMSRP:44000 },
  "Toyota|Crown":             { segment:"midsize_sedan_mainstream", body:"sedan", defaultMSRP:42000 },

  // VOLKSWAGEN
  "Volkswagen|Jetta":             { segment:"compact_sedan_mainstream", body:"sedan", defaultMSRP:24000 },
  "Volkswagen|Taos":              { segment:"subcompact_suv_mainstream", body:"suv", defaultMSRP:26000 },
  "Volkswagen|Tiguan":            { segment:"compact_suv_mainstream",   body:"suv",  defaultMSRP:32000 },
  "Volkswagen|Atlas":             { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:40000 },
  "Volkswagen|Atlas Cross Sport": { segment:"midsize_suv_mainstream",   body:"suv",  defaultMSRP:38000 },
  "Volkswagen|ID.4":              { segment:"compact_suv_mainstream",   body:"ev_suv",defaultMSRP:42000 },
  "Volkswagen|ID.Buzz":           { segment:"minivan_mainstream",       body:"van",  defaultMSRP:62000 },

  // VOLVO
  "Volvo|XC40": { segment:"compact_suv_luxury",  body:"suv",    defaultMSRP:40000 },
  "Volvo|XC60": { segment:"compact_suv_luxury",  body:"suv",    defaultMSRP:46000 },
  "Volvo|XC90": { segment:"midsize_suv_luxury",  body:"suv",    defaultMSRP:58000 },
  "Volvo|S60":  { segment:"compact_sedan_luxury", body:"sedan",  defaultMSRP:42000 },
  "Volvo|EX30": { segment:"subcompact_suv_luxury", body:"ev_suv",defaultMSRP:36000 },
  "Volvo|EX90": { segment:"midsize_suv_luxury",  body:"ev_suv", defaultMSRP:80000 },

  // LAND ROVER / RIVIAN / PORSCHE
  "Land Rover|Range Rover Sport": { segment:"midsize_suv_luxury", body:"suv", defaultMSRP:84000 },
  "Land Rover|Range Rover":       { segment:"fullsize_suv_luxury", body:"suv", defaultMSRP:105000 },
  "Rivian|R1S":                   { segment:"midsize_suv_luxury", body:"ev_suv", defaultMSRP:80000 },
  "Rivian|R1T":                   { segment:"midsize_truck_luxury", body:"truck", defaultMSRP:75000 },
  "Porsche|Macan":                { segment:"compact_suv_luxury", body:"suv", defaultMSRP:62000 },
  "Porsche|Cayenne":              { segment:"midsize_suv_luxury", body:"suv", defaultMSRP:76000 },
};


// ─────────────────────────────────────────
// SECTION B: HELPER FUNCTIONS
// ─────────────────────────────────────────

// Compute Effective Monthly Cost
function computeEMC(monthlyPayment, dueAtSigning, termMonths) {
  const pay = parseFloat(monthlyPayment) || 0;
  const das = parseFloat(dueAtSigning) || 0;
  const term = parseInt(termMonths) || 36;
  if (pay <= 0) return 0;
  // Subtract first payment from DAS before amortizing
  const adjustedDriveOff = Math.max(0, das - pay);
  return pay + (adjustedDriveOff / term);
}

// Get value band from MSRP
function getValueBand(msrp) {
  if (!msrp || msrp <= 0) return 'unknown';
  if (msrp < 30000) return 'band_1';
  if (msrp < 45000) return 'band_2';
  if (msrp < 65000) return 'band_3';
  return 'band_4';
}

// Check if two value bands are adjacent
function bandsAdjacent(a, b) {
  if (a === 'unknown' || b === 'unknown') return true; // treat unknown as compatible
  const order = ['band_1', 'band_2', 'band_3', 'band_4'];
  return Math.abs(order.indexOf(a) - order.indexOf(b)) <= 1;
}

// Get mileage band (broader grouping for early data)
function getMileageBand(miles) {
  const m = parseInt(miles) || 10000;
  if (m <= 7500) return 'low';
  if (m <= 12000) return 'standard';
  return 'high';
}

// Look up vehicle segment info
function getVehicleInfo(make, model) {
  const key = make + '|' + model;
  return VEHICLE_SEGMENTS[key] || null;
}

// Get vehicle MSRP for value band (from deal data, or lookup fallback)
function resolveValueBand(make, model, msrp, capCost) {
  if (msrp && msrp > 0) return getValueBand(msrp);
  if (capCost && capCost > 0) return getValueBand(capCost);
  const info = getVehicleInfo(make, model);
  if (info) return getValueBand(info.defaultMSRP);
  return 'unknown';
}

// Recency weight based on deal age
function recencyWeight(createdAt) {
  if (!createdAt) return 0.65;
  const now = new Date();
  const created = new Date(createdAt);
  const daysDiff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 90) return 1.00;
  if (daysDiff <= 180) return 0.85;
  if (daysDiff <= 365) return 0.65;
  return 0.40;
}

// Verification weight
function verificationWeight(trustTier) {
  if (trustTier === 'high') return 1.00;
  if (trustTier === 'medium') return 0.75;
  return 0.50;
}

// Weighted median calculation
function weightedMedian(values, weights) {
  if (!values.length) return null;
  if (values.length === 1) return values[0];

  // Create pairs and sort by value
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] }))
    .sort((a, b) => a.value - b.value);

  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return null;

  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= totalWeight / 2) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

// Weighted percentile
function weightedPercentile(values, weights, percentile) {
  if (!values.length) return null;
  const pairs = values.map((v, i) => ({ value: v, weight: weights[i] }))
    .sort((a, b) => a.value - b.value);
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return null;

  const target = totalWeight * (percentile / 100);
  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= target) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

// NJ ZIP → County mapping
function zipToCounty(zip) {
  if (!zip || zip.length < 5) {
    // Try 3-digit prefix fallback
    if (zip && zip.length >= 3) {
      const p = zip.substring(0, 3);
      const prefixMap = {
        '074': 'Bergen', '075': 'Bergen',
        '070': 'Essex', '071': 'Essex',
        '073': 'Hudson',
        '079': 'Morris',
        '076': 'Passaic',
        '072': 'Union',
        '078': 'Somerset',
        '088': 'Middlesex', '089': 'Middlesex',
        '087': 'Monmouth',
        '086': 'Burlington',
        '085': 'Mercer',
        '077': 'Ocean',
        '080': 'Camden',
        '081': 'Camden',
        '083': 'Atlantic',
        '082': 'Gloucester',
        '084': 'Cape May'
      };
      return prefixMap[p] || null;
    }
    return null;
  }
  // Full 5-digit ZIP lookup for accuracy where 3-digit prefix is ambiguous
  const z = parseInt(zip);
  // Ocean County ZIPs
  if ([8701,8721,8722,8723,8724,8731,8732,8733,8734,8735,8738,8739,8740,8741,8742,8750,8751,8752,8753,8754,8755,8756,8757,8758,8759,8005,8006,8008,8050,8087,8092].includes(z)) return 'Ocean';
  // Bergen
  if (z >= 7401 && z <= 7677) return 'Bergen';
  // Essex
  if (z >= 7001 && z <= 7114) return 'Essex';
  // Hudson
  if (z >= 7002 && z <= 7399) {
    if ([7002,7029,7030,7032,7047,7057,7086,7087,7093,7094,7096,7097,7302,7303,7304,7305,7306,7307,7310,7311].includes(z)) return 'Hudson';
  }
  // Morris
  if (z >= 7801 && z <= 7999) return 'Morris';
  // Passaic
  if ([7424,7501,7502,7503,7504,7505,7506,7507,7508,7509,7510,7511,7512,7513,7514,7522,7524,7538,7543,7544,7601,7652].includes(z)) return 'Passaic';
  
  // Fall back to 3-digit prefix
  const p = zip.substring(0, 3);
  const prefixMap = {
    '074': 'Bergen', '075': 'Bergen',
    '070': 'Essex', '071': 'Essex',
    '073': 'Hudson',
    '079': 'Morris',
    '076': 'Passaic',
    '072': 'Union',
    '078': 'Somerset',
    '088': 'Middlesex', '089': 'Middlesex',
    '087': 'Monmouth',
    '086': 'Burlington',
    '085': 'Mercer',
    '077': 'Ocean',
    '080': 'Camden',
    '081': 'Camden',
    '083': 'Atlantic',
    '082': 'Gloucester',
    '084': 'Cape May'
  };
  return prefixMap[p] || null;
}

// Region grouping for broader geographic matching
function countyToRegion(county) {
  const regions = {
    'North': ['Bergen', 'Passaic', 'Hudson', 'Essex', 'Morris', 'Sussex', 'Warren'],
    'Central': ['Middlesex', 'Somerset', 'Union', 'Monmouth', 'Mercer', 'Hunterdon'],
    'South': ['Burlington', 'Camden', 'Gloucester', 'Atlantic', 'Ocean', 'Cape May', 'Salem', 'Cumberland']
  };
  for (const [region, counties] of Object.entries(regions)) {
    if (counties.includes(county)) return region;
  }
  return null;
}


// ─────────────────────────────────────────
// SECTION C: CORE GRADING ENGINE
// ─────────────────────────────────────────

function gradeLeaseV2(userDeal, benchmarkDeals, totalDealCount) {

  // ── Parse user deal ──
  const userEMC = computeEMC(userDeal.payment, userDeal.das, userDeal.term);
  const userCounty = userDeal.county || zipToCounty(userDeal.zip);
  const userRegion = countyToRegion(userCounty);
  const userInfo = getVehicleInfo(userDeal.make, userDeal.model);
  const userSegment = userInfo ? userInfo.segment : null;
  const userBody = userInfo ? userInfo.body : null;
  const userValueBand = resolveValueBand(userDeal.make, userDeal.model, userDeal.msrp, userDeal.capcost);
  const userMileageBand = getMileageBand(userDeal.mileage);
  const userTerm = parseInt(userDeal.term) || 36;

  if (userEMC <= 0) {
    return {
      emc: 0, grade: null, verdict: 'Invalid Input', confidence: 'Limited',
      grade_eligible: false, benchmark_note: 'Monthly payment is required.',
      diagnostics: ['No valid payment provided'], matched_tiers_used: [],
      tier_1_2_count: 0, tier_1_4_count: 0, total_count: 0,
      total_similarity_weight: 0, weighted_median_emc: null,
      weighted_p25_emc: null, weighted_p75_emc: null, diff_pct: null,
      tier_weight_share: {}, segment_used: null, value_band_used: null,
      comparables: [], score_drivers: [], methodology_teaser: '', methodology_full: ''
    };
  }

  // ── Build weighted comparable set ──
  const comparables = [];

  for (const deal of benchmarkDeals) {
    const dealEMC = computeEMC(deal.pay || deal.monthly_payment, deal.das || deal.due_at_signing, deal.trm || deal.term);
    if (dealEMC <= 0) continue;

    const dealCounty = deal.co || deal.county;
    const dealRegion = countyToRegion(dealCounty);
    const dealTerm = parseInt(deal.trm || deal.term) || 36;
    const dealMake = deal.mk || deal.make;
    const dealModel = deal.md || deal.model;
    const dealInfo = getVehicleInfo(dealMake, dealModel);
    const dealSegment = dealInfo ? dealInfo.segment : null;
    const dealBody = dealInfo ? dealInfo.body : null;
    const dealValueBand = resolveValueBand(dealMake, dealModel, deal.msrp, deal.sp || deal.cap_cost);
    const dealMileageBand = getMileageBand(deal.mi || deal.annual_mileage);
    const dealTrustTier = deal.tt || deal.trust_tier || 'medium';

    // Term must be within range (allow ±3 months)
    if (Math.abs(dealTerm - userTerm) > 3) continue;

    // Mileage band must match (broader grouping)
    if (dealMileageBand !== userMileageBand) continue;

    // ── Determine tier ──
    let tier = null;
    const sameModel = (dealMake === userDeal.make && dealModel === userDeal.model);
    const sameCounty = (dealCounty === userCounty);
    const sameRegion = (dealRegion === userRegion);
    const sameSegment = (dealSegment && dealSegment === userSegment);
    const sameValueBand = (dealValueBand === userValueBand);
    const adjacentValueBand = bandsAdjacent(dealValueBand, userValueBand);

    if (sameModel && (sameCounty || sameRegion)) {
      tier = 1;
    } else if (sameModel) {
      tier = 2;
    } else if (sameSegment && sameValueBand && (sameCounty || sameRegion)) {
      tier = 3;
    } else if (sameSegment && sameValueBand) {
      tier = 4;
    } else if (sameSegment && adjacentValueBand) {
      tier = 4; // adjacent value band still tier 4, not tier 3
    } else if (dealBody && dealBody === userBody) {
      tier = 5;
    } else {
      continue; // no match
    }

    // ── Compute weight ──
    const tierWeights = { 1: 1.00, 2: 0.75, 3: 0.50, 4: 0.30, 5: 0.10 };
    const vWeight = verificationWeight(dealTrustTier);
    const rWeight = recencyWeight(deal.created_at);

    // Value band adjustment
    let vbAdj = 1.00;
    if (sameValueBand) vbAdj = 1.00;
    else if (adjacentValueBand) vbAdj = 0.85;
    else if (dealValueBand === 'unknown' || userValueBand === 'unknown') vbAdj = 0.80;

    const finalWeight = tierWeights[tier] * vWeight * rWeight * vbAdj;

    comparables.push({
      make: dealMake, model: dealModel, trim: deal.tr || deal.trim,
      payment: deal.pay || deal.monthly_payment,
      emc: Math.round(dealEMC),
      county: dealCounty, tier, weight: finalWeight,
      dealer: deal.dlr || deal.dealer_name
    });
  }

  // ── Compute tier statistics ──
  const tier12 = comparables.filter(c => c.tier <= 2);
  const tier14 = comparables.filter(c => c.tier <= 4);
  const tier5only = comparables.filter(c => c.tier === 5);

  const tier12Count = tier12.length;
  const tier14Count = tier14.length;
  const totalCount = comparables.length;
  const totalWeight = comparables.reduce((s, c) => s + c.weight, 0);

  const tierShareMap = {};
  for (const c of comparables) {
    tierShareMap[c.tier] = (tierShareMap[c.tier] || 0) + c.weight;
  }
  const tier14WeightShare = (totalWeight > 0)
    ? (Object.entries(tierShareMap).filter(([t]) => parseInt(t) <= 4).reduce((s, [, w]) => s + w, 0) / totalWeight)
    : 0;

  // ── Compute benchmark statistics ──
  const emcValues = comparables.map(c => c.emc);
  const emcWeights = comparables.map(c => c.weight);

  const wMedian = weightedMedian(emcValues, emcWeights);
  const wP25 = weightedPercentile(emcValues, emcWeights, 25);
  const wP75 = weightedPercentile(emcValues, emcWeights, 75);

  // ── Phase-aware grade eligibility ──
  // Phase is determined by total deal count in the system
  const dealVolume = totalDealCount || benchmarkDeals.length;
  let phase, minTier14, minWeight;

  if (dealVolume < 200) {
    // Phase 0: relaxed thresholds
    phase = 0;
    minTier14 = 2;
    minWeight = 1.0;
  } else if (dealVolume < 1000) {
    // Phase 1: moderate thresholds
    phase = 1;
    minTier14 = 3;
    minWeight = 2.0;
  } else {
    // Phase 2: full methodology
    phase = 2;
    minTier14 = 5;
    minWeight = 2.75;
  }

  const gradeEligible = (
    (tier12Count >= 3) ||
    (tier14Count >= minTier14 && totalWeight >= minWeight && tier14WeightShare >= 0.60)
  );

  // ── Grade calculation ──
  let grade = null;
  let verdict = '';
  let diffPct = null;
  let isPreliminary = false;

  if (wMedian && wMedian > 0) {
    diffPct = (userEMC - wMedian) / wMedian;
  }

  if (gradeEligible && diffPct !== null) {
    // Determine if this is a preliminary grade (Phase 0 with weak data)
    isPreliminary = (phase === 0 && tier12Count < 3);

    if (diffPct <= -0.10)      { grade = 'A';  verdict = 'Excellent Deal'; }
    else if (diffPct <= -0.04) { grade = 'B+'; verdict = 'Good Deal'; }
    else if (diffPct <= 0.04)  { grade = 'B';  verdict = 'Fair Deal'; }
    else if (diffPct <= 0.10)  { grade = 'C+'; verdict = 'Slightly Above Market'; }
    else if (diffPct <= 0.18)  { grade = 'C';  verdict = 'Overpaying'; }
    else                       { grade = 'D';  verdict = 'Significantly Overpaying'; }

    if (isPreliminary) {
      verdict = 'Preliminary — ' + verdict;
    }
  } else if (diffPct !== null) {
    // Directional read only
    if (diffPct <= -0.05)      verdict = 'Appears below comparable range';
    else if (diffPct <= 0.05)  verdict = 'Appears near comparable range';
    else                       verdict = 'Appears above comparable range';
  } else {
    verdict = 'Not enough data to evaluate';
  }

  // ── Confidence level ──
  let confidence;
  if (tier12Count >= 4 || (totalWeight >= 3.75 && tier14WeightShare >= 0.70)) {
    confidence = 'High';
  } else if (gradeEligible) {
    confidence = 'Medium';
  } else {
    confidence = 'Limited';
  }

  // Override: Phase 0 preliminary grades cap at Medium
  if (isPreliminary && confidence === 'High') confidence = 'Medium';

  // ── Score drivers (green +, red −, neutral ●, missing ○) ──
  const drivers = [];

  if (diffPct !== null) {
    if (diffPct <= -0.10) {
      drivers.push({ text: 'Effective monthly cost is <strong>well below</strong> comparable deals', impact: 'positive' });
    } else if (diffPct <= 0) {
      drivers.push({ text: 'Effective monthly cost is <strong>at or below</strong> the comparable average', impact: 'positive' });
    } else if (diffPct <= 0.10) {
      drivers.push({ text: 'Effective monthly cost is <strong>above</strong> comparable deals', impact: 'negative' });
    } else {
      drivers.push({ text: 'Effective monthly cost is <strong>significantly above</strong> comparable deals', impact: 'negative' });
    }
  }

  const das = parseFloat(userDeal.das) || 0;
  if (das > 3000) {
    drivers.push({ text: 'High due-at-signing (<strong>$' + das.toLocaleString() + '</strong>) raises effective cost by <strong>$' + Math.round((das - (userDeal.payment || 0)) / userTerm) + '/mo</strong>', impact: 'negative' });
  } else if (das > 0 && das <= 1500) {
    drivers.push({ text: 'Low due-at-signing keeps effective cost close to payment', impact: 'positive' });
  } else if (das > 0) {
    drivers.push({ text: 'Due-at-signing of <strong>$' + das.toLocaleString() + '</strong> factored into effective cost', impact: 'neutral' });
  } else {
    drivers.push({ text: 'No drive-off — effective cost equals payment', impact: 'positive' });
  }

  const mf = parseFloat(userDeal.mf) || 0;
  if (mf > 0) {
    // Estimate buy rate
    const buyRate = Math.max(mf - 0.0006, 0.00050);
    const markup = mf - buyRate;
    if (markup > 0.0004) {
      drivers.push({ text: 'Money factor appears <strong>marked up</strong> — estimated <strong>$' + Math.round(markup * ((userDeal.msrp || 40000) + ((userDeal.msrp || 40000) * ((userDeal.residual || 55) / 100)))) + '/mo extra</strong>', impact: 'negative' });
    } else if (markup <= 0.0001) {
      drivers.push({ text: 'Money factor is <strong>at or near base rate</strong>', impact: 'positive' });
    } else {
      drivers.push({ text: 'Money factor <strong>slightly above base rate</strong>', impact: 'neutral' });
    }
  } else {
    drivers.push({ text: 'Money factor <strong>not provided</strong> — limits precision', impact: 'missing' });
  }

  if (userDeal.residual && userDeal.residual > 0) {
    if (userDeal.residual >= 58) {
      drivers.push({ text: 'Strong residual of <strong>' + userDeal.residual + '%</strong>', impact: 'positive' });
    } else {
      drivers.push({ text: 'Residual of <strong>' + userDeal.residual + '%</strong> factored in', impact: 'neutral' });
    }
  } else {
    drivers.push({ text: 'Residual <strong>not provided</strong>', impact: 'missing' });
  }

  // ── Benchmark note ──
  let benchmarkNote = '';
  const tiersUsed = [...new Set(comparables.map(c => c.tier))].sort();
  const matchLabels = {
    1: 'exact model in your county',
    2: 'same model statewide',
    3: 'similar segment and value locally',
    4: 'similar segment and value statewide',
    5: 'broad vehicle category'
  };

  if (tier12Count >= 3) {
    benchmarkNote = 'Compared against ' + tier12Count + ' verified ' + userDeal.model + ' deals' + (tier12.some(c => c.tier === 1) ? ' in ' + (userCounty || 'NJ') : ' across NJ');
  } else if (tier14Count >= 2) {
    const primary = Math.min(...tiersUsed.filter(t => t <= 4));
    benchmarkNote = 'Compared against ' + tier14Count + ' comparable deals (' + matchLabels[primary] + ')';
  } else if (totalCount > 0) {
    benchmarkNote = 'Limited comparable data — directional read based on ' + totalCount + ' broader matches';
  } else {
    benchmarkNote = 'No comparable verified deals found for this vehicle yet';
  }

  // ── Methodology text (user-facing) ──
  const methodologyTeaser = generateMethodologyTeaser(tiersUsed, tier12Count, tier14Count, totalCount, confidence, userDeal.model, userCounty);
  const methodologyFull = generateMethodologyFull(tiersUsed, tier12Count, tier14Count, totalCount, confidence, grade, isPreliminary, userDeal.model, userCounty, userSegment);

  // ── Diagnostics ──
  const diagnostics = [];
  if (!mf) diagnostics.push('Money factor not provided — cannot assess financing markup');
  if (!userDeal.residual) diagnostics.push('Residual not provided — structural analysis limited');
  if (!userDeal.msrp && !userDeal.capcost) diagnostics.push('MSRP/cap cost not provided — value band estimated from lookup');
  if (tier12Count === 0) diagnostics.push('No exact model matches found — using segment/value comparisons');
  if (isPreliminary) diagnostics.push('Grade is preliminary — based on a small comparison set');

  // ── Return full output ──
  return {
    emc: Math.round(userEMC),
    weighted_median_emc: wMedian ? Math.round(wMedian) : null,
    weighted_p25_emc: wP25 ? Math.round(wP25) : null,
    weighted_p75_emc: wP75 ? Math.round(wP75) : null,
    diff_pct: diffPct !== null ? Math.round(diffPct * 1000) / 1000 : null,
    grade,
    verdict,
    confidence,
    grade_eligible: gradeEligible,
    is_preliminary: isPreliminary,
    phase,
    tier_1_2_count: tier12Count,
    tier_1_4_count: tier14Count,
    total_count: totalCount,
    total_similarity_weight: Math.round(totalWeight * 100) / 100,
    tier_weight_share: tierShareMap,
    benchmark_note: benchmarkNote,
    diagnostics,
    matched_tiers_used: tiersUsed.map(t => 'tier_' + t),
    segment_used: userSegment,
    value_band_used: userValueBand,
    comparables: comparables.slice(0, 8).map(c => ({
      vehicle: [c.make, c.model, c.trim].filter(Boolean).join(' '),
      payment: c.payment, emc: c.emc, county: c.county,
      tier: c.tier, weight: Math.round(c.weight * 100) / 100,
      dealer: c.dealer
    })),
    score_drivers: drivers,
    methodology_teaser: methodologyTeaser,
    methodology_full: methodologyFull,
    county_label: userCounty ? userCounty + ' Co.' : 'NJ'
  };
}


// ─────────────────────────────────────────
// SECTION D: METHODOLOGY TEXT GENERATION
// ─────────────────────────────────────────

function generateMethodologyTeaser(tiersUsed, tier12Count, tier14Count, totalCount, confidence, model, county) {
  if (totalCount === 0) {
    return 'We don\'t have enough comparable signed deals for this vehicle yet. Help build the benchmark by contributing your lease.';
  }

  let text = '';
  const hasLocalMatches = tiersUsed.includes(1) || tiersUsed.includes(3);

  if (tier12Count >= 3 && hasLocalMatches) {
    text = 'Compared against ' + tier12Count + ' verified ' + (model || '') + ' deals';
    if (county) text += ' in ' + county + ' County and nearby';
    text += '.';
  } else if (tier12Count >= 3) {
    text = 'Compared against ' + tier12Count + ' verified ' + (model || '') + ' deals across NJ.';
    if (county) text += ' No ' + (model || 'model') + ' deals in ' + county + ' County yet.';
  } else if (tier14Count >= 2) {
    text = 'Compared against ' + tier14Count + ' similar vehicles';
    text += hasLocalMatches ? ' in your area.' : ' across NJ.';
    if (tier12Count > 0) text += ' Includes ' + tier12Count + ' exact ' + (model || 'model') + ' match' + (tier12Count > 1 ? 'es' : '') + '.';
  } else {
    text = 'Based on ' + totalCount + ' broader vehicle comparisons. More local data would improve precision.';
  }

  if (confidence === 'Limited') {
    text += ' This is a directional read — not a full benchmark grade.';
  } else if (confidence === 'Medium') {
    text += ' Confidence improves as more deals are contributed.';
  }

  return text;
}

function generateMethodologyFull(tiersUsed, tier12Count, tier14Count, totalCount, confidence, grade, isPreliminary, model, county, segment) {
  const lines = [];

  lines.push('This score is based on your deal\'s effective monthly cost — your payment plus any upfront charges spread across the lease term.');

  if (tier12Count >= 3) {
    lines.push('We found ' + tier12Count + ' verified signed deals on the ' + (model || 'same vehicle') + ' that closely match your lease terms. These are the strongest comparisons available.');
  } else if (tier12Count > 0) {
    lines.push('We found ' + tier12Count + ' exact ' + (model || 'model') + ' match' + (tier12Count > 1 ? 'es' : '') + ', plus ' + (tier14Count - tier12Count) + ' similar vehicles in the same category and price range.');
  } else if (tier14Count > 0) {
    const segmentFriendly = segment ? segment.replace(/_/g, ' ') : 'similar vehicles';
    lines.push('No exact ' + (model || 'model') + ' matches were found yet. We compared against ' + tier14Count + ' deals on ' + segmentFriendly + ' in a similar price range.');
  }

  if (tiersUsed.includes(5) && !tiersUsed.some(t => t <= 4)) {
    lines.push('Only broad vehicle category matches were available. This limits the precision of the comparison.');
  }

  lines.push('Closer matches — same model, same area — count more than broader comparisons. Verified signed deals count more than unverified submissions. Recent deals count more than older ones.');

  if (confidence === 'High') {
    lines.push('We have enough strong comparable data to provide a confident grade.');
  } else if (confidence === 'Medium') {
    lines.push('We have reasonable comparable data, but more local signed deals would sharpen this score.');
  } else {
    lines.push('Comparable data is limited. This is a directional read, not a full benchmark grade. As more NJ drivers contribute deals, scores become more precise.');
  }

  if (isPreliminary) {
    lines.push('This grade is marked as preliminary because it\'s based on a small comparison set. The letter reflects our best current read, but may shift as more data becomes available.');
  }

  return lines.join(' ');
}


// ─────────────────────────────────────────
// SECTION E: PRESENTATION HELPERS
// ─────────────────────────────────────────

// Get grade display properties for the UI
function getGradeDisplay(result) {
  const r = result;

  // Colors
  const gradeColors = {
    'A':  { color: '#3d7a4e', bg: '#e4f0e7', ring: 'ga' },
    'B+': { color: '#5c7a65', bg: '#eaf0ec', ring: 'gb' },
    'B':  { color: '#a8692e', bg: '#f6ecdf', ring: 'gb' },
    'C+': { color: '#a8692e', bg: '#f6ecdf', ring: 'gc' },
    'C':  { color: '#c24838', bg: '#fae6e3', ring: 'gc' },
    'D':  { color: '#c24838', bg: '#fae6e3', ring: 'gd' }
  };

  const gc = gradeColors[r.grade] || { color: '#9e968a', bg: '#f0ede8', ring: 'gb' };

  // Confidence badge
  const confBadge = {
    'High':    { color: '#3d7a4e', bg: '#e4f0e7' },
    'Medium':  { color: '#a8692e', bg: '#f6ecdf' },
    'Limited': { color: '#9e968a', bg: '#f0ede8' }
  }[r.confidence] || { color: '#9e968a', bg: '#f0ede8' };

  // Score driver icons
  const driverIcons = {
    positive: '<span style="color:#3d7a4e;font-weight:700;font-size:1rem;flex-shrink:0;width:18px;text-align:center;">+</span>',
    negative: '<span style="color:#c24838;font-weight:700;font-size:1rem;flex-shrink:0;width:18px;text-align:center;">−</span>',
    neutral:  '<span style="color:#a8692e;font-size:0.85rem;flex-shrink:0;width:18px;text-align:center;">●</span>',
    missing:  '<span style="color:#9e968a;font-size:0.85rem;flex-shrink:0;width:18px;text-align:center;">○</span>'
  };

  return {
    // Grade display
    gradeText: r.grade || '—',
    gradeColor: gc.color,
    gradeBg: gc.bg,
    gradeRingClass: gc.ring,
    isPreliminary: r.is_preliminary,
    showGrade: r.grade !== null,

    // Verdict
    verdict: r.verdict,

    // Confidence
    confidence: r.confidence,
    confColor: confBadge.color,
    confBg: confBadge.bg,

    // EMC comparison
    userEMC: r.emc,
    benchmarkEMC: r.weighted_median_emc,
    diffPct: r.diff_pct,
    countyLabel: r.county_label,

    // Comparable summary
    benchmarkNote: r.benchmark_note,
    totalCount: r.total_count,
    tier12Count: r.tier_1_2_count,

    // Score drivers with icons
    driversHTML: r.score_drivers.map(d =>
      '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">'
      + driverIcons[d.impact]
      + '<span>' + d.text + '</span></div>'
    ).join(''),

    // Methodology
    methodologyTeaser: r.methodology_teaser,
    methodologyFull: r.methodology_full,

    // Top comparables for display
    comparables: r.comparables,

    // Diagnostics
    diagnostics: r.diagnostics
  };
}


// ─────────────────────────────────────────
// SECTION F: EXPORTS (for use in HTML pages)
// ─────────────────────────────────────────

// Make available globally for inline script use
if (typeof window !== 'undefined') {
  window.LeaseCheckrEngine = {
    gradeLeaseV2,
    computeEMC,
    getVehicleInfo,
    getGradeDisplay,
    resolveValueBand,
    getValueBand,
    getMileageBand,
    zipToCounty,
    countyToRegion,
    VEHICLE_SEGMENTS
  };
}
