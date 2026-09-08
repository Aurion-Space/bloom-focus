import React from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { api } from '../api';
import { PatternLock } from '../components/pattern-lock';

// The QR carries the bare recovery code and nothing else — never a URL back to
// the site, which would put the secret into browser history and server logs.
function useQrDataUrl(code: string | null) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!code) { setDataUrl(null); return; }
    QRCode.toDataURL(code, {
      width: 720,
      margin: 2,
      color: { dark: '#3B2E2A', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })
      .then(url => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [code]);

  return dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = src;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function buildRecoveryCard(gardenId: string, code: string, qrDataUrl: string): Promise<Blob | null> {
  const W = 760;
  const H = 1040;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FEF3E4';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 40, 40, W - 80, H - 80, 34);
  ctx.fill();

  ctx.textAlign = 'center';

  ctx.fillStyle = '#E89AAE';
  ctx.font = "30px serif";
  ctx.fillText('✿', W / 2, 132);

  ctx.fillStyle = '#3B2E2A';
  ctx.font = "44px 'DM Serif Display', Georgia, serif";
  ctx.fillText('Garden recovery key', W / 2, 196);

  ctx.fillStyle = '#6B5D54';
  ctx.font = "600 24px 'Nunito', sans-serif";
  ctx.fillText(`for @${gardenId}`, W / 2, 238);

  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 380;
  ctx.drawImage(qrImg, W / 2 - qrSize / 2, 286, qrSize, qrSize);

  ctx.fillStyle = '#FEF3E4';
  roundRect(ctx, 90, 706, W - 180, 78, 16);
  ctx.fill();

  ctx.fillStyle = '#3B2E2A';
  ctx.font = "600 27px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
  ctx.fillText(code, W / 2, 755);

  ctx.fillStyle = '#A89A8E';
  ctx.font = "400 21px 'Nunito', sans-serif";
  ctx.fillText('Keep this somewhere safe and private.', W / 2, 846);
  ctx.fillText('It is the only way back into your garden', W / 2, 878);
  ctx.fillText('if you forget your pattern.', W / 2, 910);

  ctx.fillStyle = '#E89AAE';
  ctx.font = "24px serif";
  ctx.fillText('✿  BloomFocus  ✿', W / 2, 968);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/** Reads a recovery code out of a photo or screenshot of the QR card. */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    // Phone photos are far larger than the decoder needs; scaling down keeps
    // this fast and actually improves the hit rate on noisy images.
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const found = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' });
    return found ? found.data.trim() : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ---------- the card the user saves ----------

function RecoveryCard({
  gardenId,
  code,
  title,
  blurb,
  confirmLabel,
  onConfirm,
}: {
  gardenId: string;
  code: string;
  title: string;
  blurb: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const qrDataUrl = useQrDataUrl(code);
  const [saved, setSaved] = React.useState(false);
  const [note, setNote] = React.useState('');

  const download = async () => {
    if (!qrDataUrl) return;
    const blob = await buildRecoveryCard(gardenId, code, qrDataUrl);
    if (!blob) { setNote('Could not build the image. Copy the code instead.'); return; }
    downloadBlob(blob, `bloomfocus-recovery-${gardenId}.png`);
    setSaved(true);
    setNote('Saved to your downloads.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setSaved(true);
      setNote('Code copied.');
    } catch {
      setNote('Copy failed — select the code above and copy it by hand.');
    }
  };

  return (
    <>
      <h2 className="serif" style={{ fontSize: 30, margin: '20px 0 6px' }}>{title}</h2>
      <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.55 }}>{blurb}</p>

      <div style={{
        background: 'var(--bg-tint)', borderRadius: 'var(--radius)', padding: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        {qrDataUrl
          ? <img src={qrDataUrl} alt={`Recovery QR code for ${gardenId}`} width={200} height={200}
              style={{ borderRadius: 12, background: '#fff', display: 'block' }}/>
          : <div style={{ width: 200, height: 200, display: 'grid', placeItems: 'center', color: 'var(--ink-faint)' }}>Drawing code…</div>}

        <code style={{
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 15, letterSpacing: '0.04em',
          color: 'var(--ink)', background: '#fff', padding: '10px 14px', borderRadius: 10,
          border: '1px solid var(--line)', userSelect: 'all', wordBreak: 'break-all', textAlign: 'center',
        }}>{code}</code>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={download} disabled={!qrDataUrl} style={{ flex: 1, opacity: qrDataUrl ? 1 : 0.5 }}>
          ⬇ Save the card
        </button>
        <button className="btn btn-soft" onClick={copy} style={{ flex: 1 }}>Copy code</button>
      </div>

      {note && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{note}</div>}

      <button
        className={saved ? 'btn btn-primary' : 'btn btn-soft'}
        onClick={onConfirm}
        style={{ width: '100%', marginTop: 14 }}
      >
        {confirmLabel}
      </button>

      <p style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
        Anyone holding this key can reset your garden. Keep it as private as the pattern itself.
      </p>
    </>
  );
}

// ---------- forgot-pattern flow ----------

function ForgotPatternScreen({
  onBack,
  onRecovered,
}: {
  onBack: () => void;
  onRecovered: (gardenId: string, token: string) => void;
}) {
  const [step, setStep] = React.useState<'id' | 'key' | 'draw' | 'confirm' | 'saved'>('id');
  const [gardenId, setGardenId] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [firstPattern, setFirstPattern] = React.useState<string | null>(null);
  const [resetKey, setResetKey] = React.useState(0);
  const [newCode, setNewCode] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const submitId = () => {
    const clean = gardenId.trim().toLowerCase();
    if (!/^[a-z0-9]{3,20}$/.test(clean)) { setError('3–20 letters or numbers, please'); return; }
    setGardenId(clean);
    setError('');
    setStep('key');
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    const decoded = await decodeQrFromFile(file);
    setBusy(false);
    if (!decoded) {
      setError('No QR code found in that image. Try a clearer photo, or type the code instead.');
      return;
    }
    setCode(decoded);
  };

  const submitKey = () => {
    if (!code.trim()) { setError('Add your recovery key to continue'); return; }
    setError('');
    setFirstPattern(null);
    setResetKey(k => k + 1);
    setStep('draw');
  };

  const handlePattern = async (pattern: string) => {
    if (step === 'draw') {
      setFirstPattern(pattern);
      setResetKey(k => k + 1);
      setError('');
      setStep('confirm');
      return;
    }

    if (pattern !== firstPattern) {
      setError('Those two shapes are different. Start the new pattern again.');
      setFirstPattern(null);
      setResetKey(k => k + 1);
      setStep('draw');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await api.gardens.recover(gardenId, code.trim(), pattern);
      setNewCode(result.recovery_code);
      setToken(result.token);
      setStep('saved');
    } catch (err: any) {
      const message = err?.message;
      if (message === 'invalid_recovery_code') {
        setError('That key does not match this garden.');
        setStep('key');
      } else if (message === 'not_found') {
        setError('No garden by that name.');
        setStep('id');
      } else if (message === 'no_recovery_code') {
        setError('This garden has no recovery key. It was made before recovery existed, so it can only be opened with its pattern.');
        setStep('key');
      } else if (message === 'too_many_attempts') {
        setError('Too many attempts. Try again in an hour.');
        setStep('key');
      } else if (message === 'invalid_pattern') {
        setError('Connect at least 4 dots.');
        setStep('draw');
      } else {
        setError('Something went wrong. Please try again.');
        setStep('key');
      }
      setFirstPattern(null);
      setResetKey(k => k + 1);
    }
    setBusy(false);
  };

  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '36px 32px', width: '100%', maxWidth: 420 }}>
        {step !== 'saved' && (
          <button onClick={onBack} className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }}>← Back</button>
        )}

        {step === 'id' && (
          <>
            <h2 className="serif" style={{ fontSize: 32, margin: '20px 0 6px' }}>Forgotten pattern</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 24px', fontSize: 14, lineHeight: 1.55 }}>
              You'll need the recovery key you saved when the garden was planted.
            </p>
            <input className="input" autoFocus value={gardenId}
              onChange={e => { setGardenId(e.target.value.toLowerCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submitId()}
              placeholder="garden name"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}/>
            {error && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <button className="btn btn-primary" disabled={!gardenId.trim()} onClick={submitId}
              style={{ width: '100%', marginTop: 22, opacity: gardenId.trim() ? 1 : 0.4 }}>Continue →</button>
          </>
        )}

        {step === 'key' && (
          <>
            <h2 className="serif" style={{ fontSize: 28, margin: '20px 0 4px' }}>Your recovery key</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 18px', fontSize: 14, lineHeight: 1.55 }}>
              Upload the card you saved, or type the code from it.
            </p>

            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }}/>
            <button className="btn btn-soft" onClick={() => fileRef.current?.click()} disabled={busy}
              style={{ width: '100%', padding: '18px 14px', fontSize: 14 }}>
              {busy ? 'Reading image…' : '🖼  Upload the QR card'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
              <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>or type it</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            </div>

            <input className="input" value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submitKey()}
              placeholder="BLOOM-XXXX-XXXX-XXXX-XXXX"
              style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 15, letterSpacing: '0.03em' }}/>

            {error && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10, lineHeight: 1.5 }}>{error}</div>}

            <button className="btn btn-primary" disabled={!code.trim() || busy} onClick={submitKey}
              style={{ width: '100%', marginTop: 20, opacity: (code.trim() && !busy) ? 1 : 0.4 }}>
              Continue →
            </button>
          </>
        )}

        {(step === 'draw' || step === 'confirm') && (
          <>
            <h2 className="serif" style={{ fontSize: 28, margin: '20px 0 4px' }}>
              {step === 'draw' ? 'Draw a new secret' : 'Once more, to remember'}
            </h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>
              {step === 'draw' ? 'Connect at least 4 dots. This replaces your old pattern.' : 'Draw the same shape again.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PatternLock size={260} resetKey={resetKey} onComplete={handlePattern}/>
            </div>
            {error && <div style={{ color: '#C05858', fontSize: 13, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}
            {busy && <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>Resetting your garden…</div>}
            <button onClick={() => { setFirstPattern(null); setResetKey(k => k + 1); setError(''); setStep('draw'); }}
              className="btn btn-soft" style={{ marginTop: 16, width: '100%', fontSize: 13 }}>Start over</button>
          </>
        )}

        {step === 'saved' && newCode && (
          <RecoveryCard
            gardenId={gardenId}
            code={newCode}
            title="Pattern reset"
            blurb="Your old key has been retired. Here is the new one — save it before you go in."
            confirmLabel="Saved it — open my garden →"
            onConfirm={() => onRecovered(gardenId, token || '')}
          />
        )}
      </div>
    </div>
  );
}

// ---------- issuing a key from inside the garden ----------

function RecoveryKeyScreen({ gardenId, onBack }: { gardenId: string; onBack: () => void }) {
  const [code, setCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const issue = async () => {
    setBusy(true);
    setError('');
    try {
      const { recovery_code } = await api.gardens.issueRecoveryCode();
      setCode(recovery_code);
    } catch {
      setError('Could not create a key just now. Please try again.');
    }
    setBusy(false);
  };

  return (
    <div className="fade-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="card" style={{ padding: '36px 32px', width: '100%', maxWidth: 420 }}>
        <button onClick={onBack} className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }}>← Back</button>

        {!code && (
          <>
            <h2 className="serif" style={{ fontSize: 30, margin: '20px 0 6px' }}>Recovery key</h2>
            <p style={{ color: 'var(--ink-soft)', margin: '0 0 8px', fontSize: 14, lineHeight: 1.6 }}>
              A recovery key is a QR card you keep. If you ever forget your pattern, it is the only way back into
              <strong style={{ color: 'var(--ink)' }}> @{gardenId}</strong>.
            </p>
            <p style={{ color: 'var(--ink-faint)', fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>
              Making a new key retires any older one, so an old card will stop working.
            </p>
            {error && <div style={{ color: '#C05858', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button className="btn btn-primary" onClick={issue} disabled={busy} style={{ width: '100%', opacity: busy ? 0.5 : 1 }}>
              {busy ? 'Creating…' : 'Create a recovery key'}
            </button>
          </>
        )}

        {code && (
          <RecoveryCard
            gardenId={gardenId}
            code={code}
            title="Your recovery key"
            blurb="Save this now. It will not be shown again — if you lose it, you can make another from here."
            confirmLabel="Done"
            onConfirm={onBack}
          />
        )}
      </div>
    </div>
  );
}

(window as any).RecoveryCard = RecoveryCard;
(window as any).ForgotPatternScreen = ForgotPatternScreen;
(window as any).RecoveryKeyScreen = RecoveryKeyScreen;

export { RecoveryCard, ForgotPatternScreen, RecoveryKeyScreen };
