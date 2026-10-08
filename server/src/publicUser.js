import { Group } from './models/Group.js';

// The only shape a user is ever sent in. It never includes passwordHash.
export async function publicUser(user) {
  const group = user.groupId ? await Group.findById(user.groupId) : null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    pactDaysPerWeek: user.pactDaysPerWeek,
    group: group ? { name: group.name, code: group.code } : null,
  };
}
