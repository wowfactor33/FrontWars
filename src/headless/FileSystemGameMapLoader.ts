import { GameMapLoader, MapData } from "../core/game/GameMapLoader";
import { GameMapType } from "../core/game/Game";
import { MapManifest, MapManifestSchema } from "../core/game/TerrainMapLoader";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export class FileSystemGameMapLoader implements GameMapLoader {
  private readonly maps = new Map<GameMapType, MapData>();

  constructor(private readonly mapsRoot: string) {}

  getMapData(map: GameMapType): MapData {
    const cached = this.maps.get(map);
    if (cached) {
      return cached;
    }

    const key = Object.keys(GameMapType).find(
      (candidate) =>
        GameMapType[candidate as keyof typeof GameMapType] === map,
    );

    if (!key) {
      throw new Error(`Unknown map: ${map}`);
    }

    const directory = join(this.mapsRoot, key.toLowerCase());
    const mapData = {
      manifest: this.cache(() =>
        readFile(join(directory, "manifest.json"), "utf8").then((content) =>
          MapManifestSchema.parse(JSON.parse(content) as MapManifest),
        ),
      ),
      mapBin: this.cache(() => this.readBinary(directory, "map.bin")),
      miniMapBin: this.cache(() => this.readBinary(directory, "mini_map.bin")),
      webpPath: this.cache(async () => join(directory, "thumbnail.webp")),
    } satisfies MapData;

    this.maps.set(map, mapData);
    return mapData;
  }

  private cache<T>(loader: () => Promise<T>): () => Promise<T> {
    let cached: Promise<T> | null = null;
    return () => {
      cached ??= loader();
      return cached;
    };
  }

  private async readBinary(directory: string, fileName: string) {
    const buffer = await readFile(join(directory, fileName));
    return new Uint8Array(buffer);
  }
}
