import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:freshcart/core/theme/app_theme.dart';
import 'package:freshcart/features/legal/presentation/screens/legal_screen.dart';

Widget _host({String start = '/legal'}) => MaterialApp.router(
      theme: AppTheme.lightTheme,
      routerConfig: GoRouter(
        initialLocation: start,
        routes: [
          GoRoute(
            path: '/legal',
            builder: (_, s) => LegalScreen(initialTab: s.uri.queryParameters['tab'] ?? 'terms'),
          ),
        ],
      ),
    );

void main() {
  testWidgets('defaults to Terms of Use and can switch to Privacy', (tester) async {
    await tester.pumpWidget(_host());
    await tester.pumpAndSettle();

    expect(find.text('FreshCart Terms of Use'), findsOneWidget);
    expect(find.text('1. Terms of Use'), findsOneWidget);

    await tester.tap(find.text('Privacy'));
    await tester.pumpAndSettle();
    expect(find.text('Privacy Notice'), findsOneWidget);
    expect(find.text('1. Privacy Notice Overview'), findsOneWidget);
  });

  testWidgets('?tab=privacy opens the Privacy notice directly', (tester) async {
    await tester.pumpWidget(_host(start: '/legal?tab=privacy'));
    await tester.pumpAndSettle();
    expect(find.text('Privacy Notice'), findsOneWidget);
    expect(find.text('1. Privacy Notice Overview'), findsOneWidget);
  });
}
