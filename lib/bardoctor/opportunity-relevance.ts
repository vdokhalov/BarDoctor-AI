import { OPPORTUNITY_SEARCH_RADIUS_KM } from "./opportunity-baseline";

function folded(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function cityAliases(city: string): string[] {
  const candidate = folded(city);
  const aliases = [candidate];
  if (candidate.includes("бендер") || candidate.includes("bender") || candidate.includes("tighina")) {
    aliases.push("бендер", "bender", "tighina", "тигина");
  }
  if (candidate.includes("кишин") || candidate.includes("chisinau") || candidate.includes("chișinău")) {
    aliases.push("кишинев", "кишинэу", "chisinau");
  }
  return aliases.filter((item, index, items) => item.length >= 4 && items.indexOf(item) === index);
}

function locationMatchesCity(location: string, city: string): boolean {
  const candidate = folded(location);
  return cityAliases(city).some((alias) => candidate.includes(alias));
}

export function discoveredOpportunityIsRelevant(input: {
  category: string;
  location: string;
  city: string;
  relationMode: string;
  distanceKm: number | null;
}): boolean {
  if (input.relationMode === "regional_interest") return false;
  if (input.relationMode === "local_demand") {
    return input.distanceKm !== null
      ? input.distanceKm <= OPPORTUNITY_SEARCH_RADIUS_KM
      : locationMatchesCity(input.location, input.city);
  }
  if (input.relationMode === "venue_activation") {
    return ["holiday", "sport", "seasonal", "other"].includes(input.category);
  }
  return false;
}
