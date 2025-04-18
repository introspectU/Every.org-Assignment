const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Data file paths
const TEAMS_FILE = path.join(__dirname, '../data/teams.json');
const DONATIONS_FILE = path.join(__dirname, '../data/donations.json');

// Initialize data files if they don't exist
async function initializeDataFiles() {
    try {
        await fs.access(TEAMS_FILE);
    } catch {
        await fs.writeFile(TEAMS_FILE, JSON.stringify([]));
    }
    try {
        await fs.access(DONATIONS_FILE);
    } catch {
        await fs.writeFile(DONATIONS_FILE, JSON.stringify([]));
    }
}

// Helper function to make HTTPS request
function makeHttpsRequest(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

// API Routes
app.get('/api/teams', async (req, res) => {
    try {
        const data = await fs.readFile(TEAMS_FILE, 'utf8');
        const teams = JSON.parse(data);
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read teams data' });
    }
});

app.post('/api/teams', async (req, res) => {
    try {
        const { name, description, charityId } = req.body;
        const data = await fs.readFile(TEAMS_FILE, 'utf8');
        const teams = JSON.parse(data);
        
        const newTeam = {
            id: Date.now().toString(),
            name,
            description,
            charityId,
            createdAt: new Date().toISOString()
        };
        
        teams.push(newTeam);
        await fs.writeFile(TEAMS_FILE, JSON.stringify(teams, null, 2));
        res.status(201).json(newTeam);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create team' });
    }
});

app.get('/api/charities', async (req, res) => {
    try {
        console.log('Searching charities with query:', req.query.search);
        
        const searchQuery = req.query.search || '';
        const url = new URL(`https://partners.every.org/v0.2/search/${encodeURIComponent(searchQuery)}`);
        url.searchParams.append('apiKey', 'pk_live_fa4a7166884a6fb1244f80c6d9b910da');
        
        const options = {
            headers: {
                'Accept': 'application/json'
            }
        };
        
        console.log('Making request to:', url.toString());
        
        const response = await makeHttpsRequest(url, options);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Raw response:', response.data);
        
        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        let responseData;
        try {
            responseData = JSON.parse(response.data);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Invalid JSON response from API');
        }
        
        if (!responseData || !responseData.nonprofits) {
            console.error('Invalid API response format:', responseData);
            throw new Error('Invalid API response format');
        }
        
        // Transform the response to match our frontend expectations
        const charities = responseData.nonprofits.map(nonprofit => ({
            id: nonprofit.ein,
            name: nonprofit.name,
            description: nonprofit.description,
            logo: nonprofit.logoUrl,
            profileUrl: nonprofit.profileUrl
        }));
        
        console.log('Transformed charities:', charities);
        res.json(charities);
    } catch (error) {
        console.error('Error fetching charities:');
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        res.status(500).json({ 
            error: 'Failed to fetch charities',
            details: error.message
        });
    }
});

app.post('/api/donations', async (req, res) => {
    try {
        console.log('Received donation request:', req.body);
        
        const { teamId, charityId, amount, donorName } = req.body;
        
        // Validate required fields
        if (!teamId || !amount || !donorName) {
            console.error('Missing required fields:', { teamId, amount, donorName });
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Read existing donations
        let donations = [];
        try {
            const data = await fs.readFile(DONATIONS_FILE, 'utf8');
            donations = JSON.parse(data);
            console.log('Existing donations:', donations);
        } catch (error) {
            console.log('No existing donations file, starting fresh');
            // File doesn't exist yet, that's okay
        }
        
        // Add new donation
        const newDonation = {
            id: Date.now().toString(),
            teamId,
            amount: parseFloat(amount),
            donorName,
            createdAt: new Date().toISOString()
        };
        
        console.log('Adding new donation:', newDonation);
        
        donations.push(newDonation);
        await fs.writeFile(DONATIONS_FILE, JSON.stringify(donations, null, 2));
        
        console.log('Successfully saved donation');
        res.status(201).json(newDonation);
    } catch (error) {
        console.error('Error creating donation:', error);
        res.status(500).json({ 
            error: 'Failed to create donation',
            details: error.message 
        });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const teamsData = await fs.readFile(TEAMS_FILE, 'utf8');
        const donationsData = await fs.readFile(DONATIONS_FILE, 'utf8');
        
        const teams = JSON.parse(teamsData);
        const donations = JSON.parse(donationsData);
        
        const leaderboard = teams.map(team => {
            const teamDonations = donations.filter(d => d.teamId === team.id);
            const totalRaised = teamDonations.reduce((sum, d) => sum + d.amount, 0);
            const donorCount = new Set(teamDonations.map(d => d.donorName)).size;
            
            return {
                ...team,
                totalRaised,
                donorCount,
                donations: teamDonations
            };
        }).sort((a, b) => b.totalRaised - a.totalRaised);
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Error generating leaderboard:', error);
        res.status(500).json({ error: 'Failed to generate leaderboard' });
    }
});

// Initialize and start server
initializeDataFiles().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}); 