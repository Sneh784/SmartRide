import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowDownToLine, CalendarDays, CarFront, CircleAlert, CreditCard, FileCheck2, LoaderCircle, Search, ShieldCheck, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';

const read = (row, key) => row?.[key] ?? row?.[key.toLowerCase()] ?? row?.[key.replace(/[A-Z]/g,(c)=>`_${c.toLowerCase()}`)];
const cash = (value) => new Intl.NumberFormat(undefined,{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0);
const when = (value) => value ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';

function useLoad(loader,deps=[]){
  const [state,setState]=useState({data:null,loading:true,error:''});
  // The hook's call sites pass stable API loaders or explicit dependency arrays.
  // eslint-disable-next-line react/use-memo, react-hooks/exhaustive-deps
  const reload=useCallback(async()=>{setState(v=>({...v,loading:true,error:''}));try{const {data}=await loader();setState({data,loading:false,error:''});}catch(e){setState({data:null,loading:false,error:e?.response?.data?.detail||e?.response?.data?.message||'Could not load records.'});}},deps);
  useEffect(()=>{reload();},[reload]); return {...state,reload};
}

function Heading({title,subtitle,children}){return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#D95400]">SmartRide administration</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>{subtitle&&<p className="mt-2 text-sm text-slate-500">{subtitle}</p>}</div>{children}</div>;}
function Banner({error,onRetry}){return error?<div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex items-center gap-2"><CircleAlert size={17}/>{error}</span>{onRetry&&<button onClick={onRetry} className="font-bold underline">Retry</button>}</div>:null;}
function Loading(){return <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={19}/>Loading records…</div>;}
function Empty({label='No records found'}){return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{label}</div>;}
function Status({value}){const status=String(value||'UNKNOWN').replaceAll('_',' ');const tone=/APPROVED|ACTIVE|VERIFIED|RESOLVED|COMPLETED|SUCCESS/i.test(status)?'bg-emerald-50 text-emerald-700':/REJECT|SUSPEND|CANCEL|FAIL/i.test(status)?'bg-red-50 text-red-700':/PENDING|OPEN|PROGRESS/i.test(status)?'bg-orange-50 text-orange-700':'bg-slate-100 text-slate-600';return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{status}</span>;}
function Table({columns,rows,renderActions}){if(!rows?.length)return <Empty/>;return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key,label])=><th key={key} className="px-4 py-3 font-bold">{label}</th>)}{renderActions&&<th className="px-4 py-3 font-bold">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row,index)=><tr key={read(row,'id')??read(row,'transaction_id')??index} className="align-top hover:bg-slate-50/70">{columns.map(([key])=><td key={key} className="px-4 py-3 text-slate-700">{key==='status'?<Status value={read(row,key)}/>:key==='amount'||key==='revenue'?cash(read(row,key)):key==='submittedAt'||key.endsWith('at')||key.endsWith('_date')||key==='created_at'?when(read(row,key)):String(read(row,key)??'—')}</td>)}{renderActions&&<td className="px-4 py-3">{renderActions(row)}</td>}</tr>)}</tbody></table></div>;}
function SearchFilter({search,setSearch,status,setStatus,statuses}){return <div className="flex flex-col gap-2 sm:flex-row"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search size={17} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records" className="w-full min-w-40 text-sm outline-none"/></label><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></div>;}
function ReasonModal({item,onClose,onConfirm}){const [reason,setReason]=useState('');return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={e=>{e.preventDefault();onConfirm(reason);}} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Reject {item}</h2><p className="mt-1 text-sm text-slate-500">A reason is required and will be recorded in the admin audit log.</p><textarea required minLength={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} rows={4} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#FF6B00]" placeholder="Explain why this request is rejected"/><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Confirm rejection</button></div></form></div>;}

function RevenueChart({items}){const data=[...(items||[])].reverse();const max=Math.max(...data.map(x=>Number(read(x,'revenue'))||0),1);return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center gap-2"><Activity size={18} className="text-[#E85D00]"/><h2 className="font-bold">Revenue analytics</h2></div>{!data.length?<Empty label="No successful payment records for this period."/>:<div className="flex h-48 items-end gap-2 overflow-x-auto border-b border-slate-100 pb-2">{data.map((point,index)=>{const value=Number(read(point,'revenue'))||0;return <div key={String(read(point,'period'))+index} title={`${when(read(point,'period'))}: ${cash(value)}`} className="flex h-full min-w-8 flex-1 flex-col justify-end"><div className="min-h-1 rounded-t-md bg-[#FF6B00] hover:bg-[#E85D00]" style={{height:`${Math.max(3,value/max*88)}%`}}/><span className="mt-2 truncate text-center text-[9px] text-slate-400">{new Date(read(point,'period')).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span></div>;})}</div>}<p className="mt-3 text-xs text-slate-400">Revenue includes recorded successful payments only.</p></div>;}

function PendingVendorRequests() {
  const { data, loading, error, reload } = useLoad(
    () => adminApi.vendorApplications({ status: 'PENDING', page: 0, size: 5 }),
  );
  const rows = read(data, 'items') || [];
  const total = read(data, 'totalElements') || 0;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Pending vendor approvals</h2>
          <p className="mt-1 text-sm text-slate-500">{total} application{total === 1 ? '' : 's'} waiting for review</p>
        </div>
        <Link to="/admin/vendors/pending" className="whitespace-nowrap rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#B54700] hover:bg-orange-100">
          View all
        </Link>
      </div>
      <Banner error={error} onRetry={reload} />
      {loading ? <Loading /> : rows.length ? (
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <Link key={read(row, 'id')} to="/admin/vendors/pending" className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-900">{read(row, 'fullName')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{read(row, 'businessName')} · {read(row, 'email')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Status value={read(row, 'status')} />
                <span className="text-xs text-slate-400">{when(read(row, 'submittedAt'))}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : <Empty label="No pending vendor applications." />}
    </section>
  );
}

function AdminDashboardPage(){const[period,setPeriod]=useState('month');const{data,loading,error,reload}=useLoad(()=>adminApi.dashboard(period),[period]);if(loading)return <Loading/>;const stats=read(data,'statistics')||{};const cards=[['Total customers',read(stats,'customers'),Users],['Total vendors',read(stats,'vendors'),ShieldCheck],['Total drivers',read(stats,'drivers'),CarFront],['Fleet managers',read(stats,'fleet_managers'),Users],['Total vehicles',read(stats,'vehicles'),CarFront],['Pending approvals',read(stats,'pending_approvals'),FileCheck2],['Total bookings',read(stats,'bookings'),CalendarDays],['Recorded revenue',cash(read(stats,'revenue')),CreditCard]];const bookingStats=[['Pending',read(stats,'pending_bookings')],['Active',read(stats,'active_bookings')],['Completed',read(stats,'completed_bookings')],['Cancelled',read(stats,'cancelled_bookings')]];return <><Heading title="Admin dashboard" subtitle="Live overview from SmartRide accounts, bookings and payment records."><select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></select></Heading><Banner error={error} onRetry={reload}/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#D95400]"><Icon size={20}/></span></div><p className="mt-4 text-2xl font-extrabold">{value??0}</p></article>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.9fr]"><RevenueChart items={read(data,'revenue')}/><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">Booking analytics</h2><div className="space-y-3">{bookingStats.map(([label,value])=><div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">{label} bookings</span><span className="font-extrabold">{value??0}</span></div>)}</div></section></div><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">Recent activity</h2>{read(data,'activities')?.length?<div className="divide-y divide-slate-100">{read(data,'activities').map((item,index)=><div key={`${read(item,'type')}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{read(item,'title')}</p><p className="text-xs text-slate-500">{read(item,'description')}</p></div><div className="flex items-center gap-3"><Status value={read(item,'type')}/><span className="text-xs text-slate-400">{when(read(item,'occurred_at'))}</span></div></div>)}</div>:<Empty label="No recent account, booking or payment activity."/>}</section></>;}

function AdminUserManagement({role,title}){const[search,setSearch]=useState('');const[status,setStatus]=useState('');const{data,loading,error,reload}=useLoad(()=>adminApi.users(role,{search,status}),[role,search,status]);const[reject,setReject]=useState(null);const[actionError,setActionError]=useState('');const act=async(row,next,reason)=>{try{await adminApi.setUserStatus(role,read(row,'id'),{status:next,reason});setReject(null);setActionError('');await reload();}catch(e){setActionError(e?.response?.data?.detail||'Could not update account status.');}};const roleStatuses=role==='customers'?['ACTIVE','SUSPENDED']:['PENDING','APPROVED','REJECTED','SUSPENDED'];const actions=(row)=>{const current=String(read(row,'status')||'').toUpperCase();const approve=role==='customers'?'ACTIVE':'APPROVED';return <div className="flex min-w-48 flex-wrap gap-2">{(current==='PENDING'||current==='REJECTED'||current==='SUSPENDED')&&<button onClick={()=>act(row,approve)} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">{current==='PENDING'?'Approve':'Activate'}</button>}{current==='PENDING'&&<button onClick={()=>setReject(row)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Reject</button>}{(current==='APPROVED'||current==='ACTIVE')&&<button onClick={()=>act(row,'SUSPENDED')} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">Suspend</button>}</div>;};return <><Heading title={title} subtitle="Review account details and apply audited status changes."><SearchFilter search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={roleStatuses}/></Heading><Banner error={error||actionError} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["id","ID"],["name","Name"],["email","Email"],["phone","Phone"],["status","Status"],["created_at","Created"]]} renderActions={actions}/ >}{reject&&<ReasonModal item={read(reject,'name')||'account'} onClose={()=>setReject(null)} onConfirm={(reason)=>act(reject,'REJECTED',reason)}/>}</>;}

function AdminVehicles(){const[search,setSearch]=useState('');const[status,setStatus]=useState('');const{data,loading,error,reload}=useLoad(()=>adminApi.vehicles({search,status}),[search,status]);const[reject,setReject]=useState(null);const[actionError,setActionError]=useState('');const act=async(row,next,reason)=>{try{await adminApi.setVehicleStatus(read(row,'id'),{status:next,reason});setReject(null);setActionError('');await reload();}catch(e){setActionError(e?.response?.data?.detail||'Could not update vehicle.');}};const actions=(row)=>{const s=String(read(row,'approval_status')||'PENDING').toUpperCase();return <div className="flex min-w-44 flex-wrap gap-2">{s!=='APPROVED'&&<button onClick={()=>act(row,'APPROVED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Approve / activate</button>}{s==='PENDING'&&<button onClick={()=>setReject(row)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Reject</button>}{s==='APPROVED'&&<button onClick={()=>act(row,'SUSPENDED')} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold">Suspend</button>}</div>;};return <><Heading title="Vehicle Management" subtitle="Only approved and available listings are included in customer browsing."><SearchFilter search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['PENDING','APPROVED','REJECTED','SUSPENDED']}/></Heading><Banner error={error||actionError} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["id","ID"],["title","Vehicle"],["brand","Brand"],["category","Category"],["city","City"],["daily_rate","Daily rate"],["approval_status","Approval"],["availability_status","Availability"]]} renderActions={actions}/ >}{reject&&<ReasonModal item={read(reject,'title')||'vehicle'} onClose={()=>setReject(null)} onConfirm={(reason)=>act(reject,'REJECTED',reason)}/>}</>;}

function AdminBookings(){const[search,setSearch]=useState('');const[status,setStatus]=useState('');const{data,loading,error,reload}=useLoad(()=>adminApi.bookings({search,status}),[search,status]);return <><Heading title="Booking Management" subtitle="Search and review bookings without bypassing booking or payment workflows."><SearchFilter search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['PENDING','CONFIRMED','ACTIVE','IN_PROGRESS','COMPLETED','CANCELLED']}/></Heading><Banner error={error} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["id","Booking ID"],["customer_name","Customer"],["customer_email","Email"],["vehicle_name","Vehicle"],["booking_type","Type"],["pickup_date","Pickup"],["return_date","Return"],["amount","Amount"],["status","Status"]]}/>}</>;}

function AdminPayments(){const[search,setSearch]=useState('');const[status,setStatus]=useState('');const{data,loading,error,reload}=useLoad(()=>adminApi.payments({search,status}),[search,status]);return <><Heading title="Payment Management" subtitle="Read-only payment records. Successful status comes from the recorded payment verification, never an admin toggle."><SearchFilter search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['PENDING','SUCCESS','SUCCEEDED','COMPLETED','FAILED','REFUNDED']}/></Heading><Banner error={error} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["transaction_id","Transaction"],["booking_id","Booking"],["customer_name","Customer"],["customer_email","Email"],["amount","Amount"],["currency","Currency"],["provider","Method"],["payment_id","Payment reference"],["status","Status"],["payment_date","Date"]]}/>}</>;}

