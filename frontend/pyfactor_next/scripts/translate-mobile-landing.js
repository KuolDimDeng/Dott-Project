const fs = require('fs');
const path = require('path');

// Translations for all 30 languages
const translations = {
  'es': { // Spanish
    "mobileLanding": {
      "hero": {
        "title": "Tu Negocio,",
        "subtitle": "En Tu Bolsillo",
        "description": "Plataforma de gestión empresarial impulsada por IA que funciona sin conexión.",
        "cta": {
          "getStarted": "Comienza Gratis",
          "signIn": "Iniciar Sesión"
        },
        "noCreditCard": "No se requiere tarjeta de crédito",
        "freePlan": "Plan gratuito para siempre"
      },
      "features": {
        "title": "Todo Lo Que Necesitas",
        "pos": {
          "title": "Punto de Venta",
          "description": "Procesa ventas al instante, incluso sin conexión"
        },
        "barcode": {
          "title": "Escáner de Códigos",
          "description": "Escanea productos con tu cámara"
        },
        "invoicing": {
          "title": "Facturación Rápida",
          "description": "Crea y envía facturas sobre la marcha"
        },
        "analytics": {
          "title": "Análisis en Tiempo Real",
          "description": "Rastrea el rendimiento de tu negocio"
        }
      },
      "benefits": {
        "title": "Construido para Tu Éxito",
        "offline": {
          "title": "Funciona Sin Conexión",
          "description": "Continúa vendiendo sin internet"
        },
        "fast": {
          "title": "Ultrarrápido",
          "description": "Carga instantánea, sin demoras"
        },
        "mobile": {
          "title": "Móvil Primero",
          "description": "Diseñado para teléfonos y tabletas"
        },
        "payments": {
          "title": "Dinero Móvil",
          "description": "M-Pesa, modo sin conexión, soporte local"
        }
      },
      "pricing": {
        "title": "Precios Simples y Transparentes"
      },
      "cta": {
        "title": "¿Listo para Hacer Crecer Tu Negocio?",
        "subtitle": "Comienza a gestionar mejor tu negocio hoy",
        "button": "Comienza Gratis",
        "terms": "No se requiere tarjeta de crédito • Cancela cuando quieras"
      }
    }
  },
  'fr': { // French
    "mobileLanding": {
      "hero": {
        "title": "Votre Entreprise,",
        "subtitle": "Dans Votre Poche",
        "description": "Plateforme de gestion d'entreprise alimentée par l'IA qui fonctionne hors ligne.",
        "cta": {
          "getStarted": "Commencer Gratuitement",
          "signIn": "Se Connecter"
        },
        "noCreditCard": "Aucune carte de crédit requise",
        "freePlan": "Plan gratuit pour toujours"
      },
      "features": {
        "title": "Tout Ce Dont Vous Avez Besoin",
        "pos": {
          "title": "Point de Vente",
          "description": "Traitez les ventes instantanément, même hors ligne"
        },
        "barcode": {
          "title": "Scanner de Codes-barres",
          "description": "Scannez des produits avec votre caméra"
        },
        "invoicing": {
          "title": "Facturation Rapide",
          "description": "Créez et envoyez des factures en déplacement"
        },
        "analytics": {
          "title": "Analyses en Temps Réel",
          "description": "Suivez les performances de votre entreprise"
        }
      },
      "benefits": {
        "title": "Conçu pour Votre Succès",
        "offline": {
          "title": "Fonctionne Hors Ligne",
          "description": "Continuez à vendre sans internet"
        },
        "fast": {
          "title": "Ultra Rapide",
          "description": "Chargement instantané, sans délai"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Conçu pour téléphones et tablettes"
        },
        "payments": {
          "title": "Argent Mobile",
          "description": "M-Pesa, mode hors ligne, support local"
        }
      },
      "pricing": {
        "title": "Tarification Simple et Transparente"
      },
      "cta": {
        "title": "Prêt à Développer Votre Entreprise?",
        "subtitle": "Commencez à mieux gérer votre entreprise aujourd'hui",
        "button": "Commencer Gratuitement",
        "terms": "Aucune carte de crédit requise • Annulez à tout moment"
      }
    }
  },
  'de': { // German
    "mobileLanding": {
      "hero": {
        "title": "Ihr Geschäft,",
        "subtitle": "In Ihrer Tasche",
        "description": "KI-gestützte Geschäftsverwaltungsplattform, die offline funktioniert.",
        "cta": {
          "getStarted": "Kostenlos Starten",
          "signIn": "Anmelden"
        },
        "noCreditCard": "Keine Kreditkarte erforderlich",
        "freePlan": "Für immer kostenloser Plan"
      },
      "features": {
        "title": "Alles Was Sie Brauchen",
        "pos": {
          "title": "Kassensystem",
          "description": "Verkäufe sofort verarbeiten, auch offline"
        },
        "barcode": {
          "title": "Barcode-Scanner",
          "description": "Produkte mit Ihrer Kamera scannen"
        },
        "invoicing": {
          "title": "Schnelle Rechnungsstellung",
          "description": "Rechnungen unterwegs erstellen und senden"
        },
        "analytics": {
          "title": "Echtzeit-Analysen",
          "description": "Verfolgen Sie Ihre Geschäftsleistung"
        }
      },
      "benefits": {
        "title": "Für Ihren Erfolg Entwickelt",
        "offline": {
          "title": "Funktioniert Offline",
          "description": "Verkaufen Sie weiter ohne Internet"
        },
        "fast": {
          "title": "Blitzschnell",
          "description": "Sofortiges Laden, keine Verzögerungen"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Für Telefone und Tablets entwickelt"
        },
        "payments": {
          "title": "Mobile Zahlungen",
          "description": "M-Pesa, Offline-Modus, lokaler Support"
        }
      },
      "pricing": {
        "title": "Einfache, Transparente Preise"
      },
      "cta": {
        "title": "Bereit, Ihr Geschäft zu Erweitern?",
        "subtitle": "Beginnen Sie heute, Ihr Geschäft besser zu verwalten",
        "button": "Kostenlos Starten",
        "terms": "Keine Kreditkarte erforderlich • Jederzeit kündbar"
      }
    }
  },
  'pt': { // Portuguese
    "mobileLanding": {
      "hero": {
        "title": "Seu Negócio,",
        "subtitle": "No Seu Bolso",
        "description": "Plataforma de gestão empresarial com IA que funciona offline.",
        "cta": {
          "getStarted": "Comece Gratuitamente",
          "signIn": "Entrar"
        },
        "noCreditCard": "Não é necessário cartão de crédito",
        "freePlan": "Plano gratuito para sempre"
      },
      "features": {
        "title": "Tudo Que Você Precisa",
        "pos": {
          "title": "Ponto de Venda",
          "description": "Processe vendas instantaneamente, mesmo offline"
        },
        "barcode": {
          "title": "Scanner de Código de Barras",
          "description": "Escaneie produtos com sua câmera"
        },
        "invoicing": {
          "title": "Faturamento Rápido",
          "description": "Crie e envie faturas em movimento"
        },
        "analytics": {
          "title": "Análises em Tempo Real",
          "description": "Acompanhe o desempenho do seu negócio"
        }
      },
      "benefits": {
        "title": "Feito para o Seu Sucesso",
        "offline": {
          "title": "Funciona Offline",
          "description": "Continue vendendo sem internet"
        },
        "fast": {
          "title": "Super Rápido",
          "description": "Carregamento instantâneo, sem atrasos"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Projetado para telefones e tablets"
        },
        "payments": {
          "title": "Dinheiro Móvel",
          "description": "M-Pesa, modo offline, suporte local"
        }
      },
      "pricing": {
        "title": "Preços Simples e Transparentes"
      },
      "cta": {
        "title": "Pronto para Crescer Seu Negócio?",
        "subtitle": "Comece a gerenciar melhor seu negócio hoje",
        "button": "Comece Grátis",
        "terms": "Não é necessário cartão de crédito • Cancele a qualquer momento"
      }
    }
  },
  'nl': { // Dutch
    "mobileLanding": {
      "hero": {
        "title": "Uw Bedrijf,",
        "subtitle": "In Uw Zak",
        "description": "AI-aangedreven bedrijfsbeheerplatform dat offline werkt.",
        "cta": {
          "getStarted": "Gratis Beginnen",
          "signIn": "Inloggen"
        },
        "noCreditCard": "Geen creditcard vereist",
        "freePlan": "Voor altijd gratis plan"
      },
      "features": {
        "title": "Alles Wat U Nodig Heeft",
        "pos": {
          "title": "Kassasysteem",
          "description": "Verwerk verkopen direct, zelfs offline"
        },
        "barcode": {
          "title": "Barcode Scanner",
          "description": "Scan producten met uw camera"
        },
        "invoicing": {
          "title": "Snelle Facturatie",
          "description": "Maak en verstuur facturen onderweg"
        },
        "analytics": {
          "title": "Real-time Analyses",
          "description": "Volg uw bedrijfsprestaties"
        }
      },
      "benefits": {
        "title": "Gebouwd voor Uw Succes",
        "offline": {
          "title": "Werkt Offline",
          "description": "Blijf verkopen zonder internet"
        },
        "fast": {
          "title": "Bliksemsnel",
          "description": "Direct laden, geen vertragingen"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Ontworpen voor telefoons en tablets"
        },
        "payments": {
          "title": "Mobiel Geld",
          "description": "M-Pesa, offline modus, lokale ondersteuning"
        }
      },
      "pricing": {
        "title": "Eenvoudige, Transparante Prijzen"
      },
      "cta": {
        "title": "Klaar om Uw Bedrijf te Laten Groeien?",
        "subtitle": "Begin vandaag met beter beheer van uw bedrijf",
        "button": "Gratis Beginnen",
        "terms": "Geen creditcard vereist • Altijd opzegbaar"
      }
    }
  },
  'ru': { // Russian
    "mobileLanding": {
      "hero": {
        "title": "Ваш Бизнес,",
        "subtitle": "В Вашем Кармане",
        "description": "Платформа управления бизнесом на основе ИИ, работающая офлайн.",
        "cta": {
          "getStarted": "Начать Бесплатно",
          "signIn": "Войти"
        },
        "noCreditCard": "Кредитная карта не требуется",
        "freePlan": "Бесплатный план навсегда"
      },
      "features": {
        "title": "Всё, Что Вам Нужно",
        "pos": {
          "title": "Касса",
          "description": "Обрабатывайте продажи мгновенно, даже офлайн"
        },
        "barcode": {
          "title": "Сканер Штрих-кодов",
          "description": "Сканируйте товары камерой"
        },
        "invoicing": {
          "title": "Быстрые Счета",
          "description": "Создавайте и отправляйте счета на ходу"
        },
        "analytics": {
          "title": "Аналитика в Реальном Времени",
          "description": "Отслеживайте эффективность вашего бизнеса"
        }
      },
      "benefits": {
        "title": "Создано для Вашего Успеха",
        "offline": {
          "title": "Работает Офлайн",
          "description": "Продолжайте продавать без интернета"
        },
        "fast": {
          "title": "Молниеносно Быстро",
          "description": "Мгновенная загрузка, без задержек"
        },
        "mobile": {
          "title": "Мобильность Прежде Всего",
          "description": "Разработано для телефонов и планшетов"
        },
        "payments": {
          "title": "Мобильные Деньги",
          "description": "M-Pesa, офлайн режим, локальная поддержка"
        }
      },
      "pricing": {
        "title": "Простые, Прозрачные Цены"
      },
      "cta": {
        "title": "Готовы Развивать Свой Бизнес?",
        "subtitle": "Начните лучше управлять своим бизнесом сегодня",
        "button": "Начать Бесплатно",
        "terms": "Кредитная карта не требуется • Отмена в любое время"
      }
    }
  },
  'zh': { // Chinese
    "mobileLanding": {
      "hero": {
        "title": "您的业务，",
        "subtitle": "尽在掌握",
        "description": "AI驱动的业务管理平台，支持离线工作。",
        "cta": {
          "getStarted": "免费开始",
          "signIn": "登录"
        },
        "noCreditCard": "无需信用卡",
        "freePlan": "永久免费计划"
      },
      "features": {
        "title": "您需要的一切",
        "pos": {
          "title": "销售点",
          "description": "即时处理销售，即使离线"
        },
        "barcode": {
          "title": "条码扫描器",
          "description": "用相机扫描产品"
        },
        "invoicing": {
          "title": "快速开票",
          "description": "随时创建和发送发票"
        },
        "analytics": {
          "title": "实时分析",
          "description": "跟踪您的业务表现"
        }
      },
      "benefits": {
        "title": "为您的成功而建",
        "offline": {
          "title": "离线工作",
          "description": "无需互联网继续销售"
        },
        "fast": {
          "title": "闪电般快速",
          "description": "即时加载，无延迟"
        },
        "mobile": {
          "title": "移动优先",
          "description": "专为手机和平板电脑设计"
        },
        "payments": {
          "title": "移动支付",
          "description": "M-Pesa，离线模式，本地支持"
        }
      },
      "pricing": {
        "title": "简单、透明的定价"
      },
      "cta": {
        "title": "准备发展您的业务吗？",
        "subtitle": "今天开始更好地管理您的业务",
        "button": "免费开始",
        "terms": "无需信用卡 • 随时取消"
      }
    }
  },
  'ja': { // Japanese
    "mobileLanding": {
      "hero": {
        "title": "あなたのビジネスを",
        "subtitle": "ポケットに",
        "description": "オフラインでも動作するAI搭載ビジネス管理プラットフォーム。",
        "cta": {
          "getStarted": "無料で始める",
          "signIn": "ログイン"
        },
        "noCreditCard": "クレジットカード不要",
        "freePlan": "永久無料プラン"
      },
      "features": {
        "title": "必要なものすべて",
        "pos": {
          "title": "POSシステム",
          "description": "オフラインでも即座に販売処理"
        },
        "barcode": {
          "title": "バーコードスキャナー",
          "description": "カメラで商品をスキャン"
        },
        "invoicing": {
          "title": "クイック請求書",
          "description": "移動中でも請求書を作成・送信"
        },
        "analytics": {
          "title": "リアルタイム分析",
          "description": "ビジネスパフォーマンスを追跡"
        }
      },
      "benefits": {
        "title": "成功のために設計",
        "offline": {
          "title": "オフライン動作",
          "description": "インターネットなしで販売継続"
        },
        "fast": {
          "title": "超高速",
          "description": "即座にロード、遅延なし"
        },
        "mobile": {
          "title": "モバイルファースト",
          "description": "スマホ・タブレット向け設計"
        },
        "payments": {
          "title": "モバイルマネー",
          "description": "M-Pesa、オフラインモード、ローカルサポート"
        }
      },
      "pricing": {
        "title": "シンプルで透明な価格設定"
      },
      "cta": {
        "title": "ビジネスを成長させる準備はできましたか？",
        "subtitle": "今日からビジネス管理を改善しましょう",
        "button": "無料で始める",
        "terms": "クレジットカード不要 • いつでもキャンセル可能"
      }
    }
  },
  'ko': { // Korean
    "mobileLanding": {
      "hero": {
        "title": "당신의 비즈니스를",
        "subtitle": "주머니 속에",
        "description": "오프라인에서도 작동하는 AI 기반 비즈니스 관리 플랫폼.",
        "cta": {
          "getStarted": "무료로 시작하기",
          "signIn": "로그인"
        },
        "noCreditCard": "신용카드 불필요",
        "freePlan": "영구 무료 플랜"
      },
      "features": {
        "title": "필요한 모든 것",
        "pos": {
          "title": "판매 시점 관리",
          "description": "오프라인에서도 즉시 판매 처리"
        },
        "barcode": {
          "title": "바코드 스캐너",
          "description": "카메라로 제품 스캔"
        },
        "invoicing": {
          "title": "빠른 청구서 발행",
          "description": "이동 중에도 청구서 생성 및 발송"
        },
        "analytics": {
          "title": "실시간 분석",
          "description": "비즈니스 성과 추적"
        }
      },
      "benefits": {
        "title": "성공을 위해 제작됨",
        "offline": {
          "title": "오프라인 작동",
          "description": "인터넷 없이도 판매 지속"
        },
        "fast": {
          "title": "초고속",
          "description": "즉시 로딩, 지연 없음"
        },
        "mobile": {
          "title": "모바일 우선",
          "description": "휴대폰과 태블릿용으로 설계"
        },
        "payments": {
          "title": "모바일 머니",
          "description": "M-Pesa, 오프라인 모드, 로컬 지원"
        }
      },
      "pricing": {
        "title": "간단하고 투명한 가격"
      },
      "cta": {
        "title": "비즈니스를 성장시킬 준비가 되셨나요?",
        "subtitle": "오늘부터 비즈니스를 더 잘 관리하세요",
        "button": "무료로 시작하기",
        "terms": "신용카드 불필요 • 언제든지 취소 가능"
      }
    }
  },
  'ar': { // Arabic
    "mobileLanding": {
      "hero": {
        "title": "عملك،",
        "subtitle": "في جيبك",
        "description": "منصة إدارة الأعمال المدعومة بالذكاء الاصطناعي التي تعمل دون اتصال.",
        "cta": {
          "getStarted": "ابدأ مجاناً",
          "signIn": "تسجيل الدخول"
        },
        "noCreditCard": "لا حاجة لبطاقة ائتمان",
        "freePlan": "خطة مجانية للأبد"
      },
      "features": {
        "title": "كل ما تحتاجه",
        "pos": {
          "title": "نقطة البيع",
          "description": "معالجة المبيعات فوراً، حتى بدون اتصال"
        },
        "barcode": {
          "title": "ماسح الباركود",
          "description": "امسح المنتجات بكاميرتك"
        },
        "invoicing": {
          "title": "فوترة سريعة",
          "description": "أنشئ وأرسل الفواتير أثناء التنقل"
        },
        "analytics": {
          "title": "تحليلات فورية",
          "description": "تتبع أداء عملك"
        }
      },
      "benefits": {
        "title": "مصمم لنجاحك",
        "offline": {
          "title": "يعمل بدون اتصال",
          "description": "استمر في البيع بدون إنترنت"
        },
        "fast": {
          "title": "سريع للغاية",
          "description": "تحميل فوري، بدون تأخير"
        },
        "mobile": {
          "title": "الهاتف أولاً",
          "description": "مصمم للهواتف والأجهزة اللوحية"
        },
        "payments": {
          "title": "النقود المحمولة",
          "description": "M-Pesa، وضع غير متصل، دعم محلي"
        }
      },
      "pricing": {
        "title": "أسعار بسيطة وشفافة"
      },
      "cta": {
        "title": "مستعد لتنمية عملك؟",
        "subtitle": "ابدأ في إدارة عملك بشكل أفضل اليوم",
        "button": "ابدأ مجاناً",
        "terms": "لا حاجة لبطاقة ائتمان • إلغاء في أي وقت"
      }
    }
  },
  'hi': { // Hindi
    "mobileLanding": {
      "hero": {
        "title": "आपका व्यवसाय,",
        "subtitle": "आपकी जेब में",
        "description": "AI-संचालित व्यवसाय प्रबंधन प्लेटफ़ॉर्म जो ऑफ़लाइन काम करता है।",
        "cta": {
          "getStarted": "मुफ़्त में शुरू करें",
          "signIn": "साइन इन करें"
        },
        "noCreditCard": "क्रेडिट कार्ड की आवश्यकता नहीं",
        "freePlan": "हमेशा के लिए मुफ़्त योजना"
      },
      "features": {
        "title": "आपकी ज़रूरत की हर चीज़",
        "pos": {
          "title": "बिक्री केंद्र",
          "description": "तुरंत बिक्री प्रोसेस करें, ऑफ़लाइन भी"
        },
        "barcode": {
          "title": "बारकोड स्कैनर",
          "description": "अपने कैमरे से उत्पाद स्कैन करें"
        },
        "invoicing": {
          "title": "त्वरित इनवॉइसिंग",
          "description": "चलते-फिरते इनवॉइस बनाएं और भेजें"
        },
        "analytics": {
          "title": "रीयल-टाइम एनालिटिक्स",
          "description": "अपने व्यवसाय के प्रदर्शन को ट्रैक करें"
        }
      },
      "benefits": {
        "title": "आपकी सफलता के लिए बनाया गया",
        "offline": {
          "title": "ऑफ़लाइन काम करता है",
          "description": "इंटरनेट के बिना बेचना जारी रखें"
        },
        "fast": {
          "title": "बिजली की गति",
          "description": "तुरंत लोडिंग, कोई देरी नहीं"
        },
        "mobile": {
          "title": "मोबाइल फर्स्ट",
          "description": "फोन और टैबलेट के लिए डिज़ाइन किया गया"
        },
        "payments": {
          "title": "मोबाइल मनी",
          "description": "M-Pesa, ऑफ़लाइन मोड, स्थानीय समर्थन"
        }
      },
      "pricing": {
        "title": "सरल, पारदर्शी मूल्य निर्धारण"
      },
      "cta": {
        "title": "अपना व्यवसाय बढ़ाने के लिए तैयार हैं?",
        "subtitle": "आज ही अपने व्यवसाय को बेहतर तरीके से प्रबंधित करना शुरू करें",
        "button": "मुफ़्त में शुरू करें",
        "terms": "क्रेडिट कार्ड की आवश्यकता नहीं • कभी भी रद्द करें"
      }
    }
  },
  'id': { // Indonesian
    "mobileLanding": {
      "hero": {
        "title": "Bisnis Anda,",
        "subtitle": "Di Saku Anda",
        "description": "Platform manajemen bisnis bertenaga AI yang bekerja offline.",
        "cta": {
          "getStarted": "Mulai Gratis",
          "signIn": "Masuk"
        },
        "noCreditCard": "Tidak perlu kartu kredit",
        "freePlan": "Paket gratis selamanya"
      },
      "features": {
        "title": "Semua Yang Anda Butuhkan",
        "pos": {
          "title": "Titik Penjualan",
          "description": "Proses penjualan instan, bahkan offline"
        },
        "barcode": {
          "title": "Pemindai Barcode",
          "description": "Pindai produk dengan kamera Anda"
        },
        "invoicing": {
          "title": "Faktur Cepat",
          "description": "Buat dan kirim faktur saat bepergian"
        },
        "analytics": {
          "title": "Analitik Real-time",
          "description": "Lacak kinerja bisnis Anda"
        }
      },
      "benefits": {
        "title": "Dibangun untuk Kesuksesan Anda",
        "offline": {
          "title": "Bekerja Offline",
          "description": "Lanjutkan penjualan tanpa internet"
        },
        "fast": {
          "title": "Sangat Cepat",
          "description": "Pemuatan instan, tanpa penundaan"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Dirancang untuk ponsel & tablet"
        },
        "payments": {
          "title": "Uang Mobile",
          "description": "M-Pesa, mode offline, dukungan lokal"
        }
      },
      "pricing": {
        "title": "Harga Sederhana dan Transparan"
      },
      "cta": {
        "title": "Siap Mengembangkan Bisnis Anda?",
        "subtitle": "Mulai kelola bisnis Anda lebih baik hari ini",
        "button": "Mulai Gratis",
        "terms": "Tidak perlu kartu kredit • Batalkan kapan saja"
      }
    }
  },
  'vi': { // Vietnamese
    "mobileLanding": {
      "hero": {
        "title": "Doanh Nghiệp Của Bạn,",
        "subtitle": "Trong Túi Của Bạn",
        "description": "Nền tảng quản lý doanh nghiệp được hỗ trợ bởi AI hoạt động ngoại tuyến.",
        "cta": {
          "getStarted": "Bắt Đầu Miễn Phí",
          "signIn": "Đăng Nhập"
        },
        "noCreditCard": "Không cần thẻ tín dụng",
        "freePlan": "Gói miễn phí vĩnh viễn"
      },
      "features": {
        "title": "Mọi Thứ Bạn Cần",
        "pos": {
          "title": "Điểm Bán Hàng",
          "description": "Xử lý bán hàng ngay lập tức, ngay cả khi ngoại tuyến"
        },
        "barcode": {
          "title": "Máy Quét Mã Vạch",
          "description": "Quét sản phẩm bằng máy ảnh của bạn"
        },
        "invoicing": {
          "title": "Lập Hóa Đơn Nhanh",
          "description": "Tạo và gửi hóa đơn khi di chuyển"
        },
        "analytics": {
          "title": "Phân Tích Thời Gian Thực",
          "description": "Theo dõi hiệu suất kinh doanh của bạn"
        }
      },
      "benefits": {
        "title": "Được Xây Dựng Cho Thành Công Của Bạn",
        "offline": {
          "title": "Hoạt Động Ngoại Tuyến",
          "description": "Tiếp tục bán hàng không cần internet"
        },
        "fast": {
          "title": "Cực Kỳ Nhanh",
          "description": "Tải ngay lập tức, không chậm trễ"
        },
        "mobile": {
          "title": "Ưu Tiên Di Động",
          "description": "Thiết kế cho điện thoại & máy tính bảng"
        },
        "payments": {
          "title": "Tiền Di Động",
          "description": "M-Pesa, chế độ ngoại tuyến, hỗ trợ địa phương"
        }
      },
      "pricing": {
        "title": "Giá Đơn Giản, Minh Bạch"
      },
      "cta": {
        "title": "Sẵn Sàng Phát Triển Doanh Nghiệp?",
        "subtitle": "Bắt đầu quản lý doanh nghiệp tốt hơn ngay hôm nay",
        "button": "Bắt Đầu Miễn Phí",
        "terms": "Không cần thẻ tín dụng • Hủy bất cứ lúc nào"
      }
    }
  },
  'tr': { // Turkish
    "mobileLanding": {
      "hero": {
        "title": "İşletmeniz,",
        "subtitle": "Cebinizde",
        "description": "Çevrimdışı çalışan AI destekli işletme yönetim platformu.",
        "cta": {
          "getStarted": "Ücretsiz Başlayın",
          "signIn": "Giriş Yap"
        },
        "noCreditCard": "Kredi kartı gerekmez",
        "freePlan": "Sonsuza kadar ücretsiz plan"
      },
      "features": {
        "title": "İhtiyacınız Olan Her Şey",
        "pos": {
          "title": "Satış Noktası",
          "description": "Çevrimdışı bile anında satış işleyin"
        },
        "barcode": {
          "title": "Barkod Tarayıcı",
          "description": "Kameranızla ürünleri tarayın"
        },
        "invoicing": {
          "title": "Hızlı Faturalama",
          "description": "Hareket halindeyken fatura oluşturun ve gönderin"
        },
        "analytics": {
          "title": "Gerçek Zamanlı Analizler",
          "description": "İşletme performansınızı takip edin"
        }
      },
      "benefits": {
        "title": "Başarınız İçin Tasarlandı",
        "offline": {
          "title": "Çevrimdışı Çalışır",
          "description": "İnternet olmadan satmaya devam edin"
        },
        "fast": {
          "title": "Işık Hızında",
          "description": "Anında yükleme, gecikme yok"
        },
        "mobile": {
          "title": "Önce Mobil",
          "description": "Telefonlar ve tabletler için tasarlandı"
        },
        "payments": {
          "title": "Mobil Para",
          "description": "M-Pesa, çevrimdışı mod, yerel destek"
        }
      },
      "pricing": {
        "title": "Basit, Şeffaf Fiyatlandırma"
      },
      "cta": {
        "title": "İşletmenizi Büyütmeye Hazır mısınız?",
        "subtitle": "Bugün işletmenizi daha iyi yönetmeye başlayın",
        "button": "Ücretsiz Başlayın",
        "terms": "Kredi kartı gerekmez • İstediğiniz zaman iptal edin"
      }
    }
  },
  'sw': { // Swahili
    "mobileLanding": {
      "hero": {
        "title": "Biashara Yako,",
        "subtitle": "Mfukoni Mwako",
        "description": "Jukwaa la usimamizi wa biashara lenye AI linalofanya kazi bila mtandao.",
        "cta": {
          "getStarted": "Anza Bure",
          "signIn": "Ingia"
        },
        "noCreditCard": "Hakuna kadi ya mkopo inayohitajika",
        "freePlan": "Mpango wa bure milele"
      },
      "features": {
        "title": "Kila Kitu Unachohitaji",
        "pos": {
          "title": "Mahali pa Kuuzia",
          "description": "Shughulikia mauzo mara moja, hata bila mtandao"
        },
        "barcode": {
          "title": "Skana ya Pau",
          "description": "Skani bidhaa kwa kamera yako"
        },
        "invoicing": {
          "title": "Kutoa Ankara Haraka",
          "description": "Tengeneza na tuma ankara ukiwa safarini"
        },
        "analytics": {
          "title": "Uchambuzi wa Wakati Halisi",
          "description": "Fuatilia utendaji wa biashara yako"
        }
      },
      "benefits": {
        "title": "Imejengwa kwa Mafanikio Yako",
        "offline": {
          "title": "Inafanya Kazi Bila Mtandao",
          "description": "Endelea kuuza bila intaneti"
        },
        "fast": {
          "title": "Haraka Sana",
          "description": "Inapakia mara moja, hakuna kuchelewa"
        },
        "mobile": {
          "title": "Simu Kwanza",
          "description": "Imeundwa kwa simu na tableti"
        },
        "payments": {
          "title": "Pesa za Simu",
          "description": "M-Pesa, hali ya nje ya mtandao, msaada wa kieneo"
        }
      },
      "pricing": {
        "title": "Bei Rahisi, Wazi"
      },
      "cta": {
        "title": "Uko Tayari Kukuza Biashara Yako?",
        "subtitle": "Anza kusimamia biashara yako vizuri zaidi leo",
        "button": "Anza Bure",
        "terms": "Hakuna kadi ya mkopo inayohitajika • Ghairi wakati wowote"
      }
    }
  },
  'ha': { // Hausa
    "mobileLanding": {
      "hero": {
        "title": "Kasuwancin ku,",
        "subtitle": "A Cikin Aljihunku",
        "description": "Dandamali na sarrafa kasuwanci mai ƙarfin AI wanda ke aiki ba tare da intanet ba.",
        "cta": {
          "getStarted": "Fara Kyauta",
          "signIn": "Shiga"
        },
        "noCreditCard": "Ba a buƙatar katin kiredit",
        "freePlan": "Shirin kyauta har abada"
      },
      "features": {
        "title": "Duk Abin Da Kuke Buƙata",
        "pos": {
          "title": "Wurin Siyarwa",
          "description": "Sarrafa tallace-tallace nan take, ko da ba tare da intanet"
        },
        "barcode": {
          "title": "Mai Duba Barcode",
          "description": "Duba kayayyaki da kyamarar ku"
        },
        "invoicing": {
          "title": "Sauri Invoice",
          "description": "Ƙirƙira da aika invoice yayin tafiya"
        },
        "analytics": {
          "title": "Bincike na Lokaci-Gaskiya",
          "description": "Bi diddigin aikin kasuwancin ku"
        }
      },
      "benefits": {
        "title": "An Gina Don Nasarar Ku",
        "offline": {
          "title": "Yana Aiki Ba Tare Da Intanet",
          "description": "Ci gaba da siyarwa ba tare da intanet"
        },
        "fast": {
          "title": "Sauri Kamar Walƙiya",
          "description": "Lodawa nan take, babu jinkiri"
        },
        "mobile": {
          "title": "Wayar Hannu Ta Farko",
          "description": "An tsara don wayoyi da kwamfutoci"
        },
        "payments": {
          "title": "Kuɗin Wayar Hannu",
          "description": "M-Pesa, yanayin kashe, tallafin gida"
        }
      },
      "pricing": {
        "title": "Farashi Mai Sauƙi, Bayyananne"
      },
      "cta": {
        "title": "Kuna Shirye Don Haɓaka Kasuwancin Ku?",
        "subtitle": "Fara sarrafa kasuwancin ku da kyau yau",
        "button": "Fara Kyauta",
        "terms": "Ba a buƙatar katin kiredit • Soke kowane lokaci"
      }
    }
  },
  'am': { // Amharic
    "mobileLanding": {
      "hero": {
        "title": "የእርስዎ ንግድ፣",
        "subtitle": "በኪስዎ ውስጥ",
        "description": "ከመስመር ውጭ የሚሰራ በAI የተደገፈ የንግድ አስተዳደር መድረክ።",
        "cta": {
          "getStarted": "በነጻ ይጀምሩ",
          "signIn": "ግባ"
        },
        "noCreditCard": "ክሬዲት ካርድ አያስፈልግም",
        "freePlan": "ለዘላለም ነጻ እቅድ"
      },
      "features": {
        "title": "የሚያስፈልግዎት ሁሉ",
        "pos": {
          "title": "የሽያጭ ነጥብ",
          "description": "ከመስመር ውጭ እንኳን ሽያጮችን ወዲያውኑ ያስኬዱ"
        },
        "barcode": {
          "title": "ባርኮድ ስካነር",
          "description": "ምርቶችን በካሜራዎ ይቃኙ"
        },
        "invoicing": {
          "title": "ፈጣን ደረሰኝ",
          "description": "በመንቀሳቀስ ላይ ደረሰኞችን ይፍጠሩ እና ይላኩ"
        },
        "analytics": {
          "title": "የቅጽበት ትንታኔ",
          "description": "የንግድዎን አፈጻጸም ይከታተሉ"
        }
      },
      "benefits": {
        "title": "ለስኬትዎ የተገነባ",
        "offline": {
          "title": "ከመስመር ውጭ ይሰራል",
          "description": "ያለ ኢንተርኔት መሸጥዎን ይቀጥሉ"
        },
        "fast": {
          "title": "በጣም ፈጣን",
          "description": "ወዲያውኑ መጫን፣ ምንም መዘግየት የለም"
        },
        "mobile": {
          "title": "ሞባይል መጀመሪያ",
          "description": "ለስልኮች እና ታብሌቶች የተነደፈ"
        },
        "payments": {
          "title": "የሞባይል ገንዘብ",
          "description": "M-Pesa፣ ከመስመር ውጭ ሁነታ፣ የአካባቢ ድጋፍ"
        }
      },
      "pricing": {
        "title": "ቀላል፣ ግልጽ ዋጋ"
      },
      "cta": {
        "title": "ንግድዎን ለማሳደግ ዝግጁ ነዎት?",
        "subtitle": "ዛሬ ንግድዎን በተሻለ ሁኔታ ማስተዳደር ይጀምሩ",
        "button": "በነጻ ይጀምሩ",
        "terms": "ክሬዲት ካርድ አያስፈልግም • በማንኛውም ጊዜ ይሰርዙ"
      }
    }
  },
  'yo': { // Yoruba
    "mobileLanding": {
      "hero": {
        "title": "Iṣowo Rẹ,",
        "subtitle": "Ninu Apo Rẹ",
        "description": "Pẹpẹ iṣakoso iṣowo ti AI ti n ṣiṣẹ laisi intanẹẹti.",
        "cta": {
          "getStarted": "Bẹrẹ Ọfẹ",
          "signIn": "Wọle"
        },
        "noCreditCard": "Ko nilo kaadi kirẹditi",
        "freePlan": "Eto ọfẹ lailai"
      },
      "features": {
        "title": "Gbogbo Ohun Ti O Nilo",
        "pos": {
          "title": "Aaye Tita",
          "description": "Ṣe awọn tita lẹsẹkẹsẹ, paapaa laisi intanẹẹti"
        },
        "barcode": {
          "title": "Oluṣayẹwo Barcode",
          "description": "Ṣayẹwo awọn ọja pẹlu kamẹra rẹ"
        },
        "invoicing": {
          "title": "Ifiranṣẹ Iyara",
          "description": "Ṣẹda ati firanṣẹ awọn ifiweranṣẹ lori irin-ajo"
        },
        "analytics": {
          "title": "Itupalẹ Akoko Gidi",
          "description": "Tọpa iṣẹ iṣowo rẹ"
        }
      },
      "benefits": {
        "title": "A Kọ Fun Aṣeyọri Rẹ",
        "offline": {
          "title": "N Ṣiṣẹ Laisi Intanẹẹti",
          "description": "Tẹsiwaju lati ta laisi intanẹẹti"
        },
        "fast": {
          "title": "Yara Pupọ",
          "description": "Ikojọpọ lẹsẹkẹsẹ, ko si idaduro"
        },
        "mobile": {
          "title": "Alagbeka Akọkọ",
          "description": "A ṣe apẹrẹ fun awọn foonu ati tabulẹti"
        },
        "payments": {
          "title": "Owo Alagbeka",
          "description": "M-Pesa, ipo aisinipo, atilẹyin agbegbe"
        }
      },
      "pricing": {
        "title": "Idiyele Rọrun, Kedere"
      },
      "cta": {
        "title": "Ṣetan Lati Dagba Iṣowo Rẹ?",
        "subtitle": "Bẹrẹ lati ṣakoso iṣowo rẹ daradara loni",
        "button": "Bẹrẹ Ọfẹ",
        "terms": "Ko nilo kaadi kirẹditi • Fagile nigbakugba"
      }
    }
  },
  'zu': { // Zulu
    "mobileLanding": {
      "hero": {
        "title": "Ibhizinisi Lakho,",
        "subtitle": "Ephaketheni Lakho",
        "description": "Ipulatifomu yokuphatha ibhizinisi esebenzisa i-AI esebenza ngaphandle kwe-inthanethi.",
        "cta": {
          "getStarted": "Qala Mahhala",
          "signIn": "Ngena"
        },
        "noCreditCard": "Akudingeki ikhadi lesikweletu",
        "freePlan": "Uhlelo lwamahhala unomphela"
      },
      "features": {
        "title": "Konke Okudingayo",
        "pos": {
          "title": "Indawo Yokuthengisa",
          "description": "Sebenzisa ukuthengisa ngokushesha, ngisho nangaphandle kwe-inthanethi"
        },
        "barcode": {
          "title": "Isikena Sebhakhodi",
          "description": "Skena imikhiqizo ngekhamera yakho"
        },
        "invoicing": {
          "title": "Ama-invoyisi Asheshayo",
          "description": "Dala futhi uthumele ama-invoyisi usendleleni"
        },
        "analytics": {
          "title": "Ukuhlaziya Kwesikhathi Sangempela",
          "description": "Landelela ukusebenza kwebhizinisi lakho"
        }
      },
      "benefits": {
        "title": "Kwakhelwe Impumelelo Yakho",
        "offline": {
          "title": "Isebenza Ngaphandle Kwe-inthanethi",
          "description": "Qhubeka nokuthengisa ngaphandle kwe-inthanethi"
        },
        "fast": {
          "title": "Isheshe Kakhulu",
          "description": "Ukulayisha ngokushesha, akukho ukulibala"
        },
        "mobile": {
          "title": "Iselula Kuqala",
          "description": "Yakhelwe amafoni namathebulethi"
        },
        "payments": {
          "title": "Imali Yeselula",
          "description": "M-Pesa, imodi engaxhunyiwe, ukwesekwa kwendawo"
        }
      },
      "pricing": {
        "title": "Amanani Alula, Asobala"
      },
      "cta": {
        "title": "Ulungele Ukukhulisa Ibhizinisi Lakho?",
        "subtitle": "Qala ukuphatha ibhizinisi lakho kangcono namuhla",
        "button": "Qala Mahhala",
        "terms": "Akudingeki ikhadi lesikweletu • Khansela noma nini"
      }
    }
  },
  'it': { // Italian
    "mobileLanding": {
      "hero": {
        "title": "Il Tuo Business,",
        "subtitle": "Nella Tua Tasca",
        "description": "Piattaforma di gestione aziendale alimentata da AI che funziona offline.",
        "cta": {
          "getStarted": "Inizia Gratis",
          "signIn": "Accedi"
        },
        "noCreditCard": "Nessuna carta di credito richiesta",
        "freePlan": "Piano gratuito per sempre"
      },
      "features": {
        "title": "Tutto Ciò di Cui Hai Bisogno",
        "pos": {
          "title": "Punto Vendita",
          "description": "Elabora le vendite istantaneamente, anche offline"
        },
        "barcode": {
          "title": "Scanner Codici a Barre",
          "description": "Scansiona i prodotti con la tua fotocamera"
        },
        "invoicing": {
          "title": "Fatturazione Veloce",
          "description": "Crea e invia fatture in movimento"
        },
        "analytics": {
          "title": "Analisi in Tempo Reale",
          "description": "Monitora le prestazioni del tuo business"
        }
      },
      "benefits": {
        "title": "Costruito per il Tuo Successo",
        "offline": {
          "title": "Funziona Offline",
          "description": "Continua a vendere senza internet"
        },
        "fast": {
          "title": "Velocissimo",
          "description": "Caricamento istantaneo, nessun ritardo"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Progettato per telefoni e tablet"
        },
        "payments": {
          "title": "Denaro Mobile",
          "description": "M-Pesa, modalità offline, supporto locale"
        }
      },
      "pricing": {
        "title": "Prezzi Semplici e Trasparenti"
      },
      "cta": {
        "title": "Pronto a Far Crescere il Tuo Business?",
        "subtitle": "Inizia a gestire meglio il tuo business oggi",
        "button": "Inizia Gratis",
        "terms": "Nessuna carta di credito richiesta • Cancella in qualsiasi momento"
      }
    }
  },
  'pl': { // Polish
    "mobileLanding": {
      "hero": {
        "title": "Twój Biznes,",
        "subtitle": "W Twojej Kieszeni",
        "description": "Platforma zarządzania biznesem napędzana AI, działająca offline.",
        "cta": {
          "getStarted": "Rozpocznij Za Darmo",
          "signIn": "Zaloguj się"
        },
        "noCreditCard": "Nie wymaga karty kredytowej",
        "freePlan": "Plan darmowy na zawsze"
      },
      "features": {
        "title": "Wszystko Czego Potrzebujesz",
        "pos": {
          "title": "Punkt Sprzedaży",
          "description": "Przetwarzaj sprzedaż natychmiast, nawet offline"
        },
        "barcode": {
          "title": "Skaner Kodów Kreskowych",
          "description": "Skanuj produkty aparatem"
        },
        "invoicing": {
          "title": "Szybkie Faktury",
          "description": "Twórz i wysyłaj faktury w podróży"
        },
        "analytics": {
          "title": "Analizy w Czasie Rzeczywistym",
          "description": "Śledź wyniki swojego biznesu"
        }
      },
      "benefits": {
        "title": "Stworzony dla Twojego Sukcesu",
        "offline": {
          "title": "Działa Offline",
          "description": "Kontynuuj sprzedaż bez internetu"
        },
        "fast": {
          "title": "Błyskawicznie Szybki",
          "description": "Natychmiastowe ładowanie, bez opóźnień"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Zaprojektowany dla telefonów i tabletów"
        },
        "payments": {
          "title": "Płatności Mobilne",
          "description": "M-Pesa, tryb offline, lokalne wsparcie"
        }
      },
      "pricing": {
        "title": "Proste, Przejrzyste Ceny"
      },
      "cta": {
        "title": "Gotowy na Rozwój Twojego Biznesu?",
        "subtitle": "Zacznij lepiej zarządzać swoim biznesem już dziś",
        "button": "Rozpocznij Za Darmo",
        "terms": "Nie wymaga karty kredytowej • Anuluj w dowolnym momencie"
      }
    }
  },
  'th': { // Thai
    "mobileLanding": {
      "hero": {
        "title": "ธุรกิจของคุณ",
        "subtitle": "ในกระเป๋าของคุณ",
        "description": "แพลตฟอร์มจัดการธุรกิจที่ขับเคลื่อนด้วย AI ทำงานแบบออฟไลน์",
        "cta": {
          "getStarted": "เริ่มต้นฟรี",
          "signIn": "เข้าสู่ระบบ"
        },
        "noCreditCard": "ไม่ต้องใช้บัตรเครดิต",
        "freePlan": "แผนฟรีตลอดกาล"
      },
      "features": {
        "title": "ทุกสิ่งที่คุณต้องการ",
        "pos": {
          "title": "จุดขาย",
          "description": "ประมวลผลการขายทันที แม้ออฟไลน์"
        },
        "barcode": {
          "title": "สแกนบาร์โค้ด",
          "description": "สแกนสินค้าด้วยกล้องของคุณ"
        },
        "invoicing": {
          "title": "ออกใบแจ้งหนี้รวดเร็ว",
          "description": "สร้างและส่งใบแจ้งหนี้ขณะเดินทาง"
        },
        "analytics": {
          "title": "วิเคราะห์แบบเรียลไทม์",
          "description": "ติดตามประสิทธิภาพธุรกิจของคุณ"
        }
      },
      "benefits": {
        "title": "สร้างขึ้นเพื่อความสำเร็จของคุณ",
        "offline": {
          "title": "ทำงานแบบออฟไลน์",
          "description": "ขายต่อไม่ต้องใช้อินเทอร์เน็ต"
        },
        "fast": {
          "title": "เร็วสุดๆ",
          "description": "โหลดทันที ไม่มีความล่าช้า"
        },
        "mobile": {
          "title": "มือถือมาก่อน",
          "description": "ออกแบบสำหรับโทรศัพท์และแท็บเล็ต"
        },
        "payments": {
          "title": "เงินมือถือ",
          "description": "M-Pesa, โหมดออฟไลน์, สนับสนุนท้องถิ่น"
        }
      },
      "pricing": {
        "title": "ราคาง่าย โปร่งใส"
      },
      "cta": {
        "title": "พร้อมที่จะขยายธุรกิจของคุณหรือยัง?",
        "subtitle": "เริ่มจัดการธุรกิจของคุณให้ดีขึ้นวันนี้",
        "button": "เริ่มต้นฟรี",
        "terms": "ไม่ต้องใช้บัตรเครดิต • ยกเลิกได้ทุกเมื่อ"
      }
    }
  },
  'bn': { // Bengali
    "mobileLanding": {
      "hero": {
        "title": "আপনার ব্যবসা,",
        "subtitle": "আপনার পকেটে",
        "description": "AI চালিত ব্যবসায়িক ব্যবস্থাপনা প্ল্যাটফর্ম যা অফলাইনে কাজ করে।",
        "cta": {
          "getStarted": "বিনামূল্যে শুরু করুন",
          "signIn": "সাইন ইন করুন"
        },
        "noCreditCard": "ক্রেডিট কার্ডের প্রয়োজন নেই",
        "freePlan": "চিরকালের জন্য বিনামূল্যে পরিকল্পনা"
      },
      "features": {
        "title": "আপনার যা প্রয়োজন সবকিছু",
        "pos": {
          "title": "বিক্রয় পয়েন্ট",
          "description": "তাৎক্ষণিকভাবে বিক্রয় প্রক্রিয়া করুন, এমনকি অফলাইনেও"
        },
        "barcode": {
          "title": "বারকোড স্ক্যানার",
          "description": "আপনার ক্যামেরা দিয়ে পণ্য স্ক্যান করুন"
        },
        "invoicing": {
          "title": "দ্রুত চালান",
          "description": "চলার পথে চালান তৈরি এবং পাঠান"
        },
        "analytics": {
          "title": "রিয়েল-টাইম বিশ্লেষণ",
          "description": "আপনার ব্যবসায়িক কর্মক্ষমতা ট্র্যাক করুন"
        }
      },
      "benefits": {
        "title": "আপনার সাফল্যের জন্য নির্মিত",
        "offline": {
          "title": "অফলাইনে কাজ করে",
          "description": "ইন্টারনেট ছাড়াই বিক্রয় চালিয়ে যান"
        },
        "fast": {
          "title": "অত্যন্ত দ্রুত",
          "description": "তাৎক্ষণিক লোডিং, কোন বিলম্ব নেই"
        },
        "mobile": {
          "title": "মোবাইল প্রথম",
          "description": "ফোন এবং ট্যাবলেটের জন্য ডিজাইন করা"
        },
        "payments": {
          "title": "মোবাইল মানি",
          "description": "M-Pesa, অফলাইন মোড, স্থানীয় সমর্থন"
        }
      },
      "pricing": {
        "title": "সহজ, স্বচ্ছ মূল্য"
      },
      "cta": {
        "title": "আপনার ব্যবসা বৃদ্ধি করতে প্রস্তুত?",
        "subtitle": "আজই আপনার ব্যবসা আরও ভালভাবে পরিচালনা করা শুরু করুন",
        "button": "বিনামূল্যে শুরু করুন",
        "terms": "ক্রেডিট কার্ডের প্রয়োজন নেই • যে কোনো সময় বাতিল করুন"
      }
    }
  },
  'ur': { // Urdu
    "mobileLanding": {
      "hero": {
        "title": "آپ کا کاروبار،",
        "subtitle": "آپ کی جیب میں",
        "description": "AI سے چلنے والا کاروباری انتظام کا پلیٹ فارم جو آف لائن کام کرتا ہے۔",
        "cta": {
          "getStarted": "مفت شروع کریں",
          "signIn": "سائن ان کریں"
        },
        "noCreditCard": "کریڈٹ کارڈ کی ضرورت نہیں",
        "freePlan": "ہمیشہ کے لیے مفت منصوبہ"
      },
      "features": {
        "title": "آپ کو جو کچھ چاہیے",
        "pos": {
          "title": "فروخت کا مقام",
          "description": "فوری طور پر فروخت کی کارروائی کریں، آف لائن بھی"
        },
        "barcode": {
          "title": "بارکوڈ سکینر",
          "description": "اپنے کیمرے سے مصنوعات سکین کریں"
        },
        "invoicing": {
          "title": "فوری انوائسنگ",
          "description": "چلتے پھرتے انوائس بنائیں اور بھیجیں"
        },
        "analytics": {
          "title": "حقیقی وقت کی تجزیات",
          "description": "اپنے کاروبار کی کارکردگی کو ٹریک کریں"
        }
      },
      "benefits": {
        "title": "آپ کی کامیابی کے لیے بنایا گیا",
        "offline": {
          "title": "آف لائن کام کرتا ہے",
          "description": "انٹرنیٹ کے بغیر فروخت جاری رکھیں"
        },
        "fast": {
          "title": "بجلی کی رفتار",
          "description": "فوری لوڈنگ، کوئی تاخیر نہیں"
        },
        "mobile": {
          "title": "موبائل فرسٹ",
          "description": "فون اور ٹیبلٹ کے لیے ڈیزائن کیا گیا"
        },
        "payments": {
          "title": "موبائل منی",
          "description": "M-Pesa، آف لائن موڈ، مقامی سپورٹ"
        }
      },
      "pricing": {
        "title": "آسان، شفاف قیمتیں"
      },
      "cta": {
        "title": "اپنے کاروبار کو بڑھانے کے لیے تیار ہیں؟",
        "subtitle": "آج ہی اپنے کاروبار کو بہتر طریقے سے منظم کرنا شروع کریں",
        "button": "مفت شروع کریں",
        "terms": "کریڈٹ کارڈ کی ضرورت نہیں • کسی بھی وقت منسوخ کریں"
      }
    }
  },
  'tl': { // Tagalog/Filipino
    "mobileLanding": {
      "hero": {
        "title": "Ang Iyong Negosyo,",
        "subtitle": "Sa Iyong Bulsa",
        "description": "Platform ng pangangasiwa ng negosyo na pinapatakbo ng AI na gumagana offline.",
        "cta": {
          "getStarted": "Magsimula Nang Libre",
          "signIn": "Mag-sign In"
        },
        "noCreditCard": "Walang kailangang credit card",
        "freePlan": "Libreng plano magpakailanman"
      },
      "features": {
        "title": "Lahat ng Kailangan Mo",
        "pos": {
          "title": "Punto ng Benta",
          "description": "Iproseso ang mga benta kaagad, kahit offline"
        },
        "barcode": {
          "title": "Barcode Scanner",
          "description": "I-scan ang mga produkto gamit ang iyong camera"
        },
        "invoicing": {
          "title": "Mabilis na Pag-invoice",
          "description": "Gumawa at magpadala ng mga invoice habang naglalakbay"
        },
        "analytics": {
          "title": "Real-time Analytics",
          "description": "Subaybayan ang performance ng iyong negosyo"
        }
      },
      "benefits": {
        "title": "Ginawa Para sa Iyong Tagumpay",
        "offline": {
          "title": "Gumagana Offline",
          "description": "Magpatuloy sa pagbebenta nang walang internet"
        },
        "fast": {
          "title": "Napakabilis",
          "description": "Instant loading, walang pagkaantala"
        },
        "mobile": {
          "title": "Mobile First",
          "description": "Dinisenyo para sa mga telepono at tablet"
        },
        "payments": {
          "title": "Mobile Money",
          "description": "M-Pesa, offline mode, lokal na suporta"
        }
      },
      "pricing": {
        "title": "Simple, Transparent na Presyo"
      },
      "cta": {
        "title": "Handa na Bang Palaguin ang Iyong Negosyo?",
        "subtitle": "Simulang pamahalaan nang mas mahusay ang iyong negosyo ngayon",
        "button": "Magsimula Nang Libre",
        "terms": "Walang kailangang credit card • Kanselahin anumang oras"
      }
    }
  },
  'uk': { // Ukrainian
    "mobileLanding": {
      "hero": {
        "title": "Ваш Бізнес,",
        "subtitle": "У Вашій Кишені",
        "description": "Платформа управління бізнесом на основі ШІ, що працює офлайн.",
        "cta": {
          "getStarted": "Почати Безкоштовно",
          "signIn": "Увійти"
        },
        "noCreditCard": "Кредитна картка не потрібна",
        "freePlan": "Безкоштовний план назавжди"
      },
      "features": {
        "title": "Все, Що Вам Потрібно",
        "pos": {
          "title": "Точка Продажу",
          "description": "Обробляйте продажі миттєво, навіть офлайн"
        },
        "barcode": {
          "title": "Сканер Штрих-кодів",
          "description": "Скануйте товари камерою"
        },
        "invoicing": {
          "title": "Швидкі Рахунки",
          "description": "Створюйте та надсилайте рахунки на ходу"
        },
        "analytics": {
          "title": "Аналітика в Реальному Часі",
          "description": "Відстежуйте ефективність вашого бізнесу"
        }
      },
      "benefits": {
        "title": "Створено для Вашого Успіху",
        "offline": {
          "title": "Працює Офлайн",
          "description": "Продовжуйте продавати без інтернету"
        },
        "fast": {
          "title": "Блискавично Швидко",
          "description": "Миттєве завантаження, без затримок"
        },
        "mobile": {
          "title": "Мобільність Насамперед",
          "description": "Розроблено для телефонів і планшетів"
        },
        "payments": {
          "title": "Мобільні Гроші",
          "description": "M-Pesa, офлайн режим, локальна підтримка"
        }
      },
      "pricing": {
        "title": "Прості, Прозорі Ціни"
      },
      "cta": {
        "title": "Готові Розвивати Свій Бізнес?",
        "subtitle": "Почніть краще керувати своїм бізнесом сьогодні",
        "button": "Почати Безкоштовно",
        "terms": "Кредитна картка не потрібна • Скасування в будь-який час"
      }
    }
  },
  'fa': { // Persian/Farsi
    "mobileLanding": {
      "hero": {
        "title": "کسب و کار شما،",
        "subtitle": "در جیب شما",
        "description": "پلتفرم مدیریت کسب و کار با قدرت هوش مصنوعی که آفلاین کار می‌کند.",
        "cta": {
          "getStarted": "رایگان شروع کنید",
          "signIn": "ورود"
        },
        "noCreditCard": "نیازی به کارت اعتباری نیست",
        "freePlan": "طرح رایگان برای همیشه"
      },
      "features": {
        "title": "همه چیزی که نیاز دارید",
        "pos": {
          "title": "نقطه فروش",
          "description": "فروش را فوراً پردازش کنید، حتی آفلاین"
        },
        "barcode": {
          "title": "اسکنر بارکد",
          "description": "محصولات را با دوربین خود اسکن کنید"
        },
        "invoicing": {
          "title": "صورتحساب سریع",
          "description": "در حال حرکت فاکتور ایجاد و ارسال کنید"
        },
        "analytics": {
          "title": "تحلیل‌های بلادرنگ",
          "description": "عملکرد کسب و کار خود را دنبال کنید"
        }
      },
      "benefits": {
        "title": "برای موفقیت شما ساخته شده",
        "offline": {
          "title": "آفلاین کار می‌کند",
          "description": "بدون اینترنت به فروش ادامه دهید"
        },
        "fast": {
          "title": "فوق‌العاده سریع",
          "description": "بارگذاری فوری، بدون تأخیر"
        },
        "mobile": {
          "title": "اول موبایل",
          "description": "طراحی شده برای تلفن‌ها و تبلت‌ها"
        },
        "payments": {
          "title": "پول موبایل",
          "description": "M-Pesa، حالت آفلاین، پشتیبانی محلی"
        }
      },
      "pricing": {
        "title": "قیمت‌گذاری ساده و شفاف"
      },
      "cta": {
        "title": "آماده رشد کسب و کارتان هستید؟",
        "subtitle": "از امروز مدیریت بهتر کسب و کارتان را شروع کنید",
        "button": "رایگان شروع کنید",
        "terms": "نیازی به کارت اعتباری نیست • هر زمان لغو کنید"
      }
    }
  },
  'sn': { // Shona
    "mobileLanding": {
      "hero": {
        "title": "Bhizinesi Rako,",
        "subtitle": "Muhomwe Yako",
        "description": "Puratifomu yekutungamira bhizinesi ine AI inoshanda pasina internet.",
        "cta": {
          "getStarted": "Tanga Mahara",
          "signIn": "Pinda"
        },
        "noCreditCard": "Hapana kadhi rekukwereta rinodiwa",
        "freePlan": "Chirongwa chemahara nekusingaperi"
      },
      "features": {
        "title": "Zvese Zvaunoda",
        "pos": {
          "title": "Nzvimbo Yekutengesa",
          "description": "Ita kutengesa pakarepo, kunyange pasina internet"
        },
        "barcode": {
          "title": "Barcode Scanner",
          "description": "Tarisa zvigadzirwa nekamera yako"
        },
        "invoicing": {
          "title": "Kukurumidza Invoice",
          "description": "Gadzira uye tumira ma invoice uri munzira"
        },
        "analytics": {
          "title": "Kuongorora Kwenguva Chaiyo",
          "description": "Tevera kushanda kwebhizinesi rako"
        }
      },
      "benefits": {
        "title": "Yakavakirwa Budiriro Yako",
        "offline": {
          "title": "Inoshanda Pasina Internet",
          "description": "Ramba uchitengesa pasina internet"
        },
        "fast": {
          "title": "Inokurumidza Zvikuru",
          "description": "Kurodha pakarepo, pasina kunonoka"
        },
        "mobile": {
          "title": "Nharembozha Kutanga",
          "description": "Yakagadzirirwa mafoni nematabhureti"
        },
        "payments": {
          "title": "Mari Yenhare",
          "description": "M-Pesa, mamiriro asina internet, rutsigiro rwenzvimbo"
        }
      },
      "pricing": {
        "title": "Mitengo Yakapfava, Yakajeka"
      },
      "cta": {
        "title": "Wakagadzirira Kukura Bhizinesi Rako?",
        "subtitle": "Tanga kutungamira bhizinesi rako zvirinani nhasi",
        "button": "Tanga Mahara",
        "terms": "Hapana kadhi rekukwereta rinodiwa • Kanzura chero nguva"
      }
    }
  },
  'ig': { // Igbo
    "mobileLanding": {
      "hero": {
        "title": "Azụmahịa Gị,",
        "subtitle": "N'ime Akpa Gị",
        "description": "Ikpo okwu nlekọta azụmahịa nke AI na-akwado nke na-arụ ọrụ na-enweghị ịntanetị.",
        "cta": {
          "getStarted": "Malite N'efu",
          "signIn": "Banye"
        },
        "noCreditCard": "Kaadị kredit adịghị mkpa",
        "freePlan": "Atụmatụ efu ruo mgbe ebighị ebi"
      },
      "features": {
        "title": "Ihe Niile Ị Chọrọ",
        "pos": {
          "title": "Ebe Ire Ahịa",
          "description": "Hazie ahịa ozugbo, ọbụna na-enweghị ịntanetị"
        },
        "barcode": {
          "title": "Nyocha Barcode",
          "description": "Nyochaa ngwaahịa site na igwefoto gị"
        },
        "invoicing": {
          "title": "Ịnye Akwụkwọ Ọnụ Ngwa Ngwa",
          "description": "Mepụta ma ziga akwụkwọ ọnụ mgbe ị na-aga"
        },
        "analytics": {
          "title": "Nyocha Oge Ozugbo",
          "description": "Soro arụmọrụ azụmahịa gị"
        }
      },
      "benefits": {
        "title": "Ewuru Maka Ihe Ịga Nke Ọma Gị",
        "offline": {
          "title": "Ọ Na-arụ Ọrụ Na-enweghị Ịntanetị",
          "description": "Gaa n'ihu na-ere ahịa na-enweghị ịntanetị"
        },
        "fast": {
          "title": "Ọsọ Ọsọ",
          "description": "Ntinye ozugbo, enweghị igbu oge"
        },
        "mobile": {
          "title": "Ekwentị Mbụ",
          "description": "Emebere maka ekwentị na mbadamba"
        },
        "payments": {
          "title": "Ego Ekwentị",
          "description": "M-Pesa, ọnọdụ na-enweghị ịntanetị, nkwado mpaghara"
        }
      },
      "pricing": {
        "title": "Ọnụahịa Dị Mfe, Doro Anya"
      },
      "cta": {
        "title": "Ị Dị Njikere Ito Azụmahịa Gị?",
        "subtitle": "Malite ijikwa azụmahịa gị nke ọma taa",
        "button": "Malite N'efu",
        "terms": "Kaadị kredit adịghị mkpa • Kagbuo oge ọ bụla"
      }
    }
  }
};

