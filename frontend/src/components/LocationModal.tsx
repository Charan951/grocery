import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, X, Check } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: any;
  onSelectLocation: (location: any) => void;
}

interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  houseNo?: string;
  landmark?: string;
  area: string;
  fullAddress: string;
  pincode: string;
  lat: number;
  lng: number;
}

const defaultPopularLocations = [
  { name: 'HITEC City (Hyderabad)', lat: 17.4474, lng: 78.3762 },
  { name: 'Kukatpally (Hyderabad)', lat: 17.4842, lng: 78.3888 },
  { name: 'Indiranagar (Bengaluru)', lat: 12.9784, lng: 77.6408 },
  { name: 'HSR Layout (Bengaluru)', lat: 12.9121, lng: 77.6446 },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const initialString = typeof currentLocation === 'string' 
    ? currentLocation 
    : currentLocation?.fullAddress || currentLocation?.address || 'Balaji Nagar, KPHB Colony, Ward 115 Balaji Nagar, Greater Hyderabad Municipal Corporation West Zone, Hyderabad, Kukatpally mandal, Medchal-Malkajgiri, Telangana, 500072, India';

  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState<[number, number]>([17.4842, 78.3888]);
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [fullAddressText, setFullAddressText] = useState(initialString);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    const cached = localStorage.getItem('saved_addresses');
    return cached ? JSON.parse(cached) : [
      {
        id: 'addr_1',
        label: 'Home',
        houseNo: 'Flat 402, Sunshine Apts',
        landmark: 'Near Metro Station',
        area: 'KPHB COLONY',
        fullAddress: 'Balaji Nagar, KPHB Colony, Ward 115 Balaji Nagar, Greater Hyderabad Municipal Corporation West Zone, Hyderabad, Kukatpally mandal, Medchal-Malkajgiri, Telangana, 500072, India',
        pincode: '500072',
        lat: 17.4842,
        lng: 78.3888,
      }
    ];
  });

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          setFullAddressText(`New Balaji Nagar, KPHB Colony, Hyderabad, Telangana 500072, India`);
        },
        () => {
          alert('Could not detect exact location. Defaulting to KPHB Colony.');
        }
      );
    }
  };

  const handleConfirmLocation = () => {
    const finalAddressString = `${houseNo ? houseNo + ', ' : ''}${landmark ? landmark + ', ' : ''}${fullAddressText}`;
    
    const newAddrObj: SavedAddress = {
      id: 'addr_' + Date.now(),
      label,
      houseNo,
      landmark,
      area: 'KPHB COLONY',
      fullAddress: finalAddressString,
      pincode: '500072',
      lat: position[0],
      lng: position[1],
    };

    const updated = [newAddrObj, ...savedAddresses];
    setSavedAddresses(updated);
    localStorage.setItem('saved_addresses', JSON.stringify(updated));

    onSelectLocation(finalAddressString);
    onClose();
  };

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    onSelectLocation(addr.fullAddress);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Content Card matching image copy 2.png */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-[620px] bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00A86B] flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 font-display leading-tight">
                    Select Delivery Location
                  </h2>
                  <p className="text-xs text-gray-400 font-medium">
                    Pin exact location on OpenStreetMap
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              
              {/* Search Bar + Locate Me Button */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 focus-within:border-[#00A86B] rounded-2xl px-4 py-2.5 flex items-center gap-2 transition-all">
                  <Search size={18} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type area, landmark or street (e.g. HITEC City, Indiranagar)..."
                    className="w-full bg-transparent border-none outline-none text-xs font-semibold text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Navigation size={15} />
                  <span>Locate Me</span>
                </button>
              </div>

              {/* Popular Location Tags */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider shrink-0">POPULAR:</span>
                {defaultPopularLocations.map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPosition([loc.lat, loc.lng]);
                      setFullAddressText(`${loc.name}, India`);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <span>📍</span> {loc.name}
                  </button>
                ))}
              </div>

              {/* OpenStreetMap Iframe Container matching image copy 2.png */}
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-gray-200 relative shadow-2xs shrink-0">
                <iframe
                  title="OpenStreetMap Location Picker"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${position[1] - 0.01}%2C${position[0] - 0.01}%2C${position[1] + 0.01}%2C${position[0] + 0.01}&layer=mapnik&marker=${position[0]}%2C${position[1]}`}
                  className="pointer-events-auto"
                />

                <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] font-bold text-gray-700 border border-gray-200 shadow-2xs">
                  💡 Drag marker or click map
                </div>
              </div>

              {/* Address Form Card matching image copy 2.png */}
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00A86B] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[#00A86B] uppercase tracking-wider">
                        KPHB COLONY
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        PIN: 500072
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-snug mt-1">
                      {fullAddressText}
                    </p>
                  </div>
                </div>

                {/* Input Fields Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      HOUSE / FLAT / DOOR NO
                    </label>
                    <input
                      type="text"
                      value={houseNo}
                      onChange={(e) => setHouseNo(e.target.value)}
                      placeholder="e.g. Flat No, Building Name"
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#00A86B]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      LANDMARK (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Bus Stop"
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#00A86B]"
                    />
                  </div>
                </div>

                {/* Save Address As Label Selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">SAVE AS:</span>
                  {(['Home', 'Work', 'Other'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        label === l
                          ? 'bg-[#00A86B] text-white shadow-2xs'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {l === 'Home' ? '🏠 Home' : l === 'Work' ? '💼 Work' : '📍 Other'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Addresses List (Matching image copy 3.png) */}
              {savedAddresses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    SAVED ADDRESSES
                  </h4>
                  {savedAddresses.map((addr, idx) => (
                    <div
                      key={addr.id || `addr_loc_${idx}`}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className="bg-white border border-gray-200 hover:border-[#00A86B] p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-gray-900 group-hover:text-[#00A86B]">
                            {addr.label}
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 line-clamp-1">
                            {addr.fullAddress}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-[#00A86B] opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Bottom Action Footer matching image copy 2.png */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-extrabold text-gray-500 hover:text-gray-800 px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLocation}
                className="bg-[#00A86B] hover:bg-[#00915c] text-white font-extrabold text-xs px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
              >
                <Check size={16} />
                <span>Confirm & Deliver Here</span>
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
