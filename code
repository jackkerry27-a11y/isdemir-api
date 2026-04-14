import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('tr_TR', null);
  runApp(const IsdemirOPSApp());
}

// --- TÜM NİSAN AYI YEMEK VERİLERİ ---
final Map<int, Map<String, List<String>>> nisanFullMenu = {
  1: {"ana": ["Etli Bezelye", "Pirinç Pilavı"], "kah": ["Yumurta", "Peynir", "Zeytin"], "ek": ["Mercimek Çorba", "Cacık", "Salata"]},
  2: {"ana": ["İzmir Köfte", "Bulgur Pilavı"], "kah": ["Omlet", "Kaşar", "Zeytin"], "ek": ["Tarhana", "Meyve", "Çoban Salata"]},
  3: {"ana": ["Fırın Tavuk", "Pirinç Pilavı"], "kah": ["Patates Kızartması", "Peynir"], "ek": ["Ezogelin", "Yoğurt", "Mevsim Salata"]},
  4: {"ana": ["Ispanak", "Makarna"], "kah": ["Sahanda Yumurta", "Peynir"], "ek": ["Şehriye Çorba", "Yoğurt", "Salata"]},
  5: {"ana": ["Tavuk Döner", "Pirinç Pilavı"], "kah": ["Menemen", "Zeytin", "Pekmez"], "ek": ["Domates Çorba", "Ayran", "Mevsim Salata"]},
  6: {"ana": ["Kuru Fasulye", "Pirinç Pilavı"], "kah": ["Haşlanmış Yumurta", "Bal"], "ek": ["Yayla Çorba", "Turşu", "Salata"]},
  7: {"ana": ["Orman Kebabı", "Bulgur Pilavı"], "kah": ["Sucuklu Yumurta", "Kaşar"], "ek": ["Sebze Çorba", "Tatlı", "Salata"]},
  8: {"ana": ["Tavuk Haşlama", "Pirinç Pilavı"], "kah": ["Peynir", "Zeytin", "Reçel"], "ek": ["Mercimek Çorba", "Cacık", "Mevsim Salata"]},
  9: {"ana": ["Kıymalı Bamya", "Makarna"], "kah": ["Yumurta", "Peynir", "Zeytin"], "ek": ["Ezogelin", "Meyve", "Yoğurt"]},
  10: {"ana": ["Tavuk Sote", "Bulgur Pilavı"], "kah": ["Sigara Böreği", "Peynir"], "ek": ["Tarhana Çorba", "Yoğurt", "Salata"]},
  11: {"ana": ["Etli Nohut", "Pirinç Pilavı"], "kah": ["Patatesli Yumurta", "Zeytin"], "ek": ["Domates Çorba", "Turşu", "Salata"]},
  12: {"ana": ["Kadınbudu Köfte", "Pirinç Pilavı"], "kah": ["Peynir", "Zeytin", "Bal"], "ek": ["Yayla Çorba", "Meyve", "Yoğurt"]},
  13: {"ana": ["Tavuk Baget", "Bulgur Pilavı"], "kah": ["Omlet", "Kaşar", "Zeytin"], "ek": ["Mercimek Çorba", "Salata", "Yoğurt"]},
  14: {"ana": ["Patlıcan Musakka", "Pirinç Pilavı"], "kah": ["Menemen", "Peynir"], "ek": ["Ezogelin", "Cacık", "Salata"]},
  15: {"ana": ["Taze Fasulye", "Bulgur Pilavı"], "kah": ["Yumurta", "Kaşar", "Bal"], "ek": ["Sebze Çorba", "Yoğurt", "Salata"]},
  16: {"ana": ["Tavuk Kavurma", "Pirinç Pilavı"], "kah": ["Sahanda Yumurta", "Zeytin"], "ek": ["Domates Çorba", "Ayran", "Salata"]},
  17: {"ana": ["Karnabahar", "Makarna"], "kah": ["Peynir", "Zeytin", "Reçel"], "ek": ["Yayla Çorba", "Meyve", "Yoğurt"]},
  18: {"ana": ["Fırın Köfte", "Pirinç Pilavı"], "kah": ["Sucuklu Yumurta", "Kaşar"], "ek": ["Tarhana", "Yoğurt", "Mevsim Salata"]},
  19: {"ana": ["Tavuk Şinitzel", "Bulgur Pilavı"], "kah": ["Omlet", "Peynir", "Zeytin"], "ek": ["Ezogelin", "Meyve", "Salata"]},
  20: {"ana": ["Etli Bezelye", "Pirinç Pilavı"], "kah": ["Yumurta", "Bal", "Peynir"], "ek": ["Mercimek Çorba", "Cacık", "Salata"]},
  21: {"ana": ["Tavuk Kanat", "Bulgur Pilavı"], "kah": ["Sigara Böreği", "Kaşar"], "ek": ["Sebze Çorba", "Ayran", "Mevsim Salata"]},
  22: {"ana": ["Etli Türlü", "Pirinç Pilavı"], "kah": ["Menemen", "Zeytin"], "ek": ["Domates Çorba", "Yoğurt", "Salata"]},
  23: {"ana": ["BAYRAM KEBABI", "Pirinç Pilavı"], "kah": ["Özel Bayram Kahvaltısı"], "ek": ["Mercimek Çorba", "Tatlı", "Mevsim Salata"]},
  24: {"ana": ["Tavuk Döner", "Bulgur Pilavı"], "kah": ["Omlet", "Kaşar", "Zeytin"], "ek": ["Yayla Çorba", "Ayran", "Salata"]},
  25: {"ana": ["İzmir Köfte", "Makarna"], "kah": ["Yumurta", "Peynir", "Zeytin"], "ek": ["Ezogelin", "Meyve", "Yoğurt"]},
  26: {"ana": ["Kuru Fasulye", "Pirinç Pilavı"], "kah": ["Patatesli Yumurta", "Bal"], "ek": ["Tarhana", "Turşu", "Salata"]},
  27: {"ana": ["Tavuk Baget", "Pirinç Pilavı"], "kah": ["Peynir", "Zeytin", "Reçel"], "ek": ["Mercimek Çorba", "Cacık", "Salata"]},
  28: {"ana": ["Kıymalı Bamya", "Bulgur Pilavı"], "kah": ["Yumurta", "Kaşar", "Zeytin"], "ek": ["Domates Çorba", "Yoğurt", "Salata"]},
  29: {"ana": ["Fırın Tavuk", "Pirinç Pilavı"], "kah": ["Sucuklu Yumurta", "Peynir"], "ek": ["Ezogelin", "Ayran", "Salata"]},
  30: {"ana": ["Etli Nohut", "Bulgur Pilavı"], "kah": ["Peynir", "Zeytin", "Bal"], "ek": ["Sebze Çorba", "Meyve", "Yoğurt"]},
};

