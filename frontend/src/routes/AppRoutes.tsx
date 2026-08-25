import { Routes, Route } from 'react-router-dom'
import { UserRole } from '../constants/userRoles'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import RoleRoute from '../components/routing/RoleRoute'
import MainLayout from '../layouts/MainLayout'
import { AdminLayout, CustomerLayout, ManagerLayout, StaffLayout } from '../layouts/PortalLayout'
import Home from '../pages/Home'
import Auth from '../pages/Auth'
import RoleRedirect from '../pages/RoleRedirect'
import Unauthorized from '../pages/Unauthorized'
import CustomerDashboard from '../pages/customer/CustomerDashboard'
import CustomerVehicles from '../pages/customer/CustomerVehicles'
import CustomerBookings from '../pages/customer/CustomerBookings'
import CustomerLoyalty from '../pages/customer/CustomerLoyalty'
import CustomerProfile from '../pages/customer/CustomerProfile'
import CustomerVouchers from '../pages/customer/CustomerVouchers'
import StaffDashboard from '../pages/staff/StaffDashboard'
import StaffCustomers from '../pages/staff/StaffCustomers'
import StaffVouchers from '../pages/staff/StaffVouchers'
import StaffProfile from '../pages/staff/StaffProfile'
import StaffReviews from '../pages/staff/StaffReviews'
import ManagerDashboard from '../pages/manager/ManagerDashboard'
import ManagerBranches from '../pages/manager/ManagerBranches'
import ManagerStaff from '../pages/manager/ManagerStaff'
import ManagerServices from '../pages/manager/ManagerServices'
import ManagerCustomers from '../pages/manager/ManagerCustomers'
import ManagerSlots from '../pages/manager/ManagerSlots'
import ManagerVouchers from '../pages/manager/ManagerVouchers'
import ManagerReviews from '../pages/manager/ManagerReviews'
import ManagerProfile from '../pages/manager/ManagerProfile'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsers from '../pages/admin/AdminUsers'
import AdminBranches from '../pages/admin/AdminBranches'
import AdminSettings from '../pages/admin/AdminSettings'
import AdminVouchers from '../pages/admin/AdminVouchers'
import AdminTiers from '../pages/admin/AdminTiers'
import AdminReviews from '../pages/admin/AdminReviews'
import AdminVehicleCatalogs from '../pages/admin/AdminVehicleCatalogs'
import AdminVehicleTransfers from '../pages/admin/AdminVehicleTransfers'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public zone */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="auth" element={<Auth />} />
        <Route path="reset-password" element={<Auth />} />
        <Route path="dashboard" element={<RoleRedirect />} />
        <Route path="unauthorized" element={<Unauthorized />} />
      </Route>

      {/* Customer zone */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <RoleRoute roles={[UserRole.Customer]}>
              <CustomerLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="vehicles" element={<CustomerVehicles />} />
        <Route path="bookings" element={<CustomerBookings />} />
        <Route path="loyalty" element={<CustomerLoyalty />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="vouchers" element={<CustomerVouchers />} />
      </Route>

      {/* Staff zone */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <RoleRoute roles={[UserRole.Staff]}>
              <StaffLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffDashboard />} />
        <Route path="customers" element={<StaffCustomers />} />
        <Route path="vouchers" element={<StaffVouchers />} />
        <Route path="reviews" element={<StaffReviews />} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>

      {/* Manager zone */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <RoleRoute roles={[UserRole.Manager]}>
              <ManagerLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<ManagerDashboard />} />
        <Route path="branches" element={<ManagerBranches />} />
        <Route path="staff" element={<ManagerStaff />} />
        <Route path="services" element={<ManagerServices />} />
        <Route path="slots" element={<ManagerSlots />} />
        <Route path="customers" element={<ManagerCustomers />} />
        <Route path="vouchers" element={<ManagerVouchers />} />
        <Route path="reviews" element={<ManagerReviews />} />
        <Route path="vehicle-catalogs" element={<AdminVehicleCatalogs />} />
        <Route path="profile" element={<ManagerProfile />} />
      </Route>

      {/* Admin zone */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute roles={[UserRole.Admin]}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="vehicle-transfers" element={<AdminVehicleTransfers />} />
        <Route path="tiers" element={<AdminTiers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="vouchers" element={<AdminVouchers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="vehicle-catalogs" element={<AdminVehicleCatalogs />} />
      </Route>
    </Routes>
  )
}
