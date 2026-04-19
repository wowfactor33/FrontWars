import { GameMapType, Relation, UnitType, type Gold } from "./Game";

export type PersonalitySeed = {
  aggression: number;
  attackCooldown: number;
  expandThreshold: number;
  jitter: number;
  reserveRatio: number;
};

export type CountryEconomy = {
  goldIncomeMultiplier: number;
  manpowerMultiplier: number;
  oilPerFactory: number;
  oilPerPort: number;
  oilPerTick: number;
  startGold: Gold;
  startOil: Gold;
};

export type CountryKey =
  | "china"
  | "france"
  | "germany"
  | "iran"
  | "poland"
  | "russia"
  | "ukraine"
  | "united_kingdom"
  | "united_states";

export type CountryProfile = {
  aliases: readonly string[];
  economy: CountryEconomy;
  flag: string;
  key: CountryKey;
  name: string;
  personality: PersonalitySeed;
};

export const GEOPOLITICAL_SNAPSHOT = {
  asOf: "2026-04-19",
  label:
    "Official-source-inspired alignment snapshot for fun FrontWars diplomacy and economy",
} as const;

export const DEFAULT_COUNTRY_ECONOMY: CountryEconomy = {
  goldIncomeMultiplier: 1,
  manpowerMultiplier: 1,
  oilPerFactory: 2,
  oilPerPort: 1,
  oilPerTick: 1,
  startGold: 0n,
  startOil: 40n,
};

const COUNTRY_KEYS: readonly CountryKey[] = [
  "united_states",
  "ukraine",
  "russia",
  "china",
  "united_kingdom",
  "iran",
  "germany",
  "france",
  "poland",
];

const COUNTRY_PROFILES: Record<CountryKey, CountryProfile> = {
  china: {
    aliases: ["china", "prc", "people's republic of china", "peoples republic of china"],
    economy: {
      goldIncomeMultiplier: 1.08,
      manpowerMultiplier: 1.12,
      oilPerFactory: 3,
      oilPerPort: 2,
      oilPerTick: 2,
      startGold: 160_000n,
      startOil: 110n,
    },
    flag: "cn",
    key: "china",
    name: "China",
    personality: {
      aggression: 0.58,
      attackCooldown: 6,
      expandThreshold: 2.6,
      jitter: 4.5,
      reserveRatio: 0.34,
    },
  },
  france: {
    aliases: ["france", "french republic"],
    economy: {
      goldIncomeMultiplier: 1.08,
      manpowerMultiplier: 1,
      oilPerFactory: 3,
      oilPerPort: 1,
      oilPerTick: 1,
      startGold: 150_000n,
      startOil: 60n,
    },
    flag: "fr",
    key: "france",
    name: "France",
    personality: {
      aggression: 0.56,
      attackCooldown: 5,
      expandThreshold: 2.4,
      jitter: 2.4,
      reserveRatio: 0.31,
    },
  },
  germany: {
    aliases: ["germany", "federal republic of germany"],
    economy: {
      goldIncomeMultiplier: 1.1,
      manpowerMultiplier: 1,
      oilPerFactory: 3,
      oilPerPort: 1,
      oilPerTick: 1,
      startGold: 155_000n,
      startOil: 55n,
    },
    flag: "de",
    key: "germany",
    name: "Germany",
    personality: {
      aggression: 0.54,
      attackCooldown: 5,
      expandThreshold: 2.35,
      jitter: 2.1,
      reserveRatio: 0.33,
    },
  },
  iran: {
    aliases: ["iran", "islamic republic of iran"],
    economy: {
      goldIncomeMultiplier: 0.9,
      manpowerMultiplier: 0.96,
      oilPerFactory: 2,
      oilPerPort: 3,
      oilPerTick: 3,
      startGold: 120_000n,
      startOil: 170n,
    },
    flag: "ir",
    key: "iran",
    name: "Iran",
    personality: {
      aggression: 0.64,
      attackCooldown: 4,
      expandThreshold: 2.15,
      jitter: 3.8,
      reserveRatio: 0.27,
    },
  },
  poland: {
    aliases: ["poland", "republic of poland"],
    economy: {
      goldIncomeMultiplier: 0.98,
      manpowerMultiplier: 1.04,
      oilPerFactory: 2,
      oilPerPort: 1,
      oilPerTick: 1,
      startGold: 130_000n,
      startOil: 35n,
    },
    flag: "pl",
    key: "poland",
    name: "Poland",
    personality: {
      aggression: 0.62,
      attackCooldown: 4,
      expandThreshold: 2.1,
      jitter: 2.9,
      reserveRatio: 0.28,
    },
  },
  russia: {
    aliases: ["russia", "russian federation"],
    economy: {
      goldIncomeMultiplier: 0.96,
      manpowerMultiplier: 1.1,
      oilPerFactory: 2,
      oilPerPort: 3,
      oilPerTick: 3,
      startGold: 150_000n,
      startOil: 150n,
    },
    flag: "ru",
    key: "russia",
    name: "Russia",
    personality: {
      aggression: 0.7,
      attackCooldown: 4,
      expandThreshold: 2.05,
      jitter: 3.5,
      reserveRatio: 0.24,
    },
  },
  ukraine: {
    aliases: ["ukraine"],
    economy: {
      goldIncomeMultiplier: 0.92,
      manpowerMultiplier: 1,
      oilPerFactory: 2,
      oilPerPort: 1,
      oilPerTick: 1,
      startGold: 90_000n,
      startOil: 45n,
    },
    flag: "ua",
    key: "ukraine",
    name: "Ukraine",
    personality: {
      aggression: 0.68,
      attackCooldown: 4,
      expandThreshold: 1.95,
      jitter: 3.2,
      reserveRatio: 0.25,
    },
  },
  united_kingdom: {
    aliases: ["united kingdom", "uk", "great britain", "britain"],
    economy: {
      goldIncomeMultiplier: 1.05,
      manpowerMultiplier: 0.98,
      oilPerFactory: 2,
      oilPerPort: 1,
      oilPerTick: 1,
      startGold: 140_000n,
      startOil: 60n,
    },
    flag: "gb",
    key: "united_kingdom",
    name: "United Kingdom",
    personality: {
      aggression: 0.57,
      attackCooldown: 5,
      expandThreshold: 2.3,
      jitter: 2.7,
      reserveRatio: 0.3,
    },
  },
  united_states: {
    aliases: [
      "united states",
      "united states of america",
      "usa",
      "u.s.",
      "us",
      "america",
    ],
    economy: {
      goldIncomeMultiplier: 1.15,
      manpowerMultiplier: 1.08,
      oilPerFactory: 3,
      oilPerPort: 2,
      oilPerTick: 2,
      startGold: 180_000n,
      startOil: 120n,
    },
    flag: "us",
    key: "united_states",
    name: "United States",
    personality: {
      aggression: 0.6,
      attackCooldown: 5,
      expandThreshold: 2.25,
      jitter: 3,
      reserveRatio: 0.3,
    },
  },
};

