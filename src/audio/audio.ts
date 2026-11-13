/**
 * All sound is synthesised at runtime with the Web Audio API — no audio files
 * ship, which matches how the sprites are generated.
 *
 * Browsers refuse to start audio before a user gesture, so the context stays
 * suspended until the first interaction and every call is a no-op before that.
 */

export type SoundName =
  | 'deal'
  | 'chip'
  | 'fold'
  | 'check'
  | 'win'
  | 'lose'
  | 'ui'
  | 'dialogue'
  | 'alarm'
  | 'cash'
  | 'bugle'
  | 'gate'
  | 'hoof'
  | 'bell'
  | 'jab'
  | 'punch'
  | 'heavy'
  | 'block'
  | 'whoosh'
  | 'roar'
  | 'cheer'
  | 'flash'
  | 'thud'

/** The murmur of a crowd: `level` 0..1 is how worked up it is; `swell` is a roar that rises and falls away. */
export interface AmbienceVoice {
  set(level: number): void
  swell(strength: number): void
  stop(): void
}

/** The sound of a car: see `AudioEngine.engine`. */
export interface EngineVoice {
  /** speed 0..1 of the car's top, throttle 0..1, slide 0..1+, boost on/off. */
  set(o: { speed: number; throttle: number; slide: number; boost: boolean }): void
  impact(strength: number): void
  stop(): void
}

const MUTE_KEY = 'poker-legend-muted'
const VOLUME_KEY = 'poker-legend-volume'

/** The volume a profile with no stored preference plays at. */
export const DEFAULT_VOLUME = 0.9

/**
 * Resolves a stored volume preference.
 *
 * An absent key is `null`, and `Number(null)` is `0` — which is a perfectly
 * valid volume, so the old check accepted it and every brand-new player got
 * silence while the UI cheerfully reported "Sound is on". Only a key that
 * actually exists and parses to a number in [0,1] may override the default.
 */
