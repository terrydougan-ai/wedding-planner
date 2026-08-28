import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { Plus, Trash2, Search, ChevronDown, ChevronUp, MapPin, User } from "lucide-react"
import GuestImport from "./GuestImport"

const RSVP_OPTIONS = ["Pending", "Attending", "Declined", "Maybe"]
const AGE_OPTIONS = ["", "Under 10", "Under 21"]

const rsvpColors = {
  "Attending": "bg-green-100 text-green-700",
  "Declined": "bg-red-100 text-red-700",
  "Maybe": "bg-amber-100 text-amber-700",
  "Pending": "bg-slate-100 text-slate-600"
}

export default function Guests({ wedding }) {
  const [parties, setParties] = useState([])
  const [individuals, setIndividuals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterRSVP, setFilterRSVP] = useState("All")
  const [expandedParties, setExpandedParties] = useState({})
  const [showAddressModal, setShowAddressModal] = useState(null)

  // Add party form
  const [showPartyForm, setShowPartyForm] = useState(false)
  const [newParty, setNewParty] = useState({
    party_name: "", address_line1: "", address_line2: "",
    city: "", state: "", zip: "", country: "USA", notes: ""
  })

  // Add individual form (per party)
  const [showIndividualForm, setShowIndividualForm] = useState(null)
  const [newIndividual, setNewIndividual] = useState({
    first_name: "", last_name: "", age_category: "",
    dietary: "", rsvp_status: "Pending", table_number: "", notes: ""
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: partyData }, { data: indData }] = await Promise.all([
      supabase.from("guest_parties").select("*").eq("wedding_id", wedding.id).order("party_name"),
      supabase.from("guest_individuals").select("*").eq("wedding_id", wedding.id).order("last_name")
    ])
    setParties(partyData || [])
    setIndividuals(indData || [])
    // Expand all parties by default
    const expanded = {}
    ;(partyData || []).forEach(p => { expanded[p.id] = true })
    setExpandedParties(expanded)
    setLoading(false)
  }

  // ── Party actions ──
  async function addParty() {
    if (!newParty.party_name.trim()) return
    const { data } = await supabase
      .from("guest_parties")
      .insert({ wedding_id: wedding.id, ...newParty })
      .select()
      .single()
    setParties([...parties, data])
    setExpandedParties({ ...expandedParties, [data.id]: true })
    setNewParty({
      party_name: "", address_line1: "", address_line2: "",
      city: "", state: "", zip: "", country: "USA", notes: ""
    })
    setShowPartyForm(false)
  }

  async function togglePartyField(party, field) {
    const { data } = await supabase
      .from("guest_parties")
      .update({ [field]: !party[field] })
      .eq("id", party.id)
      .select()
      .single()
    setParties(parties.map(p => p.id === party.id ? data : p))
  }

  async function saveAddress(party, addressData) {
    const { data } = await supabase
      .from("guest_parties")
      .update(addressData)
      .eq("id", party.id)
      .select()
      .single()
    setParties(parties.map(p => p.id === party.id ? data : p))
    setShowAddressModal(null)
  }

  async function deleteParty(id) {
    await supabase.from("guest_parties").delete().eq("id", id)
    setParties(parties.filter(p => p.id !== id))
    setIndividuals(individuals.filter(i => i.party_id !== id))
  }

  // ── Individual actions ──
  async function addIndividual(partyId) {
    if (!newIndividual.first_name.trim()) return
    const { data } = await supabase
      .from("guest_individuals")
      .insert({
        wedding_id: wedding.id,
        party_id: partyId,
        ...newIndividual,
        table_number: newIndividual.table_number ? parseInt(newIndividual.table_number) : null,
        age_category: newIndividual.age_category || null
      })
      .select()
      .single()
    setIndividuals([...individuals, data])
    setNewIndividual({
      first_name: "", last_name: "", age_category: "",
      dietary: "", rsvp_status: "Pending", table_number: "", notes: ""
    })
    setShowIndividualForm(null)
  }

  async function updateIndividualRSVP(ind, rsvp_status) {
    const { data } = await supabase
      .from("guest_individuals")
      .update({ rsvp_status })
      .eq("id", ind.id)
      .select()
      .single()
    setIndividuals(individuals.map(i => i.id === ind.id ? data : i))
  }

  async function toggleIndividualField(ind, field) {
    const { data } = await supabase
      .from("guest_individuals")
      .update({ [field]: !ind[field] })
      .eq("id", ind.id)
      .select()
      .single()
    setIndividuals(individuals.map(i => i.id === ind.id ? data : i))
  }

  async function deleteIndividual(id) {
    await supabase.from("guest_individuals").delete().eq("id", id)
    setIndividuals(individuals.filter(i => i.id !== id))
  }

  // ── Stats ──
  const totalInvited = individuals.length
  const attending = individuals.filter(i => i.rsvp_status === "Attending").length
  const declined = individuals.filter(i => i.rsvp_status === "Declined").length
  const pending = individuals.filter(i => i.rsvp_status === "Pending").length
  const stdSent = parties.filter(p => p.save_the_date_sent).length
  const invitesSent = parties.filter(p => p.invitation_sent).length
  const thankYouSent = individuals.filter(i => i.thank_you_sent).length

  // ── Filter parties ──
  const filteredParties = parties.filter(party => {
    const partyInds = individuals.filter(i => i.party_id === party.id)
    const matchSearch = search === "" ||
      party.party_name.toLowerCase().includes(search.toLowerCase()) ||
      partyInds.some(i => `${i.first_name} ${i.last_name}`.toLowerCase().includes(search.toLowerCase()))
    const matchRSVP = filterRSVP === "All" ||
      partyInds.some(i => i.rsvp_status === filterRSVP)
    return matchSearch && matchRSVP
  })

  if (loading) return <p className="text-slate-400">Loading guests...</p>

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total Invited</p>
          <p className="text-2xl font-bold text-slate-700">{totalInvited}</p>
          <p className="text-xs text-slate-400">{parties.length} parties</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Attending</p>
          <p className="text-2xl font-bold text-green-700">{attending}</p>
          <p className="text-xs text-slate-400">{totalInvited > 0 ? Math.round((attending / totalInvited) * 100) : 0}% response rate</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Declined</p>
          <p className="text-2xl font-bold text-red-700">{declined}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{pending}</p>
        </div>
      </div>

      {/* Mailing stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{stdSent}</p>
          <p className="text-xs text-slate-400">of {parties.length} Save the Dates sent</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{invitesSent}</p>
          <p className="text-xs text-slate-400">of {parties.length} Invitations sent</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-700">{thankYouSent}</p>
          <p className="text-xs text-slate-400">of {attending} Thank Yous sent</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guests or parties..."
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-56"
            />
          </div>
          <select
            value={filterRSVP}
            onChange={e => setFilterRSVP(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option>All</option>
            {RSVP_OPTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
                <div className="flex gap-2">
          <GuestImport wedding={wedding} onImportComplete={loadAll} />
          <button
            onClick={() => setShowPartyForm(!showPartyForm)}
            className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            <Plus size={16} />
            Add Party
          </button>
        </div>
      </div>

      {/* Add party form */}
      {showPartyForm && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Party / Household</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Party Name *</label>
              <input
                value={newParty.party_name}
                onChange={e => setNewParty({ ...newParty, party_name: e.target.value })}
                placeholder="e.g. The Smith Family"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Address Line 1</label>
              <input
                value={newParty.address_line1}
                onChange={e => setNewParty({ ...newParty, address_line1: e.target.value })}
                placeholder="123 Main St"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">City</label>
              <input
                value={newParty.city}
                onChange={e => setNewParty({ ...newParty, city: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">State</label>
              <input
                value={newParty.state}
                onChange={e => setNewParty({ ...newParty, state: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ZIP</label>
              <input
                value={newParty.zip}
                onChange={e => setNewParty({ ...newParty, zip: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <input
                value={newParty.notes}
                onChange={e => setNewParty({ ...newParty, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addParty} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
              Save Party
            </button>
            <button onClick={() => setShowPartyForm(false)} className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Address modal */}
      {showAddressModal && (
        <AddressModal
          party={showAddressModal}
          onSave={saveAddress}
          onClose={() => setShowAddressModal(null)}
        />
      )}

      {/* Party list */}
      {filteredParties.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-slate-400">No parties found — add your first one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParties.map(party => {
            const partyInds = individuals.filter(i => i.party_id === party.id)
            const isExpanded = expandedParties[party.id]
            const partyAttending = partyInds.filter(i => i.rsvp_status === "Attending").length

            return (
              <div key={party.id} className="bg-white rounded-xl shadow-sm overflow-hidden">

                {/* Party header */}
                <div className="bg-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedParties({ ...expandedParties, [party.id]: !isExpanded })}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{party.party_name}</p>
                      <p className="text-xs text-slate-400">
                        {partyInds.length} guest{partyInds.length !== 1 ? "s" : ""} · {partyAttending} attending
                      </p>
                    </div>
                  </div>

                  {/* Party controls */}
                  <div className="flex items-center gap-2">
                    {/* Save the Date */}
                    <button
                      onClick={() => togglePartyField(party, "save_the_date_sent")}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                        party.save_the_date_sent
                          ? "bg-slate-600 text-white border-slate-600"
                          : "bg-white text-slate-500 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {party.save_the_date_sent ? "✓ STD" : "STD"}
                    </button>

                    {/* Invitation */}
                    <button
                      onClick={() => togglePartyField(party, "invitation_sent")}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                        party.invitation_sent
                          ? "bg-slate-600 text-white border-slate-600"
                          : "bg-white text-slate-500 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {party.invitation_sent ? "✓ Invited" : "Invite"}
                    </button>

                    {/* Address */}
                    <button
                      onClick={() => setShowAddressModal(party)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${
                        party.address_line1
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-white text-slate-500 border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <MapPin size={11} className="inline mr-1" />
                      {party.address_line1 ? "Address ✓" : "Address"}
                    </button>

                    {/* Add guest to party */}
                    <button
                      onClick={() => {
                        setShowIndividualForm(party.id)
                        setExpandedParties({ ...expandedParties, [party.id]: true })
                      }}
                      className="text-xs px-2.5 py-1 rounded-full border bg-white text-slate-500 border-slate-300 hover:border-slate-500 transition"
                    >
                      <User size={11} className="inline mr-1" />
                      Add Guest
                    </button>

                    {/* Delete party */}
                    <button
                      onClick={() => deleteParty(party.id)}
                      className="text-slate-300 hover:text-red-400 transition ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Individuals */}
                {isExpanded && (
                  <div>
                    {/* Add individual form */}
                    {showIndividualForm === party.id && (
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Add Guest to {party.party_name}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">First Name *</label>
                            <input
                              value={newIndividual.first_name}
                              onChange={e => setNewIndividual({ ...newIndividual, first_name: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Last Name</label>
                            <input
                              value={newIndividual.last_name}
                              onChange={e => setNewIndividual({ ...newIndividual, last_name: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Age Category</label>
                            <select
                              value={newIndividual.age_category}
                              onChange={e => setNewIndividual({ ...newIndividual, age_category: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            >
                              <option value="">Adult</option>
                              {AGE_OPTIONS.filter(a => a).map(a => <option key={a}>{a}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">RSVP</label>
                            <select
                              value={newIndividual.rsvp_status}
                              onChange={e => setNewIndividual({ ...newIndividual, rsvp_status: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            >
                              {RSVP_OPTIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400 mb-1 block">Dietary Preferences / Allergies</label>
                            <input
                              value={newIndividual.dietary}
                              onChange={e => setNewIndividual({ ...newIndividual, dietary: e.target.value })}
                              placeholder="e.g. Vegetarian, Nut allergy"
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Table #</label>
                            <input
                              type="number"
                              value={newIndividual.table_number}
                              onChange={e => setNewIndividual({ ...newIndividual, table_number: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                            <input
                              value={newIndividual.notes}
                              onChange={e => setNewIndividual({ ...newIndividual, notes: e.target.value })}
                              className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => addIndividual(party.id)}
                            className="bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-800 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setShowIndividualForm(null)}
                            className="text-slate-500 px-3 py-1.5 rounded text-xs hover:bg-slate-100 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Individual rows */}
                    {partyInds.length === 0 ? (
                      <p className="text-xs text-slate-400 px-4 py-3 italic">
                        No guests added yet — click "Add Guest" above
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 bg-slate-100 border-b border-slate-200">
                            <th className="text-left px-6 py-2">Name</th>
                            <th className="text-left px-4 py-2">Age</th>
                            <th className="text-left px-4 py-2">RSVP</th>
                            <th className="text-left px-4 py-2">Dietary</th>
                            <th className="text-center px-4 py-2">Table</th>
                            <th className="text-center px-4 py-2">TY</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {partyInds.map((ind, i) => (
                            <tr key={ind.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                              <td className="px-6 py-2.5">
                                <p className="text-slate-700 font-medium text-sm">
                                  {ind.first_name} {ind.last_name}
                                </p>
                                {ind.notes && <p className="text-xs text-slate-400">{ind.notes}</p>}
                              </td>
                              <td className="px-4 py-2.5">
                                {ind.age_category ? (
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                    {ind.age_category}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300">Adult</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <select
                                  value={ind.rsvp_status}
                                  onChange={e => updateIndividualRSVP(ind, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${rsvpColors[ind.rsvp_status]}`}
                                >
                                  {RSVP_OPTIONS.map(r => <option key={r}>{r}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-500">
                                {ind.dietary || "—"}
                              </td>
                              <td className="text-center px-4 py-2.5 text-slate-500 text-sm">
                                {ind.table_number || "—"}
                              </td>
                              <td className="text-center px-4 py-2.5">
                                <button
                                  onClick={() => toggleIndividualField(ind, "thank_you_sent")}
                                  title="Thank you sent"
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition ${
                                    ind.thank_you_sent
                                      ? "bg-slate-600 border-slate-600 text-white"
                                      : "border-slate-300 hover:border-slate-500"
                                  }`}
                                >
                                  {ind.thank_you_sent && <span className="text-white text-xs">✓</span>}
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => deleteIndividual(ind.id)}
                                  className="text-slate-300 hover:text-red-400 transition"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        {filteredParties.length} of {parties.length} parties · {totalInvited} individuals
      </p>
    </div>
  )
}

// ── Address Modal ──
function AddressModal({ party, onSave, onClose }) {
  const [form, setForm] = useState({
    address_line1: party.address_line1 || "",
    address_line2: party.address_line2 || "",
    city: party.city || "",
    state: party.state || "",
    zip: party.zip || "",
    country: party.country || "USA"
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-base font-semibold text-slate-700 mb-4">
          Address — {party.party_name}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Address Line 1</label>
            <input
              value={form.address_line1}
              onChange={e => setForm({ ...form, address_line1: e.target.value })}
              placeholder="123 Main St"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Address Line 2</label>
            <input
              value={form.address_line2}
              onChange={e => setForm({ ...form, address_line2: e.target.value })}
              placeholder="Apt, Suite, etc."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-xs text-slate-500 mb-1 block">City</label>
              <input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">State</label>
              <input
                value={form.state}
                onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ZIP</label>
              <input
                value={form.zip}
                onChange={e => setForm({ ...form, zip: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Country</label>
            <input
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Address preview */}
        {form.address_line1 && (
          <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700 mb-1">{party.party_name}</p>
            <p>{form.address_line1}</p>
            {form.address_line2 && <p>{form.address_line2}</p>}
            <p>{[form.city, form.state, form.zip].filter(Boolean).join(", ")}</p>
            {form.country !== "USA" && <p>{form.country}</p>}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave(party, form)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            Save Address
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
