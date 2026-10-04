import { describe, expect, it } from 'vitest';
import {
  CAMEROON_DISTRICTS,
  CAMEROON_REGIONS,
  COUNTRIES,
  DEFAULT_COUNTRY,
  citiesOf,
  districtsOf,
  regionsOf,
} from './geo.constants';

describe('géographie', () => {
  it('le Cameroun est le pays par défaut et le premier de la liste', () => {
    expect(DEFAULT_COUNTRY).toBe('Cameroun');
    expect(COUNTRIES[0]).toBe('Cameroun');
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });

  it('le Cameroun compte ses 10 régions', () => {
    expect(regionsOf('Cameroun')).toHaveLength(10);
    expect(regionsOf('Cameroun')).toEqual(expect.arrayContaining(['Centre', 'Littoral']));
  });

  it('filtre les villes par région et les quartiers par ville', () => {
    expect(citiesOf('Cameroun', 'Centre')).toContain('Yaoundé');
    expect(citiesOf('Cameroun', 'Centre')).not.toContain('Douala');
    expect(districtsOf('Cameroun', 'Yaoundé')).toContain('Bastos');
    expect(districtsOf('Cameroun', 'Douala')).toContain('Akwa');
  });

  it('renvoie des listes vides pour une région, une ville ou un pays inconnu', () => {
    expect(citiesOf('Cameroun', 'Atlantide')).toEqual([]);
    expect(districtsOf('Cameroun', 'Nanga-Eboko')).toEqual([]);
    expect(regionsOf('France')).toEqual([]);
    expect(citiesOf('France', 'Centre')).toEqual([]);
    expect(districtsOf('France', 'Yaoundé')).toEqual([]);
  });

  it('chaque ville ayant des quartiers appartient bien à une région, sans doublon', () => {
    const allCities = Object.values(CAMEROON_REGIONS).flat();
    for (const city of Object.keys(CAMEROON_DISTRICTS)) expect(allCities).toContain(city);
    for (const list of [...Object.values(CAMEROON_REGIONS), ...Object.values(CAMEROON_DISTRICTS)])
      expect(new Set(list).size).toBe(list.length);
  });
});
