# Programa Yeni Eklenenler (Changelog)

Son commit'ten itibaren Synapse VCS platformuna eklenen yeni özellikler ve hata düzeltmeleri:

---

## 🔵 Phase 3 — Dal Birleştirme (Branch Merge) Entegrasyonu

### 1. 3-Way Merge & Fast-Forward (C++ Engine)
* **Ortak Ata (LCA) Arama:** BFS ile commit geçmişi taranıp iki branch'in birleştiği en yakın ortak ata (merge base) bulunur.
* **Akıllı Birleştirme:** Ortak ata (`base`), aktif branch (`ours`) ve hedef branch (`theirs`) arasındaki dosya ağaçları karşılaştırılıp fast-forward veya 3-way merge otomatik gerçekleştirilir.
* **Çakışma (Conflict) Marker'ları:** Çakışma durumunda metin dosyalarına standart `<<<<<<< HEAD`, `=======`, `>>>>>>> <branch>` işaretçileri eklenir. Büyük/LFS binary dosyalar bozulmaması için otomatik pas geçilerek çakışma olarak raporlanır.
* **Çift Ata (Dual-Parent) Merge Commits:** Birleştirme sonrasında `.synapse/MERGE_HEAD` dosyasındaki ikinci ata commit bilgisi okunarak çoklu parent desteğine sahip gerçek bir merge commit'i oluşturulur.
* **Doğrusal Log Traversal:** `show_history` (synapse log) fonksiyonu, birleşen yan dal geçmişini ana dala karıştırmamak için yalnızca ilk ata (first-parent) üzerinden doğrusal ilerleyecek şekilde güncellendi.

### 2. Arayüz Entegrasyonu (Tauri GUI)
* **Merge Butonları:** Branch seçim dropdown menüsünde aktif olmayan dalların yanına bir "Merge" butonu yerleştirildi.
* **Çakışma Bildirimleri ve Yönetimi:** Merge sırasında çakışma oluşursa kullanıcıya uyarı gösterilir ve çakışan dosyalar staged/unstaged alanları yerine "Conflicts" başlığı altında listelenir.

---


## 🔴 P0 — Kritik Hata Düzeltmeleri & İyileştirmeler

### 1. Dosya Boyutu Sınırı ve UI Freeze Engelleme
* **Sorun:** 100MB+ gibi büyük dosyalar base64 encode edilip Tauri IPC üzerinden JS'e geçirilirken program tamamen kilitleniyordu (UI Freeze).
* **Çözüm:** Rust backend tarafında `read_local_file_as_base64` komutuna **50 MB** boyut limiti eklendi. Limit aşıldığında dosya okunmadan durdurulur ve frontend'e `"FILE_TOO_LARGE"` hatası döner.
* **Kullanıcı Deneyimi:** Frontend bu hatayı yakalar ve dosyanın boyutu ile birlikte "Büyük dosya önizlemesi devre dışı bırakıldı" uyarısını göstererek kilitlenmeleri tamamen engeller.

### 2. TGA Formatı Görsel Desteği
* **Sorun:** Tarayıcılar (Webview) yerel olarak `.tga` formatını render edemediği için TGA dosyaları önizlenemiyordu.
* **Çözüm:** Rust backend tarafına `image` crate entegre edildi. TGA dosyaları okunurken anında ve bellek içi (in-memory) olarak PNG formatına dönüştürülür ve base64 olarak frontend'e gönderilir.
* **Sonuç:** `.tga` uzantılı görseller artık `.png` veya `.jpg` gibi sorunsuz ve yüksek performanslı şekilde önizlenebiliyor.

