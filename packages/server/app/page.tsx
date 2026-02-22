export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#ededed',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        OpenAuth
      </h1>
      <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '2rem' }}>
        Open-source OAuth connection manager
      </p>
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>API Endpoints</h2>
        <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
          <li>
            <code style={{ color: '#10b981' }}>POST</code>{' '}
            <code>/api/connect/sessions</code>
          </li>
          <li>
            <code style={{ color: '#10b981' }}>GET</code>{' '}
            <code>/api/connect/callback</code>
          </li>
          <li>
            <code style={{ color: '#3b82f6' }}>GET</code>{' '}
            <code>/api/connections/:provider/:id</code>
          </li>
          <li>
            <code style={{ color: '#3b82f6' }}>GET</code>{' '}
            <code>/api/connections/:provider/:id/token</code>
          </li>
          <li>
            <code style={{ color: '#ef4444' }}>DELETE</code>{' '}
            <code>/api/connections/:provider/:id</code>
          </li>
          <li>
            <code style={{ color: '#3b82f6' }}>GET</code>{' '}
            <code>/api/providers</code>
          </li>
          <li>
            <code style={{ color: '#10b981' }}>POST</code>{' '}
            <code>/api/providers/:key/credentials</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
