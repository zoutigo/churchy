// Environnement des tests unitaires : le module de configuration exige un JWT_SECRET valide.
process.env.JWT_SECRET = 'unit-test-secret-unit-test-secret-01';
process.env.NODE_ENV = 'test';
// Poivre fixe : les tests unitaires exercent toujours le chemin poivré, quel que soit le .env local.
process.env.PIN_PEPPER = 'unit-pepper-unit-pepper-unit-pepper-01';
