import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Plus, Trash2, Check } from "lucide-react"

const CATEGORIES = [
  "Venue", "Catering", "Photography", "Videography", "Flowers & Décor",
  "Music & Entertainment", "Wedding Dress", "Groom Attire", "Hair & Makeup",
  "Cake & Desserts", "Invitations & Stationery", "Transportation",
  "Rings", "Officiant", "Rehearsal Dinner", "Honeymoon", "Other"
]

const COLORS = [
  "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3",
  "#be123c", "#9f1239", "#881337", "#4f46e5", "#7c3aed",
  "#a855f7", "#ec4899", "#14b8a6", "#f59e0b", "#10b981",
  "#3b82f6", "#6366f1"
]

export default function Budget({ wedding }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [totalBudget, setTotalBudget] = useState(wedding.total_budget || 0)
  const [editingBudget, setEditingBudget] = useState(false)
  const [formError, setFormError] = useState("")
  const [newItem, setNewItem] = useState({
    category: CATEGORIES[0],
    item_name: "",
    estimated_cost: "",
    actual_cost: "",
    deposit_paid: "",
    due_date: "",
    paid: false,
    notes: ""
  })

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const { data } = await supabase
      .from("budget_items")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("category")
    setItems(data || [])
    setLoading(false)
  }

  async function saveTotalBudget() {
    await supabase
      .from("weddings")
      .update({ total_budget: totalBudget })
      .eq("id", wedding.id)
    setEditingBudget(false)
  }


  async function addItem() {
    if (!newItem.item_name.trim()) {
      setFormError("Item name is required.")
      return
    }
    setFormError("")
    const { data } = await supabase
      .from("budget_items")
      .insert({
        wedding_id: wedding.id,
        category: newItem.category,
        item_name: newItem.item_name,
        estimated_cost: parseFloat(newItem.estimated_cost) || 0,
        actual_cost: newItem.actual_cost ? parseFloat(newItem.actual_cost) : null,
        deposit_paid: newItem.deposit_paid ? parseFloat(newItem.deposit_paid) : null,
        due_date: newItem.due_date || null,
        paid: newItem.paid,
        notes: newItem.notes
      })
      .select()
      .single()
    setItems([...items, data])
    setNewItem({
      category: CATEGORIES[0], item_name: "", estimated_cost: "",
      actual_cost: "", deposit_paid: "", due_date: "", paid: false, notes: ""
    })
    setShowForm(false)
  }

  async function togglePaid(item) {
    const { data } = await supabase
      .from("budget_items")
      .update({ paid: !item.paid })
      .eq("id", item.id)
      .select()
      .single()
    setItems(items.map(i => i.id === item.id ? data : i))
  }

  async function deleteItem(id) {
    await supabase.from("budget_items").delete().eq("id", id)
    setItems(items.filter(i => i.id !== id))
  }

  // Calculations
  const totalEstimated = items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
  const totalActual = items.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
  const totalDeposits = items.reduce((sum, i) => sum + (i.deposit_paid || 0), 0)
  const remaining = totalBudget - totalActual
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0

  // Chart data by category
  const categoryTotals = CATEGORIES.map(cat => ({
    name: cat,
    value: items.filter(i => i.category === cat).reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
  })).filter(c => c.value > 0)

  // Group items by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  if (loading) return <p className="text-rose-400">Loading budget...</p>

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Budget</p>
          {editingBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={totalBudget}
                onChange={e => setTotalBudget(parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <button onClick={saveTotalBudget} className="text-rose-600">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingBudget(true)} className="text-left w-full">
              <p className="text-2xl font-bold text-rose-700">${totalBudget.toLocaleString()}</p>
              <p className="text-xs text-gray-400">tap to edit</p>
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Estimated Total</p>
          <p className="text-2xl font-bold text-gray-700">${totalEstimated.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{items.length} items</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Actual Spent</p>
          <p className="text-2xl font-bold text-gray-700">${totalActual.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{budgetUsedPct}% of budget</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${remaining >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${remaining >= 0 ? "text-green-700" : "text-red-700"}`}>
            ${Math.abs(remaining).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{remaining >= 0 ? "under budget" : "over budget"}</p>
        </div>
      </div>

      {/* Chart + Add button row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pie chart */}
        {categoryTotals.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Budget by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryTotals}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {categoryTotals.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Budget progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Budget Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Actual vs Budget</span>
                <span>{budgetUsedPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetUsedPct > 100 ? "bg-red-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Estimated vs Budget</span>
                <span>{totalBudget > 0 ? Math.round((totalEstimated / totalBudget) * 100) : 0}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(totalBudget > 0 ? (totalEstimated / totalBudget) * 100 : 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="pt-2 border-t grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Deposits Paid</p>
                <p className="font-semibold text-gray-700">${totalDeposits.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Items Paid</p>
                <p className="font-semibold text-gray-700">{items.filter(i => i.paid).length} of {items.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add item button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Budget Items</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Add item form */}
      {showForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-rose-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">New Budget Item</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Item Name</label>
              <input
                value={newItem.item_name}
                onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder="e.g. Grand Ballroom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estimated Cost ($)</label>
              <input
                type="number"
                value={newItem.estimated_cost}
                onChange={e => setNewItem({ ...newItem, estimated_cost: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Actual Cost ($)</label>
              <input
                type="number"
                value={newItem.actual_cost}
                onChange={e => setNewItem({ ...newItem, actual_cost: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Deposit Paid ($)</label>
              <input
                type="number"
                value={newItem.deposit_paid}
                onChange={e => setNewItem({ ...newItem, deposit_paid: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input
                type="date"
                value={newItem.due_date}
                onChange={e => setNewItem({ ...newItem, due_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input
                value={newItem.notes}
                onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Any notes..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={addItem}
              className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition"
            >
              Save Item
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-400">No budget items yet — add your first one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2.5 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700">{category}</h3>
                <span className="text-xs text-slate-500">
                  ${catItems.reduce((s, i) => s + (i.estimated_cost || 0), 0).toLocaleString()} estimated
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-600 border-b bg-slate-200">
                    <th className="text-left px-4 py-2">Item</th>
                    <th className="text-right px-4 py-2">Estimated</th>
                    <th className="text-right px-4 py-2">Actual</th>
                    <th className="text-right px-4 py-2">Deposit</th>
                    <th className="text-center px-4 py-2">Paid</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-rose-50/30"}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-700">{item.item_name}</p>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                        {item.due_date && <p className="text-xs text-gray-400">Due: {item.due_date}</p>}
                      </td>
                      <td className="text-right px-4 py-2.5 text-gray-600">
                        ${(item.estimated_cost || 0).toLocaleString()}
                      </td>
                      <td className="text-right px-4 py-2.5 text-gray-600">
                        {item.actual_cost ? `$${item.actual_cost.toLocaleString()}` : "—"}
                      </td>
                      <td className="text-right px-4 py-2.5 text-gray-600">
                        {item.deposit_paid ? `$${item.deposit_paid.toLocaleString()}` : "—"}
                      </td>
                      <td className="text-center px-4 py-2.5">
                        <button
                          onClick={() => togglePaid(item)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                            item.paid
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300 hover:border-rose-400"
                          }`}
                        >
                          {item.paid && <Check size={12} />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-gray-300 hover:text-red-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}