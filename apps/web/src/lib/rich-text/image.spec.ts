import { describe, expect, it } from 'vitest';
import { fitSize, imageFileToDataUrl, isSupportedImage } from './image';

describe('fitSize', () => {
  it('réduit en gardant les proportions', () => {
    expect(fitSize(4000, 2000)).toEqual({ width: 1280, height: 640 });
    expect(fitSize(1000, 3000, 1500)).toEqual({ width: 500, height: 1500 });
  });
  it('n’agrandit jamais', () => {
    expect(fitSize(300, 200)).toEqual({ width: 300, height: 200 });
  });
});

describe('imageFileToDataUrl', () => {
  it('reconnaît les formats pris en charge', () => {
    expect(isSupportedImage({ type: 'image/png' })).toBe(true);
    expect(isSupportedImage({ type: 'image/svg+xml' })).toBe(false);
    expect(isSupportedImage({ type: 'application/pdf' })).toBe(false);
  });
  it('refuse un format non pris en charge avec un message clair', async () => {
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' });
    await expect(imageFileToDataUrl(svg)).rejects.toThrow('Format non pris en charge');
  });
  it('garde un petit GIF tel quel', async () => {
    const gif = new File([new Uint8Array([71, 73, 70, 56, 57, 97])], 'a.gif', {
      type: 'image/gif',
    });
    await expect(imageFileToDataUrl(gif)).resolves.toMatch(/^data:image\/gif;base64,/);
  });
});
