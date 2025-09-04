import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function ManagerPage() {
  const nav = useNavigate();
  const [pending, setPending] = useState([]);
  const [rollNo, setRollNo] = useState("");
  const [meals, setMeals] = useState([]);
  const [mName, setMName] = useState("");
  const [mPrice, setMPrice] = useState("");
  const [mCategory, setMCategory] = useState("");
  const [mImage, setMImage] = useState("");
  // Edit modal state
  const [editMeal, setEditMeal] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState("");

  // ✅ NEW: Filters + Search state (same as StudentPage)
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  function openEditModal(meal) {
    setEditMeal(meal);
    setEditName(meal.name);
    setEditPrice(meal.price);
    setEditCategory(meal.category);
    setEditImage(meal.imageUrl || "");
  }

  function closeEditModal() {
    setEditMeal(null);
    setEditName("");
    setEditPrice("");
    setEditCategory("");
    setEditImage("");
  }

  async function saveEditMeal() {
    if (!editName.trim() || !editPrice || !editCategory) return toast.error("Enter name, price & category");
    try {
      await api.put(`/meals/${editMeal._id}`, {
        name: editName,
        price: Number(editPrice),
        category: editCategory,
        imageUrl: editImage || undefined
      });
      toast.success("Meal updated");
      closeEditModal();
      loadMeals();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  useEffect(() => { load(); loadMeals(); }, []);

  async function load() {
    try {
      const res = await api.get("/recharges/pending");    // 15
      setPending(res.data);
    } catch {
      toast.error("Failed to load recharge requests");
    }
  }

  async function loadMeals() {
    try {
      const res = await api.get("/meals");
      setMeals(res.data || []);
    } catch {
      toast.error("Failed to load meals");
    }
  }

  async function process(id, action) {
    try {
      const res = await api.post("/recharges/process", { requestId: id, action }); // 16
      toast.success(res.data.message);
      load();
    } catch {
      toast.error("Action failed");
    }
  }

  async function createCard() {
    if (!rollNo.trim()) return toast.error("Enter roll number");
    try {
      await api.post("/cards/create", { rollNo });        // 7
      toast.success("Card created");
      setRollNo("");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  async function createMeal() {
    if (!mName.trim() || !mPrice || !mCategory) return toast.error("Enter name, price & category");
    try {
      await api.post("/meals/create", {
        name: mName,
        price: Number(mPrice),
        category: mCategory,
        imageUrl: mImage || undefined
      });
      toast.success("Meal created");
      setMName(""); setMPrice(""); setMCategory(""); setMImage("");
      loadMeals();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  async function toggleMeal(id, available) {
    try {
      await api.put(`/meals/${id}`, { available: !available });
      loadMeals();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  async function deleteMeal(id) {
    try {
      await api.delete(`/meals/${id}`);
      loadMeals();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message);
    }
  }

  // ✅ NEW: Filtering + Search (mirrors StudentPage behavior; includes Dinner)
  const filteredMeals = useMemo(() => {
    let list = meals;

    if (filter !== "All") {
      if (["Breakfast", "Lunch", "Snacks", "Dinner"].includes(filter)) {
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
  }, [meals, filter, search]);

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-orange-400 via-pink-500 to-rose-500 p-4 sm:p-6 relative">
    {/* Logout button - always top right */}
    <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("role");
              toast.success("✅ Logged out successfully!", { theme: "colored" });
              setTimeout(() => nav("/login"), 1000);
            }}
            className="absolute top-7 right-6 sm:top-6 sm:right-8 z-20 
                      bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                      sm:px-6 sm:py-3 rounded-xl transition shadow-lg 
                      font-bold border-2 border-white text-sm sm:text-base"
          >
            Logout
    </button>



    <div className="max-w-5xl w-full mx-auto bg-white shadow-xl rounded-2xl p-4 sm:p-6">
      {/* Heading */}
      <div className="mb-4 sm:mb-6 flex justify-center mt-10 sm:mt-0">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-pink-600 flex items-center gap-2 text-center">
          <span role="img" aria-label="clipboard">📋</span> Manager Dashboard
        </h2>
      </div>

      {/* Pending recharges */}
      <section className="mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold mb-3">Pending Recharges</h3>
        {pending.length === 0 ? (
          <p className="text-gray-600 text-center font-semibold">No pending recharge requests ✅</p>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {pending.map((r) => (
              <li
                key={r._id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{r.student?.name}</p>
                  <p className="text-sm text-gray-600">Amount: ₹{r.amount}</p>
                  <p className="text-xs text-gray-400">Status: {r.status}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => process(r._id, "approve")}
                    className="px-3 py-2 sm:px-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:scale-105 transform transition text-sm sm:text-base"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => process(r._id, "reject")}
                    className="px-3 py-2 sm:px-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:scale-105 transform transition text-sm sm:text-base"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create Card by rollNo */}
      <section className="mb-6 sm:mb-8 border-t pt-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-3">Create Card (by Roll No)</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 flex-1 text-sm sm:text-base"
            placeholder="Enter Roll No (e.g., 21K61A0501)"
          />
          <button
            onClick={createCard}
            className="px-4 py-2 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transform transition text-sm sm:text-base"
          >
            Create Card
          </button>
        </div>
      </section>

      {/* Meals CRUD */}
      <section className="border-t pt-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-3">Meals</h3>

        {/* Create Meal */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <input
            value={mName}
            onChange={(e) => setMName(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 flex-1 text-sm sm:text-base"
            placeholder="Meal name"
          />
          <input
            type="number"
            value={mPrice}
            onChange={(e) => setMPrice(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-36 text-sm sm:text-base"
            placeholder="Price"
          />
       <select
          value={mCategory}
          onChange={e => setMCategory(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-44 text-sm sm:text-base appearance-none bg-white"
        >
          <option value="">Select Category</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="snacks">Snacks</option>
          <option value="dinner">Dinner</option>
        </select>

          <input
            value={mImage}
            onChange={(e) => setMImage(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 flex-1 text-sm sm:text-base"
            placeholder="Image URL (optional)"
          />
          <button
            onClick={createMeal}
            className="px-4 py-2 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white hover:scale-105 transform transition text-sm sm:text-base"
          >
            Add Meal
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {["All", "Breakfast", "Lunch", "Snacks", "Dinner", "Biscuits", "Chocolate", "Drinks", "Ice cream", "Juices"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition ${
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
            className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
          />
        </div>

        {/* Meals list */}
        {filteredMeals.length === 0 ? (
          <p className="text-gray-600 italic">No meals yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {filteredMeals.map((m) => (
              <div
                key={m._id}
                className={`rounded-xl border bg-white overflow-hidden shadow hover:shadow-md transition relative ${!m.available ? 'opacity-60' : ''}`}
              >
                <div className="relative w-full h-28 sm:h-36">
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img
                      src={m.imageUrl && m.imageUrl.trim() !== '' ? m.imageUrl : `https://ui-avatars.com/api/?background=ea580c&color=fff&name=${encodeURIComponent(m.name)}`}
                      alt={m.name}
                      className="max-h-full max-w-full object-contain border border-gray-200"
                      style={{ background: 'white' }}
                      onError={e => {
                        if (!e.target.src.includes('ui-avatars.com')) {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?background=ea580c&color=fff&name=${encodeURIComponent(m.name)}`;
                        }
                      }}
                    />
                  </div>
                  {!m.available && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                      <span className="text-rose-600 font-bold text-sm sm:text-lg mb-1">Not available</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">(Hidden from students)</span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{m.name}</h4>
                    <span className="text-xs sm:text-sm text-gray-600">₹{m.price}</span>
                  </div>
                 <div className="mt-3 space-y-2">
                    {/* Top row: Mark Unavailable + Edit */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleMeal(m._id, m.available)}
                        className={`flex-1 py-1.5 sm:py-2 px-2 rounded-lg text-white font-semibold transition text-[11px] sm:text-sm whitespace-nowrap ${
                          m.available ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                      >
                        {m.available ? "Mark Unavailable" : "Mark Available"}
                      </button>
                      <button
                        onClick={() => openEditModal(m)}
                        className="flex-1 py-1.5 sm:py-2 px-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition text-[11px] sm:text-sm whitespace-nowrap"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Bottom row: Delete */}
                    <button
                      onClick={() => deleteMeal(m._id)}
                      className="w-full py-1.5 sm:py-2 px-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold transition text-[11px] sm:text-sm"
                      disabled={!m.available}
                      title={m.available ? 'Delete meal' : 'Cannot delete unavailable meal'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Meal Modal stays same */}
        {editMeal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-md relative">
              <button onClick={closeEditModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-blue-600">Edit Meal</h3>
              <div className="flex flex-col gap-3">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Meal name"
                />
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Price"
                />
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-44 text-sm sm:text-base appearance-none bg-white"
                >
                  <option value="">Select Category</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="snacks">Snacks</option>
                  <option value="dinner">Dinner</option>
                </select>
                <input
                  value={editImage}
                  onChange={e => setEditImage(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Image URL (optional)"
                />
                <button
                  onClick={saveEditMeal}
                  className="px-4 py-2 sm:px-5 sm:py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold mt-2 text-sm sm:text-base"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  </div>
);
}