declare global {
  interface Window {
    nitroAds: any & {
      queue: any[];
      createAd: (
        id: string,
        options?: Record<string, any>,
        ...rest: any[]
      ) => Promise<any>;
      addUserToken: (...args: any[]) => void;
    };
  }
}

class NitroPaySDKManager {
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;
  public enabled = false;

  async init({ shouldLoad }: { shouldLoad: boolean }): Promise<void> {
    this.enabled = shouldLoad;
    if (!shouldLoad) return; // do not load on CrazyGames
    await this.ensureScript();
  }

  private ensureScript(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = "https://s.nitropay.com/ads-2216.js";
      script.addEventListener("load", () => {
        this.isInitialized = true;
        resolve();
      });
      script.addEventListener("error", () => {
        reject(new Error("NitroPay SDK load error"));
      });
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async renderBanner(
    id: string,
    options?: Record<string, any>,
    ...rest: any[]
  ): Promise<void> {
    if (!this.enabled) return;
    try {
      this.showBanner(id);
      await this.ensureScript();
      await window.nitroAds.createAd(id, options, ...rest);
    } catch (error) {
      console.warn("NitroPay renderBanner failed", id, error);
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

export const NitroPaySDK = new NitroPaySDKManager();
