import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Search,
  Navigation,
  Check,
  Home,
  Briefcase,
  Tag,
  Trash2,
  Plus,
  CheckCircle2,
  Edit3,
  X,
  User,
  Phone,
  Info
} from 'lucide-react';
import { useCMS } from '../context/CMSContext';

interface SavedAddress {
  id: string;
  name?: string;
  receiverPhone?: string;
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

const labelIcon = (label: 'Home' | 'Work' | 'Other') => {
  if (label === 'Home') return Home;
  if (label === 'Work') return Briefcase;
  return Tag;
};

export const CustomerAddresses: React.FC = () => {
  const navigate = useNavigate();
  const { userLocation, updateUserLocation } = useCMS();

  const customerUser = (() => {
    const cached = localStorage.getItem('customer_user');
    return cached ? JSON.parse(cached) : null;
  })();
  const userPhoneKey = customerUser?.phone ? customerUser.phone.replace(/\D/g, '') : 'default';

  const initialAddressText = typeof userLocation === 'string'
    ? userLocation
    : userLocation?.fullAddress || userLocation?.address || '';

  // View mode: 'list' (default view showing saved addresses) or 'form' (map & address edit)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState<[number, number]>([17.4842, 78.3888]);

  // Form Fields: Name, Phone, House/Flat No, Landmark, Label, Area, Pincode
  const [receiverName, setReceiverName] = useState(customerUser?.name || '');
  const [receiverPhone, setReceiverPhone] = useState(customerUser?.phone || '');
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [fullAddressText, setFullAddressText] = useState(initialAddressText);
  const [detectedArea, setDetectedArea] = useState(userLocation?.area ? userLocation.area.toUpperCase() : 'SELECT LOCATION ON MAP');
  const [detectedPincode, setDetectedPincode] = useState(userLocation?.pincode || '');

  const [notificationMsg, setNotificationMsg] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSavingDB, setIsSavingDB] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    const cached = localStorage.getItem(`saved_addresses_${userPhoneKey}`);
    if (cached) return JSON.parse(cached);
    if (customerUser?.addresses && customerUser.addresses.length > 0) return customerUser.addresses;
    return [];
  });

  // Reverse geocoding helper via OpenStreetMap Nominatim API
  const fetchAddressForCoords = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.display_name) {
        setFullAddressText(data.display_name);

        const addr = data.address || {};
        const areaName = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || data.display_name.split(',')[0] || 'SELECTED LOCATION';
        const postCode = addr.postcode || (data.display_name.match(/\b\d{6}\b/)?.[0]) || '500072';

        setDetectedArea(areaName.trim().toUpperCase());
        setDetectedPincode(postCode);
      } else {
        setFullAddressText(`New Balaji Nagar, KPHB Colony, Hyderabad, Telangana 500072, India`);
      }
    } catch (err) {
      setFullAddressText(`New Balaji Nagar, KPHB Colony, Hyderabad, Telangana 500072, India`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Interactive Map Click Handler
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const latOffset = ((rect.height / 2 - y) / rect.height) * 0.015;
    const lngOffset = ((x - rect.width / 2) / rect.width) * 0.015;

    const newLat = Number((position[0] + latOffset).toFixed(6));
    const newLng = Number((position[1] + lngOffset).toFixed(6));

    setPosition([newLat, newLng]);
    fetchAddressForCoords(newLat, newLng);
  };

  // Search location handler
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const top = results[0];
        const newLat = parseFloat(top.lat);
        const newLng = parseFloat(top.lon);
        setPosition([newLat, newLng]);
        setFullAddressText(top.display_name);

        const areaMatch = top.display_name.split(',')[0] || 'SELECTED LOCATION';
        const pincodeMatch = top.display_name.match(/\b\d{6}\b/)?.[0] || '500072';
        setDetectedArea(areaMatch.trim().toUpperCase());
        setDetectedPincode(pincodeMatch);
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleOpenAddNew = () => {
    setEditingAddressId(null);
    setReceiverName(customerUser?.name || '');
    setReceiverPhone(customerUser?.phone || '');
    setHouseNo('');
    setLandmark('');
    setLabel('Home');
    setFullAddressText(initialAddressText);
    setDetectedArea('KPHB COLONY');
    setDetectedPincode('500072');
    setPosition([17.4842, 78.3888]);
    setViewMode('form');
  };

  const handleOpenEdit = (addr: SavedAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAddressId(addr.id);
    setReceiverName(addr.name || customerUser?.name || '');
    setReceiverPhone(addr.receiverPhone || customerUser?.phone || '');
    setHouseNo(addr.houseNo || '');
    setLandmark(addr.landmark || '');
    setLabel(addr.label);
    setFullAddressText(addr.fullAddress);
    setDetectedArea(addr.area?.toUpperCase() || 'KPHB COLONY');
    setDetectedPincode(addr.pincode || '500072');
    setPosition([addr.lat || 17.4842, addr.lng || 78.3888]);
    setViewMode('form');
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          fetchAddressForCoords(lat, lng);
          setNotificationMsg('GPS location updated!');
          setTimeout(() => setNotificationMsg(''), 3000);
        },
        () => {
          alert('Could not detect exact location. Defaulting to KPHB Colony.');
        }
      );
    }
  };

  const handleSaveAndConfirm = async () => {
    if (!receiverName.trim() || !houseNo.trim()) {
      alert('Please enter your Name and House/Flat Number.');
      return;
    }

    setIsSavingDB(true);
    const finalAddressString = `${houseNo ? houseNo + ', ' : ''}${landmark ? landmark + ', ' : ''}${fullAddressText}`;

    const newAddrObj: SavedAddress = {
      id: editingAddressId || 'addr_' + Date.now(),
      name: receiverName,
      receiverPhone: receiverPhone,
      label,
      houseNo,
      landmark,
      area: detectedArea,
      fullAddress: finalAddressString,
      pincode: detectedPincode,
      lat: position[0],
      lng: position[1],
    };

    let updated: SavedAddress[];
    if (editingAddressId) {
      updated = savedAddresses.map((a) => (a.id === editingAddressId ? newAddrObj : a));
    } else {
      updated = [newAddrObj, ...savedAddresses];
    }

    setSavedAddresses(updated);
    localStorage.setItem(`saved_addresses_${userPhoneKey}`, JSON.stringify(updated));

    // Save Customer Profile & Address to Backend MongoDB Database
    try {
      const targetPhone = receiverPhone || customerUser?.phone || userPhoneKey;
      await fetch(`/api/customers/${encodeURIComponent(targetPhone)}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddrObj),
      });

      // Update customer profile in local storage
      const updatedCustomer = {
        ...(customerUser || {}),
        name: receiverName || customerUser?.name,
        phone: receiverPhone || customerUser?.phone,
        addresses: updated,
      };
      localStorage.setItem('customer_user', JSON.stringify(updatedCustomer));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.warn('Database save warning:', err);
    } finally {
      setIsSavingDB(false);
    }

    const locationObj = {
      label,
      houseNo,
      landmark,
      area: detectedArea,
      address: finalAddressString,
      fullAddress: finalAddressString,
      pincode: detectedPincode,
    };

    updateUserLocation(locationObj);
    localStorage.setItem('freshcart_delivery_location', JSON.stringify(locationObj));

    setNotificationMsg('Address saved successfully to database!');
    setViewMode('list');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    const locationObj = {
      label: addr.label,
      houseNo: addr.houseNo || '',
      landmark: addr.landmark || '',
      area: addr.area || detectedArea,
      address: addr.fullAddress,
      fullAddress: addr.fullAddress,
      pincode: addr.pincode || detectedPincode,
    };

    updateUserLocation(locationObj);
    localStorage.setItem('freshcart_delivery_location', JSON.stringify(locationObj));

    setNotificationMsg(`Selected ${addr.label} address for delivery!`);
    setTimeout(() => {
      navigate('/');
    }, 600);
  };

  const handleDeleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved address?')) {
      const updated = savedAddresses.filter((a) => a.id !== id);
      setSavedAddresses(updated);
      localStorage.setItem(`saved_addresses_${userPhoneKey}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans pb-16">
      <SEO
        title="Saved Addresses | FreshCart"
        description="Manage your saved delivery addresses or pin a new location on OpenStreetMap."
      />

      {/* Top Standalone Header Bar */}
      <header className="bg-surface/95 backdrop-blur-sm border-b border-divider py-4 px-6 md:px-12 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-background hover:bg-divider/60 flex items-center justify-center text-text-secondary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight font-display">
                {viewMode === 'form' ? (editingAddressId ? 'Edit Address' : 'Add New Location') : 'Saved Addresses'}
              </h1>
              <p className="text-xs text-text-secondary font-semibold">
                {viewMode === 'form' ? 'Enter receiver details & pin exact location on OpenStreetMap' : 'Select delivery location or manage saved addresses'}
              </p>
            </div>
          </div>

          {viewMode === 'form' && (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="bg-background hover:bg-divider/60 text-text-secondary font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[900px] mx-auto px-4 md:px-8 py-6 flex flex-col gap-5">

        {notificationMsg && (
          <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* VIEW MODE 1: SAVED ADDRESSES LIST (Default View) */}
        {viewMode === 'list' && (
          <div className="flex flex-col gap-4">

            {/* Top Add New Address Card Banner */}
            <div
              onClick={handleOpenAddNew}
              className="bg-surface border-2 border-dashed border-primary/30 hover:border-primary p-5 rounded-3xl flex items-center justify-between cursor-pointer transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Plus size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-text-primary group-hover:text-primary transition-colors">
                    Add New Delivery Address
                  </h3>
                  <p className="text-xs font-medium text-text-secondary mt-0.5">
                    Pin your location on OpenStreetMap & save house/flat details
                  </p>
                </div>
              </div>

              <span className="bg-primary text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-2xs">
                Open Map
              </span>
            </div>

            {/* Saved Addresses List */}
            <div className="bg-surface border border-divider rounded-3xl p-5 md:p-6 shadow-2xs flex flex-col gap-4">
              <h2 className="text-xs font-black text-text-secondary uppercase tracking-wider">
                Your Saved Addresses ({savedAddresses.length})
              </h2>

              {savedAddresses.length === 0 ? (
                <div className="text-center py-8 text-text-secondary font-medium text-xs">
                  No saved addresses found. Click "Open Map" to pin your address on map.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {savedAddresses.map((addr, index) => {
                    const LabelIcon = labelIcon(addr.label);
                    return (
                      <div
                        key={addr.id || `addr_${index}`}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className="bg-background hover:bg-primary/5 border border-divider hover:border-primary p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0 shadow-2xs mt-0.5 border border-divider">
                            <LabelIcon size={18} />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-text-primary group-hover:text-primary">
                                {addr.label}
                              </span>
                              {addr.name && (
                                <span className="text-xs font-bold text-text-secondary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                  {addr.name}
                                </span>
                              )}
                              {addr.houseNo && (
                                <span className="text-[11px] font-bold text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-divider">
                                  {addr.houseNo}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-text-secondary leading-snug mt-1">
                              {addr.fullAddress}
                            </span>
                            {addr.receiverPhone && (
                              <span className="text-[11px] font-semibold text-text-tertiary mt-1 flex items-center gap-1">
                                <Phone size={11} />
                                {addr.receiverPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(addr, e)}
                            className="bg-surface hover:bg-divider/40 border border-divider text-text-secondary font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit3 size={14} className="text-text-tertiary" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteAddress(addr.id, e)}
                            className="bg-surface hover:bg-error/10 border border-divider text-text-tertiary hover:text-error p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectSavedAddress(addr)}
                            className="bg-primary hover:bg-secondary text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-2xs cursor-pointer transition-colors"
                          >
                            Deliver Here
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW MODE 2: INTERACTIVE MAP + ADDRESS FORM */}
        {viewMode === 'form' && (
          <div className="flex flex-col gap-5">

            {/* Search Bar + Locate Me Button */}
            <form onSubmit={handleSearchLocation} className="flex items-center gap-2 bg-surface p-3 rounded-2xl border border-divider shadow-2xs">
              <div className="flex-1 bg-background border border-divider focus-within:border-primary rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all">
                <Search size={18} className="text-text-tertiary shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type area, landmark or street (e.g. HITEC City, Indiranagar)..."
                  className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <button
                type="button"
                onClick={handleLocateMe}
                className="bg-primary hover:bg-secondary text-white font-extrabold text-xs px-4 py-3 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                <Navigation size={15} />
                <span>Locate Me</span>
              </button>
            </form>

            {/* Popular Locations */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              <span className="text-[11px] font-black text-text-tertiary uppercase tracking-wider shrink-0">Popular:</span>
              {defaultPopularLocations.map((loc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPosition([loc.lat, loc.lng]);
                    fetchAddressForCoords(loc.lat, loc.lng);
                  }}
                  className="bg-surface hover:bg-primary/5 border border-divider hover:border-primary/40 text-text-secondary font-bold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <MapPin size={12} className="text-primary" /> {loc.name}
                </button>
              ))}
            </div>

            {/* Interactive OpenStreetMap Container with Click/Tap Pinning */}
            <div
              onClick={handleMapClick}
              className="w-full h-56 md:h-64 rounded-2xl overflow-hidden border border-divider relative shadow-2xs shrink-0 bg-background cursor-crosshair group"
            >
              <iframe
                title="OpenStreetMap Location Picker"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${position[1] - 0.01}%2C${position[0] - 0.01}%2C${position[1] + 0.01}%2C${position[0] + 0.01}&layer=mapnik&marker=${position[0]}%2C${position[1]}`}
                className="pointer-events-none"
              />

              {/* Center Pin Marker Graphic Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-error text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <MapPin size={20} />
                </div>
                <div className="w-3 h-1.5 bg-black/40 rounded-full blur-[1px] mt-0.5" />
              </div>

              <div className="absolute top-3 right-3 z-10 bg-surface/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold text-text-secondary border border-divider shadow-2xs flex items-center gap-1.5">
                {isGeocoding ? (
                  <span className="text-primary font-bold animate-pulse">Updating address...</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Info size={13} className="text-text-tertiary" /> Click anywhere on map to pin location</span>
                )}
              </div>
            </div>

            {/* Address Details Form */}
            <div className="bg-surface border border-divider rounded-3xl p-5 md:p-6 shadow-2xs flex flex-col gap-4">
              {/* Dynamic Area Header & Dynamic Pincode Badge */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-primary uppercase tracking-wider">
                      {detectedArea}
                    </h3>
                    <span className="text-[11px] font-bold text-text-secondary bg-background px-2.5 py-0.5 rounded-md border border-divider">
                      PIN: {detectedPincode}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-text-primary leading-snug mt-1">
                    {fullAddressText}
                  </p>
                </div>
              </div>

              {/* Receiver Name & Contact Phone Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-divider">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider flex items-center gap-1">
                    <User size={13} className="text-text-tertiary" />
                    <span>Your Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Charan"
                    className="bg-background border border-divider focus:border-primary rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider flex items-center gap-1">
                    <Phone size={13} className="text-text-tertiary" />
                    <span>Mobile Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="e.g. +91 9626626626"
                    className="bg-background border border-divider focus:border-primary rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* House / Flat & Landmark Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">
                    House / Flat / Door No *
                  </label>
                  <input
                    type="text"
                    required
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="e.g. Flat 402, Sunshine Apts"
                    className="bg-background border border-divider focus:border-primary rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Metro Station"
                    className="bg-background border border-divider focus:border-primary rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Label Type Selector */}
              <div className="flex items-center gap-2 pt-2 border-t border-divider flex-wrap">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-wider mr-1">Save As:</span>
                {(['Home', 'Work', 'Other'] as const).map((l) => {
                  const LIcon = labelIcon(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        label === l
                          ? 'bg-primary text-white shadow-2xs'
                          : 'bg-background text-text-secondary hover:bg-divider/40 border border-divider'
                      }`}
                    >
                      <LIcon size={13} />
                      {l}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs font-extrabold text-text-secondary hover:text-text-primary px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingDB}
                  onClick={handleSaveAndConfirm}
                  className="bg-primary hover:bg-secondary disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm px-8 py-3.5 rounded-full flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <Check size={18} />
                  <span>{isSavingDB ? 'Saving to Database...' : 'Save & Deliver Here'}</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