export function resolveStoredVolume(raw: string | null, fallback = DEFAULT_VOLUME): number {
  if (raw === null || raw.trim() === '') return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback
  return parsed
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private musicTimer: number | null = null
  private musicNodes: { drone: OscillatorNode; droneEnv: GainNode } | null = null
  private muted = false
  private volume = DEFAULT_VOLUME
  private listeners = new Set<(muted: boolean) => void>()

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
      this.volume = resolveStoredVolume(localStorage.getItem(VOLUME_KEY), DEFAULT_VOLUME)
    } catch {
      this.muted = false
      this.volume = DEFAULT_VOLUME
    }
  }

  getVolume() {
    return this.volume
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume))
    } catch {
      // Preference is best-effort.
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02)
    }
    this.listeners.forEach((l) => l(this.muted))
  }

  isMuted() {
    return this.muted
  }

  onChange(listener: (muted: boolean) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      // Preference is best-effort.
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.02)
    }
    this.listeners.forEach((l) => l(muted))
  }

  /** Called from a user gesture; safe to call repeatedly. */
  unlock(): boolean {
    // iOS Safari routes Web Audio through the ringer channel, so the silent switch
    // mutes it; asking for a playback session (iOS 17+) opts out of that.
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    } catch {
      // Not supported.
    }
    const ctx = this.ensureContext()
    if (!ctx) return false
    if (ctx.state !== 'running') {
      void ctx.resume()
      // A silent one-sample buffer played inside the gesture finishes the unlock on iOS.
      try {
        const src = ctx.createBufferSource()
        src.buffer = ctx.createBuffer(1, 1, 22050)
        src.connect(ctx.destination)
        src.start(0)
      } catch {
        // Best-effort.
      }
    }
    return ctx.state === 'running'
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null

    try {
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : this.volume
      master.connect(ctx.destination)

      const musicGain = ctx.createGain()
      musicGain.gain.value = 0.12
      musicGain.connect(master)

      // One second of white noise, reused for every card and chip sound.
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

      this.ctx = ctx
      this.master = master
      this.musicGain = musicGain
      this.noiseBuffer = buffer
      return ctx
    } catch {
      return null
    }
  }

  private tone(
    ctx: AudioContext,
    destination: GainNode,
    {
      freq,
      endFreq,
      type = 'sine',
      duration,
      gain = 0.3,
      delay = 0,
    }: { freq: number; endFreq?: number; type?: OscillatorType; duration: number; gain?: number; delay?: number },
  ) {
    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration)
    env.gain.setValueAtTime(0.0001, start)
    env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.015, duration / 3))
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(env)
    env.connect(destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  private noise(
    ctx: AudioContext,
    destination: GainNode,
    { duration, gain = 0.2, filterFreq = 2000, delay = 0 }: { duration: number; gain?: number; filterFreq?: number; delay?: number },
  ) {
    if (!this.noiseBuffer) return
    const start = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain, start)
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    src.connect(filter)
    filter.connect(env)
    env.connect(destination)
    src.start(start)
    src.stop(start + duration + 0.02)
  }

  /**
   * A car's engine for as long as a race lasts: a sawtooth and a detuned square
   * through a low-pass that opens with the revs, stepping through five gears so
   * you hear each shift; tyre squeal when the car slides, wind with speed, a
   * whoosh under boost. Returns null where there is no audio. Respects mute and
   * volume, because it plays through the master gain like everything else.
   */
  engine(): EngineVoice | null {
    const ctx = this.ensureContext()
    if (!ctx || !this.master || !this.noiseBuffer) return null
    if (ctx.state === 'suspended') void ctx.resume()
    const master = this.master
    const out = ctx.createGain()
    out.gain.value = 0.0001
    out.connect(master)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    lp.connect(out)
    const saw = ctx.createOscillator()
    saw.type = 'sawtooth'
    const sq = ctx.createOscillator()
    sq.type = 'square'
    sq.detune.value = 14
    const sawGain = ctx.createGain()
    sawGain.gain.value = 0.5
    const sqGain = ctx.createGain()
    sqGain.gain.value = 0.22
    saw.connect(sawGain)
    sq.connect(sqGain)
    sawGain.connect(lp)
    sqGain.connect(lp)

    const noiseLoop = (type: BiquadFilterType, freq: number): { gain: GainNode; filter: BiquadFilterNode; src: AudioBufferSourceNode } => {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.value = 0.0001
      src.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      return { gain, filter, src }
    }
    const squeal = noiseLoop('bandpass', 2300)
    const wind = noiseLoop('lowpass', 500)
    const whoosh = noiseLoop('bandpass', 1400)
    for (const n of [saw, sq, squeal.src, wind.src, whoosh.src]) n.start()
    out.gain.setTargetAtTime(0.1, ctx.currentTime, 0.2)

    let stopped = false
    return {
      set: ({ speed, throttle, slide, boost }) => {
        if (stopped) return
        const t = ctx.currentTime
        // Five gears: the revs climb through each and fall back at the shift.
        const g = Math.min(4, Math.floor(speed * 5))
        const rpm = 0.22 + Math.min(1, speed * 5 - g) * 0.78
        const freq = 46 + rpm * 150 * (boost ? 1.12 : 1)
        saw.frequency.setTargetAtTime(freq, t, 0.035)
        sq.frequency.setTargetAtTime(freq * 0.5, t, 0.035)
        lp.frequency.setTargetAtTime(380 + rpm * 1500 + throttle * 500, t, 0.05)
        out.gain.setTargetAtTime(0.06 + 0.07 * throttle + 0.03 * rpm, t, 0.06)
        squeal.gain.gain.setTargetAtTime(Math.min(0.11, slide * 0.16), t, 0.05)
        wind.gain.gain.setTargetAtTime(0.01 + speed * speed * 0.11, t, 0.1)
        whoosh.gain.gain.setTargetAtTime(boost ? 0.1 : 0.0001, t, 0.08)
      },
      impact: (strength) => {
        if (stopped || this.muted) return
        this.noise(ctx, master, { duration: 0.3 + strength * 0.4, gain: 0.25 + strength * 0.5, filterFreq: 500 + strength * 400 })
        this.tone(ctx, master, { freq: 120, endFreq: 40, type: 'square', duration: 0.25, gain: 0.2 + strength * 0.2 })
      },
      stop: () => {
        if (stopped) return
        stopped = true
        const t = ctx.currentTime
        for (const g of [out, squeal.gain, wind.gain, whoosh.gain]) g.gain.setTargetAtTime(0.0001, t, 0.15)
        for (const n of [saw, sq, squeal.src, wind.src, whoosh.src]) {
          try {
            n.stop(t + 0.7)
          } catch {
            // Already stopped.
          }
        }
      },
    }
  }

  /**
   * A crowd for as long as a scene lasts: two bands of looped noise, a low murmur and a
   * brighter shout, whose loudness follows `level`. Returns null where there is no audio.
   */
  ambience(): AmbienceVoice | null {
    const ctx = this.ensureContext()
    if (!ctx || !this.master || !this.noiseBuffer) return null
    if (ctx.state === 'suspended') void ctx.resume()
    const master = this.master
    const band = (type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      src.playbackRate.value = 0.6 + Math.random() * 0.3
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.value = freq
      filter.Q.value = q
      const gain = ctx.createGain()
      gain.gain.value = 0.0001
      src.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      src.start()
      return { src, gain }
    }
    const murmur = band('bandpass', 420, 0.6)
    const shout = band('bandpass', 1500, 0.5)
    let stopped = false
    let swellLevel = 0
    let level = 0.2
    const apply = () => {
      if (stopped) return
      const t = ctx.currentTime
      const l = Math.min(1, level + swellLevel)
      murmur.gain.gain.setTargetAtTime(0.012 + l * 0.05, t, 0.15)
      shout.gain.gain.setTargetAtTime(0.002 + l * l * 0.06, t, 0.12)
    }
    apply()
    return {
      set: (v) => {
        level = v
        apply()
      },
      swell: (strength) => {
        swellLevel = Math.max(swellLevel, strength)
        apply()
        window.setTimeout(() => {
          swellLevel = 0
          apply()
        }, 700 + strength * 900)
      },
      stop: () => {
        if (stopped) return
        stopped = true
        const t = ctx.currentTime
        for (const n of [murmur, shout]) {
          n.gain.gain.setTargetAtTime(0.0001, t, 0.2)
          try {
            n.src.stop(t + 1)
          } catch {
            // Already stopped.
          }
        }
      },
    }
  }

  play(name: SoundName) {
    if (this.muted) return
    const ctx = this.ensureContext()
    if (!ctx || !this.master || ctx.state !== 'running') return
    const out = this.master

    switch (name) {
      case 'deal':
        // A card skimming across felt.
        this.noise(ctx, out, { duration: 0.09, gain: 0.16, filterFreq: 3200 })
        break
      case 'chip':
        // Two clay chips knocking together.
        this.tone(ctx, out, { freq: 900, endFreq: 500, type: 'triangle', duration: 0.07, gain: 0.18 })
        this.noise(ctx, out, { duration: 0.05, gain: 0.1, filterFreq: 5000 })
        break
      case 'bugle': {
        // The call to post: the first bars of a cavalry charge.
        const notes: Array<[number, number, number]> = [[392, 0, 0.16], [392, 0.18, 0.1], [523, 0.3, 0.16], [659, 0.5, 0.16], [784, 0.7, 0.45], [659, 1.2, 0.14], [784, 1.36, 0.6]]
        for (const [f, d, dur] of notes) {
          this.tone(ctx, out, { freq: f, type: 'sawtooth', duration: dur, gain: 0.12, delay: d })
          this.tone(ctx, out, { freq: f * 2, type: 'square', duration: dur, gain: 0.03, delay: d })
        }
        break
      }
      case 'gate':
        this.tone(ctx, out, { freq: 180, endFreq: 60, type: 'square', duration: 0.18, gain: 0.22 })
        this.noise(ctx, out, { duration: 0.25, gain: 0.3, filterFreq: 900 })
        this.tone(ctx, out, { freq: 1900, endFreq: 1500, type: 'triangle', duration: 0.5, gain: 0.07, delay: 0.1 })
        break
      case 'hoof':
        this.noise(ctx, out, { duration: 0.05, gain: 0.12, filterFreq: 260 })
        this.noise(ctx, out, { duration: 0.05, gain: 0.1, filterFreq: 300, delay: 0.09 })
        break
      case 'bell':
        for (const [f, g] of [[1320, 0.18], [1980, 0.1], [2640, 0.06]] as const) this.tone(ctx, out, { freq: f, type: 'sine', duration: 1.3, gain: g })
        break
      case 'jab':
        this.noise(ctx, out, { duration: 0.06, gain: 0.3, filterFreq: 1200 })
        this.tone(ctx, out, { freq: 160, endFreq: 90, type: 'triangle', duration: 0.07, gain: 0.2 })
        break
      case 'punch':
        this.noise(ctx, out, { duration: 0.1, gain: 0.42, filterFreq: 700 })
        this.tone(ctx, out, { freq: 120, endFreq: 55, type: 'triangle', duration: 0.12, gain: 0.35 })
        break
      case 'heavy':
        this.noise(ctx, out, { duration: 0.28, gain: 0.6, filterFreq: 420 })
        this.tone(ctx, out, { freq: 90, endFreq: 32, type: 'square', duration: 0.3, gain: 0.34 })
        this.noise(ctx, out, { duration: 0.5, gain: 0.12, filterFreq: 1800, delay: 0.05 })
        break
      case 'block':
        this.noise(ctx, out, { duration: 0.07, gain: 0.2, filterFreq: 500 })
        this.tone(ctx, out, { freq: 200, endFreq: 140, type: 'triangle', duration: 0.06, gain: 0.12 })
        break
      case 'whoosh':
        this.noise(ctx, out, { duration: 0.14, gain: 0.1, filterFreq: 2600 })
        break
      case 'roar':
        this.noise(ctx, out, { duration: 1.6, gain: 0.3, filterFreq: 1100 })
        this.noise(ctx, out, { duration: 1.8, gain: 0.18, filterFreq: 2400, delay: 0.1 })
        break
      case 'cheer':
        this.noise(ctx, out, { duration: 0.8, gain: 0.2, filterFreq: 1600 })
        break
      case 'flash':
        this.tone(ctx, out, { freq: 3200, endFreq: 800, type: 'sine', duration: 0.05, gain: 0.04 })
        break
      case 'thud':
        this.tone(ctx, out, { freq: 70, endFreq: 28, type: 'sine', duration: 0.4, gain: 0.5 })
        this.noise(ctx, out, { duration: 0.3, gain: 0.3, filterFreq: 240 })
        break
      case 'check':
        this.noise(ctx, out, { duration: 0.06, gain: 0.12, filterFreq: 900 })
        break
      case 'fold':
        this.noise(ctx, out, { duration: 0.14, gain: 0.13, filterFreq: 700 })
        break
      case 'ui':
        this.tone(ctx, out, { freq: 620, type: 'square', duration: 0.05, gain: 0.08 })
        break
      case 'dialogue':
        this.tone(ctx, out, { freq: 380, endFreq: 460, type: 'square', duration: 0.05, gain: 0.05 })
        break
      case 'cash':
        [0, 0.07, 0.14].forEach((delay, i) =>
          this.tone(ctx, out, { freq: 880 + i * 220, type: 'triangle', duration: 0.12, gain: 0.12, delay }),
        )
        break
      case 'win':
        // Rising major arpeggio.
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
          this.tone(ctx, out, { freq, type: 'triangle', duration: 0.28, gain: 0.16, delay: i * 0.09 }),
        )
        break
      case 'lose':
        [392, 349.23, 293.66].forEach((freq, i) =>
          this.tone(ctx, out, { freq, type: 'sine', duration: 0.34, gain: 0.16, delay: i * 0.13 }),
        )
        break
      case 'alarm':
        [0, 0.26].forEach((delay) =>
          this.tone(ctx, out, { freq: 300, endFreq: 190, type: 'sawtooth', duration: 0.22, gain: 0.12, delay }),
        )
        break
    }
  }

  /**
   * Sparse generative backing: a low drone plus occasional notes from a scale.
   * 'tense' is used while collectors are hunting you.
   */
  startMusic(mood: 'overworld' | 'table' | 'tense') {
    const ctx = this.ensureContext()
    if (!ctx || !this.musicGain) return
    this.stopMusic()

    const scales: Record<typeof mood, number[]> = {
      overworld: [220, 261.63, 293.66, 349.23, 392, 440],
      table: [174.61, 207.65, 233.08, 261.63, 311.13, 349.23],
      tense: [146.83, 155.56, 185, 196, 233.08],
    }
    const scale = scales[mood]
    const droneFreq = mood === 'tense' ? 73.42 : mood === 'table' ? 87.31 : 110

    const drone = ctx.createOscillator()
    const droneEnv = ctx.createGain()
    drone.type = 'sine'
    drone.frequency.value = droneFreq
    droneEnv.gain.value = 0.35
    drone.connect(droneEnv)
    droneEnv.connect(this.musicGain)
    drone.start()

    const intervalMs = mood === 'tense' ? 900 : 1900
    const step = () => {
      if (!this.ctx || !this.musicGain || this.muted) return
      const freq = scale[Math.floor(Math.random() * scale.length)]
      this.tone(this.ctx, this.musicGain, {
        freq,
        type: mood === 'tense' ? 'sawtooth' : 'triangle',
        duration: mood === 'tense' ? 0.5 : 1.4,
        gain: 0.1,
      })
    }
    this.musicTimer = window.setInterval(step, intervalMs)
    this.musicNodes = { drone, droneEnv }
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    if (this.musicNodes && this.ctx) {
      const { drone, droneEnv } = this.musicNodes
      droneEnv.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08)
      try {
        drone.stop(this.ctx.currentTime + 0.4)
      } catch {
        // Already stopped.
      }
      this.musicNodes = null
    }
  }
}

export const audio = new AudioEngine()

/** Convenience so components don't all need to import the instance. */
export function playSound(name: SoundName) {
  audio.play(name)
}
