import { describe, expect, it } from 'vitest';
import { RoleDistributor } from '../lib/roleDistributor';

describe('RoleDistributor.validateConfiguration', () => {
  it('rejects detective mode in 3-player games', () => {
    expect(RoleDistributor.validateConfiguration(3, 'classic', true)).toBe(
      'Detective mode requires at least 4 players',
    );
  });

  it('rejects mr white army below its supported player count', () => {
    expect(RoleDistributor.validateConfiguration(3, 'mr_white_army', false)).toBe(
      'mr white army requires 5-12 players',
    );
  });

  it('accepts a valid classic room', () => {
    expect(RoleDistributor.validateConfiguration(5, 'classic', true)).toBeNull();
  });
});
