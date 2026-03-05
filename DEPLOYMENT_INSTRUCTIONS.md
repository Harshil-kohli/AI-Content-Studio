# Fix Image Loading on Vercel

## Problem
1. Old designs in database have Unsplash URLs which cause CORS errors
2. Picsum generates random images that don't match prompts (car → beach)

## Solution Steps

### Step 1: Get Pexels API Key (2 minutes - IMPORTANT!)
1. Go to: https://www.pexels.com/api/
2. Sign up for free (200 requests/hour)
3. Copy your API key
4. Add to `.env.local`:
   ```
   PEXELS_API_KEY=your_actual_api_key_here
   ```
5. Restart dev server

**Without Pexels key**: System will use Lorem Flickr (still keyword-based, but fewer options)

### Step 2: Redeploy to Vercel
1. Commit all changes to git:
   ```bash
   git add .
   git commit -m "Fix image loading with Picsum and proxy API"
   git push
   ```

2. Vercel will automatically redeploy (if auto-deploy is enabled)
   - OR manually trigger deployment in Vercel dashboard
3. **IMPORTANT**: Add `PEXELS_API_KEY` to Vercel environment variables:
   - Go to: Project Settings → Environment Variables
   - Add: `PEXELS_API_KEY` = your API key
   - Redeploy after adding

### Step 3: Clean Up Old Designs (After Deployment)
Once the new code is deployed, run this cleanup to fix old designs:

1. Open your browser console on the deployed site
2. Run this command:
   ```javascript
   fetch('/api/cleanup-designs', { method: 'POST' })
     .then(r => r.json())
     .then(data => console.log('Cleanup result:', data))
   ```

3. Refresh the page - all old designs will now use keyword-based images

### Step 4: Verify
1. Generate a new design with prompt "red sports car"
2. Should show actual car image (not random beach/mountain)
3. Click on saved designs - should load without CORS errors
4. Download a design - should include both image and text

## What Changed

### Image Generation (`app/api/generate-image/route.js`)
- **NEW**: Multi-tier keyword-based image search
  - Tier 1: Pexels API (best quality, requires free API key)
  - Tier 2: Pixabay API (optional backup)
  - Tier 3: Lorem Flickr (automatic fallback, no key needed)
- AI extracts keywords from your prompt
- Searches for RELEVANT images (car → car, not random)
- Random selection from results for variety

### Image Proxy (`app/api/proxy-image/route.js`)
- Server-side proxy to convert external images to base64
- Handles redirects properly
- Better error logging

### Auto-Conversion (`app/api/get-design/route.js` & `app/api/save-design/route.js`)
- Automatically converts old Unsplash URLs to Picsum
- Works on-the-fly when loading designs
- No manual intervention needed after cleanup

### Download Function (`app/dashboard/page.js`)
- Uses proxy API to avoid CORS issues
- Falls back gracefully if proxy fails
- Better error handling and logging

## Testing Locally
Everything should work in localhost. The issue is only on Vercel because:
1. Old code is still deployed
2. Old designs have Unsplash URLs

After redeploying and running cleanup, everything will work!
