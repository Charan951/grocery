export interface CityLocation {
  name: string;
  state: string;
  lat: number;
  lng: number;
  pincode?: string;
}

export const INDIAN_CITIES: CityLocation[] = [
  // E Cities & Towns
  { name: 'Eluru', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952, pincode: '534001' },
  { name: 'Eluru Town', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952, pincode: '534002' },
  { name: 'Eluru Rural', state: 'Andhra Pradesh', lat: 16.7150, lng: 81.1000, pincode: '534005' },
  { name: 'Elamanchili', state: 'Andhra Pradesh', lat: 17.5483, lng: 82.9142, pincode: '531055' },
  { name: 'Emmiganur', state: 'Andhra Pradesh', lat: 15.7765, lng: 77.4815, pincode: '518360' },
  { name: 'Ernakulam', state: 'Kerala', lat: 9.9816, lng: 76.2999, pincode: '682011' },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172, pincode: '638001' },
  { name: 'Etawah', state: 'Uttar Pradesh', lat: 26.7769, lng: 79.0304, pincode: '206001' },
  { name: 'Etah', state: 'Uttar Pradesh', lat: 27.5615, lng: 78.6653, pincode: '207001' },
  { name: 'Ellora', state: 'Maharashtra', lat: 20.0268, lng: 75.1771, pincode: '431102' },
  { name: 'Yelagiri / Elagiri', state: 'Tamil Nadu', lat: 12.5786, lng: 78.6389, pincode: '635853' },

  // G Cities & Towns
  { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, pincode: '522002' },
  { name: 'Gudivada', state: 'Andhra Pradesh', lat: 16.4410, lng: 80.9926, pincode: '521301' },
  { name: 'Guntakal', state: 'Andhra Pradesh', lat: 15.1670, lng: 77.3680, pincode: '515801' },
  { name: 'Gurgaon / Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, pincode: '122001' },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, pincode: '781001' },
  { name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065, pincode: '737101' },
  { name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, pincode: '804404' },
  { name: 'Godavari (Rajahmundry)', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040, pincode: '533101' },

  // V Cities & Towns
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, pincode: '520001' },
  { name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, pincode: '530001' },
  { name: 'Vizianagaram', state: 'Andhra Pradesh', lat: 18.1066, lng: 83.3955, pincode: '535001' },
  { name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, pincode: '632001' },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, pincode: '390001' },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, pincode: '221001' },
  { name: 'Vasai', state: 'Maharashtra', lat: 19.3919, lng: 72.8397, pincode: '401201' },

  // H Cities & Towns
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, pincode: '500001' },
  { name: 'HITEC City (Hyderabad)', state: 'Telangana', lat: 17.4474, lng: 78.3762, pincode: '500081' },
  { name: 'KPHB Colony (Hyderabad)', state: 'Telangana', lat: 17.4842, lng: 78.3888, pincode: '500072' },
  { name: 'HSR Layout (Bengaluru)', state: 'Karnataka', lat: 12.9121, lng: 77.6446, pincode: '560102' },
  { name: 'Hubli / Hubballi', state: 'Karnataka', lat: 15.3647, lng: 75.1240, pincode: '580020' },
  { name: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636, pincode: '711101' },
  { name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642, pincode: '249401' },

  // B Cities & Towns
  { name: 'Bengaluru (Bangalore)', state: 'Karnataka', lat: 12.9716, lng: 77.5946, pincode: '560001' },
  { name: 'Bhimavaram', state: 'Andhra Pradesh', lat: 16.5449, lng: 81.5212, pincode: '534201' },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, pincode: '751001' },
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, pincode: '462001' },
  { name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304, pincode: '243001' },
  { name: 'Belgaum / Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, pincode: '590001' },
  { name: 'Bellary / Ballari', state: 'Karnataka', lat: 15.1394, lng: 76.9214, pincode: '583101' },

  // K Cities & Towns
  { name: 'Kakinada', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475, pincode: '533001' },
  { name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373, pincode: '518001' },
  { name: 'Kochi (Cochin)', state: 'Kerala', lat: 9.9312, lng: 76.2673, pincode: '682001' },
  { name: 'Kozhikode (Calicut)', state: 'Kerala', lat: 11.2588, lng: 75.7804, pincode: '673001' },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, pincode: '416001' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, pincode: '700001' },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, pincode: '208001' },

  // T Cities & Towns
  { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, pincode: '517501' },
  { name: 'Tenali', state: 'Andhra Pradesh', lat: 16.2430, lng: 80.6400, pincode: '522201' },
  { name: 'Thiruvananthapuram (Trivandrum)', state: 'Kerala', lat: 8.5241, lng: 76.9366, pincode: '695001' },
  { name: 'Thrissur', state: 'Kerala', lat: 10.5276, lng: 76.2144, pincode: '680001' },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, pincode: '400601' },
  { name: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, pincode: '620001' },

  // N Cities & Towns
  { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865, pincode: '524001' },
  { name: 'Nandyal', state: 'Andhra Pradesh', lat: 15.4786, lng: 78.4836, pincode: '518501' },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, pincode: '440001' },
  { name: 'Nashik', state: 'Maharashtra', lat: 20.0059, lng: 73.7898, pincode: '422001' },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, pincode: '201301' },

  // R Cities & Towns
  { name: 'Rajahmundry', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040, pincode: '533101' },
  { name: 'Ramagundam', state: 'Telangana', lat: 18.8000, lng: 79.4500, pincode: '505208' },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, pincode: '834001' },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, pincode: '492001' },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, pincode: '360001' },

  // P Cities & Towns
  { name: 'Poranki (Vijayawada)', state: 'Andhra Pradesh', lat: 16.4855, lng: 80.7056, pincode: '521137' },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, pincode: '411001' },
  { name: 'Puducherry (Pondicherry)', state: 'Puducherry', lat: 11.9416, lng: 79.8083, pincode: '605001' },
  { name: 'Panaji', state: 'Goa', lat: 15.4909, lng: 73.8278, pincode: '403001' },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, pincode: '800001' },

  // C Cities & Towns
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, pincode: '600001' },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, pincode: '641001' },
  { name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.8828, pincode: '753001' },
  { name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, pincode: '160017' },

  // M Cities & Towns
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, pincode: '625001' },
  { name: 'Mangaluru (Mangalore)', state: 'Karnataka', lat: 12.9141, lng: 74.8560, pincode: '575001' },
  { name: 'Mysuru (Mysore)', state: 'Karnataka', lat: 12.2958, lng: 76.6394, pincode: '570001' },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, pincode: '400001' },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, pincode: '250001' },

  // S Cities & Towns
  { name: 'Secunderabad', state: 'Telangana', lat: 17.4399, lng: 78.4983, pincode: '500003' },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, pincode: '636001' },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, pincode: '395001' },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, pincode: '171001' },
  { name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953, pincode: '734001' },

  // A Cities & Towns
  { name: 'Amaravati', state: 'Andhra Pradesh', lat: 16.5131, lng: 80.5165, pincode: '522503' },
  { name: 'Anantapur', state: 'Andhra Pradesh', lat: 14.6819, lng: 77.6006, pincode: '515001' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, pincode: '380001' },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, pincode: '282001' },
  { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, pincode: '143001' },
];

/**
 * Filter cities where name starts with query or word inside name starts with query
 */
export const searchCitiesByPrefix = (query: string): CityLocation[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return INDIAN_CITIES.filter((city) => {
    const cityNameLower = city.name.toLowerCase();
    const words = cityNameLower.split(/[\s,()/\-]+/);
    return cityNameLower.startsWith(q) || words.some((w) => w.startsWith(q));
  });
};