function AdminKyc(){const[status,setStatus]=useState('PENDING');const{data,loading,error,reload}=useLoad(()=>adminApi.kyc({status}),[status]);const[reject,setReject]=useState(null);const[actionError,setActionError]=useState('');const act=async(row,next,reason)=>{try{await adminApi.setKycStatus(read(row,'id'),{status:next,reason});setReject(null);setActionError('');await reload();}catch(e){setActionError(e?.response?.data?.detail||'Could not update verification.');}};const actions=(row)=>{if(read(row,'status')!=='PENDING')return <span className="text-xs text-slate-400">Reviewed</span>;return <div className="flex gap-2"><button onClick={()=>act(row,'VERIFIED')} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Verify</button><button onClick={()=>setReject(row)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Reject</button></div>;};return <><Heading title="KYC Verification" subtitle="Only masked document references are stored by the customer portal; no private document URL is exposed."><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{['PENDING','VERIFIED','REJECTED'].map(s=><option key={s}>{s}</option>)}</select></Heading><Banner error={error||actionError} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["customer_name","Customer"],["email","Email"],["document_type","Document type"],["document_last_four","Last four"],["submitted_at","Submitted"],["status","Status"],["rejection_reason","Reason"]]} renderActions={actions}/ >}{reject&&<ReasonModal item={read(reject,'customer_name')||'KYC submission'} onClose={()=>setReject(null)} onConfirm={(reason)=>act(reject,'REJECTED',reason)}/>}</>;}

