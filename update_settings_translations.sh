#!/bin/bash

# Swahili
cat > /tmp/sw_update.txt << 'EOF'
  "whatsapp": {
    "title": "Mipangilio ya WhatsApp",
    "businessAccount": "Akaunti ya WhatsApp Business",
    "phoneNumber": "Nambari ya Simu",
    "displayName": "Jina la Kuonyesha",
    "businessDescription": "Maelezo ya Biashara",
    "businessHours": "Masaa ya Biashara",
    "awayMessage": "Ujumbe wa Kutokuwepo",
    "greetingMessage": "Ujumbe wa Salamu",
    "quickReplies": "Majibu ya Haraka",
    "catalogSync": "Ulandanishi wa Katalogi",
    "paymentEnabled": "Wezesha Malipo",
    "showCommerce": "Onyesha Menyu ya WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Simamia watumiaji na ruhusa",
    "description": "Ongeza, hariri na simamia ufikiaji wa watumiaji"
  },
  "bankConnections": {
    "title": "Unganisha akaunti zako za benki",
    "description": "Unganisha akaunti za benki kwa upatanishi wa kiotomatiki"
  },
  "messages": {
EOF

# Hindi
cat > /tmp/hi_update.txt << 'EOF'
  "whatsapp": {
    "title": "व्हाट्सएप सेटिंग्स",
    "businessAccount": "व्हाट्सएप बिजनेस खाता",
    "phoneNumber": "फोन नंबर",
    "displayName": "प्रदर्शित नाम",
    "businessDescription": "व्यवसाय विवरण",
    "businessHours": "व्यावसायिक घंटे",
    "awayMessage": "अनुपस्थिति संदेश",
    "greetingMessage": "स्वागत संदेश",
    "quickReplies": "त्वरित उत्तर",
    "catalogSync": "कैटलॉग सिंक",
    "paymentEnabled": "भुगतान सक्षम करें",
    "showCommerce": "व्हाट्सएप कॉमर्स मेनू दिखाएं"
  },
  "userManagement": {
    "title": "उपयोगकर्ताओं और अनुमतियों का प्रबंधन करें",
    "description": "उपयोगकर्ता एक्सेस जोड़ें, संपादित करें और प्रबंधित करें"
  },
  "bankConnections": {
    "title": "अपने बैंक खाते कनेक्ट करें",
    "description": "स्वचालित मिलान के लिए बैंक खाते लिंक करें"
  },
  "messages": {
EOF

# Indonesian
cat > /tmp/id_update.txt << 'EOF'
  "whatsapp": {
    "title": "Pengaturan WhatsApp",
    "businessAccount": "Akun WhatsApp Business",
    "phoneNumber": "Nomor Telepon",
    "displayName": "Nama Tampilan",
    "businessDescription": "Deskripsi Bisnis",
    "businessHours": "Jam Operasional",
    "awayMessage": "Pesan Tidak Tersedia",
    "greetingMessage": "Pesan Sapaan",
    "quickReplies": "Balasan Cepat",
    "catalogSync": "Sinkronisasi Katalog",
    "paymentEnabled": "Aktifkan Pembayaran",
    "showCommerce": "Tampilkan Menu WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Kelola pengguna dan izin",
    "description": "Tambah, edit, dan kelola akses pengguna"
  },
  "bankConnections": {
    "title": "Hubungkan rekening bank Anda",
    "description": "Tautkan rekening bank untuk rekonsiliasi otomatis"
  },
  "messages": {
EOF

# Vietnamese
cat > /tmp/vi_update.txt << 'EOF'
  "whatsapp": {
    "title": "Cài đặt WhatsApp",
    "businessAccount": "Tài khoản WhatsApp Business",
    "phoneNumber": "Số điện thoại",
    "displayName": "Tên hiển thị",
    "businessDescription": "Mô tả doanh nghiệp",
    "businessHours": "Giờ làm việc",
    "awayMessage": "Tin nhắn khi vắng mặt",
    "greetingMessage": "Tin nhắn chào mừng",
    "quickReplies": "Trả lời nhanh",
    "catalogSync": "Đồng bộ danh mục",
    "paymentEnabled": "Bật thanh toán",
    "showCommerce": "Hiển thị menu WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Quản lý người dùng và quyền hạn",
    "description": "Thêm, chỉnh sửa và quản lý quyền truy cập người dùng"
  },
  "bankConnections": {
    "title": "Kết nối tài khoản ngân hàng của bạn",
    "description": "Liên kết tài khoản ngân hàng để đối chiếu tự động"
  },
  "messages": {
EOF

# Japanese
cat > /tmp/ja_update.txt << 'EOF'
  "whatsapp": {
    "title": "WhatsApp設定",
    "businessAccount": "WhatsAppビジネスアカウント",
    "phoneNumber": "電話番号",
    "displayName": "表示名",
    "businessDescription": "事業説明",
    "businessHours": "営業時間",
    "awayMessage": "不在メッセージ",
    "greetingMessage": "挨拶メッセージ",
    "quickReplies": "クイック返信",
    "catalogSync": "カタログ同期",
    "paymentEnabled": "支払いを有効化",
    "showCommerce": "WhatsAppコマースメニューを表示"
  },
  "userManagement": {
    "title": "ユーザーと権限を管理",
    "description": "ユーザーアクセスを追加、編集、管理"
  },
  "bankConnections": {
    "title": "銀行口座を接続",
    "description": "自動照合のために銀行口座をリンク"
  },
  "messages": {
EOF

# Korean
cat > /tmp/ko_update.txt << 'EOF'
  "whatsapp": {
    "title": "WhatsApp 설정",
    "businessAccount": "WhatsApp Business 계정",
    "phoneNumber": "전화번호",
    "displayName": "표시 이름",
    "businessDescription": "사업 설명",
    "businessHours": "영업 시간",
    "awayMessage": "부재중 메시지",
    "greetingMessage": "인사 메시지",
    "quickReplies": "빠른 답장",
    "catalogSync": "카탈로그 동기화",
    "paymentEnabled": "결제 활성화",
    "showCommerce": "WhatsApp Commerce 메뉴 표시"
  },
  "userManagement": {
    "title": "사용자 및 권한 관리",
    "description": "사용자 액세스 추가, 편집 및 관리"
  },
  "bankConnections": {
    "title": "은행 계좌 연결",
    "description": "자동 조정을 위한 은행 계좌 연결"
  },
  "messages": {
EOF

# Dutch
cat > /tmp/nl_update.txt << 'EOF'
  "whatsapp": {
    "title": "WhatsApp-instellingen",
    "businessAccount": "WhatsApp Business-account",
    "phoneNumber": "Telefoonnummer",
    "displayName": "Weergavenaam",
    "businessDescription": "Bedrijfsomschrijving",
    "businessHours": "Openingstijden",
    "awayMessage": "Afwezigheidsbericht",
    "greetingMessage": "Welkomstbericht",
    "quickReplies": "Snelle antwoorden",
    "catalogSync": "Catalogussynchronisatie",
    "paymentEnabled": "Betalingen inschakelen",
    "showCommerce": "WhatsApp Commerce-menu tonen"
  },
  "userManagement": {
    "title": "Gebruikers en machtigingen beheren",
    "description": "Toevoegen, bewerken en beheren van gebruikerstoegang"
  },
  "bankConnections": {
    "title": "Verbind uw bankrekeningen",
    "description": "Koppel bankrekeningen voor automatische afstemming"
  },
  "messages": {
EOF

# Russian
cat > /tmp/ru_update.txt << 'EOF'
  "whatsapp": {
    "title": "Настройки WhatsApp",
    "businessAccount": "Бизнес-аккаунт WhatsApp",
    "phoneNumber": "Номер телефона",
    "displayName": "Отображаемое имя",
    "businessDescription": "Описание бизнеса",
    "businessHours": "Часы работы",
    "awayMessage": "Сообщение об отсутствии",
    "greetingMessage": "Приветственное сообщение",
    "quickReplies": "Быстрые ответы",
    "catalogSync": "Синхронизация каталога",
    "paymentEnabled": "Включить платежи",
    "showCommerce": "Показать меню WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Управление пользователями и разрешениями",
    "description": "Добавление, редактирование и управление доступом пользователей"
  },
  "bankConnections": {
    "title": "Подключите свои банковские счета",
    "description": "Привяжите банковские счета для автоматической сверки"
  },
  "messages": {
EOF

# Turkish
cat > /tmp/tr_update.txt << 'EOF'
  "whatsapp": {
    "title": "WhatsApp Ayarları",
    "businessAccount": "WhatsApp Business Hesabı",
    "phoneNumber": "Telefon Numarası",
    "displayName": "Görünen Ad",
    "businessDescription": "İşletme Açıklaması",
    "businessHours": "Çalışma Saatleri",
    "awayMessage": "Uzakta Mesajı",
    "greetingMessage": "Karşılama Mesajı",
    "quickReplies": "Hızlı Yanıtlar",
    "catalogSync": "Katalog Senkronizasyonu",
    "paymentEnabled": "Ödemeleri Etkinleştir",
    "showCommerce": "WhatsApp Commerce Menüsünü Göster"
  },
  "userManagement": {
    "title": "Kullanıcıları ve izinleri yönet",
    "description": "Kullanıcı erişimini ekle, düzenle ve yönet"
  },
  "bankConnections": {
    "title": "Banka hesaplarınızı bağlayın",
    "description": "Otomatik mutabakat için banka hesaplarını bağlayın"
  },
  "messages": {
EOF

# Hausa
cat > /tmp/ha_update.txt << 'EOF'
  "whatsapp": {
    "title": "Saitunan WhatsApp",
    "businessAccount": "Asusun WhatsApp Business",
    "phoneNumber": "Lambar waya",
    "displayName": "Sunan nuni",
    "businessDescription": "Bayanin kasuwanci",
    "businessHours": "Lokutan kasuwanci",
    "awayMessage": "Saƙon rashin samuwa",
    "greetingMessage": "Saƙon maraba",
    "quickReplies": "Amsoshi masu sauri",
    "catalogSync": "Haɗin katalogi",
    "paymentEnabled": "Kunna biyan kuɗi",
    "showCommerce": "Nuna menu na WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Gudanar da masu amfani da izini",
    "description": "Ƙara, gyara, da gudanar da damar masu amfani"
  },
  "bankConnections": {
    "title": "Haɗa asusun bankin ku",
    "description": "Haɗa asusun banki don daidaitawa ta atomatik"
  },
  "messages": {
EOF

# Yoruba
cat > /tmp/yo_update.txt << 'EOF'
  "whatsapp": {
    "title": "Àwọn Ètò WhatsApp",
    "businessAccount": "Àkọọ́lẹ̀ WhatsApp Business",
    "phoneNumber": "Nọ́mbà Fóònù",
    "displayName": "Orúkọ Ìfihàn",
    "businessDescription": "Àpèjúwe Iṣẹ́",
    "businessHours": "Wákàtí Iṣẹ́",
    "awayMessage": "Ìránṣẹ́ Àìsí",
    "greetingMessage": "Ìránṣẹ́ Ìkíni",
    "quickReplies": "Àwọn Ìdáhùn Kíákíá",
    "catalogSync": "Ìbámu Kátálọ́ọ̀gì",
    "paymentEnabled": "Tan Ìsanwó",
    "showCommerce": "Fi Mẹ́nù WhatsApp Commerce Hàn"
  },
  "userManagement": {
    "title": "Ṣakoso awọn olumulo ati awọn igbanilaaye",
    "description": "Ṣafikun, ṣatunkọ, ati ṣakoso iraye si awọn olumulo"
  },
  "bankConnections": {
    "title": "So awọn akaunti banki rẹ pọ",
    "description": "So awọn akaunti banki pọ fun isọdọkan laifọwọyi"
  },
  "messages": {
EOF

# Amharic
cat > /tmp/am_update.txt << 'EOF'
  "whatsapp": {
    "title": "የዋትስአፕ ቅንብሮች",
    "businessAccount": "ዋትስአፕ ቢዝነስ መለያ",
    "phoneNumber": "ስልክ ቁጥር",
    "displayName": "የማሳያ ስም",
    "businessDescription": "የንግድ መግለጫ",
    "businessHours": "የስራ ሰዓቶች",
    "awayMessage": "የርቀት መልእክት",
    "greetingMessage": "የሰላምታ መልእክት",
    "quickReplies": "ፈጣን ምላሾች",
    "catalogSync": "የካታሎግ ማመሳሰል",
    "paymentEnabled": "ክፍያ አንቃ",
    "showCommerce": "የዋትስአፕ ንግድ ሜኑ አሳይ"
  },
  "userManagement": {
    "title": "ተጠቃሚዎችን እና ፈቃዶችን ያስተዳድሩ",
    "description": "የተጠቃሚ መዳረሻን ያክሉ፣ ያርትዑ እና ያስተዳድሩ"
  },
  "bankConnections": {
    "title": "የባንክ ሂሳቦችዎን ያገናኙ",
    "description": "ለራስ-ሰር ማስታረቅ የባንክ ሂሳቦችን ያገናኙ"
  },
  "messages": {
EOF

# Zulu
cat > /tmp/zu_update.txt << 'EOF'
  "whatsapp": {
    "title": "Izilungiselelo Ze-WhatsApp",
    "businessAccount": "I-akhawunti Ye-WhatsApp Business",
    "phoneNumber": "Inombolo Yocingo",
    "displayName": "Igama Elibonisiwe",
    "businessDescription": "Incazelo Yebhizinisi",
    "businessHours": "Amahora Ebhizinisi",
    "awayMessage": "Umyalezo Wokungabikho",
    "greetingMessage": "Umyalezo Wokubingela",
    "quickReplies": "Izimpendulo Ezisheshayo",
    "catalogSync": "Ukuvumelanisa Ikhathalogu",
    "paymentEnabled": "Vula Izinkokhelo",
    "showCommerce": "Bonisa Imenyu Ye-WhatsApp Commerce"
  },
  "userManagement": {
    "title": "Phatha abasebenzisi nemvume",
    "description": "Engeza, hlela, uphath ukufinyelela kwabasebenzisi"
  },
  "bankConnections": {
    "title": "Xhuma ama-akhawunti akho asebhange",
    "description": "Xhuma ama-akhawunti asebhange ukuze kuvumelane ngokuzenzakalela"
  },
  "messages": {
EOF

echo "Script created to update settings translations"