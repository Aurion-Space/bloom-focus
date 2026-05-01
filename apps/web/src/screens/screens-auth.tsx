import React from 'react';
import { api } from '../api';
import { PlantSVG } from '../plants/plants';
import { PatternLock } from '../components/pattern-lock';

function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="lg" cx="50%" cy="40%"><stop offset="0" stopColor="#FFF"/><stop offset="1" stopColor="#F9C4D3"/></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#lg)" stroke="#E89AAE" strokeWidth="1.5"/>
      <g transform="translate(32 32)">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-10" rx="5" ry="9" fill="#E89AAE" transform={`rotate(${a})`}/>
        ))}
        <circle r="4.5" fill="#F4CF6B" stroke="#D4A838" strokeWidth="1"/>
      </g>
      <path d="M18 48 Q22 44 28 46" fill="none" stroke="#6FA373" strokeWidth="2" strokeLinecap="round"/>
      <path d="M46 48 Q42 44 36 46" fill="none" stroke="#6FA373" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function WelcomeScreen({ onEnter }: { onEnter: (step: 'create' | 'unlock') => void }) {
  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative' }}>
            <LogoMark size={84}/>
            <div style={{ position: 'absolute', top: -6, right: -10 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" className="sparkle"><path d="M10 2 L11 8 L17 10 L11 12 L10 18 L9 12 L3 10 L9 8 Z" fill="#F4CF6B"/></svg>
            </div>
          </div>
        </div>
        <h1 className="serif" style={{ fontSize: 56, margin: '0 0 6px', lineHeight: 1 }}>Bloom<span style={{ color: 'var(--petal-deep)' }}>Focus</span></h1>
        <p className="hand" style={{ fontSize: 26, color: 'var(--ink-soft)', margin: '6px 0 28px' }}>Grow with every focused moment</p>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 36px', lineHeight: 1.6, fontSize: 15 }}>
          Pick a plant. Set an intention. Focus.<br/>
          Watch your garden bloom, one quiet hour at a time.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onEnter('create')}>
            🌱 Plant a new garden
          </button>
          <button className="btn btn-ghost" onClick={() => onEnter('unlock')}>
            I already have a garden
          </button>
        </div>
        <div style={{ marginTop: 48, display: 'flex', gap: 28, justifyContent: 'center', opacity: 0.9 }}>
          {['rose', 'lavender', 'sunflower', 'lotus'].map(id => (
            <div key={id} className="sway" style={{ animationDuration: `${4 + Math.random()*3}s` }}>
              <PlantSVG plantId={id} size={72}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateGardenScreen({ onBack, onCreate }: { onBack: () => void; onCreate: (id: string, token: string) => void }) {
  const [step, setStep] = React.useState<'id' | 'draw' | 'confirm'>('id');
  const [gardenId, setGardenId] = React.useState('');
  const [idError, setIdError] = React.useState('');
  const [idChecking, setIdChecking] = React.useState(false);
  const [firstPattern, setFirstPattern] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState('');
  const [failedConfirmPattern, setFailedConfirmPattern] = React.useState<string | null>(null);
  const [resetKey, setResetKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [justFailed, setJustFailed] = React.useState(false);

  const submitId = async () => {
    const clean = gardenId.trim().toLowerCase();
    if (!/^[a-z0-9]{3,20}$/.test(clean)) { setIdError('3–20 letters or numbers, please'); return; }
    setIdChecking(true);
    setIdError('');
    try {
      const { available } = await api.gardens.check(clean);
      if (!available) {
        setIdError('This garden name is already taken');
        setIdChecking(false);
        return;
      }
      setGardenId(clean);
      setStep('draw');
    } catch {
      setIdError('Could not check availability. Please try again.');
    }
    setIdChecking(false);
  };

  const handlePatternComplete = async (pat: string) => {
    if (step === 'draw') {
      if (justFailed) {
        // After a mismatch, only clear the drawing — don't progress
        setResetKey(k => k + 1);
        return;
      }
      // First draw: set as base and go to confirm
      setFirstPattern(pat);
      setStep('confirm');
      setResetKey(k => k + 1);
      setConfirmError('');
    } else if (step === 'confirm') {
      if (pat === firstPattern) {
        setIsLoading(true);
        try {
          const { token } = await api.gardens.create(gardenId, pat);
          onCreate(gardenId, token);
        } catch (err: any) {
          if (err.message === 'taken') {
            setConfirmError('Someone already has that garden');
          } else {
            setConfirmError('Something went wrong. Please try again.');
          }
          setStep('draw');
          setFirstPattern(null);
          setResetKey(k => k + 1);
        }
        setIsLoading(false);
      } else {
        // Mismatch: keep the original base, go back to draw with error
        setJustFailed(true);
        setConfirmError('Pattern does not match. Draw the same shape as before.');
        setStep('draw');
        setResetKey(k => k + 1);
      }
    }
  };

  const handleClear = () => {
    // Start over: full reset including base pattern
    if (step === 'confirm' || justFailed) {
      setStep('draw');
      setFirstPattern(null);
      setConfirmError('');
      setJustFailed(false);
      setResetKey(k => k + 1);
    } else if (step === 'draw') {
      // Just clear current drawing
      setResetKey(k => k + 1);
    }
  };

  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '36px 32px', width: '100%', maxWidth: 420 }}>
        <button onClick={onBack} className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }}>← Back</button>

        {step === 'id' && (
          <>
            <h2 className="serif" style={{ fontSize: 34, margin: '20px 0 6px' }}>Name your garden</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>
              This is how you'll unlock it, and how your blooms are signed.
            </p>
            <input className="input" autoFocus value={gardenId} onChange={e => { setGardenId(e.target.value); setIdError(''); }}
              onKeyDown={e => e.key === 'Enter' && submitId()}
              placeholder="e.g. sakura2026"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}/>
            {idError && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10 }}>{idError}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {['sakura2026', 'quietmoss', 'studybloom', 'rosegarden'].map(s => (
                <button key={s} onClick={() => { setGardenId(s); setIdError(''); }} className="chip" style={{ cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <button className="btn btn-primary" disabled={idChecking || !gardenId.trim()} onClick={submitId} style={{ width: '100%', marginTop: 22, opacity: (idChecking || !gardenId.trim()) ? 0.5 : 1 }}>
              {idChecking ? 'Checking...' : 'Continue →'}
            </button>
          </>
        )}

        {step === 'draw' && (
          <>
            <h2 className="serif" style={{ fontSize: 28, margin: '20px 0 4px' }}>Draw your secret</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>
              {justFailed ? (
                <span style={{ color: '#C05858' }}>Pattern mismatch. Draw the exact same shape again.</span>
              ) : (
                "Connect at least 4 dots. You'll redraw this to unlock."
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PatternLock size={260} resetKey={resetKey} onComplete={handlePatternComplete}/>
            </div>
            <button onClick={handleClear} className="btn btn-soft" style={{ marginTop: 16, width: '100%', fontSize: 13 }}>Clear</button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="serif" style={{ fontSize: 28, margin: '20px 0 4px' }}>Once more, to remember</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>
              Draw the same shape again.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PatternLock size={260} resetKey={resetKey} onComplete={handlePatternComplete}/>
            </div>
            {confirmError && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{confirmError}</div>}
            {isLoading && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>Creating your garden...</div>}
            <button onClick={handleClear} className="btn btn-soft" style={{ marginTop: 16, width: '100%', fontSize: 13 }}>Start over</button>
          </>
        )}
      </div>
    </div>
  );
}

function UnlockScreen({ onBack, onUnlock }: { onBack: () => void; onUnlock: (id: string, token: string) => void }) {
  const [gardenId, setGardenId] = React.useState('');
  const [error, setError] = React.useState('');
  const [resetKey, setResetKey] = React.useState(0);
  const [step, setStep] = React.useState<'id' | 'draw'>('id');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleUnlock = async (pat: string) => {
    setIsLoading(true);
    try {
      const { token } = await api.gardens.unlock(gardenId, pat);
      onUnlock(gardenId, token);
    } catch (err: any) {
      if (err.message === 'not_found') {
        setError('No garden by that name found');
      } else if (err.message === 'wrong_pattern') {
        setError('Not quite. Try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setResetKey(k => k + 1);
    }
    setIsLoading(false);
  };

  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '36px 32px', width: '100%', maxWidth: 420 }}>
        <button onClick={onBack} className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }}>← Back</button>

        {step === 'id' && (
          <>
            <h2 className="serif" style={{ fontSize: 34, margin: '20px 0 6px' }}>Welcome back</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 24px', fontSize: 14 }}>Which garden?</p>
            <input className="input" autoFocus value={gardenId} onChange={e => { setGardenId(e.target.value.toLowerCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && gardenId && setStep('draw')}
              placeholder="garden name"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}/>
            {error && <div style={{ color: '#C05858', fontSize: 13, marginTop: 8 }}>{error}</div>}
            <button className="btn btn-primary" disabled={!gardenId} onClick={() => setStep('draw')} style={{ width: '100%', marginTop: 22, opacity: gardenId ? 1 : 0.4 }}>Continue →</button>
          </>
        )}

        {step === 'draw' && (
          <>
            <h2 className="serif" style={{ fontSize: 28, margin: '20px 0 4px' }}>Hello, <span style={{ color: 'var(--petal-deep)' }}>{gardenId}</span></h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14 }}>Draw your secret shape.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PatternLock size={260} resetKey={resetKey} onComplete={handleUnlock}/>
            </div>
            {error && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</div>}
            {isLoading && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>Unlocking...</div>}
            <button onClick={() => { setStep('id'); setError(''); }} className="btn btn-soft" style={{ marginTop: 16, width: '100%', fontSize: 13 }}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}

(window as any).WelcomeScreen = WelcomeScreen;
(window as any).CreateGardenScreen = CreateGardenScreen;
(window as any).UnlockScreen = UnlockScreen;
(window as any).LogoMark = LogoMark;

export { WelcomeScreen, CreateGardenScreen, UnlockScreen, LogoMark };