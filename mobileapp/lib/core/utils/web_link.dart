/// Maps a CMS/web link (`linkUrl` on banners, `link` on special-group items)
/// onto a route this app actually has. Returns null when there is no mobile
/// equivalent, so callers can render the tile as non-tappable instead of
/// bouncing the user to a dead route.
String? resolveAppRoute(String? webLink) {
  final raw = (webLink ?? '').trim();
  if (raw.isEmpty || !raw.startsWith('/')) return null;

  final uri = Uri.tryParse(raw);
  if (uri == null) return null;
  final path = uri.path;
  final q = uri.queryParameters;

  // Direct matches the app already serves.
  if (path.startsWith('/product/') || path.startsWith('/category/')) return raw;
  if (path == '/cart' || path == '/orders' || path == '/wishlist') return path;

  // Web catalog listing → mobile category screen.
  if (path == '/products') {
    final cat = q['category'];
    if (cat == null || cat.isEmpty) return null; // no all-products screen
    final sub = q['subCategory'];
    return sub != null && sub.isNotEmpty && sub.toLowerCase() != 'all'
        ? '/category/$cat?sub=${Uri.encodeComponent(sub)}'
        : '/category/$cat';
  }

  // Everything else (/offers, /brands, /blog, /about, marketing slugs) has no
  // mobile page yet.
  return null;
}
