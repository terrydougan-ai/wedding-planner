import { useState } from "react"
import { supabase } from "../supabase"
import { Gem, Calendar, MapPin, Users, Save } from "lucide-react"

export default function WeddingSetup({ wedding, onUpdate }) {
  const [form, setForm] = useState({
    partner1_name: wedding.partner1_name || "",
    partner2_name: wedding.partner2_name || "",
    wedding_date: wedding.wedding_date || "",
    venue: wedding.venue || "",
    guest_count_estimate: wedding.guest_count_estimate || "",
    total_budget: wedding.total_budget || ""
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase
      .from("weddings")
      .update({
        partner1_name: form.partner1_name,
        partner2_name: form.partner2_name,
        wedding_date: form.wedding_date || null,
        venue: form.venue,
        guest_count_estimate: parseInt(form.guest_count_estimate) || 0,
        total_budget: parseFloat(form.total_budget) || 0
      })
      .eq("id", wedding.id)
      .select()
      .single()

    setSaving(false)
    setSaved(true)
    onUpdate(data)
    setTimeout(() => setSaved(false), 2000)
  }

  // Countdown calculation
  const daysUntil = form.wedding_date
    ? Math.ceil((new Date(form.wedding_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Countdown hero */}
      {daysUntil !== null && (
        <div className="bg-slate-700 rounded-2xl p-8 text-center text-white">
          <Gem className="mx-auto mb-3 text-slate-300" size={32} />
          {daysUntil > 0 ? (
            <>
              <p className="text-6xl font-bold mb-2">{daysUntil}</p>
              <p className="text-slate-300 text-lg">days until your wedding</p>
              {form.partner1_name && form.partner2_name && (
                <p className="text-slate-400 mt-2 text-sm">
                  {form.partner1_name} & {form.partner2_name}
                </p>
              )}
            </>
          ) : daysUntil === 0 ? (
            <>
              <p className="text-4xl font-bold mb-2">🎉 Today is the day!</p>
              <p className="text-slate-300">Congratulations!</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold mb-2">🎊 Congratulations!</p>
              <p className="text-slate-300">You got married {Math.abs(daysUntil)} days ago</p>
            </>
          )}
          {form.wedding_date && (
            <p className="text-slate-400 mt-3 text-sm">
              {new Date(form.wedding_date).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
              })}
            </p>
          )}
          {form.venue && (
            <p className="text-slate-400 mt-1 text-sm flex items-center justify-center gap-1">
              <MapPin size={12} /> {form.venue}
            </p>
          )}
        </div>
      )}

      {/* Setup form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-5">Wedding Details</h2>

        <div className="space-y-4">

          {/* Partner names */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wide">
              The Couple
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Partner 1 Name</label>
                <input
                  value={form.partner1_name}
                  onChange={e => setForm({ ...form, partner1_name: e.target.value })}
                  placeholder="e.g. Sarah"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Partner 2 Name</label>
                <input
                  value={form.partner2_name}
                  onChange={e => setForm({ ...form, partner2_name: e.target.value })}
                  placeholder="e.g. James"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Date and venue */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wide">
              The Day
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                  <Calendar size={11} /> Wedding Date
                </label>
                <input
                  type="date"
                  value={form.wedding_date}
                  onChange={e => setForm({ ...form, wedding_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                  <MapPin size={11} /> Venue
                </label>
                <input
                  value={form.venue}
                  onChange={e => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. The Grand Ballroom"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Budget and guests */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wide">
              Planning
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Total Budget ($)</label>
                <input
                  type="number"
                  value={form.total_budget}
                  onChange={e => setForm({ ...form, total_budget: e.target.value })}
                  placeholder="e.g. 30000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
                  <Users size={11} /> Estimated Guest Count
                </label>
                <input
                  type="number"
                  value={form.guest_count_estimate}
                  onChange={e => setForm({ ...form, guest_count_estimate: e.target.value })}
                  placeholder="e.g. 150"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
          </div>

        </div>

                {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
            ✓ Wedding details saved successfully!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex items-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save Details"}
        </button>
      </div>
    </div>
  )
}