const MAP_ROSTERS: Partial<Record<GameMapType, readonly CountryKey[]>> = {
  [GameMapType.BlackSea]: [
    "ukraine",
    "russia",
    "poland",
    "germany",
    "united_kingdom",
    "france",
  ],
  [GameMapType.BetweenTwoSeas]: [
    "ukraine",
    "russia",
    "poland",
    "germany",
    "france",
    "united_kingdom",
  ],
  [GameMapType.Britannia]: [
    "united_kingdom",
    "france",
    "germany",
    "poland",
    "ukraine",
    "russia",
  ],
  [GameMapType.Europe]: [
    "ukraine",
    "russia",
    "germany",
    "poland",
    "united_kingdom",
    "france",
  ],
  [GameMapType.EuropeClassic]: [
    "ukraine",
    "russia",
    "germany",
    "poland",
    "united_kingdom",
    "france",
  ],
  [GameMapType.GatewayToTheAtlantic]: [
    "united_kingdom",
    "france",
    "germany",
    "poland",
    "ukraine",
    "russia",
  ],
  [GameMapType.GiantWorldMap]: [
    "united_states",
    "ukraine",
    "russia",
    "china",
    "united_kingdom",
    "iran",
  ],
  [GameMapType.Iceland]: [
    "united_states",
    "united_kingdom",
    "france",
    "germany",
    "poland",
    "russia",
  ],
  [GameMapType.Italia]: [
    "france",
    "germany",
    "poland",
    "ukraine",
    "united_kingdom",
    "russia",
  ],
  [GameMapType.NorthernHemisphere]: [
    "united_states",
    "ukraine",
    "russia",
    "china",
    "united_kingdom",
    "iran",
  ],
  [GameMapType.StraitOfGibraltar]: [
    "united_kingdom",
    "france",
    "germany",
    "poland",
    "ukraine",
    "russia",
  ],
  [GameMapType.World]: [
    "united_states",
    "ukraine",
    "russia",
    "china",
    "united_kingdom",
    "iran",
  ],
};

