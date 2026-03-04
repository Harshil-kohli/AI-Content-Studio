'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDemo, setCurrentDemo] = useState(0);
  const [showDemoImage, setShowDemoImage] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [sidebarPrompt, setSidebarPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hi! I can help you create detailed prompts for your social media content. What would you like to create?'
    }
  ]);
  
  const demoSequence = [
    {
      prompt: 'Create a vibrant Instagram post about morning coffee',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'
    },
    {
      prompt: 'Design a professional LinkedIn post about AI innovation',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80'
    },
    {
      prompt: 'Generate an engaging Twitter post about productivity',
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'
    }
  ];



  // Demo animation cycle
  useEffect(() => {
    const runDemoSequence = () => {
      setShowDemoImage(false);
      
      setTimeout(() => {
        setIsGenerating(true);
        
        setTimeout(() => {
          setIsGenerating(false);
          
          setTimeout(() => {
            setShowDemoImage(true);
            
            setTimeout(() => {
              setCurrentDemo((prev) => (prev + 1) % demoSequence.length);
            }, 3000);
          }, 100);
        }, 2500);
      }, 100);
    };

    runDemoSequence();
    const interval = setInterval(runDemoSequence, 6000);
    
    return () => clearInterval(interval);
  }, [currentDemo, demoSequence.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      // Navigate to dashboard with prompt
      window.location.href = `/dashboard?prompt=${encodeURIComponent(prompt)}`;
    }
  };

  const handleSidebarSubmit = async (e) => {
    e.preventDefault();
    if (sidebarPrompt.trim()) {
      // Close sidebar on mobile
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: sidebarPrompt
      };
      
      setChatMessages([...chatMessages, userMessage]);
      setSidebarPrompt('');
      
      // Add loading message
      const loadingMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Generating detailed prompt...',
        isLoading: true
      };
      setChatMessages(prev => [...prev, loadingMessage]);
      
      try {
        const response = await fetch('/api/generate-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userPrompt: sidebarPrompt }),
        });
        
        const data = await response.json();
        
        // Remove loading message and add AI response
        setChatMessages(prev => {
          const filtered = prev.filter(msg => !msg.isLoading);
          return [...filtered, {
            id: Date.now() + 2,
            type: 'assistant',
            content: data.enhancedPrompt || 'Sorry, I could not generate a prompt. Please try again.'
          }];
        });
      } catch (error) {
        console.error('Error generating prompt:', error);
        setChatMessages(prev => {
          const filtered = prev.filter(msg => !msg.isLoading);
          return [...filtered, {
            id: Date.now() + 2,
            type: 'assistant',
            content: 'Sorry, there was an error generating the prompt. Please try again.'
          }];
        });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleSavePrompt = async (promptContent) => {
    try {
      const title = promptContent.substring(0, 50) + (promptContent.length > 50 ? '...' : '');
      
      const response = await fetch('/api/save-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title,
          content: promptContent 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSavedPrompts([data.prompt, ...savedPrompts]);
        showToast('Prompt saved successfully!');
      } else {
        showToast('Failed to save prompt: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      showToast('Error saving prompt', 'error');
    }
  };

  // Fetch saved prompts on mount
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const response = await fetch('/api/save-prompt');
        const data = await response.json();
        if (response.ok) {
          setSavedPrompts(data.prompts || []);
        }
      } catch (error) {
        console.error('Error fetching prompts:', error);
      }
    };
    
    const fetchDesigns = async () => {
      try {
        setLoadingDesigns(true);
        const response = await fetch('/api/save-design');
        const data = await response.json();
        
        if (response.ok) {
          setDesigns(data.designs || []);
        }
      } catch (error) {
        console.error('Error fetching designs:', error);
      } finally {
        setLoadingDesigns(false);
      }
    };
    
    fetchPrompts();
    fetchDesigns();
  }, []);

  const displayedPrompts = showAllPrompts ? savedPrompts : savedPrompts.slice(0, 3);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Toast Notification */}
      {toast.show && (
        <div 
          className="fixed top-4 right-4 z-[100] animate-slide-in"
          onMouseEnter={() => {
            setToast(prev => ({ ...prev, persist: true }));
          }}
          onMouseLeave={() => {
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

      <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-full liquid-blob animate-float"></div>
      <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-red-600 via-purple-600 to-pink-600 rounded-full liquid-blob animate-float-slow"></div>
      <div className="absolute bottom-20 left-1/3 w-[450px] h-[450px] bg-gradient-to-br from-pink-600 via-purple-600 to-red-600 rounded-full liquid-blob animate-float-delayed"></div>

      <nav className="relative z-50 glass-effect border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">Content Studio</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Templates</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Analytics</a>
            </div>

            <div className="flex items-center space-x-3">
              <button className="hidden sm:block glass-effect hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-all text-xs">
                Upgrade
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center cursor-pointer">
                <span className="text-white text-xs font-semibold">JD</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-4 left-4 z-50 lg:hidden w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            )}
          </svg>
        </button>

        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:relative
          w-80 xl:w-96 
          border-r border-white/5 glass-effect 
          min-h-screen
          z-40
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col sticky top-16 h-[calc(100vh-4rem)]">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-white font-semibold text-sm">Prompt Generator</h3>
              <p className="text-gray-400 text-xs mt-1">Create detailed prompts with AI</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm relative group ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                        : message.isLoading
                        ? 'glass-effect text-gray-300 border border-white/5 animate-pulse'
                        : 'glass-effect text-gray-300 border border-white/5'
                    }`}
                  >
                    {message.content}
                    {message.type === 'assistant' && !message.isLoading && (
                      <button
                        onClick={() => handleSavePrompt(message.content)}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 transform"
                        title="Save prompt"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/5">
              <form onSubmit={handleSidebarSubmit}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sidebarPrompt}
                    onChange={(e) => setSidebarPrompt(e.target.value)}
                    placeholder="Describe what you need..."
                    className="flex-1 px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-2 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-h-screen">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent animate-gradient leading-tight">
              AI Content Studio
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Create stunning social media posts with AI-powered content generation
            </p>
          </header>

          <div className="mb-8">
            <div className="glass-effect rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-300 text-xs font-semibold mb-2">
                    What would you like to create?
                  </label>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe your social media post idea..."
                      className="w-full h-24 px-4 py-3 bg-black/50 border border-purple-500/30 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                    />
                    <div className="absolute bottom-3 right-3 text-gray-500 text-xs">
                      {prompt.length}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/30 text-sm"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>✨</span>
                      <span>Generate Content</span>
                    </span>
                  </button>
                  
                  <div className="flex gap-2 justify-center">
                    <button type="button" className="glass-effect hover:bg-white/10 font-medium py-3 px-4 rounded-xl transition-all border border-white/5 group" title="Instagram">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-pink-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </button>
                    <button type="button" className="glass-effect hover:bg-white/10 font-medium py-3 px-4 rounded-xl transition-all border border-white/5 group" title="Twitter">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </button>
                    <button type="button" className="glass-effect hover:bg-white/10 font-medium py-3 px-4 rounded-xl transition-all border border-white/5 group" title="LinkedIn">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-pink-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </button>
                    <button type="button" className="glass-effect hover:bg-white/10 font-medium py-3 px-4 rounded-xl transition-all border border-white/5 group" title="Facebook">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="mb-8">
            <div className="glass-effect rounded-2xl p-4 sm:p-6 border border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-500 text-xs ml-2">AI Generation Demo</span>
                </div>
                
                <div className="bg-black/50 border border-purple-500/30 rounded-xl p-3 mb-4">
                  <p className="text-gray-300 text-xs sm:text-sm typing-animation">
                    {demoSequence[currentDemo].prompt}
                  </p>
                </div>

                <div className="relative min-h-[240px] sm:min-h-[280px] flex items-center justify-center">
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showDemoImage && !isGenerating && (
                    <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden fade-in">
                      <Image
                        src={demoSequence[currentDemo].image}
                        alt="Generated content"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 text-white">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium">Generated Successfully</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Designs</h2>
              <div className="flex gap-3 flex-wrap">
                <button className="glass-effect bg-white/10 text-white text-sm font-medium py-2 px-5 rounded-lg transition-all border border-purple-500/50">All</button>
                <button className="glass-effect hover:bg-white/10 text-gray-300 text-sm font-medium py-2 px-5 rounded-lg transition-all border border-white/5">Banners</button>
                <button className="glass-effect hover:bg-white/10 text-gray-300 text-sm font-medium py-2 px-5 rounded-lg transition-all border border-white/5">Avatars</button>
                <button className="glass-effect hover:bg-white/10 text-gray-300 text-sm font-medium py-2 px-5 rounded-lg transition-all border border-white/5">Posts</button>
              </div>
            </div>

            {loadingDesigns ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading designs...</p>
              </div>
            ) : designs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 mb-4">No designs yet</p>
                <button onClick={scrollToTop} className="glass-effect hover:bg-white/10 text-purple-400 font-medium py-2 px-6 rounded-lg transition-all border border-purple-500/30">
                  Create Your First Design
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showAllPosts ? designs : designs.slice(0, 6)).map((design) => (
                    <div 
                      key={design._id} 
                      onClick={() => window.location.href = `/dashboard?designId=${design._id}`}
                      className="glass-effect rounded-2xl overflow-hidden hover:bg-white/10 transition-all transform hover:scale-[1.02] cursor-pointer group border border-white/5"
                    >
                      <div className="relative h-48 overflow-hidden bg-gray-800">
                        {design.thumbnail ? (
                          <img src={design.thumbnail} alt="Design" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                        <div className="absolute top-4 right-4">
                          <span className="text-xs px-3 py-1 rounded-full font-medium backdrop-blur-sm bg-purple-500/30 text-purple-300 border border-purple-500/50">
                            {design.canvasSize?.replace('-', ' ') || 'design'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {design.contentType === 'image' ? 'Image' : design.contentType === 'text' ? 'Text' : 'Image + Text'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(design.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-gray-300 mb-4 line-clamp-2 text-sm leading-relaxed">
                          {design.textContent || 'Visual design'}
                        </p>
                        
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/dashboard?designId=${design._id}`;
                            }}
                            className="flex-1 glass-effect hover:bg-white/10 py-2 rounded-lg transition-all text-xs text-gray-400 hover:text-purple-400 border border-white/5"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(`/api/save-design?id=${design._id}`, { method: 'DELETE' });
                                if (response.ok) {
                                  setDesigns(designs.filter(d => d._id !== design._id));
                                  showToast('Design deleted');
                                }
                              } catch (error) {
                                showToast('Failed to delete', 'error');
                              }
                            }}
                            className="glass-effect hover:bg-white/10 py-2 px-3 rounded-lg transition-all text-xs text-gray-400 hover:text-red-400 border border-white/5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button onClick={scrollToTop} className="w-full glass-effect rounded-2xl p-4 border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer group">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-medium text-sm">Create New Design</p>
                    </div>
                  </button>
                </div>

                {designs.length > 6 && (
                  <div className="mt-8 text-center">
                    <button onClick={() => setShowAllPosts(!showAllPosts)} className="glass-effect hover:bg-white/10 text-white font-medium py-3 px-8 rounded-xl transition-all border border-white/10 hover:border-purple-500/50">
                      {showAllPosts ? (
                        <span className="flex items-center gap-2">
                          <span>Show Less</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>Show All ({designs.length} designs)</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mb-16">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Analytics Overview</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="glass-effect rounded-2xl p-6 text-center border border-white/5 hover:border-purple-500/30 transition-all">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">127</div>
                <div className="text-gray-400 text-xs sm:text-sm">Total Posts</div>
              </div>
              <div className="glass-effect rounded-2xl p-6 text-center border border-white/5 hover:border-pink-500/30 transition-all">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent mb-2">89</div>
                <div className="text-gray-400 text-xs sm:text-sm">Published</div>
              </div>
              <div className="glass-effect rounded-2xl p-6 text-center border border-white/5 hover:border-red-500/30 transition-all">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent mb-2">12.4K</div>
                <div className="text-gray-400 text-xs sm:text-sm">Engagement</div>
              </div>
              <div className="glass-effect rounded-2xl p-6 text-center border border-white/5 hover:border-purple-500/30 transition-all">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-2">94%</div>
                <div className="text-gray-400 text-xs sm:text-sm">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Saved Prompts Section */}
          {savedPrompts.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white">Saved Prompts</h3>
                {savedPrompts.length > 3 && (
                  <button
                    onClick={() => setShowAllPrompts(!showAllPrompts)}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {showAllPrompts ? 'Show Less' : `View All (${savedPrompts.length})`}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedPrompts.map((prompt) => (
                  <div
                    key={prompt._id}
                    className="glass-effect rounded-2xl p-5 border border-white/5 hover:border-purple-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-semibold text-white line-clamp-1">{prompt.title}</h4>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this prompt?')) {
                            try {
                              await fetch(`/api/save-prompt?id=${prompt._id}`, { method: 'DELETE' });
                              setSavedPrompts(savedPrompts.filter(p => p._id !== prompt._id));
                            } catch (error) {
                              console.error('Error deleting prompt:', error);
                            }
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{prompt.content}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(prompt.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(prompt.content);
                          showToast('Copied to clipboard!');
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <footer className="relative z-50 glass-effect border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg">Content Studio</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Empowering creators with AI-driven content generation for social media success.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-lg glass-effect hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg glass-effect hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-pink-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg glass-effect hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm text-center sm:text-left">© 2026 AI Content Studio. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
