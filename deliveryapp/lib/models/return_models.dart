// Return / exchange pickups — mirrors backend returnService `offerPayload` and
// `partnerView`, and the web partner app's `ReturnOffer` / `PartnerReturn`.

String _s(dynamic v, [String f = '']) => v == null ? f : v.toString();
num _n(dynamic v) => v is num ? v : num.tryParse(_s(v)) ?? 0;
({double lat, double lng})? _loc(dynamic v) {
  if (v is! Map || v['lat'] == null || v['lng'] == null) return null;
  return (lat: _n(v['lat']).toDouble(), lng: _n(v['lng']).toDouble());
}

class ReturnOffer {
  final String returnId;
  final String orderId;
  final String type; // return | exchange
  final DateTime? expiresAt;
  final num? distanceMeters;
  final int itemCount;
  final List<({String name, int quantity})> items;
  final String reason;
  final String pickupAddress;
  final String storeName;

  const ReturnOffer({
    required this.returnId,
    required this.orderId,
    required this.type,
    required this.expiresAt,
    required this.distanceMeters,
    required this.itemCount,
    required this.items,
    required this.reason,
    required this.pickupAddress,
    required this.storeName,
  });

  bool get isExchange => type == 'exchange';

  int secondsLeft() {
    if (expiresAt == null) return 60;
    final s = expiresAt!.difference(DateTime.now()).inSeconds;
    return s < 0 ? 0 : s;
  }

  factory ReturnOffer.fromJson(Map<String, dynamic> j) => ReturnOffer(
        returnId: _s(j['returnId']),
        orderId: _s(j['orderId']),
        type: _s(j['type'], 'return'),
        expiresAt: DateTime.tryParse(_s(j['expiresAt']))?.toLocal(),
        distanceMeters: j['distanceMeters'] == null ? null : _n(j['distanceMeters']),
        itemCount: _n(j['itemCount']).toInt(),
        items: [
          for (final i in (j['items'] as List? ?? const []))
            if (i is Map) (name: _s(i['name']), quantity: _n(i['quantity']).toInt()),
        ],
        reason: _s(j['reason']),
        pickupAddress: _s(j['pickupAddress']),
        storeName: j['store'] is Map ? _s((j['store'] as Map)['name']) : '',
      );
}

class ReturnItem {
  final String productId;
  final String name;
  final String image;
  final int quantity;
  const ReturnItem(this.productId, this.name, this.image, this.quantity);
}

class PartnerReturn {
  final String returnId;
  final String orderId;
  final String type;
  final String status; // Assigned | Arrived | Picked Up | Completed | Rejected | Pickup Failed | Cancelled
  final String customerName;
  final String customerPhone;
  final List<ReturnItem> items;
  final String reasonLabel;
  final String comment;
  final List<String> photos;
  final List<String> proofPhotos;
  final String pickupAddress;
  final ({double lat, double lng})? pickupLocation;
  final String storeName;
  final ({double lat, double lng})? storeLocation;

  const PartnerReturn({
    required this.returnId,
    required this.orderId,
    required this.type,
    required this.status,
    required this.customerName,
    required this.customerPhone,
    required this.items,
    required this.reasonLabel,
    required this.comment,
    required this.photos,
    required this.proofPhotos,
    required this.pickupAddress,
    required this.pickupLocation,
    required this.storeName,
    required this.storeLocation,
  });

  bool get isExchange => type == 'exchange';
  bool get isDone => const ['Completed', 'Rejected', 'Pickup Failed', 'Cancelled'].contains(status);

  factory PartnerReturn.fromJson(Map<String, dynamic> j) => PartnerReturn(
        returnId: _s(j['returnId']),
        orderId: _s(j['orderId']),
        type: _s(j['type'], 'return'),
        status: _s(j['status']),
        customerName: _s(j['customerName'], 'Customer'),
        customerPhone: _s(j['customerPhone']),
        items: [
          for (final i in (j['items'] as List? ?? const []))
            if (i is Map) ReturnItem(_s(i['productId']), _s(i['name']), _s(i['image']), _n(i['quantity']).toInt()),
        ],
        reasonLabel: _s(j['reasonLabel']),
        comment: _s(j['comment']),
        photos: (j['photos'] as List? ?? const []).map((e) => e.toString()).toList(),
        proofPhotos: (j['proofPhotos'] as List? ?? const []).map((e) => e.toString()).toList(),
        pickupAddress: _s(j['pickupAddress']),
        pickupLocation: _loc(j['pickupLocation']),
        storeName: j['store'] is Map ? _s((j['store'] as Map)['name'], 'the store') : 'the store',
        storeLocation: _loc(j['store']),
      );
}
