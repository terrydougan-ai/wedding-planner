import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Plus, Trash2, Users, List, LayoutGrid, AlertTriangle, Settings } from "lucide-react"

export default function Seating({ wedding }) {
  const [tables, setTables] = useState([])
  const [individuals, setIndividuals] = useState([])
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("tables") // "tables" or "guests"
  const [showTableSetup, setShowTableSetup] = useState(false)
  const [newTable, setNewTable] = useState({ table_number: "", table_name: "", max_seats: 8, notes: "" })
  const [bulkCount, setBulkCount] = useState("")
  const [bulkSeats, setBulkSeats] = useState(8)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: tableData }, { data: indData }, { data: partyData }] = await Promise.all([
      supabase.from("seating_tables").select("*").eq("wedding_id", wedding.id).order("table_number"),
      supabase.from("guest_individuals").select("*").eq("wedding_id", wedding.id).order("last_name"),
      supabase.from("guest_parties").select("*").eq("wedding_id", wedding.id)
    ])
    setTables(tableData || [])
    setIndividuals(indData || [])
    setParties(partyData || [])
    setLoading(false)
  }

  // ── Table management ──
  async function addTable() {
    if (!newTable.table_number) return
    const { data } = await supabase
      .from("seating_tables")
      .insert({
        wedding_id: wedding.id,
        table_number: parseInt(newTable.table_number),
        table_name: newTable.table_name || null,
        max_seats: parseInt(newTable.max_seats) || 8,
        notes: newTable.notes || null
      })
      .select().single()
    setTables([...tables, data].sort((a, b) => a.table_number - b.table_number))
    setNewTable({ table_number: "", table_name: "", max_seats: 8, notes: "" })
  }

  async function addBulkTables() {
    if (!bulkCount || parseInt(bulkCount) < 1) return
    const count = parseInt(bulkCount)
    const seats = parseInt(bulkSeats) || 8
    const existingNumbers = tables.map(t => t.table_number)
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1

    const toInsert = Array.from({ length: count }, (_, i) => ({
      wedding_id: wedding.id,
      table_number: nextNumber + i,
      max_seats: seats
    }))

    const { data } = await supabase.from("seating_tables").insert(toInsert).select()
    setTables([...tables, ...(data || [])].sort((a, b) => a.table_number - b.table_number))
    setBulkCount("")
  }

  async function updateTable(id, field, value) {
    const { data } = await supabase
      .from("seating_tables").update({ [field]: value }).eq("id", id).select().single()
    setTables(tables.map(t => t.id === id ? data : t))
  }

  async function deleteTable(id) {
    // Unassign guests from this table first
    await supabase.from("guest_individuals").update({ table_id: null }).eq("table_id", id)
    await supabase.from("seating_tables").delete().eq("id", id)
    setTables(tables.filter(t => t.id !== id))
    setIndividuals(individuals.map(i => i.table_id === id ? { ...i, table_id: null } : i))
  }

  // ── Guest assignment ──
  async function assignGuest(individualId, tableId) {
    const { data } = await supabase
      .from("guest_individuals")
      .update({ table_id: tableId || null })
      .eq("id", individualId)
      .select().single()
    setIndividuals(individuals.map(i => i.id === individualId ? data : i))
  }

  // ── Computed values ──
  function getTableGuests(tableId) {
    return individuals.filter(i => i.table_id === tableId)
  }

  function getUnassigned() {
    return individuals.filter(i => !i.table_id && i.rsvp_status === "Attending")
  }

  function getPartyName(partyId) {
    const party = parties.find(p => p.id === partyId)
    return party?.party_name || ""
  }

  // Check if party is split across tables
  function getSplitParties() {
    const split = []
    parties.forEach(party => {
      const partyMembers = individuals.filter(i =>
        i.party_id === party.id && i.rsvp_status === "Attending" && i.table_id
      )
      if (partyMembers.length < 2) return
      const tableIds = [...new Set(partyMembers.map(i => i.table_id))]
      if (tableIds.length > 1) {
        split.push({
          party,
          tables: tableIds.map(tid => {
            const t = tables.find(t => t.id === tid)
            return t ? `Table ${t.table_number}${t.table_name ? ` (${t.table_name})` : ""}` : "Unknown"
          })
        })
      }
    })
    return split
  }

  const unassigned = getUnassigned()
  const attending = individuals.filter(i => i.rsvp_status === "Attending")
  const totalSeats = tables.reduce((sum, t) => sum + t.max_seats, 0)
  const assignedCount = individuals.filter(i => i.table_id).length
  const splitParties = getSplitParties()

  if (loading) return <p className="text-slate-400">Loading seating chart...</p>

  return (
    <div className="space-y-6">

      {/* Header metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Tables</p>
          <p className="text-2xl font-bold text-slate-700">{tables.length}</p>
          <p className="text-xs text-slate-400">{totalSeats} total seats</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Attending</p>
          <p className="text-2xl font-bold text-slate-700">{attending.length}</p>
          <p className="text-xs text-slate-400">confirmed guests</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${unassigned.length > 0 ? "bg-amber-50" : "bg-green-50"}`}>
          <p className="text-xs text-slate-500 mb-1">Unassigned</p>
          <p className={`text-2xl font-bold ${unassigned.length > 0 ? "text-amber-700" : "text-green-700"}`}>
            {unassigned.length}
          </p>
          <p className="text-xs text-slate-400">need a table</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${totalSeats < attending.length ? "bg-red-50" : "bg-white"}`}>
          <p className="text-xs text-slate-500 mb-1">Seats Remaining</p>
          <p className={`text-2xl font-bold ${totalSeats < attending.length ? "text-red-700" : "text-slate-700"}`}>
            {totalSeats - assignedCount}
          </p>
          <p className="text-xs text-slate-400">of {totalSeats} total</p>
        </div>
      </div>

      {/* Split party warnings */}
      {splitParties.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 mb-1">
                {splitParties.length} party group{splitParties.length > 1 ? "s" : ""} split across tables
              </p>
              {splitParties.map(({ party, tables: partyTables }) => (
                <p key={party.id} className="text-xs text-amber-600">
                  <strong>{party.party_name}</strong> is split across {partyTables.join(", ")}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setView("tables")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "tables" ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <LayoutGrid size={14} /> Tables
            </button>
            <button onClick={() => setView("guests")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${view === "guests" ? "bg-slate-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <List size={14} /> Guest List
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowTableSetup(!showTableSetup)}
          className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition"
        >
          <Settings size={15} /> Manage Tables
        </button>
      </div>

      {/* Table setup panel */}
      {showTableSetup && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Table Setup</h3>

          {/* Bulk add */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Quick Add Multiple Tables</p>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Number of Tables</label>
                <input type="number" min="1" value={bulkCount}
                  onChange={e => setBulkCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Seats Per Table</label>
                <input type="number" min="1" value={bulkSeats}
                  onChange={e => setBulkSeats(e.target.value)}
                  className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={addBulkTables}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                Add Tables
              </button>
            </div>
          </div>

          {/* Add single table */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-3">Add Single Table</p>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Table #</label>
                <input type="number" value={newTable.table_number}
                  onChange={e => setNewTable({ ...newTable, table_number: e.target.value })}
                  placeholder="#"
                  className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Name (optional)</label>
                <input value={newTable.table_name}
                  onChange={e => setNewTable({ ...newTable, table_name: e.target.value })}
                  placeholder="e.g. Head Table"
                  className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Max Seats</label>
                <input type="number" min="1" value={newTable.max_seats}
                  onChange={e => setNewTable({ ...newTable, max_seats: e.target.value })}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={addTable}
                className="flex items-center gap-1 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Existing tables list */}
          {tables.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Existing Tables</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tables.map(table => (
                  <div key={table.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-slate-600 w-16">Table {table.table_number}</span>
                    <input
                      defaultValue={table.table_name || ""}
                      onBlur={e => updateTable(table.id, "table_name", e.target.value || null)}
                      placeholder="Name (optional)"
                      className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <input type="number" min="1"
                        defaultValue={table.max_seats}
                        onBlur={e => updateTable(table.id, "max_seats", parseInt(e.target.value) || 8)}
                        className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-center"
                      />
                      <span className="text-xs text-slate-400">seats</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {getTableGuests(table.id).length} assigned
                    </span>
                    <button onClick={() => deleteTable(table.id)}
                      className="text-slate-300 hover:text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === "tables" && (
        <div>
          {tables.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="text-slate-400">No tables yet — click "Manage Tables" to add some!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map(table => {
                const tableGuests = getTableGuests(table.id)
                const remaining = table.max_seats - tableGuests.length
                const isFull = remaining <= 0
                const isEmpty = tableGuests.length === 0

                return (
                  <div key={table.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${
                      isFull ? "bg-green-50" : isEmpty ? "bg-slate-100" : "bg-slate-200"
                    }`}>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">
                          Table {table.table_number}
                          {table.table_name && <span className="font-normal text-slate-500"> — {table.table_name}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tableGuests.length}/{table.max_seats} seats
                          {isFull && <span className="ml-1 text-green-600 font-medium">· Full</span>}
                          {!isFull && <span className="ml-1 text-slate-400">· {remaining} remaining</span>}
                        </p>
                      </div>
                      {/* Seat capacity bar */}
                      <div className="w-16">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isFull ? "bg-green-500" : "bg-slate-500"}`}
                            style={{ width: `${Math.min((tableGuests.length / table.max_seats) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seated guests */}
                    <div className="p-3 space-y-1 min-h-[80px]">
                      {tableGuests.map(guest => {
                        const partyName = getPartyName(guest.party_id)
                        // Check if this guest's party is split
                        const partySplit = splitParties.find(s => s.party.id === guest.party_id)
                        return (
                          <div key={guest.id}
                            className="flex items-center justify-between group px-2 py-1 rounded hover:bg-slate-50 transition">
                            <div className="flex items-center gap-2 min-w-0">
                              {partySplit && (
                                <AlertTriangle size={10} className="text-amber-400 shrink-0" />
                              )}
                              <span className="text-xs text-slate-700 truncate">
                                {guest.first_name} {guest.last_name}
                              </span>
                              {partyName && (
                                <span className="text-xs text-slate-400 truncate hidden group-hover:inline">
                                  · {partyName}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => assignGuest(guest.id, null)}
                              className="text-slate-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 ml-1"
                              title="Remove from table"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}

                      {/* Add guest dropdown */}
                      {!isFull && unassigned.length > 0 && (
                        <select
                          value=""
                          onChange={e => e.target.value && assignGuest(e.target.value, table.id)}
                          className="w-full text-xs border border-dashed border-slate-300 rounded px-2 py-1 text-slate-400 mt-1 focus:outline-none focus:border-slate-400"
                        >
                          <option value="">+ Add guest...</option>
                          {unassigned
                            .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
                            .map(guest => (
                              <option key={guest.id} value={guest.id}>
                                {guest.last_name}, {guest.first_name}
                                {getPartyName(guest.party_id) ? ` (${getPartyName(guest.party_id)})` : ""}
                              </option>
                            ))}
                        </select>
                      )}

                      {isFull && (
                        <p className="text-xs text-green-600 text-center py-1 italic">Table is full</p>
                      )}
                      {!isFull && unassigned.length === 0 && tableGuests.length === 0 && (
                        <p className="text-xs text-slate-300 text-center py-2 italic">No unassigned guests</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Unassigned guests panel */}
          {unassigned.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-700 mb-3">
                {unassigned.length} guests still need a table
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned
                  .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
                  .map(guest => (
                    <div key={guest.id} className="flex items-center gap-1 bg-white rounded-full px-3 py-1 text-xs text-slate-600 border border-amber-200">
                      <span>{guest.first_name} {guest.last_name}</span>
                      {getPartyName(guest.party_id) && (
                        <span className="text-slate-400">· {getPartyName(guest.party_id)}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GUEST LIST VIEW ── */}
      {view === "guests" && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 bg-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-2">Guest</th>
                <th className="text-left px-4 py-2">Party</th>
                <th className="text-left px-4 py-2">RSVP</th>
                <th className="text-left px-4 py-2">Table Assignment</th>
              </tr>
            </thead>
            <tbody>
              {individuals
                .filter(i => i.rsvp_status === "Attending")
                .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
                .map((guest, i) => {
                  const assignedTable = tables.find(t => t.id === guest.table_id)
                  const partySplit = splitParties.find(s => s.party.id === guest.party_id)
                  return (
                    <tr key={guest.id}
                      className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} ${!guest.table_id ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {partySplit && <AlertTriangle size={11} className="text-amber-400 shrink-0" />}
                          <span className="font-medium text-slate-700">
                            {guest.first_name} {guest.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {getPartyName(guest.party_id)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Attending
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={guest.table_id || ""}
                          onChange={e => assignGuest(guest.id, e.target.value || null)}
                          className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-300 ${
                            !guest.table_id
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <option value="">— Unassigned —</option>
                          {tables.map(table => {
                            const guests = getTableGuests(table.id)
                            const full = guests.length >= table.max_seats && guest.table_id !== table.id
                            return (
                              <option key={table.id} value={table.id} disabled={full}>
                                Table {table.table_number}
                                {table.table_name ? ` — ${table.table_name}` : ""}
                                {" "}({guests.length}/{table.max_seats})
                                {full ? " FULL" : ""}
                              </option>
                            )
                          })}
                        </select>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
