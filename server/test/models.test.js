import { describe, expect, it } from 'vitest';
import { Group } from '../src/models/Group.js';
import { User } from '../src/models/User.js';
import { Walk } from '../src/models/Walk.js';

const asha = () => User.create({ name: 'Asha', email: 'asha@example.com', passwordHash: '$2b$04$abcdefghijklmnopqrstuv' });

describe('models', () => {
  it('never puts passwordHash in JSON', async () => {
    const json = JSON.stringify(await asha());
    expect(json).not.toContain('passwordHash');
    expect(json).not.toContain('$2b$');
  });

  it('allows one walk per person per date', async () => {
    const user = await asha();
    await Walk.create({ userId: user._id, date: '2026-10-08', quest: 'sky', checkedAt: new Date() });
    await expect(Walk.create({ userId: user._id, date: '2026-10-08', quest: 'tree', checkedAt: new Date() })).rejects.toMatchObject({ code: 11000 });
  });

  it('keeps emails (in any case) and group codes unique', async () => {
    const user = await asha();
    await expect(User.create({ name: 'Other', email: 'ASHA@example.com', passwordHash: 'x' })).rejects.toMatchObject({ code: 11000 });
    await Group.create({ name: 'Walkers', code: 'ABCDEF', createdBy: user._id });
    await expect(Group.create({ name: 'Others', code: 'ABCDEF', createdBy: user._id })).rejects.toMatchObject({ code: 11000 });
  });
});
