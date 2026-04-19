import { CountryExecution } from "./CountryExecution";
import { getSpawnTiles } from "./Util";
import { Game, PlayerInfo, PlayerType } from "../game/Game";
import { GameID } from "../Schemas";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import {
  selectCountryProfiles,
  type CountryKey,
} from "../game/Geopolitics";

export class CountrySpawner {
  private readonly random: PseudoRandom;

  constructor(
    private readonly game: Game,
    private readonly gameID: GameID,
  ) {
    this.random = new PseudoRandom(simpleHash(this.gameID) + 17);
  }

  spawnCountries(count: number, exclude: CountryKey[] = []) {
    const profiles = selectCountryProfiles(
      this.game.config().gameConfig().gameMap,
      count,
      { exclude },
    );
    const spawnTiles = chooseSpawnTiles(this.game, profiles.length);
    const actualCount = Math.min(profiles.length, spawnTiles.length);

    return profiles.slice(0, actualCount).map((profile, index) => {
      const playerInfo = new PlayerInfo(
        profile.name,
        PlayerType.FakeHuman,
        null,
        this.random.nextID(),
      );

      return new CountryExecution(
        this.gameID,
        playerInfo,
        spawnTiles[index],
        profile.key,
        {
          ...profile.personality,
          jitter: profile.personality.jitter + index * 0.35,
        },
      );
    });
  }
}

function chooseSpawnTiles(game: Game, count: number) {
  const candidates: Array<{ score: number; tile: TileRef }> = [];
  const step = Math.max(
    4,
    Math.floor(Math.min(game.width(), game.height()) / 60),
  );

  for (let y = 0; y < game.height(); y += step) {
    for (let x = 0; x < game.width(); x += step) {
      const tile = game.ref(x, y);
      if (!game.isLand(tile)) {
        continue;
      }
      const spawnSize = getSpawnTiles(game, tile).length;
      if (spawnSize < 12) {
        continue;
      }
      candidates.push({
        score: spawnSize,
        tile,
      });
    }
  }

  const chosen: TileRef[] = [];
  while (chosen.length < count && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      const distances = chosen.map((other) =>
        game.manhattanDist(candidate.tile, other),
      );
      const minDistance =
        chosen.length === 0
          ? 9999
          : Math.min(...distances);
      const score = candidate.score * 6 + minDistance;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    chosen.push(candidates[bestIndex].tile);
    candidates.splice(bestIndex, 1);
  }

  return chosen;
}
