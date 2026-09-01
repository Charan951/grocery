import 'dart:async';
import 'package:razorpay_flutter/razorpay_flutter.dart';

sealed class PaymentResult {
  const PaymentResult();
}

class PaymentSuccess extends PaymentResult {
  final String paymentId;
  final String razorpayOrderId;
  final String signature;
  const PaymentSuccess({
    required this.paymentId,
    required this.razorpayOrderId,
    required this.signature,
  });
}

class PaymentFailure extends PaymentResult {
  final String message;
  final bool cancelled;
  const PaymentFailure(this.message, {this.cancelled = false});
}

class PaymentRequest {
  final String keyId;
  final String razorpayOrderId;
  final int amountPaise;
  final String name;
  final String description;
  final String contact;
  final String email;
  const PaymentRequest({
    required this.keyId,
    required this.razorpayOrderId,
    required this.amountPaise,
    required this.name,
    required this.description,
    required this.contact,
    required this.email,
  });
}

abstract class PaymentGateway {
  Future<PaymentResult> pay(PaymentRequest req);
}

/// Real Razorpay checkout sheet.
class RazorpayGateway implements PaymentGateway {
  @override
  Future<PaymentResult> pay(PaymentRequest req) {
    final rzp = Razorpay();
    final completer = Completer<PaymentResult>();

    void done(PaymentResult r) {
      if (!completer.isCompleted) completer.complete(r);
    }

    rzp.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
      done(PaymentSuccess(
        paymentId: r.paymentId ?? '',
        razorpayOrderId: r.orderId ?? req.razorpayOrderId,
        signature: r.signature ?? '',
      ));
    });
    rzp.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
      final cancelled = r.code == Razorpay.PAYMENT_CANCELLED;
      done(PaymentFailure(
        r.message ?? (cancelled ? 'Payment cancelled' : 'Payment failed'),
        cancelled: cancelled,
      ));
    });
    rzp.on(Razorpay.EVENT_EXTERNAL_WALLET, (_) {});

    try {
      rzp.open({
        'key': req.keyId,
        'order_id': req.razorpayOrderId,
        'amount': req.amountPaise,
        'currency': 'INR',
        'name': req.name,
        'description': req.description,
        'prefill': {'contact': req.contact, 'email': req.email},
        'retry': {'enabled': true, 'max_count': 1},
      });
    } catch (e) {
      done(PaymentFailure('Could not open the payment sheet: $e'));
    }

    return completer.future.whenComplete(() {
      Future.delayed(const Duration(milliseconds: 300), rzp.clear);
    });
  }
}

/// Used when the backend reports test mode with no usable key — completes
/// "successfully" without opening a real sheet so dev/CI checkout still works.
class SimulatedGateway implements PaymentGateway {
  @override
  Future<PaymentResult> pay(PaymentRequest req) async {
    await Future.delayed(const Duration(milliseconds: 600));
    return PaymentSuccess(
      paymentId: 'pay_sim_${DateTime.now().millisecondsSinceEpoch}',
      razorpayOrderId: req.razorpayOrderId,
      signature: 'simulated',
    );
  }
}
