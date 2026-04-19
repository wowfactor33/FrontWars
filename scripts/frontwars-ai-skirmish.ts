import {
  Difficulty,
  GameMapType,
  GameType,
  Player,
  PlayerType,
  Relation,
  TerraNullius,
} from "../src/core/game/Game";
import {
  GameInfo,
  ServerMessageSchema,
  Turn,
  Winner,
} from "../src/core/Schemas";
import { GameUpdateType, type ErrorUpdate, type GameUpdateViewData } from "../src/core/game/GameUpdates";
import { createGameRunner, type GameRunner } from "../src/core/GameRunner";
import { FileSystemGameMapLoader } from "../src/headless/FileSystemGameMapLoader";
import {
  countryEconomyForName,
  countryKeyFromName,
  GEOPOLITICAL_SNAPSHOT,
  geopoliticalStance,
  selectCountryProfiles,
  type CountryKey,
} from "../src/core/game/Geopolitics";
import { getServerConfigFromServer } from "../src/core/configuration/ConfigLoader";
import { getSpawnTiles } from "../src/core/execution/Util";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

type Options = {
  baseUrl: string;
  count: number;
  difficulty: Difficulty;
  humanCountry: CountryKey | null;
  map: GameMapType;
  startDelayMs: number;
};

type AgentProfile = {
  clientID: string;
  countryKey: CountryKey;
  flag: string;
  name: string;
  pattern: undefined;
  personality: {
    aggression: number;
    attackCooldown: number;
    expandThreshold: number;
    jitter: number;
    reserveRatio: number;
  };
  spawnTile: number;
  token: string;
};

type TurnMessage = Extract<
  ReturnType<typeof ServerMessageSchema.parse>,
  { type: "turn" }
>;

type StartMessage = Extract<
  ReturnType<typeof ServerMessageSchema.parse>,
  { type: "start" }
>;

const DEFAULT_OPTIONS: Options = {
  baseUrl: "http://localhost:3000",
  count: 4,
  difficulty: Difficulty.Medium,
  humanCountry: null,
  map: GameMapType.World,
  startDelayMs: 15000,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const mapsRoot = resolve(repoRoot, "resources/maps");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  installRelativeFetch(options.baseUrl);

  const serverConfig = getServerConfigFromServer();
  const gameID = randomUUID();
  const workerPath = serverConfig.workerPath(gameID);
  const mapLoader = new FileSystemGameMapLoader(mapsRoot);
  const terrain = await loadMap(options.map, mapLoader);
  const spawnTiles = chooseSpawnTiles(terrain.gameMap, options.count);
  const profiles = createProfiles(
    options.map,
    options.count,
    spawnTiles,
    options.humanCountry,
  );
  const joinUrl = `${options.baseUrl}/#join=${gameID}`;

  await createPrivateLobby(options, gameID, workerPath, profiles[0].clientID);

  const controller = new MatchController(
    options,
    gameID,
    workerPath,
    mapLoader,
    profiles,
  );

  await controller.connectAgents();
  await waitForLobbySize(options.baseUrl, workerPath, gameID, profiles.length);

  console.log(
    `Lobby ${gameID} is ready with ${profiles.length} AI clients on ${options.map}.`,
  );
  console.log(
    `Diplomacy snapshot ${GEOPOLITICAL_SNAPSHOT.asOf}: ${profiles.map((profile) => profile.name).join(", ")}`,
  );
  console.log(`Join link: ${joinUrl}`);
  if (options.humanCountry) {
    const economy = countryEconomyForName(
      options.humanCountry.replace(/_/g, " "),
    );
    console.log(
      `Reserved human country: ${options.humanCountry.replace(/_/g, " ")} ` +
        `(start gold ${economy.startGold}, start oil ${economy.startOil})`,
    );
  } else {
    console.log(
      "To claim a country economy package as a human, set your username to a supported country name before joining.",
    );
  }
  console.log(
    `Starting the match in ${Math.round(options.startDelayMs / 1000)}s...`,
  );

  await wait(options.startDelayMs);
  await startPrivateLobby(options.baseUrl, workerPath, gameID);
  await controller.waitForCompletion();
}

