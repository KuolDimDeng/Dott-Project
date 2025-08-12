const fs = require('fs');
const path = require('path');

// Additional translations for missing English text
const additionalTranslations = {
  en: {
    // Financial Management section
    "feature.invoicing.highlight1": "Recurring invoices",
    "feature.invoicing.highlight2": "Payment reminders",
    "feature.invoicing.highlight3": "Invoice factoring",
    "feature.reporting.highlight1": "Custom dashboards",
    "feature.reporting.highlight2": "Profit analysis",
    "feature.reporting.highlight3": "Cash flow forecasting",
    
    // Global Business Tools section
    "feature.payments.highlight1": "Mobile money",
    "feature.payments.highlight2": "Bank transfers",
    "feature.payments.highlight3": "Digital wallets",
    
    // Enterprise Security section
    "feature.security.highlight1": "SOC2 compliant",
    "feature.security.highlight2": "Data encryption",
    "feature.security.highlight3": "GDPR ready",
    
    // Additional missing translations
    "features.financial.heading": "Complete control over your business finances",
    "features.global.heading": "Everything you need for international operations"
  },
  es: {
    "feature.invoicing.highlight1": "Facturas recurrentes",
    "feature.invoicing.highlight2": "Recordatorios de pago",
    "feature.invoicing.highlight3": "Factoraje de facturas",
    "feature.reporting.highlight1": "Tableros personalizados",
    "feature.reporting.highlight2": "Análisis de ganancias",
    "feature.reporting.highlight3": "Pronóstico de flujo de efectivo",
    "feature.payments.highlight1": "Dinero móvil",
    "feature.payments.highlight2": "Transferencias bancarias",
    "feature.payments.highlight3": "Billeteras digitales",
    "feature.security.highlight1": "Cumple con SOC2",
    "feature.security.highlight2": "Cifrado de datos",
    "feature.security.highlight3": "Listo para GDPR",
    "features.financial.heading": "Control total sobre las finanzas de tu negocio",
    "features.global.heading": "Todo lo que necesitas para operaciones internacionales"
  },
  fr: {
    "feature.invoicing.highlight1": "Factures récurrentes",
    "feature.invoicing.highlight2": "Rappels de paiement",
    "feature.invoicing.highlight3": "Affacturage de factures",
    "feature.reporting.highlight1": "Tableaux de bord personnalisés",
    "feature.reporting.highlight2": "Analyse des bénéfices",
    "feature.reporting.highlight3": "Prévision de trésorerie",
    "feature.payments.highlight1": "Argent mobile",
    "feature.payments.highlight2": "Virements bancaires",
    "feature.payments.highlight3": "Portefeuilles numériques",
    "feature.security.highlight1": "Conforme SOC2",
    "feature.security.highlight2": "Chiffrement des données",
    "feature.security.highlight3": "Prêt pour GDPR",
    "features.financial.heading": "Contrôle complet sur les finances de votre entreprise",
    "features.global.heading": "Tout ce dont vous avez besoin pour les opérations internationales"
  },
  de: {
    "feature.invoicing.highlight1": "Wiederkehrende Rechnungen",
    "feature.invoicing.highlight2": "Zahlungserinnerungen",
    "feature.invoicing.highlight3": "Rechnungsfactoring",
    "feature.reporting.highlight1": "Benutzerdefinierte Dashboards",
    "feature.reporting.highlight2": "Gewinnanalyse",
    "feature.reporting.highlight3": "Cashflow-Prognose",
    "feature.payments.highlight1": "Mobile Geldtransfers",
    "feature.payments.highlight2": "Banküberweisungen",
    "feature.payments.highlight3": "Digitale Geldbörsen",
    "feature.security.highlight1": "SOC2-konform",
    "feature.security.highlight2": "Datenverschlüsselung",
    "feature.security.highlight3": "DSGVO-bereit",
    "features.financial.heading": "Vollständige Kontrolle über Ihre Unternehmensfinanzen",
    "features.global.heading": "Alles was Sie für internationale Geschäfte benötigen"
  },
  pt: {
    "feature.invoicing.highlight1": "Faturas recorrentes",
    "feature.invoicing.highlight2": "Lembretes de pagamento",
    "feature.invoicing.highlight3": "Factoring de faturas",
    "feature.reporting.highlight1": "Painéis personalizados",
    "feature.reporting.highlight2": "Análise de lucros",
    "feature.reporting.highlight3": "Previsão de fluxo de caixa",
    "feature.payments.highlight1": "Dinheiro móvel",
    "feature.payments.highlight2": "Transferências bancárias",
    "feature.payments.highlight3": "Carteiras digitais",
    "feature.security.highlight1": "Compatível com SOC2",
    "feature.security.highlight2": "Criptografia de dados",
    "feature.security.highlight3": "Pronto para GDPR",
    "features.financial.heading": "Controle total sobre as finanças do seu negócio",
    "features.global.heading": "Tudo o que você precisa para operações internacionais"
  },
  ja: {
    "feature.invoicing.highlight1": "定期請求書",
    "feature.invoicing.highlight2": "支払いリマインダー",
    "feature.invoicing.highlight3": "請求書ファクタリング",
    "feature.reporting.highlight1": "カスタムダッシュボード",
    "feature.reporting.highlight2": "利益分析",
    "feature.reporting.highlight3": "キャッシュフロー予測",
    "feature.payments.highlight1": "モバイルマネー",
    "feature.payments.highlight2": "銀行振込",
    "feature.payments.highlight3": "デジタルウォレット",
    "feature.security.highlight1": "SOC2準拠",
    "feature.security.highlight2": "データ暗号化",
    "feature.security.highlight3": "GDPR対応",
    "features.financial.heading": "ビジネス財務の完全なコントロール",
    "features.global.heading": "国際事業に必要なすべて"
  },
  zh: {
    "feature.invoicing.highlight1": "定期发票",
    "feature.invoicing.highlight2": "付款提醒",
    "feature.invoicing.highlight3": "发票保理",
    "feature.reporting.highlight1": "自定义仪表板",
    "feature.reporting.highlight2": "利润分析",
    "feature.reporting.highlight3": "现金流预测",
    "feature.payments.highlight1": "移动支付",
    "feature.payments.highlight2": "银行转账",
    "feature.payments.highlight3": "数字钱包",
    "feature.security.highlight1": "SOC2合规",
    "feature.security.highlight2": "数据加密",
    "feature.security.highlight3": "GDPR就绪",
    "features.financial.heading": "完全掌控您的企业财务",
    "features.global.heading": "国际运营所需的一切"
  },
  ko: {
    "feature.invoicing.highlight1": "반복 송장",
    "feature.invoicing.highlight2": "결제 알림",
    "feature.invoicing.highlight3": "송장 팩토링",
    "feature.reporting.highlight1": "맞춤형 대시보드",
    "feature.reporting.highlight2": "수익 분석",
    "feature.reporting.highlight3": "현금 흐름 예측",
    "feature.payments.highlight1": "모바일 머니",
    "feature.payments.highlight2": "은행 송금",
    "feature.payments.highlight3": "디지털 지갑",
    "feature.security.highlight1": "SOC2 준수",
    "feature.security.highlight2": "데이터 암호화",
    "feature.security.highlight3": "GDPR 준비",
    "features.financial.heading": "비즈니스 재무에 대한 완전한 통제",
    "features.global.heading": "국제 운영에 필요한 모든 것"
  },
  ar: {
    "feature.invoicing.highlight1": "الفواتير المتكررة",
    "feature.invoicing.highlight2": "تذكيرات الدفع",
    "feature.invoicing.highlight3": "تمويل الفواتير",
    "feature.reporting.highlight1": "لوحات تحكم مخصصة",
    "feature.reporting.highlight2": "تحليل الأرباح",
    "feature.reporting.highlight3": "توقعات التدفق النقدي",
    "feature.payments.highlight1": "الأموال المحمولة",
    "feature.payments.highlight2": "التحويلات المصرفية",
    "feature.payments.highlight3": "المحافظ الرقمية",
    "feature.security.highlight1": "متوافق مع SOC2",
    "feature.security.highlight2": "تشفير البيانات",
    "feature.security.highlight3": "جاهز لـ GDPR",
    "features.financial.heading": "التحكم الكامل في مالية عملك",
    "features.global.heading": "كل ما تحتاجه للعمليات الدولية"
  },
  hi: {
    "feature.invoicing.highlight1": "आवर्ती चालान",
    "feature.invoicing.highlight2": "भुगतान अनुस्मारक",
    "feature.invoicing.highlight3": "चालान फैक्टरिंग",
    "feature.reporting.highlight1": "कस्टम डैशबोर्ड",
    "feature.reporting.highlight2": "लाभ विश्लेषण",
    "feature.reporting.highlight3": "नकदी प्रवाह पूर्वानुमान",
    "feature.payments.highlight1": "मोबाइल मनी",
    "feature.payments.highlight2": "बैंक हस्तांतरण",
    "feature.payments.highlight3": "डिजिटल वॉलेट",
    "feature.security.highlight1": "SOC2 अनुपालन",
    "feature.security.highlight2": "डेटा एन्क्रिप्शन",
    "feature.security.highlight3": "GDPR तैयार",
    "features.financial.heading": "अपने व्यवसाय वित्त पर पूर्ण नियंत्रण",
    "features.global.heading": "अंतर्राष्ट्रीय संचालन के लिए आवश्यक सब कुछ"
  },
  ru: {
    "feature.invoicing.highlight1": "Повторяющиеся счета",
    "feature.invoicing.highlight2": "Напоминания об оплате",
    "feature.invoicing.highlight3": "Факторинг счетов",
    "feature.reporting.highlight1": "Настраиваемые панели",
    "feature.reporting.highlight2": "Анализ прибыли",
    "feature.reporting.highlight3": "Прогноз денежного потока",
    "feature.payments.highlight1": "Мобильные деньги",
    "feature.payments.highlight2": "Банковские переводы",
    "feature.payments.highlight3": "Цифровые кошельки",
    "feature.security.highlight1": "Соответствует SOC2",
    "feature.security.highlight2": "Шифрование данных",
    "feature.security.highlight3": "Готов к GDPR",
    "features.financial.heading": "Полный контроль над финансами вашего бизнеса",
    "features.global.heading": "Все необходимое для международных операций"
  },
  tr: {
    "feature.invoicing.highlight1": "Tekrarlayan faturalar",
    "feature.invoicing.highlight2": "Ödeme hatırlatıcıları",
    "feature.invoicing.highlight3": "Fatura faktoring",
    "feature.reporting.highlight1": "Özel panolar",
    "feature.reporting.highlight2": "Kâr analizi",
    "feature.reporting.highlight3": "Nakit akışı tahmini",
    "feature.payments.highlight1": "Mobil para",
    "feature.payments.highlight2": "Banka transferleri",
    "feature.payments.highlight3": "Dijital cüzdanlar",
    "feature.security.highlight1": "SOC2 uyumlu",
    "feature.security.highlight2": "Veri şifreleme",
    "feature.security.highlight3": "GDPR hazır",
    "features.financial.heading": "İşletme finansınız üzerinde tam kontrol",
    "features.global.heading": "Uluslararası operasyonlar için gereken her şey"
  },
  id: {
    "feature.invoicing.highlight1": "Faktur berulang",
    "feature.invoicing.highlight2": "Pengingat pembayaran",
    "feature.invoicing.highlight3": "Anjak piutang faktur",
    "feature.reporting.highlight1": "Dasbor khusus",
    "feature.reporting.highlight2": "Analisis keuntungan",
    "feature.reporting.highlight3": "Perkiraan arus kas",
    "feature.payments.highlight1": "Uang seluler",
    "feature.payments.highlight2": "Transfer bank",
    "feature.payments.highlight3": "Dompet digital",
    "feature.security.highlight1": "Sesuai SOC2",
    "feature.security.highlight2": "Enkripsi data",
    "feature.security.highlight3": "Siap GDPR",
    "features.financial.heading": "Kontrol penuh atas keuangan bisnis Anda",
    "features.global.heading": "Semua yang Anda butuhkan untuk operasi internasional"
  },
  vi: {
    "feature.invoicing.highlight1": "Hóa đơn định kỳ",
    "feature.invoicing.highlight2": "Nhắc nhở thanh toán",
    "feature.invoicing.highlight3": "Bao thanh toán hóa đơn",
    "feature.reporting.highlight1": "Bảng điều khiển tùy chỉnh",
    "feature.reporting.highlight2": "Phân tích lợi nhuận",
    "feature.reporting.highlight3": "Dự báo dòng tiền",
    "feature.payments.highlight1": "Tiền di động",
    "feature.payments.highlight2": "Chuyển khoản ngân hàng",
    "feature.payments.highlight3": "Ví điện tử",
    "feature.security.highlight1": "Tuân thủ SOC2",
    "feature.security.highlight2": "Mã hóa dữ liệu",
    "feature.security.highlight3": "Sẵn sàng GDPR",
    "features.financial.heading": "Kiểm soát hoàn toàn tài chính doanh nghiệp của bạn",
    "features.global.heading": "Mọi thứ bạn cần cho hoạt động quốc tế"
  },
  nl: {
    "feature.invoicing.highlight1": "Terugkerende facturen",
    "feature.invoicing.highlight2": "Betalingsherinneringen",
    "feature.invoicing.highlight3": "Factuur factoring",
    "feature.reporting.highlight1": "Aangepaste dashboards",
    "feature.reporting.highlight2": "Winstanalyse",
    "feature.reporting.highlight3": "Cashflow prognose",
    "feature.payments.highlight1": "Mobiel geld",
    "feature.payments.highlight2": "Bankoverschrijvingen",
    "feature.payments.highlight3": "Digitale portemonnees",
    "feature.security.highlight1": "SOC2 compliant",
    "feature.security.highlight2": "Data encryptie",
    "feature.security.highlight3": "GDPR gereed",
    "features.financial.heading": "Volledige controle over uw bedrijfsfinanciën",
    "features.global.heading": "Alles wat u nodig heeft voor internationale operaties"
  },
  sw: {
    "feature.invoicing.highlight1": "Ankara za mara kwa mara",
    "feature.invoicing.highlight2": "Vikumbuzi vya malipo",
    "feature.invoicing.highlight3": "Ufadhili wa ankara",
    "feature.reporting.highlight1": "Dashibodi maalum",
    "feature.reporting.highlight2": "Uchambuzi wa faida",
    "feature.reporting.highlight3": "Utabiri wa mtiririko wa fedha",
    "feature.payments.highlight1": "Pesa za simu",
    "feature.payments.highlight2": "Uhamisho wa benki",
    "feature.payments.highlight3": "Pochi za kidijitali",
    "feature.security.highlight1": "Inakubaliana na SOC2",
    "feature.security.highlight2": "Usimbaji fiche wa data",
    "feature.security.highlight3": "Tayari kwa GDPR",
    "features.financial.heading": "Udhibiti kamili wa fedha za biashara yako",
    "features.global.heading": "Kila kitu unachohitaji kwa shughuli za kimataifa"
  },
  ha: {
    "feature.invoicing.highlight1": "Takardu masu maimaitawa",
    "feature.invoicing.highlight2": "Tunatarwa na biyan kuɗi",
    "feature.invoicing.highlight3": "Factoring daftari",
    "feature.reporting.highlight1": "Dashboards na musamman",
    "feature.reporting.highlight2": "Nazarin riba",
    "feature.reporting.highlight3": "Hasashen tsabar kuɗi",
    "feature.payments.highlight1": "Kuɗin wayar hannu",
    "feature.payments.highlight2": "Canja wurin banki",
    "feature.payments.highlight3": "Jakar kuɗi na dijital",
    "feature.security.highlight1": "Ya dace da SOC2",
    "feature.security.highlight2": "Ɓoyewar bayanai",
    "feature.security.highlight3": "Shirye don GDPR",
    "features.financial.heading": "Cikakken iko akan kuɗin kasuwancin ku",
    "features.global.heading": "Duk abin da kuke buƙata don ayyukan ƙasa da ƙasa"
  },
  yo: {
    "feature.invoicing.highlight1": "Awọn owo-owo loorekoore",
    "feature.invoicing.highlight2": "Awọn olurannileti isanwo",
    "feature.invoicing.highlight3": "Ifowopamọ owo-owo",
    "feature.reporting.highlight1": "Awọn dasibodu adani",
    "feature.reporting.highlight2": "Itupalẹ ere",
    "feature.reporting.highlight3": "Asọtẹlẹ sisan owo",
    "feature.payments.highlight1": "Owo alagbeka",
    "feature.payments.highlight2": "Awọn gbigbe banki",
    "feature.payments.highlight3": "Awọn apamọwọ oni-nọmba",
    "feature.security.highlight1": "SOC2 ni ibamu",
    "feature.security.highlight2": "Fifi ẹnikan pamọ data",
    "feature.security.highlight3": "Ṣetan fun GDPR",
    "features.financial.heading": "Iṣakoso pipe lori owo-iṣowo rẹ",
    "features.global.heading": "Ohun gbogbo ti o nilo fun awọn iṣẹ kariaye"
  },
  am: {
    "feature.invoicing.highlight1": "ተደጋጋሚ ደረሰኞች",
    "feature.invoicing.highlight2": "የክፍያ ማስታወሻዎች",
    "feature.invoicing.highlight3": "ደረሰኝ ፋክተሪንግ",
    "feature.reporting.highlight1": "ብጁ ዳሽቦርዶች",
    "feature.reporting.highlight2": "ትርፍ ትንተና",
    "feature.reporting.highlight3": "የገንዘብ ፍሰት ትንበያ",
    "feature.payments.highlight1": "ተንቀሳቃሽ ገንዘብ",
    "feature.payments.highlight2": "የባንክ ዝውውሮች",
    "feature.payments.highlight3": "ዲጂታል ቦርሳዎች",
    "feature.security.highlight1": "SOC2 ተገዢ",
    "feature.security.highlight2": "የውሂብ ምስጠራ",
    "feature.security.highlight3": "ለGDPR ዝግጁ",
    "features.financial.heading": "በንግድ ፋይናንስዎ ላይ ሙሉ ቁጥጥር",
    "features.global.heading": "ለዓለም አቀፍ ሥራዎች የሚያስፈልግዎት ሁሉ"
  },
  zu: {
    "feature.invoicing.highlight1": "Ama-invoice aphindaphindayo",
    "feature.invoicing.highlight2": "Izikhumbuzo zokukhokha",
    "feature.invoicing.highlight3": "Ukufaka ama-invoice",
    "feature.reporting.highlight1": "Amadeshibhodi angokwezifiso",
    "feature.reporting.highlight2": "Ukuhlaziya inzuzo",
    "feature.reporting.highlight3": "Ukubikezela ukugeleza kwemali",
    "feature.payments.highlight1": "Imali yeselula",
    "feature.payments.highlight2": "Ukudlulisela kwebhange",
    "feature.payments.highlight3": "Izikhwama zemali zedijithali",
    "feature.security.highlight1": "Ihambisana ne-SOC2",
    "feature.security.highlight2": "Ukubethela idatha",
    "feature.security.highlight3": "Ilungele i-GDPR",
    "features.financial.heading": "Ukulawula okuphelele kwezimali zebhizinisi lakho",
    "features.global.heading": "Konke okudingayo ukusebenza emhlabeni jikelele"
  },
  bn: {
    "feature.invoicing.highlight1": "পুনরাবৃত্ত চালান",
    "feature.invoicing.highlight2": "পেমেন্ট রিমাইন্ডার",
    "feature.invoicing.highlight3": "চালান ফ্যাক্টরিং",
    "feature.reporting.highlight1": "কাস্টম ড্যাশবোর্ড",
    "feature.reporting.highlight2": "লাভ বিশ্লেষণ",
    "feature.reporting.highlight3": "নগদ প্রবাহ পূর্বাভাস",
    "feature.payments.highlight1": "মোবাইল মানি",
    "feature.payments.highlight2": "ব্যাংক স্থানান্তর",
    "feature.payments.highlight3": "ডিজিটাল ওয়ালেট",
    "feature.security.highlight1": "SOC2 সম্মত",
    "feature.security.highlight2": "ডেটা এনক্রিপশন",
    "feature.security.highlight3": "GDPR প্রস্তুত",
    "features.financial.heading": "আপনার ব্যবসায়িক অর্থের উপর সম্পূর্ণ নিয়ন্ত্রণ",
    "features.global.heading": "আন্তর্জাতিক ক্রিয়াকলাপের জন্য আপনার যা প্রয়োজন"
  },
  fa: {
    "feature.invoicing.highlight1": "فاکتورهای تکراری",
    "feature.invoicing.highlight2": "یادآوری‌های پرداخت",
    "feature.invoicing.highlight3": "فاکتورینگ فاکتور",
    "feature.reporting.highlight1": "داشبوردهای سفارشی",
    "feature.reporting.highlight2": "تحلیل سود",
    "feature.reporting.highlight3": "پیش‌بینی جریان نقدی",
    "feature.payments.highlight1": "پول موبایل",
    "feature.payments.highlight2": "انتقال بانکی",
    "feature.payments.highlight3": "کیف پول دیجیتال",
    "feature.security.highlight1": "سازگار با SOC2",
    "feature.security.highlight2": "رمزگذاری داده",
    "feature.security.highlight3": "آماده GDPR",
    "features.financial.heading": "کنترل کامل بر امور مالی کسب و کار شما",
    "features.global.heading": "همه چیزهایی که برای عملیات بین‌المللی نیاز دارید"
  },
  ur: {
    "feature.invoicing.highlight1": "بار بار آنے والے انوائسز",
    "feature.invoicing.highlight2": "ادائیگی کی یاد دہانیاں",
    "feature.invoicing.highlight3": "انوائس فیکٹرنگ",
    "feature.reporting.highlight1": "اپنی مرضی کے ڈیش بورڈز",
    "feature.reporting.highlight2": "منافع کا تجزیہ",
    "feature.reporting.highlight3": "نقد بہاؤ کی پیش گوئی",
    "feature.payments.highlight1": "موبائل منی",
    "feature.payments.highlight2": "بینک منتقلی",
    "feature.payments.highlight3": "ڈیجیٹل بٹوے",
    "feature.security.highlight1": "SOC2 موافق",
    "feature.security.highlight2": "ڈیٹا انکرپشن",
    "feature.security.highlight3": "GDPR تیار",
    "features.financial.heading": "آپ کے کاروباری مالیات پر مکمل کنٹرول",
    "features.global.heading": "بین الاقوامی کارروائیوں کے لیے آپ کو جو کچھ چاہیے"
  },
  th: {
    "feature.invoicing.highlight1": "ใบแจ้งหนี้ที่เกิดซ้ำ",
    "feature.invoicing.highlight2": "การแจ้งเตือนการชำระเงิน",
    "feature.invoicing.highlight3": "แฟคตอริ่งใบแจ้งหนี้",
    "feature.reporting.highlight1": "แดชบอร์ดที่กำหนดเอง",
    "feature.reporting.highlight2": "การวิเคราะห์กำไร",
    "feature.reporting.highlight3": "การพยากรณ์กระแสเงินสด",
    "feature.payments.highlight1": "เงินมือถือ",
    "feature.payments.highlight2": "การโอนเงินผ่านธนาคาร",
    "feature.payments.highlight3": "กระเป๋าเงินดิจิทัล",
    "feature.security.highlight1": "สอดคล้องกับ SOC2",
    "feature.security.highlight2": "การเข้ารหัสข้อมูล",
    "feature.security.highlight3": "พร้อม GDPR",
    "features.financial.heading": "ควบคุมการเงินธุรกิจของคุณอย่างสมบูรณ์",
    "features.global.heading": "ทุกสิ่งที่คุณต้องการสำหรับการดำเนินงานระหว่างประเทศ"
  },
  tl: {
    "feature.invoicing.highlight1": "Mga paulit-ulit na invoice",
    "feature.invoicing.highlight2": "Mga paalala sa pagbabayad",
    "feature.invoicing.highlight3": "Invoice factoring",
    "feature.reporting.highlight1": "Mga custom na dashboard",
    "feature.reporting.highlight2": "Pagsusuri ng kita",
    "feature.reporting.highlight3": "Pagtataya ng daloy ng pera",
    "feature.payments.highlight1": "Mobile money",
    "feature.payments.highlight2": "Mga paglilipat ng bangko",
    "feature.payments.highlight3": "Mga digital na wallet",
    "feature.security.highlight1": "Sumusunod sa SOC2",
    "feature.security.highlight2": "Pag-encrypt ng data",
    "feature.security.highlight3": "Handa para sa GDPR",
    "features.financial.heading": "Kumpletong kontrol sa pananalapi ng iyong negosyo",
    "features.global.heading": "Lahat ng kailangan mo para sa pandaigdigang operasyon"
  },
  uk: {
    "feature.invoicing.highlight1": "Повторювані рахунки",
    "feature.invoicing.highlight2": "Нагадування про оплату",
    "feature.invoicing.highlight3": "Факторинг рахунків",
    "feature.reporting.highlight1": "Налаштовувані панелі",
    "feature.reporting.highlight2": "Аналіз прибутку",
    "feature.reporting.highlight3": "Прогноз грошового потоку",
    "feature.payments.highlight1": "Мобільні гроші",
    "feature.payments.highlight2": "Банківські перекази",
    "feature.payments.highlight3": "Цифрові гаманці",
    "feature.security.highlight1": "Відповідає SOC2",
    "feature.security.highlight2": "Шифрування даних",
    "feature.security.highlight3": "Готовий до GDPR",
    "features.financial.heading": "Повний контроль над фінансами вашого бізнесу",
    "features.global.heading": "Все необхідне для міжнародних операцій"
  },
  it: {
    "feature.invoicing.highlight1": "Fatture ricorrenti",
    "feature.invoicing.highlight2": "Promemoria di pagamento",
    "feature.invoicing.highlight3": "Factoring delle fatture",
    "feature.reporting.highlight1": "Dashboard personalizzati",
    "feature.reporting.highlight2": "Analisi dei profitti",
    "feature.reporting.highlight3": "Previsione del flusso di cassa",
    "feature.payments.highlight1": "Mobile money",
    "feature.payments.highlight2": "Bonifici bancari",
    "feature.payments.highlight3": "Portafogli digitali",
    "feature.security.highlight1": "Conforme SOC2",
    "feature.security.highlight2": "Crittografia dei dati",
    "feature.security.highlight3": "Pronto per GDPR",
    "features.financial.heading": "Controllo completo sulle finanze aziendali",
    "features.global.heading": "Tutto il necessario per le operazioni internazionali"
  },
  pl: {
    "feature.invoicing.highlight1": "Faktury cykliczne",
    "feature.invoicing.highlight2": "Przypomnienia o płatności",
    "feature.invoicing.highlight3": "Faktoring faktur",
    "feature.reporting.highlight1": "Niestandardowe pulpity",
    "feature.reporting.highlight2": "Analiza zysków",
    "feature.reporting.highlight3": "Prognoza przepływów pieniężnych",
    "feature.payments.highlight1": "Pieniądze mobilne",
    "feature.payments.highlight2": "Przelewy bankowe",
    "feature.payments.highlight3": "Portfele cyfrowe",
    "feature.security.highlight1": "Zgodny z SOC2",
    "feature.security.highlight2": "Szyfrowanie danych",
    "feature.security.highlight3": "Gotowy na GDPR",
    "features.financial.heading": "Pełna kontrola nad finansami firmy",
    "features.global.heading": "Wszystko czego potrzebujesz do działań międzynarodowych"
  },
  ig: {
    "feature.invoicing.highlight1": "Akwụkwọ ọnụahịa ugboro ugboro",
    "feature.invoicing.highlight2": "Ncheta ịkwụ ụgwọ",
    "feature.invoicing.highlight3": "Ịgbazinye akwụkwọ ọnụahịa",
    "feature.reporting.highlight1": "Dashboard ndị ahaziri",
    "feature.reporting.highlight2": "Nyocha uru",
    "feature.reporting.highlight3": "Amụma ego na-erugharị",
    "feature.payments.highlight1": "Ego ekwentị",
    "feature.payments.highlight2": "Mbufe ụlọ akụ",
    "feature.payments.highlight3": "Akpa ego dijitalụ",
    "feature.security.highlight1": "Dabara na SOC2",
    "feature.security.highlight2": "Nzuzo data",
    "feature.security.highlight3": "Dị njikere maka GDPR",
    "features.financial.heading": "Njikwa zuru ezu na ego azụmahịa gị",
    "features.global.heading": "Ihe niile ị chọrọ maka ọrụ mba ụwa"
  },
  sn: {
    "feature.invoicing.highlight1": "Ma-invoice anodzokororwa",
    "feature.invoicing.highlight2": "Zviyeuchidzo zvekubhadhara",
    "feature.invoicing.highlight3": "Invoice factoring",
    "feature.reporting.highlight1": "Madheshibhodi akagadzirirwa",
    "feature.reporting.highlight2": "Ongororo yepurofiti",
    "feature.reporting.highlight3": "Kufungidzira kuyerera kwemari",
    "feature.payments.highlight1": "Mari yefoni",
    "feature.payments.highlight2": "Kuendesa kubhanga",
    "feature.payments.highlight3": "Zvikwama zvemari zvedhijitari",
    "feature.security.highlight1": "Inoenderana neSOC2",
    "feature.security.highlight2": "Kuvharidzira data",
    "feature.security.highlight3": "Yakagadzirira GDPR",
    "features.financial.heading": "Kutonga kuzere pamusoro pemari yebhizinesi rako",
    "features.global.heading": "Zvese zvaunoda kumabasa epasi rose"
  }
};

// Get the locales directory path
const localesDir = path.join(__dirname, '..', 'public', 'locales');

// Function to update a language file
function updateLanguageFile(lang, translations) {
  const filePath = path.join(localesDir, lang, 'common.json');
  
  try {
    // Read existing file
    let existingContent = {};
    if (fs.existsSync(filePath)) {
      existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    // Merge translations - add new keys without overwriting existing ones
    Object.keys(translations).forEach(key => {
      // Split the key to handle nested structure
      const parts = key.split('.');
      let current = existingContent;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      // Set the value for the last part of the key
      current[parts[parts.length - 1]] = translations[key];
    });
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingContent, null, 2), 'utf8');
    console.log(`✅ Updated ${lang}/common.json`);
    
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error.message);
  }
}

// Process all languages
Object.keys(additionalTranslations).forEach(lang => {
  updateLanguageFile(lang, additionalTranslations[lang]);
});

console.log('\n✨ Additional translations update complete!');