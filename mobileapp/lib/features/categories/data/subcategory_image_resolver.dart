/// Best-effort image for a subcategory tile: prefers an admin-set image
/// (any usable URL — http(s), data URI, or app-relative path), falling back
/// to a keyword-matched stock photo by subcategory name. Shared by every
/// screen that renders subcategory tiles so they all show the same picture
/// for the same subcategory.
String resolveSubCategoryImage(String subName, String? catName, [String? customImg]) {
  if (customImg != null && customImg.trim().isNotEmpty) {
    final trimmed = customImg.trim();
    if (trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('/')) {
      return trimmed;
    }
  }

  final subLower = subName.toLowerCase().trim();

  if (subLower.contains('veg')) return 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop';
  if (subLower.contains('fruit')) return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&auto=format&fit=crop';
  if (subLower.contains('exotic') || subLower.contains('premium')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop';
  if (subLower.contains('organic') || subLower.contains('hydro')) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop';
  if (subLower.contains('leafy') || subLower.contains('herb') || subLower.contains('season')) return 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&auto=format&fit=crop';
  if (subLower.contains('mango') || subLower.contains('melon')) return 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop';
  if (subLower.contains('cut') || subLower.contains('sprout')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&auto=format&fit=crop';

  if (subLower.contains('milk')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop';
  if (subLower.contains('bread') || subLower.contains('bun')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop';
  if (subLower.contains('egg')) return 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=200&auto=format&fit=crop';
  if (subLower.contains('curd') || subLower.contains('yogurt') || subLower.contains('drink')) return 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=200&auto=format&fit=crop';
  if (subLower.contains('paneer') || subLower.contains('cream') || subLower.contains('cheese')) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop';
  if (subLower.contains('butter')) return 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop';

  if (subLower.contains('chip') || subLower.contains('namkeen') || subLower.contains('snack')) return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop';
  if (subLower.contains('noodle') || subLower.contains('pasta')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200&auto=format&fit=crop';
  if (subLower.contains('biscuit') || subLower.contains('cookie')) return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&auto=format&fit=crop';
  if (subLower.contains('chocolate') || subLower.contains('sweet')) return 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop';

  if (subLower.contains('atta') || subLower.contains('flour')) return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop';
  if (subLower.contains('rice')) return 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=200&auto=format&fit=crop';
  if (subLower.contains('oil')) return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop';
  if (subLower.contains('dal') || subLower.contains('pulse')) return 'https://images.unsplash.com/photo-1585994191611-726a88060c2d?w=200&auto=format&fit=crop';
  if (subLower.contains('ghee')) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&auto=format&fit=crop';

  if (subLower.contains('chicken')) return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=200&auto=format&fit=crop';
  if (subLower.contains('mutton') || subLower.contains('meat')) return 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&auto=format&fit=crop';
  if (subLower.contains('fish') || subLower.contains('seafood')) return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=200&auto=format&fit=crop';

  if (subLower.contains('spice') || subLower.contains('masala')) return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop';
  if (subLower.contains('dry fruit') || subLower.contains('nut') || subLower.contains('cashew') || subLower.contains('almond')) return 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=200&auto=format&fit=crop';

  if (subLower.contains('cereal') || subLower.contains('oats')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&auto=format&fit=crop';
  if (subLower.contains('sauce') || subLower.contains('ketchup') || subLower.contains('spread')) return 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=200&auto=format&fit=crop';

  return 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=200&auto=format&fit=crop';
}
