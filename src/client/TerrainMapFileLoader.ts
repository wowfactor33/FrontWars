import { assetUrl } from "./AssetPath";
import version from "../../resources/version.txt";
import { FetchGameMapLoader } from "../core/game/FetchGameMapLoader";

export const terrainMapFileLoader = new FetchGameMapLoader(
  assetUrl("maps"),
  version,
);
