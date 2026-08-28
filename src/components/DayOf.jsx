import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Plus, Trash2, Printer, Edit3, Check, ChevronUp, ChevronDown } from "lucide-react"

const PEOPLE_OPTIONS = [
  "", "All", "Bride", "Groom", "Bride & Groom",
  "Bridesmaids", "Groomsmen", "Wedding Party",
  "Father of Bride", "Mother of Bride", "Parents of Bride",
  "Father of Groom", "Mother of Groom", "Parents of Groom",
  "Immediate Family", "All Guests", "Photographer", "Vendors"
]

const PEOPLE_COLORS = {
  "Bride": "bg-pink-100 text-pink-700",
  "Groom": "bg-blue-100 text-blue-700",
  "Bride & Groom": "bg-purple-100 text-purple-700",
  "Bridesmaids": "bg-pink-100 text-pink-700",
  "Groomsmen": "bg-blue-100 text-blue-700",
  "Wedding Party": "bg-purple-100 text-purple-700",
  "All": "bg-slate-100 text-slate-600",
  "All Guests": "bg-slate-100 text-slate-600",
  "Photographer": "bg-amber-100 text-amber-700",
  "Vendors": "bg-orange-100 text-orange-700",
  "Immediate Family": "bg-green-100 text-green-700",
  "Parents of Bride": "bg-pink-100 text-pink-700",
  "Parents of Groom": "bg-blue-100 text-blue-700",
  "Father of Bride": "bg-pink-100 text-pink-700",
  "Mother of Bride": "bg-pink-100 text-pink-700",
  "Father of Groom": "bg-blue-100 text-blue-700",
  "Mother of Groom": "bg-blue-100 text-blue-700",
}

