require('dotenv').config();
const axios = require('axios');

const fetchData = async () => {
    try {
        const PORT = process.env.PORT || 5000;
        const username = process.env.USERNAME;
        const password = process.env.PASSWORD;
        const contestName = process.env.CONTEST_NAME;
        console.log("Waiting for the endpoint response...");
        const response = await axios.post(`http://localhost:${PORT}/api/scrape`, {
            username: username,
            password: password,
            contestName: contestName,
        });

        // Extract findings and duplicates
        const { findings, duplicates } = response.data;
        console.log("Findings:", findings);
        console.log("Duplicates:", duplicates);
    } catch (error) {
        console.error('Error during the request:', error);
    }
};
fetchData();