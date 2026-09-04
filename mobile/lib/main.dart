import 'package:flutter/material.dart';

import 'theme.dart';

const limitation =
    'THIS IS Aziel Digital Library v2.7.0 — a self-contained immutable local '
    'digital library and intelligence runtime. Public site is MASTER. '
    'Anonymous GET is read-only. Signed-in accounts may ingest. '
    'THIS IS NOT a 26-card software index. Not Zenodo. Not Horton. '
    'Author Aziel Eliab only.';

const endpoints = <Map<String, String>>[
  {'slug': 'home', 'name': 'Public MASTER', 'one': 'https://www.azielcorpuslibrary.net/'},
  {'slug': 'download', 'name': 'Counted zip', 'one': 'HTTP 200 /download — not a 302. Structure-verified.'},
  {'slug': 'search', 'name': 'Search', 'one': 'GET /search and GET /v1/search?q='},
  {'slug': 'health', 'name': 'Health', 'one': 'GET /v1/health — does not increment downloads.'},
  {'slug': 'map', 'name': 'Temporal map', 'one': 'Published corpus map view.'},
  {'slug': 'gazetteer', 'name': 'Gazetteer', 'one': 'Published place index.'},
];

void main() {
  runApp(const AzielLibraryApp());
}

class AzielLibraryApp extends StatelessWidget {
  const AzielLibraryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aziel Digital Library',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const LibraryPage(),
    );
  }
}

class LibraryPage extends StatefulWidget {
  const LibraryPage({super.key});

  @override
  State<LibraryPage> createState() => _LibraryPageState();
}

class _LibraryPageState extends State<LibraryPage> {
  String q = '';

  @override
  Widget build(BuildContext context) {
    final needle = q.trim().toLowerCase();
    final shown = endpoints.where((w) {
      if (needle.isEmpty) return true;
      final hay = '${w['slug']} ${w['name']} ${w['one']}'.toLowerCase();
      return hay.contains(needle);
    }).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Aziel Digital Library')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(limitation, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(hintText: 'Search library surfaces'),
            onChanged: (v) => setState(() => q = v),
          ),
          const SizedBox(height: 12),
          Text('${shown.length} showing · author Aziel Eliab · v2.7.0'),
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
