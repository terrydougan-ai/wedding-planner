import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth from "./components/Auth"
import Layout from "./components/Layout"
import Budget from "./components/Budget"
import Guests from "./components/Guests"
import WeddingSetup from "./components/WeddingSetup"
import Timeline from "./components/Timeline"
import DayOf from "./components/DayOf"
import Vendors from "./components/Vendors"
import Seating from "./components/Seating"

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wedding, setWedding] = useState(null)
  const [activePage, setActivePage] = useState("setup")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadOrCreateWedding()
  }, [session])

  async function loadOrCreateWedding() {
    const { data, error } = await supabase
      .from("weddings")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (data) {
      setWedding(data)
    } else {
      // Create a new wedding for this user
      const { data: newWedding } = await supabase
        .from("weddings")
        .insert({
          user_id: session.user.id,
          partner1_name: "",
          partner2_name: "",
          total_budget: 0
        })
        .select()
        .single()
      setWedding(newWedding)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <p className="text-rose-400 text-lg">Loading...</p>
    </div>
  )

  if (!session) return <Auth />

  if (!wedding) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <p className="text-rose-400 text-lg">Setting up your wedding...</p>
    </div>
  )

  return (
    <Layout
      session={session}
      wedding={wedding}
      activePage={activePage}
      setActivePage={setActivePage}
    >
      {activePage === "timeline" && (
        <Timeline wedding={wedding} />
      )}
      {activePage === "budget" && (
        <Budget wedding={wedding} />
      )}
      {activePage === "guests" && (
        <Guests wedding={wedding} />
      )}
      {activePage === "setup" && (
        <WeddingSetup wedding={wedding} onUpdate={setWedding} />
      )}
      {activePage === "dayof" && (
        <DayOf wedding={wedding} />
      )}
      {activePage === "vendors" && (
        <Vendors wedding={wedding} />
      )}
      {activePage === "seating" && (
        <Seating wedding={wedding} />
      )}
    </Layout>
  )
}