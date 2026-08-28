import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Plus, Check, ChevronDown, ChevronUp, LayoutList, Clock, Trash2 } from "lucide-react"

const STATUS_OPTIONS = ["Not Started", "In Progress", "Done", "Skipped"]

const statusColors = {
  "Not Started": "bg-slate-100 text-slate-600",
  "In Progress": "bg-amber-100 text-amber-700",
  "Done": "bg-green-100 text-green-700",
  "Skipped": "bg-slate-100 text-slate-400"
}

const CATEGORIES = [
  "Vendors", "Wedding Party", "Planning & Communication",
  "Venue & Details", "Other Vendor Details", "Attire & Beauty",
  "Legal & Admin", "Final Details", "Custom"
]

const TIMELINE_WINDOWS = [
  { label: "12 Months Out", months: 12 },
  { label: "11 Months Out", months: 11 },
  { label: "10 Months Out", months: 10 },
  { label: "9 Months Out", months: 9 },
  { label: "8 Months Out", months: 8 },
  { label: "7 Months Out", months: 7 },
  { label: "6 Months Out", months: 6 },
  { label: "5 Months Out", months: 5 },
  { label: "4 Months Out", months: 4 },
  { label: "3 Months Out", months: 3 },
  { label: "2 Months Out", months: 2 },
  { label: "1 Month Out", months: 1 },
  { label: "Final Week and Day Of", months: 0 },
]

function calculateSuggestedDate(weddingDate, monthsBefore) {
  if (!weddingDate || monthsBefore === null) return null
  const d = new Date(weddingDate)
  d.setMonth(d.getMonth() - monthsBefore)
  return d.toISOString().split("T")[0]
}

