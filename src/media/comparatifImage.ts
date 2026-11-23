/**
 * L'image « Avant · Après » à publier, dessinée dans le téléphone (aucune
 * connexion, aucun service) — maquette B2 validée par Guillaume, thème POWER,
 * format 4:5 (1080 × 1350, Instagram).
 *
 * Les chiffres viennent de `engine/comparatif.ts` (vert = progrès, rouge =
 * recul, « non mesuré S0/S12 » pour une mesure absente) ; ce fichier ne fait
 * que dessiner. Les photos sont celles choisies à l'écran : elles ne sont
 * ni enregistrées ni envoyées.
 *
 * Coordonnées : celles de la maquette (432 × 540) multipliées par 2,5.
 */

import type { Comparatif, LigneComparatif } from '../engine/comparatif';

export const LARGEUR = 1080;
export const HAUTEUR = 1350;
const K = 2.5;

const C = {
  ivoire: '#f4f1ea',
  gris: '#9aa6b3',
  rouge: '#ff2d55',
  vert: '#2fd47a',
  vertTexte: '#3ddc84',
  recul: '#ff3b4e',
  reculTexte: '#ff5a68',
  avant: '#7b879a',
  piste: 'rgba(244,241,234,0.10)',
  encre: '#151a22',
};
const TITRE = "'Barlow Mass', 'Barlow Condensed', 'Arial Narrow', sans-serif";
const COND = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const TEXTE = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export interface DonneesImage {
  /** « POWER CYCLE 1 · 12 SEMAINES ». */
  entete: string;
  comparatif: Comparatif;
  photos: { s0: Blob | null; s12: Blob | null };
  /** « SEMAINE 0 », ou la semaine réelle de la photo de suivi choisie. */
  etiquettes: { s0: string; s12: string };
}

function arrondi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

async function bitmap(b: Blob | null): Promise<ImageBitmap | null> {
  if (b === null) return null;
  try {
    return await createImageBitmap(b);
  } catch {
    return null;
  }
}

/** Une photo « couverte » dans son cadre ; sans photo, le cadre le dit. */
function photo(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap | null,
  x: number,
  y: number,
  w: number,
  h: number,
  etiquette: string,
  absente: string,
) {
  ctx.save();
  arrondi(ctx, x, y, w, h, 12 * K);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#2b3a55');
  g.addColorStop(1, '#151d2b');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  if (img !== null) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    // Cadrage haut (30 %) : une photo de suivi est un portrait, la tête ne
    // doit pas sauter au recadrage.
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * 0.3, iw, ih);
  } else {
    ctx.fillStyle = 'rgba(244,241,234,0.55)';
    ctx.font = `500 ${11 * K}px ${TEXTE}`;
    ctx.textAlign = 'center';
    ctx.fillText(absente, x + w / 2, y + h / 2 + 14 * K);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  // L'étiquette « SEMAINE 0 », pastille ivoire.
  ctx.font = `700 ${11 * K}px ${COND}`;
  const tw = ctx.measureText(etiquette).width;
  arrondi(ctx, x + 8 * K, y + 8 * K, tw + 14 * K, 19 * K, 6 * K);
  ctx.fillStyle = C.ivoire;
  ctx.fill();
  ctx.fillStyle = C.encre;
  ctx.fillText(etiquette, x + 15 * K, y + 22 * K);
}

