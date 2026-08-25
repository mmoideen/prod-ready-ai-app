// Role and permission model referenced by AUTH-2.
export const roles = {
  admin: ["read", "write", "manage-users"],
  viewer: ["read"],
};

export function authorize(role: keyof typeof roles, action: string): boolean {
  return roles[role]?.includes(action) ?? false;
}
