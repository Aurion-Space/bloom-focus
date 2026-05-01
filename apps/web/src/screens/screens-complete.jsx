import React from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'qrcode';
import { PlantSVG, PLANTS } from '../plants/plants';
import { Ambient } from '../components/ambient';

/*
  Session complete + shareable QR card.
*/

function useQRDataURL(text, size = 220) {
  const [dataUrl, setDataUrl] = React.useState(null);
  React.useEffect(() => {
    if (!text) return;
    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#3B2E2A',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }).then(setDataUrl).catch(() => {});
  }, [text, size]);
  return dataUrl;
}

// Render a session's SVG plant to PNG via canvas; return blob + url
function renderPlantPNG(plantId, intention, gardenId, size = 1200) {
  return new Promise((resolve) => {
    // render offscreen and serialize
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed'; wrapper.style.left = '-9999px'; wrapper.style.top = '0';
    document.body.appendChild(wrapper);
    const root = ReactDOM.createRoot(wrapper);
    root.render(
      <div style={{ width: size, height: size, background: '#FFF9F0', padding: 80, boxSizing: 'border-box', fontFamily: 'DM Serif Display, Georgia, serif' }}>
        <div style={{ height: '100%', border: '2px solid #EADBC8', borderRadius: 40, padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 42, color: '#6B5D54', marginBottom: 20 }}>— bloomed —</div>
          <PlantSVG plantId={plantId} size={700}/>
          <div style={{ fontSize: 44, color: '#3B2E2A', marginTop: 40, fontStyle: 'italic', textAlign: 'center', maxWidth: 780 }}>"{intention}"</div>
          <div style={{ fontSize: 22, color: '#A89A8E', marginTop: 28, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>grown with focus by @{gardenId}</div>
        </div>
      </div>
    );
    setTimeout(() => {
      // Serialize plant SVG only for a cleaner PNG (plant picture download)
      const svgEl = wrapper.querySelector('svg');
      // Full card approach: use html2canvas-like SVG foreign object
      // Simpler: export just the plant SVG as PNG
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([`<?xml version="1.0"?>${svgStr}`], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFF9F0'; ctx.fillRect(0, 0, size, size);
        // draw plant centered
        const pad = 100;
        ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          root.unmount();
          wrapper.remove();
          resolve(blob);
        }, 'image/png');
      };
      img.src = url;
    }, 50);
  });
}

