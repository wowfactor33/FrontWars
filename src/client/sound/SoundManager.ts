export enum SoundEffect {
  KaChing = "gemstone",
}

class SoundManager {
  public playBackgroundMusic(): void {}

  public stopBackgroundMusic(): void {}

  public setBackgroundMusicVolume(volume: number): void {
    void volume;
  }

  public loadSoundEffect(name: SoundEffect, src: string): void {
    void name;
    void src;
  }

  public playSoundEffect(name: SoundEffect): void {
    void name;
  }

  public setSoundEffectsVolume(volume: number): void {
    void volume;
  }

  public stopSoundEffect(name: SoundEffect): void {
    void name;
  }

  public unloadSoundEffect(name: SoundEffect): void {
    void name;
  }
}

export default new SoundManager();
