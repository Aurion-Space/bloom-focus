import React from 'react';
import { PlantSVG, PLANTS } from '../plants/plants';
import { Ambient } from '../components/ambient';

/*
  Garden gallery + public bloom viewer.
*/

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

function formatDayLabel(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function GardenScreen({ garden, sessions, onBack, onViewSession, initialDayFilter = 'all' }) {
  const [filter, setFilter] = React.useState('all');
  const [dayFilter, setDayFilter] = React.useState(initialDayFilter || 'all');

  React.useEffect(() => {
    setDayFilter(initialDayFilter || 'all');
  }, [initialDayFilter]);

  const plants = React.useMemo(() => [...new Set(sessions.map(s => s.plant_type))], [sessions]);
  const dayOptions = React.useMemo(() => {
    const byDay = new Map();

    sortByCompletedDesc(sessions).forEach(session => {
      const key = getLocalDayKey(session.completed_at);
      const existing = byDay.get(key) || {
        key,
        label: formatDayLabel(key),
        count: 0,
        minutes: 0,
      };

      existing.count += 1;
      existing.minutes += session.duration_minutes;
      byDay.set(key, existing);
    });

    return [...byDay.values()];
  }, [sessions]);
  const shown = sessions.filter(s => {
    const plantMatches = filter === 'all' || s.plant_type === filter;
    const dayMatches = dayFilter === 'all' || getLocalDayKey(s.completed_at) === dayFilter;
    return plantMatches && dayMatches;
  });
  const sorted = sortByCompletedDesc(shown);
  const daySummary = dayFilter === 'all'
    ? null
    : {
        label: formatDayLabel(dayFilter),
        count: sorted.length,
        minutes: sorted.reduce((sum, session) => sum + session.duration_minutes, 0),
      };

  return (
    <div className="fade-enter" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <button onClick={onBack} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13 }}>← Dashboard</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div className="hand" style={{ fontSize: 26, color: 'var(--ink-soft)' }}>@{garden.garden_id}'s</div>
        <h1 className="serif" style={{ fontSize: 56, margin: '0 0 8px' }}>Garden</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 15, margin: 0 }}>
          {sessions.length} {sessions.length === 1 ? 'bloom' : 'blooms'} · {sessions.reduce((s,x)=>s+x.duration_minutes,0)} minutes tended
        </p>
      </div>

      {daySummary && (
        <div className="card" style={{
          padding: '20px 24px',
          marginBottom: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          background: 'linear-gradient(135deg, color-mix(in oklab, var(--petal) 28%, var(--surface)), var(--surface))',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Day view</div>
            <div className="serif" style={{ fontSize: 28, marginTop: 3 }}>{daySummary.label}</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 2 }}>
              {daySummary.count} {daySummary.count === 1 ? 'bloom' : 'blooms'} completed · {daySummary.minutes} focused minutes
            </div>
          </div>
          <button onClick={() => setDayFilter('all')} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13 }}>Clear day</button>
        </div>
      )}

      {/* Stylized garden bed — all plants on a shelf */}
      {sessions.length > 0 && (
        <div style={{
          background: 'linear-gradient(180deg, transparent 60%, color-mix(in oklab, var(--sage) 28%, transparent) 60%, color-mix(in oklab, var(--sage) 18%, transparent))',
          padding: '20px 20px 40px', borderRadius: 28, marginBottom: 36, overflow: 'hidden',
          border: '1px solid var(--line-soft)',
          position: 'relative',
        }}>
          <div className="hand" style={{ color: 'var(--ink-soft)', fontSize: 18, marginBottom: 4 }}>the garden bed</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, overflowX: 'auto', paddingBottom: 6 }}>
            {sorted.slice(0, 20).map((s, i) => (
              <button key={s.id} onClick={() => onViewSession(s)}
                className="sway"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${4 + (i % 4)}s`,
                  cursor: 'pointer', flexShrink: 0,
                  filter: 'drop-shadow(0 8px 12px rgba(95,70,50,0.1))',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
                title={s.intention}
              >
                <PlantSVG plantId={s.plant_type} size={80}/>
              </button>
            ))}
          </div>
        </div>
      )}

      {dayOptions.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 }}>Filter by day</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setDayFilter('all')} className="chip" style={{ cursor: 'pointer', background: dayFilter === 'all' ? 'var(--petal-deep)' : 'var(--bg-tint)', color: dayFilter === 'all' ? '#FFF9F0' : 'var(--ink-soft)' }}>All days</button>
            {dayOptions.map(day => (
              <button
                key={day.key}
                onClick={() => setDayFilter(day.key)}
                className="chip"
                style={{ cursor: 'pointer', background: dayFilter === day.key ? 'var(--petal-deep)' : 'var(--bg-tint)', color: dayFilter === day.key ? '#FFF9F0' : 'var(--ink-soft)' }}
                title={`${day.count} ${day.count === 1 ? 'bloom' : 'blooms'} · ${day.minutes} minutes`}
              >
                {new Date(day.key + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>
      )}

      {plants.length > 1 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 }}>Filter by plant</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setFilter('all')} className="chip" style={{ cursor: 'pointer', background: filter === 'all' ? 'var(--petal-deep)' : 'var(--bg-tint)', color: filter === 'all' ? '#FFF9F0' : 'var(--ink-soft)' }}>All plants</button>
            {plants.map(p => {
              const plant = PLANTS.find(x => x.id === p);
              return <button key={p} onClick={() => setFilter(p)} className="chip" style={{ cursor: 'pointer', background: filter === p ? 'var(--petal-deep)' : 'var(--bg-tint)', color: filter === p ? '#FFF9F0' : 'var(--ink-soft)' }}>{plant.name}</button>;
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--ink-soft)' }}>
          Your garden is quiet. <br/>Time to plant something.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {sorted.map(s => {
            const plant = PLANTS.find(p => p.id === s.plant_type);
            return (
              <button key={s.id} onClick={() => onViewSession(s)} className="card" style={{ padding: 18, textAlign: 'left', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px', background: `linear-gradient(180deg, ${plant.color}22, transparent)`, borderRadius: 14 }}>
                  <PlantSVG plantId={s.plant_type} size={140}/>
                </div>
                <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>{plant.name}</div>
                <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-soft)', margin: '4px 0 8px', lineHeight: 1.4, minHeight: 36 }}>"{s.intention}"</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-faint)' }}>
                  <span>{s.duration_minutes} min</span>
                  <span>{new Date(s.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Modal-ish re-view of a past session (reuses complete screen styling)
function SessionDetailScreen({ session, gardenId, onBack, onToast }) {
  const plant = PLANTS.find(p => p.id === session.plant_type);
  const shareUrl = `${location.origin}${location.pathname}#/b/${session.unique_slug}`;
  const qr = useQRDataURL(shareUrl, 220);

  const downloadPlant = async () => {
    onToast('Preparing your plant…');
    const plantSvg = await svgFromPlant(session.plant_type);
    const img = await loadImg(plantSvg);
    const S = 1600;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFF9F0'; ctx.fillRect(0, 0, S, S);
    const pad = 200;
    ctx.drawImage(img, pad, pad, S - pad*2, S - pad*2);
    canvas.toBlob(b => { downloadBlob(b, `bloomfocus-${plant.id}.png`); onToast('Plant saved ✿'); }, 'image/png');
  };

  const downloadCard = async () => {
    onToast('Painting your card…');
    const blob = await renderPictureCard(session, gardenId, qr);
    downloadBlob(blob, `bloomfocus-${plant.id}-card.png`);
    onToast('Card saved ✿');
  };

  return (
    <div className="fade-enter" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      <button onClick={onBack} className="btn btn-soft" style={{ padding: '8px 14px', fontSize: 13, marginBottom: 18 }}>← Garden</button>
      <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
        <div className="hand" style={{ fontSize: 22, color: 'var(--ink-soft)' }}>
          {new Date(session.completed_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        <h1 className="serif" style={{ fontSize: 44, margin: '6px 0 14px' }}>{plant.name}</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PlantSVG plantId={session.plant_type} size={240} animated/>
        </div>
        <div className="serif" style={{ fontSize: 22, fontStyle: 'italic', maxWidth: 480, margin: '16px auto 0', lineHeight: 1.4 }}>"{session.intention}"</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 10 }}>{session.duration_minutes} minutes of tending</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
          <button onClick={downloadPlant} className="btn btn-sage">↓ Plant picture</button>
          <button onClick={downloadCard} className="btn btn-primary">✿ Download card</button>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); onToast('Link copied'); }} className="btn btn-ghost">Copy link</button>
        </div>
        {qr && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}><img src={qr} width={120} height={120} style={{ opacity: 0.85 }}/></div>}
      </div>
    </div>
  );
}

