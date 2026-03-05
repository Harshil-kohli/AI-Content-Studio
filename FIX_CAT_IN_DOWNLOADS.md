# Fix Cat Image in Downloads

## Problem
- Canvas shows good Unsplash images ✅
- Downloaded file shows cat image ❌
- Old designs have Lorem Flickr URLs saved in database

## Root Cause
When you download an old design, it uses the Lorem Flickr URL that was saved in the database before you added the Unsplash API key.

## Solution (3 steps)

### Step 1: Clean Up Old Designs in Database

Run this cleanup to remove all Lorem Flickr URLs:

**In Browser Console (on your site):**
```javascript
fetch('/api/cleanup-designs', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Cleanup result:', data))
```

This will:
- Find all designs with Lorem Flickr URLs
- Remove those URLs from database
- Force regeneration with Unsplash next time

### Step 2: Deploy to Vercel

```bash
git add .
git commit -m "Remove Lorem Flickr URLs from old designs"
git push
```

### Step 3: Test

1. Go to homepage
2. Click on an old design (that had cat image)
3. It will load without image (because we removed the Lorem Flickr URL)
4. Click "Generate" again with same prompt
5. Now it will use Unsplash
6. Download - should show correct image!

## What Changed

### Before:
1. Design saved with Lorem Flickr URL → Database
2. Load design → Uses Lorem Flickr URL
3. Download → Cat image ❌

### After:
1. Design saved with Unsplash URL → Converted to base64 → Database
2. Load design → Uses base64 or Unsplash URL
3. Download → Correct image ✅

### For Old Designs:
1. Load old design → System detects Lorem Flickr URL
2. Removes it from database
3. User regenerates with Unsplash
4. Download → Correct image ✅

## Automatic Protection

The system now automatically:

1. **On Save**: Converts Unsplash images to base64 (no CORS issues)
2. **On Load**: Removes Lorem Flickr URLs if found
3. **On Homepage**: Filters out Lorem Flickr URLs
4. **On Cleanup**: Bulk removes all problematic URLs

## Testing

### Test 1: New Designs
1. Generate new design with Unsplash
2. Download immediately
3. Should show correct image ✅

### Test 2: Old Designs (After Cleanup)
1. Run cleanup script
2. Load old design
3. Regenerate image
4. Download
5. Should show correct image ✅

### Test 3: Verify No Lorem Flickr
Check browser console when generating images:
- Should see: "✅ Using Unsplash image"
- Should NOT see: "Using Lorem Flickr"

## Quick Cleanup Command

**Local (in terminal where server runs):**
```bash
# This will show in server logs
curl -X POST http://localhost:3000/api/cleanup-designs
```

**Production (in browser console on Vercel site):**
```javascript
fetch('/api/cleanup-designs', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

## Summary

**Problem**: Old designs have Lorem Flickr URLs (cat images)
**Solution**: Run cleanup to remove them
**Result**: All downloads will use Unsplash images

After cleanup and redeployment, no more cat images in downloads! 🎉