const WESTERN_PARTNERS: readonly CountryKey[] = [
  "united_states",
  "united_kingdom",
  "france",
  "germany",
  "poland",
  "ukraine",
];

const RELATION_MATRIX = new Map<CountryKey, Map<CountryKey, Relation>>();

function setRelation(left: CountryKey, right: CountryKey, relation: Relation) {
  if (!RELATION_MATRIX.has(left)) {
    RELATION_MATRIX.set(left, new Map());
  }
  if (!RELATION_MATRIX.has(right)) {
    RELATION_MATRIX.set(right, new Map());
  }
  RELATION_MATRIX.get(left)?.set(right, relation);
  RELATION_MATRIX.get(right)?.set(left, relation);
}

for (let leftIndex = 0; leftIndex < WESTERN_PARTNERS.length; leftIndex++) {
  for (
    let rightIndex = leftIndex + 1;
    rightIndex < WESTERN_PARTNERS.length;
    rightIndex++
  ) {
    setRelation(
      WESTERN_PARTNERS[leftIndex],
      WESTERN_PARTNERS[rightIndex],
      Relation.Friendly,
    );
  }
}

for (const westernCountry of WESTERN_PARTNERS) {
  setRelation(westernCountry, "russia", Relation.Hostile);
  setRelation(westernCountry, "china", Relation.Distrustful);
}

setRelation("united_states", "iran", Relation.Hostile);
setRelation("united_kingdom", "iran", Relation.Distrustful);
setRelation("france", "iran", Relation.Distrustful);
setRelation("germany", "iran", Relation.Distrustful);
setRelation("poland", "iran", Relation.Distrustful);
setRelation("ukraine", "iran", Relation.Distrustful);

// This is an inference from ongoing strategic coordination rather than a
// formal mutual-defense treaty.
setRelation("russia", "china", Relation.Friendly);
setRelation("russia", "iran", Relation.Friendly);

function normalizeCountryName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function countryKeyFromName(value: string): CountryKey | null {
  const normalized = normalizeCountryName(value);
  for (const key of COUNTRY_KEYS) {
    const profile = COUNTRY_PROFILES[key];
    if (
      normalizeCountryName(profile.name) === normalized ||
      profile.aliases.some((alias) => normalizeCountryName(alias) === normalized)
    ) {
      return key;
    }
  }
  return null;
}

export function countryProfileFromName(value: string): CountryProfile | null {
  const key = countryKeyFromName(value);
  return key ? COUNTRY_PROFILES[key] : null;
}

export function countryEconomyForName(value: string): CountryEconomy {
  return countryProfileFromName(value)?.economy ?? DEFAULT_COUNTRY_ECONOMY;
}

export function geopoliticalStance(
  left: CountryKey,
  right: CountryKey,
): Relation {
  if (left === right) {
    return Relation.Friendly;
  }
  return RELATION_MATRIX.get(left)?.get(right) ?? Relation.Neutral;
}

export function selectCountryProfiles(
  map: GameMapType,
  count: number,
  options: { exclude?: CountryKey[] } = {},
): CountryProfile[] {
  const exclude = new Set(options.exclude ?? []);
  const roster =
    MAP_ROSTERS[map] ?? MAP_ROSTERS[GameMapType.World] ?? COUNTRY_KEYS;
  const ordered = [...roster, ...COUNTRY_KEYS];
  const seen = new Set<CountryKey>();
  const unique = ordered.filter((key) => {
    if (exclude.has(key) || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return unique.slice(0, count).map((key) => COUNTRY_PROFILES[key]);
}

export function oilCostForUnit(unitType: UnitType): Gold {
  switch (unitType) {
    case UnitType.TransportShip:
      return 2n;
    case UnitType.Warship:
      return 30n;
    case UnitType.Port:
      return 15n;
    case UnitType.AtomBomb:
      return 80n;
    case UnitType.HydrogenBomb:
      return 250n;
    case UnitType.MIRV:
      return 500n;
    case UnitType.TradeShip:
      return 1n;
    case UnitType.MissileSilo:
      return 120n;
    case UnitType.SAMLauncher:
      return 60n;
    case UnitType.Factory:
      return 40n;
    default:
      return 0n;
  }
}