### 3. GLB, GLTF ve OBJ 3D Model Önizleme Sistemi
* **Sorun:** `.glb` ve `.gltf` 3D dosyalar binary/LFS olarak algılanıyor ve görselleştirilemiyordu.
* **Çözüm:** Frontend'e **Three.js (WebGL)** entegre edildi.
* **Özellikler:**
  * Model otomatik olarak merkezlenir ve kamera açısı modelin boyutuna göre dinamik ayarlanır.
  * OrbitControls ile fareyle sürükleyerek 360 derece döndürme, sağ tıkla kaydırma (pan) ve kaydırma tekerleğiyle yakınlaştırma (zoom).
  * **Animasyon Desteği:** GLB/GLTF içindeki gömülü animasyonları listeleyen bir dropdown, Oynat/Durdur butonu ve oynatma hızı ayarı (0.25x - 2.0x).
  * **İstatistik Barı:** Modelin toplam Vertex (nokta) ve Triangle (üçgen) sayısı ile animasyon sayısı dinamik taranarak alt bilgi barında gösterilir.
  * **OBJ Desteği:** OBJ formatındaki dosyalar da metin tabanlı okunup WebGL sahnesine yüklenir.

---

## 🟡 P1 — Yeni Özellikler

### 4. Custom Ignore Preset Templates (Kişiselleştirilmiş Şablonlar)
* **Özellik:** Önceden tanımlı şablonlara (Unreal, Unity, Godot vb.) ek olarak, kullanıcıların kendi `.synapseignore` şablonlarını oluşturabilmesi sağlandı.
* **Yönetim Paneli:** Ayarlar (Settings) sekmesine "Custom Ignore Presets" kartı eklendi:
  * Kullanıcı yeni şablon ismi girip oluşturabilir.
  * Mevcut editördeki kuralları "Save" butonu ile şablona kaydedebilir.
  * "Edit" butonu ile şablonu düzenleyebilir veya "Trash" ikonu ile silebilir.
* **Repository Başlatma:** Yeni bir klasör açılırken / initialize edilirken bu custom şablonlar şablon listesinde listelenir ve otomatik başlatmada `.synapseignore` içerisine yazılır. Veriler `localStorage` üzerinde kalıcı olarak saklanır.

### 5. `synapse diff` CLI Komutu (C++ Engine)
* **Özellik:** Motor çekirdeğine bağımsız, hızlı ve ANSI renklendirmeli bir `diff` komutu eklendi.
* **Nasıl Çalışır:**
  * `.synapse/index` dosyasını okuyarak staged dosyaları belirler.
  * Disk üzerindeki yerel dosyalarla staged dosyaları karşılaştırır.
  * Değişiklik varsa, staged blob nesnesini decompress edip satır satır LCS (Longest Common Subsequence) diff algoritmasından geçirir.
  * **Binary / LFS Koruması:** Binary formatındaki (LFS) dosyaların içeriğini terminale basmak yerine "Binary files differ" uyarısı verir.
  * **ANSI Renklendirme:** Eklenen satırlar yeşil (`+`), silinen satırlar kırmızı (`-`) ve dosya başlıkları kalın/beyaz renkle terminalde gösterilir.
* **Kullanım:**
  * `synapse diff` (Tüm unstaged değişiklikleri gösterir)
  * `synapse diff <dosya_yolu>` (Sadece belirtilen dosyadaki değişiklikleri gösterir)

---

## 🟢 P2 — Altyapı ve Performans Geliştirmeleri

* **Genişletilmiş Glob Eşleşmesi:** `.synapseignore` içinde `*.sln`, `Binaries/` veya `Build/*.pdb` gibi karmaşık glob desenleri ve klasör yoksayma kuralları C++ motoruna entegre edildi.
* **Genişletilmiş LFS Desteği:** 3D model formatları (`.fbx`, `.obj`, `.blend`, `.glb`, `.gltf`), ses/video dosyaları, sıkıştırılmış arşivler ve derlenmiş binary formatları LFS (Large File Storage) kapsamına alınarak büyük dosyaların VCS'i yavaşlatması önlendi.
* **Shader Önizleyici:** `.hlsl`, `.glsl`, `.shader`, `.metal` vb. shader dosyaları için VS Code karanlık temasına uygun, satır numaralı ve renklendirilmiş bir ShaderPreview bileşeni eklendi.
