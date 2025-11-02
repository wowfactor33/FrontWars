import { AdProvider } from "./AdProvider";

class Scale {
  public scale = 1;
  public ingameScale = 1;
  public isMobile = AdProvider.isMobile;

  init() {
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("DOMContentLoaded", () => this.applyScale());
    // Fallback for late-mounted content
    this.onResize();
  }

  computeScale() {
    const height = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0,
    );
    const baseHeight = this.isMobile ? 540 : 760;
    if (height >= baseHeight) return 1;
    return Math.min(1, height / baseHeight);
  }

  computeIngameScale(multiplierX: number = 1, multiplierY: number = multiplierX) {
    const gc = gcd();
    let initial_scale = 1;
    const { w, h } = { w: 16, h: 9 };
    
    if((gc * window.innerWidth) / (gc * window.innerHeight) > w / h) {
      initial_scale = vh(27) / 75 * multiplierX;
    } else {
      initial_scale = (h * vw(27) / w) / 75 * multiplierY;
    }
  
    return Math.min(1, initial_scale);
  }
  
  applyScale() {
    const container = document.querySelector(".scale-container") as HTMLElement;
    if (!container) return;
    this.scale = this.computeScale();
    this.ingameScale = this.computeIngameScale();
    if (this.isMobile) {
      container.style.transform = "translate(-50%, -50%) scale(" + this.scale + ")";
    } else {
      container.style.transform = "scale(" + this.scale + ")";
    }

    const gameLeftSidebar = document.querySelector("game-left-sidebar aside") as HTMLElement;
    if (gameLeftSidebar) {
      gameLeftSidebar.style.transform = "scale(" + this.ingameScale + ")";
    }
    
    const gameRightSidebar = document.querySelector("game-right-sidebar aside") as HTMLElement;
    if (gameRightSidebar) {    
      gameRightSidebar.style.transform = "scale(" + this.ingameScale + ")";
    }

    const radialMenuContainer = document.querySelector(".radial-menu-container svg") as HTMLElement;
    if (radialMenuContainer) {
      radialMenuContainer.style.transform = `translate(-50%, -50%) scale(${this.computeIngameScale(0.4, 0.8)})`;
    }

    const playerInfoOverlay = document.querySelector("player-info-overlay div") as HTMLElement;
    if (playerInfoOverlay) {
      playerInfoOverlay.style.transform = `scale(${this.computeIngameScale(0.7)})`;
    }

    const controlPanel = document.querySelector("control-panel div") as HTMLElement;
    if (controlPanel) {
      if (window.innerWidth > window.innerHeight || window.matchMedia("(orientation: landscape)").matches) {
        controlPanel.style.transform = `scale(${this.computeIngameScale(0.5, 1)})`;
      } else {
        controlPanel.style.transform = `scale(1)`;
      }
    }

    AdProvider.updateBannerVisibility(this.scale);
  }
  
  onResize() {
    requestAnimationFrame(() => this.applyScale());
  }
}

export const scale = new Scale();

function vh(v) {
  const h = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0,
  );
  return (v * h) / 100;
}

function vw(v) {
  const w = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0,
  );
  return (v * w) / 100;
}

function gcd(a = window.innerWidth, b = window.innerHeight) {
  return b === 0 ? a : gcd(b, a % b);
}