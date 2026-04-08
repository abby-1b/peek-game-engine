import { Peek } from '../peek';
import { AudioDataHolder } from '../resources/AudioDataHolder';
import { Gen } from '../resources/Gen.ts';
import { AudioCategory, AudioSystem, PlaybackId } from '../systems/AudioSystem';
import { PNode } from './PNode';

export interface AudioNodeOptions {
  volume?: number;
  pitch?: number;
  pitchVariation?: number;
  loop?: boolean;
  /**
   * Maximum number of loops before stopping. 0 = infinite.
   * Only meaningful when loop is true. Default: 0.
   */
  maxLoops?: number;
  category?: AudioCategory;
  /** World position for 3-D positional audio. */
  position?: { x: number; y: number };
  /** Called when the audio ends naturally (not on manual stop). */
  onFinished?: () => void;
  /**
   * Called each time the audio loops.
   * Receives the current loop count (1-based).
   */
  onLooped?: (loopCount: number) => void;
}

/**
 * User-facing playback controller. Holds an AudioData reference and a
 * handful of playback properties (volume, pitch, loop, etc.), then
 * delegates all Web Audio work to AudioSystem.
 */
export class AudioNode extends PNode {
  private static innerNextId = 0;
  public readonly id: number;

  public readonly audioData: AudioDataHolder;

  // --- Config (all settable at any time) ---

  public loop: boolean;
  public maxLoops: number;
  public category: AudioCategory;

  public onFinished?: () => void;
  public onLooped?: (loopCount: number) => void;

  private innerVolume: number;
  private innerPitch: number;
  public pitchVariation: number = 1;
  private innerPosition?: { x: number; y: number };

  // --- Internal state ---

  private innerPlaybackId: PlaybackId = -1;
  private innerIsPlaying: boolean = false;
  private innerIsPaused: boolean = false;
  private innerPauseOffset: number = 0;
  private innerLoopCount: number = 0;
  private innerFadeTimer?: ReturnType<typeof setTimeout>;

  // --- Constructor ---

  /** Creates an audio node! */
  public constructor(
    audioData: AudioDataHolder,
    options: AudioNodeOptions = {},
  ) {
    super();
    this.id = AudioNode.innerNextId++;
    this.audioData = audioData;
    this.innerVolume = options.volume ?? 1.0;
    this.innerPitch = options.pitch ?? 1.0;
    this.pitchVariation = options.pitchVariation ?? 0.0;
    this.loop = options.loop ?? false;
    this.maxLoops = options.maxLoops ?? 0;
    this.category = options.category ?? AudioCategory.SFX;
    this.innerPosition = options.position;
    this.onFinished = options.onFinished;
    this.onLooped = options.onLooped;
  }

  // --- State getters ---

  /** */
  public get isAudioPlaying(): boolean {
    return this.innerIsPlaying;
  }
  /** */
  public get isAudioPaused(): boolean {
    return this.innerIsPaused;
  }
  /** */
  public get loopCount(): number {
    return this.innerLoopCount;
  }

  /** Playback position in seconds. 0 when not playing. */
  public get currentTime(): number {
    if (this.innerPlaybackId < 0) {
      return this.innerIsPaused ? this.innerPauseOffset : 0;
    }
    return (
      Peek.getScene()
        ?.getSystem(AudioSystem)
        ?._getCurrentTime(this.innerPlaybackId) ?? 0
    );
  }

  /** Playback progress from 0 (start) to 1 (end). */
  public get progress(): number {
    const dur = this.audioData.duration;
    return dur > 0 ? Math.min(1, this.currentTime / dur) : 0;
  }

  // --- Live property setters ---

  /** */
  public get volume(): number {
    return this.innerVolume;
  }
  /** */
  public set volume(v: number) {
    this.innerVolume = Math.max(0, Math.min(1, v));
    if (this.innerPlaybackId >= 0) {
      const system = Peek.getScene()?.getSystem(AudioSystem);
      if (!system) return;
      system._setGain(
        this.innerPlaybackId,
        this.innerVolume * system.getEffectiveVolume(this.category),
      );
    }
  }

  /** */
  public setVolume(volume: number): this {
    this.volume = volume;
    return this;
  }

  /** */
  public get pitch(): number {
    return this.innerPitch;
  }

  /** */
  public set pitch(v: number) {
    this.innerPitch = Math.max(0.1, Math.min(4.0, v));
    if (this.innerPlaybackId >= 0) {
      Peek.getScene()
        ?.getSystem(AudioSystem)
        ?._setPitch(this.innerPlaybackId, this.innerPitch);
    }
  }

  /** Changes the pitch variation for this audio node */
  public setPitchVariation(v: number): this {
    this.pitchVariation = v;
    return this;
  }

  /** */
  public get position(): { x: number; y: number } | undefined {
    return this.innerPosition;
  }
  /** */
  public set position(v: { x: number; y: number } | undefined) {
    this.innerPosition = v;
    if (this.innerPlaybackId >= 0 && v) {
      Peek.getScene()
        ?.getSystem(AudioSystem)
        ?._setPosition(this.innerPlaybackId, v.x, v.y);
    }
  }

  public ignorePosition = false;

  /** */
  public setIgnorePosition(): this {
    this.ignorePosition = true;
    return this;
  }

