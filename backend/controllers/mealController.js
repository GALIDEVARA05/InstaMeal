const Meal = require('../models/Meal');

// 📌 List all meals for manager/admin, only available for others
exports.listMeals = async (req, res) => {
  try {
    let meals;
    if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
      meals = await Meal.find().sort({ createdAt: -1 });
    } else {
      meals = await Meal.find({ available: true }).sort({ createdAt: -1 });
    }
    res.json(meals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 Create a meal (admin/manager only)
exports.createMeal = async (req, res) => {
  try {
    const { name, price, category, imageUrl } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const meal = new Meal({ name, price, category, imageUrl });
    await meal.save();
    res.status(201).json({ message: "Meal created successfully", meal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 Update a meal (admin/manager only)
exports.updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await Meal.findByIdAndUpdate(id, req.body, { new: true });

    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    res.json({ message: "Meal updated successfully", meal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 Delete a meal (admin/manager only)
exports.deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const meal = await Meal.findByIdAndDelete(id);

    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    res.json({ message: "Meal deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
