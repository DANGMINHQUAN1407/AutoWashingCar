import { UserRole } from '../constants/userRoles'
import type { User } from '../context/AuthContext'

export function getUserRole(user: User | null | undefined): UserRole | null {
  if (!user) return null
  const role = user.role ?? (user as Record<string, string>).Role
  if (!role) return null
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole
  }
  return null
}

export function hasRole(user: User | null | undefined, roles: UserRole[]): boolean {
  const role = getUserRole(user)
  return role !== null && roles.includes(role)
}

export function getHomePathForRole(role: UserRole | null): string {
  switch (role) {
    case UserRole.Admin:
      return '/admin'
    case UserRole.Manager:
      return '/manager'
    case UserRole.Staff:
      return '/staff'
    case UserRole.Customer:
      return '/'
    default:
      return '/auth'
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.Admin:
      return 'Quản trị viên'
    case UserRole.Manager:
      return 'Quản lý chi nhánh'
    case UserRole.Staff:
      return 'Nhân viên vận hành'
    case UserRole.Customer:
      return 'Khách hàng'
    default:
      return 'Người dùng'
  }
}
