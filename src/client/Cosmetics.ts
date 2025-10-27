import { UserMeResponse } from "../core/ApiSchemas";
import { Cosmetics, Pattern } from "../core/schemas/cosmetic";
import cosmetics from "../../resources/cosmetics/cosmetics.json";

export async function fetchCosmetics(): Promise<Cosmetics | null> {
  return cosmetics as any;
}

export function patternRelationship(
  pattern: Pattern,
  colorPalette: { name: string; isArchived?: boolean } | null,
  userMeResponse: UserMeResponse | null,
  affiliateCode: string | null,
): "owned" | "purchasable" | "blocked" {
  // Make all patterns free/owned while preserving archival hiding.
  if (colorPalette?.isArchived) {
    return "blocked";
  }
  return "owned";

  // const flares = userMeResponse?.player.flares ?? [];
  // if (flares.includes("pattern:*")) {
  //   return "owned";
  // }

  // if (colorPalette === null) {
  //   // For backwards compatibility only show non-colored patterns if they are owned.
  //   if (flares.includes(`pattern:${pattern.name}`)) {
  //     return "owned";
  //   }
  //   return "blocked";
  // }

  // const requiredFlare = `pattern:${pattern.name}:${colorPalette.name}`;

  // if (flares.includes(requiredFlare)) {
  //   return "owned";
  // }

  // if (pattern.product === null) {
  //   // We don't own it and it's not for sale, so don't show it.
  //   return "blocked";
  // }

  // if (colorPalette?.isArchived) {
  //   // We don't own the color palette, and it's archived, so don't show it.
  //   return "blocked";
  // }

  // if (affiliateCode !== pattern.affiliateCode) {
  //   // Pattern is for sale, but it's not the right store to show it on.
  //   return "blocked";
  // }

  // // Patterns is for sale, and it's the right store to show it on.
  // return "purchasable";
}
