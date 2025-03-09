// create-onboarding-translations.js
const fs = require('fs');
const path = require('path');

// Define base onboarding strings in English
const baseOnboardingStrings = {
  "businessInfo": {
    "title": "Enter your business information",
    "subtitle": "Tell us about your company",
    "nameLabel": "Business name",
    "addressLabel": "Business address",
    "phoneLabel": "Business phone",
    "emailLabel": "Business email",
    "websiteLabel": "Website (optional)",
    "industryLabel": "Industry",
    "nextButton": "Continue to subscription",
    "errors": {
      "nameRequired": "Business name is required",
      "addressRequired": "Business address is required",
      "phoneRequired": "Business phone is required",
      "emailRequired": "Business email is required",
      "emailInvalid": "Please enter a valid email address"
    }
  },
  "subscription": {
    "title": "Choose your subscription plan",
    "subtitle": "Select a plan that matches your business needs",
    "basic": "Basic",
    "professional": "Professional",
    "premium": "Premium",
    "perMonth": "per month",
    "selectPlan": "Select Plan",
    "currentPlan": "Current Plan",
    "features": {
      "accounting": "Accounting and Bookkeeping",
      "invoicing": "Invoicing and Billing",
      "expenses": "Expense Tracking",
      "payroll": "Payroll Processing",
      "inventory": "Inventory Management",
      "support": "24/7 Customer Support"
    }
  },
  "payment": {
    "title": "Payment Details",
    "subtitle": "Set up secure payment method",
    "cardName": "Name on card",
    "cardNumber": "Card number",
    "expiry": "Expiration date",
    "cvv": "CVV",
    "saveCard": "Save card for future billing",
    "confirmPayment": "Confirm Payment",
    "errors": {
      "nameRequired": "Name on card is required",
      "cardRequired": "Card number is required",
      "expiryRequired": "Expiration date is required",
      "cvvRequired": "CVV is required"
    }
  },
  "setup": {
    "title": "Set up your Dott account",
    "subtitle": "A few final details we need to know about your business",
    "industryLabel": "Industry type",
    "employeesLabel": "Number of employees",
    "revenueLabel": "Estimated annual revenue",
    "finishSetup": "Complete Setup",
    "goToDashboard": "Go to Dashboard"
  }
};

