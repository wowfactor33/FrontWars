import { AttackExecution } from "./AttackExecution";
import { SpawnExecution } from "./SpawnExecution";
import {
  Execution,
  Game,
  Player,
  PlayerInfo,
  Relation,
  TerraNullius,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { GameID } from "../Schemas";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";
import {
  countryKeyFromName,
  geopoliticalStance,
  type CountryKey,
  type PersonalitySeed,
} from "../game/Geopolitics";

const RELATION_ANCHOR: Record<Relation, number> = {
  [Relation.Hostile]: -80,
  [Relation.Distrustful]: -20,
  [Relation.Neutral]: 0,
  [Relation.Friendly]: 80,
};

export class CountryExecution implements Execution {
  private active = true;
  private readonly random: PseudoRandom;
  private mg: Game | undefined;
  private player: Player | null = null;
  private nextActionTick = 0;
  private spawnAttemptTick = -1000;
  private lastDiplomacyTick = -1000;

  constructor(
    gameID: GameID,
    private readonly playerInfo: PlayerInfo,
    private readonly spawnTile: TileRef,
    private readonly countryKey: CountryKey,
    private readonly personality: PersonalitySeed,
  ) {
    this.random = new PseudoRandom(
      simpleHash(playerInfo.id) + simpleHash(gameID),
    );
  }

  init(mg: Game) {
    this.mg = mg;
  }

  tick(ticks: number) {
    if (this.mg === undefined) {
      throw new Error("Not initialized");
    }

    if (this.mg.inSpawnPhase()) {
      this.handleSpawnPhase(ticks);
      return;
    }

    if (this.player === null && this.mg.hasPlayer(this.playerInfo.id)) {
      this.player = this.mg.player(this.playerInfo.id);
    }

    if (this.player === null) {
      this.active = false;
      return;
    }

    if (!this.player.isAlive()) {
      this.active = false;
      return;
    }

    this.handleDiplomacy(ticks);

    if (ticks < this.nextActionTick || this.player.outgoingAttacks().length >= 2) {
      return;
    }

    const target = this.selectTarget(this.player, this.mg.terraNullius());
    if (target === null) {
      return;
    }

    const maxTroops = this.mg.config().maxTroops(this.player);
    const reserve = Math.max(
      12,
      Math.floor(maxTroops * this.personality.reserveRatio),
    );
    const committed = Math.min(
      this.player.troops() - reserve,
      Math.floor(this.player.troops() * this.personality.aggression),
    );

    if (committed < 6) {
      return;
    }

    this.mg.addExecution(
      new AttackExecution(
        committed,
        this.player,
        target.isPlayer() ? target.id() : null,
      ),
    );

    const cooldownJitter = this.random.nextInt(0, 3);
    this.nextActionTick =
      ticks + this.personality.attackCooldown + cooldownJitter;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }

  private handleSpawnPhase(ticks: number) {
    if (this.mg === undefined) {
      throw new Error("Not initialized");
    }

    if (this.player === null && this.mg.hasPlayer(this.playerInfo.id)) {
      this.player = this.mg.player(this.playerInfo.id);
    }

    if (this.player?.hasSpawned()) {
      return;
    }

    if (ticks - this.spawnAttemptTick < 5) {
      return;
    }

    this.spawnAttemptTick = ticks;
    this.mg.addExecution(new SpawnExecution(this.playerInfo, this.spawnTile));
  }

  private handleDiplomacy(ticks: number) {
    if (this.player === null || this.mg === undefined) {
      return;
    }

    if (ticks - this.lastDiplomacyTick < 4) {
      return;
    }
    this.lastDiplomacyTick = ticks;

    for (const request of this.player.incomingAllianceRequests()) {
      const other = request.requestor();
      const stance = this.stanceAgainst(other);
      const shouldAccept =
        stance >= Relation.Friendly ||
        (stance >= Relation.Neutral &&
          this.haveCommonHostileRival(this.player, other));

      if (shouldAccept) {
        request.accept();
      } else {
        request.reject();
      }
    }

    for (const other of this.mg.players()) {
      if (!other.isAlive() || other.id() === this.player.id()) {
        continue;
      }

      const stance = this.stanceAgainst(other);
      this.nudgeRelationTowards(this.player, other, stance);

      const alliance = this.player.allianceWith(other);
      if (alliance !== null && stance <= Relation.Distrustful) {
        this.player.breakAlliance(alliance);
        continue;
      }

      if (
        stance >= Relation.Friendly &&
        this.player.sharesBorderWith(other) &&
        this.player.canSendAllianceRequest(other)
      ) {
        this.player.createAllianceRequest(other);
        continue;
      }

      if (stance <= Relation.Hostile) {
        if (!this.player.hasEmbargoAgainst(other)) {
          this.player.addEmbargo(other, false);
        }

        if (this.player.canTarget(other)) {
          this.player.target(other);
        }
        continue;
      }

      if (this.player.hasEmbargoAgainst(other)) {
        this.player.stopEmbargo(other);
      }
    }
  }

  private haveCommonHostileRival(me: Player, other: Player) {
    if (this.mg === undefined) {
      return false;
    }

    return this.mg.players().some((candidate) => {
      if (!candidate.isAlive()) {
        return false;
      }
      if (candidate.id() === me.id() || candidate.id() === other.id()) {
        return false;
      }
      return (
        this.stanceAgainst(candidate) <= Relation.Hostile &&
        this.stanceBetween(other, candidate) <= Relation.Hostile
      );
    });
  }

  private selectTarget(me: Player, terraNullius: TerraNullius) {
    const threateningNeighbors = me
      .neighbors()
      .filter((neighbor): neighbor is Player => neighbor.isPlayer())
      .filter((neighbor) => this.stanceAgainst(neighbor) <= Relation.Distrustful)
      .filter((neighbor) => !me.isFriendly(neighbor));

    if (
      me.sharesBorderWith(terraNullius) &&
      (threateningNeighbors.length === 0 ||
        me.troops() / Math.max(1, me.numTilesOwned()) >
          this.personality.expandThreshold)
    ) {
      return terraNullius;
    }

    let bestTarget: Player | null = null;
    let bestScore = -Infinity;
    for (const enemy of threateningNeighbors) {
      const density = enemy.troops() / Math.max(1, enemy.numTilesOwned());
      const stanceBias =
        this.stanceAgainst(enemy) === Relation.Hostile ? 18 : 6;
      const score =
        (me.numTilesOwned() - enemy.numTilesOwned()) * 4 +
        (me.troops() - enemy.troops()) * 0.15 -
        density * 12 +
        stanceBias +
        this.personality.jitter +
        this.random.nextInt(0, 5);

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

  private nudgeRelationTowards(me: Player, other: Player, stance: Relation) {
    const current = RELATION_ANCHOR[me.relation(other)];
    const target = RELATION_ANCHOR[stance];
    const delta = target - current;

    if (delta === 0) {
      return;
    }

    const step = Math.abs(delta) >= 50 ? 8 : 4;
    me.updateRelation(other, Math.sign(delta) * step);
  }

  private stanceAgainst(other: Player) {
    return this.stanceBetweenCountryKeys(
      this.countryKey,
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
    if (left === null || right === null) {
      return Relation.Neutral;
    }
    return geopoliticalStance(left, right);
  }

  private countryKeyForPlayer(player: Player) {
    return countryKeyFromName(player.name());
  }
}
