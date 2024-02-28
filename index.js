const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3001;
const mongo_URI = process.env.MONGODB_URI; 
app.use(cors());

// MongoDB connection
mongoose.connect(mongo_URI, {  })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });



app.use(cookieParser()); // Middleware to parse cookies

// Middleware to parse JSON bodies
app.use(express.json());

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.use("/", authRoutes); // Use the authRoutes