class MatchController {
  private readonly agents: HeadlessAgent[];
  private completionResolve: ((winner: Winner | null) => void) | null = null;
  private completionPromise: Promise<Winner | null>;
  private winner: Winner | null = null;
  private closing = false;

  constructor(
    private readonly options: Options,
    private readonly gameID: string,
    private readonly workerPath: string,
    mapLoader: FileSystemGameMapLoader,
    profiles: AgentProfile[],
  ) {
    this.completionPromise = new Promise((resolve) => {
      this.completionResolve = resolve;
    });

    this.agents = profiles.map(
      (profile, index) =>
        new HeadlessAgent(
          options,
          gameID,
          workerPath,
          profile,
          mapLoader,
          index === 0 ? (summary) => this.logStandings(summary) : undefined,
          (winner) => this.onWinner(winner),
        ),
    );
  }

  async connectAgents() {
    await Promise.all(this.agents.map((agent) => agent.connect()));
  }

  async waitForCompletion() {
    const winner = await this.completionPromise;
    if (!this.closing) {
      this.closing = true;
      await Promise.all(this.agents.map((agent) => agent.close()));
    }

    if (!winner) {
      console.log("Match ended without a reported winner.");
      return;
    }

    if (winner[0] === "player") {
      console.log(`Winner: ${winner[1]}`);
      return;
    }

    console.log(`Winner: ${winner[1]} team`);
  }

  private onWinner(winner: Winner | null) {
    if (this.winner !== null) {
      return;
    }
    this.winner = winner;
    this.completionResolve?.(winner);
  }

  private logStandings(summary: MatchSummary) {
    const leaders = summary.leaders
      .map(
        (entry) =>
          `${entry.name}(${entry.tiles} tiles, ${entry.troops} troops)`,
      )
      .join(", ");
    console.log(`Tick ${summary.tick}: ${leaders}`);
  }
}

type MatchSummary = {
  leaders: Array<{ name: string; tiles: number; troops: number }>;
  tick: number;
};