class IsdemirOPSApp extends StatelessWidget {
  const IsdemirOPSApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF0A0A0A),
        fontFamily: 'Roboto',
      ),
      home: const LoginScreen(),
    );
  }
}

// --- 1. GİRİŞ EKRANI (COPPER & CYBER BLUE) ---
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _passCtrl = TextEditingController();
  void _login() {
    if (_passCtrl.text == "4896281aa") {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (c) => const RegisterScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            colors: [Color(0xFF1A1A1A), Color(0xFF000000)],
            radius: 1.5,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(40.0),
            child: Column(
              children: [
                const Text("İSDEMİR", style: TextStyle(color: Color(0xFFB8860B), fontSize: 40, fontWeight: FontWeight.w900, letterSpacing: 5)),
                const Text("SİSTEME GİRİŞ", style: TextStyle(color: Colors.white54, fontSize: 14, letterSpacing: 2)),
                const SizedBox(height: 50),
                // Merkezi Key İkonu
                Container(
                  width: 120, height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFB8860B), width: 2),
                    boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.2), blurRadius: 20, spreadRadius: 5)],
                  ),
                  child: const Center(child: Text("Key", style: TextStyle(color: Color(0xFFB8860B), fontSize: 24, fontWeight: FontWeight.bold))),
                ),
                const SizedBox(height: 60),
                TextField(
                  controller: _passCtrl,
                  obscureText: true,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.cyanAccent, letterSpacing: 8),
                  decoration: InputDecoration(
                    hintText: "Erişim Kodu",
                    hintStyle: const TextStyle(color: Colors.white24, letterSpacing: 1),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: const BorderSide(color: Colors.white10)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: const BorderSide(color: Colors.blue)),
                  ),
                ),
                const SizedBox(height: 40),
                _buildMetalBtn("GİRİŞ YAP", _login),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetalBtn(String label, VoidCallback on) {
    return GestureDetector(
      onTap: on,
      child: Container(
        width: double.infinity, height: 55,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: const LinearGradient(colors: [Color(0xFFB8860B), Color(0xFF8B4513)]),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 10, offset: const Offset(0, 5))],
        ),
        child: Center(child: Text(label, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16))),
      ),
    );
  }
}

