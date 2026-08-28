import { useState, useRef } from "react"
import { supabase } from "../supabase"
import { Upload, Download, X, Check, AlertCircle } from "lucide-react"

const EXPECTED_COLUMNS = [
  "Party Name", "First Name", "Last Name",
  "Address Line 1", "Address Line 2", "City", "State", "ZIP",
  "Age Category", "Dietary", "RSVP Status", "Table", "Notes"
]

const TEMPLATE_CSV = `Party Name,First Name,Last Name,Address Line 1,Address Line 2,City,State,ZIP,Age Category,Dietary,RSVP Status,Table,Notes
The Smith Family,John,Smith,123 Main St,,Ann Arbor,MI,48104,,Vegetarian,Pending,,
The Smith Family,Jane,Smith,,,,,,,,Pending,,
The Johnson Party,Mike,Johnson,456 Oak Ave,,Detroit,MI,48201,Under 21,Nut allergy,Pending,,
The Johnson Party,Sarah,Johnson,,,,,,,,Pending,,`

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error("File must have a header row and at least one data row.")

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))

  // Check for required columns
  const missing = ["Party Name", "First Name"].filter(c => !headers.includes(c))
  if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(", ")}`)

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas
    const values = []
    let current = ""
    let inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").replace(/^"|"$/g, "").trim()
    })

    if (row["First Name"]) rows.push(row)
  }

  return rows
}

function parseXLSX(buffer) {
  // Basic XLSX parsing using SheetJS would go here
  // For now we'll tell users to save as CSV
  throw new Error("Please save your Excel file as CSV (.csv) before uploading.")
}

export default function GuestImport({ wedding, onImportComplete }) {
  const [showImport, setShowImport] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [editedRows, setEditedRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState("")
  const fileRef = useRef()

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "guest_list_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError("")
    setParsed(null)
    setImportResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      setParsed(rows)
      setEditedRows(rows.map(r => ({ ...r })))
    } catch (err) {
      setError(err.message)
    }

    // Reset file input
    e.target.value = ""
  }

  function updateRow(idx, field, value) {
    const updated = [...editedRows]
    updated[idx] = { ...updated[idx], [field]: value }
    setEditedRows(updated)
  }

  // Group rows by party for preview
  function groupByParty(rows) {
    const groups = {}
    rows.forEach((row, idx) => {
      const partyName = row["Party Name"] || "No Party"
      if (!groups[partyName]) groups[partyName] = []
      groups[partyName].push({ ...row, _idx: idx })
    })
    return groups
  }

  async function confirmImport() {
    setImporting(true)
    setError("")

    try {
      const groups = groupByParty(editedRows)
      let partiesCreated = 0
      let individualsCreated = 0

      for (const [partyName, members] of Object.entries(groups)) {
        // Find address from first member that has one
        const addressRow = members.find(m => m["Address Line 1"]) || members[0]

        // Create party
        const { data: party, error: partyError } = await supabase
          .from("guest_parties")
          .insert({
            wedding_id: wedding.id,
            party_name: partyName,
            address_line1: addressRow["Address Line 1"] || null,
            address_line2: addressRow["Address Line 2"] || null,
            city: addressRow["City"] || null,
            state: addressRow["State"] || null,
            zip: addressRow["ZIP"] || null,
            country: "USA"
          })
          .select()
          .single()

        if (partyError) throw new Error(`Failed to create party "${partyName}": ${partyError.message}`)
        partiesCreated++

        // Create individuals
        for (const member of members) {
          const ageCategory = member["Age Category"]
          const validAge = ["Under 10", "Under 21"].includes(ageCategory) ? ageCategory : null

          const rsvpStatus = ["Pending", "Attending", "Declined", "Maybe"].includes(member["RSVP Status"])
            ? member["RSVP Status"]
            : "Pending"

          const { error: indError } = await supabase
            .from("guest_individuals")
            .insert({
              wedding_id: wedding.id,
              party_id: party.id,
              first_name: member["First Name"],
              last_name: member["Last Name"] || null,
              age_category: validAge,
              dietary: member["Dietary"] || null,
              rsvp_status: rsvpStatus,
              table_number: member["Table"] ? parseInt(member["Table"]) || null : null,
              notes: member["Notes"] || null
            })

          if (indError) throw new Error(`Failed to create guest "${member["First Name"]}": ${indError.message}`)
          individualsCreated++
        }
      }

      setImportResult({ partiesCreated, individualsCreated })
      setParsed(null)
      setEditedRows([])
      onImportComplete()

    } catch (err) {
      setError(err.message)
    }

    setImporting(false)
  }

  function reset() {
    setParsed(null)
    setEditedRows([])
    setImportResult(null)
    setError("")
    setShowImport(false)
  }

  const groups = editedRows.length > 0 ? groupByParty(editedRows) : {}

  return (
    <div>
      {/* Import button */}
      <button
        onClick={() => setShowImport(!showImport)}
        className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 transition"
      >
        <Upload size={15} />
        Import CSV
      </button>

      {/* Import panel */}
      {showImport && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5">

          {/* Success state */}
          {importResult && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-green-600" />
              </div>
              <p className="text-lg font-semibold text-slate-700">Import Complete!</p>
              <p className="text-slate-500 text-sm mt-1">
                {importResult.partiesCreated} parties · {importResult.individualsCreated} guests added
              </p>
              <button
                onClick={reset}
                className="mt-4 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          )}

          {/* Upload state */}
          {!importResult && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Import Guest List from CSV</h3>
                <button onClick={reset} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Step 1 — Download template */}
              {!parsed && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Step 1 — Download the template</p>
                    <p className="text-xs text-slate-400 mb-3">
                      Fill it in with your guest list. One row per person. Use the same Party Name for people in the same household.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
                    >
                      <Download size={13} />
                      Download Template (CSV)
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Step 2 — Upload your CSV</p>
                    <p className="text-xs text-slate-400 mb-3">
                      CSV files only. If you have an Excel file save it as CSV first (File → Save As → CSV).
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current.click()}
                      className="flex items-center gap-1.5 text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Upload size={13} />
                      Choose CSV File
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Preview and edit */}
              {parsed && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Preview — {editedRows.length} guests in {Object.keys(groups).length} parties
                    </p>
                    <button
                      onClick={() => { setParsed(null); setEditedRows([]) }}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ← Upload different file
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Review and edit before importing. You can change Party Names to regroup guests.
                  </p>

                  {/* Preview grouped by party */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(groups).map(([partyName, members]) => (
                      <div key={partyName} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-600">
                            📨 {partyName} ({members.length} guest{members.length !== 1 ? "s" : ""})
                          </p>
                          {/* Show address if present */}
                          {members[0]["Address Line 1"] && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {[members[0]["Address Line 1"], members[0]["City"], members[0]["State"], members[0]["ZIP"]].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 bg-white">
                              <th className="text-left px-3 py-1.5">Party Name</th>
                              <th className="text-left px-3 py-1.5">First Name</th>
                              <th className="text-left px-3 py-1.5">Last Name</th>
                              <th className="text-left px-3 py-1.5">Age</th>
                              <th className="text-left px-3 py-1.5">Dietary</th>
                              <th className="text-left px-3 py-1.5">RSVP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((member) => (
                              <tr key={member._idx} className="border-b border-slate-50 last:border-0">
                                <td className="px-3 py-1.5">
                                  <input
                                    value={member["Party Name"]}
                                    onChange={e => updateRow(member._idx, "Party Name", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    value={member["First Name"]}
                                    onChange={e => updateRow(member._idx, "First Name", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    value={member["Last Name"]}
                                    onChange={e => updateRow(member._idx, "Last Name", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <select
                                    value={member["Age Category"]}
                                    onChange={e => updateRow(member._idx, "Age Category", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                                  >
                                    <option value="">Adult</option>
                                    <option>Under 10</option>
                                    <option>Under 21</option>
                                  </select>
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    value={member["Dietary"]}
                                    onChange={e => updateRow(member._idx, "Dietary", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <select
                                    value={member["RSVP Status"] || "Pending"}
                                    onChange={e => updateRow(member._idx, "RSVP Status", e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                                  >
                                    <option>Pending</option>
                                    <option>Attending</option>
                                    <option>Declined</option>
                                    <option>Maybe</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={confirmImport}
                      disabled={importing}
                      className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      <Check size={15} />
                      {importing ? "Importing..." : `Import ${editedRows.length} Guests`}
                    </button>
                    <button
                      onClick={reset}
                      className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
