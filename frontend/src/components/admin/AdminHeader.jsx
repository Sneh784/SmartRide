import { Bell, Menu, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

const labels = {dashboard:'Dashboard',vendors:'Vendor Management',pending:'Pending Vendor Approvals',approved:'Approved Vendors',rejected:'Rejected Vendors',drivers:'Driver Management',customers:'Customer Management','fleet-managers':'Fleet Manager Management',vehicles:'Vehicle Management',bookings:'Booking Management',payments:'Payment Management',kyc:'KYC Verification',reports:'Reports & Analytics',support:'Complaints & Support',notifications:'Notifications',settings:'Settings'};
export default function AdminHeader({ onOpenDrawer }) {
  const {user}=useAuth(); const location=useLocation(); const [unread,setUnread]=useState(0);
  const section=location.pathname.split('/').filter(Boolean).at(-1)||'dashboard';
  useEffect(()=>{adminApi.notifications().then(({data})=>setUnread(data.unread||0)).catch(()=>setUnread(0));},[location.pathname]);
  const initials=(user?.name||'Admin').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button onClick={onOpenDrawer} aria-label="Open admin menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={21}/></button><div><p className="truncate text-lg font-bold sm:text-xl">{labels[section]||'Administration'}</p><p className="hidden items-center gap-1 text-xs text-slate-500 sm:flex"><ShieldCheck size={13}/> SmartRide administration</p></div></div><div className="flex items-center gap-2 sm:gap-4"><Link to="/admin/notifications" aria-label={`Notifications${unread?`, ${unread} unread`:''}`} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell size={19}/>{unread>0&&<span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B00] px-1 text-[9px] font-bold text-white">{unread}</span>}</Link><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#C64D00]">{initials}</span><span className="hidden max-w-40 truncate text-sm font-semibold md:block">{user?.name||'Administrator'}</span></div></div></div></header>;
}
