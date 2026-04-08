export enum AudioDataState { UNLOADED, LOADING, LOADED, ERROR }

export interface AudioDataOptions {
  /**
   * If true, the file is loaded via HTMLAudioElement for true streaming —
   * better for long files (music, cutscenes) where you don't want to hold
   * the entire file in memory. Only one AudioNode may play a streaming
   * AudioData at a time. Defaults to false.
   */
  stream?: boolean;
  /** Human-readable label used in warnings/errors. Defaults to the filename. */
  name?: string;
}

/**
 * Holds audio data. Either a pointer to a buffer (for short clips/SFX)
 * or a streaming media element (for music / long files).
 * Cannot play by itself; requires an AudioNode.
 */
export class AudioDataHolder {
  public readonly name: string;
  public readonly isStreaming: boolean;

  private _state: AudioDataState = AudioDataState.UNLOADED;

  /**
   * Holds the duration. Avoid using this, opting for `AudioData.duration`
   * @internal
   */
  public _duration: number = 0;
  private _error?: string;

  /**
   * Set after buffered load; decoded lazily by AudioSystem on first play.
   * @internal
   */
  public _rawBuffer?: ArrayBuffer;

  /**
   * Cached decoded result, filled in by AudioSystem after first decode.
   * @internal
   */
  public _audioBuffer?: AudioBuffer;

  /**
   * Set after streaming load.
   * @internal
   */
  public _mediaElement?: HTMLAudioElement;

  /**
   * Persistent source node for the streaming path (created once, reused).
   * @internal
   */
  public _mediaElementSource?: MediaElementAudioSourceNode;

  private readonly _readyCallbacks: Array<() => void> = [];
  private readonly errorCallbacks: Array<(error?: string) => void> = [];

  /** Makes an AudioData resource */
  public constructor(url: string, options: AudioDataOptions = {}) {
    this.isStreaming = options.stream ?? false;
    this.name = options.name ?? url.split('/').pop()?.split('?')[0] ?? 'audio';
    this.load(url);
  }

  /** The current state of this resource */
  public get state(): AudioDataState { return this._state; }
  /** Whether this resource is loaded or not */
  public get isLoaded(): boolean {
    return this._state === AudioDataState.LOADED;
  }
  /** The duration of this resource */
  public get duration(): number { return this._duration; }
  /** If an error occurred, this holds it */
  public get error(): string | undefined { return this._error; }

  /**
   * Returns a promise that resolves when the data is ready to play.
   * Resolves immediately if already loaded; rejects if loading failed.
   */
  public ready(): Promise<void> {
    if (this._state === AudioDataState.LOADED)
      return Promise.resolve();
    if (this._state === AudioDataState.ERROR)
      return Promise.reject(new Error(this._error));
    return new Promise<void>((resolve, reject) => {
      this._readyCallbacks.push(resolve);
      this.errorCallbacks.push(() => reject(new Error(this._error)));
    });
  }

  /** */
  private async load(url: string): Promise<void> {
    this._state = AudioDataState.LOADING;
    try {
      if (this.isStreaming) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.loadStreaming((window as any).fetchRelativeTo + url);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.loadBuffered((window as any).fetchRelativeTo + url);
      }
      this._state = AudioDataState.LOADED;
      this.flush(this._readyCallbacks);
    } catch (err) {
      this._state = AudioDataState.ERROR;
      this._error = err instanceof Error ? err.message : String(err);
      this.flush(this.errorCallbacks, this._error as string);
    }
    // Clear callback arrays once settled
    this._readyCallbacks.length = 0;
    this.errorCallbacks.length = 0;
  }

  /** */
  private async loadBuffered(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    // Store raw bytes; AudioSystem decodes on first play so we don't need
    // the AudioContext here, keeping AudioData dependency-free.
    this._rawBuffer = await response.arrayBuffer();
  }

  /** */
  private loadStreaming(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const el = new Audio();
      el.preload = 'metadata';
      el.crossOrigin = 'anonymous';
      el.src = url;

      el.onloadedmetadata = () => {
        this._duration = isFinite(el.duration) ? el.duration : 0;
        this._mediaElement = el;
        resolve();
      };
      el.onerror = () => reject(new Error(`Failed to stream "${this.name}"`));
    });
  }

  /** */
  private flush<T>(callbacks: ((arg?: T) => void)[], arg?: T): void {
    for (const cb of callbacks) cb(arg);
  }
}