// Draw the full shareable card onto a canvas — used for "Download Picture Card"
async function renderPictureCard(session, gardenId, qrDataUrl, size = 1200) {
  const plant = PLANTS.find(p => p.id === session.plant_type) || PLANTS[0];
  const canvas = document.createElement('canvas');
  const W = size, H = Math.round(size * 1.4);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // background gradient (warm cream)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#FFF9F0');
  bg.addColorStop(1, '#FDE8D9');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // outer card rounded frame
  const pad = 70;
  const inner = { x: pad, y: pad, w: W - pad*2, h: H - pad*2 };
  const r = 56;
  roundRect(ctx, inner.x, inner.y, inner.w, inner.h, r);
  ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.strokeStyle = '#EADBC8'; ctx.lineWidth = 3; ctx.stroke();

  // inner border accent
  roundRect(ctx, inner.x + 18, inner.y + 18, inner.w - 36, inner.h - 36, r - 14);
  ctx.strokeStyle = plant.color + '66'; ctx.lineWidth = 2; ctx.stroke();

  // header label
  ctx.fillStyle = '#6B5D54';
  ctx.font = "italic 42px 'Caveat', cursive";
  ctx.textAlign = 'center';
  ctx.fillText('— a bloom of focus —', W/2, pad + 100);

  // plant svg
  const plantSvg = await svgFromPlant(plant.id);
  const plantImg = await loadImg(plantSvg);
  const plantSize = 520;
  ctx.drawImage(plantImg, W/2 - plantSize/2, pad + 130, plantSize, plantSize);

  // plant name
  ctx.fillStyle = '#3B2E2A';
  ctx.font = "400 68px 'DM Serif Display', Georgia, serif";
  ctx.fillText(plant.name, W/2, pad + 780);

  // intention
  ctx.fillStyle = '#3B2E2A';
  ctx.font = "italic 36px 'DM Serif Display', Georgia, serif";
  wrapText(ctx, `"${session.intention}"`, W/2, pad + 840, W - pad*2 - 120, 48);

  // metadata row
  const dateStr = new Date(session.completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillStyle = '#A89A8E';
  ctx.font = "600 26px 'Nunito', sans-serif";
  ctx.fillText(`${session.duration_minutes} minutes · ${dateStr}`, W/2, pad + 960);

  // QR code centered-ish below
  if (qrDataUrl) {
    const qrImg = await loadImg(qrDataUrl);
    const qrSize = 260;
    ctx.drawImage(qrImg, W/2 - qrSize/2, H - pad - 420, qrSize, qrSize);
  }

  // signature
  ctx.fillStyle = '#6B5D54';
  ctx.font = "600 24px 'Nunito', sans-serif";
  ctx.fillText(`grown with focus by @${gardenId}`, W/2, H - pad - 110);

  // tiny flourish
  ctx.fillStyle = '#E89AAE';
  ctx.font = "28px serif";
  ctx.fillText('✿  BloomFocus  ✿', W/2, H - pad - 70);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = ''; let cy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = w; cy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, cy);
}

// serialize a PlantSVG to data URL
function svgFromPlant(plantId) {
  return new Promise(resolve => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed'; wrapper.style.left = '-9999px';
    document.body.appendChild(wrapper);
    const root = ReactDOM.createRoot(wrapper);
    root.render(<PlantSVG plantId={plantId} size={600}/>);
    setTimeout(() => {
      const svgEl = wrapper.querySelector('svg');
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const str = new XMLSerializer().serializeToString(svgEl);
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)));
      root.unmount(); wrapper.remove();
      resolve(url);
    }, 30);
  });
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Completion screen ----------

