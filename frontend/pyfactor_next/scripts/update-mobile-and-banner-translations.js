const fs = require('fs');
const path = require('path');

// Updated mobile landing translations (changed hero title)
const mobileHeroUpdate = {
  "title": "Dott: Global Business Platform"
  // Removed subtitle as it's no longer needed
};

// Smart banner translations for all 30 languages
const smartBannerTranslations = {
  en: {
    title: "Dott: Global Business Platform",
    ios: "Available on your home screen",
    android: "Install for quick access",
    tap: "Tap",
    then: "then",
    addToHome: "Add to Home",
    install: "Install"
  },
  es: {
    title: "Dott: Plataforma Empresarial Global",
    ios: "Disponible en tu pantalla de inicio",
    android: "Instalar para acceso rápido",
    tap: "Toca",
    then: "luego",
    addToHome: "Añadir a inicio",
    install: "Instalar"
  },
  fr: {
    title: "Dott : Plateforme d'Affaires Mondiale",
    ios: "Disponible sur votre écran d'accueil",
    android: "Installer pour un accès rapide",
    tap: "Appuyez",
    then: "puis",
    addToHome: "Ajouter à l'accueil",
    install: "Installer"
  },
  de: {
    title: "Dott: Globale Geschäftsplattform",
    ios: "Auf Ihrem Startbildschirm verfügbar",
    android: "Für schnellen Zugriff installieren",
    tap: "Tippen",
    then: "dann",
    addToHome: "Zum Startbildschirm",
    install: "Installieren"
  },
  pt: {
    title: "Dott: Plataforma de Negócios Global",
    ios: "Disponível na sua tela inicial",
    android: "Instalar para acesso rápido",
    tap: "Toque",
    then: "depois",
    addToHome: "Adicionar à tela inicial",
    install: "Instalar"
  },
  nl: {
    title: "Dott: Wereldwijd Bedrijfsplatform",
    ios: "Beschikbaar op je startscherm",
    android: "Installeer voor snelle toegang",
    tap: "Tik",
    then: "dan",
    addToHome: "Toevoegen aan startscherm",
    install: "Installeren"
  },
  ru: {
    title: "Dott: Глобальная Бизнес Платформа",
    ios: "Доступно на главном экране",
    android: "Установите для быстрого доступа",
    tap: "Нажмите",
    then: "затем",
    addToHome: "Добавить на главный экран",
    install: "Установить"
  },
  zh: {
    title: "Dott：全球商业平台",
    ios: "可在您的主屏幕上使用",
    android: "安装以快速访问",
    tap: "点击",
    then: "然后",
    addToHome: "添加到主屏幕",
    install: "安装"
  },
  ja: {
    title: "Dott：グローバルビジネスプラットフォーム",
    ios: "ホーム画面で利用可能",
    android: "クイックアクセスのためにインストール",
    tap: "タップ",
    then: "次に",
    addToHome: "ホーム画面に追加",
    install: "インストール"
  },
  ko: {
    title: "Dott: 글로벌 비즈니스 플랫폼",
    ios: "홈 화면에서 사용 가능",
    android: "빠른 액세스를 위해 설치",
    tap: "탭",
    then: "그런 다음",
    addToHome: "홈 화면에 추가",
    install: "설치"
  },
  ar: {
    title: "Dott: منصة الأعمال العالمية",
    ios: "متاح على شاشتك الرئيسية",
    android: "التثبيت للوصول السريع",
    tap: "اضغط",
    then: "ثم",
    addToHome: "إضافة إلى الشاشة الرئيسية",
    install: "تثبيت"
  },
  hi: {
    title: "Dott: वैश्विक व्यापार मंच",
    ios: "आपकी होम स्क्रीन पर उपलब्ध",
    android: "त्वरित पहुंच के लिए इंस्टॉल करें",
    tap: "टैप करें",
    then: "फिर",
    addToHome: "होम में जोड़ें",
    install: "इंस्टॉल करें"
  },
  id: {
    title: "Dott: Platform Bisnis Global",
    ios: "Tersedia di layar beranda Anda",
    android: "Instal untuk akses cepat",
    tap: "Ketuk",
    then: "lalu",
    addToHome: "Tambahkan ke Beranda",
    install: "Instal"
  },
  vi: {
    title: "Dott: Nền Tảng Kinh Doanh Toàn Cầu",
    ios: "Có sẵn trên màn hình chính của bạn",
    android: "Cài đặt để truy cập nhanh",
    tap: "Nhấn",
    then: "sau đó",
    addToHome: "Thêm vào màn hình chính",
    install: "Cài đặt"
  },
  tr: {
    title: "Dott: Küresel İş Platformu",
    ios: "Ana ekranınızda mevcut",
    android: "Hızlı erişim için yükleyin",
    tap: "Dokun",
    then: "sonra",
    addToHome: "Ana Ekrana Ekle",
    install: "Yükle"
  },
  sw: {
    title: "Dott: Jukwaa la Biashara la Kimataifa",
    ios: "Inapatikana kwenye skrini yako ya nyumbani",
    android: "Sakinisha kwa ufikiaji wa haraka",
    tap: "Gusa",
    then: "kisha",
    addToHome: "Ongeza kwenye Skrini ya Nyumbani",
    install: "Sakinisha"
  },
  ha: {
    title: "Dott: Dandalin Kasuwanci na Duniya",
    ios: "Akwai a kan allo na gida",
    android: "Shigar don samun damar shiga da sauri",
    tap: "Danna",
    then: "sannan",
    addToHome: "Ƙara zuwa Gida",
    install: "Shigar"
  },
  am: {
    title: "Dott: ዓለም አቀፍ የንግድ መድረክ",
    ios: "በመነሻ ማያ ገጽዎ ላይ ይገኛል",
    android: "ለፈጣን መዳረሻ ይጫኑ",
    tap: "ይንኩ",
    then: "ከዚያ",
    addToHome: "ወደ መነሻ ያክሉ",
    install: "ጫን"
  },
  yo: {
    title: "Dott: Pépèle Iṣòwò Àgbáyé",
    ios: "Wa lori iboju ile rẹ",
    android: "Fi sori ẹrọ fun iraye si kiakia",
    tap: "Tẹ",
    then: "lẹhinna",
    addToHome: "Fi kun Ile",
    install: "Fi sori ẹrọ"
  },
  zu: {
    title: "Dott: Ipulatifomu Yebhizinisi Yomhlaba",
    ios: "Iyatholakala esikrinini sakho sasekhaya",
    android: "Faka ukuze ufinyelele ngokushesha",
    tap: "Thepha",
    then: "bese",
    addToHome: "Engeza Ekhaya",
    install: "Faka"
  },
  it: {
    title: "Dott: Piattaforma Aziendale Globale",
    ios: "Disponibile sulla tua schermata iniziale",
    android: "Installa per un accesso rapido",
    tap: "Tocca",
    then: "poi",
    addToHome: "Aggiungi a Home",
    install: "Installa"
  },
  pl: {
    title: "Dott: Globalna Platforma Biznesowa",
    ios: "Dostępne na ekranie głównym",
    android: "Zainstaluj dla szybkiego dostępu",
    tap: "Stuknij",
    then: "następnie",
    addToHome: "Dodaj do ekranu głównego",
    install: "Zainstaluj"
  },
  th: {
    title: "Dott: แพลตฟอร์มธุรกิจระดับโลก",
    ios: "พร้อมใช้งานบนหน้าจอหลักของคุณ",
    android: "ติดตั้งเพื่อเข้าถึงอย่างรวดเร็ว",
    tap: "แตะ",
    then: "จากนั้น",
    addToHome: "เพิ่มไปยังหน้าหลัก",
    install: "ติดตั้ง"
  },
  bn: {
    title: "Dott: বৈশ্বিক ব্যবসায়িক প্ল্যাটফর্ম",
    ios: "আপনার হোম স্ক্রিনে উপলব্ধ",
    android: "দ্রুত অ্যাক্সেসের জন্য ইনস্টল করুন",
    tap: "ট্যাপ করুন",
    then: "তারপর",
    addToHome: "হোমে যোগ করুন",
    install: "ইনস্টল করুন"
  },
  ur: {
    title: "Dott: عالمی کاروباری پلیٹ فارم",
    ios: "آپ کی ہوم اسکرین پر دستیاب",
    android: "فوری رسائی کے لیے انسٹال کریں",
    tap: "ٹیپ کریں",
    then: "پھر",
    addToHome: "ہوم میں شامل کریں",
    install: "انسٹال کریں"
  },
  tl: {
    title: "Dott: Pandaigdigang Platform ng Negosyo",
    ios: "Available sa iyong home screen",
    android: "I-install para sa mabilis na access",
    tap: "I-tap",
    then: "pagkatapos",
    addToHome: "Idagdag sa Home",
    install: "I-install"
  },
  uk: {
    title: "Dott: Глобальна Бізнес Платформа",
    ios: "Доступно на головному екрані",
    android: "Встановіть для швидкого доступу",
    tap: "Натисніть",
    then: "потім",
    addToHome: "Додати на головний екран",
    install: "Встановити"
  },
  fa: {
    title: "Dott: پلتفرم تجاری جهانی",
    ios: "در صفحه اصلی شما موجود است",
    android: "برای دسترسی سریع نصب کنید",
    tap: "ضربه بزنید",
    then: "سپس",
    addToHome: "افزودن به صفحه اصلی",
    install: "نصب"
  },
  sn: {
    title: "Dott: Global Business Platform",
    ios: "Iripo pane yako yepamusha peji",
    android: "Isa kuti uwane nekukurumidza",
    tap: "Baya",
    then: "wobva",
    addToHome: "Wedzera kuMusha",
    install: "Isa"
  },
  ig: {
    title: "Dott: Ikpo Azụmaahịa Ụwa",
    ios: "Dị na ihuenyo mbụ gị",
    android: "Tinye maka ịnweta ngwa ngwa",
    tap: "Kpatụ",
    then: "mgbe ahụ",
    addToHome: "Tinye na Ụlọ",
    install: "Tinye"
  }
};

// Languages to update
const languages = [
  'en', 'es', 'fr', 'de', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'id', 'vi', 'tr', 'sw', 'ha', 'am', 'yo', 'zu',
  'it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'
];

// Function to update a language file
function updateLanguageFile(langCode) {
  const filePath = path.join(__dirname, '..', 'public', 'locales', langCode, 'common.json');
  
  try {
    // Read existing file
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update mobile landing hero title
    if (content.mobileLanding && content.mobileLanding.hero) {
      content.mobileLanding.hero.title = mobileHeroUpdate.title;
      // Remove subtitle if it exists
      delete content.mobileLanding.hero.subtitle;
    }
    
    // Add smart banner translations
    content.smartBanner = smartBannerTranslations[langCode] || smartBannerTranslations.en;
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ Updated ${langCode}/common.json`);
  } catch (error) {
    console.error(`❌ Error updating ${langCode}/common.json:`, error.message);
  }
}

// Update all language files
console.log('🚀 Updating mobile hero and smart banner translations...\n');

languages.forEach(langCode => {
  updateLanguageFile(langCode);
});

console.log('\n✨ Done! All translations have been updated.');