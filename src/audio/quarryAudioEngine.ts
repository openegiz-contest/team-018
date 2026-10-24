/**
 * Procedural Quarry Audio Engine (Silenced / Disabled).
 * Sounds have been disabled in the visualization.
 */
export class QuarryAudioEngine {
  public isMuted: boolean = true;

  public toggleMute(): boolean {
    return false;
  }

  public setSpeedRpm(_speedKmh: number, _isTrolley: boolean): void {}

  public triggerDumpHiss(): void {}

  public setCrusherActive(_active: boolean): void {}

  public updateCameraListener(
    _cx: number,
    _cy: number,
    _cz: number,
    _tx: number,
    _ty: number,
    _tz: number
  ): void {}
}

export const quarryAudio = new QuarryAudioEngine();