// --- 2. KAYIT EKRANI ---
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  File? _img;
  String _job = 'Lashing Serdümen';
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("PROFIL OLUŞTUR", style: TextStyle(color: Color(0xFFB8860B), letterSpacing: 2)), backgroundColor: Colors.black, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(30),
        child: Column(
          children: [
            GestureDetector(
              onTap: () async {
                final p = await ImagePicker().pickImage(source: ImageSource.gallery);
                if (p != null) setState(() => _img = File(p.path));
              },
              child: Container(
                width: 140, height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle, 
                  border: Border.all(color: Colors.blue.withOpacity(0.5), width: 1),
                  boxShadow: [BoxShadow(color: Colors.blue.withOpacity(0.1), blurRadius: 15)],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(5.0),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFB8860B), width: 2),
                      image: _img != null ? DecorationImage(image: FileImage(_img!), fit: BoxFit.cover) : null,
                    ),
                    child: _img == null ? const Icon(Icons.add_a_photo, color: Color(0xFFB8860B), size: 40) : null,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Text("Profil Fotoğrafı Zorunludur!", style: TextStyle(color: Colors.redAccent, fontSize: 10)),
            const SizedBox(height: 40),
            _buildInput("SİCİL NUMARASI", Icons.badge),
            _buildInput("AD SOYAD", Icons.person),
            _buildInput("TELEFON NUMARASI", Icons.phone),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              value: _job,
              dropdownColor: const Color(0xFF141414),
              style: const TextStyle(color: Colors.white),
              items: ['Lashing Serdümen', 'Bakımcı', 'Liman İşçisi'].map((j) => DropdownMenuItem(value: j, child: Text(j))).toList(),
              onChanged: (v) => setState(() => _job = v!),
              decoration: _inputDecoration("MESLEK SEÇİNİZ", Icons.engineering),
            ),
            const SizedBox(height: 50),
            _buildActionBtn("DEVAM ET", () { if (_img != null) Navigator.pushReplacement(context, MaterialPageRoute(builder: (c) => MainMenu(img: _img!, job: _job))); }),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(String label, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: TextField(decoration: _inputDecoration(label, icon)),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label, labelStyle: const TextStyle(color: Colors.white24, fontSize: 12),
      prefixIcon: Icon(icon, color: const Color(0xFFB8860B), size: 20),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Colors.white10)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Colors.blue)),
    );
  }

  Widget _buildActionBtn(String label, VoidCallback on) {
    return GestureDetector(
      onTap: on,
      child: Container(
        width: double.infinity, height: 55,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15),
          gradient: const LinearGradient(colors: [Color(0xFFB8860B), Color(0xFF8B4513)]),
        ),
        child: Center(child: Text(label, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold))),
      ),
    );
  }
}

// --- 3. ANA MENÜ (PREMIUM PANEL) ---
class MainMenu extends StatefulWidget {
  final File img;
  final String job;
  const MainMenu({super.key, required this.img, required this.job});
  @override
  State<MainMenu> createState() => _MainMenuState();
}