// Define onboarding translations for different languages
const onboardingTranslations = {
  en: baseOnboardingStrings, // English is our base language
  
  es: { // Spanish
    "businessInfo": {
      "title": "Ingrese la información de su negocio",
      "subtitle": "Cuéntenos sobre su empresa",
      "nameLabel": "Nombre del negocio",
      "addressLabel": "Dirección del negocio",
      "phoneLabel": "Teléfono del negocio",
      "emailLabel": "Correo electrónico del negocio",
      "websiteLabel": "Sitio web (opcional)",
      "industryLabel": "Industria",
      "nextButton": "Continuar a suscripción",
      "errors": {
        "nameRequired": "El nombre del negocio es obligatorio",
        "addressRequired": "La dirección del negocio es obligatoria",
        "phoneRequired": "El teléfono del negocio es obligatorio",
        "emailRequired": "El correo electrónico del negocio es obligatorio",
        "emailInvalid": "Por favor, ingrese una dirección de correo electrónico válida"
      }
    },
    "subscription": {
      "title": "Elija su plan de suscripción",
      "subtitle": "Seleccione un plan que se adapte a las necesidades de su negocio",
      "basic": "Básico",
      "professional": "Profesional",
      "premium": "Premium",
      "perMonth": "por mes",
      "selectPlan": "Seleccionar Plan",
      "currentPlan": "Plan Actual",
      "features": {
        "accounting": "Contabilidad y Teneduría de Libros",
        "invoicing": "Facturación y Cobros",
        "expenses": "Seguimiento de Gastos",
        "payroll": "Procesamiento de Nómina",
        "inventory": "Gestión de Inventario",
        "support": "Soporte al Cliente 24/7"
      }
    },
    "payment": {
      "title": "Detalles de Pago",
      "subtitle": "Configure un método de pago seguro",
      "cardName": "Nombre en la tarjeta",
      "cardNumber": "Número de tarjeta",
      "expiry": "Fecha de vencimiento",
      "cvv": "CVV",
      "saveCard": "Guardar tarjeta para facturación futura",
      "confirmPayment": "Confirmar Pago",
      "errors": {
        "nameRequired": "El nombre en la tarjeta es obligatorio",
        "cardRequired": "El número de tarjeta es obligatorio",
        "expiryRequired": "La fecha de vencimiento es obligatoria",
        "cvvRequired": "El CVV es obligatorio"
      }
    },
    "setup": {
      "title": "Configure su cuenta de Dott",
      "subtitle": "Algunos detalles finales que necesitamos saber sobre su negocio",
      "industryLabel": "Tipo de industria",
      "employeesLabel": "Número de empleados",
      "revenueLabel": "Ingresos anuales estimados",
      "finishSetup": "Completar Configuración",
      "goToDashboard": "Ir al Panel de Control"
    }
  },
  
  fr: { // French
    "businessInfo": {
      "title": "Entrez les informations de votre entreprise",
      "subtitle": "Parlez-nous de votre entreprise",
      "nameLabel": "Nom de l'entreprise",
      "addressLabel": "Adresse de l'entreprise",
      "phoneLabel": "Téléphone de l'entreprise",
      "emailLabel": "Email de l'entreprise",
      "websiteLabel": "Site web (facultatif)",
      "industryLabel": "Secteur d'activité",
      "nextButton": "Continuer vers l'abonnement",
      "errors": {
        "nameRequired": "Le nom de l'entreprise est requis",
        "addressRequired": "L'adresse de l'entreprise est requise",
        "phoneRequired": "Le téléphone de l'entreprise est requis",
        "emailRequired": "L'email de l'entreprise est requis",
        "emailInvalid": "Veuillez entrer une adresse email valide"
      }
    },
    "subscription": {
      "title": "Choisissez votre forfait d'abonnement",
      "subtitle": "Sélectionnez un forfait qui correspond aux besoins de votre entreprise",
      "basic": "Basique",
      "professional": "Professionnel",
      "premium": "Premium",
      "perMonth": "par mois",
      "selectPlan": "Sélectionner le forfait",
      "currentPlan": "Forfait actuel",
      "features": {
        "accounting": "Comptabilité et tenue de livres",
        "invoicing": "Facturation",
        "expenses": "Suivi des dépenses",
        "payroll": "Traitement de la paie",
        "inventory": "Gestion des stocks",
        "support": "Support client 24/7"
      }
    },
    "payment": {
      "title": "Détails de paiement",
      "subtitle": "Configurez un mode de paiement sécurisé",
      "cardName": "Nom sur la carte",
      "cardNumber": "Numéro de carte",
      "expiry": "Date d'expiration",
      "cvv": "CVV",
      "saveCard": "Enregistrer la carte pour les facturations futures",
      "confirmPayment": "Confirmer le paiement",
      "errors": {
        "nameRequired": "Le nom sur la carte est requis",
        "cardRequired": "Le numéro de carte est requis",
        "expiryRequired": "La date d'expiration est requise",
        "cvvRequired": "Le CVV est requis"
      }
    },
    "setup": {
      "title": "Configurez votre compte Dott",
      "subtitle": "Quelques détails finaux dont nous avons besoin à propos de votre entreprise",
      "industryLabel": "Type d'industrie",
      "employeesLabel": "Nombre d'employés",
      "revenueLabel": "Revenu annuel estimé",
      "finishSetup": "Terminer la configuration",
      "goToDashboard": "Aller au tableau de bord"
    }
  },
  
  hi: { // Hindi
    "businessInfo": {
      "title": "अपने व्यापार की जानकारी दर्ज करें",
      "subtitle": "हमें अपनी कंपनी के बारे में बताएं",
      "nameLabel": "व्यापार का नाम",
      "addressLabel": "व्यापार का पता",
      "phoneLabel": "व्यापार का फोन",
      "emailLabel": "व्यापार का ईमेल",
      "websiteLabel": "वेबसाइट (वैकल्पिक)",
      "industryLabel": "उद्योग",
      "nextButton": "सदस्यता के लिए जारी रखें",
      "errors": {
        "nameRequired": "व्यापार का नाम आवश्यक है",
        "addressRequired": "व्यापार का पता आवश्यक है",
        "phoneRequired": "व्यापार का फोन आवश्यक है",
        "emailRequired": "व्यापार का ईमेल आवश्यक है",
        "emailInvalid": "कृपया एक वैध ईमेल पता दर्ज करें"
      }
    },
    "subscription": {
      "title": "अपनी सदस्यता योजना चुनें",
      "subtitle": "अपने व्यावसायिक आवश्यकताओं के अनुरूप एक योजना चुनें",
      "basic": "बुनियादी",
      "professional": "पेशेवर",
      "premium": "प्रीमियम",
      "perMonth": "प्रति माह",
      "selectPlan": "योजना चुनें",
      "currentPlan": "वर्तमान योजना",
      "features": {
        "accounting": "लेखांकन और बही-खाता",
        "invoicing": "चालान और बिलिंग",
        "expenses": "खर्च ट्रैकिंग",
        "payroll": "पेरोल प्रोसेसिंग",
        "inventory": "इन्वेंटरी प्रबंधन",
        "support": "24/7 ग्राहक सहायता"
      }
    },
    "payment": {
      "title": "भुगतान विवरण",
      "subtitle": "सुरक्षित भुगतान विधि सेट करें",
      "cardName": "कार्ड पर नाम",
      "cardNumber": "कार्ड नंबर",
      "expiry": "समाप्ति तिथि",
      "cvv": "CVV",
      "saveCard": "भविष्य के बिलिंग के लिए कार्ड सहेजें",
      "confirmPayment": "भुगतान की पुष्टि करें",
      "errors": {
        "nameRequired": "कार्ड पर नाम आवश्यक है",
        "cardRequired": "कार्ड नंबर आवश्यक है",
        "expiryRequired": "समाप्ति तिथि आवश्यक है",
        "cvvRequired": "CVV आवश्यक है"
      }
    },
    "setup": {
      "title": "अपने Dott खाते को सेट करें",
      "subtitle": "कुछ अंतिम विवरण जिन्हें हमें आपके व्यवसाय के बारे में जानने की आवश्यकता है",
      "industryLabel": "उद्योग प्रकार",
      "employeesLabel": "कर्मचारियों की संख्या",
      "revenueLabel": "अनुमानित वार्षिक राजस्व",
      "finishSetup": "सेटअप पूरा करें",
      "goToDashboard": "डैशबोर्ड पर जाएं"
    }
  },

  // Portuguese (pt)
pt: {
    "businessInfo": {
      "title": "Insira as informações da sua empresa",
      "subtitle": "Conte-nos sobre sua empresa",
      "nameLabel": "Nome da empresa",
      "addressLabel": "Endereço da empresa",
      "phoneLabel": "Telefone da empresa",
      "emailLabel": "Email da empresa",
      "websiteLabel": "Site (opcional)",
      "industryLabel": "Setor",
      "nextButton": "Continuar para assinatura",
      "errors": {
        "nameRequired": "O nome da empresa é obrigatório",
        "addressRequired": "O endereço da empresa é obrigatório",
        "phoneRequired": "O telefone da empresa é obrigatório",
        "emailRequired": "O email da empresa é obrigatório",
        "emailInvalid": "Por favor, insira um endereço de email válido"
      }
    },
    "subscription": {
      "title": "Escolha seu plano de assinatura",
      "subtitle": "Selecione um plano que atenda às necessidades da sua empresa",
      "basic": "Básico",
      "professional": "Profissional",
      "premium": "Premium",
      "perMonth": "por mês",
      "selectPlan": "Selecionar Plano",
      "currentPlan": "Plano Atual",
      "features": {
        "accounting": "Contabilidade e Escrituração",
        "invoicing": "Faturamento e Cobrança",
        "expenses": "Rastreamento de Despesas",
        "payroll": "Processamento de Folha de Pagamento",
        "inventory": "Gestão de Estoque",
        "support": "Suporte ao Cliente 24/7"
      }
    },
    "payment": {
      "title": "Detalhes de Pagamento",
      "subtitle": "Configure um método de pagamento seguro",
      "cardName": "Nome no cartão",
      "cardNumber": "Número do cartão",
      "expiry": "Data de validade",
      "cvv": "CVV",
      "saveCard": "Salvar cartão para faturamento futuro",
      "confirmPayment": "Confirmar Pagamento",
      "errors": {
        "nameRequired": "O nome no cartão é obrigatório",
        "cardRequired": "O número do cartão é obrigatório",
        "expiryRequired": "A data de validade é obrigatória",
        "cvvRequired": "O CVV é obrigatório"
      }
    },
    "setup": {
      "title": "Configure sua conta Dott",
      "subtitle": "Alguns detalhes finais que precisamos saber sobre sua empresa",
      "industryLabel": "Tipo de indústria",
      "employeesLabel": "Número de funcionários",
      "revenueLabel": "Receita anual estimada",
      "finishSetup": "Concluir Configuração",
      "goToDashboard": "Ir para o Painel"
    }
  },
  
  // German (de)
  de: {
    "businessInfo": {
      "title": "Geben Sie Ihre Geschäftsinformationen ein",
      "subtitle": "Erzählen Sie uns über Ihr Unternehmen",
      "nameLabel": "Firmenname",
      "addressLabel": "Geschäftsadresse",
      "phoneLabel": "Geschäftstelefon",
      "emailLabel": "Geschäfts-E-Mail",
      "websiteLabel": "Website (optional)",
      "industryLabel": "Branche",
      "nextButton": "Weiter zum Abonnement",
      "errors": {
        "nameRequired": "Firmenname ist erforderlich",
        "addressRequired": "Geschäftsadresse ist erforderlich",
        "phoneRequired": "Geschäftstelefon ist erforderlich",
        "emailRequired": "Geschäfts-E-Mail ist erforderlich",
        "emailInvalid": "Bitte geben Sie eine gültige E-Mail-Adresse ein"
      }
    },
    "subscription": {
      "title": "Wählen Sie Ihren Abonnementplan",
      "subtitle": "Wählen Sie einen Plan, der Ihren Geschäftsanforderungen entspricht",
      "basic": "Basic",
      "professional": "Professional",
      "premium": "Premium",
      "perMonth": "pro Monat",
      "selectPlan": "Plan auswählen",
      "currentPlan": "Aktueller Plan",
      "features": {
        "accounting": "Buchhaltung und Buchführung",
        "invoicing": "Rechnungsstellung und Abrechnung",
        "expenses": "Ausgabenverfolgung",
        "payroll": "Gehaltsabrechnung",
        "inventory": "Bestandsverwaltung",
        "support": "24/7 Kundensupport"
      }
    },
    "payment": {
      "title": "Zahlungsdetails",
      "subtitle": "Richten Sie eine sichere Zahlungsmethode ein",
      "cardName": "Name auf der Karte",
      "cardNumber": "Kartennummer",
      "expiry": "Ablaufdatum",
      "cvv": "CVV",
      "saveCard": "Karte für zukünftige Abrechnungen speichern",
      "confirmPayment": "Zahlung bestätigen",
      "errors": {
        "nameRequired": "Name auf der Karte ist erforderlich",
        "cardRequired": "Kartennummer ist erforderlich",
        "expiryRequired": "Ablaufdatum ist erforderlich",
        "cvvRequired": "CVV ist erforderlich"
      }
    },
    "setup": {
      "title": "Richten Sie Ihr Dott-Konto ein",
      "subtitle": "Einige letzte Details, die wir über Ihr Unternehmen wissen müssen",
      "industryLabel": "Branchentyp",
      "employeesLabel": "Anzahl der Mitarbeiter",
      "revenueLabel": "Geschätzter Jahresumsatz",
      "finishSetup": "Einrichtung abschließen",
      "goToDashboard": "Zum Dashboard"
    }
  },
  
  // Chinese (zh)
  zh: {
    "businessInfo": {
      "title": "输入您的业务信息",
      "subtitle": "告诉我们您的公司情况",
      "nameLabel": "公司名称",
      "addressLabel": "公司地址",
      "phoneLabel": "公司电话",
      "emailLabel": "公司电子邮箱",
      "websiteLabel": "网站（可选）",
      "industryLabel": "行业",
      "nextButton": "继续订阅",
      "errors": {
        "nameRequired": "必须提供公司名称",
        "addressRequired": "必须提供公司地址",
        "phoneRequired": "必须提供公司电话",
        "emailRequired": "必须提供公司电子邮箱",
        "emailInvalid": "请输入有效的电子邮箱地址"
      }
    },
    "subscription": {
      "title": "选择您的订阅计划",
      "subtitle": "选择符合您业务需求的计划",
      "basic": "基础版",
      "professional": "专业版",
      "premium": "高级版",
      "perMonth": "每月",
      "selectPlan": "选择计划",
      "currentPlan": "当前计划",
      "features": {
        "accounting": "会计和簿记",
        "invoicing": "发票和账单",
        "expenses": "费用跟踪",
        "payroll": "工资处理",
        "inventory": "库存管理",
        "support": "24/7客户支持"
      }
    },
    "payment": {
      "title": "付款详情",
      "subtitle": "设置安全的付款方式",
      "cardName": "持卡人姓名",
      "cardNumber": "卡号",
      "expiry": "到期日期",
      "cvv": "CVV",
      "saveCard": "保存卡片用于未来账单",
      "confirmPayment": "确认付款",
      "errors": {
        "nameRequired": "必须提供持卡人姓名",
        "cardRequired": "必须提供卡号",
        "expiryRequired": "必须提供到期日期",
        "cvvRequired": "必须提供CVV"
      }
    },
    "setup": {
      "title": "设置您的Dott账户",
      "subtitle": "我们需要了解的关于您业务的最后几个细节",
      "industryLabel": "行业类型",
      "employeesLabel": "员工数量",
      "revenueLabel": "预计年收入",
      "finishSetup": "完成设置",
      "goToDashboard": "前往仪表板"
    }
  },
  
  // Arabic (ar)
  ar: {
    "businessInfo": {
      "title": "أدخل معلومات عملك",
      "subtitle": "أخبرنا عن شركتك",
      "nameLabel": "اسم العمل",
      "addressLabel": "عنوان العمل",
      "phoneLabel": "هاتف العمل",
      "emailLabel": "البريد الإلكتروني للعمل",
      "websiteLabel": "الموقع الإلكتروني (اختياري)",
      "industryLabel": "الصناعة",
      "nextButton": "متابعة للاشتراك",
      "errors": {
        "nameRequired": "اسم العمل مطلوب",
        "addressRequired": "عنوان العمل مطلوب",
        "phoneRequired": "هاتف العمل مطلوب",
        "emailRequired": "البريد الإلكتروني للعمل مطلوب",
        "emailInvalid": "يرجى إدخال عنوان بريد إلكتروني صالح"
      }
    },
    "subscription": {
      "title": "اختر خطة اشتراكك",
      "subtitle": "حدد خطة تناسب احتياجات عملك",
      "basic": "أساسي",
      "professional": "احترافي",
      "premium": "متميز",
      "perMonth": "شهريًا",
      "selectPlan": "اختيار الخطة",
      "currentPlan": "الخطة الحالية",
      "features": {
        "accounting": "المحاسبة ومسك الدفاتر",
        "invoicing": "الفواتير والمحاسبة",
        "expenses": "تتبع النفقات",
        "payroll": "معالجة الرواتب",
        "inventory": "إدارة المخزون",
        "support": "دعم العملاء على مدار الساعة"
      }
    },
    "payment": {
      "title": "تفاصيل الدفع",
      "subtitle": "إعداد طريقة دفع آمنة",
      "cardName": "الاسم على البطاقة",
      "cardNumber": "رقم البطاقة",
      "expiry": "تاريخ انتهاء الصلاحية",
      "cvv": "رمز التحقق CVV",
      "saveCard": "حفظ البطاقة للفواتير المستقبلية",
      "confirmPayment": "تأكيد الدفع",
      "errors": {
        "nameRequired": "الاسم على البطاقة مطلوب",
        "cardRequired": "رقم البطاقة مطلوب",
        "expiryRequired": "تاريخ انتهاء الصلاحية مطلوب",
        "cvvRequired": "رمز التحقق CVV مطلوب"
      }
    },
    "setup": {
      "title": "إعداد حساب Dott الخاص بك",
      "subtitle": "بعض التفاصيل النهائية التي نحتاج إلى معرفتها عن عملك",
      "industryLabel": "نوع الصناعة",
      "employeesLabel": "عدد الموظفين",
      "revenueLabel": "الإيرادات السنوية المقدرة",
      "finishSetup": "إكمال الإعداد",
      "goToDashboard": "الذهاب إلى لوحة التحكم"
    }
  },
  
  // Russian (ru)
  ru: {
    "businessInfo": {
      "title": "Введите информацию о вашем бизнесе",
      "subtitle": "Расскажите нам о вашей компании",
      "nameLabel": "Название компании",
      "addressLabel": "Адрес компании",
      "phoneLabel": "Телефон компании",
      "emailLabel": "Email компании",
      "websiteLabel": "Веб-сайт (необязательно)",
      "industryLabel": "Отрасль",
      "nextButton": "Продолжить к подписке",
      "errors": {
        "nameRequired": "Название компании обязательно",
        "addressRequired": "Адрес компании обязателен",
        "phoneRequired": "Телефон компании обязателен",
        "emailRequired": "Email компании обязателен",
        "emailInvalid": "Пожалуйста, введите действительный email адрес"
      }
    },
    "subscription": {
      "title": "Выберите ваш план подписки",
      "subtitle": "Выберите план, который соответствует потребностям вашего бизнеса",
      "basic": "Базовый",
      "professional": "Профессиональный",
      "premium": "Премиум",
      "perMonth": "в месяц",
      "selectPlan": "Выбрать план",
      "currentPlan": "Текущий план",
      "features": {
        "accounting": "Бухгалтерский учет и ведение книг",
        "invoicing": "Выставление счетов и биллинг",
        "expenses": "Отслеживание расходов",
        "payroll": "Обработка заработной платы",
        "inventory": "Управление запасами",
        "support": "Поддержка клиентов 24/7"
      }
    },
    "payment": {
      "title": "Детали оплаты",
      "subtitle": "Настройте безопасный способ оплаты",
      "cardName": "Имя на карте",
      "cardNumber": "Номер карты",
      "expiry": "Срок действия",
      "cvv": "CVV",
      "saveCard": "Сохранить карту для будущих платежей",
      "confirmPayment": "Подтвердить оплату",
      "errors": {
        "nameRequired": "Имя на карте обязательно",
        "cardRequired": "Номер карты обязателен",
        "expiryRequired": "Срок действия обязателен",
        "cvvRequired": "CVV обязателен"
      }
    },
    "setup": {
      "title": "Настройте ваш аккаунт Dott",
      "subtitle": "Несколько последних деталей, которые нам нужно знать о вашем бизнесе",
      "industryLabel": "Тип отрасли",
      "employeesLabel": "Количество сотрудников",
      "revenueLabel": "Предполагаемый годовой доход",
      "finishSetup": "Завершить настройку",
      "goToDashboard": "Перейти к панели управления"
    }
  },
  
  // Japanese (ja)
  ja: {
    "businessInfo": {
      "title": "ビジネス情報を入力",
      "subtitle": "あなたの会社について教えてください",
      "nameLabel": "会社名",
      "addressLabel": "会社住所",
      "phoneLabel": "会社電話番号",
      "emailLabel": "会社メールアドレス",
      "websiteLabel": "ウェブサイト（任意）",
      "industryLabel": "業種",
      "nextButton": "サブスクリプションに進む",
      "errors": {
        "nameRequired": "会社名は必須です",
        "addressRequired": "会社住所は必須です",
        "phoneRequired": "会社電話番号は必須です",
        "emailRequired": "会社メールアドレスは必須です",
        "emailInvalid": "有効なメールアドレスを入力してください"
      }
    },
    "subscription": {
      "title": "サブスクリプションプランの選択",
      "subtitle": "あなたのビジネスニーズに合ったプランを選択してください",
      "basic": "ベーシック",
      "professional": "プロフェッショナル",
      "premium": "プレミアム",
      "perMonth": "月額",
      "selectPlan": "プランを選択",
      "currentPlan": "現在のプラン",
      "features": {
        "accounting": "会計と簿記",
        "invoicing": "請求書と課金",
        "expenses": "経費追跡",
        "payroll": "給与計算",
        "inventory": "在庫管理",
        "support": "24時間年中無休のカスタマーサポート"
      }
    },
    "payment": {
      "title": "支払い詳細",
      "subtitle": "安全な支払い方法を設定",
      "cardName": "カード名義",
      "cardNumber": "カード番号",
      "expiry": "有効期限",
      "cvv": "セキュリティコード",
      "saveCard": "将来の請求のためにカードを保存",
      "confirmPayment": "支払いを確認",
      "errors": {
        "nameRequired": "カード名義は必須です",
        "cardRequired": "カード番号は必須です",
        "expiryRequired": "有効期限は必須です",
        "cvvRequired": "セキュリティコードは必須です"
      }
    },
    "setup": {
      "title": "Dottアカウントのセットアップ",
      "subtitle": "あなたのビジネスについて知っておく必要がある最後の詳細",
      "industryLabel": "業種",
      "employeesLabel": "従業員数",
      "revenueLabel": "推定年間売上",
      "finishSetup": "セットアップを完了",
      "goToDashboard": "ダッシュボードへ"
    }
  },
  
  // Swahili (sw)
  sw: {
    "businessInfo": {
      "title": "Ingiza maelezo ya biashara yako",
      "subtitle": "Tuambie kuhusu kampuni yako",
      "nameLabel": "Jina la biashara",
      "addressLabel": "Anwani ya biashara",
      "phoneLabel": "Simu ya biashara",
      "emailLabel": "Barua pepe ya biashara",
      "websiteLabel": "Tovuti (hiari)",
      "industryLabel": "Sekta",
      "nextButton": "Endelea kwa usajili",
      "errors": {
        "nameRequired": "Jina la biashara linahitajika",
        "addressRequired": "Anwani ya biashara inahitajika",
        "phoneRequired": "Simu ya biashara inahitajika",
        "emailRequired": "Barua pepe ya biashara inahitajika",
        "emailInvalid": "Tafadhali ingiza anwani halali ya barua pepe"
      }
    },
    "subscription": {
      "title": "Chagua mpango wako wa usajili",
      "subtitle": "Chagua mpango unaoendana na mahitaji ya biashara yako",
      "basic": "Msingi",
      "professional": "Kitaalamu",
      "premium": "Bora",
      "perMonth": "kwa mwezi",
      "selectPlan": "Chagua Mpango",
      "currentPlan": "Mpango wa Sasa",
      "features": {
        "accounting": "Uhasibu na Uwekaji wa Vitabu",
        "invoicing": "Ankara na Malipo",
        "expenses": "Ufuatiliaji wa Gharama",
        "payroll": "Uchakataji wa Malipo",
        "inventory": "Usimamizi wa Bidhaa",
        "support": "Usaidizi wa Wateja 24/7"
      }
    },
    "payment": {
      "title": "Maelezo ya Malipo",
      "subtitle": "Weka njia salama ya malipo",
      "cardName": "Jina kwenye kadi",
      "cardNumber": "Nambari ya kadi",
      "expiry": "Tarehe ya mwisho wa matumizi",
      "cvv": "CVV",
      "saveCard": "Hifadhi kadi kwa malipo ya baadaye",
      "confirmPayment": "Thibitisha Malipo",
      "errors": {
        "nameRequired": "Jina kwenye kadi linahitajika",
        "cardRequired": "Nambari ya kadi inahitajika",
        "expiryRequired": "Tarehe ya mwisho wa matumizi inahitajika",
        "cvvRequired": "CVV inahitajika"
      }
    },
    "setup": {
      "title": "Sanidi akaunti yako ya Dott",
      "subtitle": "Maelezo machache ya mwisho tunayohitaji kujua kuhusu biashara yako",
      "industryLabel": "Aina ya sekta",
      "employeesLabel": "Idadi ya wafanyakazi",
      "revenueLabel": "Mapato ya mwaka yanayokadiriwa",
      "finishSetup": "Kamilisha Usanidi",
      "goToDashboard": "Nenda kwenye Dashibodi"
    }
  },
  
  // Turkish (tr)
  tr: {
    "businessInfo": {
      "title": "İşletme bilgilerinizi girin",
      "subtitle": "Bize şirketiniz hakkında bilgi verin",
      "nameLabel": "İşletme adı",
      "addressLabel": "İşletme adresi",
      "phoneLabel": "İşletme telefonu",
      "emailLabel": "İşletme e-postası",
      "websiteLabel": "Web sitesi (isteğe bağlı)",
      "industryLabel": "Sektör",
      "nextButton": "Aboneliğe devam et",
      "errors": {
        "nameRequired": "İşletme adı gereklidir",
        "addressRequired": "İşletme adresi gereklidir",
        "phoneRequired": "İşletme telefonu gereklidir",
        "emailRequired": "İşletme e-postası gereklidir",
        "emailInvalid": "Lütfen geçerli bir e-posta adresi girin"
      }
    },
    "subscription": {
      "title": "Abonelik planınızı seçin",
      "subtitle": "İşletme ihtiyaçlarınıza uygun bir plan seçin",
      "basic": "Temel",
      "professional": "Profesyonel",
      "premium": "Premium",
      "perMonth": "aylık",
      "selectPlan": "Plan Seç",
      "currentPlan": "Mevcut Plan",
      "features": {
        "accounting": "Muhasebe ve Defter Tutma",
        "invoicing": "Faturalama ve Faturalandırma",
        "expenses": "Gider Takibi",
        "payroll": "Bordro İşlemleri",
        "inventory": "Envanter Yönetimi",
        "support": "7/24 Müşteri Desteği"
      }
    },
    "payment": {
      "title": "Ödeme Detayları",
      "subtitle": "Güvenli ödeme yöntemi ayarlayın",
      "cardName": "Kart üzerindeki isim",
      "cardNumber": "Kart numarası",
      "expiry": "Son kullanma tarihi",
      "cvv": "CVV",
      "saveCard": "Gelecekteki faturalar için kartı kaydet",
      "confirmPayment": "Ödemeyi Onayla",
      "errors": {
        "nameRequired": "Kart üzerindeki isim gereklidir",
        "cardRequired": "Kart numarası gereklidir",
        "expiryRequired": "Son kullanma tarihi gereklidir",
        "cvvRequired": "CVV gereklidir"
      }
    },
    "setup": {
      "title": "Dott hesabınızı kurun",
      "subtitle": "İşletmeniz hakkında bilmemiz gereken birkaç son detay",
      "industryLabel": "Sektör türü",
      "employeesLabel": "Çalışan sayısı",
      "revenueLabel": "Tahmini yıllık gelir",
      "finishSetup": "Kurulumu Tamamla",
      "goToDashboard": "Kontrol Paneline Git"
    }
  },
  
  // Indonesian (id)
  id: {
    "businessInfo": {
      "title": "Masukkan informasi bisnis Anda",
      "subtitle": "Ceritakan tentang perusahaan Anda",
      "nameLabel": "Nama bisnis",
      "addressLabel": "Alamat bisnis",
      "phoneLabel": "Telepon bisnis",
      "emailLabel": "Email bisnis",
      "websiteLabel": "Situs web (opsional)",
      "industryLabel": "Industri",
      "nextButton": "Lanjutkan ke langganan",
      "errors": {
        "nameRequired": "Nama bisnis diperlukan",
        "addressRequired": "Alamat bisnis diperlukan",
        "phoneRequired": "Telepon bisnis diperlukan",
        "emailRequired": "Email bisnis diperlukan",
        "emailInvalid": "Harap masukkan alamat email yang valid"
      }
    },
    "subscription": {
      "title": "Pilih paket langganan Anda",
      "subtitle": "Pilih paket yang sesuai dengan kebutuhan bisnis Anda",
      "basic": "Dasar",
      "professional": "Profesional",
      "premium": "Premium",
      "perMonth": "per bulan",
      "selectPlan": "Pilih Paket",
      "currentPlan": "Paket Saat Ini",
      "features": {
        "accounting": "Akuntansi dan Pembukuan",
        "invoicing": "Penagihan dan Faktur",
        "expenses": "Pelacakan Pengeluaran",
        "payroll": "Pemrosesan Penggajian",
        "inventory": "Manajemen Inventaris",
        "support": "Dukungan Pelanggan 24/7"
      }
    },
    "payment": {
      "title": "Detail Pembayaran",
      "subtitle": "Siapkan metode pembayaran yang aman",
      "cardName": "Nama pada kartu",
      "cardNumber": "Nomor kartu",
      "expiry": "Tanggal kadaluarsa",
      "cvv": "CVV",
      "saveCard": "Simpan kartu untuk penagihan di masa mendatang",
      "confirmPayment": "Konfirmasi Pembayaran",
      "errors": {
        "nameRequired": "Nama pada kartu diperlukan",
        "cardRequired": "Nomor kartu diperlukan",
        "expiryRequired": "Tanggal kadaluarsa diperlukan",
        "cvvRequired": "CVV diperlukan"
      }
    },
    "setup": {
      "title": "Siapkan akun Dott Anda",
      "subtitle": "Beberapa detail akhir yang perlu kami ketahui tentang bisnis Anda",
      "industryLabel": "Jenis industri",
      "employeesLabel": "Jumlah karyawan",
      "revenueLabel": "Perkiraan pendapatan tahunan",
      "finishSetup": "Selesaikan Pengaturan",
      "goToDashboard": "Pergi ke Dasbor"
    }
  },
  // Vietnamese (vi) continued
vi: {
    "subscription": {
      "title": "Chọn gói đăng ký của bạn",
      "subtitle": "Chọn gói phù hợp với nhu cầu kinh doanh của bạn",
      "basic": "Cơ bản",
      "professional": "Chuyên nghiệp",
      "premium": "Cao cấp",
      "perMonth": "mỗi tháng",
      "selectPlan": "Chọn Gói",
      "currentPlan": "Gói Hiện Tại",
      "features": {
        "accounting": "Kế toán và Sổ sách",
        "invoicing": "Hóa đơn và Thanh toán",
        "expenses": "Theo dõi chi phí",
        "payroll": "Xử lý lương",
        "inventory": "Quản lý kho hàng",
        "support": "Hỗ trợ khách hàng 24/7"
      }
    },
    "payment": {
      "title": "Chi tiết thanh toán",
      "subtitle": "Thiết lập phương thức thanh toán an toàn",
      "cardName": "Tên trên thẻ",
      "cardNumber": "Số thẻ",
      "expiry": "Ngày hết hạn",
      "cvv": "CVV",
      "saveCard": "Lưu thẻ cho thanh toán trong tương lai",
      "confirmPayment": "Xác nhận thanh toán",
      "errors": {
        "nameRequired": "Tên trên thẻ là bắt buộc",
        "cardRequired": "Số thẻ là bắt buộc",
        "expiryRequired": "Ngày hết hạn là bắt buộc",
        "cvvRequired": "CVV là bắt buộc"
      }
    },
    "setup": {
      "title": "Thiết lập tài khoản Dott của bạn",
      "subtitle": "Một vài chi tiết cuối cùng chúng tôi cần biết về doanh nghiệp của bạn",
      "industryLabel": "Loại ngành nghề",
      "employeesLabel": "Số lượng nhân viên",
      "revenueLabel": "Doanh thu hàng năm ước tính",
      "finishSetup": "Hoàn tất thiết lập",
      "goToDashboard": "Đi đến Bảng điều khiển"
    }
  },
  
  // Dutch (nl)
  nl: {
    "businessInfo": {
      "title": "Voer uw bedrijfsgegevens in",
      "subtitle": "Vertel ons over uw bedrijf",
      "nameLabel": "Bedrijfsnaam",
      "addressLabel": "Bedrijfsadres",
      "phoneLabel": "Bedrijfstelefoon",
      "emailLabel": "Bedrijfse-mail",
      "websiteLabel": "Website (optioneel)",
      "industryLabel": "Branche",
      "nextButton": "Doorgaan naar abonnement",
      "errors": {
        "nameRequired": "Bedrijfsnaam is verplicht",
        "addressRequired": "Bedrijfsadres is verplicht",
        "phoneRequired": "Bedrijfstelefoon is verplicht",
        "emailRequired": "Bedrijfse-mail is verplicht",
        "emailInvalid": "Voer een geldig e-mailadres in"
      }
    },
    "subscription": {
      "title": "Kies uw abonnement",
      "subtitle": "Selecteer een abonnement dat past bij uw zakelijke behoeften",
      "basic": "Basis",
      "professional": "Professioneel",
      "premium": "Premium",
      "perMonth": "per maand",
      "selectPlan": "Selecteer Abonnement",
      "currentPlan": "Huidig Abonnement",
      "features": {
        "accounting": "Boekhouding en Administratie",
        "invoicing": "Facturering",
        "expenses": "Uitgavenbeheer",
        "payroll": "Salarisadministratie",
        "inventory": "Voorraadbeheer",
        "support": "24/7 Klantenondersteuning"
      }
    },
    "payment": {
      "title": "Betalingsgegevens",
      "subtitle": "Stel een veilige betalingsmethode in",
      "cardName": "Naam op kaart",
      "cardNumber": "Kaartnummer",
      "expiry": "Vervaldatum",
      "cvv": "CVV",
      "saveCard": "Kaart opslaan voor toekomstige facturering",
      "confirmPayment": "Bevestig Betaling",
      "errors": {
        "nameRequired": "Naam op kaart is verplicht",
        "cardRequired": "Kaartnummer is verplicht",
        "expiryRequired": "Vervaldatum is verplicht",
        "cvvRequired": "CVV is verplicht"
      }
    },
    "setup": {
      "title": "Stel uw Dott-account in",
      "subtitle": "Enkele laatste details die we moeten weten over uw bedrijf",
      "industryLabel": "Branchetype",
      "employeesLabel": "Aantal medewerkers",
      "revenueLabel": "Geschatte jaaromzet",
      "finishSetup": "Installatie voltooien",
      "goToDashboard": "Ga naar Dashboard"
    }
  },

  ha: { // Hausa
    "businessInfo": {
      "title": "Shigar da bayanan kasuwancin ka",
      "subtitle": "Gaya mana game da kamfanin ka",
      "nameLabel": "Sunan kasuwanci",
      "addressLabel": "Adireshin kasuwanci",
      "phoneLabel": "Lambar waya na kasuwanci",
      "emailLabel": "Imel na kasuwanci",
      "websiteLabel": "Shafin yanar gizo (na zaɓi)",
      "industryLabel": "Masana'anta",
      "nextButton": "Ci gaba zuwa biyan kuɗi",
      "errors": {
        "nameRequired": "Ana buƙatar sunan kasuwanci",
        "addressRequired": "Ana buƙatar adireshin kasuwanci",
        "phoneRequired": "Ana buƙatar lambar waya ta kasuwanci",
        "emailRequired": "Ana buƙatar imel na kasuwanci",
        "emailInvalid": "Da fatan za a shigar da adireshin imel mai inganci"
      }
    },
    "subscription": {
      "title": "Zaɓi tsarin biyan kuɗin ka",
      "subtitle": "Zaɓi shirin da ya dace da buƙatun kasuwancin ka",
      "basic": "Na asali",
      "professional": "Na ƙwarewa",
      "premium": "Mafi kyau",
      "perMonth": "a wata",
      "selectPlan": "Zaɓi Shiri",
      "currentPlan": "Shirin Yanzu",
      "features": {
        "accounting": "Ƙidaya da Ajiya littafin kuɗi",
        "invoicing": "Bayar da lissafi da biyan kuɗi",
        "expenses": "Bibiyar kasafi",
        "payroll": "Sarrafa biyan ma'aikata",
        "inventory": "Sarrafar kayayyaki",
        "support": "Taimako ga abokan ciniki 24/7"
      }
    },
    "payment": {
      "title": "Cikakken Bayanan Biyan Kuɗi",
      "subtitle": "Saita hanyar biyan kuɗi mai tsaro",
      "cardName": "Suna a kan katin",
      "cardNumber": "Lambar kati",
      "expiry": "Ranar ƙare",
      "cvv": "CVV",
      "saveCard": "Ajiye kati don biyan kuɗi na gaba",
      "confirmPayment": "Tabbatar da Biyan Kuɗi",
      "errors": {
        "nameRequired": "Ana buƙatar suna a kan katin",
        "cardRequired": "Ana buƙatar lambar kati",
        "expiryRequired": "Ana buƙatar ranar ƙare",
        "cvvRequired": "Ana buƙatar CVV"
      }
    },
    "setup": {
      "title": "Saita asusun Dott na ka",
      "subtitle": "Wasu ƙaramin bayani na ƙarshe muke buƙatar sani game da kasuwancinka",
      "industryLabel": "Nau'in masana'anta",
      "employeesLabel": "Yawan ma'aikata",
      "revenueLabel": "Ƙiyasin shekara kuɗin shiga",
      "finishSetup": "Kammala Saita",
      "goToDashboard": "Je Dashbord"
    }
  },
  
  yo: { // Yoruba
    "businessInfo": {
      "title": "Tẹ àlàyé iṣẹ́ rẹ sílẹ̀",
      "subtitle": "Sọ fún wa nípa ilé-iṣẹ́ rẹ",
      "nameLabel": "Orúkọ iṣẹ́",
      "addressLabel": "Àdírẹ́ẹ̀sì iṣẹ́",
      "phoneLabel": "Nọ́mbà fóònù iṣẹ́",
      "emailLabel": "Ímeèlì iṣẹ́",
      "websiteLabel": "Ojú òpó wẹ́ẹ̀bù (àṣàyàn)",
      "industryLabel": "Iṣẹ́ ọnà",
      "nextButton": "Tẹ̀síwájú sí ìforúkọsílẹ̀",
      "errors": {
        "nameRequired": "Orúkọ iṣẹ́ jẹ́ dandan",
        "addressRequired": "Àdírẹ́ẹ̀sì iṣẹ́ jẹ́ dandan",
        "phoneRequired": "Nọ́mbà fóònù iṣẹ́ jẹ́ dandan",
        "emailRequired": "Ímeèlì iṣẹ́ jẹ́ dandan",
        "emailInvalid": "Jọ̀wọ́ tẹ àdírẹ́ẹ̀sì ímeèlì tó tọ́ sílẹ̀"
      }
    },
    "subscription": {
      "title": "Yan èto ìforúkọsílẹ̀ rẹ",
      "subtitle": "Yan ètò tí ó bá àwọn àìní iṣẹ́ rẹ mu",
      "basic": "Ìpìlẹ̀",
      "professional": "Ọ̀jọgbọ́n",
      "premium": "Púrémíọ̀mù",
      "perMonth": "lóṣooṣù",
      "selectPlan": "Yan Ètò",
      "currentPlan": "Ètò Lọ́wọ́lọ́wọ́",
      "features": {
        "accounting": "Ìṣirò àti Ìtọ́jú Ìwé Àkọọ́lẹ̀",
        "invoicing": "Ìwé ìnáwó àti Ìdánilówó",
        "expenses": "Ìtọpinpin Ìnáwó",
        "payroll": "Ìṣètò Owó-ọ̀yà",
        "inventory": "Ìṣàkóso Ẹ̀kúnrẹ́rẹ́",
        "support": "Àtìlẹ́yìn Oníbàárà 24/7"
      }
    },
    "payment": {
      "title": "Àlàyé Ìsanwó",
      "subtitle": "Ṣe ètò ọ̀nà ìsanwó àìléwu",
      "cardName": "Orúkọ lórí káàdì",
      "cardNumber": "Nọ́mbà káàdì",
      "expiry": "Ọjọ́ ìparí",
      "cvv": "CVV",
      "saveCard": "Fi káàdì pamọ́ fún ìdánilówó ọjọ́ iwájú",
      "confirmPayment": "Jẹ́rìí Ìsanwó",
      "errors": {
        "nameRequired": "Orúkọ lórí káàdì jẹ́ dandan",
        "cardRequired": "Nọ́mbà káàdì jẹ́ dandan",
        "expiryRequired": "Ọjọ́ ìparí jẹ́ dandan",
        "cvvRequired": "CVV jẹ́ dandan"
      }
    },
    "setup": {
      "title": "Ṣe ètò àkọ́ọ̀lẹ̀ Dott rẹ",
      "subtitle": "Díẹ̀ nínú àwọn àlàyé ìkẹyìn tí a nílò láti mọ̀ nípa iṣẹ́ rẹ",
      "industryLabel": "Irú iṣẹ́ ọnà",
      "employeesLabel": "Iye òṣìṣẹ́",
      "revenueLabel": "Èrò àbájáde ọdún",
      "finishSetup": "Parí Ìṣètò",
      "goToDashboard": "Lọ sí Páńẹ́ẹ̀lì"
    }
  },
  
  am: { // Amharic
    "businessInfo": {
      "title": "የንግድዎን መረጃ ያስገቡ",
      "subtitle": "ስለ ኩባንያዎ ይንገሩን",
      "nameLabel": "የንግድ ስም",
      "addressLabel": "የንግድ አድራሻ",
      "phoneLabel": "የንግድ ስልክ",
      "emailLabel": "የንግድ ኢሜይል",
      "websiteLabel": "ድህረ ገጽ (አማራጭ)",
      "industryLabel": "ኢንዱስትሪ",
      "nextButton": "ወደ ምዝገባ ይቀጥሉ",
      "errors": {
        "nameRequired": "የንግድ ስም ያስፈልጋል",
        "addressRequired": "የንግድ አድራሻ ያስፈልጋል",
        "phoneRequired": "የንግድ ስልክ ያስፈልጋል",
        "emailRequired": "የንግድ ኢሜይል ያስፈልጋል",
        "emailInvalid": "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ"
      }
    },
    "subscription": {
      "title": "የደንበኝነት እቅድዎን ይምረጡ",
      "subtitle": "ከንግድዎ ፍላጎቶች ጋር የሚጣጣም እቅድ ይምረጡ",
      "basic": "መሰረታዊ",
      "professional": "ሙያዊ",
      "premium": "ፕሪሚየም",
      "perMonth": "በወር",
      "selectPlan": "እቅድ ይምረጡ",
      "currentPlan": "አሁን ያለው እቅድ",
      "features": {
        "accounting": "የሂሳብ እና የሂሳብ አያያዝ",
        "invoicing": "ደረሰኝ እና ክፍያ",
        "expenses": "የወጪ መከታተያ",
        "payroll": "የደመወዝ ክፍያ ሂደት",
        "inventory": "የእቃ ክምችት አያያዝ",
        "support": "24/7 የደንበኞች ድጋፍ"
      }
    },
    "payment": {
      "title": "የክፍያ ዝርዝሮች",
      "subtitle": "አስተማማኝ የክፍያ ዘዴ ያዋቅሩ",
      "cardName": "በካርድ ላይ ያለው ስም",
      "cardNumber": "የካርድ ቁጥር",
      "expiry": "የመጨረሻ ቀን",
      "cvv": "CVV",
      "saveCard": "ለወደፊት ክፍያዎች ካርድ ያስቀምጡ",
      "confirmPayment": "ክፍያን ያረጋግጡ",
      "errors": {
        "nameRequired": "በካርድ ላይ ያለው ስም ያስፈልጋል",
        "cardRequired": "የካርድ ቁጥር ያስፈልጋል",
        "expiryRequired": "የመጨረሻ ቀን ያስፈልጋል",
        "cvvRequired": "CVV ያስፈልጋል"
      }
    },
    "setup": {
      "title": "የዎትን Dott መለያ ያዋቅሩ",
      "subtitle": "ስለ ንግድዎ ማወቅ የሚያስፈልጉን ጥቂት የመጨረሻ ዝርዝሮች",
      "industryLabel": "የኢንዱስትሪ አይነት",
      "employeesLabel": "የሰራተኞች ብዛት",
      "revenueLabel": "የተገመተ አመታዊ ገቢ",
      "finishSetup": "ማዋቀር ይጨርሱ",
      "goToDashboard": "ወደ ዳሽቦርድ ይሂዱ"
    }
  },
  
  zu: { // Zulu
    "businessInfo": {
      "title": "Faka imininingwane yebhizinisi lakho",
      "subtitle": "Sitshele ngenkampani yakho",
      "nameLabel": "Igama lebhizinisi",
      "addressLabel": "Ikheli lebhizinisi",
      "phoneLabel": "Ucingo lwebhizinisi",
      "emailLabel": "I-imeyili yebhizinisi",
      "websiteLabel": "Iwebhusayithi (ongakhetha kukho)",
      "industryLabel": "Imboni",
      "nextButton": "Qhubeka nokusubscription",
      "errors": {
        "nameRequired": "Igama lebhizinisi liyadingeka",
        "addressRequired": "Ikheli lebhizinisi liyadingeka",
        "phoneRequired": "Ucingo lwebhizinisi luyadingeka",
        "emailRequired": "I-imeyili yebhizinisi iyadingeka",
        "emailInvalid": "Sicela ufake ikheli le-imeyili elivumelekile"
      }
    },
    "subscription": {
      "title": "Khetha uhlelo lwakho lokusubscription",
      "subtitle": "Khetha uhlelo oluhambisana nezidingo zebhizinisi lakho",
      "basic": "Okuyisisekelo",
      "professional": "Uchwepheshe",
      "premium": "Okungcono",
      "perMonth": "ngenyanga",
      "selectPlan": "Khetha Uhlelo",
      "currentPlan": "Uhlelo Lwamanje",
      "features": {
        "accounting": "Ukubala nezincwadi",
        "invoicing": "Ama-invoyisi nokukhokha",
        "expenses": "Ukulandela izindleko",
        "payroll": "Ukuphathwa kweholo",
        "inventory": "Ukuphathwa kwempahla",
        "support": "Usizo lwamakhasimende 24/7"
      }
    },
    "payment": {
      "title": "Imininingwane Yokukhokha",
      "subtitle": "Setha indlela yokukhokha ephephile",
      "cardName": "Igama elikwikhadi",
      "cardNumber": "Inombolo yekhadi",
      "expiry": "Usuku lokuphelelwa yisikhathi",
      "cvv": "I-CVV",
      "saveCard": "Londoloza ikhadi lokukhokha kwesikhathi esizayo",
      "confirmPayment": "Qinisekisa Inkokhelo",
      "errors": {
        "nameRequired": "Igama elikwikhadi liyadingeka",
        "cardRequired": "Inombolo yekhadi iyadingeka",
        "expiryRequired": "Usuku lokuphelelwa yisikhathi luyadingeka",
        "cvvRequired": "I-CVV iyadingeka"
      }
    },
    "setup": {
      "title": "Setha i-akhawunti yakho ye-Dott",
      "subtitle": "Imininingwane embalwa yokugcina esidinga ukuyazi ngebhizinisi lakho",
      "industryLabel": "Uhlobo lwemboni",
      "employeesLabel": "Inani labasebenzi",
      "revenueLabel": "Imali engenayo yonyaka elinganiselwe",
      "finishSetup": "Qeda Ukusetha",
      "goToDashboard": "Iya ku-Dashboard"
    }
  },
  
  ko: { // Korean
    "businessInfo": {
      "title": "비즈니스 정보 입력",
      "subtitle": "회사에 대해 알려주세요",
      "nameLabel": "비즈니스 이름",
      "addressLabel": "비즈니스 주소",
      "phoneLabel": "비즈니스 전화번호",
      "emailLabel": "비즈니스 이메일",
      "websiteLabel": "웹사이트 (선택사항)",
      "industryLabel": "산업",
      "nextButton": "구독으로 계속하기",
      "errors": {
        "nameRequired": "비즈니스 이름이 필요합니다",
        "addressRequired": "비즈니스 주소가 필요합니다",
        "phoneRequired": "비즈니스 전화번호가 필요합니다",
        "emailRequired": "비즈니스 이메일이 필요합니다",
        "emailInvalid": "유효한 이메일 주소를 입력해주세요"
      }
    },
    "subscription": {
      "title": "구독 플랜 선택",
      "subtitle": "비즈니스 요구에 맞는 플랜을 선택하세요",
      "basic": "기본",
      "professional": "전문가",
      "premium": "프리미엄",
      "perMonth": "월",
      "selectPlan": "플랜 선택",
      "currentPlan": "현재 플랜",
      "features": {
        "accounting": "회계 및 장부 관리",
        "invoicing": "인보이스 및 청구",
        "expenses": "지출 추적",
        "payroll": "급여 처리",
        "inventory": "재고 관리",
        "support": "24/7 고객 지원"
      }
    },
    "payment": {
      "title": "결제 정보",
      "subtitle": "안전한 결제 방법 설정",
      "cardName": "카드상 이름",
      "cardNumber": "카드 번호",
      "expiry": "만료일",
      "cvv": "CVV",
      "saveCard": "향후 청구를 위해 카드 저장",
      "confirmPayment": "결제 확인",
      "errors": {
        "nameRequired": "카드상 이름이 필요합니다",
        "cardRequired": "카드 번호가 필요합니다",
        "expiryRequired": "만료일이 필요합니다",
        "cvvRequired": "CVV가 필요합니다"
      }
    },
    "setup": {
      "title": "Dott 계정 설정",
      "subtitle": "비즈니스에 대해 알아야 할 몇 가지 최종 세부 정보",
      "industryLabel": "산업 유형",
      "employeesLabel": "직원 수",
      "revenueLabel": "예상 연간 매출",
      "finishSetup": "설정 완료",
      "goToDashboard": "대시보드로 이동"
    }
  }
};
// Define the 15 specific languages we want to focus on
const languages = [
    'en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'hi', 'ru', 'ja', 'sw', 'tr', 'id', 'vi', 'nl',
    'ha', 'yo', 'am', 'zu', 'ko' // Added new languages
  ];
  

// Base directory for locales
const baseDir = path.join(__dirname, 'public', 'locales');

// Create onboarding translation files
languages.forEach(lang => {
  const langDir = path.join(baseDir, lang);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
    console.log(`Created directory: ${langDir}`);
  }
  
  // Create onboarding.json file
  const filePath = path.join(langDir, 'onboarding.json');
  
  // Get the translation for this language, or use English as fallback
  const translationData = onboardingTranslations[lang] || baseOnboardingStrings;
  
  // Don't overwrite existing files unless forced
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(translationData, null, 2));
    console.log(`Created ${filePath}`);
  } else {
    console.log(`File already exists: ${filePath} (skipping)`);
  }
});

console.log('Onboarding translation file creation complete!');