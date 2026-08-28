import { supabase } from "../supabase"
import { Settings, DollarSign, Users, CheckSquare, Calendar, Store, Grid, LogOut, Gem } from "lucide-react"

export default function Layout({ session, wedding, activePage, setActivePage, children }) {

  async function handleSignOut() {
    await supabase.auth.signOut()
  }


  const navItems = [
    { id: "setup", label: "Our Wedding", icon: Settings },
    { id: "budget", label: "Budget", icon: DollarSign },
    { id: "guests", label: "Guest List", icon: Users },
    { id: "timeline", label: "Timeline", icon: CheckSquare },
    { id: "dayof", label: "Day-Of", icon: Calendar },
    { id: "vendors", label: "Vendors", icon: Store },
    { id: "seating", label: "Seating", icon: Grid },
  ]

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Top nav */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem className="text-slate-500" size={20} />
            <span className="font-bold text-slate-700 text-lg">
              {wedding?.partner1_name && wedding?.partner2_name
                ? `${wedding.partner1_name} & ${wedding.partner2_name}`
                : "Wedding Planner"
              }
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activePage === id
                    ? "bg-slate-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}