  // --- Playback controls ---

  /**
   * Starts playback from the beginning (or from `offset` seconds).
   * Stops any current playback first.
   */
  public async play(offset = 0): Promise<void> {
    if (this.innerIsPlaying) this.stop();
    this.innerIsPlaying = true;
    this.innerIsPaused = false;
    this.innerLoopCount = 0;
    await this.innerStartPlayback(offset);
  }

  /**
   * Pauses the audio from this node,
   * allowing it to continue from where it left off later.
   */
  public pauseAudio(): void {
    if (!this.innerIsPlaying || this.innerIsPaused) return;
    const system = Peek.getScene()?.getSystem(AudioSystem);
    if (system) this.innerPauseOffset = system._pause(this.innerPlaybackId);
    this.innerPlaybackId = -1;
    this.innerIsPlaying = false;
    this.innerIsPaused = true;
  }

  /** Continues playing audio from this node */
  public resume(): void {
    if (!this.innerIsPaused) return;
    this.innerIsPaused = false;
    this.innerIsPlaying = true;
    this.innerStartPlayback(this.innerPauseOffset);
  }

  /** Stops playing audio from this node */
  public stop(): void {
    if (!this.innerIsPlaying && !this.innerIsPaused) return;
    if (this.innerPlaybackId >= 0)
      Peek.getScene()?.getSystem(AudioSystem)?._stop(this.innerPlaybackId);
    this.innerReset();
  }

  // --- Fades ---

  /**
   * Smoothly ramps volume to `targetVolume` over `duration` seconds.
   * Does not stop playback — combine with stop/play manually if needed.
   */
  public fadeTo(targetVolume: number, duration: number): void {
    if (this.innerPlaybackId < 0) return;
    const target = Math.max(0, Math.min(1, targetVolume));
    const system = Peek.getScene()?.getSystem(AudioSystem);
    if (system) {
      system._rampGain(
        this.innerPlaybackId,
        target * system.getEffectiveVolume(this.category),
        duration,
      );
    }
    // Sync internal volume after the ramp completes
    this.innerScheduleFadeSync(() => {
      this.innerVolume = target;
    }, duration);
  }

  /**
   * Starts playback at silence and fades in to current
   * volume over `duration` seconds.
   */
  public async fadeIn(duration: number): Promise<void> {
    const targetVolume = this.innerVolume;
    this.innerVolume = 0;
    await this.play();
    this.fadeTo(targetVolume, duration);
    this.innerScheduleFadeSync(() => {
      this.innerVolume = targetVolume;
    }, duration);
  }

  /**
   * Fades volume to silence over `duration` seconds, then stops.
   */
  public fadeOut(duration: number): void {
    if (!this.innerIsPlaying) return;
    this.fadeTo(0, duration);
    this.innerScheduleFadeSync(() => this.stop(), duration);
    this.loop = false;
  }

  // --- Utility ---

  /**
   * Fire-and-forget: plays once, then self-cleans.
   * Returns the AudioNode in case you want to cancel early — but you don't
   * need to hold a reference for cleanup.
   */
  public static fireAndForget(
    audioData: AudioDataHolder,
    options: AudioNodeOptions = {},
  ): AudioNode {
    const node = new AudioNode(audioData, {
      ...options,
      loop: false,
      onFinished: () => {
        options.onFinished?.();
        // node is now GC-eligible, no explicit cleanup required
      },
    });
    node.play();
    return node;
  }

  // --- Private ---

  /** */
  private async innerStartPlayback(offset: number): Promise<void> {
    const system = Peek.getScene()?.getSystem(AudioSystem);
    if (!system) return;
    this.innerPlaybackId = await system._play(
      this.audioData,
      {
        volume: this.innerVolume,
        pitch: this.innerPitch + (Math.random() - 0.5) * this.pitchVariation,
        category: this.category,
        position: this.ignorePosition ? { x: 0, y: 0 } : this.innerPosition,
      },
      offset,
      () => this._handleEnded(),
    );
  }

  /**
   * Called by AudioSystem when a source node ends naturally.
   * Decides whether to loop or finish.
   */
  private _handleEnded(): void {
    this.innerPlaybackId = -1;

    const infinite = this.maxLoops === 0;
    const underLimit = this.innerLoopCount + 1 < this.maxLoops;
    const shouldLoop = this.loop && (infinite || underLimit);

    if (shouldLoop) {
      this.innerLoopCount++;
      this.onLooped?.(this.innerLoopCount);
      this.innerStartPlayback(0);
    } else {
      this.innerIsPlaying = false;
      this.innerIsPaused = false;
      this.innerLoopCount = 0;
      this.onFinished?.();
    }
  }

  /** */
  private innerReset(): void {
    this.innerPlaybackId = -1;
    this.innerIsPlaying = false;
    this.innerIsPaused = false;
    this.innerPauseOffset = 0;
    this.innerLoopCount = 0;
    clearTimeout(this.innerFadeTimer);
  }

  /** */
  private innerScheduleFadeSync(fn: () => void, delaySec: number): void {
    clearTimeout(this.innerFadeTimer);
    this.innerFadeTimer = setTimeout(fn, delaySec * 1000);
  }
}
