import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { demarrerSauvegardeAuto } from './cloud/sauvegarde';
import { hydraterProgrammesImportes } from './db/programmesImportes';
import './styles/global.css';

/**
 * Les programmes importés (ME, MYSELF & I) sont lus AVANT le premier écran :
 * le catalogue et le registre les cherchent de façon synchrone, en mémoire.
 *
 * La garde de 3 s empêche une base lente de bloquer l'ouverture. Dans ce cas
 * l'application démarre quand même ; la mémoire se remplit dès que la lecture
 * aboutit. Elle ne lève jamais : POWER, MASS et FEMMES n'en dépendent pas.
 */
const GARDE_MS = 3000;

async function demarrer(): Promise<void> {
  await Promise.race([
    hydraterProgrammesImportes(),
    new Promise<void>((fin) => setTimeout(fin, GARDE_MS)),
  ]);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Compte en ligne (facultatif) : envoi dû à l'ouverture, et au retour du réseau.
  demarrerSauvegardeAuto();
}

void demarrer();
