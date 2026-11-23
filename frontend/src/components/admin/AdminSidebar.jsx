import {
  Bell, Building2, CarFront, ChartNoAxesCombined, ChevronLeft, ChevronRight, CircleHelp,
  CreditCard, FileCheck2, LayoutDashboard, LogOut, ReceiptText, Settings, ShieldCheck,
  UserRound, Users, X,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';

const items = [
  ['Dashboard','/admin/dashboard',LayoutDashboard],['Vendor Management','/admin/vendors',Building2],
  ['Pending Vendor Approvals','/admin/vendors/pending',FileCheck2],
  ['Approved Vendors','/admin/vendors/approved',Building2],['Rejected Vendors','/admin/vendors/rejected',Building2],
  ['Driver Management','/admin/drivers',CarFront],['Customer Management','/admin/customers',Users],
  ['Fleet Managers','/admin/fleet-managers',UserRound],['Fleet Manager Access','/admin/fleet-manager-access',ShieldCheck],
  ['Vehicle Management','/admin/vehicles',CarFront],
  ['Booking Management','/admin/bookings',ReceiptText],['Payment Management','/admin/payments',CreditCard],
  ['KYC Verification','/admin/kyc',FileCheck2],['Reports & Analytics','/admin/reports',ChartNoAxesCombined],
  ['Complaints & Support','/admin/support',CircleHelp],['Notifications','/admin/notifications',Bell],
  ['Settings','/admin/settings',Settings],
];

export default function AdminSidebar({ collapsed, drawerOpen, onClose, onToggleCollapse }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingVendors, setPendingVendors] = useState(0);
  useEffect(() => {
    const refresh = () => adminApi.vendorApplications({ status: 'PENDING', page: 0, size: 1 })
      .then(({ data }) => setPendingVendors(data.totalElements || 0))
      .catch(() => setPendingVendors(0));
    refresh();
    window.addEventListener('vendor-applications-updated', refresh);
    return () => window.removeEventListener('vendor-applications-updated', refresh);
  }, [location.pathname]);
  const exit = () => { logout(); navigate('/', { replace: true }); };
  return <>
    {drawerOpen && <button aria-label="Close admin navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-all duration-200 lg:translate-x-0 lg:shadow-none ${collapsed?'lg:w-[88px]':'lg:w-[260px]'} ${drawerOpen?'translate-x-0':'-translate-x-full'}`}>
      <div className={`flex h-12 items-center ${collapsed?'lg:justify-center':'justify-between'}`}>
        <NavLink to="/admin/dashboard" onClick={onClose} className="flex items-center gap-3 overflow-hidden"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#172033] text-white"><CarFront size={22}/></span><span className={`whitespace-nowrap text-xl font-extrabold ${collapsed?'lg:hidden':''}`}>Smart<span className="text-[#FF6B00]">Ride</span></span></NavLink>
        <button onClick={onClose} aria-label="Close admin navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={19}/></button>
      </div>
      <p className={`mb-3 mt-8 px-3 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400 ${collapsed?'lg:hidden':''}`}>Administration</p>
      <nav aria-label="Admin navigation" className="flex-1 space-y-1 overflow-y-auto">{items.map(([label,to,Icon])=><NavLink key={to} to={to} end={to==='/admin/dashboard'||to==='/admin/vendors'||to.includes('/vendors/')} onClick={onClose} title={collapsed?label:undefined} className={({isActive})=>`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive?'bg-[#FF6B00] text-white shadow-sm':'text-slate-600 hover:bg-orange-50 hover:text-[#E85D00]'} ${collapsed?'lg:justify-center lg:px-0':''}`}><Icon size={19} className="shrink-0"/><span className={`min-w-0 flex-1 ${collapsed?'lg:hidden':''}`}>{label}</span>{to.endsWith('/pending')&&pendingVendors>0&&<span className={`rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ${collapsed?'lg:hidden':''}`}>{pendingVendors}</span>}</NavLink>)}</nav>
      <button onClick={exit} title={collapsed?'Log out':undefined} className={`mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 ${collapsed?'lg:justify-center lg:px-0':''}`}><LogOut size={19}/><span className={collapsed?'lg:hidden':''}>Log out</span></button>
      <button onClick={onToggleCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} className="absolute -right-3 top-24 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:flex">{collapsed?<ChevronRight size={16}/>:<ChevronLeft size={16}/>}</button>
    </aside>
  </>;
}