// Public bloom viewer (via share link)
function PublicBloomScreen({ session, gardenId, onExit }) {
  const plant = PLANTS.find(p => p.id === session.plant_type);
  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <Ambient kind="petal" count={20}/>
      <div className="hand" style={{ fontSize: 26, color: 'var(--ink-soft)' }}>— a shared bloom —</div>
      <div style={{ margin: '8px 0 0' }}>
        <div className="sway" style={{ animationDuration: '6s' }}>
          <PlantSVG plantId={session.plant_type} size={340} animated/>
        </div>
      </div>
      <h1 className="serif" style={{ fontSize: 56, margin: '0 0 10px' }}>{plant.name}</h1>
      <div className="serif" style={{ fontSize: 26, fontStyle: 'italic', maxWidth: 580, lineHeight: 1.3, color: 'var(--ink)' }}>"{session.intention}"</div>
      <div style={{ color: 'var(--ink-soft)', fontSize: 16, marginTop: 18 }}>
        {session.duration_minutes} minutes of focus · {new Date(session.completed_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
      <div style={{ marginTop: 26 }}>
        <div className="chip" style={{ fontSize: 14, padding: '8px 16px' }}>
          grown with focus by <strong style={{ marginLeft: 4, color: 'var(--petal-deep)' }}>@{gardenId}</strong>
        </div>
      </div>
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px dashed var(--line)', maxWidth: 420 }}>
        <div className="hand" style={{ fontSize: 22, color: 'var(--ink-soft)', marginBottom: 8 }}>grow your own</div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
          BloomFocus turns quiet, focused time into a little garden of your own.
        </p>
        <button onClick={onExit} className="btn btn-primary">🌱 Plant my first bloom</button>
      </div>
    </div>
  );
}

Object.assign(window, { GardenScreen, SessionDetailScreen, PublicBloomScreen });
