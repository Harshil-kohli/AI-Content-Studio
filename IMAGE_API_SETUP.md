# Image API Setup Guide

## Problem
Picsum generates random images that don't match your prompt (e.g., asking for "car" gives you "beach").

## Solution
I've implemented a multi-tier image search system that uses REAL keyword-based image APIs:

### Tier 1: Pexels API (Recommended)
- **Free**: 200 requests/hour
- **Quality**: High-quality stock photos
- **Keyword-based**: Actually searches for your prompt
- **Setup**: 2 minutes

### Tier 2: Pixabay API (Optional Backup)
- **Free**: Unlimited requests
- **Quality**: Good stock photos
- **Keyword-based**: Searches by keywords

### Tier 3: Lorem Flickr (Automatic Fallback)
- **Free**: No API key needed
- **Quality**: Real Flickr photos
- **Keyword-based**: Uses your keywords
- **No setup required**

## How to Get Pexels API Key (Recommended)

### Step 1: Sign Up
1. Go to: https://www.pexels.com/api/
2. Click "Get Started" or "Sign Up"
3. Create a free account (email + password)

### Step 2: Get API Key
1. After signing up, you'll be redirected to your dashboard
2. Your API key will be displayed immediately
3. Copy the API key (looks like: `abc123xyz456...`)

### Step 3: Add to .env.local
1. Open `.env.local` file
2. Replace `YOUR_PEXELS_API_KEY_HERE` with your actual key:
   ```
   PEXELS_API_KEY=abc123xyz456...
   ```
3. Save the file

### Step 4: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### Step 5: Add to Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - Name: `PEXELS_API_KEY`
   - Value: Your API key
3. Redeploy

## Optional: Pixabay API (Extra Backup)

If you want even more reliability, add Pixabay:

1. Go to: https://pixabay.com/api/docs/
2. Sign up for free account
3. Get your API key
4. Add to `.env.local`:
   ```
   PIXABAY_API_KEY=your_pixabay_key
   ```
5. Add to Vercel environment variables

## How It Works

The system tries APIs in order:

1. **Pexels** (if API key exists) → Searches for your exact prompt
2. **Pixabay** (if API key exists) → Searches for keywords
3. **Lorem Flickr** (always available) → Uses keywords from real Flickr photos

### Example:
Prompt: "luxury sports car red sunset"

- AI extracts keywords: "luxury", "sports", "car"
- Pexels searches: "luxury sports car red sunset"
- Returns: Actual photo of a red sports car at sunset
- NOT a random beach or mountain!

## Testing

After setup, test with these prompts:
- "red sports car"
- "modern office workspace"
- "sunset over mountains"
- "coffee cup on desk"

Each should return relevant images!

## Troubleshooting

### Images still random?
- Check if API key is correct in `.env.local`
- Restart dev server after adding key
- Check console logs for API errors

### API rate limit?
- Pexels: 200 requests/hour (resets every hour)
- Pixabay: Unlimited
- Lorem Flickr: Unlimited (automatic fallback)

### No API key?
- Lorem Flickr will be used automatically
- Still keyword-based, just fewer options
- Better than Picsum random images!

## Current Status

✅ Multi-tier image search implemented
✅ Keyword extraction from AI descriptions
✅ Automatic fallback system
✅ Lorem Flickr works without API key
⏳ Add Pexels API key for best results (2 min setup)

## Benefits

- **Relevant Images**: Actually matches your prompt
- **Variety**: Random selection from search results
- **Reliable**: Multiple fallbacks
- **Free**: All tiers are free
- **No CORS Issues**: All APIs are CORS-friendly