function AdminSupport(){const[status,setStatus]=useState('');const{data,loading,error,reload}=useLoad(()=>adminApi.support({status}),[status]);const[actionError,setActionError]=useState('');const update=async(row,next)=>{try{await adminApi.setSupportStatus(read(row,'id'),{status:next});setActionError('');await reload();}catch(e){setActionError(e?.response?.data?.detail||'Could not update ticket.');}};return <><Heading title="Complaints & Support" subtitle="Review customer support requests and update their workflow status."><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=><option key={s}>{s}</option>)}</select></Heading><Banner error={error||actionError} onRetry={reload}/>{loading?<Loading/>:<Table rows={data||[]} columns={[["id","Ticket"],["customer_name","Customer"],["email","Email"],["subject","Subject"],["message","Description"],["created_at","Created"],["status","Status"]]} renderActions={row=><select value={read(row,'status')} onChange={e=>update(row,e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">{['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=><option key={s}>{s}</option>)}</select>}/>}</>;}

function AdminNotifications(){const{data,loading,error,reload}=useLoad(adminApi.notifications);const mark=async(id)=>{await adminApi.markNotificationRead(id);reload();};if(loading)return <Loading/>;const items=read(data,'items')||[];return <><Heading title="Admin Notifications" subtitle={`${read(data,'unread')||0} unread platform events`}/><Banner error={error} onRetry={reload}/>{items.length?<div className="space-y-3">{items.map(item=><article key={read(item,'id')} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-bold">{read(item,'title')}</h2><Status value={read(item,'is_read')?'READ':'UNREAD'}/></div><p className="mt-1 text-sm text-slate-600">{read(item,'message')}</p><p className="mt-2 text-xs text-slate-400">{read(item,'event_type')} · {when(read(item,'created_at'))}</p></div>{!read(item,'is_read')&&<button onClick={()=>mark(read(item,'id'))} className="rounded-lg px-3 py-2 text-xs font-bold text-[#D95400] hover:bg-orange-50">Mark as read</button>}</article>)}</div>:<Empty label="No admin notifications. New customer signups, KYC submissions and support requests appear here."/>}</>;}

function AdminReports(){const[period,setPeriod]=useState('month');const{data,loading,error,reload}=useLoad(()=>adminApi.reports(period),[period]);if(loading)return <Loading/>;const rows=read(data,'revenue')||[];const csv=()=>{const text=['period,revenue,transactions',...rows.map(r=>`${read(r,'period')},${read(r,'revenue')},${read(r,'transactions')}`)].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='smartride-revenue-report.csv';a.click();URL.revokeObjectURL(url);};return <><Heading title="Reports & Analytics" subtitle="Revenue reports reflect successful payment records and current booking data."><div className="flex gap-2"><select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">{[['day','Daily'],['week','Weekly'],['month','Monthly'],['year','Yearly']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button onClick={csv} className="inline-flex items-center gap-2 rounded-xl bg-[#172033] px-3 py-2 text-sm font-bold text-white"><ArrowDownToLine size={16}/>CSV</button><button onClick={()=>window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">Print / PDF</button></div></Heading><Banner error={error} onRetry={reload}/><div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><RevenueChart items={rows}/><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">Booking totals</h2><dl className="space-y-3">{[['All bookings','bookings'],['Pending','pending_bookings'],['Active','active_bookings'],['Completed','completed_bookings'],['Cancelled','cancelled_bookings']].map(([label,key])=><div key={key} className="flex justify-between border-b border-slate-100 pb-2 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-bold">{read(read(data,'statistics'),key)??0}</dd></div>)}</dl></section></div><div className="mt-6"><Table rows={rows} columns={[["period","Period"],["revenue","Revenue"],["transactions","Successful transactions"]]}/></div></>;}

function AdminSettings(){
  const load=useCallback(async()=>{
    const [profile,settings]=await Promise.all([adminApi.profile(),adminApi.settings()]);
    return {data:{profile:profile.data,settings:settings.data}};
  },[]);
  const {data,loading,error,reload}=useLoad(load,[]);
  const [name,setName]=useState('');
  const [values,setValues]=useState({rentalPolicy:'',cancellationPolicy:'',securityDeposit:'',notificationPreferences:''});
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [message,setMessage]=useState('');
  const [actionError,setActionError]=useState('');
  useEffect(()=>{
    if(!data)return;
    setName(read(read(data,'profile'),'name')||'');
    const next={rentalPolicy:'',cancellationPolicy:'',securityDeposit:'',notificationPreferences:''};
    for(const row of read(data,'settings')||[])next[read(row,'setting_key')]=read(row,'setting_value')||'';
    setValues(next);
  },[data]);
  const run=async(action,success)=>{try{await action();setActionError('');setMessage(success);await reload();}catch(e){setMessage('');setActionError(e?.response?.data?.detail||e?.response?.data?.message||'Could not save settings.');}};
  const saveProfile=e=>{e.preventDefault();run(()=>adminApi.updateProfile({name}), 'Profile updated.');};
  const saveSetting=(key)=>run(()=>adminApi.saveSetting(key,values[key]),'Platform setting saved.');
  const savePassword=e=>{e.preventDefault();run(()=>adminApi.changePassword({currentPassword,newPassword}), 'Password changed.');setCurrentPassword('');setNewPassword('');};
  if(loading)return <Loading/>;
  return <><Heading title="Admin Settings" subtitle="Manage your administrator profile, password, and platform policy values."/><Banner error={error||actionError} onRetry={reload}/>{message&&<p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}<div className="grid gap-5 xl:grid-cols-2"><form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Administrator profile</h2><p className="text-sm text-slate-500">{read(read(data,'profile'),'email')}</p><label className="block text-sm font-semibold">Display name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"/></label><button className="rounded-xl bg-[#172033] px-4 py-2 text-sm font-bold text-white">Save profile</button></form><form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Change password</h2><label className="block text-sm font-semibold">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"/></label><label className="block text-sm font-semibold">New password<input required minLength={12} type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"/></label><button className="rounded-xl bg-[#172033] px-4 py-2 text-sm font-bold text-white">Update password</button></form></div><section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">Platform settings</h2><div className="grid gap-4 md:grid-cols-2">{[['rentalPolicy','Rental policy'],['cancellationPolicy','Cancellation policy'],['securityDeposit','Security deposit'],['notificationPreferences','Notification preferences']].map(([key,label])=><form key={key} onSubmit={e=>{e.preventDefault();saveSetting(key);}} className="space-y-2"><label className="block text-sm font-semibold">{label}<textarea required maxLength={2000} rows={3} value={values[key]} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Save {label.toLowerCase()}</button></form>)}</div></section></>;
}


function AdminVendorManagement({ statusFilter }) {
  const [status, setStatus] = useState(statusFilter);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const pageSize = 10;

  const { data, loading, error, reload } = useLoad(
    () => adminApi.vendorApplications({ status, search, fromDate, toDate, page, size: pageSize }),
    [status, search, fromDate, toDate, page],
  );
  const rows = read(data, 'items') || [];
  const totalPages = read(data, 'totalPages') || 0;

  const openDetails = async (row) => {
    setSelected(row);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await adminApi.vendorApplication(read(row, 'id'));
      setDetail(response.data);
    } catch (requestError) {
      setDetailError(requestError?.response?.data?.detail || 'Could not load vendor application details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const finishAction = async (action, success, targetId = read(selected, 'id')) => {
    try {
      await action(targetId);
      setActionError('');
      setMessage(success);
      setRejecting(false);
      setConfirmApproval(false);
      setDetail(null);
      setSelected(null);
      window.dispatchEvent(new Event('vendor-applications-updated'));
      await reload();
    } catch (requestError) {
      setActionError(requestError?.response?.data?.detail || requestError?.response?.data?.message || 'Could not update vendor application.');
    }
  };

  const viewDocument = async (document) => {
    try {
      const { data: file } = await adminApi.vendorDocument(document.id);
      const url = URL.createObjectURL(file);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.type}.${file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      setDetailError(requestError?.response?.data?.detail || 'Could not retrieve the private document.');
    }
  };

  const title = statusFilter === 'PENDING' ? 'Pending Vendor Approvals'
    : statusFilter === 'APPROVED' ? 'Approved Vendors'
      : statusFilter === 'REJECTED' ? 'Rejected Vendors' : 'Vendor Management';

  return <>
    <Heading title={title} subtitle="Review vendor applications and securely access submitted documents.">
      <SearchFilter search={search} setSearch={(value) => { setSearch(value); setPage(0); }} status={status} setStatus={(value) => { setStatus(value); setPage(0); }} statuses={['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']} />
    </Heading>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold text-slate-600">Applied from<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
      <label className="text-xs font-semibold text-slate-600">Applied through<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
    </div>
    <Banner error={error || actionError} onRetry={reload} />
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
    {loading ? <Loading /> : <Table rows={rows} columns={[
      ['applicationNumber', 'Application ID'], ['fullName', 'Vendor name'], ['email', 'Email'],
      ['mobileNumber', 'Mobile'], ['businessName', 'Business'], ['city', 'City'], ['submittedAt', 'Applied'], ['status', 'Status'],
    ]} renderActions={(row) => <div className="flex min-w-52 flex-wrap gap-2">
      <button onClick={() => openDetails(row)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">View details / documents</button>
      {read(row, 'status') === 'PENDING' && <>
        <button onClick={() => { setSelected(row); setConfirmApproval(true); }} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Approve</button>
        <button onClick={() => { setSelected(row); setRejecting(true); }} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700">Reject</button>
      </>}
      {read(row, 'status') === 'APPROVED' && <button onClick={() => finishAction((id) => adminApi.suspendVendor(id), 'Vendor suspended successfully.', read(row, 'id'))} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">Suspend</button>}
    </div>} />}
    {!loading && totalPages > 1 && <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>{read(data, 'totalElements')} applications · Page {page + 1} of {totalPages}</span>
      <div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Next</button></div>
    </div>}

    {selected && detail !== null && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setDetail(null); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby="vendor-application-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="vendor-application-title" className="text-xl font-bold">Vendor application details</h2><p className="mt-1 text-sm text-slate-500">{detail.applicationNumber} · <Status value={detail.status} /></p></div><button onClick={() => { setSelected(null); setDetail(null); }} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100">Close</button></div>
        {detailError && <Banner error={detailError} />}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section><h3 className="font-bold">Personal information</h3><dl className="mt-2 space-y-2 text-sm">{[['Name',detail.fullName],['Email',detail.email],['Mobile',detail.mobileNumber],['Application date',when(detail.submittedAt)]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value || '—'}</dd></div>)}</dl></section>
          <section><h3 className="font-bold">Business information</h3><dl className="mt-2 space-y-2 text-sm">{[['Business',detail.businessName],['Type',detail.businessType],['Email',detail.businessEmail],['Mobile',detail.businessMobile],['Address',detail.businessAddress],['City / State',`${detail.city || ''}, ${detail.state || ''}`],['Pincode',detail.pincode],['Registration number',detail.registrationNumber]].map(([label,value])=><div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value || '—'}</dd></div>)}</dl></section>
        </div>
        <section className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold">Private documents</h3>{detail.documents?.length ? <ul className="mt-2 divide-y divide-slate-100">{detail.documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{String(document.type).replaceAll('_', ' ')}</span><button onClick={() => viewDocument(document)} className="rounded-lg bg-orange-50 px-3 py-2 font-semibold text-[#B54700] hover:bg-orange-100">Download securely</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No documents uploaded.</p>}</section>
        {detail.rejectionReason && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Rejection reason: {detail.rejectionReason}</p>}
      </section>
    </div>}
    {selected && detail === null && detailLoading && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"><div className="rounded-xl bg-white p-6"><Loading /></div></div>}
    {confirmApproval && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Approve Vendor Application?</h2><p className="mt-2 text-sm text-slate-600">Are you sure you want to approve this Vendor? The Vendor will be allowed to access the Vendor Dashboard after approval.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => { setConfirmApproval(false); setSelected(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={() => finishAction((id) => adminApi.approveVendor(id), 'Vendor Approved Successfully!')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Confirm Approval</button></div></section></div>}
    {rejecting && <ReasonModal item="vendor application" onClose={() => { setRejecting(false); setSelected(null); }} onConfirm={(reason) => finishAction((id) => adminApi.rejectVendor(id, { reason }), 'Vendor application rejected.')} />}
  </>;
}

export default function AdminWorkspace(){const path=useLocation().pathname;const role=path.endsWith('/vendors')?'vendors':path.endsWith('/drivers')?'drivers':path.endsWith('/customers')?'customers':path.endsWith('/fleet-managers')?'fleet_manager':'';const titles={vendors:'Vendor Management',drivers:'Driver Management',customers:'Customer Management',fleet_manager:'Fleet Manager Management'};if(path.endsWith('/dashboard'))return <><AdminDashboardPage/><PendingVendorRequests/></>;if(path.startsWith('/admin/vendors')){const segment=path.split('/')[3];const filters={pending:'PENDING',approved:'APPROVED',rejected:'REJECTED'};const filter=filters[segment]||'';return <AdminVendorManagement key={filter} statusFilter={filter}/>;}if(role)return <AdminUserManagement role={role} title={titles[role]}/>;if(path.endsWith('/vehicles'))return <AdminVehicles/>;if(path.endsWith('/bookings'))return <AdminBookings/>;if(path.endsWith('/payments'))return <AdminPayments/>;if(path.endsWith('/kyc'))return <AdminKyc/>;if(path.endsWith('/reports'))return <AdminReports/>;if(path.endsWith('/support'))return <AdminSupport/>;if(path.endsWith('/notifications'))return <AdminNotifications/>;if(path.endsWith('/settings'))return <AdminSettings/>;return <><AdminDashboardPage/><PendingVendorRequests/></>;}
