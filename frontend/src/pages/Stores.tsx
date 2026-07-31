import React, { useState } from 'react';
import { useCMS } from '../context/CMSContext';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation } from 'lucide-react';

export const Stores: React.FC = () => {
  const { stores } = useCMS();
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // mobile toggle

  const activeStore = stores.find((s) => s.id === selectedStoreId);

  // SVG coordinate mappings for our stylized Indiranagar/HSR/Whitefield mock map
  const storeCoordinates: Record<string, { x: number; y: number }> = {
    st_1: { x: 350, y: 220 }, // Indiranagar (Center-Left)
    st_2: { x: 380, y: 380 }, // HSR Layout (Bottom-Center)
    st_3: { x: 620, y: 150 }, // Whitefield (Top-Right)
  };

  const handleCardClick = (id: string) => {
    setSelectedStoreId(id);
    setViewMode('map');
  };

  return (
    <div className="page-wrapper">
      <SEO 
        title="Physical Stores & Fulfillment Hubs | FreshCart Locator"
        description="Find a FreshCart experience store or local dark store fulfillment hub near you in Bengaluru, Mumbai, or Delhi."
      />

      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] py-8 pb-16">
        {/* Title Header */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-3 text-text-primary">Fulfillment Centers</h1>
          <p className="text-sm text-text-secondary">We manage express dark stores across tech corridors to guarantee delivery times under 30 minutes.</p>
        </section>

        {/* Mobile View Toggle Bar */}
        <div className="flex md:hidden border border-divider rounded-lg mb-6 overflow-hidden bg-background">
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${viewMode === 'map' ? 'bg-primary text-white' : 'text-text-secondary'}`}
            onClick={() => setViewMode('map')}
          >
            Map View
          </button>
        </div>

        {/* Locator Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] bg-surface border border-divider rounded-2xl overflow-hidden min-h-[500px] shadow-card">
          
          {/* Left Panel: Store Listing */}
          <aside className={`flex-col border-r border-divider h-full max-h-[600px] ${viewMode === 'list' ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-4 border-b border-divider bg-background/50">
              <h3 className="text-sm font-bold text-text-primary">Nearby Hubs ({stores.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              {stores.map((store) => {
                const isActive = store.id === selectedStoreId;
                return (
                  <div
                    key={store.id}
                    onClick={() => handleCardClick(store.id)}
                    className={`p-4 border-b border-divider cursor-pointer hover:bg-background transition-all duration-150 last:border-b-0 ${isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-text-primary">{store.name}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">OPEN</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-normal mb-3">{store.address}</p>
                    
                    <div className="flex flex-wrap gap-4 text-[10px] text-text-secondary font-medium">
                      <span className="flex items-center gap-1"><Clock size={12} /> {store.timings}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {store.phone}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Panel: Stylized Map Canvas */}
          <main className={`relative flex-1 bg-background flex flex-col justify-center items-center overflow-hidden min-h-[400px] ${viewMode === 'map' ? 'flex' : 'hidden md:flex'}`}>
            
            {/* Custom Interactive SVG Vector Map Grid */}
            <svg viewBox="0 0 800 500" className="w-full h-full max-h-[500px] p-6" xmlns="http://www.w3.org/2000/svg">
              {/* Background Roads / Grid lines */}
              <line x1="50" y1="200" x2="750" y2="200" stroke="#DFDFDF" strokeWidth="8" />
              <line x1="400" y1="50" x2="400" y2="450" stroke="#DFDFDF" strokeWidth="8" />
              <line x1="100" y1="100" x2="700" y2="400" stroke="#EAEAEA" strokeWidth="4" />
              
              {/* Major Ring Road Arc */}
              <path d="M 100 400 Q 400 450 700 400" fill="none" stroke="#E3E3E3" strokeWidth="6" />

              {/* Park SVG shapes */}
              <rect x="150" y="80" width="120" height="80" rx="10" fill="#D4EDDA" opacity="0.6" />
              <text x="210" y="125" fill="#28A745" fontSize="12" fontWeight="bold" textAnchor="middle">Cubbon Park</text>
              
              <rect x="520" y="280" width="160" height="120" rx="15" fill="#D4EDDA" opacity="0.6" />
              <text x="600" y="345" fill="#28A745" fontSize="12" fontWeight="bold" textAnchor="middle">Eco Space Lake</text>

              {/* Store Coverage Radius Ring */}
              {activeStore && storeCoordinates[selectedStoreId] && (
                <circle 
                  cx={storeCoordinates[selectedStoreId].x}
                  cy={storeCoordinates[selectedStoreId].y}
                  r="75"
                  fill="rgba(76, 175, 80, 0.1)"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                />
              )}

              {/* Pins layer */}
              {stores.map((store) => {
                const coords = storeCoordinates[store.id];
                if (!coords) return null;
                const isActive = store.id === selectedStoreId;
                
                return (
                  <g 
                    key={store.id} 
                    transform={`translate(${coords.x}, ${coords.y})`} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedStoreId(store.id)}
                  >
                    {/* Pulsing indicator */}
                    {isActive && (
                      <circle r="22" fill="rgba(76, 175, 80, 0.2)">
                        <animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    
                    {/* Pin shape */}
                    <path 
                      d="M 0 -22 C -6 -22 -10 -18 -10 -12 C -10 -4 0 8 0 8 C 0 8 10 -4 10 -12 C 10 -18 6 -22 0 -22 Z"
                      fill={isActive ? 'var(--primary)' : 'var(--text-secondary)'} 
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle cx="0" cy="-12" r="4.5" fill="#FFFFFF" />
                  </g>
                );
              })}
            </svg>

            {/* Float Info Card Overlay on Map */}
            {activeStore && (
              <div className="absolute top-4 left-4 right-4 bg-surface p-4 rounded-xl border border-divider shadow-premium flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-text-primary">{activeStore.name}</div>
                  <span className="text-xs text-text-secondary">📍 {activeStore.address}</span>
                </div>
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeStore.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-secondary transition-colors"
                >
                  <Navigation size={12} />
                  <span>Navigate</span>
                </a>
              </div>
            )}

            {/* Custom map control selectors */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
              <button className="w-9 h-9 bg-surface border border-divider rounded-lg flex items-center justify-center font-bold text-lg text-text-primary shadow-sm hover:bg-background">+</button>
              <button className="w-9 h-9 bg-surface border border-divider rounded-lg flex items-center justify-center font-bold text-lg text-text-primary shadow-sm hover:bg-background">-</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
