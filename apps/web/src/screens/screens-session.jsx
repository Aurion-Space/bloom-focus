import React from 'react';
import { PlantSVG, PLANTS } from '../plants/plants';
import { Ambient } from '../components/ambient';

// Dev mode: set VITE_DEV_MODE=true in .env for 1 sec = 1 min

/*
  Session screens:
    - DashboardScreen
    - NewSessionScreen (duration -> intention -> plant pick, one flow)
    - TimerScreen (with ambient + skip-to-end)
*/

function createBrownNoise() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { stop: function() {} };
    const audioContext = new AudioContextClass();

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(audioContext.destination);

    const bufferSize = 4096;
    let lastOut = 0;

    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    processor.onaudioprocess = function(e) {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        output[i] = lastOut * 6;
      }
    };

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300;

    const modulation = audioContext.createOscillator();
    modulation.frequency.value = 0.08;
    const modGain = audioContext.createGain();
    modGain.gain.value = 80;
    modulation.connect(modGain);
    modGain.connect(lowpass.frequency);

    processor.connect(lowpass);
    lowpass.connect(masterGain);
    modulation.start();

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    return {
      stop: function() {
        try {
          processor.disconnect();
          lowpass.disconnect();
          modulation.stop();
          modGain.disconnect();
          masterGain.disconnect();
          audioContext.close();
        } catch(e) {}
      }
    };
  } catch (e) {
    return { stop: function() {} };
  }
}

function createOceanWaves() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { stop: function() {} };
    const audioContext = new AudioContextClass();

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioContext.destination);

    const bufferSize = 4096;
    let lastOut = 0;
    let lastOut2 = 0;

    const noise = audioContext.createScriptProcessor(bufferSize, 1, 1);
    noise.onaudioprocess = function(e) {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.05 * white)) / 1.05;
        lastOut2 = (lastOut2 + (0.02 * white)) / 1.02;
        output[i] = (lastOut + lastOut2 * 0.5) * 0.6;
      }
    };

    const lowpass1 = audioContext.createBiquadFilter();
    lowpass1.type = 'lowpass';
    lowpass1.frequency.value = 500;

    const lowpass2 = audioContext.createBiquadFilter();
    lowpass2.type = 'lowpass';
    lowpass2.frequency.value = 1200;

    const wave1 = audioContext.createOscillator();
    wave1.type = 'sine';
    wave1.frequency.value = 0.1;
    const wave1Gain = audioContext.createGain();
    wave1Gain.gain.value = 200;
    wave1.connect(wave1Gain);
    wave1Gain.connect(lowpass1.frequency);

    const wave2 = audioContext.createOscillator();
    wave2.type = 'sine';
    wave2.frequency.value = 0.05;
    const wave2Gain = audioContext.createGain();
    wave2Gain.gain.value = 100;
    wave2.connect(wave2Gain);
    wave2Gain.connect(lowpass2.frequency);

    noise.connect(lowpass1);
    lowpass1.connect(lowpass2);
    lowpass2.connect(masterGain);
    wave1.start();
    wave2.start();

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    return {
      stop: function() {
        try {
          noise.disconnect();
          lowpass1.disconnect();
          lowpass2.disconnect();
          wave1.stop();
          wave2.stop();
          wave1Gain.disconnect();
          wave2Gain.disconnect();
          masterGain.disconnect();
          audioContext.close();
        } catch(e) {}
      }
    };
  } catch (e) {
    return { stop: function() {} };
  }
}

const AMBIENT_SOUNDS = {
  brown: { name: '🌊 Brown Noise', create: createBrownNoise },
  ocean: { name: '🌊 Ocean Waves', create: createOceanWaves },
};

function sortByCompletedDesc(items) {
  return [...items].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
}

function getLocalDayKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createAmbientSound(type) {
  const sound = AMBIENT_SOUNDS[type] || AMBIENT_SOUNDS.brown;
  return sound.create();
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: '18px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
      <div className="serif" style={{ fontSize: 36, lineHeight: 1.1, margin: '6px 0 2px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{sub}</div>}
    </div>
  );
}

function DashboardScreen({ garden, sessions, onStart, onViewGarden, onLock, onRecoveryKey }) {
  const total = sessions.length;
  const totalMinutes = sessions.reduce((s, x) => s + x.duration_minutes, 0);
  // streak: consecutive days ending today
  const daySet = new Set(sessions.map(s => new Date(s.completed_at).toDateString()));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (daySet.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  const recent = sortByCompletedDesc(sessions).slice(0, 4);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Late blooms";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="fade-enter" style={{ maxWidth: 840, margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={38}/>
          <div>
            <div className="serif" style={{ fontSize: 20 }}>BloomFocus</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>@{garden.garden_id}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onRecoveryKey && (
            <button onClick={onRecoveryKey} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13 }} title="Save a key that can reset a forgotten pattern">✪ Recovery key</button>
          )}
          <button onClick={onLock} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13 }}>🔒 Lock garden</button>
        </div>
      </div>

      {/* hero */}
      <div style={{ marginBottom: 28 }}>
        <div className="hand" style={{ fontSize: 24, color: 'var(--ink-soft)', marginBottom: 4 }}>{greet}, gardener</div>
        <h1 className="serif" style={{ fontSize: 44, margin: '0 0 10px', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
          Your garden has <span style={{ color: 'var(--petal-deep)' }}>{total}</span> {total === 1 ? 'bloom' : 'blooms'}.
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 16, margin: 0 }}>What shall we grow today?</p>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Total blooms" value={total}/>
        <StatCard label="Minutes focused" value={totalMinutes}/>
        <StatCard label="Current streak" value={streak} sub={streak === 1 ? 'day' : 'days'}/>
      </div>

      {/* start button */}
      <button onClick={onStart} className="card" style={{
        width: '100%', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', textAlign: 'left', marginBottom: 28,
        background: 'linear-gradient(135deg, color-mix(in oklab, var(--petal) 40%, var(--surface)), var(--surface))',
      }}>
        <div>
          <div className="serif" style={{ fontSize: 30, marginBottom: 4 }}>Start a new session</div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Choose a plant. Set an intention. Breathe.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sway"><PlantSVG plantId="rose" size={72}/></div>
          <div className="btn btn-primary" style={{ padding: '14px 22px' }}>Begin →</div>
        </div>
      </button>

      {/* recent blooms */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h2 className="serif" style={{ fontSize: 24, margin: 0 }}>Recent blooms</h2>
        <button onClick={() => onViewGarden()} className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }}>See all →</button>
      </div>
      {recent.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <div style={{ marginBottom: 10 }}>
            <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="var(--bg-tint)"/><path d="M24 14 L24 34 M14 24 L34 24" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          Your first bloom awaits.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {recent.map(s => (
            <button
              key={s.id}
              onClick={() => onViewGarden({ day: getLocalDayKey(s.completed_at) })}
              className="card"
              style={{ padding: 16, textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
              title="Show everything completed that day"
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}><PlantSVG plantId={s.plant_type} size={90}/></div>
              <div className="serif" style={{ fontSize: 16, marginTop: 6 }}>{PLANTS.find(p => p.id === s.plant_type)?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{s.duration_minutes}m · {new Date(s.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>view this day</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- New session multi-step flow ---

const DURATIONS = [
  { min: 30, label: '30 min', sub: 'a short tend' },
  { min: 45, label: '45 min', sub: 'a pomodoro pair' },
  { min: 60, label: '60 min', sub: 'one deep hour' },
  { min: 90, label: '90 min', sub: 'a creative stretch' },
  { min: 120, label: '2 hours', sub: 'full immersion' },
];

function NewSessionScreen({ onStart, onBack }) {
  const [step, setStep] = React.useState(0);
  const [duration, setDuration] = React.useState(45);
  const [intention, setIntention] = React.useState('');
  const [plantId, setPlantId] = React.useState(null);

  const next = () => setStep(s => s + 1);
  const prev = () => step === 0 ? onBack() : setStep(s => s - 1);

  return (
    <div className="fade-enter" style={{ maxWidth: 880, margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* progress dots */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={prev} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13 }}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i <= step ? 'var(--petal-deep)' : 'var(--line)', transition: 'all 0.3s ease' }}/>
          ))}
        </div>
        <div style={{ width: 72 }}/>
      </div>

      {step === 0 && (
        <div key="0" className="fade-enter">
          <h1 className="serif" style={{ fontSize: 44, margin: '0 0 8px' }}>How long shall we focus?</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 16, margin: '0 0 32px' }}>Pick a session length that feels gentle.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {DURATIONS.map(d => (
              <button key={d.min} onClick={() => setDuration(d.min)} className="card" style={{
                padding: '24px 20px', textAlign: 'left', cursor: 'pointer',
                outline: duration === d.min ? '2.5px solid var(--petal-deep)' : 'none',
                outlineOffset: 2,
                background: duration === d.min ? 'linear-gradient(135deg, color-mix(in oklab, var(--petal) 30%, var(--surface)), var(--surface))' : 'var(--surface)',
              }}>
                <div className="serif" style={{ fontSize: 32 }}>{d.label}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{d.sub}</div>
              </button>
            ))}
          </div>
          <button onClick={next} className="btn btn-primary" style={{ marginTop: 32 }}>Continue →</button>
        </div>
      )}

      {step === 1 && (
        <div key="1" className="fade-enter">
          <h1 className="serif" style={{ fontSize: 44, margin: '0 0 8px' }}>Set your intention</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 16, margin: '0 0 24px' }}>One small thing. One sentence.</p>
          <div style={{ position: 'relative' }}>
            <textarea className="input" autoFocus value={intention} onChange={e => setIntention(e.target.value.slice(0, 120))}
              placeholder="Finish the chapter I've been avoiding…"
              rows={3}
              style={{ fontFamily: 'var(--font-display)', fontSize: 22, resize: 'none', lineHeight: 1.4 }}/>
            <div style={{ position: 'absolute', bottom: 12, right: 18, fontSize: 12, color: 'var(--ink-faint)' }}>{intention.length}/120</div>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-faint)' }}>Not sure? Try:</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {['Write 500 honest words', 'Study for my exam', 'Respond to the hard email', 'Read without my phone', 'Sketch 3 ideas'].map(s => (
              <button key={s} onClick={() => setIntention(s)} className="chip" style={{ cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
            <button onClick={next} disabled={!intention.trim()} className="btn btn-primary" style={{ opacity: intention.trim() ? 1 : 0.4 }}>Continue →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div key="2" className="fade-enter">
          <h1 className="serif" style={{ fontSize: 44, margin: '0 0 8px' }}>Which will you grow?</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 16, margin: '0 0 24px' }}>Pick the bloom you want to see at the end.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {PLANTS.map(p => {
              const selected = plantId === p.id;
              return (
                <button key={p.id} onClick={() => setPlantId(p.id)} className="card" style={{
                  padding: '14px 12px 16px', textAlign: 'center', cursor: 'pointer',
                  outline: selected ? '2.5px solid var(--petal-deep)' : 'none', outlineOffset: 2,
                  background: selected ? `linear-gradient(180deg, color-mix(in oklab, ${p.color} 25%, var(--surface)), var(--surface))` : 'var(--surface)',
                  transition: 'transform 0.2s ease',
                  transform: selected ? 'translateY(-2px)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }} className={selected ? 'sway' : ''}>
                    <PlantSVG plantId={p.id} size={110}/>
                  </div>
                  <div className="serif" style={{ fontSize: 17, marginTop: 4 }}>{p.name}</div>
                  <div className="hand" style={{ fontSize: 16, color: 'var(--ink-soft)', marginTop: -2 }}>{p.whisper}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 32, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
              {plantId ? <span><span className="serif" style={{ fontSize: 18 }}>{PLANTS.find(p=>p.id===plantId).name}</span> · {duration} min · <em>"{intention}"</em></span> : 'Choose a plant to continue.'}
            </div>
            <button onClick={() => onStart({ duration, intention, plantId })} disabled={!plantId} className="btn btn-primary" style={{ opacity: plantId ? 1 : 0.4 }}>
              🌱 Begin focus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Timer ---

function BreathingGuide() {
  // simple breathing circle, 4 in / 4 hold / 4 out
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: 'var(--sage)',
        animation: 'breathe 8s ease-in-out infinite',
      }}/>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TimerScreen({ session, onComplete, onAbandon, startTime, wasPaused, pausedAt, isRestored }) {
  // In dev mode, 1 min = 1 sec for testing (set VITE_DEV_MODE=true in .env)
  // Use __DEV_MODE__ global set by vite.config define
  const totalMs = __DEV_MODE__ ? session.duration * 1000 : session.duration * 60000;
  const [remaining, setRemaining] = React.useState(totalMs);
  const [paused, setPaused] = React.useState(wasPaused || false);
  const [ambient, setAmbient] = React.useState(false);
  const [soundType, setSoundType] = React.useState('brown');
  const [rainAudio, setRainAudio] = React.useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const startedAtRef = React.useRef(startTime || Date.now());
  const pausedAtRef = React.useRef(pausedAt || null);

  React.useEffect(() => {
    if (paused) return;
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const next = Math.max(0, totalMs - elapsed);
      setRemaining(next);
      if (next <= 0) { clearInterval(tick); onComplete(); }
    }, 250);
    return () => clearInterval(tick);
  }, [paused, totalMs]);

  React.useEffect(() => {
    return () => { if (rainAudio) rainAudio.stop(); };
  }, [rainAudio]);

  const toggleAmbient = () => {
    if (ambient && rainAudio) {
      rainAudio.stop();
      setRainAudio(null);
      setAmbient(false);
    } else {
      const audio = createAmbientSound(soundType);
      setRainAudio(audio);
      setAmbient(true);
    }
  };

  const cycleSound = () => {
    if (rainAudio) rainAudio.stop();
    const types = Object.keys(AMBIENT_SOUNDS);
    const nextIndex = (types.indexOf(soundType) + 1) % types.length;
    setSoundType(types[nextIndex]);
    if (ambient) {
      const audio = createAmbientSound(types[nextIndex]);
      setRainAudio(audio);
    }
  };

  const togglePause = () => {
    if (paused) {
      // adjust startedAt by pause length
      startedAtRef.current += (Date.now() - pausedAtRef.current);
      pausedAtRef.current = null;
    } else {
      pausedAtRef.current = Date.now();
    }
    setPaused(p => !p);
    // Save pause state for browser close recovery
    saveActiveSession(session, startedAtRef.current, !paused, pausedAtRef.current);
  };

  const saveActiveSession = (sess, start, isPaused, pauseTime) => {
    localStorage.setItem('bloomfocus.active_session', JSON.stringify({
      session: sess,
      startTime: start,
      paused: isPaused,
      pausedAt: pauseTime,
    }));
  };

  const progress = 1 - remaining / totalMs;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const plant = PLANTS.find(p => p.id === session.plantId);

  // Ring
  const R = 150;
  const C = 2 * Math.PI * R;

  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>

      <div className="hand" style={{ fontSize: 26, color: 'var(--ink-soft)', marginBottom: 4 }}>growing</div>
      <div className="serif" style={{ fontSize: 32, marginBottom: 6, color: plant.color }}>{plant.name}</div>
      <div style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 30, maxWidth: 440, lineHeight: 1.5, fontStyle: 'italic' }}>
        "{session.intention}"
      </div>

      <div style={{ position: 'relative', width: 340, height: 340 }}>
        <svg viewBox="0 0 340 340" width={340} height={340}>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={plant.color}/>
              <stop offset="100%" stopColor="var(--lavender-deep)"/>
            </linearGradient>
          </defs>
          <circle cx="170" cy="170" r={R} fill="none" stroke="var(--line-soft)" strokeWidth="8"/>
          <circle cx="170" cy="170" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 170 170)"
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}/>
          {/* tiny markers */}
          {Array.from({length: 12}).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = 170 + Math.cos(a) * (R + 14);
            const y1 = 170 + Math.sin(a) * (R + 14);
            const x2 = 170 + Math.cos(a) * (R + 20);
            const y2 = 170 + Math.sin(a) * (R + 20);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1.2" strokeLinecap="round"/>;
          })}
        </svg>
        {/* center: growing plant */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `scale(${0.3 + progress * 0.8})`, transition: 'transform 1s cubic-bezier(0.3, 1.2, 0.5, 1)', opacity: 0.4 + progress * 0.6 }}>
            <PlantSVG plantId={session.plantId} size={130} animated={progress > 0.8}/>
          </div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, marginTop: -10, fontVariantNumeric: 'tabular-nums' }}>
            {String(mins).padStart(2, '0')}<span style={{ color: 'var(--ink-faint)' }}>:</span>{String(secs).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            {paused ? 'resting' : 'focusing'}
          </div>
        </div>
      </div>

      {!paused && <BreathingGuide/>}

      <div style={{ display: 'flex', gap: 10, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={togglePause} className="btn btn-ghost">{paused ? '▶ Resume' : '❚❚ Pause'}</button>
        <button onClick={toggleAmbient} className="btn btn-ghost" style={{ minWidth: 140 }}>
          {ambient ? '🔊' : '🔈'} {AMBIENT_SOUNDS[soundType]?.name || 'Sound'} {ambient ? 'on' : 'off'}
        </button>
        <button onClick={cycleSound} className="btn btn-ghost" style={{ padding: '10px 14px', fontSize: 12 }} title="Change sound">⟳</button>
        <button onClick={() => setShowLeaveConfirm(true)} className="btn btn-soft">Leave</button>
      </div>

      {/* Leave confirmation overlay */}
      {showLeaveConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(40, 28, 20, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          animation: 'fade-in 0.2s ease',
        }}>
          <div className="card" style={{ padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', animation: 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
            <h2 className="serif" style={{ fontSize: 26, margin: '0 0 10px' }}>Leave this garden?</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              Your progress will be lost — the bloom won't be saved.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLeaveConfirm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Keep growing</button>
              <button onClick={onAbandon} className="btn btn-primary" style={{ flex: 1 }}>Leave anyway</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

Object.assign(window, { DashboardScreen, NewSessionScreen, TimerScreen, DURATIONS });
