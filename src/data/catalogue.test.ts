/**
 * Les garde-fous du catalogue.
 *
 * Ce ne sont pas des tests d'affichage : ce sont les règles que Guillaume a
 * posées et qu'une bonne intention suffirait à enfreindre. « Ne présente pas
 * un programme non développé comme disponible », « ne crée pas de faux
 * programmes pour remplir le catalogue », « n'invente pas les objectifs de la
 * famille Femmes ». Un test les rend vérifiables.
 */

import { describe, expect, it } from 'vitest';
import {
  FAMILLES,
  PROGRAMME_PAR_DEFAUT,
  familleParId,
  programmeParId,
  programmesDisponibles,
  tousLesProgrammes,
} from './catalogue';
import { DUREE_SEMAINES } from './types';

describe('catalogue Dcross-fit', () => {
  it('ne déclare disponible que ce qui est réellement jouable', () => {
    /*
     * Si ce test casse en ajoutant un programme, la question à se poser n'est
     * pas « comment le faire passer » mais « ce programme se joue-t-il
     * vraiment du début à la fin dans cette application ».
     */
    expect(programmesDisponibles().map((p) => p.id)).toEqual(['power12', 'mass4']);
  });

  it('fait correspondre le programme par défaut à la durée du moteur', () => {
    const defaut = programmeParId(PROGRAMME_PAR_DEFAUT);
    expect(defaut).not.toBeNull();
    expect(defaut?.dureeSemaines).toBe(DUREE_SEMAINES);
  });

  it('couvre les quatre familles prévues, et aucune autre', () => {
    expect(FAMILLES.map((f) => f.id)).toEqual(['power', 'mass', 'femmes', 'perso']);
  });

  /*
   * Ce test interdisait tout programme dans la famille Femmes. Il avait
   * raison tant qu'il n'y en avait aucun : la règle est de ne rien INVENTER.
   *
   * FEMMES 8 n'est pas inventé — il est porté depuis une base écrite hors de
   * ce dépôt, phase par phase et exercice par exercice. Ce que le test
   * vérifie désormais, c'est que le contenu est bien LÀ et complet : trois
   * phases, trente séances. Un programme déclaré sans son contenu ferait
   * tomber `femmes.test.ts`, qui compte les séances une à une.
   */
  it('ouvre le parcours FEMMES par FEMMES 8, le seul dont le contenu est écrit', () => {
    const programmes = familleParId('femmes')?.programmes ?? [];
    expect(programmes[0]?.id).toBe('femmes8');
    expect(programmes[0]?.dureeSemaines).toBe(8);
    // Les sept étapes suivantes n'ont aucune séance : toutes « à venir ».
    for (const p of programmes) expect(p.statut, p.id).toBe('a-venir');
  });

  /*
   * PERSONNALISÉ reste vide par nature, pas en attendant mieux : son contenu
   * vient de la personne. Écrire un programme dedans serait un contresens, et
   * ce test est là pour que personne ne le fasse « pour meubler ».
   */
  it('n’écrit aucun programme dans la famille Personnalisé', () => {
    expect(familleParId('perso')?.programmes).toEqual([]);
  });

  /*
   * La règle d'origine : un programme `a-venir` n'a ni objectifs ni
   * prérequis, parce qu'on ne décrit pas ce qui n'est pas écrit.
   *
   * FEMMES 8 est l'exception, et elle est nommée. Son contenu EXISTE — les
   * trois phases et les trente séances sont dans `src/data/femmes/` — ce
   * qui manque, ce sont les écrans capables d'afficher un circuit en tours.
   * Ses objectifs décrivent donc quelque chose de réel.
   *
   * Tout autre programme `a-venir` reste tenu à la règle : un seul
   * identifiant est exempté, pas un statut.
   */
  const CONTENU_ECRIT_SANS_ECRAN = ['femmes8'];

  it('ne donne ni objectifs ni prérequis à un programme qui n’existe pas', () => {
    for (const p of tousLesProgrammes()) {
      if (p.statut === 'disponible') continue;
      if (CONTENU_ECRIT_SANS_ECRAN.includes(p.id)) continue;
      expect({ id: p.id, objectifs: p.objectifs.length }).toEqual({ id: p.id, objectifs: 0 });
      expect({ id: p.id, prerequis: p.prerequis.length }).toEqual({ id: p.id, prerequis: 0 });
    }
  });

  it('l’exemption ne couvre que les programmes dont le contenu est écrit', () => {
    // Si quelqu'un ajoute un identifiant ici sans écrire le programme, ce
    // test ne le verra pas — mais `femmes.test.ts` comptera ses séances.
    for (const id of CONTENU_ECRIT_SANS_ECRAN) {
      const p = tousLesProgrammes().find((x) => x.id === id);
      expect(p, `${id} exempté mais absent du catalogue`).toBeDefined();
      expect(p?.statut, `${id} exempté alors qu'il est disponible`).toBe('a-venir');
    }
  });

  /*
   * L'aperçu ouvre des écrans réels, donc il n'a de sens que pour un
   * programme dont ces écrans existent. Et il ne doit JAMAIS être un
   * démarrage : seule une ancre de lecture est acceptée, pas une action.
   */
  it('n’ouvre un aperçu que pour un programme dont les écrans existent', () => {
    for (const p of tousLesProgrammes()) {
      if (p.apercu === undefined) continue;
      expect(CONTENU_ECRIT_SANS_ECRAN, `${p.id} : aperçu sans écran`).toContain(p.id);
      expect(p.apercu.startsWith('#/femmes/'), `${p.id} : aperçu hors FEMMES`).toBe(true);
    }
    expect(tousLesProgrammes().find((p) => p.id === 'femmes8')?.apercu).toBeDefined();
  });

  it('donne un identifiant unique à chaque programme', () => {
    const ids = tousLesProgrammes().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('range chaque programme dans la famille qui le porte', () => {
    for (const famille of FAMILLES) {
      for (const p of famille.programmes) {
        expect({ id: p.id, famille: p.familleId }).toEqual({ id: p.id, famille: famille.id });
      }
    }
  });

  it('rend `null` pour un identifiant inconnu, sans rien inventer', () => {
    expect(programmeParId('power99')).toBeNull();
    expect(familleParId('crossfit' as never)).toBeNull();
  });
});
