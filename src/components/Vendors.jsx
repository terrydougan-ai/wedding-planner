import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Plus, Trash2, ChevronDown, ChevronUp, Star, Phone, Mail, DollarSign } from "lucide-react"

const VENDOR_TYPES = [
  "Venue", "Photographer", "Videographer", "Caterer", "DJ",
  "Band / Musicians", "Florist", "Hair & Makeup", "Wedding Planner",
  "Officiant", "Wedding Cake / Desserts", "Transportation",
  "Photo Booth", "Lighting", "Rentals", "Invitations / Stationery",
  "Rehearsal Dinner Venue", "Hotel / Accommodations", "Other"
]

const STATUS_OPTIONS = ["Researching", "Contacted", "Meeting Scheduled", "Quote Received", "Booked", "Declined", "Not Needed"]

const statusColors = {
  "Researching": "bg-slate-100 text-slate-600",
  "Contacted": "bg-blue-100 text-blue-700",
  "Meeting Scheduled": "bg-amber-100 text-amber-700",
  "Quote Received": "bg-purple-100 text-purple-700",
  "Booked": "bg-green-100 text-green-700",
  "Declined": "bg-red-100 text-red-600",
  "Not Needed": "bg-slate-100 text-slate-400",
}

const RATING_OPTIONS = ["", "⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]

export default function Vendors({ wedding }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterType, setFilterType] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [newVendor, setNewVendor] = useState({
    vendor_type: VENDOR_TYPES[0], vendor_name: "", contact_name: "",
    phone: "", email: "", website: "", quote_amount: "", payment_terms: "",
    deposit_amount: "", deposit_due_date: "", deposit_paid: false,
    balance_due_date: "", balance_paid: false,
    services_detail: "", rating: "", status: "Researching", notes: ""
  })

  useEffect(() => { loadVendors() }, [])

  async function loadVendors() {
    const { data } = await supabase
      .from("vendors")
      .select("*")
      .eq("wedding_id", wedding.id)
      .order("vendor_type")
    setVendors(data || [])
    setLoading(false)
  }

  async function addVendor() {
    if (!newVendor.vendor_name.trim()) return
    const { data } = await supabase
      .from("vendors")
      .insert({
        wedding_id: wedding.id,
        ...newVendor,
        quote_amount: newVendor.quote_amount ? parseFloat(newVendor.quote_amount) : null,
        deposit_amount: newVendor.deposit_amount ? parseFloat(newVendor.deposit_amount) : null,
        deposit_due_date: newVendor.deposit_due_date || null,
        balance_due_date: newVendor.balance_due_date || null,
      })
      .select().single()
    setVendors([...vendors, data])
    setNewVendor({
      vendor_type: VENDOR_TYPES[0], vendor_name: "", contact_name: "",
      phone: "", email: "", website: "", quote_amount: "", payment_terms: "",
      deposit_amount: "", deposit_due_date: "", deposit_paid: false,
      balance_due_date: "", balance_paid: false,
      services_detail: "", rating: "", status: "Researching", notes: ""
    })
    setShowAddForm(false)
    setExpanded({ ...expanded, [data.id]: true })
  }

  async function updateVendor(id, field, value) {
    const { data } = await supabase
      .from("vendors").update({ [field]: value }).eq("id", id).select().single()
    setVendors(vendors.map(v => v.id === id ? data : v))
  }

  async function deleteVendor(id) {
    await supabase.from("vendors").delete().eq("id", id)
    setVendors(vendors.filter(v => v.id !== id))
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Stats
  const booked = vendors.filter(v => v.status === "Booked").length
  const totalQuoted = vendors
    .filter(v => v.quote_amount)
    .reduce((sum, v) => sum + (parseFloat(v.quote_amount) || 0), 0)
  const totalDeposits = vendors
    .filter(v => v.deposit_amount)
    .reduce((sum, v) => sum + (parseFloat(v.deposit_amount) || 0), 0)

  // Filter
  const filteredVendors = vendors.filter(v => {
    const matchType = filterType === "All" || v.vendor_type === filterType
    const matchStatus = filterStatus === "All" || v.status === filterStatus
    return matchType && matchStatus
  })

  // Group by type
  const grouped = VENDOR_TYPES.reduce((acc, type) => {
    const typeVendors = filteredVendors.filter(v => v.vendor_type === type)
    if (typeVendors.length > 0) acc[type] = typeVendors
    return acc
  }, {})

  if (loading) return <p className="text-slate-400">Loading vendors...</p>

  return (
    <div className="space-y-6">

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Vendors</p>
          <p className="text-2xl font-bold text-slate-700">{vendors.length}</p>
          <p className="text-xs text-slate-400">{booked} booked</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Quoted</p>
          <p className="text-2xl font-bold text-slate-700">
            {totalQuoted > 0 ? `$${totalQuoted.toLocaleString()}` : "—"}
          </p>
          <p className="text-xs text-slate-400">across {vendors.filter(v => v.quote_amount).length} vendors</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Deposits Due</p>
          <p className="text-2xl font-bold text-slate-700">
            {totalDeposits > 0 ? `$${totalDeposits.toLocaleString()}` : "—"}
          </p>
          <p className="text-xs text-slate-400">{vendors.filter(v => v.deposit_paid).length} paid</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option>All</option>
            {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option>All</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Add vendor form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Vendor</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vendor Type</label>
              <select value={newVendor.vendor_type}
                onChange={e => setNewVendor({ ...newVendor, vendor_type: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vendor Name *</label>
              <input value={newVendor.vendor_name}
                onChange={e => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                placeholder="e.g. Riverside Photography"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <select value={newVendor.status}
                onChange={e => setNewVendor({ ...newVendor, status: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Contact Name</label>
              <input value={newVendor.contact_name}
                onChange={e => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Phone</label>
              <input value={newVendor.phone}
                onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <input type="email" value={newVendor.email}
                onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Quote Amount ($)</label>
              <input type="number" value={newVendor.quote_amount}
                onChange={e => setNewVendor({ ...newVendor, quote_amount: e.target.value })}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Deposit Amount ($)</label>
              <input type="number" value={newVendor.deposit_amount}
                onChange={e => setNewVendor({ ...newVendor, deposit_amount: e.target.value })}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Rating</label>
              <select value={newVendor.rating}
                onChange={e => setNewVendor({ ...newVendor, rating: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {RATING_OPTIONS.map(r => <option key={r} value={r}>{r || "No rating"}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Services Detail</label>
              <textarea value={newVendor.services_detail}
                onChange={e => setNewVendor({ ...newVendor, services_detail: e.target.value })}
                placeholder="What's included in the package?"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <input value={newVendor.notes}
                onChange={e => setNewVendor({ ...newVendor, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addVendor}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
              Save Vendor
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vendor list grouped by type */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-slate-400">No vendors yet — add your first one above!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, typeVendors]) => (
            <div key={type}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">{type}</h3>
              <div className="space-y-2">
                {typeVendors.map(vendor => (
                  <div key={vendor.id} className="bg-white rounded-xl shadow-sm overflow-hidden">

                    {/* Vendor header row */}
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition"
                      onClick={() => toggleExpand(vendor.id)}>

                      {expanded[vendor.id]
                        ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={15} className="text-slate-400 shrink-0" />}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-700 text-sm">{vendor.vendor_name}</p>
                          {vendor.rating && <span className="text-xs">{vendor.rating}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[vendor.status]}`}>
                            {vendor.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                          {vendor.contact_name && <span>{vendor.contact_name}</span>}
                          {vendor.phone && <span className="flex items-center gap-1"><Phone size={10} />{vendor.phone}</span>}
                          {vendor.email && <span className="flex items-center gap-1"><Mail size={10} />{vendor.email}</span>}
                          {vendor.quote_amount && (
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <DollarSign size={10} />${parseFloat(vendor.quote_amount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <button onClick={e => { e.stopPropagation(); deleteVendor(vendor.id) }}
                        className="text-slate-200 hover:text-red-400 transition shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {expanded[vendor.id] && (
                      <div className="px-5 py-4 border-t border-slate-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                          {/* Contact */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</p>
                            <EditField label="Vendor Name" value={vendor.vendor_name}
                              onSave={v => updateVendor(vendor.id, "vendor_name", v)} />
                            <EditField label="Contact Name" value={vendor.contact_name}
                              onSave={v => updateVendor(vendor.id, "contact_name", v)} />
                            <EditField label="Phone" value={vendor.phone}
                              onSave={v => updateVendor(vendor.id, "phone", v)} />
                            <EditField label="Email" value={vendor.email}
                              onSave={v => updateVendor(vendor.id, "email", v)} />
                            <EditField label="Website" value={vendor.website}
                              onSave={v => updateVendor(vendor.id, "website", v)} />
                          </div>

                          {/* Financial */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Financial</p>
                            <EditField label="Quote Amount ($)" value={vendor.quote_amount} type="number"
                              onSave={v => updateVendor(vendor.id, "quote_amount", v ? parseFloat(v) : null)} />
                            <EditField label="Payment Terms" value={vendor.payment_terms}
                              onSave={v => updateVendor(vendor.id, "payment_terms", v)} />
                            <EditField label="Deposit Amount ($)" value={vendor.deposit_amount} type="number"
                              onSave={v => updateVendor(vendor.id, "deposit_amount", v ? parseFloat(v) : null)} />
                            <EditField label="Deposit Due Date" value={vendor.deposit_due_date} type="date"
                              onSave={v => updateVendor(vendor.id, "deposit_due_date", v || null)} />
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={vendor.deposit_paid || false}
                                onChange={e => updateVendor(vendor.id, "deposit_paid", e.target.checked)}
                                className="rounded" id={`dep-${vendor.id}`} />
                              <label htmlFor={`dep-${vendor.id}`} className="text-xs text-slate-600">Deposit Paid</label>
                            </div>
                            <EditField label="Balance Due Date" value={vendor.balance_due_date} type="date"
                              onSave={v => updateVendor(vendor.id, "balance_due_date", v || null)} />
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={vendor.balance_paid || false}
                                onChange={e => updateVendor(vendor.id, "balance_paid", e.target.checked)}
                                className="rounded" id={`bal-${vendor.id}`} />
                              <label htmlFor={`bal-${vendor.id}`} className="text-xs text-slate-600">Balance Paid</label>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Details</p>
                            <div>
                              <label className="text-xs text-slate-400 mb-1 block">Status</label>
                              <select value={vendor.status}
                                onChange={e => updateVendor(vendor.id, "status", e.target.value)}
                                className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusColors[vendor.status]}`}>
                                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 mb-1 block">Rating</label>
                              <select value={vendor.rating || ""}
                                onChange={e => updateVendor(vendor.id, "rating", e.target.value)}
                                className="border border-slate-200 rounded px-2 py-1 text-sm">
                                {RATING_OPTIONS.map(r => <option key={r} value={r}>{r || "No rating"}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 mb-1 block">Services Detail</label>
                              <textarea
                                defaultValue={vendor.services_detail || ""}
                                onBlur={e => updateVendor(vendor.id, "services_detail", e.target.value)}
                                placeholder="What's included..."
                                rows={3}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                              <textarea
                                defaultValue={vendor.notes || ""}
                                onBlur={e => updateVendor(vendor.id, "notes", e.target.value)}
                                placeholder="Any other notes..."
                                rows={2}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Inline editable field
function EditField({ label, value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")

  useEffect(() => { setDraft(value || "") }, [value])

  function save() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div>
      <label className="text-xs text-slate-400 mb-0.5 block">{label}</label>
      {editing ? (
        <input autoFocus type={type} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
          className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
      ) : (
        <p onClick={() => setEditing(true)}
          className="text-xs text-slate-600 cursor-pointer hover:text-slate-800 hover:underline min-h-[20px]">
          {value || <span className="text-slate-300 italic">click to add</span>}
        </p>
      )}
    </div>
  )
}
