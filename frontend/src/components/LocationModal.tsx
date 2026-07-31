import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Check, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issues with Vite / Leaflet in React
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export interface UserLocation {
  address: string;
  area: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  flatNo?: string;
  landmark?: string;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectLocation: (loc: UserLocation) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.lat || 12.9716,
    lng: currentLocation?.lng || 77.5946
  });

  const [addressDetails, setAddressDetails] = useState<UserLocation>({
    address: currentLocation?.address || 'Indiranagar 100ft Road, Bengaluru',
    area: currentLocation?.area || 'Indiranagar',
    city: currentLocation?.city || 'Bengaluru',
    pincode: currentLocation?.pincode || '560038',
    lat: currentLocation?.lat || 12.9716,
    lng: currentLocation?.lng || 77.5946,
    flatNo: currentLocation?.flatNo || '',
    landmark: currentLocation?.landmark || ''
  });

  // Reverse Geocode coordinates using OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsFetchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};
        
        const area = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.subdistrict || 'Local Area';
        const city = addr.city || addr.town || addr.village || addr.county || 'Bengaluru';
        const pincode = addr.postcode || '560001';
        const fullAddress = data.display_name || `${area}, ${city}`;

        const newLoc: UserLocation = {
          address: fullAddress,
          area: area,
          city: city,
          pincode: pincode,
          lat: lat,
          lng: lng,
          flatNo: addressDetails.flatNo,
          landmark: addressDetails.landmark
        };

        setAddressDetails(newLoc);
      }
    } catch (err) {
      console.error('Failed to reverse geocode location:', err);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  // Handle OSM Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small timeout to allow DOM modal render
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedCoords.lat, selectedCoords.lng],
          zoom: 15,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
          icon: defaultIcon,
          draggable: true
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          reverseGeocode(pos.lat, pos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([selectedCoords.lat, selectedCoords.lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up map instance on close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  // Handle Geolocation permission and current position fetch
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setSelectedCoords({ lat, lng });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }

        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location permission denied. Please allow location access or select manually on the map.');
        } else {
          alert('Failed to detect precise location: ' + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Popular default suggestion chips for fast one-tap location selection
  const popularLocations = [
    { name: 'HITEC City', area: 'Hyderabad', lat: 17.4435, lng: 78.3772 },
    { name: 'Indiranagar', area: 'Bengaluru', lat: 12.9719, lng: 77.6412 },
    { name: 'HSR Layout', area: 'Bengaluru', lat: 12.9103, lng: 77.6450 },
    { name: 'Whitefield', area: 'Bengaluru', lat: 12.9844, lng: 77.7479 },
    { name: 'Jubilee Hills', area: 'Hyderabad', lat: 17.4319, lng: 78.4073 },
    { name: 'Bandra West', area: 'Mumbai', lat: 19.0596, lng: 72.8295 },
    { name: 'Connaught Place', area: 'Delhi', lat: 28.6315, lng: 77.2167 },
  ];

  // Real-time debounced search as user types
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        // Search Nominatim with User-Agent header & country restriction for fast real-time autocomplete
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&addressdetails=1&dedupe=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'FreshCartGroceryApp/1.0 (https://freshcart.app)'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          // If strict country search yielded few results, fallback to broader query
          if (data.length === 0) {
            const fallbackRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`,
              {
                headers: {
                  'Accept-Language': 'en',
                  'User-Agent': 'FreshCartGroceryApp/1.0 (https://freshcart.app)'
                }
              }
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              setSearchResults(fallbackData);
              return;
            }
          }
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Real-time location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchPlaces = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Debounced effect handles live search automatically
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setSelectedCoords({ lat, lng });

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }

    setSearchResults([]);
    setSearchQuery('');
    reverseGeocode(lat, lng);
  };

  const handleSaveLocation = () => {
    onSelectLocation(addressDetails);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-divider rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-divider flex items-center justify-between bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-primary">Select Delivery Location</h3>
              <p className="text-xs text-text-tertiary font-medium">Pin exact location on OpenStreetMap</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-background border border-divider flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Top Actions: Search + Locate Me */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearchPlaces} className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type area, landmark or street (e.g. HITEC City, Indiranagar)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-background border border-divider text-xs font-semibold text-text-primary focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isSearching && <Loader2 size={15} className="animate-spin text-emerald-600" />}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-text-tertiary hover:text-text-primary p-0.5"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md flex-shrink-0 disabled:opacity-50"
              >
                {isLocating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Navigation size={16} />
                )}
                <span>Locate Me</span>
              </button>
            </div>

            {/* Popular Quick Choice Chips when query is empty */}
            {!searchQuery && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
                <span className="text-[10px] font-extrabold uppercase text-text-tertiary tracking-wider mr-1 flex-shrink-0">Popular:</span>
                {popularLocations.map((pop, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCoords({ lat: pop.lat, lng: pop.lng });
                      if (mapInstanceRef.current && markerRef.current) {
                        mapInstanceRef.current.setView([pop.lat, pop.lng], 16);
                        markerRef.current.setLatLng([pop.lat, pop.lng]);
                      }
                      reverseGeocode(pop.lat, pop.lng);
                    }}
                    className="px-3 py-1 rounded-full bg-surface border border-divider hover:border-emerald-500/50 hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-700 text-[11px] font-extrabold transition-all flex-shrink-0 shadow-2xs"
                  >
                    📍 {pop.name} ({pop.area})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Search Results Dropdown Overlay */}
          {searchResults.length > 0 && (
            <div className="bg-background border border-divider rounded-2xl overflow-hidden shadow-2xl divide-y divide-divider/60 max-h-60 overflow-y-auto animate-in fade-in duration-150 z-20">
              <div className="px-3 py-1.5 bg-emerald-500/10 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                REAL-TIME MATCHING LOCATIONS ({searchResults.length})
              </div>
              {searchResults.map((res, idx) => {
                const parts = res.display_name.split(',');
                const title = parts[0]?.trim();
                const subtitle = parts.slice(1).join(',').trim();
                const postcode = res.address?.postcode;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full p-3 text-left hover:bg-emerald-500/10 transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <MapPin size={16} className="text-emerald-600 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="text-xs min-w-0 flex-1">
                        <p className="font-extrabold text-text-primary group-hover:text-emerald-700 transition-colors truncate">{title}</p>
                        <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">{subtitle}</p>
                      </div>
                    </div>
                    {postcode && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex-shrink-0">
                        {postcode}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* OpenStreetMap Container */}
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-divider shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            <div className="absolute top-3 right-3 z-10 bg-surface/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-divider text-[10px] font-bold text-text-secondary shadow-sm">
              💡 Drag marker or click map
            </div>
          </div>

          {/* Address Details Card */}
          <div className="p-4 rounded-2xl bg-background border border-divider space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-emerald-600 tracking-wider">
                    {isFetchingAddress ? 'Fetching location details...' : addressDetails.area || 'Selected Area'}
                  </span>
                  {addressDetails.pincode && (
                    <span className="text-[10px] font-bold text-text-tertiary px-2 py-0.5 rounded-md bg-surface border border-divider">
                      PIN: {addressDetails.pincode}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-text-primary mt-1 line-clamp-2">
                  {addressDetails.address}
                </p>
              </div>
            </div>

            {/* Flat/House No & Landmark optional inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-divider/60">
              <div>
                <label className="text-[10px] font-extrabold text-text-tertiary uppercase">House / Flat / Door No</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 402, Sunshine Apts"
                  value={addressDetails.flatNo || ''}
                  onChange={(e) => setAddressDetails({ ...addressDetails, flatNo: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-medium text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-text-tertiary uppercase">Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station"
                  value={addressDetails.landmark || ''}
                  onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs font-medium text-text-primary focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Confirm */}
        <div className="px-6 py-4 border-t border-divider bg-surface flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveLocation}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md"
          >
            <Check size={16} />
            <span>Confirm & Deliver Here</span>
          </button>
        </div>

      </div>
    </div>
  );
};
