# Troubleshooting: Cat Image Still Appearing

## Issue
Even with Unsplash API key added, Lorem Flickr fallback (cat image) is still showing.

## Quick Fix Steps

### Step 1: Verify API Key is Added
Check `.env.local` file:
```
UNSPLASH_ACCESS_KEY=eUrCF8oPpqgXuf1F4l8Nwmd7ne_Lt3VIlBd-2ZgkCuU
```
✅ This looks correct!

### Step 2: Restart Development Server
**IMPORTANT**: Environment variables only load when server starts!

1. Stop the server: Press `Ctrl+C` in terminal
2. Start again: `npm run dev`
3. Wait for "Ready" message
4. Try generating an image again

### Step 3: Check Server Logs
After restarting, when you generate an image, check the terminal for these logs:

**Good (Unsplash working):**
```
Trying Unsplash API with key: eUrCF8oPpq...
Unsplash response status: 200
Unsplash results count: 10
✅ Using Unsplash image: https://images.unsplash.com/...
```

**Bad (Unsplash failing):**
```
⚠️ Unsplash API key not configured, skipping...
Using Lorem Flickr with keywords: ...
```

### Step 4: If Still Using Lorem Flickr

**Possible causes:**

1. **Server not restarted** → Restart server (Ctrl+C, then `npm run dev`)

2. **API key invalid** → Verify key at https://unsplash.com/developers
   - Go to your app dashboard
   - Copy "Access Key" again
   - Replace in `.env.local`
   - Restart server

3. **Rate limit exceeded** → Unsplash free tier: 50 requests/hour
   - Wait 1 hour
   - Or add Pexels API key as backup

4. **No results for keywords** → Unsplash has no images for that search
   - Try different prompt
   - System will fallback to Lorem Flickr

### Step 5: Add Pexels as Backup (Optional)

If Unsplash fails, add Pexels:

1. Get key from: https://www.pexels.com/api/
2. Add to `.env.local`:
   ```
   PEXELS_API_KEY=your_pexels_key_here
   ```
3. Restart server

System will try: Unsplash → Pexels → Lorem Flickr

## Testing

After restarting server, try these prompts:

1. "generate image of sunset"
2. "create photo of coffee cup"
3. "generate modern office workspace"

Check terminal logs to see which API is being used.

## Expected Behavior

**With Unsplash working:**
- Terminal shows: "✅ Using Unsplash image"
- No cat images
- Relevant photos matching your prompt

**Without API keys:**
- Terminal shows: "Using Lorem Flickr"
- May show cat images occasionally
- Random photos

## Still Having Issues?

Run this test:

1. Open terminal where server is running
2. Generate an image
3. Copy the terminal output
4. Look for these lines:
   - "Trying Unsplash API with key: ..."
   - "Unsplash response status: ..."
   - "Unsplash results count: ..."

If you see "Unsplash API key not configured", the server hasn't loaded the `.env.local` file properly.

## Solution: Force Restart

```bash
# Stop server
Ctrl+C

# Clear any cache (optional)
rm -rf .next

# Start fresh
npm run dev
```

## Vercel Deployment

If working locally but not on Vercel:

1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. Add: `UNSPLASH_ACCESS_KEY` = `eUrCF8oPpqgXuf1F4l8Nwmd7ne_Lt3VIlBd-2ZgkCuU`
4. Redeploy

## Summary

**Most common issue**: Server not restarted after adding API key

**Quick fix**: 
1. Stop server (Ctrl+C)
2. Start server (`npm run dev`)
3. Test again

The cat image should be gone! 🎉
