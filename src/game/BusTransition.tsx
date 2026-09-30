interface BusTransitionProps {
  onArrive: () => void
}

export function BusTransition({ onArrive }: BusTransitionProps) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0a12',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <p>You count the night's winnings twice on the bus, just to be sure.</p>
      <p>The reservation casino's lights come up out of the dark.</p>
      <button
        onClick={onArrive}
        style={{
          background: '#3a9d5c', color: '#fff', border: 'none', borderRadius: 4,
          padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: 14,
        }}
      >
        Get off the bus
      </button>
    </div>
  )
}