function barre(ctx: CanvasRenderingContext2D, l: LigneComparatif, y: number, x: number, w: number) {
  ctx.font = `700 ${15 * K}px ${COND}`;
  ctx.fillStyle = C.ivoire;
  ctx.fillText(l.libelle, x, y);
  if (l.ecartTexte !== null) {
    ctx.fillStyle = l.mieux === false ? C.reculTexte : l.mieux === true ? C.vertTexte : C.gris;
    ctx.textAlign = 'right';
    ctx.fillText(l.ecartTexte, x + w, y);
    ctx.textAlign = 'left';
  }
  const py = y + 7 * K;
  const ph = 9 * K;
  ctx.save();
  arrondi(ctx, x, py, w, ph, 5 * K);
  ctx.clip();
  ctx.fillStyle = C.piste;
  ctx.fillRect(x, py, w, ph);
  if (l.barre !== null) {
    const base = Math.min(l.barre.depart, l.barre.arrivee) * w;
    const delta = Math.abs(l.barre.arrivee - l.barre.depart) * w;
    ctx.fillStyle = C.avant;
    ctx.fillRect(x, py, base, ph);
    if (delta > 0) {
      const gain = l.mieux !== false;
      ctx.fillStyle = gain ? C.vert : C.recul;
      ctx.fillRect(x + base, py, delta, ph);
      if (!gain) {
        // Hachures : le recul se lit même sans distinguer le rouge. Tenues
        // DANS le segment rouge.
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + base, py, delta, ph);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        for (let hx = x + base - ph; hx < x + base + delta; hx += 6) {
          ctx.beginPath();
          ctx.moveTo(hx, py + ph);
          ctx.lineTo(hx + ph, py);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  ctx.restore();
  const vy = py + ph + 13 * K;
  ctx.font = `400 ${11 * K}px ${TEXTE}`;
  ctx.fillStyle = C.gris;
  ctx.fillText(l.departTexte, x, vy);
  ctx.font = `700 ${11 * K}px ${TEXTE}`;
  ctx.fillStyle = l.arrivee === null ? C.gris : C.ivoire;
  ctx.textAlign = 'right';
  ctx.fillText(l.arriveeTexte, x + w, vy);
  ctx.textAlign = 'left';
}

function tuile(
  ctx: CanvasRenderingContext2D,
  l: LigneComparatif,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  arrondi(ctx, x, y, w, h, 10 * K);
  ctx.fillStyle = 'rgba(244,241,234,0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,241,234,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `700 ${22 * K}px ${COND}`;
  ctx.fillStyle = l.arrivee === null ? C.gris : C.ivoire;
  ctx.fillText(l.arrivee === null ? '—' : l.arriveeTexte, x + 10 * K, y + 26 * K);
  ctx.font = `400 ${11 * K}px ${TEXTE}`;
  ctx.fillStyle = C.gris;
  const bas =
    l.arrivee === null
      ? `${l.libelle} · ${l.arriveeTexte}`
      : l.depart === null
        ? `${l.libelle} · ${l.departTexte}`
        : `${l.libelle} · `;
  ctx.fillText(bas, x + 10 * K, y + 42 * K);
  if (l.ecartTexte !== null) {
    const bw = ctx.measureText(bas).width;
    ctx.fillStyle = l.mieux === false ? C.reculTexte : l.mieux === true ? C.vertTexte : C.gris;
    ctx.fillText(l.ecartTexte, x + 10 * K + bw, y + 42 * K);
  }
}

/** Dessine l'image entière sur un canvas de 1080 × 1350. */
export async function dessinerComparatif(
  canvas: HTMLCanvasElement,
  d: DonneesImage,
): Promise<void> {
  canvas.width = LARGEUR;
  canvas.height = HAUTEUR;
  const ctx = canvas.getContext('2d')!;
  try {
    await Promise.all([
      document.fonts.load(`italic 800 40px 'Barlow Mass'`),
      document.fonts.load(`700 20px 'Barlow Condensed'`),
    ]);
  } catch {
    // Sans la police, le canvas prend la suivante de la liste : l'image reste juste.
  }
  const [p0, p12] = await Promise.all([bitmap(d.photos.s0), bitmap(d.photos.s12)]);

  const fond = ctx.createRadialGradient(LARGEUR * 0.85, 0, 0, LARGEUR * 0.85, 0, LARGEUR * 1.2);
  fond.addColorStop(0, '#1d2c47');
  fond.addColorStop(0.62, '#0e1522');
  fond.addColorStop(1, '#0b1019');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  const x = 22 * K;
  const w = LARGEUR - 2 * x;
  ctx.textBaseline = 'alphabetic';

  // En-tête : la marque, le programme.
  ctx.font = `italic 800 ${22 * K}px ${TITRE}`;
  ctx.fillStyle = C.rouge;
  ctx.fillText('MAJK', x, 42 * K);
  ctx.font = `700 ${12 * K}px ${COND}`;
  ctx.fillStyle = 'rgba(244,241,234,0.65)';
  ctx.textAlign = 'right';
  ctx.fillText(d.entete.toUpperCase(), x + w, 40 * K);
  ctx.textAlign = 'left';

  // AVANT · APRÈS
  ctx.font = `italic 800 ${36 * K}px ${TITRE}`;
  ctx.fillStyle = C.ivoire;
  const avant = 'AVANT · ';
  ctx.fillText(avant, x, 84 * K);
  ctx.fillStyle = C.rouge;
  ctx.fillText('APRÈS', x + ctx.measureText(avant).width, 84 * K);

  // Les deux photos.
  const gap = 8 * K;
  const pw = (w - gap) / 2;
  photo(ctx, p0, x, 96 * K, pw, 92 * K, d.etiquettes.s0, 'pas de photo d’avant');
  photo(ctx, p12, x + pw + gap, 96 * K, pw, 92 * K, d.etiquettes.s12, 'pas de photo d’après');

  // Les quatre barres.
  d.comparatif.barres.forEach((l, i) => barre(ctx, l, (214 + i * 53) * K, x, w));

  // Légende.
  const ly = 432 * K;
  ctx.font = `400 ${10.5 * K}px ${TEXTE}`;
  [
    ['progrès', C.vert],
    ['recul', C.recul],
  ].forEach(([t, c], i) => {
    const lx = x + i * 80 * K;
    arrondi(ctx, lx, ly - 7 * K, 10 * K, 6 * K, 3 * K);
    ctx.fillStyle = c!;
    ctx.fill();
    ctx.fillStyle = C.gris;
    ctx.fillText(t!, lx + 14 * K, ly);
  });

  // Les deux tuiles.
  d.comparatif.tuiles.forEach((l, i) => tuile(ctx, l, x + i * (pw + gap), 444 * K, pw, 52 * K));

  ctx.font = `400 ${11 * K}px ${TEXTE}`;
  ctx.fillStyle = 'rgba(244,241,234,0.5)';
  ctx.fillText('Combine de départ (S0) → tests de la semaine 12', x, 524 * K);
}

/** L'image en PNG, prête à partager. */
export async function imageComparatif(d: DonneesImage): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await dessinerComparatif(canvas, d);
  return await new Promise<Blob>((ok, ko) =>
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error('image vide'))), 'image/png'),
  );
}
