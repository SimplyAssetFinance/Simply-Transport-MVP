'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Truck, ShieldCheck, Fuel, Settings, LogOut, FolderOpen, ClipboardList, BarChart3, Users } from 'lucide-react'
import { toast } from 'sonner'

const nav = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/vehicles',     label: 'Vehicles',     icon: Truck },
  { href: '/drivers',      label: 'Drivers',      icon: Users },
  { href: '/compliance',   label: 'Compliance',   icon: ShieldCheck },
  { href: '/checklists',   label: 'Checklists',   icon: ClipboardList },
  { href: '/fuel-pricing', label: 'Fuel Pricing', icon: Fuel },
  { href: '/documents',    label: 'Documents',    icon: FolderOpen },
  { href: '/reports',      label: 'Reports',      icon: BarChart3 },
  { href: '/settings',     label: 'Settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const sb = createClient()
    await sb.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Simply Transport</p>
            <p className="text-slate-500 text-xs">Fleet Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
