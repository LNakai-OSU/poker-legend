import { useEffect, useState } from 'react'
import { audio } from './audio'

/** Starts a music bed for as long as the calling scene is mounted. */
export function useAmbientMusic(mood: 'overworld' | 'table' | 'tense') {
  useEffect(() => {
    audio.startMusic(mood)
    return () => audio.stopMusic()
  }, [mood])
}

/** Resumes the audio context on the first gesture, which browsers require. */
export function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])
}

export function SoundToggle() {
  const [muted, setMuted] = useState(audio.isMuted())
  useEffect(() => {
    const unsubscribe = audio.onChange(setMuted)
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <button
      data-testid="sound-toggle"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      onClick={() => {
        audio.unlock()
        audio.setMuted(!muted)
        if (muted) audio.play('ui')
      }}
      style={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top))',
        right: 12,
        zIndex: 50,
        width: 40,
        minHeight: 40,
        borderRadius: 8,
        border: '1px solid #4a4a66',
        background: 'rgba(10,10,16,0.8)',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
