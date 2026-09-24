// Returns & exchanges — mirrors backend/src/services/returnService.js
// (customerView / eligibilityFor) and frontend/src/utils/returnsApi.ts.

String _s(dynamic v, [String fallback = '']) => v == null ? fallback : v.toString();
num _n(dynamic v) => v is num ? v : num.tryParse(_s(v)) ?? 0;
DateTime? _d(dynamic v) => v == null ? null : DateTime.tryParse(v.toString())?.toLocal();
List<Map<String, dynamic>> _maps(dynamic v) =>
    v is List ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() : const [];

class ReturnReason {
  final String code;
  final String label;
  final List<String> types;
  final bool requiresComment;

  const ReturnReason({required this.code, required this.label, required this.types, this.requiresComment = false});

  factory ReturnReason.fromJson(Map<String, dynamic> j) => ReturnReason(
        code: _s(j['code']),
        label: _s(j['label']),
        types: (j['types'] as List? ?? const []).map((e) => e.toString()).toList(),
        requiresComment: j['requiresComment'] == true,
      );
}

class ReturnConfig {
  final int windowHours;
  final int refundDelayHours;
  final int maxPhotos;
  final List<ReturnReason> reasons;

  const ReturnConfig({required this.windowHours, required this.refundDelayHours, required this.maxPhotos, required this.reasons});

  factory ReturnConfig.fromJson(Map<String, dynamic> j) => ReturnConfig(
        windowHours: _n(j['windowHours']).toInt(),
        refundDelayHours: _n(j['refundDelayHours']).toInt(),
        maxPhotos: _n(j['maxPhotos']).toInt().clamp(1, 10),
        reasons: _maps(j['reasons']).map(ReturnReason.fromJson).toList(),
      );
}

class ReturnableItem {
  final String key;
  final String name;
  final String image;
  final String weightSpec;
  final num price;
  final int quantity;
  final int returnableQty;

  const ReturnableItem({
    required this.key,
    required this.name,
    required this.image,
    required this.weightSpec,
    required this.price,
    required this.quantity,
    required this.returnableQty,
  });

  factory ReturnableItem.fromJson(Map<String, dynamic> j) => ReturnableItem(
        key: _s(j['key']),
        name: _s(j['name'], 'Item'),
        image: _s(j['image']),
        weightSpec: _s(j['weightSpec']),
        price: _n(j['price']),
        quantity: _n(j['quantity']).toInt(),
        returnableQty: _n(j['returnableQty']).toInt(),
      );
}

class ReturnRefund {
  final num amount;
  final String method; // wallet | original
  final String status; // none | scheduled | processing | processed | failed
  final DateTime? dueAt;
  final DateTime? processedAt;

  const ReturnRefund({required this.amount, required this.method, required this.status, this.dueAt, this.processedAt});

  bool get toWallet => method == 'wallet';

  factory ReturnRefund.fromJson(Map<String, dynamic> j) => ReturnRefund(
        amount: _n(j['amount']),
        method: _s(j['method'], 'wallet'),
        status: _s(j['status'], 'none'),
        dueAt: _d(j['dueAt']),
        processedAt: _d(j['processedAt']),
      );
}

class ReturnTimelineEntry {
  final String status;
  final String note;
  final DateTime? at;
  const ReturnTimelineEntry(this.status, this.note, this.at);
}

class ReturnRequestModel {
  final String returnId;
  final String orderId;
  final String type; // return | exchange
  final String status;
  final List<Map<String, dynamic>> items;
  final String reasonLabel;
  final String comment;
  final String pickupOtp;
  final String partnerName;
  final String rejectionReason;
  final String failureReason;
  final ReturnRefund? refund;
  final List<ReturnTimelineEntry> timeline;

  const ReturnRequestModel({
    required this.returnId,
    required this.orderId,
    required this.type,
    required this.status,
    required this.items,
    required this.reasonLabel,
    required this.comment,
    required this.pickupOtp,
    required this.partnerName,
    required this.rejectionReason,
    required this.failureReason,
    required this.refund,
    required this.timeline,
  });

  bool get isExchange => type == 'exchange';
  bool get canCancel => status == 'Requested' || status == 'Assigned';
  int get itemCount => items.fold(0, (s, i) => s + _n(i['quantity']).toInt());

  factory ReturnRequestModel.fromJson(Map<String, dynamic> j) => ReturnRequestModel(
        returnId: _s(j['returnId']),
        orderId: _s(j['orderId']),
        type: _s(j['type'], 'return'),
        status: _s(j['status'], 'Requested'),
        items: _maps(j['items']),
        reasonLabel: _s(j['reasonLabel']),
        comment: _s(j['comment']),
        pickupOtp: _s(j['pickupOtp']),
        partnerName: _s(j['partnerName']),
        rejectionReason: _s(j['rejectionReason']),
        failureReason: _s(j['failureReason']),
        refund: j['refund'] is Map ? ReturnRefund.fromJson(Map<String, dynamic>.from(j['refund'] as Map)) : null,
        timeline: _maps(j['timeline'])
            .map((t) => ReturnTimelineEntry(_s(t['status']), _s(t['note']), _d(t['at'])))
            .toList(),
      );
}

enum ReturnTone { info, progress, success, muted, danger }

/// Customer-facing wording per status — same mapping as the web's
/// `returnStatusCopy` so both platforms say the same thing.
({String title, ReturnTone tone}) returnStatusCopy(ReturnRequestModel r) {
  switch (r.status) {
    case 'Requested':
      return (title: 'Finding a pickup partner', tone: ReturnTone.info);
    case 'Assigned':
      return (title: 'Pickup partner assigned', tone: ReturnTone.progress);
    case 'Arrived':
      return (title: 'Partner is at your door', tone: ReturnTone.progress);
    case 'Picked Up':
    case 'Completed':
      if (r.isExchange) return (title: 'Exchanged', tone: ReturnTone.success);
      if (r.refund?.status == 'processed') return (title: 'Refunded', tone: ReturnTone.success);
      return (title: 'Picked up · refund on the way', tone: ReturnTone.progress);
    case 'Pickup Failed':
      return (title: 'Pickup missed · rescheduling', tone: ReturnTone.danger);
    case 'Rejected':
      return (title: 'Request declined', tone: ReturnTone.danger);
    case 'Cancelled':
      return (title: 'Cancelled', tone: ReturnTone.muted);
    default:
      return (title: r.status, tone: ReturnTone.info);
  }
}

class OrderReturns {
  final bool eligible;
  final String reason;
  final int windowHours;
  final DateTime? windowEndsAt;
  final int refundDelayHours;
  final List<String> refundMethods;
  final List<ReturnableItem> items;
  final List<ReturnRequestModel> requests;

  const OrderReturns({
    required this.eligible,
    required this.reason,
    required this.windowHours,
    required this.windowEndsAt,
    required this.refundDelayHours,
    required this.refundMethods,
    required this.items,
    required this.requests,
  });

  factory OrderReturns.fromJson(Map<String, dynamic> j) => OrderReturns(
        eligible: j['eligible'] == true,
        reason: _s(j['reason']),
        windowHours: _n(j['windowHours']).toInt(),
        windowEndsAt: _d(j['windowEndsAt']),
        refundDelayHours: _n(j['refundDelayHours']).toInt(),
        refundMethods: (j['refundMethods'] as List? ?? const ['wallet']).map((e) => e.toString()).toList(),
        items: _maps(j['items']).map(ReturnableItem.fromJson).toList(),
        requests: _maps(j['requests']).map(ReturnRequestModel.fromJson).toList(),
      );
}
