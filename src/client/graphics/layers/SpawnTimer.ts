import { GameMode, Team } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { TransformHandler } from "../TransformHandler";
import { Layer } from "./Layer";

export class SpawnTimer implements Layer {
  private ratios = [0];
  private colors = ["rgba(0, 128, 255, 1)", "rgba(0, 0, 0, 1)"];
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  constructor(
    private game: GameView,
    private transformHandler: TransformHandler,
  ) {}

  init() {
    // Create a canvas element for the spawn timer with high z-index
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "100";
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2d context for SpawnTimer");
    this.context = context;
    
    document.body.appendChild(this.canvas);
    
    // Handle window resize
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  tick() {
    if (this.game.inSpawnPhase()) {
      // During spawn phase, only one segment filling full width
      this.ratios = [
        this.game.ticks() / this.game.config().numSpawnPhaseTurns(),
      ];
      this.colors = ["rgba(0, 128, 255, 1)"];
      return;
    }

    this.ratios = [];
    this.colors = [];

    if (this.game.config().gameConfig().gameMode !== GameMode.Team) {
      return;
    }

    const teamTiles: Map<Team, number> = new Map();
    for (const player of this.game.players()) {
      const team = player.team();
      if (team === null) throw new Error("Team is null");
      const tiles = teamTiles.get(team) ?? 0;
      teamTiles.set(team, tiles + player.numTilesOwned());
    }

    const theme = this.game.config().theme();
    const total = sumIterator(teamTiles.values());
    if (total === 0) return;

    for (const [team, count] of teamTiles) {
      const ratio = count / total;
      this.ratios.push(ratio);
      this.colors.push(theme.teamColor(team).toRgbString());
    }
  }

  shouldTransform(): boolean {
    return false;
  }

  renderLayer(context: CanvasRenderingContext2D) {
    // Clear the canvas first
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const barHeight = 10;
    const barWidth = this.canvas.width;

    // Always draw background fill with #d1cdc7 at full width
    this.context.fillStyle = "#3c3c3c";
    this.context.fillRect(0, 0, barWidth, barHeight);

    if (
      !this.game.inSpawnPhase() &&
      this.game.config().gameConfig().gameMode !== GameMode.Team
    ) {
      return;
    }

    if (this.ratios.length === 0 || this.colors.length === 0) return;

    let x = 0;
    let filledRatio = 0;
    for (let i = 0; i < this.ratios.length && i < this.colors.length; i++) {
      const ratio = this.ratios[i] ?? 1 - filledRatio;
      const segmentWidth = barWidth * ratio;

      this.context.fillStyle = this.colors[i];
      this.context.fillRect(x, 0, segmentWidth, barHeight);

      x += segmentWidth;
      filledRatio += ratio;
    }
  }
}

function sumIterator(values: IterableIterator<number>) {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}
