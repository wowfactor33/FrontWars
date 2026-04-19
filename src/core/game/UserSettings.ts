const PATTERN_KEY = "territoryPattern";
const TERRITORY_COLOR_KEY = "settings.territoryColor";
const BACKGROUND_MUSIC_VOLUME_KEY = "settings.backgroundMusicVolume";
const SOUND_EFFECTS_VOLUME_KEY = "settings.soundEffectsVolume";

export class UserSettings {
  get(key: string, defaultValue: boolean): boolean {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;

    if (value === "true") return true;

    if (value === "false") return false;

    return defaultValue;
  }

  set(key: string, value: boolean) {
    localStorage.setItem(key, value ? "true" : "false");
  }

  private getNumber(key: string, defaultValue: number): number {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return defaultValue;
    }

    return parsed;
  }

  private setNumber(key: string, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    localStorage.setItem(key, String(clamped));
  }

  emojis() {
    return this.get("settings.emojis", true);
  }

  performanceOverlay() {
    return this.get("settings.performanceOverlay", false);
  }

  alertFrame() {
    return this.get("settings.alertFrame", true);
  }

  anonymousNames() {
    return this.get("settings.anonymousNames", false);
  }

  lobbyIdVisibility() {
    return this.get("settings.lobbyIdVisibility", true);
  }

  fxLayer() {
    return this.get("settings.specialEffects", true);
  }

  structureSprites() {
    return this.get("settings.structureSprites", true);
  }

  darkMode() {
    return this.get("settings.darkMode", false);
  }

  backgroundMusicVolume(): number {
    return this.getNumber(BACKGROUND_MUSIC_VOLUME_KEY, 0.5);
  }

  setBackgroundMusicVolume(volume: number): void {
    this.setNumber(BACKGROUND_MUSIC_VOLUME_KEY, volume);
  }

  soundEffectsVolume(): number {
    return this.getNumber(SOUND_EFFECTS_VOLUME_KEY, 0.5);
  }

  setSoundEffectsVolume(volume: number): void {
    this.setNumber(SOUND_EFFECTS_VOLUME_KEY, volume);
  }

  leftClickOpensMenu() {
    return this.get("settings.leftClickOpensMenu", false);
  }

  territoryPatterns() {
    return this.get("settings.territoryPatterns", true);
  }

  focusLocked() {
    return false;
    // TODO: renable when performance issues are fixed.
    this.get("settings.focusLocked", true);
  }

  toggleLeftClickOpenMenu() {
    this.set("settings.leftClickOpensMenu", !this.leftClickOpensMenu());
  }

  toggleFocusLocked() {
    this.set("settings.focusLocked", !this.focusLocked());
  }

  toggleEmojis() {
    this.set("settings.emojis", !this.emojis());
  }

  togglePerformanceOverlay() {
    this.set("settings.performanceOverlay", !this.performanceOverlay());
  }

  toggleAlertFrame() {
    this.set("settings.alertFrame", !this.alertFrame());
  }

  toggleRandomName() {
    this.set("settings.anonymousNames", !this.anonymousNames());
  }

  toggleLobbyIdVisibility() {
    this.set("settings.lobbyIdVisibility", !this.lobbyIdVisibility());
  }

  toggleFxLayer() {
    this.set("settings.specialEffects", !this.fxLayer());
  }

  toggleStructureSprites() {
    this.set("settings.structureSprites", !this.structureSprites());
  }

  toggleTerritoryPatterns() {
    this.set("settings.territoryPatterns", !this.territoryPatterns());
  }

  toggleDarkMode() {
    this.set("settings.darkMode", !this.darkMode());
    if (this.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  getSelectedPattern(cosmetics?: {
    colorPalettes?: Record<string, { name: string; primary?: string; secondary?: string }>;
    patterns?: Record<string, { name: string }>;
  }): string | {
    colorPalette?: { name: string; primary?: string; secondary?: string };
    name: string;
    patternData: string;
  } | undefined {
    const value = localStorage.getItem(PATTERN_KEY) ?? undefined;
    if (value === undefined || cosmetics === undefined) {
      return value;
    }

    if (value.startsWith("pattern:")) {
      const raw = value.slice("pattern:".length);
      const [name, colorPaletteName] = raw.split(":");
      const patternEntry = Object.entries(cosmetics.patterns ?? {}).find(
        ([, pattern]) => pattern.name === name,
      );

      if (patternEntry === undefined) {
        return undefined;
      }

      return {
        colorPalette:
          colorPaletteName === undefined
            ? undefined
            : {
                name: colorPaletteName,
                ...(cosmetics.colorPalettes?.[colorPaletteName] ?? {}),
              },
        name,
        patternData: patternEntry[0],
      };
    }

    const pattern = cosmetics.patterns?.[value];
    if (pattern === undefined) {
      return undefined;
    }

    return {
      name: pattern.name,
      patternData: value,
    };
  }

  setSelectedPattern(base64: string | undefined): void {
    if (base64 === undefined) {
      localStorage.removeItem(PATTERN_KEY);
    } else {
      localStorage.setItem(PATTERN_KEY, base64);
    }
  }

  getSelectedColor(): string | undefined {
    return localStorage.getItem(TERRITORY_COLOR_KEY) ?? undefined;
  }

  setSelectedColor(color: string | undefined): void {
    if (color === undefined) {
      localStorage.removeItem(TERRITORY_COLOR_KEY);
      return;
    }
    localStorage.setItem(TERRITORY_COLOR_KEY, color);
  }
}
