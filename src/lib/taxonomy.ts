// Taxonomy — single source of truth for regions + property types.
// Admin can add extra regions via `admin_regions` DB table; use
// `useRegions()` hook in UI code to get the merged list.

export const REGIONS = [
  { name: "Amsterdam", sub: "Metropoolregio" },
  { name: "Rotterdam", sub: "Havenstad" },
  { name: "Den Haag", sub: "Bestuurlijk centrum" },
  { name: "Utrecht", sub: "Centraal-Nederland" },
  { name: "Eindhoven", sub: "Brainport regio" },
  { name: "Groningen", sub: "Noord-Nederland" },
  { name: "Tilburg", sub: "Logistieke hotspot" },
  { name: "Almere", sub: "Flevoland" },
  { name: "Breda", sub: "West-Brabant" },
  { name: "Nijmegen", sub: "Rijk van Nijmegen" },
  { name: "'s-Hertogenbosch", sub: "Historisch centrum" },
] as const;

export const PROPERTY_TYPES = [
  { value: "appartement", label: "Appartement", desc: "Losse of complexe appartementsbeleggingen." },
  { value: "commercieel", label: "Commercieel vastgoed", desc: "Winkels, kantoren of bedrijfsruimtes." },
  { value: "gemengd", label: "Gemengd complex", desc: "Combinatie van wonen en commercieel onder één dak." },
  { value: "nieuwbouw", label: "Nieuwbouw", desc: "Grondposities en nieuwbouwontwikkelingen." },
  { value: "transformatie", label: "Transformatie project", desc: "Herontwikkeling van bestaande panden." },
  { value: "kamerverhuur", label: "Kamerverhuur", desc: "Panden geschikt voor of ingericht als kamerverhuur." },
  { value: "grondgebonden", label: "Grondgebonden woning", desc: "Eengezinswoningen als langetermijn belegging." },
  { value: "zorg", label: "Zorgvastgoed", desc: "Zorgwoningen, verpleeg- en verzorgingsinstellingen." },
] as const;

export type PropertyTypeValue = typeof PROPERTY_TYPES[number]["value"];

export const propertyTypeLabel = (value: string | null | undefined): string =>
  PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value ?? "";