function formatTime(timeStr) {
  if (!timeStr) return ""
  const [hours, minutes] = timeStr.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const h = hours % 12 || 12
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`
}

function formatDuration(minutes) {
  if (!minutes || minutes === 0) return ""
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

export default function DayOf({ wedding }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState("view")
  const [editingCell, setEditingCell] = useState(null) // { id, field }
  const [dayNotes, setDayNotes] = useState(wedding.day_notes || "")
  const [savingNotes, setSavingNotes] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({
    start_time: "", duration_minutes: "", activity: "",
    people: "", location: "", notes: ""
  })

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("day_of_schedule")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("start_time")

    if (data && data.length > 0) {
      setItems(data)
    } else {
      await initializeFromTemplate()
    }
    setLoading(false)
  }

  async function initializeFromTemplate() {
    const { data: templates } = await supabase
      .from("day_of_templates")
      .select("*")
      .order("sort_order")
    if (!templates || templates.length === 0) return
    const toInsert = templates.map(t => ({
      wedding_id: wedding.id,
      start_time: t.start_time,
      duration_minutes: t.duration_minutes,
      activity: t.activity,
      people: t.people,
      location: t.location,
      notes: t.notes,
      sort_order: t.sort_order
    }))
    const { data: inserted } = await supabase
      .from("day_of_schedule").insert(toInsert).select().order("start_time")
    setItems(inserted || [])
  }

  async function updateField(item, field, value) {
    const updateData = { [field]: value || null }
    if (field === "start_time") {
      updateData.start_time = value
    }
    if (field === "duration_minutes") {
      updateData.duration_minutes = value ? parseInt(value) : null
    }
    const { data } = await supabase
      .from("day_of_schedule").update(updateData).eq("id", item.id).select().single()
    const updated = items.map(i => i.id === item.id ? data : i)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    setItems(updated)
    setEditingCell(null)
  }

  async function addRow() {
    if (!newRow.activity.trim() || !newRow.start_time) return
    const { data } = await supabase
      .from("day_of_schedule")
      .insert({
        wedding_id: wedding.id,
        start_time: newRow.start_time,
        duration_minutes: newRow.duration_minutes ? parseInt(newRow.duration_minutes) : null,
        activity: newRow.activity,
        people: newRow.people || null,
        location: newRow.location || null,
        notes: newRow.notes || null,
        sort_order: items.length + 1
      })
      .select().single()
    const updated = [...items, data].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    setItems(updated)
    setNewRow({ start_time: "", duration_minutes: "", activity: "", people: "", location: "", notes: "" })
    setShowAddRow(false)
  }

  async function deleteItem(id) {
    await supabase.from("day_of_schedule").delete().eq("id", id)
    setItems(items.filter(i => i.id !== id))
  }

  async function moveItem(index, direction) {
    const newItems = [...items]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newItems.length) return
    ;[newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]]
    setItems(newItems)
  }

  async function saveDayNotes() {
    setSavingNotes(true)
    await supabase.from("weddings").update({ day_notes: dayNotes }).eq("id", wedding.id)
    setSavingNotes(false)
  }

  // Editable cell component
  function EditableCell({ item, field, type = "text", options = null, className = "" }) {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field
    const value = item[field]
    const [draft, setDraft] = useState(value || "")

    useEffect(() => { setDraft(value || "") }, [value])

    if (!isEditing) {
      return (
        <div
          onClick={() => mode === "edit" && setEditingCell({ id: item.id, field })}
          className={`px-3 py-2 min-h-[36px] ${mode === "edit" ? "cursor-pointer hover:bg-slate-100 rounded" : ""} ${className}`}
        >
          {field === "people" && value ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PEOPLE_COLORS[value] || "bg-slate-100 text-slate-600"}`}>
              {value}
            </span>
          ) : field === "start_time" && value ? (
            <span className="text-sm font-bold text-slate-700">{formatTime(value)}</span>
          ) : field === "duration_minutes" && value ? (
            <span className="text-xs text-slate-400">{formatDuration(value)}</span>
          ) : (
            <span className={value ? "text-sm text-slate-700" : "text-xs text-slate-300 italic"}>
              {value || (mode === "edit" ? "click to edit" : "—")}
            </span>
          )}
        </div>
      )
    }

    if (options) {
      return (
        <select
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => updateField(item, field, draft)}
          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
        </select>
      )
    }

    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => updateField(item, field, draft)}
        onKeyDown={e => {
          if (e.key === "Enter") updateField(item, field, draft)
          if (e.key === "Escape") setEditingCell(null)
        }}
        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
    )
  }

  if (loading) return <p className="text-slate-400">Loading schedule...</p>

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-700">Day-Of Schedule</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {wedding.wedding_date
              ? new Date(wedding.wedding_date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric"
                })
              : "Set your wedding date in Our Wedding tab"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition print:hidden"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={() => { setMode(mode === "view" ? "edit" : "view"); setEditingCell(null) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition print:hidden ${
              mode === "edit" ? "bg-slate-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {mode === "edit" ? <><Check size={15} /> Done</> : <><Edit3 size={15} /> Edit</>}
          </button>
          {mode === "edit" && (
            <button
              onClick={() => setShowAddRow(!showAddRow)}
              className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition print:hidden"
            >
              <Plus size={15} /> Add Row
            </button>
          )}
        </div>
      </div>

      {/* Day-Of Notes */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Day-Of Notes</h3>
        <textarea
          value={dayNotes}
          onChange={e => setDayNotes(e.target.value)}
          placeholder="Key reminders, important contacts, things to remember on the day..."
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />
        <button
          onClick={saveDayNotes}
          disabled={savingNotes}
          className="mt-2 text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
        >
          {savingNotes ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* Add row form */}
      {showAddRow && mode === "edit" && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">New Schedule Item</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Time *</label>
              <input type="time" value={newRow.start_time}
                onChange={e => setNewRow({ ...newRow, start_time: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Duration (min)</label>
              <input type="number" min="0" value={newRow.duration_minutes}
                onChange={e => setNewRow({ ...newRow, duration_minutes: e.target.value })}
                placeholder="e.g. 30"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Who</label>
              <select value={newRow.people}
                onChange={e => setNewRow({ ...newRow, people: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {PEOPLE_OPTIONS.map(p => <option key={p} value={p}>{p || "—"}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Activity *</label>
              <input value={newRow.activity}
                onChange={e => setNewRow({ ...newRow, activity: e.target.value })}
                placeholder="What is happening?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Location</label>
              <input value={newRow.location}
                onChange={e => setNewRow({ ...newRow, location: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <input value={newRow.notes}
                onChange={e => setNewRow({ ...newRow, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addRow}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
              Add to Schedule
            </button>
            <button onClick={() => setShowAddRow(false)}
              className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">

        {/* Print header */}
        <div className="hidden print:block p-6 border-b">
          <h1 className="text-2xl font-bold text-slate-800">
            {wedding.partner1_name && wedding.partner2_name
              ? `${wedding.partner1_name} & ${wedding.partner2_name} — Day-Of Schedule`
              : "Wedding Day-Of Schedule"}
          </h1>
          {wedding.wedding_date && (
            <p className="text-slate-500 mt-1">
              {new Date(wedding.wedding_date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
              })}
            </p>
          )}
          {wedding.venue && <p className="text-slate-500">{wedding.venue}</p>}
          {dayNotes && <p className="text-slate-600 mt-2 text-sm italic">{dayNotes}</p>}
        </div>

        {mode === "edit" && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-xs text-amber-700">
              ✏️ Edit mode — click any cell to edit inline. Press Enter or click away to save.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 bg-slate-100 border-b border-slate-200">
                {mode === "edit" && <th className="w-16 px-2 py-2 text-center">Order</th>}
                <th className="text-left px-3 py-2 w-24">Time</th>
                <th className="text-left px-3 py-2 w-16">Duration</th>
                <th className="text-left px-3 py-2">Activity</th>
                <th className="text-left px-3 py-2 w-36">Who</th>
                <th className="text-left px-3 py-2 w-36">Location</th>
                <th className="text-left px-3 py-2">Notes</th>
                {mode === "edit" && <th className="w-10 px-2 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}
                  className={`border-b border-slate-50 last:border-0 group ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  } hover:bg-slate-50 transition`}>

                  {/* Reorder buttons */}
                  {mode === "edit" && (
                    <td className="px-2 py-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button onClick={() => moveItem(i, "up")} disabled={i === 0}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition">
                          <ChevronUp size={13} />
                        </button>
                        <button onClick={() => moveItem(i, "down")} disabled={i === items.length - 1}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20 transition">
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </td>
                  )}

                  <td className="py-1">
                    <EditableCell item={item} field="start_time" type="time" />
                  </td>
                  <td className="py-1">
                    <EditableCell item={item} field="duration_minutes" type="number" />
                  </td>
                  <td className="py-1">
                    <EditableCell item={item} field="activity" />
                  </td>
                  <td className="py-1">
                    <EditableCell item={item} field="people" options={PEOPLE_OPTIONS} />
                  </td>
                  <td className="py-1">
                    <EditableCell item={item} field="location" />
                  </td>
                  <td className="py-1">
                    <EditableCell item={item} field="notes" />
                  </td>

                  {mode === "edit" && (
                    <td className="px-2 py-1">
                      <button onClick={() => deleteItem(item.id)}
                        className="text-slate-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, button, .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
