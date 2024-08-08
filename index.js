const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const authRoutes = require('./routes/authRoutes');
const striperoutes = require('./routes/stripe-route');
const MongoStore = require('connect-mongo');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const mongo_URI = process.env.MONGODB_URI;
   
app.use(cors({credentials: true, origin: 'http://localhost:1234'}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to set Access-Control-Allow-Credentials header
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Express session
app.use(
  expressSession({
    name: 'session',
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: mongo_URI }),
    cookie: {
      secure: true, // Set to true if using HTTPS
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true
    }
  })
);

app.use('/api/users', authRoutes);
app.use('/api/stripe', striperoutes);

mongoose.connect(mongo_URI, {})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
