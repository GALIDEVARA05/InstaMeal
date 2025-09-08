import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

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
      <button
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
        onClick={() => window.location.reload()}
      >
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

  // New: cards list + selected card
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  // Student Items Tab
  const [studentItems, setStudentItems] = useState([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState("");

  // Manual Add Items Tab
  const [meals, setMeals] = useState([]);
  const [manualItems, setManualItems] = useState({}); // key = `${mealId}_${price}`
  const [manualTotal, setManualTotal] = useState(0);
  const [manualSelectedPrice, setManualSelectedPrice] = useState({});

  // Filters + Search
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Error fallback state
  const [error, setError] = useState(null);

  // Load meals once
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
      const cardsData = cardRes.data || [];
      setCards(cardsData);

      if (!cardsData || cardsData.length === 0) {
        setStudentItems([]);
        setStudentTotal(0);
        setCardId(null);
        setSelectedCard(null);
        setStudentFetchError("No card found for this student");
        return toast.error("No card found for this student");
      }

      const chosen =
        (selectedCard &&
          cardsData.find((c) => String(c._id) === String(selectedCard._id))) ||
        cardsData[0];
      setSelectedCard(chosen);
      setCardId(chosen._id);

      const itemsRes = await api.get(`/cards/items/${chosen._id}`);
      const data = itemsRes.data || {};
      setStudentItems(data.selectedItems || []);
      setStudentTotal(data.totalCost || 0);
    } catch (e) {
      setStudentItems([]);
      setStudentTotal(0);
      setCardId(null);
      setSelectedCard(null);
      const msg =
        e?.response?.data?.message || "Failed to fetch student items";
      setStudentFetchError(msg);
      toast.error(msg);
    } finally {
      setStudentLoading(false);
    }
  }

  async function selectCard(card) {
    if (!card) return;
    try {
      setSelectedCard(card);
      setCardId(card._id);
      setStudentLoading(true);
      setStudentFetchError("");
      const itemsRes = await api.get(`/cards/items/${card._id}`);
      const data = itemsRes.data || {};
      setStudentItems(data.selectedItems || []);
      setStudentTotal(data.totalCost || 0);
    } catch (e) {
      const msg =
        e?.response?.data?.message || "Failed to fetch card items";
      setStudentFetchError(msg);
      toast.error(msg);
    } finally {
      setStudentLoading(false);
    }
  }

  async function chargeStudentItems() {
    if (!cardId) return toast.error("No card found");
    if (studentItems.length === 0)
      return toast.error("No items selected by student");

    try {
      const res = await api.post("/cards/finalize-purchase", { cardId });
      toast.success(res.data.message || "Purchase successful");
      setStudentItems([]);
      setStudentTotal(0);
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to finalize purchase"
      );
    }
  }

  // =============================
  // MANUAL ADD ITEMS TAB
  // =============================
  function addItem(meal, price) {
    const key = `${meal._id}_${price}`;
    setManualItems((prev) => {
      const qty = (prev[key]?.quantity || 0) + 1;
      return { ...prev, [key]: { meal, price, quantity: qty } };
    });
  }

  function removeItem(mealId, price) {
    const key = `${mealId}_${price}`;
    setManualItems((prev) => {
      if (!prev[key]) return prev;
      const qty = prev[key].quantity - 1;
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: { ...prev[key], quantity: qty } };
    });
  }

  function removeAll(mealId, price) {
    const key = `${mealId}_${price}`;
    setManualItems((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  useEffect(() => {
    const total = Object.values(manualItems).reduce(
      (sum, i) => sum + (i.price || 0) * (i.quantity || 0),
      0
    );
    setManualTotal(total);
  }, [manualItems]);

  async function chargeManualPurchase() {
    if (!rollNo.trim()) return toast.error("Enter roll number");
    if (manualTotal <= 0) return toast.error("No items selected");

    try {
      const cardRes = await api.get(`/cards/student/${rollNo}`);
      if (!cardRes.data || cardRes.data.length === 0)
        return toast.error("No card found for this student");
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
      toast.error(
        e?.response?.data?.message || "Manual purchase failed"
      );
    }
  }

  // =============================
  // FILTERING + SEARCH
  // =============================
  const filteredMeals = useMemo(() => {
    let list = meals || [];
    if (filter !== "All") {
      if (["Breakfast", "Lunch", "Snacks", "Dinner"].includes(filter)) {
        list = list.filter(
          (m) =>
            m.category?.toLowerCase() === filter.toLowerCase()
        );
      } else if (
        ["Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].includes(
          filter
        )
      ) {
        const keyword = filter
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/s$/, "");
        list = list.filter((m) =>
          m.name?.toLowerCase().replace(/\s+/g, "").includes(keyword)
        );
      }
    }
    if (search.trim() !== "") {
      list = list.filter((m) =>
        m.name?.toLowerCase().includes(search.trim().toLowerCase())
      );
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
      <div className="min-h-screen relative flex items-start justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 p-3 sm:p-6">

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 
                   bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transform 
                   text-white rounded-xl shadow-md transition z-50"
        >
          <span className="block sm:hidden p-2">
            <LogOut size={20} />
          </span>
          <span className="hidden sm:block px-4 py-2 text-sm sm:text-base font-semibold">
            Logout
          </span>
        </button>

        {/* Main Layout */}
        <div className="w-full max-w-6xl flex flex-col-reverse md:flex-row gap-4 sm:gap-6">
          {/* Main Dashboard */}
          <div className="bg-white/95 backdrop-blur-lg p-5 sm:p-10 rounded-2xl shadow-2xl flex-1 border border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center mb-4">
              💳 Cashier Dashboard
            </h2>

            {/* Tabs */}
            <div className="flex justify-center gap-2 sm:gap-4 mb-6 flex-wrap">
              <button
                onClick={() => setActiveTab("student")}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-base ${
                  activeTab === "student"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Student Items
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-sm sm:text-base ${
                  activeTab === "manual"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Manual Add Items
              </button>
            </div>

            {/* Roll Number Input */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter Roll No"
              />
              {activeTab === "student" && (
                <button
                  onClick={fetchStudentItems}
                  className="px-4 py-2 sm:px-5 sm:py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:scale-105 transform transition text-sm sm:text-base"
                  disabled={studentLoading}
                >
                  {studentLoading ? "Loading..." : "View Items"}
                </button>
              )}
            </div>

            {/* Cards List */}
            {activeTab === "student" && cards && cards.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2 text-gray-700">
                  Cards
                </h4>
                <div className="flex gap-2 overflow-x-auto">
                  {cards.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => selectCard(c)}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl border transition text-sm text-left ${
                        selectedCard &&
                        String(selectedCard._id) === String(c._id)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-gray-50 text-gray-800 hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium truncate max-w-[160px]">
                        {c.cardNumber}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Balance: ₹{c.balance ?? 0}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Tab Content */}
            {activeTab === "manual" && (
              <>
                {/* Filters */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    "All",
                    "Breakfast",
                    "Lunch",
                    "Snacks",
                    "Dinner",
                    "Biscuits",
                    "Chocolate",
                    "Drinks",
                    "Ice cream",
                    "Juices",
                  ].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition ${
                        filter === cat
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Search meals..."
                    className="w-full border rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Meals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredMeals.map((m) => {
                    const selectedPrice =
                      manualSelectedPrice[m._id] ??
                      (m.priceOptions?.[0] ?? m.price);
                    const quantityKey = `${m._id}_${selectedPrice}`;
                    const quantity = manualItems[quantityKey]?.quantity ?? 0;

                    return (
                      <div
                        key={m._id}
                        className="rounded-xl border bg-white overflow-hidden shadow hover:shadow-md transition relative"
                      >
                        <div className="relative w-full h-32 sm:h-36 flex items-center justify-center bg-white">
                          <img
                            src={
                              m.imageUrl?.trim()
                                ? m.imageUrl
                                : placeholderFor(m.name)
                            }
                            alt={m.name}
                            className="max-h-28 sm:max-h-32 max-w-full object-contain border border-gray-200"
                          />
                          {!m.available && (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                              <span className="text-rose-600 font-bold text-sm sm:text-lg mb-1">
                                Not available
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 sm:p-4">
                          {/* Name & Price Dropdown (small, beside name) */}
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-gray-800 text-sm sm:text-base truncate mr-2">
                              {m.name}
                            </h4>
                            <select
                              className="border border-gray-300 rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs w-16"
                              value={selectedPrice}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value);
                                setManualSelectedPrice((prev) => ({
                                  ...prev,
                                  [m._id]: newPrice,
                                }));
                              }}
                            >
                              {(m.priceOptions?.length
                                ? m.priceOptions
                                : [m.price]
                              ).map((p, idx) => (
                                <option key={idx} value={p}>
                                  ₹{p}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Add/Remove Buttons */}
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => removeItem(m._id, selectedPrice)}
                              className="px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-white transition bg-rose-500 hover:bg-rose-600 text-sm"
                            >
                              ➖
                            </button>
                            <span className="px-2 sm:px-3 py-1 sm:py-2 rounded-lg border text-gray-800 bg-gray-50 min-w-[28px] sm:min-w-[36px] text-center text-sm font-semibold">
                              {quantity}
                            </span>
                            <button
                              onClick={() => addItem(m, selectedPrice)}
                              className="px-2 py-1 sm:px-3 sm:py-2 rounded-lg text-white transition bg-emerald-500 hover:bg-emerald-600 text-sm"
                            >
                              ➕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

{/* Right Panel */}
<div className="w-full md:w-[350px] flex-shrink-0 self-start bg-white/90 border border-gray-200 rounded-2xl shadow-2xl p-5 sm:p-6">  
<h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4">
    🛒 Checkout
  </h3>

  {activeTab === "student" ? (
    <>
      <p className="text-sm text-gray-500 mb-2">Student Items</p>

      <ul className="space-y-2 w-full mb-3">
        {studentItems.length === 0 ? (
          <li className="py-2 text-sm text-gray-500 text-center">
            No items selected
          </li>
        ) : (
          studentItems.map((i, idx) => {
            const price = i.price ?? i.meal?.price ?? 0;
            return (
              <li
                key={`${i.meal?._id}_${price}_${idx}`}
                className="flex items-center justify-between p-2 rounded-lg border bg-gray-50 text-sm"
              >
                {/* Item name + price */}
                <span className="text-gray-800 truncate">
                  {i.meal?.name} (₹{price}) × {i.quantity}
                </span>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => removeStudentItem(i.meal?._id, price)}
                    className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs"
                  >
                    ➖
                  </button>
                  <span className="px-2 py-1 rounded-lg border text-gray-800 bg-gray-50 min-w-[28px] text-center text-xs">
                    {i.quantity}
                  </span>
                  <button
                    onClick={() => addStudentItem(i.meal, price)}
                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs"
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => removeAllStudentItems(i.meal?._id, price)}
                    className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs"
                  >
                    ❌
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <h4 className="font-bold mb-4">Total: ₹{studentTotal}</h4>
      <button
        onClick={chargeStudentItems}
        disabled={studentItems.length === 0}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow hover:scale-105 transform transition"
      >
        Finalize Purchase
      </button>
    </>
  ) : (
    <>
      <p className="text-sm text-gray-500 mb-2">Manual Items</p>

      <ul className="space-y-2 w-full mb-3">
        {Object.values(manualItems).length === 0 ? (
          <li className="py-2 text-sm text-gray-500 text-center">
            No items selected
          </li>
        ) : (
          Object.values(manualItems).map((i, idx) => (
            <li
              key={`${i.meal._id}_${i.price}_${idx}`}
              className="flex items-center justify-between p-2 rounded-lg border bg-gray-50 text-sm"
            >
              {/* Item name + price */}
              <span className="text-gray-800 truncate">
                {i.meal.name} (₹{i.price}) × {i.quantity}
              </span>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => removeItem(i.meal._id, i.price)}
                  className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs"
                >
                  ➖
                </button>
                <span className="px-2 py-1 rounded-lg border text-gray-800 bg-gray-50 min-w-[28px] text-center text-xs">
                  {i.quantity}
                </span>
                <button
                  onClick={() => addItem(i.meal, i.price)}
                  className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs"
                >
                  ➕
                </button>
                <button
                  onClick={() => removeAll(i.meal._id, i.price)}
                  className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs"
                >
                  ❌
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <h4 className="font-bold mb-4">Total: ₹{manualTotal}</h4>
      <button
        onClick={chargeManualPurchase}
        disabled={manualTotal <= 0}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow hover:scale-105 transform transition"
      >
        Finalize Purchase
      </button>
    </>
  )}
</div>



        </div>
      </div>
    );
  } catch (err) {
    return <ErrorFallback error={err} />;
  }
}
