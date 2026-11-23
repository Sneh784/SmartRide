import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ScrollToTop from './components/layout/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import Booking from './pages/Booking';
import BookingSuccess from './pages/BookingSuccess';
import BrowseVehicles from './pages/BrowseVehicles';
import DriverDashboard from './driver/pages/DriverDashboard';
import DriverForm from './driver/pages/DriverForm';
import DriverLayout from './driver/components/DriverLayout';
import AssignedBookingsPage from './driver/pages/AssignedBookingsPage';
import ActiveTripsPage from './driver/pages/ActiveTripsPage';
import TripHistoryPage from './driver/pages/TripHistoryPage';
import DriverEarningsPage from './driver/pages/DriverEarningsPage';
import DriverAvailabilityPage from './driver/pages/DriverAvailabilityPage';
import DriverDocumentsPage from './driver/pages/DriverDocumentsPage';
import DriverNotificationsPage from './driver/pages/DriverNotificationsPage';
import DriverProfilePage from './driver/pages/DriverProfilePage';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VehicleDetails from './pages/VehicleDetails';
import VendorForm from './pages/VendorForm';
import VendorRegister from './pages/VendorRegister';
import VendorApplicationSubmitted from './pages/VendorApplicationSubmitted';

import VendorLayout from './components/vendor/VendorLayout';
import VendorVehicles from './pages/vendor/VendorVehicles';
import VendorVehicleForm from './pages/vendor/VendorVehicleForm';
import { VendorBookings, VendorDocuments, VendorNotifications, VendorPayments, VendorProfile, VendorUnavailablePage } from './pages/vendor/VendorDataPages';
import RequireVendor from './routes/RequireVendor';
import RequireDriver from './driver/routes/RequireDriver';
import RequireFleetManager from './routes/RequireFleetManager';
import FleetManagerLogin from './pages/fleetManager/FleetManagerLogin';
import FleetManagerLayout from './components/fleetManager/FleetManagerLayout';
import FleetManagerWorkspace from './pages/fleetManager/FleetManagerWorkspace';
import CustomerLayout from './components/customer/CustomerLayout';
import RequireCustomer from './routes/RequireCustomer';
import { CustomerBookings, CustomerDashboard as CustomerHome, CustomerKyc, CustomerNotifications, CustomerPayments, CustomerProfile, CustomerSupport, CustomerVehicleDetails, CustomerVehicles, CustomerWishlist } from './pages/customer/CustomerPages';

