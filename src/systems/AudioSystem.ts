import { AudioDataHolder } from '../resources/AudioDataHolder';
import { System } from './System';
import { SystemHolder } from './SystemHolder';

export enum AudioCategory {
  MASTER = 'master',
  MUSIC = 'music',
  SFX = 'sfx',
  UI = 'ui',
}

/** Configuration passed by AudioNode when starting a playback */
export interface PlaybackConfig {
  volume: number;
  pitch: number;
  category: AudioCategory;
  /** World position for optional 3-D panning (2-D games use x/y) */
  position?: { x: number; y: number };
}

/** Opaque handle returned by AudioSystem._play(); stored on AudioNode */
export type PlaybackId = number;

interface ActivePlayback {
  data: AudioDataHolder;
  config: PlaybackConfig;
  gainNode: GainNode;
  pannerNode: PannerNode | undefined;
  /** For buffered audio: the source node */
  source: AudioBufferSourceNode | undefined;
  /** Absolute AudioContext time when this playback started (for currentTime) */
  startedAt: number;
  /** Buffer offset when this playback started (for currentTime) */
  offset: number;
  /** Called when the source ends naturally (not from a manual stop/pause) */
  onEnded: () => void;
}

/**
 * Owns the Web Audio context and the category gain graph.
 * Persists volume settings to localStorage!
 */
export class AudioSystem extends System {
  private static _instance: AudioSystem;

  private _ctx?: AudioContext;
  private _masterGain?: GainNode;
  private _categoryGains: Map<AudioCategory, GainNode> = new Map();
  private _isReady = false;

  private _volumes: Map<AudioCategory, number> = new Map();
  private _muted: Map<AudioCategory, boolean> = new Map();

  private _playbacks: Map<PlaybackId, ActivePlayback> = new Map();
  private static _nextId: PlaybackId = 0;

  /** Creates the AudioSystem */
  public constructor(parent: SystemHolder) {
    super(parent);
    for (const cat of Object.values(AudioCategory)) {
      this._volumes.set(cat, 1.0);
      this._muted.set(cat, false);
    }
    this.loadSettings();
    this.setupBrowserUnlock();
    this.initialize(); // attempt early init (usually fails until user gesture)
  }

  /**  */
  public get isReady(): boolean { return this._isReady; }

  /** Raw AudioContext — use carefully; prefer the methods below. */
  public get context(): AudioContext {
    if (!this._ctx)
      throw new Error(
        'AudioSystem not ready. Await AudioSystem.waitUntilReady().'
      );
    return this._ctx;
  }

