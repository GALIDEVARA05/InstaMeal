require('dotenv').config();
require('express-async-errors');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const errHandler = require('./middleware/errorHandler');
const mealRoutes = require('./routes/mealRoutes');
const authRoutes = require('./routes/authRoutes');
const cardRoutes = require('./routes/cardRoutes');
const rechargeRoutes = require('./routes/rechargeRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const corsOptions = {
  origin: [
    "https://your-frontend.vercel.app", // replace with your deployed Vercel frontend URL
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan('dev'));
app.use('/api/meals', mealRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/recharges', rechargeRoutes);
app.use('/api/transactions', transactionRoutes);

app.use(errHandler);

const PORT = process.env.PORT || 5000;

// ✅ Start server first
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);

  // then connect to MongoDB
  connectDB(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('DB connect error:', err));
});
