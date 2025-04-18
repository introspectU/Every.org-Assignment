# Giving Teams Leaderboard

A simple web application that allows users to create or join giving teams tied to specific charities and displays a leaderboard of teams ranked by their total donations.

## Features

- Create/join a team with a name and optional description
- Search and select charities using the Every.org API
- View a leaderboard of teams ranked by total donations
- Responsive design that works on mobile and desktop

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Data Storage

The application uses JSON files for data storage:
- `data/teams.json`: Stores team information
- `data/donations.json`: Stores donation records

## API Endpoints

- `GET /api/teams`: Get all teams
- `POST /api/teams`: Create a new team
- `GET /api/charities`: Search charities using Every.org API
- `GET /api/leaderboard`: Get the leaderboard with team rankings

## Technologies Used

- Node.js
- Express.js
- Vanilla JavaScript
- HTML5
- CSS3