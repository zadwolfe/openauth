'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'success';
  const provider = searchParams.get('provider') || 'your service';
  const error = searchParams.get('error');

  const isError = status === 'error';

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
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}
      >
        {isError ? '\u274C' : '\u2705'}
      </div>
      <h1
        style={{
          fontSize: '2rem',
          marginBottom: '0.5rem',
          color: isError ? '#ef4444' : '#10b981',
        }}
      >
        {isError ? 'Connection Failed' : 'Connected!'}
      </h1>
      <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: '400px' }}>
        {isError
          ? error || 'Something went wrong. Please try again.'
          : `Successfully connected to ${provider}. You can close this window and return to the app.`}
      </p>
      <p
        style={{
          color: '#555',
          fontSize: '0.85rem',
          marginTop: '2rem',
        }}
      >
        Powered by OpenAuth
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#888',
          }}
        >
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
