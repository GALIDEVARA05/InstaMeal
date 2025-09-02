import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const placeholderFor = (name) =>
  `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(
    name || "Meal"
  )}`;

export default function StudentPage() {
  const nav = useNavigate();
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState(100);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const selectedItems = useMemo(() => selected?.selectedItems || [], [selected]);

  const selectedTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, it) => sum + (it.meal?.price || 0) * (it.quantity || 1),
        0
      ),
    [selectedItems]
  );

  useEffect(() => {
    (async () => {
      try {
        const rollNo = localStorage.getItem("rollNo");
        if (!rollNo) throw new Error("Roll number not found. Please log in again.");
        const [cardsRes, mealsRes] = await Promise.all([
          api.get(`/cards/student/${rollNo}`),
          api.get(`/meals`),
        ]);
        setCards(cardsRes.data || []);
        setMeals(mealsRes.data || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load data", {
          theme: "colored",
        });
      }
    })();
  }, []);

  async function refreshSelectedCard(cardId) {
    try {
      const res = await api.get(`/cards/${cardId}`);
      const updated = res.data;
      if (updated) {
        setCards((prev) =>
          prev.map((c) => (String(c._id) === String(cardId) ? updated : c))
        );
        setSelected(updated);
      }
    } catch {}
  }

  async function addItem(mealId, qty = 1) {
    if (!selected) return toast.error("Select a card first", { theme: "colored" });

    // ✅ Optimistic update
    setSelected((prev) => {
      if (!prev) return prev;
      const items = [...(prev.selectedItems || [])];
      const idx = items.findIndex((it) => it.meal?._id === mealId);
      if (idx > -1) {
        items[idx] = { ...items[idx], quantity: (items[idx].quantity || 0) + qty };
      } else {
        const meal = meals.find((m) => m._id === mealId);
        items.push({ meal, quantity: qty });
      }
      return { ...prev, selectedItems: items };
    });

    try {
      // ✅ update backend but do not refresh whole card (avoids blinking)
      await api.post("/cards/add-item", { cardId: selected._id, mealId, quantity: qty });
    } catch (e) {
      console.error(e?.response?.data?.message || e.message);
    }
  }

  async function removeItem(mealId) {
    if (!selected) return;

    // ✅ Optimistic update
    setSelected((prev) => {
      if (!prev) return prev;
      const items = [...(prev.selectedItems || [])];
      const idx = items.findIndex((it) => it.meal?._id === mealId);
      if (idx > -1) {
        const newQty = (items[idx].quantity || 0) - 1;
        if (newQty > 0) {
          items[idx] = { ...items[idx], quantity: newQty };
        } else {
          items.splice(idx, 1);
        }
      }
      return { ...prev, selectedItems: items };
    });

    try {
      // ✅ update backend but do not refresh whole card (avoids blinking)
      await api.post("/cards/remove-item", { cardId: selected._id, mealId });
    } catch (e) {
      console.error(e?.response?.data?.message || e.message);
    }
  }

  async function mockRecharge() {
    if (!selected) return toast.error("⚠️ Select a card first", { theme: "colored" });
    if (!amount || Number(amount) <= 0) {
      return toast.error("⚠️ Please enter a valid amount", { theme: "colored" });
    }
    try {
      const res = await api.post("/cards/request-recharge", {
        cardId: selected._id,
        amount: Number(amount),
      });
      toast.success(res.data.message, { theme: "colored" });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message, { theme: "colored" });
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("rollNo");
    toast.success("✅ Logged out successfully!", { theme: "colored" });
    setTimeout(() => nav("/login"), 1200);
  }

  function toggleCard(card) {
    if (selected?._id === card._id) setSelected(null);
    else setSelected(card);
  }

  // ✅ Filtering meals
  const filteredMeals = useMemo(() => {
    let list = meals;

    if (filter !== "All") {
      if (["Breakfast", "Lunch", "Snacks"].includes(filter)) {
        list = list.filter(
          (m) => m.category?.toLowerCase() === filter.toLowerCase()
        );
      } else if (["Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].includes(filter)) {
        const keyword = filter.toLowerCase().replace(/\s+/g, "").replace(/s$/, "");
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
  }, [filter, meals, search]);

  return (
    <>
      <div className="min-h-screen relative bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-6">
        <div className="w-full flex justify-center pt-8 pb-2">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-white drop-shadow-lg tracking-wide">
            🎓 Student Dashboard
          </h2>
        </div>
        <button
          onClick={logout}
          className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transform text-white px-5 py-2 rounded-xl shadow-md transition"
        >
          Logout
        </button>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 mt-8">
          {/* Left side */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-12 border border-gray-200 flex flex-col min-h-[700px]">
              <h2 className="text-3xl font-extrabold text-teal-700 drop-shadow-md mb-6 text-center">
                🍽️ Canteen Stock
              </h2>

              {/* Cards */}
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Meal Cards</h3>
              {cards.length === 0 ? (
                <p className="text-gray-600 italic">No cards assigned yet.</p>
              ) : (
                <ul className="space-y-3 mb-6">
                  {cards.map((c) => (
                    <li key={c._id}>
                      <button
                        onClick={() => toggleCard(c)}
                        className={`w-full flex justify-between items-center p-4 border rounded-xl shadow-sm transition ${
                          selected?._id === c._id
                            ? "bg-gradient-to-r from-teal-100 to-cyan-100 border-teal-500"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <span className="font-medium text-gray-800">{c.cardNumber}</span>
                        <span className="text-gray-600">Balance: ₹{c.balance}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-2">
                {["All", "Breakfast", "Lunch", "Snacks", "Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                        filter === cat
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Search bar */}
              <div className="mb-6">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Search meals..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Meals */}
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Available Meals</h3>
              {filteredMeals.length === 0 ? (
                <p className="text-gray-600 italic">No meals in this category.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredMeals.map((m) => {
                    const item = selectedItems.find((it) => it.meal?._id === m._id);
                    return (
                      <div
                        key={m._id}
                        className="rounded-xl border bg-white overflow-hidden shadow hover:shadow-md transition relative"
                      >
                        <div className="relative w-full h-36">
                          <div className="w-full h-36 flex items-center justify-center bg-white">
                            <img
                              src={
                                m.imageUrl && m.imageUrl.trim() !== ""
                                  ? m.imageUrl
                                  : placeholderFor(m.name)
                              }
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
                              disabled={!m.available || loading || !item}
                              onClick={() => removeItem(m._id)}
                              className={`px-3 py-2 rounded-lg text-white transition ${
                                !m.available || loading || !item
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-rose-500 hover:bg-rose-600"
                              }`}
                            >
                              ➖
                            </button>
                            <span className="px-3 py-2 rounded-lg border text-gray-800 bg-gray-50 min-w-[32px] text-center">
                              {item?.quantity || 0}
                            </span>
                            <button
                              disabled={!m.available || loading}
                              onClick={() => addItem(m._id, 1)}
                              className={`px-3 py-2 rounded-lg text-white transition ${
                                !m.available || loading
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-emerald-500 hover:bg-emerald-600"
                              }`}
                            >
                              ➕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          {selected && (
                <div className="md:w-[350px] flex flex-col items-stretch bg-white/90 border border-gray-200 rounded-2xl shadow p-4 self-start">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Selected Items</h3>
                  {selectedItems.length === 0 ? (
                    <p className="text-gray-600 italic">No items selected.</p>
                  ) : (
                    <ul className="space-y-2 w-full">
                      {selectedItems.map((it, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                        >
                          <span className="text-gray-800">
                            {it.meal?.name} × {it.quantity}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeItem(it.meal?._id)}
                              className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded"
                            >
                              ➖
                            </button>
                            <span className="px-3 py-1 rounded-lg border text-gray-800 bg-gray-50 min-w-[32px] text-center">
                              {it.quantity}
                            </span>
                            <button
                              onClick={() => addItem(it.meal?._id, 1)}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded"
                            >
                              ➕
                            </button>
                            <button
                              onClick={() => {
                                // remove completely from cart
                                for (let i = 0; i < it.quantity; i++) {
                                  removeItem(it.meal?._id);
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
                  <div className="mt-3 text-right font-semibold text-gray-800 w-full">
                    Total: ₹{selectedTotal}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 w-full">Final payment happens at cashier.</p>

                  <div className="mt-6 w-full">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      Recharge Selected Card
                    </h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter amount"
                      />
                      <button
                        onClick={mockRecharge}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transform text-white px-4 py-2 rounded-lg shadow-md transition"
                      >
                        Request Recharge
                      </button>
                    </div>
                  </div>
                </div>

          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2000} theme="colored" />
    </>
  );
}
