import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ScrollToTop from './components/layout/ScrollToTop';
import { AuthProvider } from './context/AuthContext';
import Booking from './pages/Booking';
import BookingSuccess from './pages/BookingSuccess';
import BrowseVehicles from './pages/BrowseVehicles';
import DriverDashboard from './pages/DriverDashboard';
import DriverForm from './pages/DriverForm';
import DriverLogin from './pages/DriverLogin';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VehicleDetails from './pages/VehicleDetails';
import VendorForm from './pages/VendorForm';
import VendorRegister from './pages/VendorRegister';
import VendorApplicationSubmitted from './pages/VendorApplicationSubmitted';
import VendorLogin from './pages/VendorLogin';
import VendorLayout from './components/vendor/VendorLayout';
import VendorVehicles from './pages/vendor/VendorVehicles';
import VendorVehicleForm from './pages/vendor/VendorVehicleForm';
import { VendorBookings, VendorDocuments, VendorNotifications, VendorPayments, VendorUnavailablePage } from './pages/vendor/VendorDataPages';
import RequireVendor from './routes/RequireVendor';
import RequireDriver from './routes/RequireDriver';
import CustomerLayout from './components/customer/CustomerLayout';
import RequireCustomer from './routes/RequireCustomer';
import { CustomerBookings, CustomerDashboard as CustomerHome, CustomerKyc, CustomerNotifications, CustomerPayments, CustomerProfile, CustomerSupport, CustomerVehicleDetails, CustomerVehicles, CustomerWishlist } from './pages/customer/CustomerPages';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import RequireAdmin from './routes/RequireAdmin';
import AdminWorkspace from './pages/admin/AdminWorkspace';
import AdminDriverApplications from './pages/admin/DriverApplications';
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
            <Route path="/vendor/login" element={<VendorLogin />} />
            <Route path="/driver/login" element={<DriverLogin />} />
            <Route path="/driver/register" element={<DriverForm />} />
            <Route path="/admin/login" element={<AdminLogin />} />
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
                <Route path="profile" element={<VendorUnavailablePage />} />
                <Route path="settings" element={<VendorUnavailablePage />} />
                <Route path="support" element={<VendorUnavailablePage />} />
              </Route>
              <Route path="/vendor-dashboard" element={<Navigate to="/vendor/dashboard" replace />} />
            </Route>
            <Route element={<RequireDriver />}>
              <Route path="/driver/dashboard" element={<DriverDashboard />} />
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