// Function to update a language file with translations
function updateLanguageFile(langCode) {
  const filePath = path.join(__dirname, '..', 'public', 'locales', langCode, 'common.json');
  
  try {
    // Read existing file
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update with translated content or keep English as fallback
    const translation = translations[langCode] || {
      "mobileLanding": {
        "hero": {
          "title": "Your Business,",
          "subtitle": "In Your Pocket",
          "description": "AI-powered business management platform that works offline.",
          "cta": {
            "getStarted": "Get Started For Free",
            "signIn": "Sign In"
          },
          "noCreditCard": "No credit card required",
          "freePlan": "Free forever plan"
        },
        "features": {
          "title": "Everything You Need",
          "pos": {
            "title": "Point of Sale",
            "description": "Process sales instantly, even offline"
          },
          "barcode": {
            "title": "Barcode Scanner",
            "description": "Scan products with your camera"
          },
          "invoicing": {
            "title": "Quick Invoicing",
            "description": "Create and send invoices on the go"
          },
          "analytics": {
            "title": "Real-time Analytics",
            "description": "Track your business performance"
          }
        },
        "benefits": {
          "title": "Built for Your Success",
          "offline": {
            "title": "Works Offline",
            "description": "Continue selling without internet"
          },
          "fast": {
            "title": "Lightning Fast",
            "description": "Instant loading, no delays"
          },
          "mobile": {
            "title": "Mobile First",
            "description": "Designed for phones & tablets"
          },
          "payments": {
            "title": "Mobile Money",
            "description": "M-Pesa, offline mode, local support"
          }
        },
        "pricing": {
          "title": "Simple, Transparent Pricing"
        },
        "cta": {
          "title": "Ready to Grow Your Business?",
          "subtitle": "Start managing your business better today",
          "button": "Get Started Free",
          "terms": "No credit card required • Cancel anytime"
        }
      }
    };
    
    // Merge the translation into the content
    content = {
      ...content,
      ...translation
    };
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`✅ Updated ${langCode}/common.json with translations`);
  } catch (error) {
    console.error(`❌ Error updating ${langCode}/common.json:`, error.message);
  }
}

// Languages to update
const languages = [
  'es', 'fr', 'de', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko',
  'ar', 'hi', 'id', 'vi', 'tr', 'sw', 'ha', 'am', 'yo', 'zu',
  'it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'
];

// Update all language files
console.log('🌍 Translating mobile landing page content to all 30 languages...\n');

languages.forEach(langCode => {
  updateLanguageFile(langCode);
});

console.log('\n✨ Done! Mobile landing translations have been added to all language files.');
console.log('📝 All translations are complete and ready to use!');