class HeadlessAgent {
  private socket: WebSocket | null = null;
  private runner: GameRunner | null = null;
  private pendingTurns: Turn[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastLoggedTick = -1;
  private nextActionTick = 0;
  private spawnAttemptTick = -1000;
  private lastDiplomacyTick = -1000;

  constructor(
    private readonly options: Options,
    private readonly gameID: string,
    private readonly workerPath: string,
    private readonly profile: AgentProfile,
    private readonly mapLoader: FileSystemGameMapLoader,
    private readonly onSummary:
      | ((summary: MatchSummary) => void)
      | undefined,
    private readonly onWinner: (winner: Winner | null) => void,
  ) {}

  async connect(): Promise<void> {
    const wsUrl = toWebSocketUrl(this.options.baseUrl, this.workerPath);
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;

      socket.once("open", () => {
        this.send({
          clientID: this.profile.clientID,
          flag: this.profile.flag,
          gameID: this.gameID,
          lastTurn: 0,
          pattern: this.profile.pattern,
          token: this.profile.token,
          type: "join",
          username: this.profile.name,
        });
        this.pingInterval = setInterval(() => {
          this.send({ type: "ping" });
        }, 5000);
        resolve();
      });

      socket.on("message", (payload) => {
        const parsed = ServerMessageSchema.safeParse(
          JSON.parse(payload.toString()),
        );
        if (!parsed.success) {
          console.error(
            `[${this.profile.name}] failed to parse server message`,
            parsed.error.message,
          );
          return;
        }
        this.handleMessage(parsed.data).catch((error) => {
          console.error(`[${this.profile.name}] message handling failed`, error);
        });
      });

      socket.once("error", (error) => {
        reject(error);
      });

      socket.on("close", (code, reason) => {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        if (code !== 1000) {
          console.warn(
            `[${this.profile.name}] socket closed ${code}: ${reason.toString()}`,
          );
        }
      });
    });
  }

  async close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (!this.socket) {
      return;
    }
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, "match complete");
    }
  }

  private async handleMessage(message: ReturnType<typeof ServerMessageSchema.parse>) {
    switch (message.type) {
      case "error":
        throw new Error(`[${this.profile.name}] ${message.error}`);
      case "start":
        await this.handleStart(message);
        return;
      case "turn":
        await this.handleTurn(message);
        return;
      default:
        return;
    }
  }

  private async handleStart(message: StartMessage) {
    this.runner = await createGameRunner(
      message.gameStartInfo,
      this.profile.clientID,
      this.mapLoader,
      (update) => this.handleGameUpdate(update),
    );

    for (const turn of message.turns) {
      this.pendingTurns.push(turn);
    }

    await this.flushTurns();
    this.planMove();
  }

  private async handleTurn(message: TurnMessage) {
    this.pendingTurns.push(message.turn);
    if (this.runner === null) {
      return;
    }
    await this.flushTurns();
    this.planMove();
  }

  private async flushTurns() {
    if (!this.runner) {
      return;
    }

    while (this.pendingTurns.length > 0) {
      const turn = this.pendingTurns.shift();
      if (!turn) {
        continue;
      }
      this.runner.addTurn(turn);
      this.runner.executeNextTick();
    }
  }

  private handleGameUpdate(update: GameUpdateViewData | ErrorUpdate) {
    if (!("updates" in update)) {
      throw new Error(update.errMsg);
    }

    const winUpdates = update.updates[GameUpdateType.Win];
    if (winUpdates.length > 0) {
      this.onWinner(winUpdates[0].winner ?? null);
      return;
    }

    if (
      this.onSummary &&
      update.tick % 50 === 0 &&
      this.lastLoggedTick !== update.tick &&
      this.runner
    ) {
      this.lastLoggedTick = update.tick;
      const leaders = this.runner.game
        .players()
        .filter((player) => player.isAlive())
        .sort((left, right) => right.numTilesOwned() - left.numTilesOwned())
        .slice(0, 3)
        .map((player) => ({
          name: player.name(),
          tiles: player.numTilesOwned(),
          troops: player.troops(),
        }));

      this.onSummary({
        leaders,
        tick: update.tick,
      });
    }
  }

  private planMove() {
    if (!this.runner) {
      return;
    }

    const game = this.runner.game;
    const me = game.playerByClientID(this.profile.clientID);

    if (me === null) {
      return;
    }

    if (game.inSpawnPhase()) {
      if (!me.hasSpawned() && game.ticks() - this.spawnAttemptTick >= 5) {
        this.spawnAttemptTick = game.ticks();
        this.sendIntent({
          clientID: this.profile.clientID,
          flag: this.profile.flag,
          name: this.profile.name,
          pattern: this.profile.pattern,
          playerType: PlayerType.Human,
          tile: this.profile.spawnTile,
          type: "spawn",
        });
        console.log(
          `[${this.profile.name}] spawning at tile ${this.profile.spawnTile}`,
        );
      }
      return;
    }

    if (!me.isAlive()) {
      return;
    }

    this.handleDiplomacy(me);

    if (game.ticks() < this.nextActionTick) {
      return;
    }

    if (me.outgoingAttacks().length >= 2) {
      return;
    }

    const target = selectTarget(
      me,
      game.terraNullius(),
      this.profile.personality,
      (other) => this.stanceAgainst(other),
    );
    if (target === null) {
      return;
    }

    const maxTroops = game.config().maxTroops(me);
    const reserve = Math.max(
      12,
      Math.floor(maxTroops * this.profile.personality.reserveRatio),
    );
    const committed = Math.min(
      me.troops() - reserve,
      Math.floor(me.troops() * this.profile.personality.aggression),
    );

    if (committed < 6) {
      return;
    }

    this.sendIntent({
      clientID: this.profile.clientID,
      targetID: target.isPlayer() ? target.id() : null,
      troops: committed,
      type: "attack",
    });

    this.nextActionTick = game.ticks() + this.profile.personality.attackCooldown;
  }

  private handleDiplomacy(me: Player) {
    if (!this.runner) {
      return;
    }

    const game = this.runner.game;
    if (game.ticks() - this.lastDiplomacyTick < 4) {
      return;
    }
    this.lastDiplomacyTick = game.ticks();

    for (const request of me.incomingAllianceRequests()) {
      const other = request.requestor();
      const stance = this.stanceAgainst(other);
      const accept =
        stance >= Relation.Friendly ||
        (stance >= Relation.Neutral && this.haveCommonHostileRival(me, other));

      this.sendIntent({
        accept,
        clientID: this.profile.clientID,
        requestor: other.id(),
        type: "allianceRequestReply",
      });
    }

    for (const other of game.players()) {
      if (!other.isAlive() || other.id() === me.id()) {
        continue;
      }

      const stance = this.stanceAgainst(other);
      const alliance = me.allianceWith(other);

      if (alliance !== null && stance <= Relation.Distrustful) {
        this.sendIntent({
          clientID: this.profile.clientID,
          recipient: other.id(),
          type: "breakAlliance",
        });
        continue;
      }

      if (
        stance >= Relation.Friendly &&
        me.sharesBorderWith(other) &&
        me.canSendAllianceRequest(other)
      ) {
        this.sendIntent({
          clientID: this.profile.clientID,
          recipient: other.id(),
          type: "allianceRequest",
        });
        continue;
      }

      if (stance <= Relation.Hostile) {
        if (!me.hasEmbargoAgainst(other)) {
          this.sendIntent({
            action: "start",
            clientID: this.profile.clientID,
            targetID: other.id(),
            type: "embargo",
          });
        }

        if (me.canTarget(other)) {
          this.sendIntent({
            clientID: this.profile.clientID,
            target: other.id(),
            type: "targetPlayer",
          });
        }
        continue;
      }

      if (me.hasEmbargoAgainst(other)) {
        this.sendIntent({
          action: "stop",
          clientID: this.profile.clientID,
          targetID: other.id(),
          type: "embargo",
        });
      }
    }
  }

  private haveCommonHostileRival(me: Player, other: Player) {
    if (!this.runner) {
      return false;
    }

    return this.runner.game.players().some((candidate) => {
      if (!candidate.isAlive()) {
        return false;
      }
      if (
        candidate.id() === me.id() ||
        candidate.id() === other.id()
      ) {
        return false;
      }
      return (
        this.stanceAgainst(candidate) <= Relation.Hostile &&
        this.stanceBetween(other, candidate) <= Relation.Hostile
      );
    });
  }

  private stanceAgainst(other: Player) {
    return this.stanceBetweenCountryKeys(
      this.profile.countryKey,
      this.countryKeyForPlayer(other),
    );
  }

  private stanceBetween(left: Player, right: Player) {
    return this.stanceBetweenCountryKeys(
      this.countryKeyForPlayer(left),
      this.countryKeyForPlayer(right),
    );
  }

  private stanceBetweenCountryKeys(
    left: CountryKey | null,
    right: CountryKey | null,
  ) {
    if (!left || !right) {
      return Relation.Neutral;
    }
    return geopoliticalStance(left, right);
  }

  private countryKeyForPlayer(player: Player) {
    return countryKeyFromName(player.name());
  }

  private sendIntent(intent: object) {
    this.send({
      intent,
      type: "intent",
    });
  }

  private send(message: object) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }
}

