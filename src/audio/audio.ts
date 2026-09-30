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

const MUTE_KEY = 'poker-legend-muted'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private musicTimer: number | null = null
  private musicNodes: { drone: OscillatorNode; droneEnv: GainNode } | null = null
  private muted = false
  private listeners = new Set<(muted: boolean) => void>()

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      this.muted = false
    }
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
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02)
    }
    this.listeners.forEach((l) => l(muted))
  }

  /** Called from a user gesture; safe to call repeatedly. */
  unlock() {
    const ctx = this.ensureContext()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null

    try {
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = this.muted ? 0 : 0.9
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
