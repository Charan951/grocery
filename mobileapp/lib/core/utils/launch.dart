import 'package:url_launcher/url_launcher.dart';
import 'package:freshcart/core/widgets/app_toast.dart';

/// Thin wrappers around `url_launcher` with a user-visible failure toast so
/// callers don't each re-implement the same try/catch.
Future<void> dialPhone(String rawNumber) async {
  final n = rawNumber.replaceAll(RegExp(r'[^\d+]'), '');
  if (n.isEmpty) {
    AppToast.error('No phone number available');
    return;
  }
  await _open(Uri(scheme: 'tel', path: n), 'Could not open the dialer');
}

Future<void> openMaps({double? lat, double? lng, String? query}) async {
  Uri uri;
  if (lat != null && lng != null) {
    uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
  } else if (query != null && query.trim().isNotEmpty) {
    uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');
  } else {
    AppToast.error('No location to open');
    return;
  }
  await _open(uri, 'Could not open Maps');
}

Future<void> openUrl(String url) => _open(Uri.parse(url), 'Could not open the link');

Future<void> _open(Uri uri, String failMsg) async {
  try {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok) AppToast.error(failMsg);
  } catch (_) {
    AppToast.error(failMsg);
  }
}