function selectTarget(
  me: Player,
  terraNullius: TerraNullius,
  personality: AgentProfile["personality"],
  stanceFor: (other: Player) => Relation,
) {
  const maxTroops = me.troops();
  const threateningNeighbors = me
    .neighbors()
    .filter((neighbor): neighbor is Player => neighbor.isPlayer())
    .filter((neighbor) => stanceFor(neighbor) <= Relation.Distrustful)
    .filter((neighbor) => !me.isFriendly(neighbor));

  if (
    me.sharesBorderWith(terraNullius) &&
    (threateningNeighbors.length === 0 ||
      maxTroops / Math.max(1, me.numTilesOwned()) > personality.expandThreshold)
  ) {
    return terraNullius;
  }

  let bestTarget: Player | null = null;
  let bestScore = -Infinity;
  for (const enemy of threateningNeighbors) {
    const density = enemy.troops() / Math.max(1, enemy.numTilesOwned());
    const stanceBias =
      stanceFor(enemy) === Relation.Hostile ? 18 : 6;
    const score =
      (me.numTilesOwned() - enemy.numTilesOwned()) * 4 +
      (me.troops() - enemy.troops()) * 0.15 -
      density * 12 +
      stanceBias +
      personality.jitter;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  }

  if (bestTarget !== null) {
    return bestTarget;
  }

  return me.sharesBorderWith(terraNullius) ? terraNullius : null;
}

