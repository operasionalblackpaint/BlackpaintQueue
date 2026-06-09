export interface DartCodeFile {
  filename: string;
  description: string;
  code: string;
}

export const DART_RESOURCES: DartCodeFile[] = [
  {
    filename: 'production_order.dart',
    description: 'Model data Dart untuk pesanan produksi, merekam ID Order, relasi parent (multi-order), tautan file desain, dan pelacakan rute berantai reaktif.',
    code: `import 'dart:convert';

class ProductionOrder {
  final String idOrder; // ID Unik Item/Rute Dokumen (Misal: ORD-12345-1)
  final String? idParentOrder; // ID Kelompok/Induk Transaksi (Misal: ORD-12345)
  final String namaCustomer;
  final String namaProduk;
  final int jumlah;
  final DateTime tanggalInput;
  final DateTime datetimeDeadline;
  final int statusRuteSekarang; // Indeks divisi aktif dalam array alurDivisi
  final bool statusKendala;
  final String jenisKendala; // 'Mesin Eror', 'Bahan Rusak', 'File Corrupt'
  final bool isBooster; // Status Prioritas Mutlak (Sangat Urgent)
  final String notes;
  final String linkFileDesain; // Lokasi siap cetak di cloud atau harddisk PC
  final bool isArchived;
  final List<String> alurDivisi; // Alur Rantai Estafet Rute (Snapshot Divisi)

  ProductionOrder({
    required this.idOrder,
    this.idParentOrder,
    required this.namaCustomer,
    required this.namaProduk,
    required this.jumlah,
    required this.tanggalInput,
    required this.datetimeDeadline,
    required this.statusRuteSekarang,
    required this.statusKendala,
    this.jenisKendala = '',
    this.isBooster = false,
    this.notes = '',
    this.linkFileDesain = '',
    this.isArchived = false,
    required this.alurDivisi,
  });

  ProductionOrder copyWith({
    String? idOrder,
    String? idParentOrder,
    String? namaCustomer,
    String? namaProduk,
    int? jumlah,
    DateTime? tanggalInput,
    DateTime? datetimeDeadline,
    int? statusRuteSekarang,
    bool? statusKendala,
    String? jenisKendala,
    bool? isBooster,
    String? notes,
    String? linkFileDesain,
    bool? isArchived,
    List<String>? alurDivisi,
  }) {
    return ProductionOrder(
      idOrder: idOrder ?? this.idOrder,
      idParentOrder: idParentOrder ?? this.idParentOrder,
      namaCustomer: namaCustomer ?? this.namaCustomer,
      namaProduk: namaProduk ?? this.namaProduk,
      jumlah: jumlah ?? this.jumlah,
      tanggalInput: tanggalInput ?? this.tanggalInput,
      datetimeDeadline: datetimeDeadline ?? this.datetimeDeadline,
      statusRuteSekarang: statusRuteSekarang ?? this.statusRuteSekarang,
      statusKendala: statusKendala ?? this.statusKendala,
      jenisKendala: jenisKendala ?? this.jenisKendala,
      isBooster: isBooster ?? this.isBooster,
      notes: notes ?? this.notes,
      linkFileDesain: linkFileDesain ?? this.linkFileDesain,
      isArchived: isArchived ?? this.isArchived,
      alurDivisi: alurDivisi ?? this.alurDivisi,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id_order': idOrder,
      'id_parent_order': idParentOrder,
      'nama_customer': namaCustomer,
      'nama_produk': namaProduk,
      'jumlah': jumlah,
      'tanggal_input': tanggalInput.toIso8601String(),
      'datetime_deadline': datetimeDeadline.toIso8601String(),
      'status_rute_sekarang': statusRuteSekarang,
      'status_kendala': statusKendala,
      'jenis_kendala': jenisKendala,
      'is_booster': isBooster,
      'notes': notes,
      'link_file_desain': linkFileDesain,
      'is_archived': isArchived,
      'alur_divisi': alurDivisi,
    };
  }

  factory ProductionOrder.fromMap(Map<String, dynamic> map) {
    return ProductionOrder(
      idOrder: map['id_order'] ?? '',
      idParentOrder: map['id_parent_order'],
      namaCustomer: map['nama_customer'] ?? '',
      namaProduk: map['nama_produk'] ?? '',
      jumlah: (map['jumlah'] as num?)?.toInt() ?? 0,
      tanggalInput: DateTime.parse(map['tanggal_input']),
      datetimeDeadline: DateTime.parse(map['datetime_deadline']),
      statusRuteSekarang: (map['status_rute_sekarang'] as num?)?.toInt() ?? 0,
      statusKendala: map['status_kendala'] ?? false,
      jenisKendala: map['jenis_kendala'] ?? '',
      isBooster: map['is_booster'] ?? false,
      notes: map['notes'] ?? '',
      linkFileDesain: map['link_file_desain'] ?? '',
      isArchived: map['is_archived'] ?? false,
      alurDivisi: List<String>.from(map['alur_divisi'] ?? []),
    );
  }

  String toJson() => json.encode(toMap());

  factory ProductionOrder.fromJson(String source) =>
      ProductionOrder.fromMap(json.decode(source));
}
`
  },
  {
    filename: 'countdown_utils.dart',
    description: 'Bilah utilitas pewarnaan visual dan pemformatan selisih waktu Countdown (HH:MM:SS) yang presisi.',
    code: `import 'package:flutter/material.dart';

enum UrgencyLevel { normal, warning, urgent }

class CountdownUtils {
  // Menghitung sisa durasi menuju deadline target
  static Duration getRemaining(DateTime deadline) {
    final now = DateTime.now();
    return deadline.isAfter(now) ? deadline.difference(now) : Duration.zero;
  }

  // Format sisa waktu ke string teks sirkuit: (HH:MM:SS)
  static String formatCountdown(DateTime deadline) {
    final rem = getRemaining(deadline);
    if (rem == Duration.zero) return 'TELAH LEWAT!';
    
    final hours = rem.inHours.toString().padLeft(2, '0');
    final minutes = (rem.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (rem.inSeconds % 60).toString().padLeft(2, '0');
    
    return '$hours:$minutes:$seconds';
  }

  // Aturan warna deadline mutlak: Merah (<2 jam), Kuning (2-5 jam), Hijau (>5 jam)
  static UrgencyLevel getUrgency(DateTime deadline) {
    final rem = getRemaining(deadline);
    if (rem.inHours < 2) {
      return UrgencyLevel.urgent;
    } else if (rem.inHours < 5) {
      return UrgencyLevel.warning;
    } else {
      return UrgencyLevel.normal;
    }
  }

  // Mendapatkan warna baris / border visual
  static Color getUrgencyColor(UrgencyLevel level) {
    switch (level) {
      case UrgencyLevel.urgent:
        return const Color(0xFFEF4444); // Merah Terang
      case UrgencyLevel.warning:
        return const Color(0xFFF59E0B); // Kuning Oranye
      case UrgencyLevel.normal:
        return const Color(0xFF10B981); // Hijau Emerald
    }
  }

  // Mendapatkan warna background redup yang nyaman dipandang
  static Color getUrgencyBg(UrgencyLevel level) {
    switch (level) {
      case UrgencyLevel.urgent:
        return const Color(0xFF7F1D1D).withOpacity(0.2); // Merah Redup
      case UrgencyLevel.warning:
        return const Color(0xFF78350F).withOpacity(0.15); // Kuning Redup
      case UrgencyLevel.normal:
        return const Color(0xFF064E3B).withOpacity(0.15); // Hijau Redup
    }
  }
}
`
  },
  {
    filename: 'queue_provider.dart',
    description: 'State Management Provider pusat berisi skema definisi 20 divisi, dan logika estafet pengalihan koordinat [Workstation -> Divisi].',
    code: `import 'dart:async';
import 'package:flutter/material.dart';
import 'production_order.dart';

class DivisiModel {
  final String id;
  final String nama;
  final String workstation; // 'Workstation Blackpaint', 'Workstation Reseller', 'Workstation Folder'

  const DivisiModel({
    required this.id,
    required this.nama,
    required this.workstation,
  });
}

class QueueProvider with ChangeNotifier {
  // Database pusat antrean dalam memori internal reaktif
  final List<ProductionOrder> _orders = [];
  Timer? _countdownTicker;

  // 1. Skema Pemetaan 20 Divisi Baru & 3 Workstation Utama
  static const List<DivisiModel> skuadDivisi = [
    // Workstation Blackpaint - 8 Divisi
    DivisiModel(id: 'Bordir', nama: 'Bordir', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Cutting', nama: 'Cutting', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Faktur', nama: 'Faktur', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Highres', nama: 'Highres', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Laser', nama: 'Laser', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Souvenir', nama: 'Souvenir', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Spanduk', nama: 'Spanduk', workstation: 'Workstation Blackpaint'),
    DivisiModel(id: 'Uv', nama: 'Uv', workstation: 'Workstation Blackpaint'),

    // Workstation Reseller - 4 Divisi
    DivisiModel(id: 'Cutting Reseller', nama: 'Cutting Reseller', workstation: 'Workstation Reseller'),
    DivisiModel(id: 'Highres Reseller', nama: 'Highres Reseller', workstation: 'Workstation Reseller'),
    DivisiModel(id: 'Laser Reseller', nama: 'Laser Reseller', workstation: 'Workstation Reseller'),
    DivisiModel(id: 'Spanduk Reseller', nama: 'Spanduk Reseller', workstation: 'Workstation Reseller'),

    // Workstation Folder - 7 Divisi
    DivisiModel(id: 'Laser Cutting', nama: 'Laser Cutting', workstation: 'Workstation Folder'),
    DivisiModel(id: 'Direct Sublim', nama: 'Direct Sublim', workstation: 'Workstation Folder'),
    DivisiModel(id: 'DTF', nama: 'DTF', workstation: 'Workstation Folder'),
    DivisiModel(id: 'Jahit', nama: 'Jahit', workstation: 'Workstation Folder'),
    DivisiModel(id: 'Sublim', nama: 'Sublim', workstation: 'Workstation Folder'),
    DivisiModel(id: 'Sublim Press', nama: 'Sublim Press', workstation: 'Workstation Folder'),
    DivisiModel(id: 'Sablon', nama: 'Sablon', workstation: 'Workstation Folder')
  ];

  QueueProvider() {
    _countdownTicker = Timer.periodic(const Duration(seconds: 1), (timer) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _countdownTicker?.cancel();
    super.dispose();
  }

  List<ProductionOrder> get allActiveOrders =>
      _orders.where((o) => !o.isArchived).toList();

  // Utilitas mendapatkan koordinat workstation dari divisi aktif
  static DivisiModel? temukanDivisi(String idDivisi) {
    try {
      return skuadDivisi.firstWhere((d) => d.id.toLowerCase() == idDivisi.toLowerCase());
    } catch (_) {
      return null;
    }
  }

  // Logika Tambah Transaksi Order Baru ke antrean pusat secara real-time
  void submitOrder(ProductionOrder order) {
    _orders.add(order);
    notifyListeners();
  }

  // 3. LOGIKA ESTAFET TOMBOL "SELESAI" OPERATOR WORKSTATION
  // Memindahkan pesanan secara otomatis ke koordinat rute berikutnya: [Workstation Baru -> Divisi Baru]
  void completeAndTriggerEstafet(String idOrder) {
    final idx = _orders.indexWhere((o) => o.idOrder == idOrder);
    if (idx == -1) return;

    final currOrder = _orders[idx];
    final nextStepIdx = currOrder.statusRuteSekarang + 1;

    if (nextStepIdx < currOrder.alurDivisi.length) {
      // Progress melompat ke Divisi Berikutnya
      _orders[idx] = currOrder.copyWith(
        statusRuteSekarang: nextStepIdx,
        statusKendala: false,
        jenisKendala: '',
      );
    } else {
      // Sampai di ujung rute penugasan, pesanan selesai (diarsipkan)
      _orders[idx] = currOrder.copyWith(
        isArchived: true,
        statusKendala: false,
        jenisKendala: '',
      );
    }
    notifyListeners();
  }

  // Laporkan hambatan produksi
  void flagObstacle(String idOrder, String jenis) {
    final idx = _orders.indexWhere((o) => o.idOrder == idOrder);
    if (idx != -1) {
      _orders[idx] = _orders[idx].copyWith(statusKendala: true, jenisKendala: jenis);
      notifyListeners();
    }
  }

  // Hapus tanda hambatan produksi
  void clearObstacle(String idOrder) {
    final idx = _orders.indexWhere((o) => o.idOrder == idOrder);
    if (idx != -1) {
      _orders[idx] = _orders[idx].copyWith(statusKendala: false, jenisKendala: '');
      notifyListeners();
    }
  }
}
`
  },
  {
    filename: 'dashboard_input_page.dart',
    description: 'Halaman formulir penjaluran pesanan baru, mendukung multi-jenis pesanan dinamis (Tambah Jenis Orderan) dalam 1 ID Order dan file siap cetak.',
    code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'production_order.dart';
import 'queue_provider.dart';

class DashboardInputPage extends StatefulWidget {
  const DashboardInputPage({Key? key}) : super(key: key);

  @override
  State<DashboardInputPage> createState() => _DashboardInputPageState();
}

class _DashboardInputPageState extends State<DashboardInputPage> {
  final _formKey = GlobalKey<FormState>();
  final _customerController = TextEditingController();
  final _idOrderController = TextEditingController();

  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _selectedTime = const TimeOfDay(hour: 17, minute: 0);
  bool _isBooster = false;

  // Baris-baris produk dinamis dalam 1 ID Order yang sama (Tambah Jenis Orderan)
  final List<Map<String, dynamic>> _orderRows = [
    {
      'produk': 'Jersey Printing',
      'jumlah': 12,
      'file': 'https://drive.google.com/file/d/jersey01',
      'notes': 'Ukuran XL',
    }
  ];

  final List<String> _productOptions = [
    'Jersey Printing',
    'Bordir Jaket / Kaos',
    'Acrylic Cutting Custom',
    'Sticker Label Vinyl',
    'Spanduk Reseller Banner',
    'Plakat Kayu Souvenir',
    'Gantungan Kunci UV',
    'Banner Highres',
  ];

  // Map sederhana rute otomatis berdasarkan pilihan produk
  List<String> _getRutePreset(String produk) {
    switch (produk) {
      case 'Jersey Printing':
        return ['Faktur', 'Sublim', 'Sublim Press', 'Jahit', 'Uv'];
      case 'Bordir Jaket / Kaos':
        return ['Faktur', 'Bordir', 'Jahit', 'Uv'];
      case 'Acrylic Cutting Custom':
        return ['Faktur', 'Laser', 'Laser Cutting'];
      case 'Spanduk Reseller Banner':
        return ['Spanduk Reseller', 'Cutting Reseller', 'Sablon', 'Uv'];
      default:
        return ['Faktur', 'Cutting', 'DTF', 'Uv'];
    }
  }

  @override
  void initState() {
    super.initState();
    // Pre-generate ID Order secara acak namun bisa diedit manual
    _idOrderController.text = 'ORD-\${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
  }

  void _pilihTanggal() async {
    final p = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (p != null) setState(() => _selectedDate = p);
  }

  void _pilihJam() async {
    final t = await showTimePicker(context: context, initialTime: _selectedTime);
    if (t != null) setState(() => _selectedTime = t);
  }

  void _tambahBarisOrder() {
    setState(() {
      _orderRows.add({
        'produk': 'Jersey Printing',
        'jumlah': 1,
        'file': '',
        'notes': '',
      });
    });
  }

  void _kirimKeAntrean() {
    if (!_formKey.currentState!.validate() || _orderRows.isEmpty) return;

    final provider = Provider.of<QueueProvider>(context, listen: false);
    final deadline = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );

    // Kirim setiap jenis orderan sebagai item berantai yang terhubung ID Order-nya
    for (int i = 0; i < _orderRows.length; i++) {
      final baris = _orderRows[i];
      final ruteAturan = _getRutePreset(baris['produk']);
      
      final singleOrder = ProductionOrder(
        idOrder: '\${_idOrderController.text}-\${i + 1}', // Misal: ORD-12345-1, ORD-12345-2
        idParentOrder: _idOrderController.text,
        namaCustomer: _customerController.text,
        namaProduk: baris['produk'],
        jumlah: baris['jumlah'],
        tanggalInput: DateTime.now(),
        datetimeDeadline: deadline,
        statusRuteSekarang: 0,
        statusKendala: false,
        isBooster: _isBooster,
        notes: baris['notes'],
        linkFileDesain: baris['file'],
        alurDivisi: ruteAturan,
      );

      provider.submitOrder(singleOrder);
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Orderan berhasil dikirim ke antrean pusat.')),
    );

    // Bersihkan formulir / reset ID Order baru
    setState(() {
      _customerController.clear();
      _idOrderController.text = 'ORD-\${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
      _orderRows.clear();
      _orderRows.add({
        'produk': 'Jersey Printing',
        'jumlah': 1,
        'file': '',
        'notes': '',
      });
      _isBooster = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DASHBOARD INPUT ADMIN (WRITABLE FORM)')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Sesi Dokumen Utama (ID & Customer)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _idOrderController,
                        decoration: const InputDecoration(labelText: 'ID Order (Pre-gen / Edit)'),
                        validator: (v) => v!.isEmpty ? 'Tidak boleh kosong' : null,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        controller: _customerController,
                        decoration: const InputDecoration(labelText: 'Nama Customer'),
                        validator: (v) => v!.isEmpty ? 'Isi nama customer' : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Sesi Pengaturan Multi-Orderan (Dinamis List)
            const Text(
              'Rincian Jenis Cetakan (Multiple Baris):',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),

            ..._orderRows.asMap().entries.map((item) {
              final idx = item.key;
              final data = item.value;
              final ruteDeteksi = _getRutePreset(data['produk']);

              return Card(
                color: Colors.blueGrey.shade50,
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Baris #\${idx + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          if (_orderRows.length > 1)
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => setState(() => _orderRows.removeAt(idx)),
                            )
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              value: data['produk'],
                              items: _productOptions.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                              onChanged: (val) {
                                setState(() => _orderRows[idx]['produk'] = val);
                              },
                              decoration: const InputDecoration(labelText: 'Nama Produk'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 1,
                            child: TextFormField(
                              initialValue: data['jumlah'].toString(),
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Jumlah (Pcs)'),
                              onChanged: (val) {
                                setState(() => _orderRows[idx]['jumlah'] = int.tryParse(val) ?? 1);
                              },
                            ),
                          ),
                        ],
                      ),
                      TextFormField(
                        initialValue: data['file'],
                        decoration: const InputDecoration(labelText: 'Link File Desain (Cloud/PC)'),
                        onChanged: (val) => setState(() => _orderRows[idx]['file'] = val),
                      ),
                      TextFormField(
                        initialValue: data['notes'],
                        decoration: const InputDecoration(labelText: 'Catatan Khusus'),
                        onChanged: (val) => setState(() => _orderRows[idx]['notes'] = val),
                      ),
                      const SizedBox(height: 12),

                      // Preview Penentuan Rute Rantai Otomatis
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                        child: Text(
                          'Rute Otomatis Terdeteksi: \${ruteDeteksi.join(\' ➔ \')}',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11, color: Colors.blueAccent),
                        ),
                      )
                    ],
                  ),
                ),
              );
            }).toList(),

            const SizedBox(height: 8),
            // Tombol Tambah Row
            OutlinedButton.icon(
              onPressed: _tambahBarisOrder,
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Tambah Jenis Orderan (Dinamis)'),
            ),
            const Divider(height: 32),

            // Deadline (Tanggal & Jam Terpisah)
            Row(
              children: [
                Expanded(
                  child: ListTile(
                    title: const Text('Tanggal Deadline', style: TextStyle(fontSize: 12)),
                    subtitle: Text('\${_selectedDate.day}-\${_selectedDate.month}-\${_selectedDate.year}'),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: _pilihTanggal,
                  ),
                ),
                Expanded(
                  child: ListTile(
                    title: const Text('Jam Batas Waktu', style: TextStyle(fontSize: 12)),
                    subtitle: Text(_selectedTime.format(context)),
                    trailing: const Icon(Icons.access_time),
                    onTap: _pilihJam,
                  ),
                ),
              ],
            ),

            // Checkbox Booster
            CheckboxListTile(
              title: const Text('🚀 Checkbox Booster (Super Urgent)', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Menyerobot baris antrean paling atas di seluruh workstation divisi.'),
              value: _isBooster,
              onChanged: (v) => setState(() => _isBooster = v ?? false),
            ),
            const SizedBox(height: 20),

            // Tombol Kirim Order Utama
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.emerald.shade700,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _kirimKeAntrean,
              child: const Text('Kirim Order ke Antrean', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            )
          ],
        ),
      ),
    );
  }
}
`
  },
  {
    filename: 'dashboard_view_page.dart',
    description: 'Halaman dashboard monitoring mutlak Read-Only (Tanpa Tombol/Edit) bermutu visual kontras Calibri/Sans-Serif disertai filter dinamis.',
    code: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'countdown_utils.dart';
import 'queue_provider.dart';

class DashboardViewPage extends StatefulWidget {
  const DashboardViewPage({Key? key}) : super(key: key);

  @override
  State<DashboardViewPage> createState() => _DashboardViewPageState();
}

class _DashboardViewPageState extends State<DashboardViewPage> {
  String _searchQuery = '';
  String _selectedWorkstationFilter = 'Semua'; // 'Semua', 'Blackpaint', 'Reseller', 'Folder'

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DASHBOARD VIEW ADMIN (READ-ONLY MONITORING)', style: TextStyle(fontFamily: 'Calibri', fontWeight: FontWeight.bold)),
        backgroundColor: Colors.blueGrey.shade900,
      ),
      body: Consumer<QueueProvider>(
        builder: (context, provider, child) {
          // Dapatkan semua pesanan aktif
          final rawOrders = provider.allActiveOrders;

          // Jalankan penyaringan filter cepat (Fast Search)
          final filteredOrders = rawOrders.where((o) {
            // Pencarian bebas berdasarkan ID, Customer atau Produk
            final macthesSearch = o.idOrder.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                o.namaCustomer.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                o.namaProduk.toLowerCase().contains(_searchQuery.toLowerCase());

            if (!macthesSearch) return false;

            // Pencarian berdasarkan Workstation yang aktif saat ini di rute
            if (_selectedWorkstationFilter != 'Semua') {
              if (o.statusRuteSekarang < o.alurDivisi.length) {
                final curDiv = o.alurDivisi[o.statusRuteSekarang];
                final koordinat = QueueProvider.temukanDivisi(curDiv);
                
                if (koordinat == null) return false;
                
                if (_selectedWorkstationFilter == 'Blackpaint' && koordinat.workstation != 'Workstation Blackpaint') return false;
                if (_selectedWorkstationFilter == 'Reseller' && koordinat.workstation != 'Workstation Reseller') return false;
                if (_selectedWorkstationFilter == 'Folder' && koordinat.workstation != 'Workstation Folder') return false;
              } else {
                return false;
              }
            }
            return true;
          }).toList();

          // PENGURUTAN PRIORITAS MUTLAK (Booster paling atas, kemudian countdown jatuh tempo)
          filteredOrders.sort((a, b) {
            if (a.isBooster && !b.isBooster) return -1;
            if (!a.isBooster && b.isBooster) return 1;
            return a.datetimeDeadline.compareTo(b.datetimeDeadline);
          });

          return Column(
            children: [
              // Panel Pencarian dan Filter Cepat
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            decoration: const InputDecoration(
                              hintText: 'Cari Customer, ID Order, Produk...',
                              prefixIcon: Icon(Icons.search),
                              border: InputBorder.none,
                            ),
                            onChanged: (val) => setState(() => _searchQuery = val),
                          ),
                        ),
                        const SizedBox(width: 12),
                        DropdownButton<String>(
                          value: _selectedWorkstationFilter,
                          onChanged: (val) => setState(() => _selectedWorkstationFilter = val!),
                          items: const [
                            DropdownMenuItem(value: 'Semua', child: Text('Semua Workstation')),
                            DropdownMenuItem(value: 'Blackpaint', child: Text('Workstation Blackpaint')),
                            DropdownMenuItem(value: 'Reseller', child: Text('Workstation Reseller')),
                            DropdownMenuItem(value: 'Folder', child: Text('Workstation Folder')),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Monitor Utama List Antrean
              Expanded(
                child: filteredOrders.isEmpty
                    ? const Center(child: Text('Tidak ada rincian antrean terdeteksi.'))
                    : ListView.builder(
                        itemCount: filteredOrders.length,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        itemBuilder: (ctx, index) {
                          final order = filteredOrders[index];
                          
                          // Deteksi Urgensi Berwarna: Merah <2 jam, Kuning 2-5 jam, Hijau >5 jam
                          final level = CountdownUtils.getUrgency(order.datetimeDeadline);
                          final cardBg = CountdownUtils.getUrgencyBg(level);
                          final accent = CountdownUtils.getUrgencyColor(level);
                          final sisaWaktuStr = CountdownUtils.formatCountdown(order.datetimeDeadline);

                          // Posisi jalan di koordinat: [Workstation -> Divisi Aktif]
                          String koordinatWorkstation = 'Workstation Umum';
                          String divisiAktif = 'Tidak Terdeteksi';
                          if (order.statusRuteSekarang < order.alurDivisi.length) {
                            divisiAktif = order.alurDivisi[order.statusRuteSekarang];
                            final k = QueueProvider.temukanDivisi(divisiAktif);
                            if (k != null) {
                              koordinatWorkstation = k.workstation;
                            }
                          }

                          return Card(
                            color: const Color(0xFF0F172A), // Warna Slate Gelap Mewah
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color: order.statusKendala ? Colors.red : accent,
                                width: order.isBooster ? 2.0 : 1.0,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            order.idOrder,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Colors.blueGrey, fontSize: 14),
                                          ),
                                          const SizedBox(width: 8),
                                          if (order.isBooster)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                                              child: const Text('BOOSTER URGENT', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                            )
                                        ],
                                      ),
                                      // Countdown presisi
                                      Text(
                                        sisaWaktuStr,
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: accent, fontFamily: 'Calibri'),
                                      )
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  
                                  // Teks Berukuran Besar & Kontras Tinggi (Calibri)
                                  Text(
                                    order.namaCustomer,
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'Calibri'),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '\${order.namaProduk} - \${order.jumlah} Pcs',
                                    style: const TextStyle(fontSize: 16, color: Colors.grey, fontFamily: 'Calibri'),
                                  ),
                                  const Divider(height: 24, color: Colors.white24),

                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      // Visualisasi Koordinat [Nama Workstation -> Nama Divisi Aktif]
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('KOORDINAT ALUR PRODUKSI:', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                            const SizedBox(height: 2),
                                            Text(
                                              '[$koordinatWorkstation] ➔ $divisiAktif',
                                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: accent, overflow: TextOverflow.ellipsis),
                                            ),
                                          ],
                                        ),
                                      ),
                                      // Link File Desain Read-Only
                                      if (order.linkFileDesain.isNotEmpty)
                                        Row(
                                          children: [
                                            const Icon(Icons.link, color: Colors.blueAccent, size: 16),
                                            const SizedBox(width: 4),
                                            Text(
                                              'File Desain Siap',
                                              style: TextStyle(fontSize: 12, color: Colors.blue.shade400, decoration: TextDecoration.underline),
                                            )
                                          ],
                                        )
                                    ],
                                  ),

                                  if (order.statusKendala) ...[
                                    const SizedBox(height: 12),
                                    Container(
                                      color: Colors.red.withOpacity(0.2),
                                      padding: const EdgeInsets.all(8),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.error_outline, color: Colors.red),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'KENDALA AKTIF: [\${order.jenisKendala}] - Tim Operasional Sedang Menangani.',
                                              style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                                            ),
                                          )
                                        ],
                                      ),
                                    )
                                  ]
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              )
            ],
          );
        },
      ),
    );
  }
}
`
  }
];