function formatDate(dateStr) {
  if (!dateStr) return "—"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function Timeline({ wedding }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("timeline")
  const [collapsed, setCollapsed] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState("All")
  const [newItem, setNewItem] = useState({
    category: "Custom", item: "", owner: "",
    months_before: "", user_due_date: "", notes: ""
  })

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("timeline_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("months_before", { ascending: false })

    if (data && data.length > 0) {
      setItems(data)
    } else {
      await initializeFromTemplates()
    }
    setLoading(false)
  }

  async function initializeFromTemplates() {
    const { data: templates } = await supabase
      .from("timeline_templates")
      .select("*")
      .order("sort_order")

    if (!templates || templates.length === 0) return

    const itemsToInsert = templates.map(t => ({
      wedding_id: wedding.id,
      category: t.category,
      item: t.item,
      owner: t.owner,
      months_before: t.months_before,
      suggested_due_date: calculateSuggestedDate(wedding.wedding_date, t.months_before),
      status: "Not Started",
      notes: t.default_notes || null,
      is_custom: false,
      sort_order: t.sort_order
    }))

    const { data: inserted } = await supabase
      .from("timeline_items")
      .insert(itemsToInsert)
      .select()

    setItems(inserted || [])
  }

  async function updateStatus(item, status) {
    const { data } = await supabase
      .from("timeline_items").update({ status }).eq("id", item.id).select().single()
    setItems(items.map(i => i.id === item.id ? data : i))
  }

  async function updateUserDueDate(item, user_due_date) {
    const { data } = await supabase
      .from("timeline_items").update({ user_due_date: user_due_date || null }).eq("id", item.id).select().single()
    setItems(items.map(i => i.id === item.id ? data : i))
  }

  async function updateNotes(item, notes) {
    const { data } = await supabase
      .from("timeline_items").update({ notes }).eq("id", item.id).select().single()
    setItems(items.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(id) {
    await supabase.from("timeline_items").delete().eq("id", id)
    setItems(items.filter(i => i.id !== id))
  }

  async function addCustomItem() {
    if (!newItem.item.trim()) return
    const monthsBefore = newItem.months_before !== "" ? parseInt(newItem.months_before) : null
    const { data } = await supabase
      .from("timeline_items")
      .insert({
        wedding_id: wedding.id,
        category: newItem.category,
        item: newItem.item,
        owner: newItem.owner || null,
        months_before: monthsBefore,
        suggested_due_date: monthsBefore !== null
          ? calculateSuggestedDate(wedding.wedding_date, monthsBefore) : null,
        user_due_date: newItem.user_due_date || null,
        status: "Not Started",
        notes: newItem.notes || null,
        is_custom: true
      })
      .select().single()
    setItems([...items, data])
    setNewItem({ category: "Custom", item: "", owner: "", months_before: "", user_due_date: "", notes: "" })
    setShowAddForm(false)
  }

  function toggleCollapse(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const total = items.length
  const done = items.filter(i => i.status === "Done").length
  const inProgress = items.filter(i => i.status === "In Progress").length
  const notStarted = items.filter(i => i.status === "Not Started").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const filteredItems = filterStatus === "All" ? items : items.filter(i => i.status === filterStatus)

  if (loading) return <p className="text-slate-400">Loading timeline...</p>

  return (
    <div className="space-y-6">

      {/* Progress */}
      <div className="bg-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-300 text-sm">Planning Progress</p>
            <p className="text-4xl font-bold mt-1">{pct}%</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-slate-300">Done: {done}</p>
            <p className="text-xs text-slate-300">In Progress: {inProgress}</p>
            <p className="text-xs text-slate-300">Not Started: {notStarted}</p>
            <p className="text-xs text-slate-300">Total: {total} tasks</p>
          </div>
        </div>
        <div className="h-3 bg-slate-600 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "timeline" ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Clock size={14} /> By Timeline
            </button>
            <button
              onClick={() => setView("category")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "category" ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <LayoutList size={14} /> By Category
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option>All</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          <Plus size={16} /> Add Custom Task
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Custom Task</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Task *</label>
              <input value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })}
                placeholder="What needs to be done?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Category</label>
              <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Owner</label>
              <input value={newItem.owner} onChange={e => setNewItem({ ...newItem, owner: e.target.value })}
                placeholder="e.g. Bride, Groom, Couple"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Months Before Wedding</label>
              <input type="number" min="0" max="24" value={newItem.months_before}
                onChange={e => setNewItem({ ...newItem, months_before: e.target.value })}
                placeholder="e.g. 6"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Your Due Date</label>
              <input type="date" value={newItem.user_due_date}
                onChange={e => setNewItem({ ...newItem, user_due_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <input value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addCustomItem}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
              Add Task
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && (
        <div className="space-y-3">
          {TIMELINE_WINDOWS.map(window => {
            const windowItems = filteredItems.filter(i => i.months_before === window.months)
            if (windowItems.length === 0) return null
            const windowDone = windowItems.filter(i => i.status === "Done").length
            const isCollapsed = collapsed[`tl-${window.months}`]
            return (
              <div key={window.months} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => toggleCollapse(`tl-${window.months}`)}
                  className="w-full bg-slate-200 px-4 py-3 flex items-center justify-between hover:bg-slate-300 transition">
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                    <span className="font-semibold text-slate-700 text-sm">{window.label}</span>
                    <span className="text-xs text-slate-400">{windowItems.length} tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{windowDone}/{windowItems.length} done</span>
                    {windowDone === windowItems.length && windowItems.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Complete</span>
                    )}
                  </div>
                </button>
                {!isCollapsed && (
                  <TaskTable items={windowItems} weddingDate={wedding.wedding_date}
                    onStatusChange={updateStatus} onDueDateChange={updateUserDueDate}
                    onNotesChange={updateNotes} onDelete={deleteItem} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Category view */}
      {view === "category" && (
        <div className="space-y-3">
          {CATEGORIES.map(category => {
            const catItems = filteredItems.filter(i => i.category === category)
            if (catItems.length === 0) return null
            const catDone = catItems.filter(i => i.status === "Done").length
            const isCollapsed = collapsed[`cat-${category}`]
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => toggleCollapse(`cat-${category}`)}
                  className="w-full bg-slate-200 px-4 py-3 flex items-center justify-between hover:bg-slate-300 transition">
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
                    <span className="font-semibold text-slate-700 text-sm">{category}</span>
                    <span className="text-xs text-slate-400">{catItems.length} tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{catDone}/{catItems.length} done</span>
                    {catDone === catItems.length && catItems.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Complete</span>
                    )}
                  </div>
                </button>
                {!isCollapsed && (
                  <TaskTable
                    items={catItems.sort((a, b) => (b.months_before || 0) - (a.months_before || 0))}
                    weddingDate={wedding.wedding_date}
                    onStatusChange={updateStatus} onDueDateChange={updateUserDueDate}
                    onNotesChange={updateNotes} onDelete={deleteItem} showMonths={true} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskTable({ items, weddingDate, onStatusChange, onDueDateChange, onNotesChange, onDelete, showMonths = false }) {
  const [editingNotes, setEditingNotes] = useState(null)
  const [notesDraft, setNotesDraft] = useState("")

  function startEditNotes(item) {
    setEditingNotes(item.id)
    setNotesDraft(item.notes || "")
  }

  async function saveNotes(item) {
    await onNotesChange(item, notesDraft)
    setEditingNotes(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 bg-slate-100 border-b border-slate-200">
            <th className="text-left px-4 py-2">Task</th>
            {showMonths && <th className="text-left px-4 py-2">Timing</th>}
            <th className="text-left px-4 py-2">Owner</th>
            <th className="text-left px-4 py-2">Suggested Date</th>
            <th className="text-left px-4 py-2">Your Date</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Notes</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}
              className={`border-b border-slate-50 last:border-0 ${item.status === "Done" ? "opacity-60" : ""} ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => onStatusChange(item, item.status === "Done" ? "Not Started" : "Done")}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${item.status === "Done" ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-slate-500"}`}>
                    {item.status === "Done" && <Check size={11} />}
                  </button>
                  <span className={`text-slate-700 text-sm ${item.status === "Done" ? "line-through text-slate-400" : ""}`}>
                    {item.item}
                    {item.is_custom && (
                      <span className="ml-1.5 text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">custom</span>
                    )}
                  </span>
                </div>
              </td>
              {showMonths && (
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {item.months_before !== null ? `${item.months_before}mo out` : "—"}
                </td>
              )}
              <td className="px-4 py-3 text-xs text-slate-500">{item.owner || "—"}</td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                {formatDate(item.suggested_due_date)}
              </td>
              <td className="px-4 py-3">
                <input type="date" value={item.user_due_date || ""}
                  onChange={e => onDueDateChange(item, e.target.value)}
                  className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300" />
              </td>
              <td className="px-4 py-3">
                <select value={item.status} onChange={e => onStatusChange(item, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusColors[item.status]}`}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 max-w-xs">
                {editingNotes === item.id ? (
                  <input value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
                    onBlur={() => saveNotes(item)}
                    onKeyDown={e => e.key === "Enter" && saveNotes(item)}
                    autoFocus
                    className="text-xs border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-slate-300" />
                ) : (
                  <button onClick={() => startEditNotes(item)}
                    className="text-xs text-slate-400 hover:text-slate-600 text-left w-full transition">
                    {item.notes || <span className="italic text-slate-300">Add note...</span>}
                  </button>
                )}
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onDelete(item.id)} className="text-slate-200 hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