async function loadMap(
  map: GameMapType,
  mapLoader: FileSystemGameMapLoader,
) {
  const { loadTerrainMap } = await import("../src/core/game/TerrainMapLoader");
  return loadTerrainMap(map, mapLoader);
}

function chooseSpawnTiles(
  gameMap: Awaited<ReturnType<typeof loadMap>>["gameMap"],
  count: number,
) {
  const candidates: Array<{ score: number; tile: number }> = [];
  const step = Math.max(4, Math.floor(Math.min(gameMap.width(), gameMap.height()) / 60));

  for (let y = 0; y < gameMap.height(); y += step) {
    for (let x = 0; x < gameMap.width(); x += step) {
      const tile = gameMap.ref(x, y);
      if (!gameMap.isLand(tile)) {
        continue;
      }
      const spawnSize = getSpawnTiles(gameMap, tile).length;
      if (spawnSize < 12) {
        continue;
      }
      candidates.push({
        score: spawnSize,
        tile,
      });
    }
  }

  const chosen: number[] = [];
  while (chosen.length < count && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      const minDistance =
        chosen.length === 0
          ? 9999
          : Math.min(
              ...chosen.map((other) => gameMap.manhattanDist(candidate.tile, other)),
            );
      const score = candidate.score * 6 + minDistance;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    chosen.push(candidates[bestIndex].tile);
    candidates.splice(bestIndex, 1);
  }

  if (chosen.length < count) {
    throw new Error(`Only found ${chosen.length} spawn tiles for ${count} agents`);
  }

  return chosen;
}

function createProfiles(
  map: GameMapType,
  count: number,
  spawnTiles: number[],
  reservedHumanCountry: CountryKey | null,
): AgentProfile[] {
  const countries = selectCountryProfiles(map, count, {
    exclude: reservedHumanCountry ? [reservedHumanCountry] : [],
  });
  return countries.map((country, index) => ({
    clientID: randomUUID(),
    countryKey: country.key,
    flag: country.flag,
    name: country.name,
    pattern: undefined,
    personality: {
      ...country.personality,
      jitter: country.personality.jitter + index * 0.35,
    },
    spawnTile: spawnTiles[index],
    token: randomUUID(),
  }));
}

