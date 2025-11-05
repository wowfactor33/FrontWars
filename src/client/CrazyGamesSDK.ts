declare global {
  interface Window {
    CrazyGames: {
      SDK: {
        ad: any;
        banner: any;
        game: {
          isInstantMultiplayer: boolean;
          gameplayStart: () => void;
          gameplayStop: () => void;
          inviteLink: (params: Record<string, any>, callback: (error: any, link: string) => void) => void;
          showInviteButton: (params: Record<string, any>, callback: (error: any, link: string) => void) => void;
          hideInviteButton: () => void;
          getInviteParam: (param: string, callback: (error: any, value: string) => void) => void;
        };
        user: {
          getUser: () => Promise<{ username: string, profilePictureUrl: string } | null>;
        };
        data: any;
        init: () => Promise<void>;
      };
    };
  }
}

function isWithinCrazyGames(): boolean {
  try {
    const urlParams = new URLSearchParams(self.location.search);
    if (urlParams.has("crazygames")) return true;
    if (window !== window.parent && document.referrer) {
      const parentOrigin = new URL(document.referrer).origin;
      return parentOrigin.includes("crazygames");
    }
  } catch {
    // no-op
  }
  return false;
}

class CrazyGamesSDKManager {
  public readonly isCrazyGames: boolean = isWithinCrazyGames();
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    console.log("[CrazyGames SDK] isCrazyGames: ", this.isCrazyGames);
    await this.waitForLoad();
  }

  waitForLoad(): Promise<void> {
    if (!this.isCrazyGames) {
      return Promise.resolve();
    }

    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    // If we're in CrazyGames but the SDK isn't loaded yet, create a promise
    // that will be resolved when init is called
    this.loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
      script.addEventListener("load", async () => {
        try {
          await window.CrazyGames.SDK.init();
          this.isInitialized = true;
          this.gameLoadComplete();
        } finally {
          resolve();
        }
      });
      script.addEventListener("error", () => reject(new Error("CrazyGames SDK load error")));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  gameLoadComplete(): void {
    console.log("CrazyGames SDK: gameLoadComplete");
    // no explicit API needed for CrazyGames on load complete
  }

  async getUsername(): Promise<string> {
    // Wait for the SDK to load before attempting to get username
    await this.waitForLoad();

    if (!this.isCrazyGames || !window.CrazyGames) {
      return "";
    }

    const user = await window.CrazyGames.SDK.user.getUser();
    console.log("[CrazyGames SDK] user", user);
    return user?.username ?? "";
  }

  async isInstantMultiplayer(): Promise<boolean> {
    await this.waitForLoad();

    return this.isCrazyGames && window.CrazyGames.SDK.game.isInstantMultiplayer;
  }

  gameplayStart(): void {
    console.log("CrazyGames SDK: gameplayStart");
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.gameplayStart) {
        window.CrazyGames.SDK.game.gameplayStart();
      }
    } catch (error) {
      console.log("CrazyGames SDK: ", error);
    }
  }

  gameplayStop(): void {
    console.log("CrazyGames SDK: gameplayStop");
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.gameplayStop) {
        window.CrazyGames.SDK.game.gameplayStop();
      }
    } catch (error) {
      console.log("CrazyGames SDK: ", error);
    }
  }

  // Invite functionality
  inviteLink(params: Record<string, any>, callback: (error: any, link: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.inviteLink) {
        window.CrazyGames.SDK.game.inviteLink(params, callback);
      } else {
        // Fallback for non-CrazyGames environment
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        callback(null, url.toString());
      }
    } catch (error) {
      console.log("CrazyGames inviteLink error:", error);
      callback(error, "");
    }
  }

  showInviteButton(params: Record<string, any>, callback: (error: any, link: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.showInviteButton) {
        window.CrazyGames.SDK.game.showInviteButton(params, callback);
      } else {
        // Fallback for non-CrazyGames environment
        console.log("Invite button would show with params:", params);
        callback(null, "");
      }
    } catch (error) {
      console.log("CrazyGames showInviteButton error:", error);
      callback(error, "");
    }
  }

  hideInviteButton(): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.hideInviteButton) {
        window.CrazyGames.SDK.game.hideInviteButton();
      }
    } catch (error) {
      console.log("CrazyGames hideInviteButton error:", error);
    }
  }

  getInviteParam(param: string, callback: (error: any, value: string) => void): void {
    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.getInviteParam) {
        window.CrazyGames.SDK.game.getInviteParam(param, callback);
      } else {
        // Fallback for non-CrazyGames environment
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get(param) ?? "";
        callback(null, value);
      }
    } catch (error) {
      console.log("CrazyGames getInviteParam error:", error);
      callback(error, "");
    }
  }

  async requestMidGameAd(callback: () => void): Promise<void> {
    await this.waitForLoad();

    if (!this.isCrazyGames || !window.CrazyGames?.SDK?.ad?.requestAd) {
      callback();
      return;
    }
    const callbacks = {
      adFinished: callback,
      adError: callback,
      adStarted: () => console.log("Start midgame ad"),
    };
    try {
      window.CrazyGames.SDK.ad.requestAd("midgame", callbacks);
    } catch {
      callback();
    }
  }

  async requestBanner(id: string, width: number, height: number): Promise<void> {
    if (!this.isCrazyGames) return;
    await this.waitForLoad();

    try {
      await window.CrazyGames.SDK.banner.requestBanner({ id, width, height });
    } catch (error) {
      console.warn("Failed to request CrazyGames banner:", id, error);
    }
  }

  async requestResponsiveBanner(id: string): Promise<void> {
    if (!this.isCrazyGames) return;
    await this.waitForLoad();

    try {
      this.showBanner(id);
      await window.CrazyGames.SDK.banner.requestResponsiveBanner(id);
    } catch (error) {
      console.warn("Failed to request CrazyGames responsive banner:", id, error);
    }
  }

  clearBanners(): void {
    if (this.isCrazyGames) {
      window.CrazyGames.SDK.banner.clearAllBanners();
    }
  }

  showBanner(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = "block";
    }
  }

  hideBanner(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = "none";
    }
  }
}

export const CrazySDK = new CrazyGamesSDKManager();