import AdminLayout from './components/admin/AdminLayout';
import RequireAdmin from './routes/RequireAdmin';
import AdminWorkspace from './pages/admin/AdminWorkspace';
import AdminDriverApplications from './pages/admin/DriverApplications';
import AdminFleetManagerAccess from './pages/admin/AdminFleetManagerAccess';
import { ToastProvider } from './components/ui/ToastProvider';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/vendor/register" element={<VendorRegister />} />
            <Route path="/vendor/application-submitted" element={<VendorApplicationSubmitted />} />
                      
            <Route path="/driver/register" element={<DriverForm />} />
            <Route path="/fleet-manager/login" element={<FleetManagerLogin />} />
           
            <Route path="/vehicles" element={<BrowseVehicles />} />
            <Route path="/vehicles/:id" element={<VehicleDetails />} />
            <Route path="/my-bookings" element={<Navigate to="/customer/bookings" replace />} />
            <Route path="/customer-dashboard" element={<Navigate to="/customer/dashboard" replace />} />
            <Route element={<RequireCustomer />}>
              <Route path="/booking" element={<Booking />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              <Route path="/customer" element={<CustomerLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<CustomerHome />} />
                <Route path="vehicles" element={<CustomerVehicles />} />
                <Route path="vehicles/:vehicleId" element={<CustomerVehicleDetails />} />
                <Route path="bookings" element={<CustomerBookings />} />
                <Route path="active-rentals" element={<CustomerBookings mode="active" />} />
                <Route path="booking-history" element={<CustomerBookings mode="history" />} />
                <Route path="wishlist" element={<CustomerWishlist />} />
                <Route path="payments" element={<CustomerPayments />} />
                <Route path="kyc" element={<CustomerKyc />} />
                <Route path="notifications" element={<CustomerNotifications />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="support" element={<CustomerSupport />} />
              </Route>
            </Route>
            <Route element={<RequireVendor />}>
              <Route path="/vendor" element={<VendorLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<VendorForm />} />
                <Route path="vehicles" element={<VendorVehicles />} />
                <Route path="vehicles/add" element={<VendorVehicleForm />} />
                <Route path="vehicles/edit/:id" element={<VendorVehicleForm />} />
                <Route path="vehicle-approval" element={<VendorVehicles approvalsOnly />} />
                <Route path="bookings/requests" element={<VendorBookings mode="requests" />} />
                <Route path="bookings/confirmed" element={<VendorBookings mode="confirmed" />} />
                <Route path="active-rentals" element={<VendorBookings mode="active" />} />
                <Route path="booking-history" element={<VendorBookings mode="history" />} />
                <Route path="earnings" element={<VendorPayments earnings />} />
                <Route path="payments" element={<VendorPayments />} />
                <Route path="payout-history" element={<VendorUnavailablePage />} />
                <Route path="reviews" element={<VendorUnavailablePage />} />
                <Route path="documents" element={<VendorDocuments />} />
                <Route path="notifications" element={<VendorNotifications />} />
                <Route path="profile" element={<VendorProfile />} />
                <Route path="settings" element={<VendorUnavailablePage />} />
                <Route path="support" element={<VendorUnavailablePage />} />
              </Route>
              <Route path="/vendor-dashboard" element={<Navigate to="/vendor/dashboard" replace />} />
            </Route>
            <Route element={<RequireFleetManager />}>
              <Route path="/fleet-manager" element={<FleetManagerLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FleetManagerWorkspace />} />
                <Route path="vehicles" element={<FleetManagerWorkspace />} />
                <Route path="vehicle-assignments" element={<FleetManagerWorkspace />} />
                <Route path="trip-dispatch" element={<FleetManagerWorkspace />} />
                <Route path="drivers" element={<FleetManagerWorkspace />} />
                <Route path="availability" element={<FleetManagerWorkspace />} />
                <Route path="active-rentals" element={<FleetManagerWorkspace />} />
                <Route path="maintenance/schedule" element={<FleetManagerWorkspace />} />
                <Route path="maintenance/requests" element={<FleetManagerWorkspace />} />
                <Route path="maintenance/history" element={<FleetManagerWorkspace />} />
                <Route path="utilization" element={<FleetManagerWorkspace />} />
                <Route path="reports" element={<FleetManagerWorkspace />} />
                <Route path="analytics" element={<FleetManagerWorkspace />} />
                <Route path="notifications" element={<FleetManagerWorkspace />} />
                <Route path="profile" element={<FleetManagerWorkspace />} />
                <Route path="settings" element={<FleetManagerWorkspace />} />
              </Route>
            </Route>
            <Route element={<RequireDriver />}>
              <Route path="/driver" element={<DriverLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DriverDashboard />} />
                <Route path="assigned-bookings" element={<AssignedBookingsPage />} />
                <Route path="active-trips" element={<ActiveTripsPage />} />
                <Route path="trip-history" element={<TripHistoryPage />} />
                <Route path="earnings" element={<DriverEarningsPage />} />
                <Route path="availability" element={<DriverAvailabilityPage />} />
                <Route path="documents" element={<DriverDocumentsPage />} />
                <Route path="notifications" element={<DriverNotificationsPage />} />
                <Route path="profile" element={<DriverProfilePage />} />
              </Route>
              <Route path="/driver-dashboard" element={<Navigate to="/driver/dashboard" replace />} />
            </Route>
            <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminWorkspace />} />
                <Route path="vendors" element={<AdminWorkspace />} />
                <Route path="vendors/:status" element={<AdminWorkspace />} />
                <Route path="drivers" element={<AdminDriverApplications />} />
                <Route path="customers" element={<AdminWorkspace />} />
                <Route path="fleet-managers" element={<AdminWorkspace />} />
                <Route path="fleet-manager-access" element={<AdminFleetManagerAccess />} />
                <Route path="vehicles" element={<AdminWorkspace />} />
                <Route path="bookings" element={<AdminWorkspace />} />
                <Route path="payments" element={<AdminWorkspace />} />
                <Route path="kyc" element={<AdminWorkspace />} />
                <Route path="reports" element={<AdminWorkspace />} />
                <Route path="support" element={<AdminWorkspace />} />
                <Route path="notifications" element={<AdminWorkspace />} />
                <Route path="settings" element={<AdminWorkspace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
