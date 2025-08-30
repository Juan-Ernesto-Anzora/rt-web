import React, { useState } from 'react'

function UserMenu() {
  return (
    <div className="absolute right-6 top-16 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 p-2">
      {['Profile & Preferences','Keyboard Shortcuts','Saved Views','Notifications','Switch Company/Tenant','Log out'].map((label) => (
        <div key={label} className="px-3 py-2 rounded-lg hover:bg-neutral-100 cursor-pointer font-medium text-sm">
          {label}
        </div>
      ))}
    </div>
  )
}

function TopBar({onNew}:{onNew:()=>void}) {
  const [open, setOpen] = useState(false)
  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      <div className="font-semibold text-lg text-neutral-800">Request Tracker</div>
      <div className="flex items-center gap-3 relative">
        <button className="btn btn-primary" onClick={onNew}>New Request</button>
        <div className="px-3 py-1 rounded-2xl bg-neutral-100 border border-neutral-300 text-sm font-semibold">Tenant: ACME</div>
        <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
          <div className="w-8 h-8 rounded-full bg-primary-600" />
          <span className="text-sm font-medium text-neutral-800">Ana Gomez</span>
        </div>
        {open && <UserMenu />}
      </div>
    </header>
  )
}

function SideNav() {
  const items = ['New Request','My Tasks','Other Tasks','My Requests','Search','Settings','Logout']
  return (
    <aside className="w-60 bg-neutral-50 border-r border-neutral-200 p-3">
      {items.map((label) => (
        <div key={label} className={`px-4 py-2 rounded-lg \${label==='My Tasks' ? 'bg-primary-600 text-white font-semibold' : 'hover:bg-neutral-100 text-neutral-700'}`}>
          {label}
        </div>
      ))}
    </aside>
  )
}

function KPI({label,value,cls}:{label:string,value:string,cls?:string}){
  return (
    <div className={`card p-4 \${cls||''}`}>
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 mt-1">{value}</div>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar onNew={()=>alert('New Request')} />
      <div className="flex flex-1 gap-0">
        <SideNav />
        <main className="flex-1 p-6 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <KPI label="Open" value="24" />
            <KPI label="In Progress" value="12" />
            <KPI label="Due Today" value="5" />
            <KPI label="Overdue" value="3" />
          </div>

          <div className="flex gap-3">
            <input placeholder="Search tickets…" className="card px-3 h-11 w-[520px] outline-none" />
            <button className="card px-4 h-11 text-sm font-semibold">Saved Views</button>
            <button className="btn btn-primary">New Request</button>
          </div>

          <div className="card p-4">
            <div className="grid grid-cols-6 text-sm text-neutral-600 font-semibold">
              <div>ID</div><div>Title</div><div>Status</div><div>Assignee</div><div>Updated</div><div>Priority</div>
            </div>
            {[
              ['RT-2025-001001','VPN not connecting','Open','Ana Gomez','Aug 22, 10:41','High'],
              ['RT-2025-001002','Email quota exceeded','In Progress','Luis Perez','Aug 22, 09:18','Normal'],
              ['RT-2025-001003','Printer F3 queue stuck','Waiting','—','Aug 21, 17:02','Low'],
              ['RT-2025-001004','VPN split tunneling','Closed','Ana Gomez','Aug 20, 15:27','Normal']
            ].map((r,i)=> (
              <div key={i} className="grid grid-cols-6 py-3 border-t border-neutral-200 text-sm">
                {r.map((c,j)=>(<div key={j}>{c}</div>))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}