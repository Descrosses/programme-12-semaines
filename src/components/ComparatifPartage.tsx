/**
 * « Mon avant · après » : l'image à publier, à l'écran Combine (Guillaume,
 * 23 novembre, maquette B2 thème POWER).
 *
 * Elle compare le combine de départ (S0) aux tests de la semaine 12. Elle
 * s'ouvre dès qu'une mesure de la semaine 12 existe ; une mesure absente
 * s'écrit « non mesuré S0 / S12 ».
 *
 * Les photos : par défaut la première et la dernière photo de suivi du
 * cycle ; on peut en choisir d'autres ici, et ce choix n'est ENREGISTRÉ
 * NULLE PART — ni en base, ni dans l'export, ni en ligne. L'image est
 * dessinée dans le téléphone et part par la feuille de partage (ou se
 * télécharge) : l'appli n'envoie rien elle-même.
 */

import { useEffect, useRef, useState } from 'react';
import type { CombineRow } from '../db/db';
import { allPhotos, cycleActif } from '../db/repo';
import { programmeParId } from '../data/catalogue';
import { comparatif } from '../engine/comparatif';
import { dessinerComparatif, imageComparatif } from '../media/comparatifImage';
import styles from '../screens/Combine.module.css';

interface PhotoChoisie {
  blob: Blob;
  etiquette: string;
}

export function ComparatifPartage({ rows }: { rows: CombineRow[] }) {
  const initial = rows.find((r) => r.phase === 'initial')?.metrics ?? null;
  const final = rows.find((r) => r.phase === 'final')?.metrics ?? null;
  const donnees = comparatif(initial, final);
  const [entete, setEntete] = useState('POWER');
  const [photos, setPhotos] = useState<{ s0: PhotoChoisie | null; s12: PhotoChoisie | null }>({
    s0: null,
    s12: null,
  });
  const [statut, setStatut] = useState('');
  const apercu = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void (async () => {
      const cycle = await cycleActif();
      const p = cycle ? programmeParId(cycle.programmeId) : null;
      if (p) setEntete(`${p.nom} · ${p.dureeSemaines} semaines`);
      const liste = await allPhotos();
      const premiere = liste[0];
      const derniere = liste.length > 1 ? liste[liste.length - 1] : undefined;
      setPhotos({
        s0: premiere ? { blob: premiere.blob, etiquette: `SEMAINE ${premiere.week}` } : null,
        s12: derniere ? { blob: derniere.blob, etiquette: `SEMAINE ${derniere.week}` } : null,
      });
    })();
  }, []);

  const pret = donnees.pret;
  useEffect(() => {
    if (!pret || apercu.current === null) return;
    void dessinerComparatif(apercu.current, {
      entete,
      comparatif: donnees,
      photos: { s0: photos.s0?.blob ?? null, s12: photos.s12?.blob ?? null },
      etiquettes: {
        s0: photos.s0?.etiquette ?? 'SEMAINE 0',
        s12: photos.s12?.etiquette ?? 'SEMAINE 12',
      },
    });
    // `donnees` se recalcule à chaque rendu ; `rows` suffit à le suivre.
  }, [pret, entete, photos, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const choisir = (quelle: 's0' | 's12') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotos((p) => ({
      ...p,
      [quelle]: { blob: f, etiquette: quelle === 's0' ? 'SEMAINE 0' : 'SEMAINE 12' },
    }));
    e.target.value = '';
  };

  async function partager() {
    setStatut('');
    const blob = await imageComparatif({
      entete,
      comparatif: donnees,
      photos: { s0: photos.s0?.blob ?? null, s12: photos.s12?.blob ?? null },
      etiquettes: {
        s0: photos.s0?.etiquette ?? 'SEMAINE 0',
        s12: photos.s12?.etiquette ?? 'SEMAINE 12',
      },
    });
    const fichier = new File([blob], 'majk-avant-apres.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: 'Mon avant · après' });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fichier.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setStatut('Image enregistrée dans tes téléchargements.');
  }

  return (
    <section className={styles.card} aria-label="Mon avant · après">
      <h2 className={styles.cardTitle}>Mon avant · après</h2>
      {!pret ? (
        <p className={styles.cardSub}>
          Disponible après les tests de la semaine 12 : l’image compare ton combine de départ à tes
          tests finaux, prête à publier.
        </p>
      ) : (
        <>
          <p className={styles.cardSub}>
            Ton combine de départ face à tes tests de la semaine 12. Vert : progrès, rouge : recul.
            Les photos choisies ici ne sont enregistrées nulle part.
          </p>
          <canvas ref={apercu} className={styles.comparatifApercu} aria-label="Aperçu de l’image" />
          <div className={styles.comparatifPhotos}>
            <label className={styles.comparatifBouton}>
              Photo d’avant
              <input type="file" accept="image/*" onChange={choisir('s0')} hidden />
            </label>
            <label className={styles.comparatifBouton}>
              Photo d’après
              <input type="file" accept="image/*" onChange={choisir('s12')} hidden />
            </label>
          </div>
          <button
            type="button"
            className={styles.comparatifPartager}
            onClick={() => void partager()}
          >
            Partager l’image
          </button>
          {statut && (
            <p className={styles.cardSub} role="status">
              {statut}
            </p>
          )}
        </>
      )}
    </section>
  );
}
