import { describe, expect, it } from 'vitest';
import {
  formatDateLong,
  formatDateParts,
  formatDateShort,
  formatTime,
  placeLabel,
  telHref,
} from './format';

const UTC = { timeZone: 'UTC' };
const iso = '2026-10-04T08:30:00.000Z';

describe('format', () => {
  it('formate la date longue en français', () => {
    expect(formatDateLong(iso, UTC)).toBe('dimanche 4 octobre 2026');
  });

  it('formate l’heure sur 24 h', () => {
    expect(formatTime(iso, UTC)).toBe('08:30');
    expect(formatTime('2026-10-04T17:05:00.000Z', UTC)).toBe('17:05');
  });

  it('applique le fuseau demandé', () => {
    expect(formatTime(iso, { timeZone: 'Asia/Tokyo' })).toBe('17:30');
  });

  it('formate la date courte et les éléments du bloc-date', () => {
    expect(formatDateShort(iso, UTC)).toMatch(/dim\.? 4 oct/);
    expect(formatDateParts(iso, UTC)).toEqual({ weekday: 'dim.', day: '4', month: 'oct.' });
  });

  it('placeLabel ajoute le quartier quand il est connu', () => {
    expect(placeLabel({ city: 'Lyon' })).toBe('Lyon');
    expect(placeLabel({ city: 'Lyon', district: null })).toBe('Lyon');
    expect(placeLabel({ city: 'Lyon', district: 'Croix-Rousse' })).toBe('Croix-Rousse, Lyon');
  });

  it('telHref ne garde que les chiffres et le +', () => {
    expect(telHref('+33 (0)4 00-00.00 00')).toBe('tel:+330400000000');
  });
});
