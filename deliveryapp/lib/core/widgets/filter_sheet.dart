import 'package:flutter/material.dart';
import 'package:freshcart_delivery/core/theme.dart';

/// One filter option shown in [showFilterSheet].
class FilterOption<T> {
  const FilterOption(this.value, this.label, {this.icon});
  final T value;
  final String label;
  final IconData? icon;
}

/// A single "three lines" filter action for an AppBar: tapping it opens a
/// bottom sheet to pick one of [options] instead of a permanently-visible
/// tab/segmented row. Used the same way on every list screen (Orders,
/// Earnings, ...) so filtering is consistent across the app.
class FilterAction<T> extends StatelessWidget {
  const FilterAction({
    super.key,
    required this.title,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final String title;
  final List<FilterOption<T>> options;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: title,
      icon: const Icon(Icons.filter_list_rounded, size: 22),
      onPressed: () async {
        final result = await showFilterSheet<T>(
          context,
          title: title,
          options: options,
          selected: selected,
        );
        if (result != null) onChanged(result);
      },
    );
  }
}

Future<T?> showFilterSheet<T>(
  BuildContext context, {
  required String title,
  required List<FilterOption<T>> options,
  required T selected,
}) {
  return showModalBottomSheet<T>(
    context: context,
    showDragHandle: true,
    backgroundColor: kSurface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.9,
                  color: kTextFaint,
                ),
              ),
            ),
          ),
          ...options.map((o) {
            final sel = o.value == selected;
            return ListTile(
              leading: o.icon != null ? Icon(o.icon, size: 18, color: sel ? kGreen : kTextFaint) : null,
              title: Text(
                o.label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                  color: sel ? kGreen : kText,
                ),
              ),
              trailing: sel ? const Icon(Icons.check_rounded, color: kGreen) : null,
              onTap: () => Navigator.pop(sheetContext, o.value),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
