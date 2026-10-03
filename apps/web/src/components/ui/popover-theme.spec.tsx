import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import tailwind from '../../../tailwind.config';
import { Select, SelectContent, SelectItem } from './select';

/** Non-régression : sans la couleur `popover`, `bg-popover` ne génère rien et les listes sont transparentes. */
describe('thème des listes déroulantes et menus', () => {
  const colors = (tailwind.theme?.extend?.colors ?? {}) as Record<string, unknown>;

  it('déclare la couleur popover (fond opaque des listes)', () => {
    expect(colors.popover).toEqual({
      DEFAULT: 'hsl(var(--popover))',
      foreground: 'hsl(var(--popover-foreground))',
    });
  });

  it('le contenu d’une liste utilise un fond popover et ne force plus la hauteur du déclencheur', () => {
    render(
      <Select open value="a">
        <SelectContent data-testid="content">
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    const content = screen.getByTestId('content');
    expect(content.className).toContain('bg-popover');
    expect(content.innerHTML).not.toContain('radix-select-trigger-height');
  });
});
