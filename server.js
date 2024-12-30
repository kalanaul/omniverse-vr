const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import cors
const app = express();
const PORT = 3000;
const { Pool } = require('pg');
require('dotenv').config(); 

//const indexPath = path.join(__dirname, 'public', 'index.html');
const indexPath = "C:\\Kalana\\-gemini-kit-106.3\\_build\\windows-x86_64\\release\\extscache\\omni.services.streamclient.webrtc-1.3.8\\web\\index.html";
console.log(indexPath)

// Enable CORS for the specific frontend URL
app.use(cors({
    origin: 'http://3.7.115.208:8011', // Allow only your frontend URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

app.get('/get_twin_name', async (req, res) => {
    const { twinversion_id } = req.query; // Get the twin version ID from the query parameters

    if (!twinversion_id) {
        return res.status(400).json({ error: 'Missing twinversion_id in the request' });
    }

    try {
        // Query the database for the twin name associated with the twin version ID
        const query = 'SELECT twin_name FROM twinnames WHERE twin_id = $1';
        const result = await pool.query(query, [twinversion_id]);

        if (result.rows.length === 0) {
            // If no matching twin name is found, return a 404 response
            return res.status(404).json({ error: 'Twin name not found for the provided twinversion_id' });
        }

        // Return the twin name in the response
        res.json({ twin_name: result.rows[0].twin_name });
    } catch (error) {
        console.error('Error fetching twin name from the database:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
const filePath = path.join(__dirname, 'download_icon_clicked.txt');
console.log(filePath);

async function updateIndexHtml() {
    try {
        // Fetch the public IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const publicIP = ipData.ip;

        console.log('Public IP:', publicIP);

        // Read and update the index.html content
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        indexContent = indexContent.replace(
            /http:\/\/\d+\.\d+\.\d+\.\d+:3000/g, 
            `http://${publicIP}:3000`
        );
        fs.writeFileSync(indexPath, indexContent, 'utf8');
        console.log('index.html updated with public IP:', publicIP);
    } catch (error) {
        console.error('Error updating index.html:', error);
    }
}

// Middleware to serve static files (like the APK)
app.use(express.static('public'));

// Route to fetch the status of the file
app.get('/status', (req, res) => {
    console.log("checking status")
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading the file.');
        }
        res.send({ fileStatus: data.trim() });
    });
});

// Route to update the status of the file
app.post('/update-status', express.json(), (req, res) => {
    console.log("update status")
    const { status } = req.body;
    fs.writeFile(filePath, status, (err) => {
        if (err) {
            return res.status(500).send('Error updating the file.');
        }
        res.send('File updated successfully');
    });
});

// Route to serve the APK file for download
app.get('/download-apk', (req, res) => {
    const apkPath = path.join(__dirname, 'public', 'connectme.apk'); // Make sure the APK is in the 'public' folder
    console.log('Serving APK for download...');
    
    // Before serving the download, update the status file to "downloading"
    fs.writeFile(filePath, 'downloading', (err) => {
        if (err) {
            console.error('Error updating the file to downloading:', err);
            return res.status(500).send('Error updating the status file.');
        }
        console.log('Status updated to "downloading"');

        // Check if file exists before sending
        if (fs.existsSync(apkPath)) {
            res.download(apkPath, 'connectme.apk', (err) => {
                if (err) {
                    console.error('Error sending the APK file:', err);
                    res.status(500).send('Error sending the file.');
                }
            });
        } else {
            res.status(404).send('APK file not found.');
        }
    });
});
updateIndexHtml().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
});


