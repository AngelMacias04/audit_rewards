require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const WebScraperAPI = require('./routes/api/scrape');

// Enable CORS
app.use(cors());

//Middleware to handle JSON bodies
app.use(express.json());

app.use('/api', WebScraperAPI);

//Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});