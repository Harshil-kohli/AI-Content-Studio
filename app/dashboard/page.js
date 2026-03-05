'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// Force dynamic rendering to avoid build errors
export const dynamic = 'force-dynamic';

const CANVAS_SIZES = {
  'twitter-banner': { width: 1500, height: 500, label: 'Twitter Banner' },
  'twitter-post': { width: 1200, height: 675, label: 'Twitter Post' },
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story' },
  'facebook-post': { width: 1200, height: 630, label: 'Facebook Post' },
  'facebook-cover': { width: 820, height: 312, label: 'Facebook Cover' },
  'linkedin-post': { width: 1200, height: 627, label: 'LinkedIn Post' },
  'linkedin-banner': { width: 1584, height: 396, label: 'LinkedIn Banner' },
  'youtube-thumbnail': { width: 1280, height: 720, label: 'YouTube Thumbnail' },
  'avatar': { width: 400, height: 400, label: 'Avatar/Profile Picture' },
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef(null);
  
  const [prompt, setPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState('twitter-post');
  const [canvasContent, setCanvasContent] = useState({ 
    type: null, 
    data: null, 
    fallbackUrl: null,
    textOverlay: null,
    textPosition: 'center',
    canvasColor: '#ffffff'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [credits, setCredits] = useState(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textStyle, setTextStyle] = useState({
    fontSize: 48,
    fontFamily: 'Inter',
    color: '#000000',
    gradientEnabled: false,
    gradientFrom: '#a855f7',
    gradientTo: '#ec4899',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backgroundEnabled: true,
    textAlign: 'center'
  });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    const designIdParam = searchParams.get('designId');
    
    if (promptParam) {
      setPrompt(promptParam);
    }
    
    if (designIdParam) {
      loadDesign(designIdParam);
    }
  }, [searchParams]);

  const loadDesign = async (designId) => {
    try {
      showToast('Loading design...');
      const response = await fetch(`/api/get-design?id=${designId}`);
      const data = await response.json();
      
      if (response.ok && data.design) {
        const design = data.design;
        
        // Store the design ID for updates
        setCurrentDesignId(designId);
        
        // Set canvas size
        if (design.canvasSize) {
          setSelectedSize(design.canvasSize);
        }
        
        // Set canvas content
        setCanvasContent({
          type: design.contentType,
          data: design.contentType === 'text' ? design.textContent : design.imageUrl,
          fallbackUrl: null,
          textOverlay: design.contentType === 'image_with_text' ? design.textContent : null,
          textPosition: design.textPosition || 'center',
          canvasColor: design.canvasColor || '#ffffff'
        });
        
        // Set text style
        if (design.textStyle) {
          setTextStyle(design.textStyle);
        }
        
        // Show text editor if there's text
        if (design.contentType === 'text' || design.contentType === 'image_with_text') {
          setShowTextEditor(true);
        }
        
        showToast('Design loaded successfully!');
      } else {
        showToast(data.error || 'Failed to load design', 'error');
      }
    } catch (error) {
      console.error('Error loading design:', error);
      showToast('Failed to load design', 'error');
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled || !canvasContent.type) return;

    const autoSaveTimer = setTimeout(() => {
      console.log('Auto-saving with design ID:', currentDesignId);
      saveDesign(true).then(success => {
        if (success) {
          setLastSaved(new Date());
        }
      });
    }, 3000); // Auto-save 3 seconds after last change

    return () => clearTimeout(autoSaveTimer);
  }, [canvasContent, textStyle, selectedSize, autoSaveEnabled, currentDesignId]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type, persist: false });
    const timeoutId = setTimeout(() => {
      setToast(prev => {
        if (!prev.persist) {
          return { show: false, message: '', type: 'success', persist: false };
        }
        return prev;
      });
    }, 3000);
  };

  const checkCredits = async () => {
    try {
      showToast('Checking credits...');
      const response = await fetch('/api/check-credits');
      const data = await response.json();
      
      console.log('Credits Response:', data);
      
      if (response.ok) {
        if (data.status === 'active' && data.message) {
          showToast(data.message);
        } else if (data.totalUsage !== undefined) {
          showToast(`Total Usage: $${(data.totalUsage / 100).toFixed(2)}`);
        } else {
          // Show all available data
          const infoLines = [];
          if (data.total_usage) infoLines.push(`Usage: $${(data.total_usage / 100).toFixed(2)}`);
          if (data.plan) infoLines.push(`Plan: ${data.plan}`);
          if (data.credits_remaining) infoLines.push(`Credits: ${data.credits_remaining}`);
          
          if (infoLines.length > 0) {
            showToast(infoLines.join(' | '));
          } else {
            showToast('API key is valid. Check console for details.');
            console.log('Full Credits Data:', JSON.stringify(data, null, 2));
          }
        }
        setCredits(data);
      } else {
        showToast(data.error || 'Could not check credits', 'error');
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      showToast('Failed to check credits', 'error');
    }
  };

  const detectContentType = (promptText) => {
    const lowerPrompt = promptText.toLowerCase();
    
    // Detect size/platform
    let detectedSize = selectedSize;
    Object.keys(CANVAS_SIZES).forEach(key => {
      const label = CANVAS_SIZES[key].label.toLowerCase();
      if (lowerPrompt.includes(label) || lowerPrompt.includes(key.replace('-', ' '))) {
        detectedSize = key;
      }
    });
    
    // Detect content type
    const hasImageKeywords = /image|picture|photo|visual|graphic|illustration|generate.*image/i.test(lowerPrompt);
    const hasTextKeywords = /text|write|add.*text|put.*text|center.*text|display.*text/i.test(lowerPrompt);
    
    return { detectedSize, isImage: hasImageKeywords, isText: hasTextKeywords || !hasImageKeywords };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    setIsGenerating(true);
    
    // Close sidebar on mobile after clicking generate
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    
    try {
      // Step 1: Analyze the prompt using AI
      showToast('Analyzing prompt...');
      
      const analyzeResponse = await fetch('/api/analyze-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const analyzeData = await analyzeResponse.json();
      
      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || 'Failed to analyze prompt');
      }
      
      const { analysis } = analyzeData;
      console.log('AI Analysis:', analysis);
      console.log('Action:', analysis.action);
      console.log('Image Description:', analysis.imageDescription);
      console.log('Text Content:', analysis.textContent);
      console.log('Text Position:', analysis.textPosition);
      console.log('Canvas Color:', analysis.canvasColor);
      
      // Step 2: Handle canvas color change
      if (analysis.canvasColor) {
        setCanvasContent(prev => ({ ...prev, canvasColor: analysis.canvasColor }));
      }
      
      // If action is just canvas color change
      if (analysis.action === 'canvas') {
        setCanvasContent(prev => ({ 
          ...prev, 
          canvasColor: analysis.canvasColor || '#ffffff',
          type: prev.type || null // Keep existing content
        }));
        showToast('Canvas color updated!');
        setIsGenerating(false);
        return;
      }
      
      // Step 3: Detect canvas size from prompt
      const lowerPrompt = prompt.toLowerCase();
      let detectedSize = selectedSize;
      
      Object.keys(CANVAS_SIZES).forEach(key => {
        const label = CANVAS_SIZES[key].label.toLowerCase();
        if (lowerPrompt.includes(label) || lowerPrompt.includes(key.replace('-', ' '))) {
          detectedSize = key;
        }
      });
      
      if (detectedSize !== selectedSize) {
        setSelectedSize(detectedSize);
        showToast(`Detected: ${CANVAS_SIZES[detectedSize].label}`);
      }
      
      // Step 4: Execute action based on AI analysis
      if (analysis.action === 'image' || analysis.action === 'image_with_text') {
        // Generate image
        showToast('Generating image...');
        
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis }),
        });
        
        const imageData = await imageResponse.json();
        
        if (!imageResponse.ok) {
          throw new Error(imageData.error || 'Failed to generate image');
        }
        
        setCanvasContent({
          type: analysis.action === 'image_with_text' ? 'image_with_text' : 'image',
          data: imageData.imageUrl,
          fallbackUrl: imageData.fallbackUrl,
          textOverlay: analysis.action === 'image_with_text' ? analysis.textContent : null,
          textPosition: analysis.textPosition || 'center',
          canvasColor: analysis.canvasColor || '#ffffff'
        });
        console.log('Image URL set:', imageData.imageUrl);
        console.log('Keywords used:', imageData.keywords);
        showToast(analysis.action === 'image_with_text' ? 'Image with text generated!' : 'Image generated successfully!');
        
      } else if (analysis.action === 'text') {
        // Add text to canvas
        setCanvasContent({
          type: 'text',
          data: analysis.textContent || analysis.content,
          textPosition: analysis.textPosition || 'center',
          canvasColor: analysis.canvasColor || '#ffffff'
        });
        showToast('Text added to canvas!');
        setShowTextEditor(true); // Show editor for text customization
        
      } else {
        // No specific action detected
        showToast('Please specify if you want to generate an image or add text', 'error');
      }
      
    } catch (error) {
      console.error('Error generating content:', error);
      showToast(error.message || 'Failed to generate content', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCanvas = async () => {
    try {
      showToast('Preparing download...');
      
      // Create a temporary canvas for download
      const downloadCanvas = document.createElement('canvas');
      const ctx = downloadCanvas.getContext('2d');
      const size = CANVAS_SIZES[selectedSize];
      
      downloadCanvas.width = size.width;
      downloadCanvas.height = size.height;

      // Fill background
      ctx.fillStyle = canvasContent.canvasColor || '#ffffff';
      ctx.fillRect(0, 0, size.width, size.height);

      // Draw image if exists
      if ((canvasContent.type === 'image' || canvasContent.type === 'image_with_text') && canvasContent.data) {
        try {
          let imageDataUrl = canvasContent.data;
          
          // If the image is from an external source (not already base64), proxy it through our server
          // This solves CORS issues in production by converting the image to base64
          if (!imageDataUrl.startsWith('data:')) {
            console.log('Proxying external image to avoid CORS issues...');
            const proxyResponse = await fetch('/api/proxy-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: imageDataUrl }),
            });
            
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              imageDataUrl = proxyData.dataUrl;
              console.log('Image proxied successfully');
            } else {
              console.warn('Proxy failed, trying direct load');
            }
          }
          
          // Load and draw the image
          const img = document.createElement('img');
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Image load timeout'));
            }, 15000);
            
            img.onload = () => {
              clearTimeout(timeout);
              try {
                ctx.drawImage(img, 0, 0, size.width, size.height);
                console.log('Image drawn successfully');
                resolve();
              } catch (drawError) {
                console.error('Error drawing image:', drawError);
                reject(drawError);
              }
            };
            
            img.onerror = (error) => {
              clearTimeout(timeout);
              console.error('Image load error:', error);
              reject(error);
            };
            
            img.src = imageDataUrl;
          });
        } catch (error) {
          console.warn('Could not load image for download:', error);
          showToast('Image could not be loaded, downloading text only', 'error');
        }
      }

      // Draw text overlay
      const textContent = canvasContent.type === 'text' ? canvasContent.data : canvasContent.textOverlay;
      if (textContent) {
        // Calculate position
        let yPosition;
        if (canvasContent.textPosition === 'top') {
          yPosition = size.height * 0.2;
        } else if (canvasContent.textPosition === 'bottom') {
          yPosition = size.height * 0.8;
        } else {
          yPosition = size.height * 0.5;
        }

        // Set font
        ctx.font = `bold ${textStyle.fontSize}px ${textStyle.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Measure text for background
        const lines = textContent.split('\n');
        const lineHeight = textStyle.fontSize * 1.2;
        const maxWidth = size.width * 0.8;
        
        // Word wrap
        const wrappedLines = [];
        lines.forEach(line => {
          const words = line.split(' ');
          let currentLine = '';
          
          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
              wrappedLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
        });

        // Calculate total text height
        const totalHeight = wrappedLines.length * lineHeight;
        const startY = yPosition - (totalHeight / 2);

        // Draw background if enabled
        if (textStyle.backgroundEnabled) {
          const padding = 40;
          const bgWidth = Math.max(...wrappedLines.map(line => ctx.measureText(line).width)) + padding * 2;
          const bgHeight = totalHeight + padding * 2;
          const bgX = (size.width - bgWidth) / 2;
          const bgY = startY - padding;

          // Parse background color
          ctx.fillStyle = textStyle.backgroundColor;
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }

        // Draw text
        wrappedLines.forEach((line, index) => {
          const y = startY + (index * lineHeight) + (lineHeight / 2);
          
          if (textStyle.gradientEnabled) {
            // Create gradient
            const gradient = ctx.createLinearGradient(0, y, size.width, y);
            gradient.addColorStop(0, textStyle.gradientFrom);
            gradient.addColorStop(1, textStyle.gradientTo);
            ctx.fillStyle = gradient;
          } else {
            ctx.fillStyle = textStyle.color;
          }
          
          // Add text shadow for better visibility
          if (!textStyle.backgroundEnabled) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
          }
          
          ctx.fillText(line, size.width / 2, y);
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        });
      }

      // Download
      const link = document.createElement('a');
      link.download = `${selectedSize}-${Date.now()}.png`;
      link.href = downloadCanvas.toDataURL('image/png');
      link.click();
      
      showToast('Downloaded successfully!');
    } catch (error) {
      console.error('Error downloading canvas:', error);
      showToast('Failed to download. Try again.', 'error');
    }
  };

  const saveDesign = async (silent = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasContent.type) {
      if (!silent) showToast('Nothing to save', 'error');
      return false;
    }

    try {
      if (!silent) showToast('Saving design...');

      let thumbnail = null;

      // Try to create thumbnail, but don't fail if it doesn't work
      try {
        // Create a temporary canvas to render the full design
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const size = CANVAS_SIZES[selectedSize];
        
        tempCanvas.width = size.width;
        tempCanvas.height = size.height;

        // Fill background
        ctx.fillStyle = canvasContent.canvasColor || '#ffffff';
        ctx.fillRect(0, 0, size.width, size.height);

        // If there's an image, try to draw it
        if ((canvasContent.type === 'image' || canvasContent.type === 'image_with_text') && canvasContent.data) {
          try {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
              img.onload = () => {
                clearTimeout(timeout);
                ctx.drawImage(img, 0, 0, size.width, size.height);
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Image load failed'));
              };
              img.src = canvasContent.data;
            });
          } catch (imgError) {
            console.warn('Could not load image for thumbnail:', imgError);
            // Continue without image in thumbnail
          }
        }

        // Get thumbnail (smaller version)
        const thumbnailCanvas = document.createElement('canvas');
        const thumbCtx = thumbnailCanvas.getContext('2d');
        thumbnailCanvas.width = 400;
        thumbnailCanvas.height = 300;
        thumbCtx.drawImage(tempCanvas, 0, 0, 400, 300);
        thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.7);
      } catch (thumbError) {
        console.warn('Could not create thumbnail:', thumbError);
        // Continue without thumbnail
      }

      // Save to database
      const savePayload = {
        designId: currentDesignId,
        canvasSize: selectedSize,
        canvasColor: canvasContent.canvasColor,
        contentType: canvasContent.type,
        imageUrl: canvasContent.data,
        textContent: canvasContent.type === 'text' ? canvasContent.data : canvasContent.textOverlay,
        textPosition: canvasContent.textPosition,
        textStyle: textStyle,
        thumbnail: thumbnail
      };
      
      console.log('Saving design with payload:', { 
        designId: currentDesignId, 
        contentType: canvasContent.type,
        hasImage: !!canvasContent.data,
        hasThumbnail: !!thumbnail
      });
      
      const response = await fetch('/api/save-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });

      const data = await response.json();
      console.log('Save response:', data);

      if (response.ok) {
        // Store the design ID if it's a new design or update current ID
        if (data.id) {
          if (!currentDesignId || data.updated === false) {
            console.log('Setting design ID:', data.id);
            setCurrentDesignId(data.id);
          }
        }
        if (!silent) showToast(data.message || 'Design saved successfully!');
        return true;
      } else {
        if (!silent) showToast(data.error || 'Failed to save design', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error saving design:', error);
      if (!silent) showToast('Failed to save design', 'error');
      return false;
    }
  };

  const clearCanvas = () => {
    setCanvasContent({ 
      type: null, 
      data: null, 
      fallbackUrl: null,
      textOverlay: null,
      textPosition: 'center',
      canvasColor: '#ffffff'
    });
    setShowTextEditor(false);
    setCurrentDesignId(null); // Reset design ID for new design
    showToast('Canvas cleared');
  };

  const currentSize = CANVAS_SIZES[selectedSize];
  
  // Responsive scale calculation
  const getResponsiveScale = () => {
    if (typeof window === 'undefined') return 1;
    
    const maxWidth = window.innerWidth - (window.innerWidth < 1024 ? 64 : 384); // Account for sidebar
    const maxHeight = window.innerHeight - 250;
    
    const scaleX = maxWidth / currentSize.width;
    const scaleY = maxHeight / currentSize.height;
    
    return Math.min(scaleX, scaleY, 1);
  };
  
  const [scale, setScale] = useState(1); // Start with 1 to match server render
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Set client flag and calculate scale after mount
    setIsClient(true);
    setScale(getResponsiveScale());
    
    const handleResize = () => {
      setScale(getResponsiveScale());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedSize]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Toast Notification */}
      {toast.show && (
        <div 
          className="fixed top-4 right-4 z-[100] animate-slide-in"
          onMouseEnter={() => {
            // Keep toast visible on hover
            setToast(prev => ({ ...prev, persist: true }));
          }}
          onMouseLeave={() => {
            // Resume auto-dismiss on mouse leave
            setToast(prev => ({ ...prev, persist: false }));
            setTimeout(() => {
              setToast({ show: false, message: '', type: 'success' });
            }, 1000);
          }}
        >
          <div className={`rounded-xl p-4 shadow-2xl border flex items-center gap-3 min-w-[300px] ${
            toast.type === 'success' 
              ? 'border-green-500/50 bg-green-600 shadow-green-500/20' 
              : 'border-red-500/50 bg-red-600 shadow-red-500/20'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-white/20' : 'bg-white/20'
            }`}>
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-white">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="relative z-50 glass-effect border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button onClick={() => router.push('/')} className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg hidden sm:block">Content Studio</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentDesignId && (
                <span className="text-xs text-purple-400 hidden sm:block">
                  Editing saved design
                </span>
              )}
              {lastSaved && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className={`glass-effect px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  autoSaveEnabled ? 'text-green-400 border border-green-500/30' : 'text-gray-400 border border-white/10'
                }`}
                title={autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden md:inline">Auto-save</span>
              </button>
              <button onClick={checkCredits} className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:inline">Credits</span>
              </button>
              <button onClick={saveDesign} className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="hidden md:inline">Save</span>
              </button>
              <button onClick={downloadCanvas} className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all text-sm">
                <span className="hidden md:inline">Download</span>
                <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button onClick={clearCanvas} className="glass-effect hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all text-sm">
                <span className="hidden md:inline">Clear</span>
                <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex h-[calc(100vh-4rem)]">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-4 right-4 z-50 lg:hidden w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Controls */}
        <aside className={`
          fixed lg:relative
          w-80 h-[calc(100vh-4rem)]
          border-r border-white/5 glass-effect 
          overflow-y-auto custom-scrollbar
          z-40
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-6">
            <h2 className="text-white font-bold text-xl mb-6">Canvas Editor</h2>
            
            {/* Size Selection */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-semibold mb-3">Canvas Size</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {Object.entries(CANVAS_SIZES).map(([key, { label, width, height }]) => (
                  <option key={key} value={key}>
                    {label} ({width}x{height})
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Input */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-semibold mb-3">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., 'Generate an image of a sunset over mountains' or 'Add text: Hello World in the center'"
                className="w-full h-32 px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </button>

            {/* Text Editor */}
            {(canvasContent.type === 'text' || canvasContent.type === 'image_with_text') && (
              <div className="mt-6 p-4 glass-effect rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">Text Editor</h3>
                  <button
                    onClick={() => setShowTextEditor(!showTextEditor)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showTextEditor ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                </div>

                {showTextEditor && (
                  <div className="space-y-4">
                    {/* Edit Text Content */}
                    <div>
                      <label className="block text-gray-300 text-xs mb-2">Text Content</label>
                      <textarea
                        value={canvasContent.type === 'text' ? canvasContent.data : canvasContent.textOverlay}
                        onChange={(e) => {
                          if (canvasContent.type === 'text') {
                            setCanvasContent({ ...canvasContent, data: e.target.value });
                          } else {
                            setCanvasContent({ ...canvasContent, textOverlay: e.target.value });
                          }
                        }}
                        className="w-full h-20 px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm resize-none"
                        placeholder="Enter your text..."
                      />
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-gray-300 text-xs mb-2">Font Size: {textStyle.fontSize}px</label>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={textStyle.fontSize}
                        onChange={(e) => setTextStyle({ ...textStyle, fontSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Text Position */}
                    <div>
                      <label className="block text-gray-300 text-xs mb-2">Text Position</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setCanvasContent({ ...canvasContent, textPosition: 'top' })}
                          className={`px-3 py-2 rounded-lg text-xs transition-all ${
                            canvasContent.textPosition === 'top'
                              ? 'bg-purple-600 text-white'
                              : 'bg-black/50 text-gray-400 hover:bg-black/70'
                          }`}
                        >
                          Top
                        </button>
                        <button
                          onClick={() => setCanvasContent({ ...canvasContent, textPosition: 'center' })}
                          className={`px-3 py-2 rounded-lg text-xs transition-all ${
                            canvasContent.textPosition === 'center'
                              ? 'bg-purple-600 text-white'
                              : 'bg-black/50 text-gray-400 hover:bg-black/70'
                          }`}
                        >
                          Center
                        </button>
                        <button
                          onClick={() => setCanvasContent({ ...canvasContent, textPosition: 'bottom' })}
                          className={`px-3 py-2 rounded-lg text-xs transition-all ${
                            canvasContent.textPosition === 'bottom'
                              ? 'bg-purple-600 text-white'
                              : 'bg-black/50 text-gray-400 hover:bg-black/70'
                          }`}
                        >
                          Bottom
                        </button>
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="block text-gray-300 text-xs mb-2">Font Family</label>
                      <select
                        value={textStyle.fontFamily}
                        onChange={(e) => setTextStyle({ ...textStyle, fontFamily: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm"
                      >
                        <option value="Inter">Inter</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Impact">Impact</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                      </select>
                    </div>

                    {/* Gradient Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-gray-300 text-xs">Gradient Text</label>
                      <button
                        onClick={() => setTextStyle({ ...textStyle, gradientEnabled: !textStyle.gradientEnabled })}
                        className={`w-12 h-6 rounded-full transition-all ${textStyle.gradientEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-all ${textStyle.gradientEnabled ? 'ml-6' : 'ml-1'}`} />
                      </button>
                    </div>

                    {/* Color Pickers */}
                    {textStyle.gradientEnabled ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-300 text-xs mb-2">From</label>
                          <input
                            type="color"
                            value={textStyle.gradientFrom}
                            onChange={(e) => setTextStyle({ ...textStyle, gradientFrom: e.target.value })}
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-xs mb-2">To</label>
                          <input
                            type="color"
                            value={textStyle.gradientTo}
                            onChange={(e) => setTextStyle({ ...textStyle, gradientTo: e.target.value })}
                            className="w-full h-10 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-gray-300 text-xs mb-2">Text Color</label>
                        <input
                          type="color"
                          value={textStyle.color}
                          onChange={(e) => setTextStyle({ ...textStyle, color: e.target.value })}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Background Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-gray-300 text-xs">Text Background</label>
                      <button
                        onClick={() => setTextStyle({ ...textStyle, backgroundEnabled: !textStyle.backgroundEnabled })}
                        className={`w-12 h-6 rounded-full transition-all ${textStyle.backgroundEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-all ${textStyle.backgroundEnabled ? 'ml-6' : 'ml-1'}`} />
                      </button>
                    </div>

                    {/* Background Color */}
                    {textStyle.backgroundEnabled && (
                      <div>
                        <label className="block text-gray-300 text-xs mb-2">Background Color</label>
                        <input
                          type="color"
                          value={textStyle.backgroundColor.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+).*\)/, (_, r, g, b) => 
                            '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
                          )}
                          onChange={(e) => setTextStyle({ ...textStyle, backgroundColor: e.target.value + 'cc' })}
                          className="w-full h-10 rounded-lg cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Canvas Background Color */}
                    <div>
                      <label className="block text-gray-300 text-xs mb-2">Canvas Color</label>
                      <input
                        type="color"
                        value={canvasContent.canvasColor || '#ffffff'}
                        onChange={(e) => setCanvasContent({ ...canvasContent, canvasColor: e.target.value })}
                        className="w-full h-10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-gray-300 text-sm font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setPrompt('Generate an image of sunset over ocean waves')}
                  className="w-full glass-effect hover:bg-white/10 text-gray-300 text-sm py-2 px-4 rounded-lg transition-all text-left"
                >
                  Generate Image Only
                </button>
                <button
                  onClick={() => setPrompt('Add motivational quote')}
                  className="w-full glass-effect hover:bg-white/10 text-gray-300 text-sm py-2 px-4 rounded-lg transition-all text-left"
                >
                  Add Text Only
                </button>
                <button
                  onClick={() => setPrompt('Generate mountain peak image and add motivational quote in center')}
                  className="w-full glass-effect hover:bg-white/10 text-gray-300 text-sm py-2 px-4 rounded-lg transition-all text-left"
                >
                  Image with Text Overlay
                </button>
                <button
                  onClick={() => setPrompt('Make background purple')}
                  className="w-full glass-effect hover:bg-white/10 text-gray-300 text-sm py-2 px-4 rounded-lg transition-all text-left"
                >
                  Change Canvas Color
                </button>
              </div>
            </div>

            {/* Prompt Tips */}
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h3 className="text-purple-300 text-xs font-semibold mb-2">💡 Prompt Tips</h3>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Image: "generate sunset ocean waves"</li>
                <li>• Text: "add motivational quote"</li>
                <li>• Both: "generate beach image with quote"</li>
                <li>• Color: "make background blue"</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto" style={{
          background: '#1f2937',
          backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}>
          <div className="relative" style={{ 
            width: currentSize.width * scale, 
            height: currentSize.height * scale,
            maxWidth: '100%'
          }}>
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={currentSize.width}
              height={currentSize.height}
              className="absolute inset-0 rounded-lg shadow-2xl"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#ffffff'
              }}
            />
            
            {/* Content Overlay */}
            <div 
              className="absolute inset-0 rounded-lg shadow-2xl overflow-hidden"
              style={{ backgroundColor: canvasContent.canvasColor || '#ffffff' }}
            >
              {(canvasContent.type === 'image' || canvasContent.type === 'image_with_text') && canvasContent.data && (
                <>
                  <img
                    src={canvasContent.data}
                    alt="Generated content"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      // Silently try fallback without logging error
                      if (canvasContent.fallbackUrl && e.target.src !== canvasContent.fallbackUrl) {
                        e.target.src = canvasContent.fallbackUrl;
                      } else {
                        // Only show error if both URLs fail
                        e.target.style.display = 'none';
                        showToast('Image failed to load. Try different keywords.', 'error');
                      }
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                      console.log('Image loaded from:', canvasContent.data.includes('picsum') ? 'Picsum' : 'Unsplash');
                    }}
                  />
                  
                  {/* Text Overlay on Image */}
                  {canvasContent.type === 'image_with_text' && canvasContent.textOverlay && (
                    <div className={`absolute inset-0 flex ${
                      canvasContent.textPosition === 'top' ? 'items-start pt-12' :
                      canvasContent.textPosition === 'bottom' ? 'items-end pb-12' :
                      'items-center'
                    } justify-center p-8`}>
                      {textStyle.backgroundEnabled ? (
                        <div 
                          className="rounded-2xl max-w-[80%]"
                          style={{
                            padding: `${24 * scale}px ${32 * scale}px`,
                            backgroundColor: textStyle.backgroundColor,
                            backdropFilter: 'blur(8px)'
                          }}
                        >
                          <p 
                            className="font-bold text-center leading-relaxed"
                            style={{
                              fontSize: `${(textStyle.fontSize * scale)}px`,
                              fontFamily: textStyle.fontFamily,
                              ...(textStyle.gradientEnabled ? {
                                backgroundImage: `linear-gradient(to right, ${textStyle.gradientFrom}, ${textStyle.gradientTo})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              } : {
                                color: textStyle.color
                              })
                            }}
                          >
                            {canvasContent.textOverlay}
                          </p>
                        </div>
                      ) : (
                        <p 
                          className="font-bold text-center leading-relaxed max-w-[80%]"
                          style={{
                            fontSize: `${(textStyle.fontSize * scale)}px`,
                            fontFamily: textStyle.fontFamily,
                            ...(textStyle.gradientEnabled ? {
                              backgroundImage: `linear-gradient(to right, ${textStyle.gradientFrom}, ${textStyle.gradientTo})`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.9)) drop-shadow(-2px -2px 4px rgba(0,0,0,0.9))'
                            } : {
                              color: textStyle.color,
                              textShadow: '2px 2px 8px rgba(0,0,0,0.9), -2px -2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)'
                            })
                          }}
                        >
                          {canvasContent.textOverlay}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {canvasContent.type === 'text' && (
                <div className={`w-full h-full flex ${
                  canvasContent.textPosition === 'top' ? 'items-start pt-12' :
                  canvasContent.textPosition === 'bottom' ? 'items-end pb-12' :
                  'items-center'
                } justify-center p-8`}>
                  {textStyle.backgroundEnabled ? (
                    <div 
                      className="rounded-2xl max-w-[90%]"
                      style={{
                        padding: `${24 * scale}px ${32 * scale}px`,
                        backgroundColor: textStyle.backgroundColor,
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <p 
                        className="font-bold text-center leading-relaxed"
                        style={{
                          fontSize: `${(textStyle.fontSize * scale)}px`,
                          fontFamily: textStyle.fontFamily,
                          wordBreak: 'break-word',
                          ...(textStyle.gradientEnabled ? {
                            backgroundImage: `linear-gradient(to right, ${textStyle.gradientFrom}, ${textStyle.gradientTo})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          } : {
                            color: textStyle.color
                          })
                        }}
                      >
                        {canvasContent.data}
                      </p>
                    </div>
                  ) : (
                    <p 
                      className="font-bold text-center leading-relaxed max-w-[90%]"
                      style={{
                        fontSize: `${(textStyle.fontSize * scale)}px`,
                        fontFamily: textStyle.fontFamily,
                        wordBreak: 'break-word',
                        ...(textStyle.gradientEnabled ? {
                          backgroundImage: `linear-gradient(to right, ${textStyle.gradientFrom}, ${textStyle.gradientTo})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.9)) drop-shadow(-2px -2px 4px rgba(0,0,0,0.9))'
                        } : {
                          color: textStyle.color
                        })
                      }}
                    >
                      {canvasContent.data}
                    </p>
                  )}
                </div>
              )}
              
              {!canvasContent.type && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Enter a prompt to generate content</p>
                  </div>
                </div>
              )}
            </div>

            {/* Size Label */}
            <div className="absolute -bottom-8 left-0 right-0 text-center">
              <span className="text-gray-400 text-sm">
                {currentSize.label} - {currentSize.width} × {currentSize.height}px
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading canvas editor...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
