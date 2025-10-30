import { CrazySDK } from "./CrazyGamesSDK";
import { NitroPaySDK } from "./NitroPaySDK";

function isWithinExpo(): boolean {
  try {
    const urlParams = new URLSearchParams(self.location.search);
    if (urlParams.has("expo")) return true;

    // Check if referrer parent origin includes "expo"
    if (window !== window.parent && document.referrer) {
      const parentOrigin = new URL(document.referrer).origin;
      if (parentOrigin.includes("expo")) return true;
    }

    // Check if current location is mobile.<something>
    const hostname = self.location.hostname;
    if (
      hostname.startsWith("mobile.") ||
      /^mobile\./.test(hostname)
    ) {
      return true;
    }
  } catch {
    // no-op
  }
  return false;
}

class AdProviderManager {
  public readonly isCrazyGames = CrazySDK.isCrazyGames;
  public readonly isExpo = isWithinExpo();
  private initialized = false;
	private refreshTimerId: number | null = null;

	private readonly nitroCommonOptions: Record<string, any> = {
		sizes: [["300", "600"]],
		report: {
			enabled: true,
			icon: true,
			wording: "Report Ad",
			position: "top-right",
		},
	};

  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize CrazyGames (non-blocking)
    void CrazySDK.init();

		// Initialize NitroPay only if not in CrazyGames (non-blocking)
		console.log("isExpo: ", this.isExpo);
		void NitroPaySDK.init({ shouldLoad: !this.isExpo && !this.isCrazyGames });

		// Initial render across providers
		void this.renderBanners();

		// Set up a unified refresh timer
		if (this.refreshTimerId === null) {
			this.refreshTimerId = window.setInterval(() => {
				void this.refreshBanners();
			}, 60000);
		}

    this.initialized = true;
  }

	async renderBanners(): Promise<void> {
    console.log("renderBanners");
		if (this.isCrazyGames) {
			void CrazySDK.requestResponsiveBanner("cg-banner-left");
			void CrazySDK.requestResponsiveBanner("cg-banner-right");
			// Bottom banner may be disabled in markup, safe to request
			// void CrazySDK.requestResponsiveBanner("cg-banner-bottom");
			return;
		}

		// NitroPay banners
		void NitroPaySDK.renderBanner("frontwars-300x600", this.nitroCommonOptions);
		void NitroPaySDK.renderBanner("frontwars-300x600_2", this.nitroCommonOptions);
	}

	async renderIngameBanner(): Promise<void> {
		void NitroPaySDK.renderBanner("frontwars-728x90", {
			sizes: [["728", "90"]],
			report: this.nitroCommonOptions.report,
		});
	}

	async refreshBanners(): Promise<void> {
		console.log("refresh banners")
		if (this.isCrazyGames) {
			void CrazySDK.requestResponsiveBanner("cg-banner-left");
			void CrazySDK.requestResponsiveBanner("cg-banner-right");
			// Bottom banner may be disabled in markup, safe to request
			// void CrazySDK.requestResponsiveBanner("cg-banner-bottom");
			return;
		}

		// Do not refresh NitroPaySDK: NitroPay manages updates automatically
	}

	updateBannerVisibility(scale: number) {
		const leftBanner = document.getElementById("ad-banner-left");
		const rightBanner = document.getElementById("ad-banner-right");

		if (!leftBanner || !rightBanner) return;

		const width =
			Math.max(
				document.documentElement.clientWidth,
				window.innerWidth || 0,
			) / scale;

		// Calculate scaled breakpoints
		const leftBannerBreakpoint = 880 / scale;
		const bothBannersBreakpoint = 720 / scale;

		if (this.isExpo || (width <= bothBannersBreakpoint)) {
			// Hide both banners
			leftBanner.style.display = "none";
			rightBanner.style.display = "none";
		} else if (width <= leftBannerBreakpoint) {
			// Hide only left banner
			leftBanner.style.display = "none";
			rightBanner.style.display = "block";
		} else {
			// Show both banners
			leftBanner.style.display = "block";
			rightBanner.style.display = "block";
		}
	}

	
  redirectTo(url: string): void {
    if (this.isCrazyGames) {
      // Parse the URL and add the crazygames parameter
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set("crazygames", "true");
      window.location.href = urlObj.toString();
    } else if (this.isExpo) {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set("expo", "true");
      window.location.href = urlObj.toString();
    } else {
      window.location.href = url;
    }
  }
}

export const AdProvider = new AdProviderManager();


