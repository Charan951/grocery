import 'package:flutter/material.dart';
import 'package:freshcart_delivery/core/theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBrand,
      body: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.delivery_dining, size: 64, color: Colors.white),
            SizedBox(height: 16),
            Text('FreshCart Delivery',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
            SizedBox(height: 24),
            SizedBox(
              width: 22, height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
