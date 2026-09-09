class CityLocation {
  final String name;
  final String state;
  final double lat;
  final double lng;
  final String? pincode;

  const CityLocation({
    required this.name,
    required this.state,
    required this.lat,
    required this.lng,
    this.pincode,
  });
}

const List<CityLocation> indianCities = [
  // E Cities & Towns
  CityLocation(name: 'Eluru', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952, pincode: '534001'),
  CityLocation(name: 'Eluru Town', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952, pincode: '534002'),
  CityLocation(name: 'Eluru Rural', state: 'Andhra Pradesh', lat: 16.7150, lng: 81.1000, pincode: '534005'),
  CityLocation(name: 'Elamanchili', state: 'Andhra Pradesh', lat: 17.5483, lng: 82.9142, pincode: '531055'),
  CityLocation(name: 'Emmiganur', state: 'Andhra Pradesh', lat: 15.7765, lng: 77.4815, pincode: '518360'),
  CityLocation(name: 'Ernakulam', state: 'Kerala', lat: 9.9816, lng: 76.2999, pincode: '682011'),
  CityLocation(name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172, pincode: '638001'),
  CityLocation(name: 'Etawah', state: 'Uttar Pradesh', lat: 26.7769, lng: 79.0304, pincode: '206001'),
  CityLocation(name: 'Etah', state: 'Uttar Pradesh', lat: 27.5615, lng: 78.6653, pincode: '207001'),
  CityLocation(name: 'Ellora', state: 'Maharashtra', lat: 20.0268, lng: 75.1771, pincode: '431102'),
  CityLocation(name: 'Yelagiri / Elagiri', state: 'Tamil Nadu', lat: 12.5786, lng: 78.6389, pincode: '635853'),

  // G Cities & Towns
  CityLocation(name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, pincode: '522002'),
  CityLocation(name: 'Gudivada', state: 'Andhra Pradesh', lat: 16.4410, lng: 80.9926, pincode: '521301'),
  CityLocation(name: 'Guntakal', state: 'Andhra Pradesh', lat: 15.1670, lng: 77.3680, pincode: '515801'),
  CityLocation(name: 'Gurgaon / Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, pincode: '122001'),
  CityLocation(name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, pincode: '781001'),
  CityLocation(name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065, pincode: '737101'),
  CityLocation(name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, pincode: '804404'),
  CityLocation(name: 'Godavari (Rajahmundry)', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040, pincode: '533101'),

  // V Cities & Towns
  CityLocation(name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, pincode: '520001'),
  CityLocation(name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, pincode: '530001'),
  CityLocation(name: 'Vizianagaram', state: 'Andhra Pradesh', lat: 18.1066, lng: 83.3955, pincode: '535001'),
  CityLocation(name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, pincode: '632001'),
  CityLocation(name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, pincode: '390001'),
  CityLocation(name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, pincode: '221001'),
  CityLocation(name: 'Vasai', state: 'Maharashtra', lat: 19.3919, lng: 72.8397, pincode: '401201'),

  // H Cities & Towns
  CityLocation(name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, pincode: '500001'),
  CityLocation(name: 'HITEC City (Hyderabad)', state: 'Telangana', lat: 17.4474, lng: 78.3762, pincode: '500081'),
  CityLocation(name: 'KPHB Colony (Hyderabad)', state: 'Telangana', lat: 17.4842, lng: 78.3888, pincode: '500072'),
  CityLocation(name: 'HSR Layout (Bengaluru)', state: 'Karnataka', lat: 12.9121, lng: 77.6446, pincode: '560102'),
  CityLocation(name: 'Hubli / Hubballi', state: 'Karnataka', lat: 15.3647, lng: 75.1240, pincode: '580020'),
  CityLocation(name: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636, pincode: '711101'),
  CityLocation(name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642, pincode: '249401'),

  // B Cities & Towns
  CityLocation(name: 'Bengaluru (Bangalore)', state: 'Karnataka', lat: 12.9716, lng: 77.5946, pincode: '560001'),
  CityLocation(name: 'Bhimavaram', state: 'Andhra Pradesh', lat: 16.5449, lng: 81.5212, pincode: '534201'),
  CityLocation(name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, pincode: '751001'),
  CityLocation(name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, pincode: '462001'),
  CityLocation(name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304, pincode: '243001'),
  CityLocation(name: 'Belgaum / Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, pincode: '590001'),
  CityLocation(name: 'Bellary / Ballari', state: 'Karnataka', lat: 15.1394, lng: 76.9214, pincode: '583101'),

  // K Cities & Towns
  CityLocation(name: 'Kakinada', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475, pincode: '533001'),
  CityLocation(name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373, pincode: '518001'),
  CityLocation(name: 'Kochi (Cochin)', state: 'Kerala', lat: 9.9312, lng: 76.2673, pincode: '682001'),
  CityLocation(name: 'Kozhikode (Calicut)', state: 'Kerala', lat: 11.2588, lng: 75.7804, pincode: '673001'),
  CityLocation(name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, pincode: '416001'),
  CityLocation(name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, pincode: '700001'),
  CityLocation(name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, pincode: '208001'),

  // T Cities & Towns
  CityLocation(name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, pincode: '517501'),
  CityLocation(name: 'Tenali', state: 'Andhra Pradesh', lat: 16.2430, lng: 80.6400, pincode: '522201'),
  CityLocation(name: 'Thiruvananthapuram (Trivandrum)', state: 'Kerala', lat: 8.5241, lng: 76.9366, pincode: '695001'),
  CityLocation(name: 'Thrissur', state: 'Kerala', lat: 10.5276, lng: 76.2144, pincode: '680001'),
  CityLocation(name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, pincode: '400601'),
  CityLocation(name: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, pincode: '620001'),

  // N Cities & Towns
  CityLocation(name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865, pincode: '524001'),
  CityLocation(name: 'Nandyal', state: 'Andhra Pradesh', lat: 15.4786, lng: 78.4836, pincode: '518501'),
  CityLocation(name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, pincode: '440001'),
  CityLocation(name: 'Nashik', state: 'Maharashtra', lat: 20.0059, lng: 73.7898, pincode: '422001'),
  CityLocation(name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, pincode: '201301'),

  // R Cities & Towns
  CityLocation(name: 'Rajahmundry', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040, pincode: '533101'),
  CityLocation(name: 'Ramagundam', state: 'Telangana', lat: 18.8000, lng: 79.4500, pincode: '505208'),
  CityLocation(name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, pincode: '834001'),
  CityLocation(name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, pincode: '492001'),
  CityLocation(name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, pincode: '360001'),

  // P Cities & Towns
  CityLocation(name: 'Poranki (Vijayawada)', state: 'Andhra Pradesh', lat: 16.4855, lng: 80.7056, pincode: '521137'),
  CityLocation(name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, pincode: '411001'),
  CityLocation(name: 'Puducherry (Pondicherry)', state: 'Puducherry', lat: 11.9416, lng: 79.8083, pincode: '605001'),
  CityLocation(name: 'Panaji', state: 'Goa', lat: 15.4909, lng: 73.8278, pincode: '403001'),
  CityLocation(name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, pincode: '800001'),

  // C Cities & Towns
  CityLocation(name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, pincode: '600001'),
  CityLocation(name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, pincode: '641001'),
  CityLocation(name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.8828, pincode: '753001'),
  CityLocation(name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, pincode: '160017'),

  // M Cities & Towns
  CityLocation(name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, pincode: '625001'),
  CityLocation(name: 'Mangaluru (Mangalore)', state: 'Karnataka', lat: 12.9141, lng: 74.8560, pincode: '575001'),
  CityLocation(name: 'Mysuru (Mysore)', state: 'Karnataka', lat: 12.2958, lng: 76.6394, pincode: '570001'),
  CityLocation(name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, pincode: '400001'),
  CityLocation(name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, pincode: '250001'),

  // S Cities & Towns
  CityLocation(name: 'Secunderabad', state: 'Telangana', lat: 17.4399, lng: 78.4983, pincode: '500003'),
  CityLocation(name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, pincode: '636001'),
  CityLocation(name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, pincode: '395001'),
  CityLocation(name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, pincode: '171001'),
  CityLocation(name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953, pincode: '734001'),

  // A Cities & Towns
  CityLocation(name: 'Amaravati', state: 'Andhra Pradesh', lat: 16.5131, lng: 80.5165, pincode: '522503'),
  CityLocation(name: 'Anantapur', state: 'Andhra Pradesh', lat: 14.6819, lng: 77.6006, pincode: '515001'),
  CityLocation(name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, pincode: '380001'),
  CityLocation(name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, pincode: '282001'),
  CityLocation(name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, pincode: '143001'),
];

List<CityLocation> searchCitiesByPrefix(String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];

  return indianCities.where((city) {
    final cityNameLower = city.name.toLowerCase();
    final words = cityNameLower.split(RegExp(r'[\s,()/\-]+'));
    return cityNameLower.startsWith(q) || words.any((w) => w.startsWith(q));
  }).toList();
}
