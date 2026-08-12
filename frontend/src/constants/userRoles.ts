export const UserRole = {
  Admin: 'Admin',
  Staff: 'Staff',
  Manager: 'Manager',
  Customer: 'Customer',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ALL_ROLES = Object.values(UserRole)
