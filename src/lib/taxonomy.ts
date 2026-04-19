export const REGIONS = [
  { name: "Eindhoven", sub: "Brainport regio" },
  { name: "'s-Hertogenbosch", sub: "Historisch centrum" },
  { name: "Tilburg", sub: "Logistieke hotspot" },
  { name: "Breda", sub: "West-Brabant" },
] as const;

export const PROPERTY_TYPES = [
  { value: "woning", label: "Woning", desc: "Eengezins- of meergezinswoningen als belegging." },
  { value: "appartement", label: "Appartement", desc: "Losse of complexe appartementsbeleggingen." },
  { value: "commercieel", label: "Commercieel vastgoed", desc: "Winkels, kantoren of bedrijfsruimtes." },
  { value: "gemengd", label: "Gemengd complex", desc: "Combinatie van wonen en commercieel onder één dak." },
  { value: "nieuwbouw", label: "Nieuwbouw", desc: "Grondposities en nieuwbouwontwikkelingen." },
  { value: "transformatie", label: "Transformatie project", desc: "Herontwikkeling van bestaande panden." },
  { value: "kamerverhuur", label: "Kamerverhuur", desc: "Panden geschikt voor of ingericht als kamerverhuur." },
  { value: "grondgebonden", label: "Grondgebonden woning", desc: "Eengezinswoningen als langetermijn belegging." },
] as const;

export type PropertyTypeValue = typeof PROPERTY_TYPES[number]["value"];

export const propertyTypeLabel = (value: string | null | undefined): string =>
  PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value ?? "";