  /** Resolves once the AudioContext is unlocked and running. */
  public waitUntilReady(): Promise<void> {
    if (this._isReady) return Promise.resolve();
    return new Promise(resolve => {
      const check = () => {
        if (this._isReady) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  /** Sets a category's volume */
  public setVolume(category: AudioCategory, volume: number): void {
    this._volumes.set(category, Math.max(0, Math.min(1, volume)));
    this.applyVolume(category);
    this.saveSettings();
  }

  /** Gets a category's volume */
  public getVolume(category: AudioCategory): number {
    return this._volumes.get(category) ?? 1;
  }

  /** Sets a category's mute state */
  public setMute(category: AudioCategory, muted: boolean): void {
    this._muted.set(category, muted);
    this.applyVolume(category);
    this.saveSettings();
  }

  /** Checks if a category is muted */
  public isMuted(category: AudioCategory): boolean {
    return this._muted.get(category) ?? false;
  }

  /**
   * Gets the effective volume for a category.
   * Calculated using `master * category`, respecting mutes.
   */
  public getEffectiveVolume(category: AudioCategory): number {
    const masterMuted = this._muted.get(AudioCategory.MASTER) ?? false;
    const masterVol = masterMuted
      ? 0
      : (this._volumes.get(AudioCategory.MASTER) ?? 1);
    if (category === AudioCategory.MASTER) return masterVol;
    const catMuted = this._muted.get(category) ?? false;
    const catVol = catMuted ? 0 : (this._volumes.get(category) ?? 1);
    return masterVol * catVol;
  }

  /** Resets the system's settings */
  public resetSettings(): void {
    for (const cat of Object.values(AudioCategory)) {
      this._volumes.set(cat, 1.0);
      this._muted.set(cat, false);
    }
    this.applyAllVolumes();
    this.saveSettings();
  }

  /**
   * Starts playback of `data` with the given config.
   * Calls `onEnded` when the source finishes naturally (not on manually).
   * Returns a PlaybackId used to control this playback instance.
   */
  public async _play(
    data: AudioDataHolder,
    config: PlaybackConfig,
    offset: number,
    onEnded: () => void,
  ): Promise<PlaybackId> {
    if (!this._isReady) {
      console.warn(`AudioSystem: not ready, cannot play "${data.name}"`);
      return -1;
    }

    await data.ready();

    const id  = AudioSystem._nextId++;
    const ctx = this._ctx!;

    // Per-playback gain node, routed through category → master
    const gainNode = ctx.createGain();
    gainNode.gain.value =
      config.volume * this.getEffectiveVolume(config.category);
    const catGain = this._categoryGains.get(config.category);
    gainNode.connect(catGain ?? this._masterGain!);

    // Optional panner for positional audio
    const pannerNode = config.position
      ? this.createPanner(ctx, config.position, gainNode)
      : undefined;

    const destination = pannerNode ?? gainNode;

    if (data.isStreaming) {
      await this._startStreaming(
        id, data, config, offset, gainNode, pannerNode, destination, onEnded
      );
    } else {
      await this._startBuffered(
        id, data, config, offset, gainNode, pannerNode, destination, onEnded
      );
    }

    return id;
  }

  /** Stops a playback immediately. Silent if the id is no longer active. */
  public _stop(id: PlaybackId): void {
    const pb = this._playbacks.get(id);
    if (!pb) return;
    // Remove first so the onended handler ignores this event.
    this._playbacks.delete(id);
    this._teardown(pb);
  }

  /**
   * Pauses a playback and returns the offset (in seconds) it was paused at,
   * so the caller can resume from that point.
   */
  public _pause(id: PlaybackId): number {
    const pb = this._playbacks.get(id);
    if (!pb) return 0;

    const pauseOffset = this._currentTimeOf(pb);
    this._playbacks.delete(id);
    this._teardown(pb);
    return pauseOffset;
  }

  /** Updates the gain of a live playback (e.g., volume setter on AudioNode). */
  public _setGain(id: PlaybackId, gain: number): void {
    const pb = this._playbacks.get(id);
    if (pb) pb.gainNode.gain.value = gain;
  }

  /** Ramps gain smoothly — used by AudioNode.fadeTo(). */
  public _rampGain(id: PlaybackId, targetGain: number, duration: number): void {
    const pb = this._playbacks.get(id);
    if (!pb) return;
    const g = pb.gainNode.gain;
    g.cancelScheduledValues(this._ctx!.currentTime);
    g.setValueAtTime(g.value, this._ctx!.currentTime);
    g.linearRampToValueAtTime(targetGain, this._ctx!.currentTime + duration);
  }

  /** Updates the playback rate (pitch) of a live playback. */
  public _setPitch(id: PlaybackId, pitch: number): void {
    const pb = this._playbacks.get(id);
    if (!pb) return;
    if (pb.source) {
      pb.source.playbackRate.value = pitch;
    } else if (pb.data._mediaElement) {
      pb.data._mediaElement.playbackRate = pitch;
    }
  }

  /** Updates the 3-D position of a live playback. */
  public _setPosition(id: PlaybackId, x: number, y: number): void {
    const pb = this._playbacks.get(id);
    if (!pb?.pannerNode) return;
    pb.pannerNode.positionX.value = x;
    pb.pannerNode.positionY.value = y;
  }

  /** Returns the current playback position in seconds. */
  public _getCurrentTime(id: PlaybackId): number {
    const pb = this._playbacks.get(id);
    if (!pb) return 0;
    return this._currentTimeOf(pb);
  }

  /**
   * Immediately stops all active playbacks, optionally filtered by category.
   * Note: this bypasses AudioNode state! Use when you need a hard reset
   * (e.g., scene transitions). For graceful stops, iterate your AudioNodes.
   */
  public stopAll(category?: AudioCategory): void {
    for (const [id, pb] of this._playbacks) {
      if (!category || pb.config.category === category) {
        this._playbacks.delete(id);
        this._teardown(pb);
      }
    }
  }

  // --- Internals -----------------------------------------------------------

  /** */
  private async _startBuffered(
    id: PlaybackId,
    data: AudioDataHolder,
    config: PlaybackConfig,
    offset: number,
    gainNode: GainNode,
    pannerNode: PannerNode | undefined,
    destination: AudioNode,
    onEnded: () => void,
  ): Promise<void> {
    const ctx    = this._ctx!;
    const buffer = await this._ensureDecoded(data);

    const source          = ctx.createBufferSource();
    source.buffer         = buffer;
    source.playbackRate.value = config.pitch;
    source.loop           = false; // AudioNode manages looping manually
    source.connect(destination);

    const pb: ActivePlayback = {
      data, config, gainNode, pannerNode,
      source,
      startedAt: ctx.currentTime - offset,
      offset,
      onEnded,
    };

    source.onended = () => {
      // Ignore if we stopped/paused this playback manually.
      if (!this._playbacks.has(id)) return;
      this._playbacks.delete(id);
      gainNode.disconnect();
      pannerNode?.disconnect();
      onEnded();
    };

    this._playbacks.set(id, pb);
    source.start(0, offset);
  }

  /** */
  private async _startStreaming(
    id: PlaybackId,
    data: AudioDataHolder,
    config: PlaybackConfig,
    offset: number,
    gainNode: GainNode,
    pannerNode: PannerNode | undefined,
    destination: AudioNode,
    onEnded: () => void,
  ): Promise<void> {
    const el = data._mediaElement!;

    // Create or reuse the MediaElementAudioSourceNode
    if (!data._mediaElementSource) {
      data._mediaElementSource = this._ctx!.createMediaElementSource(el);
    }
    data._mediaElementSource.connect(destination);

    el.currentTime = offset;
    el.playbackRate = config.pitch;
    el.loop = false;

    const pb: ActivePlayback = {
      data, config, gainNode, pannerNode,
      source: undefined,
      startedAt: this._ctx!.currentTime - offset,
      offset,
      onEnded,
    };

    el.onended = () => {
      if (!this._playbacks.has(id)) return;
      this._playbacks.delete(id);
      data._mediaElementSource?.disconnect();
      gainNode.disconnect();
      pannerNode?.disconnect();
      onEnded();
    };

    this._playbacks.set(id, pb);
    await el.play();
  }

  /** */
  private _teardown(pb: ActivePlayback): void {
    if (pb.source) {
      try { pb.source.stop(); } catch { /* already stopped */ }
      pb.source.disconnect();
    } else if (pb.data._mediaElement) {
      pb.data._mediaElement.pause();
      pb.data._mediaElement.onended = null;
      pb.data._mediaElementSource?.disconnect();
    }
    pb.gainNode.disconnect();
    pb.pannerNode?.disconnect();
  }

  /** */
  private _currentTimeOf(pb: ActivePlayback): number {
    if (pb.data.isStreaming && pb.data._mediaElement) {
      return pb.data._mediaElement.currentTime;
    }
    return Math.max(0, this._ctx!.currentTime - pb.startedAt);
  }

  /** */
  private async _ensureDecoded(data: AudioDataHolder): Promise<AudioBuffer> {
    if (data._audioBuffer) return data._audioBuffer;
    if (!data._rawBuffer)
      throw new Error(`AudioData "${data.name}" has no raw buffer.`);
    // slice() so decodeAudioData can take ownership of the ArrayBuffer
    const decoded = await this._ctx!.decodeAudioData(data._rawBuffer.slice(0));
    data._audioBuffer = decoded;
    data._duration = decoded.duration; // fill in now that we know
    return decoded;
  }

  /** */
  private createPanner(
    ctx: AudioContext,
    position: { x: number; y: number },
    gainNode: GainNode,
  ): PannerNode {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10_000;
    panner.rolloffFactor = 1;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = 0;
    panner.connect(gainNode);
    return panner;
  }

  /** */
  private setupBrowserUnlock(): void {
    const unlock = () => {
      this.initialize();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  /** */
  private async initialize(): Promise<void> {
    if (this._isReady) return;
    try {
      this._ctx =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window.AudioContext ?? (window as any).webkitAudioContext)();

      this._masterGain = this._ctx.createGain();
      this._masterGain.connect(this._ctx.destination);

      for (const cat of Object.values(AudioCategory)) {
        if (cat === AudioCategory.MASTER) continue;
        const gain = this._ctx.createGain();
        gain.connect(this._masterGain);
        this._categoryGains.set(cat, gain);
      }

      this._isReady = true;
      this.applyAllVolumes();

      document.addEventListener('visibilitychange', () => {
        if (!this._ctx) return;
        if (document.hidden) this._ctx.suspend();
        else this._ctx.resume();
      });
    } catch {
      /* Will retry on next user gesture */
    }
  }

  /** */
  private applyVolume(category: AudioCategory): void {
    if (!this._isReady) return;
    const vol = this.getEffectiveVolume(category);
    if (category === AudioCategory.MASTER) {
      this._masterGain!.gain.value = vol;
    } else {
      const gain = this._categoryGains.get(category);
      if (gain) gain.gain.value = vol;
    }
  }

  /** */
  private applyAllVolumes(): void {
    for (const cat of Object.values(AudioCategory)) this.applyVolume(cat);
  }

  private readonly _STORAGE_KEY = 'audio-settings';

  /** */
  private saveSettings(): void {
    try {
      localStorage.setItem(this._STORAGE_KEY, JSON.stringify({
        volumes: Object.fromEntries(this._volumes),
        muted: Object.fromEntries(this._muted),
      }));
    } catch {
      /* storage unavailable */
    }
  }

  /** */
  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(this._STORAGE_KEY);
      if (!raw) return;
      const { volumes, muted } = JSON.parse(raw);
      if (volumes) for (const [k, v] of Object.entries(volumes))
        this._volumes.set(k as AudioCategory, v as number);
      if (muted) for (const [k, v] of Object.entries(muted))
        this._muted.set(k as AudioCategory, v as boolean);
    } catch { /* corrupted storage, ignore */ }
  }

  /** */
  public process(): void {}
}
