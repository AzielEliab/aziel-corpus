import 'package:flutter/material.dart';

import 'theme.dart';

const limitation =
    'THIS IS a public library index of Aziel Eliab software plus a counted '
    'download of the printed 468-page corpus PDF and the library package. '
    'THIS IS NOT a search engine of private files, Zenodo, or a new Lock engine. '
    'GodLock is a product name. Author Aziel Eliab only.';

const works = <Map<String, String>>[
  {'slug': 'aziel-corpus-pdf', 'name': 'AZIEL Corpus Library — software (printed)', 'one': '468-page printed corpus. Counted PDF download.'},
  {'slug': 'aziel-corpus', 'name': 'Aziel Corpus Library', 'one': 'Public library of Aziel Eliab software.'},
  {'slug': 'vibelock', 'name': 'VibeLock', 'one': 'Physical-consistency evaluation of speech audio.'},
  {'slug': 'godlock', 'name': 'GodLock', 'one': 'Offline ABAD / hardening score. Not a VPN.'},
  {'slug': 'employeelock', 'name': 'EmployeeLock', 'one': 'Hash-chained accountability workbook.'},
  {'slug': 'foldlock', 'name': 'FoldLock', 'one': 'Tether-word suppression on UTF-8 text. Not zip.'},
];

void main() {
  runApp(const AzielCorpusApp());
}

class AzielCorpusApp extends StatelessWidget {
  const AzielCorpusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aziel Corpus Library',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const ShelfPage(),
    );
  }
}

class ShelfPage extends StatefulWidget {
  const ShelfPage({super.key});

  @override
  State<ShelfPage> createState() => _ShelfPageState();
}

class _ShelfPageState extends State<ShelfPage> {
  String q = '';

  @override
  Widget build(BuildContext context) {
    final needle = q.trim().toLowerCase();
    final shown = works.where((w) {
      if (needle.isEmpty) return true;
      final hay = '${w['slug']} ${w['name']} ${w['one']}'.toLowerCase();
      return hay.contains(needle);
    }).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Aziel Corpus Library')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(limitation, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(hintText: 'Search works'),
            onChanged: (v) => setState(() => q = v),
          ),
          const SizedBox(height: 12),
          Text('${shown.length} showing · author Aziel Eliab'),
          const SizedBox(height: 8),
          for (final w in shown)
            Card(
              child: ListTile(
                title: Text(w['name']!),
                subtitle: Text('${w['slug']}\n${w['one']}'),
                isThreeLine: true,
              ),
            ),
        ],
      ),
    );
  }
}
