import React from 'react';

/* Floating petals / leaves drifting down the screen. */

function AmbientPetal({ kind, delay, left, duration, size, rot }) {
  const style = {
    left: `${left}%`,
    top: `-${10 + Math.random() * 10}vh`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    width: size,
    height: size,
    transform: `rotate(${rot}deg)`,
  };

  if (kind === "petal") {
    return (
      <svg className="float" style={style} viewBox="0 0 20 20">
        <ellipse cx="10" cy="10" rx="6" ry="9" fill="#F9C4D3" stroke="#E89AAE" strokeWidth="0.8"/>
      </svg>
    );
  }
  if (kind === "leaf") {
    return (
      <svg className="float" style={style} viewBox="0 0 20 20">
        <path d="M10 2 Q2 10 10 18 Q18 10 10 2 Z" fill="#9FC48A" stroke="#6FA373" strokeWidth="0.8"/>
        <path d="M10 3 L10 17" stroke="#6FA373" strokeWidth="0.6" opacity="0.5"/>
      </svg>
    );
  }
  if (kind === "sparkle") {
    return (
      <svg className="float" style={{...style, animationTimingFunction: 'ease-in-out'}} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="2" fill="#F4CF6B" opacity="0.8"/>
        <circle cx="10" cy="10" r="5" fill="#F4CF6B" opacity="0.2"/>
      </svg>
    );
  }
  return null;
}

function Ambient({ kind = "petal", count = 18 }) {
  if (kind === "off") return null;
  const items = React.useMemo(() => (
    Array.from({ length: count }).map((_, i) => ({
      left: Math.random() * 100,
      duration: 14 + Math.random() * 18,
      delay: -Math.random() * 20,
      size: 12 + Math.random() * 16,
      rot: Math.random() * 360,
    }))
  ), [count, kind]);
  return (
    <div className="ambient">
      {items.map((p, i) => <AmbientPetal key={i} kind={kind} {...p}/>)}
    </div>
  );
}

export { Ambient };
window.Ambient = Ambient;