function CompleteScreen({ session, gardenId, onHome, onViewGarden, onToast }) {
  const plant = PLANTS.find(p => p.id === session.plant_type);
  const shareUrl = `${location.origin}${location.pathname}#/b/${session.unique_slug}`;
  const qr = useQRDataURL(shareUrl, 240);
  const [replay, setReplay] = React.useState(0);

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
    canvas.toBlob(b => {
      downloadBlob(b, `bloomfocus-${plant.id}.png`);
      onToast('Plant saved ✿');
    }, 'image/png');
  };

  const downloadCard = async () => {
    onToast('Painting your card…');
    const blob = await renderPictureCard(session, gardenId, qr);
    downloadBlob(blob, `bloomfocus-${plant.id}-card.png`);
    onToast('Card saved ✿');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => onToast('Link copied'));
  };

  return (
    <div className="fade-enter" style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* confetti petals specific to this screen */}
      <Ambient kind="petal" count={28}/>

      <div style={{ textAlign: 'center' }}>
        <div className="hand" style={{ fontSize: 30, color: 'var(--petal-deep)', marginBottom: 6 }}>it bloomed</div>
        <h1 className="serif" style={{ fontSize: 56, margin: '0 0 10px', lineHeight: 1 }}>Your {plant.name.toLowerCase()} opened.</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 17, margin: 0, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
          You stayed with it for {session.duration_minutes} quiet minutes. That matters.
        </p>
      </div>

      {/* Hero bloom */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 20px' }}>
        <div style={{ position: 'relative', width: 420, height: 420 }}>
          {/* decorative rings (behind) */}
          <svg viewBox="0 0 420 420" width="420" height="420" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <circle cx="210" cy="210" r="195" fill="none" stroke={plant.color} strokeWidth="1" strokeDasharray="2 6" opacity="0.4"/>
            <circle cx="210" cy="210" r="160" fill="none" stroke={plant.color} strokeWidth="1" opacity="0.2"/>
          </svg>
          {/* plant, absolutely centered */}
          <div key={replay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <div className="sway" style={{ animationDuration: '5s', width: 260, height: 312, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlantSVG plantId={session.plant_type} size={260} animated/>
            </div>
          </div>
          <button onClick={() => setReplay(r => r+1)} className="btn btn-soft" style={{ position: 'absolute', bottom: 8, right: 8, padding: '6px 12px', fontSize: 12, zIndex: 2 }}>↻ Replay</button>
        </div>
      </div>

      {/* Share row */}
      <div className="card" style={{ padding: '28px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>Share this bloom</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 13, fontStyle: 'italic' }}>"{session.intention}"</div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, background: 'var(--bg-tint)', padding: '10px 14px', borderRadius: 12, border: '1px dashed var(--line)', fontSize: 13, fontFamily: 'monospace', color: 'var(--ink-soft)', overflow: 'hidden' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{shareUrl}</span>
          <button onClick={copyLink} className="btn btn-soft" style={{ padding: '4px 12px', fontSize: 12, flexShrink: 0 }}>Copy</button>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={downloadPlant} className="btn btn-sage">↓ Plant picture</button>
          <button onClick={downloadCard} className="btn btn-primary">✿ Download card</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {qr ? <img src={qr} alt="QR code" width="160" height="160" style={{ display: 'block', margin: '0 auto' }}/> : <div style={{ width: 160, height: 160, background: 'var(--bg-tint)', borderRadius: 8 }}/>}
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scan to visit</div>
        </div>
      </div>

      {/* Card preview */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 20 }}>Your picture card</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Preview — downloads as PNG at 1200×1680</div>
        </div>
        <PictureCardPreview session={session} gardenId={gardenId} qrDataUrl={qr}/>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
        <button onClick={onHome} className="btn btn-ghost">🌸 Back to garden</button>
        <button onClick={onViewGarden} className="btn btn-soft">See all blooms</button>
      </div>
    </div>
  );
}

function PictureCardPreview({ session, gardenId, qrDataUrl }) {
  const plant = PLANTS.find(p => p.id === session.plant_type);
  const dateStr = new Date(session.completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: 360, aspectRatio: '1 / 1.4',
        background: 'linear-gradient(135deg, #FFF9F0, #FDE8D9)',
        borderRadius: 28, padding: 22, boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--line)',
      }}>
        <div style={{ height: '100%', border: `1.5px solid ${plant.color}55`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 14px', textAlign: 'center' }}>
          <div className="hand" style={{ fontSize: 18, color: 'var(--ink-soft)' }}>— a bloom of focus —</div>
          <div style={{ marginTop: 4 }}><PlantSVG plantId={session.plant_type} size={150}/></div>
          <div className="serif" style={{ fontSize: 24, marginTop: 2 }}>{plant.name}</div>
          <div className="serif" style={{ fontSize: 14, fontStyle: 'italic', marginTop: 6, color: 'var(--ink)', lineHeight: 1.3, padding: '0 10px' }}>"{session.intention}"</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8, fontWeight: 600 }}>{session.duration_minutes} min · {dateStr}</div>
          {qrDataUrl && <img src={qrDataUrl} width="92" height="92" style={{ marginTop: 10, marginLeft: 'auto', marginRight: 'auto', display: 'block' }}/>}
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 6, fontWeight: 600 }}>grown with focus by @{gardenId}</div>
          <div style={{ fontSize: 12, color: 'var(--petal-deep)', marginTop: 'auto' }}>✿ BloomFocus ✿</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CompleteScreen, renderPictureCard, svgFromPlant, loadImg, downloadBlob, useQRDataURL, PictureCardPreview });
