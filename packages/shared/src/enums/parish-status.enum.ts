/** Statut d'un compte dans une paroisse : fidèle < paroissien < administrateur. */
export enum ParishStatus {
  FAITHFUL = 'FAITHFUL',
  PARISHIONER = 'PARISHIONER',
  PARISH_ADMIN = 'PARISH_ADMIN',
}

/** Responsabilités d'équipe, cumulables, attribuées par l'administrateur à un paroissien. */
export enum ParishDuty {
  PREPARER = 'PREPARER',
  READER = 'READER',
  ANNOUNCER = 'ANNOUNCER',
}

/** Qui peut lire une annonce ou une activité. */
export enum ContentVisibility {
  PUBLIC = 'PUBLIC',
  MEMBERS = 'MEMBERS',
}
