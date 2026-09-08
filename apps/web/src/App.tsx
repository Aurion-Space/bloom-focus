import React, { useState, useEffect } from 'react';
import { api } from './api';
import './index.css';

const STORE_KEY = 'bloomfocus.v1';
const TWEAK_KEY = 'bloomfocus.tweaks';
const ACTIVE_SESSION_KEY = 'bloomfocus.active_session';

function loadStore() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { gardens: {}, sessions: [], active: null };
}

function saveStore(s: any) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function saveActiveSession(session: any, startTime?: number, paused?: boolean, pausedAt?: number) {
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ session, startTime: startTime || Date.now(), paused, pausedAt }));
}

function loadActiveSession() {
  try {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function clearActiveSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

function PublicBloomLoader({ slug, tweaks, toast }: { slug: string; tweaks: any; toast: any }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.sessions.getPublic(slug)
      .then(({ session }) => setSession(session))
      .catch(() => setError(true));
  }, [slug]);

  const PublicBloomScreen = (window as any).PublicBloomScreen;
  const Ambient = (window as any).Ambient;

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 32, marginBottom: 16 }}>Bloom not found</div>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>This bloom may have been removed or the link is invalid.</p>
          <button className="btn btn-primary" onClick={() => window.location.hash = ''}>Go to BloomFocus</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="hand" style={{ fontSize: 24, color: 'var(--ink-soft)' }}>Loading bloom...</div>
      </div>
    );
  }

  return (
    <>
      {Ambient && <Ambient kind={tweaks.ambient} count={18} />}
      {PublicBloomScreen && (
        <PublicBloomScreen
          session={session}
          gardenId={session.garden_id}
          onExit={() => { window.location.hash = ''; }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

const TWEAK_DEFAULTS = {
  theme: 'pastel',
  ambient: 'petal',
  timerRing: 'gradient',
  accent: 'petal'
};

function TweaksPanel({ tweaks, setTweaks, onClose }: { tweaks: any; setTweaks: any; onClose: () => void }) {
  const seg = (key: string, options: any[]) => (
    <div className="seg">
      {options.map((opt: any) => (
        <button
          key={opt.v}
          onClick={() => setTweaks({ ...tweaks, [key]: opt.v })}
          className={tweaks[key] === opt.v ? 'on' : ''}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="tweaks-panel">
      <div className="tweaks-hdr">
        <span>✿ Tweaks</span>
        <button onClick={onClose} style={{ fontSize: 18, color: 'var(--ink-faint)' }}>×</button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Theme</label>
          {seg('theme', [{ v: 'pastel', label: 'Pastel' }, { v: 'earth', label: 'Earth' }, { v: 'moonlight', label: 'Moonlight' }])}
        </div>
        <div className="tweak-row">
          <label>Ambient</label>
          {seg('ambient', [{ v: 'petal', label: 'Petals' }, { v: 'leaf', label: 'Leaves' }, { v: 'sparkle', label: 'Fireflies' }, { v: 'off', label: 'Off' }])}
        </div>
      </div>
    </div>
  );
}

function slug() {
  const adj = ['soft', 'warm', 'quiet', 'still', 'bright', 'gentle', 'wild', 'slow', 'honey', 'calm'];
  const noun = ['petal', 'moss', 'fern', 'dawn', 'dusk', 'meadow', 'sprout', 'garden', 'willow', 'clover'];
  return `bloom-${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function App() {
  const [store, setStore] = useState(loadStore);
  const [route, setRoute] = useState(() => window.location.hash.replace('#', ''));
  const [currentGarden, setCurrentGarden] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'welcome' | 'create' | 'unlock' | 'forgot'>('welcome');
  const [screen, setScreen] = useState<'dashboard' | 'new' | 'timer' | 'complete' | 'garden' | 'detail' | 'recovery'>('dashboard');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [lastCompleted, setLastCompleted] = useState<any>(null);
  const [detailSession, setDetailSession] = useState<any>(null);
  const [gardenDayFilter, setGardenDayFilter] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [showTweaks, setShowTweaks] = useState(false);
  const [tweaks, setTweaksState] = useState(() => {
    try {
      return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem(TWEAK_KEY) || '{}') };
    } catch {
      return TWEAK_DEFAULTS;
    }
  });
  const [loading, setLoading] = useState(true);

  const setTweaks = (t: any) => {
    setTweaksState(t);
    localStorage.setItem(TWEAK_KEY, JSON.stringify(t));
  };

  const pushToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
  }, [tweaks.theme]);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#', ''));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Check for existing auth on mount
  useEffect(() => {
    const token = api.auth.getToken();
    const savedStore = loadStore();
    setStore(savedStore);

    if (token) {
      api.gardens.me()
        .then(({ garden }) => {
          setCurrentGarden(garden.garden_id);
          return api.sessions.list(100);
        })
        .then(({ sessions }) => {
          const newStore = { ...loadStore(), sessions };
          setStore(newStore);
          saveStore(newStore);
          setLoading(false);
        })
        .catch(() => {
          api.auth.clearToken();
          setCurrentGarden(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Restore active session if user closed browser mid-session
    const savedActive = loadActiveSession();
    if (savedActive && savedActive.session) {
      setActiveSession(savedActive.session);
      setScreen('timer');
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      saveStore(store);
    }
  }, [store, loading]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="hand" style={{ fontSize: 24, color: 'var(--ink-soft)' }}>Loading...</div>
      </div>
    );
  }

  // Public bloom route - fetch from API
  const publicMatch = route.match(/^\/b\/(.+)$/);
  if (publicMatch) {
    const slugStr = publicMatch[1];
    return <PublicBloomLoader slug={slugStr} tweaks={tweaks} toast={toast} />;
  }

  const WelcomeScreen = (window as any).WelcomeScreen;
  const CreateGardenScreen = (window as any).CreateGardenScreen;
  const UnlockScreen = (window as any).UnlockScreen;
  const ForgotPatternScreen = (window as any).ForgotPatternScreen;
  const RecoveryKeyScreen = (window as any).RecoveryKeyScreen;
  const DashboardScreen = (window as any).DashboardScreen;
  const NewSessionScreen = (window as any).NewSessionScreen;
  const TimerScreen = (window as any).TimerScreen;
  const CompleteScreen = (window as any).CompleteScreen;
  const GardenScreen = (window as any).GardenScreen;
  const SessionDetailScreen = (window as any).SessionDetailScreen;
  const Ambient = (window as any).Ambient;

  if (!currentGarden) {
    let content: any = null;
    if (authStep === 'create') {
      content = (
        <CreateGardenScreen
          onBack={() => setAuthStep('welcome')}
          onCreate={async (id: string, _token: string) => {
            setCurrentGarden(id);
            try {
              const { sessions } = await api.sessions.list(100);
              const newStore = { ...loadStore(), gardens: { ...loadStore().gardens, [id]: { garden_id: id, created_at: new Date().toISOString() } }, sessions };
              setStore(newStore);
              saveStore(newStore);
            } catch {
              const newStore = { ...loadStore(), gardens: { ...loadStore().gardens, [id]: { garden_id: id, created_at: new Date().toISOString() } } };
              setStore(newStore);
              saveStore(newStore);
            }
            pushToast(`Welcome, @${id} ✿`);
          }}
        />
      );
    } else if (authStep === 'unlock') {
      content = (
        <UnlockScreen
          gardens={store.gardens}
          onBack={() => setAuthStep('welcome')}
          onForgot={() => setAuthStep('forgot')}
          onUnlock={async (id: string, _token: string) => {
            setCurrentGarden(id);
            try {
              const { sessions } = await api.sessions.list(100);
              setStore((s: any) => ({ ...s, sessions }));
              pushToast(`Welcome back, @${id}`);
            } catch {
              pushToast(`Welcome back, @${id}`);
            }
          }}
        />
      );
    } else if (authStep === 'forgot') {
      content = ForgotPatternScreen && (
        <ForgotPatternScreen
          onBack={() => setAuthStep('unlock')}
          onRecovered={async (id: string, _token: string) => {
            setCurrentGarden(id);
            try {
              const { sessions } = await api.sessions.list(100);
              setStore((s: any) => ({ ...s, sessions }));
            } catch {}
            pushToast(`New pattern saved, @${id} ✿`);
          }}
        />
      );
    } else {
      content = WelcomeScreen && <WelcomeScreen onEnter={setAuthStep} />;
    }
    return (
      <>
        {Ambient && <Ambient kind={tweaks.ambient} count={16} />}
        <div className="app-root">{content}</div>
        {toast && <div className="toast">{toast}</div>}
        {showTweaks && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setShowTweaks(false)} />}
      </>
    );
  }

  const garden = store.gardens[currentGarden] || { garden_id: currentGarden, created_at: new Date().toISOString() };
  const mySessions = store.sessions.filter((s: any) => s.garden_id === currentGarden);

  let content: any = null;

  if (screen === 'dashboard') {
    content = (
      <DashboardScreen
        garden={garden}
        sessions={mySessions}
        onStart={() => setScreen('new')}
        onViewGarden={(options?: { day?: string }) => {
          setGardenDayFilter(options?.day || 'all');
          setScreen('garden');
        }}
        onRecoveryKey={() => setScreen('recovery')}
        onLock={() => {
          setCurrentGarden(null);
          setAuthStep('welcome');
          api.auth.clearToken();
          pushToast('Garden locked');
        }}
      />
    );
  } else if (screen === 'new') {
    content = (
      <NewSessionScreen
        onBack={() => setScreen('dashboard')}
        onStart={(config: any) => {
          setActiveSession(config);
          saveActiveSession(config, Date.now());
          setScreen('timer');
        }}
      />
    );
  } else if (screen === 'timer' && activeSession) {
    const savedActive = loadActiveSession();
    const isRestored = savedActive?.session != null;
    const startTime = savedActive?.startTime || Date.now();
    const wasPaused = savedActive?.paused || false;
    const pausedAt = savedActive?.pausedAt || null;
    content = (
      <TimerScreen
        session={activeSession}
        startTime={startTime}
        wasPaused={wasPaused}
        pausedAt={pausedAt}
        isRestored={isRestored}
        onAbandon={() => {
          setActiveSession(null);
          clearActiveSession();
          setScreen('dashboard');
          pushToast('No worries — your garden will be here. 🌸');
        }}
        onComplete={async () => {
          try {
            const { session: newSession } = await api.sessions.create(
              activeSession.intention,
              activeSession.duration,
              activeSession.plantId
            );
            setStore((s: any) => ({ ...s, sessions: [...s.sessions, newSession] }));
            setLastCompleted(newSession);
            setActiveSession(null);
            clearActiveSession();
            setScreen('complete');
          } catch (err) {
            pushToast('Failed to save session');
            setActiveSession(null);
            clearActiveSession();
            setScreen('dashboard');
          }
        }}
      />
    );
  } else if (screen === 'complete' && lastCompleted) {
    content = (
      <CompleteScreen
        session={lastCompleted}
        gardenId={currentGarden}
        onHome={() => setScreen('dashboard')}
        onViewGarden={() => {
          setGardenDayFilter('all');
          setScreen('garden');
        }}
        onToast={pushToast}
      />
    );
  } else if (screen === 'garden') {
    content = (
      <GardenScreen
        garden={garden}
        sessions={mySessions}
        initialDayFilter={gardenDayFilter}
        onBack={() => setScreen('dashboard')}
        onViewSession={(s: any) => {
          setDetailSession(s);
          setScreen('detail');
        }}
      />
    );
  } else if (screen === 'detail' && detailSession) {
    content = (
      <SessionDetailScreen
        session={detailSession}
        gardenId={currentGarden}
        onBack={() => setScreen('garden')}
        onToast={pushToast}
      />
    );
  } else if (screen === 'recovery') {
    content = RecoveryKeyScreen && (
      <RecoveryKeyScreen
        gardenId={currentGarden}
        onBack={() => setScreen('dashboard')}
      />
    );
  }

  return (
    <>
      {Ambient && <Ambient kind={tweaks.ambient} count={16} />}
      <div className="app-root">{content}</div>
      {toast && <div className="toast">{toast}</div>}
      {showTweaks && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setShowTweaks(false)} />}
    </>
  );
}
