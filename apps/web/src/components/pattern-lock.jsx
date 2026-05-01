import React from 'react';

/*
  Pattern lock: 3x3 grid. Drag (mouse or touch) from dot to dot.
  A dot activates when the pointer enters its hit circle; a line
  visibly connects consecutive dots. On release, emit the pattern
  as a string of dot indices (e.g. "0,1,2,5,8").

  Props:
    size       — px width/height
    onComplete — (pattern: string) => void
    value      — (optional) preview pattern to render statically
    color      — accent color override
    minDots    — minimum dots to count as valid (default 4)
    label      — small caption above
    resetKey   — change to force-clear internal state (for confirm step)
*/

function PatternLock({ size = 260, onComplete, color, minDots = 4, label, resetKey = 0, disabled = false }) {
  const [path, setPath] = React.useState([]);
  const [pointer, setPointer] = React.useState(null);  // {x, y} while dragging
  const [dragging, setDragging] = React.useState(false);
  const svgRef = React.useRef(null);

  React.useEffect(() => { setPath([]); setPointer(null); setDragging(false); }, [resetKey]);

  const dotR = size * 0.065;
  const hitR = size * 0.085;
  const padding = size * 0.14;
  const step = (size - padding * 2) / 2;
  const dots = React.useMemo(() => {
    const arr = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      arr.push({ i: r*3 + c, x: padding + c*step, y: padding + r*step });
    }
    return arr;
  }, [size]);

  const accent = color || "var(--petal-deep)";

  const getLocal = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - rect.left) * (size / rect.width), y: (t.clientY - rect.top) * (size / rect.height) };
  };

  const maybeAddDot = (p) => {
    for (const d of dots) {
      const dx = p.x - d.x, dy = p.y - d.y;
      if (dx*dx + dy*dy <= hitR*hitR) {
        if (!path.includes(d.i)) {
          // auto-include middle dot if skipping one
          const last = path[path.length - 1];
          if (last !== undefined) {
            const midR = (Math.floor(last/3) + Math.floor(d.i/3)) / 2;
            const midC = ((last%3) + (d.i%3)) / 2;
            if (Number.isInteger(midR) && Number.isInteger(midC)) {
              const midIdx = midR*3 + midC;
              if (!path.includes(midIdx) && midIdx !== last && midIdx !== d.i) {
                setPath(p => [...p, midIdx, d.i]);
                return;
              }
            }
          }
          setPath(p => [...p, d.i]);
        }
        return;
      }
    }
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(true);
    setPath([]);
    const p = getLocal(e);
    setPointer(p);
    maybeAddDot(p);
  };
  const move = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const p = getLocal(e);
    setPointer(p);
    maybeAddDot(p);
  };
  const end = () => {
    if (!dragging) return;
    setDragging(false);
    setPointer(null);
    if (path.length >= minDots && onComplete) onComplete(path.join(","));
  };

  const activeSet = new Set(path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {label && <div style={{ color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width={size} height={size}
        style={{ touchAction: 'none', userSelect: 'none', cursor: disabled ? 'default' : 'crosshair' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      >
        {/* soft backdrop */}
        <rect x="0" y="0" width={size} height={size} rx={size*0.12} fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5"/>

        {/* connecting lines (finished segments) */}
        {path.slice(0, -1).map((from, idx) => {
          const a = dots[from], b = dots[path[idx + 1]];
          return <line key={idx} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={accent} strokeWidth="3.5" strokeLinecap="round" opacity="0.6"/>;
        })}
        {/* trailing line to current pointer */}
        {dragging && path.length > 0 && pointer && (() => {
          const a = dots[path[path.length - 1]];
          return <line x1={a.x} y1={a.y} x2={pointer.x} y2={pointer.y} stroke={accent} strokeWidth="3.5" strokeLinecap="round" opacity="0.3"/>;
        })()}

        {/* dots */}
        {dots.map(d => (
          <g key={d.i} className={`plock-dot ${activeSet.has(d.i) ? 'active' : ''}`}>
            <circle className="plock-dot-ring" cx={d.x} cy={d.y} r={dotR*1.9} fill="none" stroke="var(--line)" strokeWidth="1.5"/>
            <circle className="plock-dot-inner" cx={d.x} cy={d.y} r={dotR} fill={activeSet.has(d.i) ? 'var(--petal)' : 'var(--line)'}/>
            {activeSet.has(d.i) && (
              <circle cx={d.x} cy={d.y} r={dotR*1.9} fill="none" stroke={accent} strokeWidth="2" opacity="0.3" className="pulse"/>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// static pattern preview (non-interactive)
function PatternPreview({ pattern, size = 80, color }) {
  if (!pattern) return null;
  const indices = pattern.split(',').map(Number);
  const padding = size * 0.14;
  const step = (size - padding * 2) / 2;
  const dots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) dots.push({ x: padding + c*step, y: padding + r*step });
  const accent = color || "var(--petal-deep)";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {indices.slice(0, -1).map((from, idx) => {
        const a = dots[from], b = dots[indices[idx + 1]];
        return <line key={idx} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.55"/>;
      })}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={size*0.05} fill={indices.includes(i) ? accent : "var(--line)"}/>
      ))}
    </svg>
  );
}

// hash fn (deterministic, not cryptographic — it's a prototype)
function hashPattern(pattern) {
  let h = 0;
  for (let i = 0; i < pattern.length; i++) h = (h * 31 + pattern.charCodeAt(i)) >>> 0;
  return "h" + h.toString(36);
}

export { PatternLock, PatternPreview, hashPattern };
window.PatternLock = PatternLock;
window.PatternPreview = PatternPreview;
window.hashPattern = hashPattern;
