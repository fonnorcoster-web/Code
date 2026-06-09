# Coffee Roaster Recommender

A full-stack web application that helps users discover local coffee roasters and find products that match their taste preferences.

## How It Works

1. Enter your coffee preferences (roast level, flavor notes, brewing method, format)
2. Specify your location
3. The app finds local independent coffee roasters via Google Places API
4. Scrapes their websites for product information
5. Uses Claude AI to intelligently match products to your preferences
6. Displays personalized recommendations with images, match scores, and buy links

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **APIs**: Google Places API, Anthropic Claude API
- **Scraping**: Axios + Cheerio

## Setup

### Prerequisites

- Node.js 18+
- Google Places API key
- Anthropic API key

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` in the `server/` directory:
   ```bash
   cp .env.example server/.env
   ```
3. Fill in your API keys in `server/.env`
4. Install dependencies:
   ```bash
   npm run install:all
   ```

### Running

Start both frontend and backend in development mode:
```bash
npm run dev
```

Or start them separately:
```bash
# Backend (port 3001)
npm run dev --workspace=server

# Frontend (port 5173)
npm run dev --workspace=client
```

Then open http://localhost:5173 in your browser.

## API Keys

### Google Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Places API" and "Geocoding API"
3. Create an API key and add it to your `.env` file

### Anthropic API
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key and add it to your `.env` file

## Features

- Multi-step preference form with visual selectors
- Real-time location detection via browser geolocation
- Parallel website scraping for fast results
- AI-powered product matching with explanations
- Filters for women-owned and Black-owned businesses
- Image proxy to avoid CORS issues
- Responsive design for mobile and desktop
- Coffee bean match score visualization
