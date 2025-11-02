import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import "./components/baseComponents/Modal";

@customElement("language-modal")
export class LanguageModal extends LitElement {
  @property({ type: Array }) languageList: any[] = [];
  @property({ type: String }) currentLang = "en";

  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
    isModalOpen: boolean;
  };

  createRenderRoot() {
    return this; // Use Light DOM for TailwindCSS classes
  }

  public show() {
    this.requestUpdate();
    this.modalEl?.open();
  }

  public open() {
    this.show();
  }

  public hide(options?: { silent?: boolean }) {
    this.close(options);
  }

  public close(options?: { silent?: boolean }) {
    const wasVisible = this.modalEl?.isModalOpen;
    this.modalEl?.close();

    if (wasVisible && !options?.silent) {
      this.emitCloseEvent();
    }
  }

  private emitCloseEvent() {
    this.dispatchEvent(
      new CustomEvent("close-modal", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.modalEl?.isModalOpen) return;

    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  private selectLanguage = (lang: string) => {
    this.dispatchEvent(
      new CustomEvent("language-selected", {
        detail: { lang },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    return html`
      <o-modal title="${translateText("select_lang.title")}">
        <div class="modal-overlay">
          <div class="modal-content">
            ${this.languageList.map((lang) => {
              const isActive = this.currentLang === lang.code;
              const isDebug = lang.code === "debug";

              let buttonClasses =
                "w-full flex items-center gap-2 p-2 mb-2 rounded-md transition-colors duration-300 border";

              if (isDebug) {
                buttonClasses +=
                  " animate-pulse font-bold text-white border-2 border-dashed border-cyan-400 shadow-lg shadow-cyan-400/25 bg-gradient-to-r from-red-600 via-yellow-600 via-green-600 via-blue-600 to-purple-600";
              } else if (isActive) {
                buttonClasses +=
                  " bg-gray-400 dark:bg-gray-500 border-gray-300 dark:border-gray-400 text-black dark:text-white";
              } else {
                buttonClasses +=
                  " bg-gray-600 dark:bg-gray-700 border-gray-500 dark:border-gray-600 text-white dark:text-gray-100 hover:bg-gray-500 dark:hover:bg-gray-600";
              }

              return html`
                <button
                  class="${buttonClasses}"
                  @click=${() => this.selectLanguage(lang.code)}
                >
                  <img
                    src="/flags/${lang.svg}.svg"
                    class="w-12 h-8 object-contain"
                    alt="${lang.code}"
                  />
                  <span>${lang.native} (${lang.en})</span>
                </button>
              `;
            })}
          </div>
        </div>
      </o-modal>
    `;
  }
}