class _MainMenuState extends State<MainMenu> with TickerProviderStateMixin {
  int _idx = 0;
  double netMaas = 40500.0, ikramiye = 0.0;
  Set<int> normalDays = {}, bayramDays = {};
  late Timer _timer;
  late AnimationController _anim;
  String _time = "", _date = "";

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) => _update());
    _update();
    _anim = AnimationController(duration: const Duration(seconds: 4), vsync: this)..repeat();
  }

  void _update() {
    final now = DateTime.now();
    setState(() {
      _time = DateFormat('HH:mm').format(now);
      _date = DateFormat('EEEE, d MMMM', 'tr_TR').format(now);
    });
  }

  @override
  void dispose() { _timer.cancel(); _anim.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    double total = netMaas + (normalDays.length * 946) + (bayramDays.length * 2366) + ikramiye;

    return Scaffold(
      body: SafeArea(
        child: IndexedStack(index: _idx, children: [
          _buildPanel(total),
          const Center(child: Text("Kişiler Ekranı", style: TextStyle(color: Colors.white))),
          _buildMaas(total),
          const Center(child: Text("Galeri Ekranı", style: TextStyle(color: Colors.white))),
          const Center(child: Text("Gemi Ekranı", style: TextStyle(color: Colors.white))),
        ]),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _idx, onTap: (i) => setState(() => _idx = i),
        backgroundColor: Colors.black, selectedItemColor: const Color(0xFFB8860B), unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.grid_view), label: "Panel"),
          BottomNavigationBarItem(icon: Icon(Icons.people), label: "Kişiler"),
          BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: "Maaş"),
          BottomNavigationBarItem(icon: Icon(Icons.photo), label: "Galeri"),
          BottomNavigationBarItem(icon: Icon(Icons.anchor), label: "Gemi"),
        ],
      ),
    );
  }

  Widget _buildPanel(double total) {
    int day = DateTime.now().day;
    var menu = nisanFullMenu[day] ?? {"ana": ["Menü Yok"], "kah": ["Yok"], "ek": ["Yok"]};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(15),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text("İsdemir OPS", style: TextStyle(color: Color(0xFFB8860B), fontSize: 26, fontWeight: FontWeight.bold)),
          _buildLiveClock(),
        ]),
        const SizedBox(height: 20),
        _buildAnimatedProfile(),
        const SizedBox(height: 20),
        _buildFoodCard(day, menu),
        const SizedBox(height: 20),
        _buildHakedisSummary(total),
      ]),
    );
  }

  Widget _buildLiveClock() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: const Color(0xFF141414), borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.white10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(_time, style: const TextStyle(color: Color(0xFFB8860B), fontSize: 20, fontWeight: FontWeight.bold)),
        Text(_date, style: const TextStyle(color: Colors.grey, fontSize: 10)),
      ]),
    );
  }

  Widget _buildAnimatedProfile() {
    return AnimatedBuilder(
      animation: _anim, builder: (c, w) => Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(30), gradient: SweepGradient(colors: const [Colors.blue, Colors.black, Colors.blue, Colors.black], transform: GradientRotation(_anim.value * 6.28))),
        child: Container(
          width: double.infinity, padding: const EdgeInsets.all(25), 
          decoration: BoxDecoration(color: const Color(0xFF051505), borderRadius: BorderRadius.circular(28)), 
          child: Column(children: [
            CircleAvatar(radius: 55, backgroundImage: FileImage(widget.img)), 
            const SizedBox(height: 10), 
            const Text("ALAATTİN GÜL", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)), 
            const SizedBox(height: 10), 
            Container(padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8), decoration: BoxDecoration(color: const Color(0xFF0D2D0D), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.green)), child: Text(widget.job, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)))
          ])
        )
      )
    );
  }

  Widget _buildFoodCard(int day, dynamic menu) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: const Color(0xFF141414), borderRadius: BorderRadius.circular(25), border: Border.all(color: Colors.white10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text("GÜNÜN MENÜSÜ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)), Text("$day Nisan", style: const TextStyle(color: Color(0xFFB8860B)))]),
        const Divider(color: Colors.white10, height: 25),
        _foodItem("KAHVALTI", menu["kah"], Colors.orangeAccent),
        const SizedBox(height: 12),
        _foodItem("ÖĞLE / AKŞAM", menu["ana"], Colors.blueAccent),
        const SizedBox(height: 12),
        _foodItem("SALATA / EK", menu["ek"], Colors.greenAccent),
      ]),
    );
  }

  Widget _foodItem(String label, List<String> items, Color color) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
      const SizedBox(height: 4),
      Text(items.join(" • "), style: const TextStyle(color: Colors.white70, fontSize: 14)),
    ]);
  }

  Widget _buildHakedisSummary(double total) {
    return Container(
      width: double.infinity, padding: const EdgeInsets.all(25), 
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF141414), Color(0xFF000000)]),
        borderRadius: BorderRadius.circular(25), 
        border: Border.all(color: Colors.white10)
      ), 
      child: Column(children: [
        const Text("GÜNCEL HAKEDİŞ", style: TextStyle(color: Colors.white38, letterSpacing: 2, fontSize: 12)), 
        const SizedBox(height: 10),
        Text("₺ ${NumberFormat('#,###', 'tr_TR').format(total)}", style: const TextStyle(color: Color(0xFFB8860B), fontSize: 45, fontWeight: FontWeight.w900))
      ])
    );
  }

  Widget _buildMaas(double total) {
    return SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text("Hakediş Analizi", style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
      const SizedBox(height: 20),
      _analizCard(total),
      const SizedBox(height: 20),
      _ikramiyeField(),
      const SizedBox(height: 30),
      _gridLabel("Normal Mesai (946 ₺/gün)", Colors.orangeAccent),
      _buildDayGrid(30, normalDays, Colors.orangeAccent),
      const SizedBox(height: 30),
      _gridLabel("Bayram/Pazar (2366 ₺/gün)", Colors.redAccent),
      _buildDayGrid(7, bayramDays, Colors.redAccent),
    ]));
  }

  Widget _analizCard(double t) {
    return Container(
      padding: const EdgeInsets.all(25), 
      decoration: BoxDecoration(color: const Color(0xFF141414), borderRadius: BorderRadius.circular(30), border: Border.all(color: const Color(0xFFB8860B).withOpacity(0.3))), 
      child: Column(children: [
        const Text("TOPLAM HAKEDİŞ", style: TextStyle(color: Colors.white38)), 
        Text("${NumberFormat('#,###', 'tr_TR').format(t.toInt())} ₺", style: const TextStyle(color: Color(0xFFB8860B), fontSize: 48, fontWeight: FontWeight.w900))
      ])
    );
  }

  Widget _ikramiyeField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20), 
      decoration: BoxDecoration(color: const Color(0xFF141414), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white10)), 
      child: TextField(
        onChanged: (v) => setState(() => ikramiye = double.tryParse(v) ?? 0), 
        style: const TextStyle(color: Colors.white), 
        decoration: const InputDecoration(icon: Icon(Icons.card_giftcard, color: Colors.purpleAccent), hintText: "İkramiye ekle (₺)", border: InputBorder.none, hintStyle: TextStyle(color: Colors.white12))
      )
    );
  }

  Widget _gridLabel(String t, Color c) { 
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: Row(children: [Container(width: 4, height: 20, color: c), const SizedBox(width: 10), Text(t, style: TextStyle(color: c, fontWeight: FontWeight.bold, fontSize: 16))]),
    ); 
  }

  Widget _buildDayGrid(int count, Set<int> set, Color color) {
    return GridView.builder(
      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), 
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 6, mainAxisSpacing: 10, crossAxisSpacing: 10), 
      itemCount: count, 
      itemBuilder: (ctx, i) {
        int d = i + 1; bool active = set.contains(d);
        return GestureDetector(
          onTap: () => setState(() => active ? set.remove(d) : set.add(d)), 
          child: Container(
            alignment: Alignment.center, 
            decoration: BoxDecoration(color: active ? color : const Color(0xFF1C1C1E), borderRadius: BorderRadius.circular(15), border: Border.all(color: active ? Colors.white24 : Colors.transparent)), 
            child: Text("$d", style: TextStyle(color: active ? Colors.black : Colors.white54, fontWeight: FontWeight.bold))
          )
        );
      }
    );
  }
}
