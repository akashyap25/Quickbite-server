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

// Enable CORS
const allowedOrigins = [
  'https://main--statuesque-bombolone-6323f8.netlify.app',
  'https://*.netlify.app'
];

  
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or CURL requests)
      if (!origin) return callback(null, true);
      
      // Check if the request's origin is allowed
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      
      // Origin is allowed
      return callback(null, true);
    },
    credentials: true // Allow cookies to be sent with the request
  }));
  
  

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