async function createPrivateLobby(
  options: Options,
  gameID: string,
  workerPath: string,
  creatorClientID: string,
) {
  const response = await fetch(
    `${options.baseUrl}/${workerPath}/api/create_game/${gameID}?creatorClientID=${encodeURIComponent(creatorClientID)}`,
    {
      body: JSON.stringify({
        bots: 0,
        difficulty: options.difficulty,
        disableNPCs: true,
        disabledUnits: [],
        donateGold: false,
        donateTroops: false,
        gameMap: options.map,
        gameMode: "Free For All",
        gameType: GameType.Private,
        infiniteGold: false,
        infiniteTroops: false,
        instantBuild: false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.status} ${await response.text()}`);
  }
}

async function startPrivateLobby(
  baseUrl: string,
  workerPath: string,
  gameID: string,
) {
  const response = await fetch(`${baseUrl}/${workerPath}/api/start_game/${gameID}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to start game: ${response.status} ${await response.text()}`);
  }
}

async function waitForLobbySize(
  baseUrl: string,
  workerPath: string,
  gameID: string,
  expectedClients: number,
) {
  const timeoutAt = Date.now() + 15000;
  while (Date.now() < timeoutAt) {
    const response = await fetch(`${baseUrl}/${workerPath}/api/game/${gameID}`);
    if (!response.ok) {
      throw new Error(`Failed to poll lobby: ${response.status}`);
    }
    const lobby = (await response.json()) as GameInfo;
    const clients = lobby.clients ?? [];
    if (clients.length >= expectedClients) {
      return;
    }
    await wait(250);
  }

  throw new Error(
    `Timed out waiting for ${expectedClients} clients to join the lobby`,
  );
}

function installRelativeFetch(baseUrl: string) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return originalFetch(new URL(input, baseUrl), init);
    }
    if (input instanceof URL && input.pathname.startsWith("/") && input.origin === "null") {
      return originalFetch(new URL(input.pathname, baseUrl), init);
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

function parseArgs(argv: string[]): Options {
  if (argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const options = { ...DEFAULT_OPTIONS };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--base-url":
        if (!next) {
          throw new Error("--base-url requires a value");
        }
        options.baseUrl = next;
        index++;
        break;
      case "--count":
        if (!next) {
          throw new Error("--count requires a value");
        }
        options.count = Number.parseInt(next, 10);
        index++;
        break;
      case "--difficulty":
        if (!next) {
          throw new Error("--difficulty requires a value");
        }
        options.difficulty = parseEnumValue(Difficulty, next, "--difficulty");
        index++;
        break;
      case "--human-country":
        if (!next) {
          throw new Error("--human-country requires a value");
        }
        options.humanCountry = parseCountryValue(next);
        index++;
        break;
      case "--map":
        if (!next) {
          throw new Error("--map requires a value");
        }
        options.map = parseEnumValue(GameMapType, next, "--map");
        index++;
        break;
      case "--start-delay-ms":
        if (!next) {
          throw new Error("--start-delay-ms requires a value");
        }
        options.startDelayMs = Number.parseInt(next, 10);
        index++;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.count) || options.count < 2) {
    throw new Error("--count must be an integer >= 2");
  }

  return options;
}

function parseEnumValue<T extends Record<string, string>>(
  choices: T,
  input: string,
  flagName: string,
): T[keyof T] {
  const normalized = input.toLowerCase().replace(/[\s_-]+/g, "");
  const match = Object.entries(choices).find(([key, value]) => {
    return (
      key.toLowerCase().replace(/[\s_-]+/g, "") === normalized ||
      value.toLowerCase().replace(/[\s_-]+/g, "") === normalized
    );
  });

  if (!match) {
    throw new Error(
      `${flagName} must be one of: ${Object.values(choices).join(", ")}`,
    );
  }

  return match[1] as T[keyof T];
}

function parseCountryValue(input: string): CountryKey {
  const match = countryKeyFromName(input);
  if (!match) {
    throw new Error(`--human-country must match a supported country name`);
  }
  return match;
}

function printHelp() {
  console.log(`FrontWars AI skirmish

Usage:
  npm run ai:skirmish -- [options]

Options:
  --base-url http://localhost:3000
  --count 4
  --map World
  --difficulty Medium
  --human-country Iran
  --start-delay-ms 15000
  --help
`);
}

function toWebSocketUrl(baseUrl: string, workerPath: string) {
  const url = new URL(`/${workerPath}`, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
