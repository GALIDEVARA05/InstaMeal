import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

// Avatar placeholder for missing images
const placeholderFor = (name) =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(
    name || "Meal"
  )}`;

// Error fallback (keeps it as you had)
function ErrorFallback({ error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
      <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
      <pre className="text-red-800 bg-red-100 p-4 rounded-xl max-w-xl overflow-x-auto">
        {error?.message || String(error)}
      </pre>
      <button className="mt-4 px-4 py-2 bg-red-500 text-white rounded" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}

export default function CashierPage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("student"); // "student" | "manual"
  const [rollNo, setRollNo] = useState("");
  const [cardId, setCardId] = useState(null);

  // Student Items Tab
  const [studentItems, setStudentItems] = useState([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState("");

  // Manual Add Items Tab
  const [meals, setMeals] = useState([]);
  const [manualItems, setManualItems] = useState({}); // { mealId: { meal, quantity } }
  const [manualTotal, setManualTotal] = useState(0);

  // Filters + Search (same as StudentPage)
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Error fallback state
  const [error, setError] = useState(null);

  // Load meals once (for manual tab)
  useEffect(() => {
    fetchMeals();
  }, []);

  async function fetchMeals() {
    try {
      const res = await api.get("/meals");
      setMeals(res.data || []);
    } catch (e) {
      toast.error("Failed to load meals");
    }
  }

  // =============================
  // STUDENT ITEMS TAB
  // =============================
  async function fetchStudentItems() {
    if (!rollNo.trim()) return toast.error("Enter roll number");
    try {
      setStudentLoading(true);
      setStudentFetchError("");
      const cardRes = await api.get(`/cards/student/${rollNo}`);
      if (!cardRes.data || cardRes.data.length === 0) {
        setStudentItems([]);
        setStudentTotal(0);
        setCardId(null);
        setStudentFetchError("No card found for this student");
        return toast.error("No card found for this student");
      }
  const c = cardRes.data[0];
  setCardId(c._id);

  const itemsRes = await api.get(`/cards/items/${c._id}`);
  const data = itemsRes.data || {};
  // Debug log
  console.log("[CashierPage] cardId:", c._id);
  console.log("[CashierPage] selectedItems from API:", data.selectedItems);
  setStudentItems(data.selectedItems || []);
  setStudentTotal(data.totalCost || 0);
    } catch (e) {
      setStudentItems([]);
      setStudentTotal(0);
      setCardId(null);
      const msg = e?.response?.data?.message || "Failed to fetch student items";
      setStudentFetchError(msg);
      toast.error(msg);
    } finally {
      setStudentLoading(false);
    }
  }

  async function chargeStudentItems() {
    if (!cardId) return toast.error("No card found");
    if (studentItems.length === 0) return toast.error("No items selected by student");

    try {
      const res = await api.post("/cards/finalize-purchase", { cardId });
      toast.success(res.data.message || "Purchase successful");
      setStudentItems([]);
      setStudentTotal(0);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to finalize purchase");
    }
  }

  // Optimistic add/remove for student items (so UI updates instantly)
  async function addStudentItem(mealId, qty = 1) {
    if (!cardId) return toast.error("Load student card first");
    // optimistic update
    setStudentItems((prev) => {
      const items = [...prev];
      const idx = items.findIndex((it) => it.meal?._id === mealId);
      if (idx > -1) {
        items[idx] = { ...items[idx], quantity: (items[idx].quantity || 0) + qty };
      } else {
        const meal = meals.find((m) => m._id === mealId) || { _id: mealId, name: "Item", price: 0 };
        items.push({ meal, quantity: qty });
      }
      return items;
    });
    setStudentTotal((prev) => prev + (meals.find((m) => m._id === mealId)?.price || 0) * qty);

    // backend call
    try {
      await api.post("/cards/add-item", { cardId, mealId, quantity: qty });
      // refresh authoritative state
      await fetchStudentItems();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to add item");
      // optionally refetch to reconcile
      await fetchStudentItems();
    }
  }

  async function removeStudentItem(mealId) {
    if (!cardId) return toast.error("Load student card first");
    // optimistic update
    setStudentItems((prev) => {
      const items = [...prev];
      const idx = items.findIndex((it) => it.meal?._id === mealId);
      if (idx > -1) {
        const newQty = (items[idx].quantity || 0) - 1;
        if (newQty > 0) items[idx] = { ...items[idx], quantity: newQty };
        else items.splice(idx, 1);
      }
      return items;
    });
    setStudentTotal((prev) => {
      const price = meals.find((m) => m._id === mealId)?.price || 0;
      return Math.max(0, prev - price);
    });

    try {
      await api.post("/cards/remove-item", { cardId, mealId });
      await fetchStudentItems();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to remove item");
      await fetchStudentItems();
    }
  }

  // =============================
  // MANUAL ADD ITEMS TAB
  // =============================
  function addItem(meal) {
    setManualItems((prev) => {
      const qty = (prev[meal._id]?.quantity || 0) + 1;
      return { ...prev, [meal._id]: { meal, quantity: qty } };
    });
  }

  function removeItem(mealId) {
    setManualItems((prev) => {
      if (!prev[mealId]) return prev;
      const qty = prev[mealId].quantity - 1;
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[mealId];
        return copy;
      }
      return { ...prev, [mealId]: { ...prev[mealId], quantity: qty } };
    });
  }

  function removeAll(mealId) {
    setManualItems((prev) => {
      const copy = { ...prev };
      delete copy[mealId];
      return copy;
    });
  }

  useEffect(() => {
    const total = Object.values(manualItems).reduce(
      (sum, i) => sum + (i.meal?.price || 0) * (i.quantity || 0),
      0
    );
    setManualTotal(total);
  }, [manualItems]);

  async function chargeManualPurchase() {
    if (!rollNo.trim()) return toast.error("Enter roll number");
    if (manualTotal <= 0) return toast.error("No items selected");

    try {
      const cardRes = await api.get(`/cards/student/${rollNo}`);
      if (!cardRes.data || cardRes.data.length === 0) return toast.error("No card found for this student");
      const c = cardRes.data[0];
      setCardId(c._id);

      const res = await api.post("/cards/purchase", {
        cardId: c._id,
        amount: manualTotal,
        note: "Manual cashier purchase",
      });
      toast.success(res.data.message || "Purchase successful");
      setManualItems({});
      setManualTotal(0);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Manual purchase failed");
    }
  }

  // =============================
  // FILTERING + SEARCH (for manual list)
  // =============================
  const filteredMeals = useMemo(() => {
    let list = meals || [];
    if (filter !== "All") {
      if (["Breakfast", "Lunch", "Snacks", "Dinner"].includes(filter)) {
        list = list.filter((m) => m.category?.toLowerCase() === filter.toLowerCase());
      } else if (["Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].includes(filter)) {
        const keyword = filter.toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
        list = list.filter((m) => m.name?.toLowerCase().replace(/\s+/g, "").includes(keyword));
      }
    }
    if (search.trim() !== "") {
      list = list.filter((m) => m.name?.toLowerCase().includes(search.trim().toLowerCase()));
    }
    return list;
  }, [meals, filter, search]);

  // =============================
  // LOGOUT
  // =============================
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("✅ Logged out successfully!");
    setTimeout(() => nav("/login"), 1200);
  }

  // =============================
  // RENDER
  // =============================
  try {
    if (error) return <ErrorFallback error={error} />;

    return (
      <div className="min-h-screen relative flex items-start justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-6">
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transform text-white px-5 py-2 rounded-xl shadow-md transition"
        >
          Logout
        </button>

        {/* Layout: Dashboard (left) + Selected Items Panel (right/outside) */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
          {/* Main Cashier Dashboard (left) */}
          <div className="bg-white/95 backdrop-blur-lg p-10 rounded-2xl shadow-2xl flex-1 border border-gray-200">
            <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-4">💳 Cashier Dashboard</h2>

            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setActiveTab("student")}
                className={`px-6 py-3 rounded-xl font-bold ${
                  activeTab === "student" ? "bg-indigo-600 text-white shadow-md" : "bg-gray-200 text-gray-700"
                }`}
              >
                Student Items
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-6 py-3 rounded-xl font-bold ${
                  activeTab === "manual" ? "bg-indigo-600 text-white shadow-md" : "bg-gray-200 text-gray-700"
                }`}
              >
                Manual Add Items
              </button>
            </div>

            {/* Common Roll No Input */}
            <div className="flex gap-3 mb-6">
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter Roll No"
              />
              {activeTab === "student" && (
                <button
                  onClick={fetchStudentItems}
                  className="px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:scale-105 transform transition"
                  disabled={studentLoading}
                >
                  {studentLoading ? "Loading..." : "View Items"}
                </button>
              )}
            </div>

            {/* Student Items content */}
            {activeTab === "student" && (
              <div>
                {studentLoading ? (
                  <p className="text-gray-600 italic">Loading...</p>
                ) : studentFetchError ? (
                  <p className="text-rose-600 italic">{studentFetchError}</p>
                ) : studentItems.length === 0 ? (
                  <p className="text-gray-600 italic">No items selected.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 mb-4">
                    {studentItems.map((i) => (
                      <li key={i._id} className="flex justify-between py-2 text-gray-800">
                        <span>{i.meal?.name} x {i.quantity}</span>
                        <span>₹{(i.meal?.price || 0) * (i.quantity || 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex justify-between items-center mt-4">
                  <h3 className="font-bold text-lg">Total: ₹{studentTotal}</h3>
                  {/* Note: Charge button moved to the right side panel as requested */}
                  <div className="text-sm text-gray-500">Finalize purchase from the right panel</div>
                </div>
              </div>
            )}

            {/* Manual Items content (left column) */}
            {activeTab === "manual" && (
              <>
                {/* Filters */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {["All", "Breakfast", "Lunch", "Snacks", "Dinner", "Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                          filter === cat ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                {/* Search */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Search meals..."
                    className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMeals.map((m) => (
                    <div key={m._id} className="rounded-xl border bg-white overflow-hidden shadow hover:shadow-md transition relative">
                      <div className="relative w-full h-36">
                        <div className="w-full h-36 flex items-center justify-center bg-white">
                          <img
                            src={m.imageUrl && m.imageUrl.trim() !== "" ? m.imageUrl : placeholderFor(m.name)}
                            alt={m.name}
                            className="max-h-32 max-w-full object-contain border border-gray-200"
                          />
                        </div>
                        {!m.available && (
                          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                            <span className="text-rose-600 font-bold text-lg mb-1">Not available</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800">{m.name}</h4>
                          <span className="text-sm text-gray-600">₹{m.price}</span>
                        </div>
                        <div className="mt-3 flex justify-center items-center gap-2">
                          <button
                            onClick={() => removeItem(m._id)}
                            className="px-3 py-2 rounded-lg text-white transition bg-rose-500 hover:bg-rose-600"
                          >
                            ➖
                          </button>
                          <span className="px-3 py-2 rounded-lg border text-gray-800 bg-gray-50 min-w-[32px] text-center">
                            {manualItems[m._id]?.quantity || 0}
                          </span>
                          <button
                            onClick={() => addItem(m)}
                            className="px-3 py-2 rounded-lg text-white transition bg-emerald-500 hover:bg-emerald-600"
                          >
                            ➕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* =========================
              Selected Items Panel (outside the main dashboard)
              ========================= */}
          <aside className="md:w-[380px] w-full self-start bg-white/90 border border-gray-200 rounded-2xl shadow p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Selected Items</h3>

            {/* If student tab active -> show studentItems; else manualItems */}
            {activeTab === "student" ? (
              <>
                {studentItems.length === 0 ? (
                  <p className="text-gray-600 italic">No items selected.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                    {studentItems.map((it) => (
                      <li key={it.meal?._id || it._id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                        <span className="text-gray-800">{it.meal?.name} × {it.quantity}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeStudentItem(it.meal?._id)}
                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded"
                          >
                            ➖
                          </button>
                          <span className="px-3 py-1 rounded-lg border text-gray-800 bg-white min-w-[32px] text-center">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => addStudentItem(it.meal?._id, 1)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded"
                          >
                            ➕
                          </button>
                          <button
                            onClick={async () => {
                              // remove completely: repeatedly call removeStudentItem or call endpoint to remove n qty
                              const qtyToRemove = it.quantity || 0;
                              for (let i = 0; i < qtyToRemove; i++) {
                                // sequentially remove to ensure server consistency; optimistic update already handled inside function
                                // small delay not needed
                                // eslint-disable-next-line no-await-in-loop
                                await removeStudentItem(it.meal?._id);
                              }
                            }}
                            className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded"
                          >
                            ❌
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 text-right font-semibold text-gray-800 w-full">Total: ₹{studentTotal}</div>
                <p className="text-xs text-gray-500 mt-1 w-full">Final payment happens at cashier.</p>

                <div className="mt-6 w-full flex justify-end">
                  <button
                    onClick={chargeStudentItems}
                    disabled={studentItems.length === 0}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-105 transform shadow-md disabled:opacity-60"
                  >
                    ✅ Charge
                  </button>
                </div>
              </>
            ) : (
              <>
                {Object.values(manualItems).length === 0 ? (
                  <p className="text-gray-600 italic">No items selected.</p>
                ) : (
                  <ul className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                    {Object.values(manualItems).map((it) => (
                      <li key={it.meal._id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                        <span className="text-gray-800">{it.meal.name} × {it.quantity}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeItem(it.meal._id)}
                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded"
                          >
                            ➖
                          </button>
                          <span className="px-3 py-1 rounded-lg border text-gray-800 bg-white min-w-[32px] text-center">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => addItem(it.meal)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded"
                          >
                            ➕
                          </button>
                          <button
                            onClick={() => removeAll(it.meal._id)}
                            className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded"
                          >
                            ❌
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 text-right font-semibold text-gray-800 w-full">Total: ₹{manualTotal}</div>
                <p className="text-xs text-gray-500 mt-1 w-full">Final payment happens at cashier.</p>

                <div className="mt-6 w-full flex justify-end">
                  <button
                    onClick={chargeManualPurchase}
                    disabled={manualTotal === 0}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:scale-105 transform shadow-md disabled:opacity-60"
                  >
                    ✅ Charge
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    );
  } catch (e) {
    console.error(e);
    return <ErrorFallback error={e} />;
  }
}