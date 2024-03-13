const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const striperoutes = require('./routes/stripe-route');

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3001;
const mongo_URI = process.env.MONGODB_URI; 

// MongoDB connection
mongoose.connect(mongo_URI, {  })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// CORS configuration
app.use(cors({
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST"], // Allow GET and POST requests
    credentials: true, // Allow cookies to be sent with requests
    accessControlAllowOrigin: "*"
})); // Middleware to enable CORS

app.use(cookieParser()); // Middleware to parse cookies

// Middleware to parse JSON bodies
app.use(express.json());

app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.use("/", authRoutes); // Use the authRoutes
app.use("/api/stripe", striperoutes); // Use the stripe routes