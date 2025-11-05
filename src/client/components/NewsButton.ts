import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import newsIcon from "../../../resources/images/NewsIcon.png";
import megaphoneIcon from "../../../resources/images/Megaphone.svg";
import version from "../../../resources/version.txt";
import { NewsModal } from "../NewsModal";
import { translateText } from "../Utils";
import { AdProvider } from "../AdProvider";

@customElement("news-button")
export class NewsButton extends LitElement {
  @property({ type: Boolean }) hidden = false;
  @state() private isActive = false;

  connectedCallback() {
    super.connectedCallback();
    this.checkForNewVersion();
  }

  private checkForNewVersion() {
    try {
      const lastSeenVersion = localStorage.getItem("version");
      this.isActive = lastSeenVersion !== version;
    } catch (error) {
      // Fallback to NOT showing notification if localStorage fails
      this.isActive = false;
    }
  }

  private handleClick() {
    localStorage.setItem("version", version);
    this.isActive = false;

    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (newsModal) {
      newsModal.open();
    }
  }

  render() {
    return html`
      <div
        class="flex relative ${this.hidden ? "parent-hidden" : ""}
        ${this.isActive ? "active" : ""}"
      >
        <button
          class="b-button ${AdProvider.isMobile ? "w-[60px] h-[60px]" : ""} flex items-center cursor-pointer"
          @click=${this.handleClick}
        >
          <img
            class="${AdProvider.isMobile ? "size-[60px]" : "w-[40px] h-[50px]"} dark:invert"
            src="${AdProvider.isMobile ? newsIcon : megaphoneIcon}"
            alt=${translateText("news.title")}
          />
        </button>
      </div>
    `;
  }

  createRenderRoot() {
    return this;
  }
}
