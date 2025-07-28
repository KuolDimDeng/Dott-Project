const fs = require('fs');
const path = require('path');

// Translation data for all languages
const translations = {
  am: { // Amharic
    home: {
      greeting: {
        morning: "እንደምን አደርክ",
        afternoon: "እንደምን ዋልክ",
        evening: "እንደምን አመሸህ"
      },
      subscriptionBanner: {
        active: "የእርስዎ {{planName}} ንቁ ነው",
        activeDescription: "በእቅድዎ ውስጥ የተካተቱትን ሁሉንም ባህሪያት መዳረሻ አለዎት።",
        expired: "የእርስዎ {{previousPlan}} የደንበኝነት ምዝገባ ጊዜው አልፏል",
        expiredDescription: "መለያዎ ወደ ነፃ እቅድ ወርዷል። አሁን ለባህሪያት ውስን መዳረሻ አለዎት።",
        renewButton: "የደንበኝነት ምዝገባን ያድሱ",
        viewDetailsButton: "የእቅድ ዝርዝሮችን ይመልከቱ"
      },
      gettingStarted: {
        title: "መጀመር",
        progress: "{{completed}} ከ {{total}} ተጠናቀቀ",
        description: "ከመለያዎ የበለጠ ለማግኘት እነዚህን ደረጃዎች ያጠናቅቁ:",
        loading: "እድገትዎን በመጫን ላይ...",
        congratulations: "እንኳን ደስ አለዎት! ሁሉንም የማዋቀር ደረጃዎች አጠናቅቀዋል።",
        steps: {
          profile: {
            title: "የንግድ መገለጫዎን ያጠናቅቁ",
            description: "የንግድ ዝርዝሮችዎን እና አርማዎን ያክሉ"
          },
          customer: {
            titleEmpty: "የመጀመሪያ ደንበኛዎን ያክሉ",
            titleWithCount: "{{count}} ደንበኞች ተጨመሩ",
            descriptionEmpty: "የደንበኛ መሰረትዎን መገንባት ይጀምሩ",
            descriptionWithCount: "ደንበኞችዎን ያስተዳድሩ"
          },
          product: {
            titleEmpty: "የመጀመሪያ ምርትዎን ይፍጠሩ",
            titleWithCount: "{{count}} ምርቶች ተፈጠሩ",
            descriptionEmpty: "ወደ ክምችትዎ ምርቶችን ያክሉ",
            descriptionWithCount: "ምርቶችዎን ያስተዳድሩ"
          },
          service: {
            titleEmpty: "የመጀመሪያ አገልግሎትዎን ይፍጠሩ",
            titleWithCount: "{{count}} አገልግሎቶች ተፈጠሩ",
            descriptionEmpty: "የሚያቀርቧቸውን አገልግሎቶች ይግለጹ",
            descriptionWithCount: "አገልግሎቶችዎን ያስተዳድሩ"
          },
          supplier: {
            titleEmpty: "የመጀመሪያ አቅራቢዎን ያክሉ",
            titleWithCount: "{{count}} አቅራቢዎች ተጨመሩ",
            descriptionEmpty: "የአቅርቦት ሰንሰለትዎን ይከታተሉ",
            descriptionWithCount: "አቅራቢዎችዎን ያስተዳድሩ"
          },
          invoice: {
            titleEmpty: "የመጀመሪያ ደረሰኝዎን ይፍጠሩ",
            titleWithCount: "{{count}} ደረሰኞች ተፈጠሩ",
            descriptionEmpty: "ደንበኞችዎን ማስከፈል ይጀምሩ",
            descriptionWithCount: "ደረሰኞችዎን ያስተዳድሩ"
          }
        }
      },
      recentUpdates: {
        title: "የቅርብ ጊዜ ዝመናዎች",
        noUpdates: "ለማሳየት የቅርብ ጊዜ ዝመናዎች የሉም።",
        description: "ስለ መለያ እንቅስቃሴዎ ዝመናዎች እዚህ ይታያሉ።",
        activities: {
          salesToday: "ዛሬ ${{amount}} ሽያጭ",
          unpaidInvoices: "{{count}} ያልተከፈለ ደረሰኝ{{plural}} በመጠባበቅ ላይ",
          overdueInvoices: "{{count}} የጊዜው ያለፈበት ደረሰኝ{{plural}} ትኩረት ይፈልጋል",
          newCustomers: "በዚህ ወር {{count}} አዲስ ደንበኛ{{plural}}"
        }
      },
      quickStats: {
        title: "ፈጣን ስታቲስቲክስ",
        customers: "ደንበኞች",
        products: "ምርቶች",
        services: "አገልግሎቶች",
        invoices: "ደረሰኞች"
      },
      planDetails: {
        title: "የደንበኝነት ምዝገባ ዝርዝሮችዎ",
        perMonth: "በወር",
        active: "ንቁ",
        currentPlan: "የአሁኑ እቅድ",
        featuresIncluded: "የተካተቱ ባህሪያት",
        limitations: "በነፃ እቅድ ላይ ገደቦች",
        upgradePrompt: "ሁሉንም ባህሪያት ለመክፈት እና ገደቦችን ለማስወገድ አሁን ያሻሽሉ!",
        upgradeButton: "እዚህ ያሻሽሉ",
        upgradeToEnterprise: "ወደ ኢንተርፕራይዝ ያሻሽሉ",
        close: "ዝጋ"
      },
      plans: {
        free: {
          name: "ነፃ እቅድ",
          description: "ለአነስተኛ ንግዶች መሰረታዊ ባህሪያት አሁን ጀምረው",
          features: [
            "መሰረታዊ ደረሰኝ",
            "እስከ 5 ደንበኞች",
            "መሰረታዊ ሪፖርት",
            "የኢሜይል ድጋፍ",
            "2GB ማከማቻ"
          ],
          limitations: [
            "በወር እስከ 5 ደረሰኞች ብቻ",
            "ምንም ብጁ ብራንዲንግ የለም",
            "መሰረታዊ ሪፖርት ብቻ",
            "ምንም የኤፒአይ መዳረሻ የለም",
            "ነጠላ ተጠቃሚ ብቻ"
          ]
        },
        professional: {
          name: "ሙያዊ እቅድ",
          description: "ለሚያድጉ ንግዶች የላቁ ባህሪያት",
          features: [
            "ያልተገደበ ደረሰኝ",
            "ያልተገደቡ ደንበኞች",
            "የላቀ ሪፖርት",
            "ቅድሚያ የሚሰጥ ድጋፍ",
            "ብጁ ብራንዲንግ",
            "15GB ማከማቻ",
            "እስከ 3 ተጠቃሚዎች"
          ]
        },
        enterprise: {
          name: "ኢንተርፕራይዝ እቅድ",
          description: "ለተቋቋሙ ንግዶች ሙሉ የመሳሪያዎች ስብስብ",
          features: [
            "በሙያዊ ውስጥ ሁሉም ነገር",
            "ያልተገደበ ማከማቻ",
            "ያልተገደቡ ተጠቃሚዎች",
            "የተሰጠ መለያ አስተዳዳሪ",
            "የላቀ የኤፒአይ መዳረሻ",
            "ብጁ ሚናዎች እና ፈቃዶች",
            "የላቁ የደህንነት ባህሪያት",
            "ተመራጭ የግብይት ዋጋዎች"
          ]
        }
      }
    }
  },
  ar: { // Arabic
    home: {
      greeting: {
        morning: "صباح الخير",
        afternoon: "مساء الخير",
        evening: "مساء الخير"
      },
      subscriptionBanner: {
        active: "خطتك {{planName}} نشطة",
        activeDescription: "لديك إمكانية الوصول إلى جميع الميزات المضمنة في خطتك.",
        expired: "انتهت صلاحية اشتراك {{previousPlan}} الخاص بك",
        expiredDescription: "تم تخفيض حسابك إلى الخطة المجانية. لديك الآن وصول محدود إلى الميزات.",
        renewButton: "تجديد الاشتراك",
        viewDetailsButton: "عرض تفاصيل الخطة"
      },
      gettingStarted: {
        title: "البدء",
        progress: "تم إكمال {{completed}} من {{total}}",
        description: "أكمل هذه الخطوات للاستفادة القصوى من حسابك:",
        loading: "جاري تحميل تقدمك...",
        congratulations: "تهانينا! لقد أكملت جميع خطوات الإعداد.",
        steps: {
          profile: {
            title: "أكمل ملف عملك التجاري",
            description: "أضف تفاصيل عملك وشعارك"
          },
          customer: {
            titleEmpty: "أضف عميلك الأول",
            titleWithCount: "تمت إضافة {{count}} عملاء",
            descriptionEmpty: "ابدأ في بناء قاعدة عملائك",
            descriptionWithCount: "إدارة عملائك"
          },
          product: {
            titleEmpty: "أنشئ منتجك الأول",
            titleWithCount: "تم إنشاء {{count}} منتجات",
            descriptionEmpty: "أضف منتجات إلى مخزونك",
            descriptionWithCount: "إدارة منتجاتك"
          },
          service: {
            titleEmpty: "أنشئ خدمتك الأولى",
            titleWithCount: "تم إنشاء {{count}} خدمات",
            descriptionEmpty: "حدد الخدمات التي تقدمها",
            descriptionWithCount: "إدارة خدماتك"
          },
          supplier: {
            titleEmpty: "أضف موردك الأول",
            titleWithCount: "تمت إضافة {{count}} موردين",
            descriptionEmpty: "تتبع سلسلة التوريد الخاصة بك",
            descriptionWithCount: "إدارة مورديك"
          },
          invoice: {
            titleEmpty: "أنشئ فاتورتك الأولى",
            titleWithCount: "تم إنشاء {{count}} فواتير",
            descriptionEmpty: "ابدأ في محاسبة عملائك",
            descriptionWithCount: "إدارة فواتيرك"
          }
        }
      },
      recentUpdates: {
        title: "التحديثات الأخيرة",
        noUpdates: "لا توجد تحديثات حديثة لعرضها.",
        description: "ستظهر التحديثات حول نشاط حسابك هنا.",
        activities: {
          salesToday: "{{amount}}$ في المبيعات اليوم",
          unpaidInvoices: "{{count}} فاتورة غير مدفوعة{{plural}} معلقة",
          overdueInvoices: "{{count}} فاتورة متأخرة{{plural}} تحتاج إلى اهتمام",
          newCustomers: "{{count}} عميل جديد{{plural}} هذا الشهر"
        }
      },
      quickStats: {
        title: "إحصائيات سريعة",
        customers: "العملاء",
        products: "المنتجات",
        services: "الخدمات",
        invoices: "الفواتير"
      },
      planDetails: {
        title: "تفاصيل اشتراكك",
        perMonth: "شهريا",
        active: "نشط",
        currentPlan: "الخطة الحالية",
        featuresIncluded: "الميزات المضمنة",
        limitations: "القيود على الخطة المجانية",
        upgradePrompt: "قم بالترقية الآن لفتح جميع الميزات وإزالة القيود!",
        upgradeButton: "قم بالترقية هنا",
        upgradeToEnterprise: "الترقية إلى المؤسسة",
        close: "إغلاق"
      },
      plans: {
        free: {
          name: "الخطة المجانية",
          description: "ميزات أساسية للشركات الصغيرة التي بدأت للتو",
          features: [
            "الفواتير الأساسية",
            "حتى 5 عملاء",
            "التقارير الأساسية",
            "دعم البريد الإلكتروني",
            "2 جيجابايت تخزين"
          ],
          limitations: [
            "محدود بـ 5 فواتير شهريًا",
            "لا توجد علامة تجارية مخصصة",
            "التقارير الأساسية فقط",
            "لا يوجد وصول API",
            "مستخدم واحد فقط"
          ]
        },
        professional: {
          name: "الخطة المهنية",
          description: "ميزات متقدمة للأعمال النامية",
          features: [
            "فواتير غير محدودة",
            "عملاء غير محدودين",
            "تقارير متقدمة",
            "دعم ذو أولوية",
            "علامة تجارية مخصصة",
            "15 جيجابايت تخزين",
            "حتى 3 مستخدمين"
          ]
        },
        enterprise: {
          name: "خطة المؤسسة",
          description: "مجموعة كاملة من الأدوات للأعمال الراسخة",
          features: [
            "كل شيء في المهنية",
            "تخزين غير محدود",
            "مستخدمون غير محدودين",
            "مدير حساب مخصص",
            "وصول API متقدم",
            "أدوار وأذونات مخصصة",
            "ميزات أمان متقدمة",
            "أسعار معاملات تفضيلية"
          ]
        }
      }
    }
  },
  de: { // German
    home: {
      greeting: {
        morning: "Guten Morgen",
        afternoon: "Guten Tag",
        evening: "Guten Abend"
      },
      subscriptionBanner: {
        active: "Ihr {{planName}} ist aktiv",
        activeDescription: "Sie haben Zugriff auf alle in Ihrem Plan enthaltenen Funktionen.",
        expired: "Ihr {{previousPlan}} Abonnement ist abgelaufen",
        expiredDescription: "Ihr Konto wurde auf den kostenlosen Plan herabgestuft. Sie haben jetzt begrenzten Zugriff auf Funktionen.",
        renewButton: "Abonnement erneuern",
        viewDetailsButton: "Plandetails anzeigen"
      },
      gettingStarted: {
        title: "Erste Schritte",
        progress: "{{completed}} von {{total}} abgeschlossen",
        description: "Führen Sie diese Schritte aus, um das Beste aus Ihrem Konto herauszuholen:",
        loading: "Lade Ihren Fortschritt...",
        congratulations: "Glückwunsch! Sie haben alle Einrichtungsschritte abgeschlossen.",
        steps: {
          profile: {
            title: "Vervollständigen Sie Ihr Unternehmensprofil",
            description: "Fügen Sie Ihre Geschäftsdetails und Ihr Logo hinzu"
          },
          customer: {
            titleEmpty: "Fügen Sie Ihren ersten Kunden hinzu",
            titleWithCount: "{{count}} Kunden hinzugefügt",
            descriptionEmpty: "Beginnen Sie mit dem Aufbau Ihrer Kundenbasis",
            descriptionWithCount: "Verwalten Sie Ihre Kunden"
          },
          product: {
            titleEmpty: "Erstellen Sie Ihr erstes Produkt",
            titleWithCount: "{{count}} Produkte erstellt",
            descriptionEmpty: "Fügen Sie Produkte zu Ihrem Inventar hinzu",
            descriptionWithCount: "Verwalten Sie Ihre Produkte"
          },
          service: {
            titleEmpty: "Erstellen Sie Ihre erste Dienstleistung",
            titleWithCount: "{{count}} Dienstleistungen erstellt",
            descriptionEmpty: "Definieren Sie Dienstleistungen, die Sie anbieten",
            descriptionWithCount: "Verwalten Sie Ihre Dienstleistungen"
          },
          supplier: {
            titleEmpty: "Fügen Sie Ihren ersten Lieferanten hinzu",
            titleWithCount: "{{count}} Lieferanten hinzugefügt",
            descriptionEmpty: "Verfolgen Sie Ihre Lieferkette",
            descriptionWithCount: "Verwalten Sie Ihre Lieferanten"
          },
          invoice: {
            titleEmpty: "Erstellen Sie Ihre erste Rechnung",
            titleWithCount: "{{count}} Rechnungen erstellt",
            descriptionEmpty: "Beginnen Sie mit der Rechnungsstellung an Ihre Kunden",
            descriptionWithCount: "Verwalten Sie Ihre Rechnungen"
          }
        }
      },
      recentUpdates: {
        title: "Aktuelle Updates",
        noUpdates: "Keine aktuellen Updates zum Anzeigen.",
        description: "Updates zu Ihrer Kontoaktivität werden hier angezeigt.",
        activities: {
          salesToday: "${{amount}} Umsatz heute",
          unpaidInvoices: "{{count}} unbezahlte Rechnung{{plural}} ausstehend",
          overdueInvoices: "{{count}} überfällige Rechnung{{plural}} benötigen Aufmerksamkeit",
          newCustomers: "{{count}} neue{{plural}} Kunde{{plural}} diesen Monat"
        }
      },
      quickStats: {
        title: "Schnellstatistiken",
        customers: "Kunden",
        products: "Produkte",
        services: "Dienstleistungen",
        invoices: "Rechnungen"
      },
      planDetails: {
        title: "Ihre Abonnementdetails",
        perMonth: "pro Monat",
        active: "Aktiv",
        currentPlan: "Aktueller Plan",
        featuresIncluded: "Enthaltene Funktionen",
        limitations: "Einschränkungen beim kostenlosen Plan",
        upgradePrompt: "Upgraden Sie jetzt, um alle Funktionen freizuschalten und Einschränkungen zu entfernen!",
        upgradeButton: "Hier upgraden",
        upgradeToEnterprise: "Auf Enterprise upgraden",
        close: "Schließen"
      },
      plans: {
        free: {
          name: "Kostenloser Plan",
          description: "Grundlegende Funktionen für kleine Unternehmen, die gerade erst anfangen",
          features: [
            "Grundlegende Rechnungsstellung",
            "Bis zu 5 Kunden",
            "Grundlegende Berichte",
            "E-Mail-Support",
            "2GB Speicher"
          ],
          limitations: [
            "Begrenzt auf 5 Rechnungen pro Monat",
            "Kein individuelles Branding",
            "Nur grundlegende Berichte",
            "Kein API-Zugriff",
            "Nur einzelner Benutzer"
          ]
        },
        professional: {
          name: "Professional Plan",
          description: "Erweiterte Funktionen für wachsende Unternehmen",
          features: [
            "Unbegrenzte Rechnungsstellung",
            "Unbegrenzte Kunden",
            "Erweiterte Berichte",
            "Prioritäts-Support",
            "Individuelles Branding",
            "15GB Speicher",
            "Bis zu 3 Benutzer"
          ]
        },
        enterprise: {
          name: "Enterprise Plan",
          description: "Vollständige Tool-Suite für etablierte Unternehmen",
          features: [
            "Alles in Professional",
            "Unbegrenzter Speicher",
            "Unbegrenzte Benutzer",
            "Dedizierter Account Manager",
            "Erweiterter API-Zugriff",
            "Benutzerdefinierte Rollen und Berechtigungen",
            "Erweiterte Sicherheitsfunktionen",
            "Vorzugstarife für Transaktionen"
          ]
        }
      }
    }
  },
  es: { // Spanish
    home: {
      greeting: {
        morning: "Buenos días",
        afternoon: "Buenas tardes",
        evening: "Buenas noches"
      },
      subscriptionBanner: {
        active: "Tu {{planName}} está activo",
        activeDescription: "Tienes acceso a todas las funciones incluidas en tu plan.",
        expired: "Tu suscripción {{previousPlan}} ha expirado",
        expiredDescription: "Tu cuenta ha sido degradada al plan gratuito. Ahora tienes acceso limitado a las funciones.",
        renewButton: "Renovar suscripción",
        viewDetailsButton: "Ver detalles del plan"
      },
      gettingStarted: {
        title: "Primeros pasos",
        progress: "{{completed}} de {{total}} completados",
        description: "Completa estos pasos para aprovechar al máximo tu cuenta:",
        loading: "Cargando tu progreso...",
        congratulations: "¡Felicitaciones! Has completado todos los pasos de configuración.",
        steps: {
          profile: {
            title: "Completa tu perfil empresarial",
            description: "Agrega los detalles de tu negocio y tu logo"
          },
          customer: {
            titleEmpty: "Agrega tu primer cliente",
            titleWithCount: "{{count}} clientes agregados",
            descriptionEmpty: "Comienza a construir tu base de clientes",
            descriptionWithCount: "Administra tus clientes"
          },
          product: {
            titleEmpty: "Crea tu primer producto",
            titleWithCount: "{{count}} productos creados",
            descriptionEmpty: "Agrega productos a tu inventario",
            descriptionWithCount: "Administra tus productos"
          },
          service: {
            titleEmpty: "Crea tu primer servicio",
            titleWithCount: "{{count}} servicios creados",
            descriptionEmpty: "Define los servicios que ofreces",
            descriptionWithCount: "Administra tus servicios"
          },
          supplier: {
            titleEmpty: "Agrega tu primer proveedor",
            titleWithCount: "{{count}} proveedores agregados",
            descriptionEmpty: "Rastrea tu cadena de suministro",
            descriptionWithCount: "Administra tus proveedores"
          },
          invoice: {
            titleEmpty: "Crea tu primera factura",
            titleWithCount: "{{count}} facturas creadas",
            descriptionEmpty: "Comienza a facturar a tus clientes",
            descriptionWithCount: "Administra tus facturas"
          }
        }
      },
      recentUpdates: {
        title: "Actualizaciones recientes",
        noUpdates: "No hay actualizaciones recientes para mostrar.",
        description: "Las actualizaciones sobre la actividad de tu cuenta aparecerán aquí.",
        activities: {
          salesToday: "${{amount}} en ventas hoy",
          unpaidInvoices: "{{count}} factura{{plural}} sin pagar pendiente{{plural}}",
          overdueInvoices: "{{count}} factura{{plural}} vencida{{plural}} necesitan atención",
          newCustomers: "{{count}} cliente{{plural}} nuevo{{plural}} este mes"
        }
      },
      quickStats: {
        title: "Estadísticas rápidas",
        customers: "Clientes",
        products: "Productos",
        services: "Servicios",
        invoices: "Facturas"
      },
      planDetails: {
        title: "Detalles de tu suscripción",
        perMonth: "por mes",
        active: "Activo",
        currentPlan: "Plan actual",
        featuresIncluded: "Funciones incluidas",
        limitations: "Limitaciones en el plan gratuito",
        upgradePrompt: "¡Actualiza ahora para desbloquear todas las funciones y eliminar limitaciones!",
        upgradeButton: "Actualizar aquí",
        upgradeToEnterprise: "Actualizar a Enterprise",
        close: "Cerrar"
      },
      plans: {
        free: {
          name: "Plan gratuito",
          description: "Funciones básicas para pequeñas empresas que recién comienzan",
          features: [
            "Facturación básica",
            "Hasta 5 clientes",
            "Informes básicos",
            "Soporte por correo electrónico",
            "2GB de almacenamiento"
          ],
          limitations: [
            "Limitado a 5 facturas por mes",
            "Sin marca personalizada",
            "Solo informes básicos",
            "Sin acceso a API",
            "Solo un usuario"
          ]
        },
        professional: {
          name: "Plan Profesional",
          description: "Funciones avanzadas para empresas en crecimiento",
          features: [
            "Facturación ilimitada",
            "Clientes ilimitados",
            "Informes avanzados",
            "Soporte prioritario",
            "Marca personalizada",
            "15GB de almacenamiento",
            "Hasta 3 usuarios"
          ]
        },
        enterprise: {
          name: "Plan Enterprise",
          description: "Suite completa de herramientas para empresas establecidas",
          features: [
            "Todo en Profesional",
            "Almacenamiento ilimitado",
            "Usuarios ilimitados",
            "Gerente de cuenta dedicado",
            "Acceso avanzado a API",
            "Roles y permisos personalizados",
            "Funciones de seguridad avanzadas",
            "Tarifas preferenciales de transacción"
          ]
        }
      }
    }
  },
  fr: { // French
    home: {
      greeting: {
        morning: "Bonjour",
        afternoon: "Bon après-midi",
        evening: "Bonsoir"
      },
      subscriptionBanner: {
        active: "Votre {{planName}} est actif",
        activeDescription: "Vous avez accès à toutes les fonctionnalités incluses dans votre plan.",
        expired: "Votre abonnement {{previousPlan}} a expiré",
        expiredDescription: "Votre compte a été rétrogradé au plan gratuit. Vous avez maintenant un accès limité aux fonctionnalités.",
        renewButton: "Renouveler l'abonnement",
        viewDetailsButton: "Voir les détails du plan"
      },
      gettingStarted: {
        title: "Commencer",
        progress: "{{completed}} sur {{total}} terminés",
        description: "Complétez ces étapes pour tirer le meilleur parti de votre compte :",
        loading: "Chargement de votre progression...",
        congratulations: "Félicitations ! Vous avez terminé toutes les étapes de configuration.",
        steps: {
          profile: {
            title: "Complétez votre profil d'entreprise",
            description: "Ajoutez les détails de votre entreprise et votre logo"
          },
          customer: {
            titleEmpty: "Ajoutez votre premier client",
            titleWithCount: "{{count}} clients ajoutés",
            descriptionEmpty: "Commencez à construire votre base de clients",
            descriptionWithCount: "Gérez vos clients"
          },
          product: {
            titleEmpty: "Créez votre premier produit",
            titleWithCount: "{{count}} produits créés",
            descriptionEmpty: "Ajoutez des produits à votre inventaire",
            descriptionWithCount: "Gérez vos produits"
          },
          service: {
            titleEmpty: "Créez votre premier service",
            titleWithCount: "{{count}} services créés",
            descriptionEmpty: "Définissez les services que vous offrez",
            descriptionWithCount: "Gérez vos services"
          },
          supplier: {
            titleEmpty: "Ajoutez votre premier fournisseur",
            titleWithCount: "{{count}} fournisseurs ajoutés",
            descriptionEmpty: "Suivez votre chaîne d'approvisionnement",
            descriptionWithCount: "Gérez vos fournisseurs"
          },
          invoice: {
            titleEmpty: "Créez votre première facture",
            titleWithCount: "{{count}} factures créées",
            descriptionEmpty: "Commencez à facturer vos clients",
            descriptionWithCount: "Gérez vos factures"
          }
        }
      },
      recentUpdates: {
        title: "Mises à jour récentes",
        noUpdates: "Aucune mise à jour récente à afficher.",
        description: "Les mises à jour concernant l'activité de votre compte apparaîtront ici.",
        activities: {
          salesToday: "{{amount}}$ de ventes aujourd'hui",
          unpaidInvoices: "{{count}} facture{{plural}} impayée{{plural}} en attente",
          overdueInvoices: "{{count}} facture{{plural}} en retard nécessitent une attention",
          newCustomers: "{{count}} nouveau{{plural}} client{{plural}} ce mois-ci"
        }
      },
      quickStats: {
        title: "Statistiques rapides",
        customers: "Clients",
        products: "Produits",
        services: "Services",
        invoices: "Factures"
      },
      planDetails: {
        title: "Détails de votre abonnement",
        perMonth: "par mois",
        active: "Actif",
        currentPlan: "Plan actuel",
        featuresIncluded: "Fonctionnalités incluses",
        limitations: "Limitations du plan gratuit",
        upgradePrompt: "Mettez à niveau maintenant pour débloquer toutes les fonctionnalités et supprimer les limitations !",
        upgradeButton: "Mettre à niveau ici",
        upgradeToEnterprise: "Passer à Enterprise",
        close: "Fermer"
      },
      plans: {
        free: {
          name: "Plan gratuit",
          description: "Fonctionnalités de base pour les petites entreprises qui débutent",
          features: [
            "Facturation de base",
            "Jusqu'à 5 clients",
            "Rapports de base",
            "Support par e-mail",
            "2 Go de stockage"
          ],
          limitations: [
            "Limité à 5 factures par mois",
            "Pas de marque personnalisée",
            "Rapports de base uniquement",
            "Pas d'accès API",
            "Utilisateur unique seulement"
          ]
        },
        professional: {
          name: "Plan Professionnel",
          description: "Fonctionnalités avancées pour les entreprises en croissance",
          features: [
            "Facturation illimitée",
            "Clients illimités",
            "Rapports avancés",
            "Support prioritaire",
            "Marque personnalisée",
            "15 Go de stockage",
            "Jusqu'à 3 utilisateurs"
          ]
        },
        enterprise: {
          name: "Plan Enterprise",
          description: "Suite complète d'outils pour les entreprises établies",
          features: [
            "Tout dans Professionnel",
            "Stockage illimité",
            "Utilisateurs illimités",
            "Gestionnaire de compte dédié",
            "Accès API avancé",
            "Rôles et permissions personnalisés",
            "Fonctionnalités de sécurité avancées",
            "Tarifs de transaction préférentiels"
          ]
        }
      }
    }
  },
  ha: { // Hausa
    home: {
      greeting: {
        morning: "Ina kwana",
        afternoon: "Ina wuni",
        evening: "Ina yini"
      },
      subscriptionBanner: {
        active: "Tsarin {{planName}} ku yana aiki",
        activeDescription: "Kuna da damar yin amfani da duk abubuwan da ke cikin tsarin ku.",
        expired: "Tsarin {{previousPlan}} ku ya ƙare",
        expiredDescription: "An rage asusun ku zuwa tsarin kyauta. Yanzu kuna da iyakacin damar yin amfani da abubuwa.",
        renewButton: "Sabunta Biyan Kuɗi",
        viewDetailsButton: "Duba Cikakken Bayani"
      },
      gettingStarted: {
        title: "Farawa",
        progress: "An kammala {{completed}} daga {{total}}",
        description: "Kammala waɗannan matakan don samun mafi kyau daga asusunku:",
        loading: "Ana loda ci gaban ku...",
        congratulations: "Taya murna! Kun kammala duk matakan saitawa.",
        steps: {
          profile: {
            title: "Kammala bayanan kasuwancin ku",
            description: "Ƙara bayanan kasuwancin ku da tambarin ku"
          },
          customer: {
            titleEmpty: "Ƙara abokin ciniki na farko",
            titleWithCount: "An ƙara abokan ciniki {{count}}",
            descriptionEmpty: "Fara gina tushen abokan ciniki",
            descriptionWithCount: "Sarrafa abokan cinikin ku"
          },
          product: {
            titleEmpty: "Ƙirƙiri samfurin ku na farko",
            titleWithCount: "An ƙirƙiri samfurori {{count}}",
            descriptionEmpty: "Ƙara samfurori zuwa cikin kayayyaki",
            descriptionWithCount: "Sarrafa samfuran ku"
          },
          service: {
            titleEmpty: "Ƙirƙiri sabis ɗin ku na farko",
            titleWithCount: "An ƙirƙiri sabis {{count}}",
            descriptionEmpty: "Bayyana ayyukan da kuke bayarwa",
            descriptionWithCount: "Sarrafa ayyukan ku"
          },
          supplier: {
            titleEmpty: "Ƙara mai samar da kayayyaki na farko",
            titleWithCount: "An ƙara masu samar da kayayyaki {{count}}",
            descriptionEmpty: "Bi sawun sarkar samar da kayayyaki",
            descriptionWithCount: "Sarrafa masu samar da kayayyaki"
          },
          invoice: {
            titleEmpty: "Ƙirƙiri daftarin kuɗin ku na farko",
            titleWithCount: "An ƙirƙiri takardar kuɗi {{count}}",
            descriptionEmpty: "Fara aika bil ga abokan cinikin ku",
            descriptionWithCount: "Sarrafa takardun kuɗin ku"
          }
        }
      },
      recentUpdates: {
        title: "Sabuntawa na Kwanan nan",
        noUpdates: "Babu sabuntawar kwanan nan da za a nuna.",
        description: "Sabuntawa game da ayyukan asusunku za su bayyana a nan.",
        activities: {
          salesToday: "${{amount}} a tallace-tallace yau",
          unpaidInvoices: "Takardar kuɗi {{count}} da ba a biya ba{{plural}} a jira",
          overdueInvoices: "Takardar kuɗi {{count}} da ta wuce lokaci{{plural}} suna buƙatar kulawa",
          newCustomers: "Sabon abokin ciniki {{count}}{{plural}} a wannan watan"
        }
      },
      quickStats: {
        title: "Ƙididdiga mai sauri",
        customers: "Abokan ciniki",
        products: "Samfurori",
        services: "Ayyuka",
        invoices: "Takardun kuɗi"
      },
      planDetails: {
        title: "Cikakken Bayani na Biyan Kuɗi",
        perMonth: "a kowane wata",
        active: "Yana aiki",
        currentPlan: "Tsarin Yanzu",
        featuresIncluded: "Abubuwan da aka haɗa",
        limitations: "Iyakoki akan Tsarin Kyauta",
        upgradePrompt: "Haɓaka yanzu don buɗe duk abubuwan da kuma cire iyakoki!",
        upgradeButton: "Haɓaka Anan",
        upgradeToEnterprise: "Haɓaka zuwa Babban Kasuwanci",
        close: "Rufe"
      },
      plans: {
        free: {
          name: "Tsarin Kyauta",
          description: "Abubuwan asali don ƙananan kasuwanci da suka fara",
          features: [
            "Lissafin kuɗi na asali",
            "Har zuwa abokan ciniki 5",
            "Rahotanni na asali",
            "Tallafin imel",
            "Ajiyar 2GB"
          ],
          limitations: [
            "Iyakance zuwa takardun kuɗi 5 a kowane wata",
            "Babu alamar kasuwanci ta musamman",
            "Rahotanni na asali kawai",
            "Babu damar shiga API",
            "Mai amfani ɗaya kawai"
          ]
        },
        professional: {
          name: "Tsarin Ƙwararru",
          description: "Abubuwa masu zurfi don kasuwancin da ke girma",
          features: [
            "Lissafin kuɗi mara iyaka",
            "Abokan ciniki marasa iyaka",
            "Rahotanni masu zurfi",
            "Tallafin fifiko",
            "Alamar kasuwanci ta musamman",
            "Ajiyar 15GB",
            "Har zuwa masu amfani 3"
          ]
        },
        enterprise: {
          name: "Tsarin Babban Kasuwanci",
          description: "Cikakken kayan aiki don ƙwararrun kasuwanci",
          features: [
            "Duk abin da ke cikin Ƙwararru",
            "Ajiya mara iyaka",
            "Masu amfani marasa iyaka",
            "Mai sarrafa asusu na musamman",
            "Damar shiga API mai zurfi",
            "Matsayi da izini na musamman",
            "Abubuwan tsaro masu zurfi",
            "Farashin ciniki mai dacewa"
          ]
        }
      }
    }
  },
  hi: { // Hindi
    home: {
      greeting: {
        morning: "सुप्रभात",
        afternoon: "नमस्ते",
        evening: "शुभ संध्या"
      },
      subscriptionBanner: {
        active: "आपका {{planName}} सक्रिय है",
        activeDescription: "आपके पास अपनी योजना में शामिल सभी सुविधाओं तक पहुंच है।",
        expired: "आपकी {{previousPlan}} सदस्यता समाप्त हो गई है",
        expiredDescription: "आपका खाता मुफ्त योजना में डाउनग्रेड कर दिया गया है। अब आपके पास सुविधाओं तक सीमित पहुंच है।",
        renewButton: "सदस्यता नवीनीकृत करें",
        viewDetailsButton: "योजना विवरण देखें"
      },
      gettingStarted: {
        title: "शुरुआत करना",
        progress: "{{total}} में से {{completed}} पूर्ण",
        description: "अपने खाते से अधिकतम लाभ उठाने के लिए इन चरणों को पूरा करें:",
        loading: "आपकी प्रगति लोड हो रही है...",
        congratulations: "बधाई हो! आपने सभी सेटअप चरण पूरे कर लिए हैं।",
        steps: {
          profile: {
            title: "अपना व्यवसाय प्रोफ़ाइल पूरा करें",
            description: "अपने व्यवसाय विवरण और लोगो जोड़ें"
          },
          customer: {
            titleEmpty: "अपना पहला ग्राहक जोड़ें",
            titleWithCount: "{{count}} ग्राहक जोड़े गए",
            descriptionEmpty: "अपना ग्राहक आधार बनाना शुरू करें",
            descriptionWithCount: "अपने ग्राहकों को प्रबंधित करें"
          },
          product: {
            titleEmpty: "अपना पहला उत्पाद बनाएं",
            titleWithCount: "{{count}} उत्पाद बनाए गए",
            descriptionEmpty: "अपनी सूची में उत्पाद जोड़ें",
            descriptionWithCount: "अपने उत्पादों को प्रबंधित करें"
          },
          service: {
            titleEmpty: "अपनी पहली सेवा बनाएं",
            titleWithCount: "{{count}} सेवाएं बनाई गईं",
            descriptionEmpty: "आप जो सेवाएं प्रदान करते हैं उन्हें परिभाषित करें",
            descriptionWithCount: "अपनी सेवाओं को प्रबंधित करें"
          },
          supplier: {
            titleEmpty: "अपना पहला आपूर्तिकर्ता जोड़ें",
            titleWithCount: "{{count}} आपूर्तिकर्ता जोड़े गए",
            descriptionEmpty: "अपनी आपूर्ति श्रृंखला को ट्रैक करें",
            descriptionWithCount: "अपने आपूर्तिकर्ताओं को प्रबंधित करें"
          },
          invoice: {
            titleEmpty: "अपना पहला चालान बनाएं",
            titleWithCount: "{{count}} चालान बनाए गए",
            descriptionEmpty: "अपने ग्राहकों को बिल देना शुरू करें",
            descriptionWithCount: "अपने चालानों को प्रबंधित करें"
          }
        }
      },
      recentUpdates: {
        title: "हाल के अपडेट",
        noUpdates: "दिखाने के लिए कोई हालिया अपडेट नहीं।",
        description: "आपकी खाता गतिविधि के बारे में अपडेट यहां दिखाई देंगे।",
        activities: {
          salesToday: "आज ${{amount}} की बिक्री",
          unpaidInvoices: "{{count}} अवैतनिक चालान{{plural}} लंबित",
          overdueInvoices: "{{count}} अतिदेय चालान{{plural}} को ध्यान देने की आवश्यकता है",
          newCustomers: "इस महीने {{count}} नए ग्राहक{{plural}}"
        }
      },
      quickStats: {
        title: "त्वरित आंकड़े",
        customers: "ग्राहक",
        products: "उत्पाद",
        services: "सेवाएं",
        invoices: "चालान"
      },
      planDetails: {
        title: "आपकी सदस्यता विवरण",
        perMonth: "प्रति माह",
        active: "सक्रिय",
        currentPlan: "वर्तमान योजना",
        featuresIncluded: "शामिल सुविधाएं",
        limitations: "मुफ्त योजना पर सीमाएं",
        upgradePrompt: "सभी सुविधाओं को अनलॉक करने और सीमाओं को हटाने के लिए अभी अपग्रेड करें!",
        upgradeButton: "यहां अपग्रेड करें",
        upgradeToEnterprise: "एंटरप्राइज़ में अपग्रेड करें",
        close: "बंद करें"
      },
      plans: {
        free: {
          name: "मुफ्त योजना",
          description: "छोटे व्यवसायों के लिए बुनियादी सुविधाएं जो अभी शुरू कर रहे हैं",
          features: [
            "बुनियादी चालान",
            "5 ग्राहक तक",
            "बुनियादी रिपोर्टिंग",
            "ईमेल समर्थन",
            "2GB भंडारण"
          ],
          limitations: [
            "प्रति माह 5 चालान तक सीमित",
            "कोई कस्टम ब्रांडिंग नहीं",
            "केवल बुनियादी रिपोर्टिंग",
            "कोई API पहुंच नहीं",
            "केवल एकल उपयोगकर्ता"
          ]
        },
        professional: {
          name: "पेशेवर योजना",
          description: "बढ़ते व्यवसायों के लिए उन्नत सुविधाएं",
          features: [
            "असीमित चालान",
            "असीमित ग्राहक",
            "उन्नत रिपोर्टिंग",
            "प्राथमिकता समर्थन",
            "कस्टम ब्रांडिंग",
            "15GB भंडारण",
            "3 उपयोगकर्ताओं तक"
          ]
        },
        enterprise: {
          name: "एंटरप्राइज़ योजना",
          description: "स्थापित व्यवसायों के लिए उपकरणों का पूर्ण सूट",
          features: [
            "पेशेवर में सब कुछ",
            "असीमित भंडारण",
            "असीमित उपयोगकर्ता",
            "समर्पित खाता प्रबंधक",
            "उन्नत API पहुंच",
            "कस्टम भूमिकाएं और अनुमतियां",
            "उन्नत सुरक्षा सुविधाएं",
            "अधिमान्य लेनदेन दरें"
          ]
        }
      }
    }
  },
  id: { // Indonesian
    home: {
      greeting: {
        morning: "Selamat pagi",
        afternoon: "Selamat siang",
        evening: "Selamat malam"
      },
      subscriptionBanner: {
        active: "{{planName}} Anda aktif",
        activeDescription: "Anda memiliki akses ke semua fitur yang termasuk dalam paket Anda.",
        expired: "Langganan {{previousPlan}} Anda telah kedaluwarsa",
        expiredDescription: "Akun Anda telah diturunkan ke paket gratis. Sekarang Anda memiliki akses terbatas ke fitur.",
        renewButton: "Perbarui Langganan",
        viewDetailsButton: "Lihat Detail Paket"
      },
      gettingStarted: {
        title: "Memulai",
        progress: "{{completed}} dari {{total}} selesai",
        description: "Selesaikan langkah-langkah ini untuk mendapatkan hasil maksimal dari akun Anda:",
        loading: "Memuat kemajuan Anda...",
        congratulations: "Selamat! Anda telah menyelesaikan semua langkah pengaturan.",
        steps: {
          profile: {
            title: "Lengkapi profil bisnis Anda",
            description: "Tambahkan detail bisnis dan logo Anda"
          },
          customer: {
            titleEmpty: "Tambahkan pelanggan pertama Anda",
            titleWithCount: "{{count}} pelanggan ditambahkan",
            descriptionEmpty: "Mulai membangun basis pelanggan Anda",
            descriptionWithCount: "Kelola pelanggan Anda"
          },
          product: {
            titleEmpty: "Buat produk pertama Anda",
            titleWithCount: "{{count}} produk dibuat",
            descriptionEmpty: "Tambahkan produk ke inventaris Anda",
            descriptionWithCount: "Kelola produk Anda"
          },
          service: {
            titleEmpty: "Buat layanan pertama Anda",
            titleWithCount: "{{count}} layanan dibuat",
            descriptionEmpty: "Tentukan layanan yang Anda tawarkan",
            descriptionWithCount: "Kelola layanan Anda"
          },
          supplier: {
            titleEmpty: "Tambahkan pemasok pertama Anda",
            titleWithCount: "{{count}} pemasok ditambahkan",
            descriptionEmpty: "Lacak rantai pasokan Anda",
            descriptionWithCount: "Kelola pemasok Anda"
          },
          invoice: {
            titleEmpty: "Buat faktur pertama Anda",
            titleWithCount: "{{count}} faktur dibuat",
            descriptionEmpty: "Mulai menagih pelanggan Anda",
            descriptionWithCount: "Kelola faktur Anda"
          }
        }
      },
      recentUpdates: {
        title: "Pembaruan Terbaru",
        noUpdates: "Tidak ada pembaruan terbaru untuk ditampilkan.",
        description: "Pembaruan tentang aktivitas akun Anda akan muncul di sini.",
        activities: {
          salesToday: "${{amount}} dalam penjualan hari ini",
          unpaidInvoices: "{{count}} faktur belum dibayar{{plural}} tertunda",
          overdueInvoices: "{{count}} faktur jatuh tempo{{plural}} memerlukan perhatian",
          newCustomers: "{{count}} pelanggan baru{{plural}} bulan ini"
        }
      },
      quickStats: {
        title: "Statistik Cepat",
        customers: "Pelanggan",
        products: "Produk",
        services: "Layanan",
        invoices: "Faktur"
      },
      planDetails: {
        title: "Detail Langganan Anda",
        perMonth: "per bulan",
        active: "Aktif",
        currentPlan: "Paket Saat Ini",
        featuresIncluded: "Fitur Termasuk",
        limitations: "Batasan pada Paket Gratis",
        upgradePrompt: "Tingkatkan sekarang untuk membuka semua fitur dan menghapus batasan!",
        upgradeButton: "Tingkatkan Di Sini",
        upgradeToEnterprise: "Tingkatkan ke Enterprise",
        close: "Tutup"
      },
      plans: {
        free: {
          name: "Paket Gratis",
          description: "Fitur dasar untuk bisnis kecil yang baru memulai",
          features: [
            "Faktur dasar",
            "Hingga 5 klien",
            "Laporan dasar",
            "Dukungan email",
            "Penyimpanan 2GB"
          ],
          limitations: [
            "Terbatas hingga 5 faktur per bulan",
            "Tidak ada branding kustom",
            "Hanya laporan dasar",
            "Tidak ada akses API",
            "Hanya pengguna tunggal"
          ]
        },
        professional: {
          name: "Paket Profesional",
          description: "Fitur lanjutan untuk bisnis yang berkembang",
          features: [
            "Faktur tak terbatas",
            "Klien tak terbatas",
            "Laporan lanjutan",
            "Dukungan prioritas",
            "Branding kustom",
            "Penyimpanan 15GB",
            "Hingga 3 pengguna"
          ]
        },
        enterprise: {
          name: "Paket Enterprise",
          description: "Suite lengkap alat untuk bisnis mapan",
          features: [
            "Semua yang ada di Profesional",
            "Penyimpanan tak terbatas",
            "Pengguna tak terbatas",
            "Manajer akun khusus",
            "Akses API lanjutan",
            "Peran & izin kustom",
            "Fitur keamanan lanjutan",
            "Tarif transaksi preferensial"
          ]
        }
      }
    }
  },
  ja: { // Japanese
    home: {
      greeting: {
        morning: "おはようございます",
        afternoon: "こんにちは",
        evening: "こんばんは"
      },
      subscriptionBanner: {
        active: "{{planName}}がアクティブです",
        activeDescription: "プランに含まれるすべての機能にアクセスできます。",
        expired: "{{previousPlan}}サブスクリプションの有効期限が切れました",
        expiredDescription: "アカウントは無料プランにダウングレードされました。機能へのアクセスが制限されています。",
        renewButton: "サブスクリプションを更新",
        viewDetailsButton: "プランの詳細を表示"
      },
      gettingStarted: {
        title: "はじめに",
        progress: "{{total}}件中{{completed}}件完了",
        description: "アカウントを最大限に活用するために、これらの手順を完了してください：",
        loading: "進捗状況を読み込んでいます...",
        congratulations: "おめでとうございます！すべての設定手順を完了しました。",
        steps: {
          profile: {
            title: "ビジネスプロフィールを完成させる",
            description: "ビジネスの詳細とロゴを追加"
          },
          customer: {
            titleEmpty: "最初の顧客を追加",
            titleWithCount: "{{count}}人の顧客を追加しました",
            descriptionEmpty: "顧客基盤の構築を開始",
            descriptionWithCount: "顧客を管理"
          },
          product: {
            titleEmpty: "最初の製品を作成",
            titleWithCount: "{{count}}個の製品を作成しました",
            descriptionEmpty: "在庫に製品を追加",
            descriptionWithCount: "製品を管理"
          },
          service: {
            titleEmpty: "最初のサービスを作成",
            titleWithCount: "{{count}}個のサービスを作成しました",
            descriptionEmpty: "提供するサービスを定義",
            descriptionWithCount: "サービスを管理"
          },
          supplier: {
            titleEmpty: "最初のサプライヤーを追加",
            titleWithCount: "{{count}}社のサプライヤーを追加しました",
            descriptionEmpty: "サプライチェーンを追跡",
            descriptionWithCount: "サプライヤーを管理"
          },
          invoice: {
            titleEmpty: "最初の請求書を作成",
            titleWithCount: "{{count}}件の請求書を作成しました",
            descriptionEmpty: "顧客への請求を開始",
            descriptionWithCount: "請求書を管理"
          }
        }
      },
      recentUpdates: {
        title: "最近の更新",
        noUpdates: "表示する最近の更新はありません。",
        description: "アカウントアクティビティに関する更新がここに表示されます。",
        activities: {
          salesToday: "本日の売上 ${{amount}}",
          unpaidInvoices: "{{count}}件の未払い請求書{{plural}}が保留中",
          overdueInvoices: "{{count}}件の期限切れ請求書{{plural}}に注意が必要",
          newCustomers: "今月{{count}}人の新規顧客{{plural}}"
        }
      },
      quickStats: {
        title: "クイック統計",
        customers: "顧客",
        products: "製品",
        services: "サービス",
        invoices: "請求書"
      },
      planDetails: {
        title: "サブスクリプションの詳細",
        perMonth: "月額",
        active: "アクティブ",
        currentPlan: "現在のプラン",
        featuresIncluded: "含まれる機能",
        limitations: "無料プランの制限",
        upgradePrompt: "今すぐアップグレードして、すべての機能をアンロックし、制限を解除しましょう！",
        upgradeButton: "ここでアップグレード",
        upgradeToEnterprise: "エンタープライズにアップグレード",
        close: "閉じる"
      },
      plans: {
        free: {
          name: "無料プラン",
          description: "始めたばかりの小規模ビジネス向けの基本機能",
          features: [
            "基本的な請求書作成",
            "最大5クライアント",
            "基本的なレポート",
            "メールサポート",
            "2GBストレージ"
          ],
          limitations: [
            "月5請求書まで制限",
            "カスタムブランディングなし",
            "基本的なレポートのみ",
            "APIアクセスなし",
            "シングルユーザーのみ"
          ]
        },
        professional: {
          name: "プロフェッショナルプラン",
          description: "成長中のビジネス向けの高度な機能",
          features: [
            "無制限の請求書作成",
            "無制限のクライアント",
            "高度なレポート",
            "優先サポート",
            "カスタムブランディング",
            "15GBストレージ",
            "最大3ユーザー"
          ]
        },
        enterprise: {
          name: "エンタープライズプラン",
          description: "確立されたビジネス向けの完全なツールスイート",
          features: [
            "プロフェッショナルのすべて",
            "無制限のストレージ",
            "無制限のユーザー",
            "専任アカウントマネージャー",
            "高度なAPIアクセス",
            "カスタムロールと権限",
            "高度なセキュリティ機能",
            "優遇取引レート"
          ]
        }
      }
    }
  },
  ko: { // Korean
    home: {
      greeting: {
        morning: "좋은 아침입니다",
        afternoon: "안녕하세요",
        evening: "좋은 저녁입니다"
      },
      subscriptionBanner: {
        active: "{{planName}}이(가) 활성화되어 있습니다",
        activeDescription: "플랜에 포함된 모든 기능에 액세스할 수 있습니다.",
        expired: "{{previousPlan}} 구독이 만료되었습니다",
        expiredDescription: "계정이 무료 플랜으로 다운그레이드되었습니다. 이제 기능에 대한 액세스가 제한됩니다.",
        renewButton: "구독 갱신",
        viewDetailsButton: "플랜 세부정보 보기"
      },
      gettingStarted: {
        title: "시작하기",
        progress: "{{total}}개 중 {{completed}}개 완료",
        description: "계정을 최대한 활용하려면 다음 단계를 완료하세요:",
        loading: "진행 상황을 불러오는 중...",
        congratulations: "축하합니다! 모든 설정 단계를 완료했습니다.",
        steps: {
          profile: {
            title: "비즈니스 프로필 완성하기",
            description: "비즈니스 세부정보와 로고 추가"
          },
          customer: {
            titleEmpty: "첫 번째 고객 추가",
            titleWithCount: "{{count}}명의 고객 추가됨",
            descriptionEmpty: "고객 기반 구축 시작",
            descriptionWithCount: "고객 관리"
          },
          product: {
            titleEmpty: "첫 번째 제품 만들기",
            titleWithCount: "{{count}}개의 제품 생성됨",
            descriptionEmpty: "재고에 제품 추가",
            descriptionWithCount: "제품 관리"
          },
          service: {
            titleEmpty: "첫 번째 서비스 만들기",
            titleWithCount: "{{count}}개의 서비스 생성됨",
            descriptionEmpty: "제공하는 서비스 정의",
            descriptionWithCount: "서비스 관리"
          },
          supplier: {
            titleEmpty: "첫 번째 공급업체 추가",
            titleWithCount: "{{count}}개의 공급업체 추가됨",
            descriptionEmpty: "공급망 추적",
            descriptionWithCount: "공급업체 관리"
          },
          invoice: {
            titleEmpty: "첫 번째 송장 만들기",
            titleWithCount: "{{count}}개의 송장 생성됨",
            descriptionEmpty: "고객에게 청구 시작",
            descriptionWithCount: "송장 관리"
          }
        }
      },
      recentUpdates: {
        title: "최근 업데이트",
        noUpdates: "표시할 최근 업데이트가 없습니다.",
        description: "계정 활동에 대한 업데이트가 여기에 표시됩니다.",
        activities: {
          salesToday: "오늘 매출 ${{amount}}",
          unpaidInvoices: "{{count}}개의 미지급 송장{{plural}} 대기 중",
          overdueInvoices: "{{count}}개의 연체 송장{{plural}}에 주의가 필요합니다",
          newCustomers: "이번 달 {{count}}명의 신규 고객{{plural}}"
        }
      },
      quickStats: {
        title: "빠른 통계",
        customers: "고객",
        products: "제품",
        services: "서비스",
        invoices: "송장"
      },
      planDetails: {
        title: "구독 세부정보",
        perMonth: "월",
        active: "활성",
        currentPlan: "현재 플랜",
        featuresIncluded: "포함된 기능",
        limitations: "무료 플랜 제한사항",
        upgradePrompt: "지금 업그레이드하여 모든 기능을 잠금 해제하고 제한을 제거하세요!",
        upgradeButton: "여기서 업그레이드",
        upgradeToEnterprise: "엔터프라이즈로 업그레이드",
        close: "닫기"
      },
      plans: {
        free: {
          name: "무료 플랜",
          description: "이제 막 시작하는 소규모 비즈니스를 위한 기본 기능",
          features: [
            "기본 송장 발행",
            "최대 5명의 클라이언트",
            "기본 보고서",
            "이메일 지원",
            "2GB 저장공간"
          ],
          limitations: [
            "월 5개 송장으로 제한",
            "맞춤 브랜딩 없음",
            "기본 보고서만",
            "API 액세스 없음",
            "단일 사용자만"
          ]
        },
        professional: {
          name: "프로페셔널 플랜",
          description: "성장하는 비즈니스를 위한 고급 기능",
          features: [
            "무제한 송장 발행",
            "무제한 클라이언트",
            "고급 보고서",
            "우선 지원",
            "맞춤 브랜딩",
            "15GB 저장공간",
            "최대 3명의 사용자"
          ]
        },
        enterprise: {
          name: "엔터프라이즈 플랜",
          description: "확립된 비즈니스를 위한 완전한 도구 모음",
          features: [
            "프로페셔널의 모든 기능",
            "무제한 저장공간",
            "무제한 사용자",
            "전담 계정 관리자",
            "고급 API 액세스",
            "맞춤 역할 및 권한",
            "고급 보안 기능",
            "우대 거래 요율"
          ]
        }
      }
    }
  },
  nl: { // Dutch
    home: {
      greeting: {
        morning: "Goedemorgen",
        afternoon: "Goedemiddag",
        evening: "Goedenavond"
      },
      subscriptionBanner: {
        active: "Uw {{planName}} is actief",
        activeDescription: "U heeft toegang tot alle functies die in uw plan zijn opgenomen.",
        expired: "Uw {{previousPlan}} abonnement is verlopen",
        expiredDescription: "Uw account is gedegradeerd naar het gratis plan. U heeft nu beperkte toegang tot functies.",
        renewButton: "Abonnement vernieuwen",
        viewDetailsButton: "Plandetails bekijken"
      },
      gettingStarted: {
        title: "Aan de slag",
        progress: "{{completed}} van {{total}} voltooid",
        description: "Voltooi deze stappen om het meeste uit uw account te halen:",
        loading: "Uw voortgang laden...",
        congratulations: "Gefeliciteerd! U heeft alle installatiestappen voltooid.",
        steps: {
          profile: {
            title: "Voltooi uw bedrijfsprofiel",
            description: "Voeg uw bedrijfsgegevens en logo toe"
          },
          customer: {
            titleEmpty: "Voeg uw eerste klant toe",
            titleWithCount: "{{count}} klanten toegevoegd",
            descriptionEmpty: "Begin met het opbouwen van uw klantenbestand",
            descriptionWithCount: "Beheer uw klanten"
          },
          product: {
            titleEmpty: "Maak uw eerste product",
            titleWithCount: "{{count}} producten gemaakt",
            descriptionEmpty: "Voeg producten toe aan uw voorraad",
            descriptionWithCount: "Beheer uw producten"
          },
          service: {
            titleEmpty: "Maak uw eerste dienst",
            titleWithCount: "{{count}} diensten gemaakt",
            descriptionEmpty: "Definieer diensten die u aanbiedt",
            descriptionWithCount: "Beheer uw diensten"
          },
          supplier: {
            titleEmpty: "Voeg uw eerste leverancier toe",
            titleWithCount: "{{count}} leveranciers toegevoegd",
            descriptionEmpty: "Volg uw toeleveringsketen",
            descriptionWithCount: "Beheer uw leveranciers"
          },
          invoice: {
            titleEmpty: "Maak uw eerste factuur",
            titleWithCount: "{{count}} facturen gemaakt",
            descriptionEmpty: "Begin met factureren aan uw klanten",
            descriptionWithCount: "Beheer uw facturen"
          }
        }
      },
      recentUpdates: {
        title: "Recente updates",
        noUpdates: "Geen recente updates om weer te geven.",
        description: "Updates over uw accountactiviteit verschijnen hier.",
        activities: {
          salesToday: "${{amount}} aan verkopen vandaag",
          unpaidInvoices: "{{count}} onbetaalde factuur{{plural}} in afwachting",
          overdueInvoices: "{{count}} achterstallige factuur{{plural}} hebben aandacht nodig",
          newCustomers: "{{count}} nieuwe klant{{plural}} deze maand"
        }
      },
      quickStats: {
        title: "Snelle statistieken",
        customers: "Klanten",
        products: "Producten",
        services: "Diensten",
        invoices: "Facturen"
      },
      planDetails: {
        title: "Uw abonnementsdetails",
        perMonth: "per maand",
        active: "Actief",
        currentPlan: "Huidig plan",
        featuresIncluded: "Inbegrepen functies",
        limitations: "Beperkingen op gratis plan",
        upgradePrompt: "Upgrade nu om alle functies te ontgrendelen en beperkingen te verwijderen!",
        upgradeButton: "Upgrade hier",
        upgradeToEnterprise: "Upgrade naar Enterprise",
        close: "Sluiten"
      },
      plans: {
        free: {
          name: "Gratis plan",
          description: "Basisfuncties voor kleine bedrijven die net beginnen",
          features: [
            "Basis facturering",
            "Tot 5 klanten",
            "Basis rapportage",
            "E-mail ondersteuning",
            "2GB opslag"
          ],
          limitations: [
            "Beperkt tot 5 facturen per maand",
            "Geen aangepaste branding",
            "Alleen basis rapportage",
            "Geen API-toegang",
            "Alleen enkele gebruiker"
          ]
        },
        professional: {
          name: "Professioneel plan",
          description: "Geavanceerde functies voor groeiende bedrijven",
          features: [
            "Onbeperkt factureren",
            "Onbeperkte klanten",
            "Geavanceerde rapportage",
            "Prioriteitsondersteuning",
            "Aangepaste branding",
            "15GB opslag",
            "Tot 3 gebruikers"
          ]
        },
        enterprise: {
          name: "Enterprise plan",
          description: "Volledige suite van tools voor gevestigde bedrijven",
          features: [
            "Alles in Professioneel",
            "Onbeperkte opslag",
            "Onbeperkte gebruikers",
            "Toegewijde accountmanager",
            "Geavanceerde API-toegang",
            "Aangepaste rollen en machtigingen",
            "Geavanceerde beveiligingsfuncties",
            "Preferentiële transactietarieven"
          ]
        }
      }
    }
  },
  pt: { // Portuguese
    home: {
      greeting: {
        morning: "Bom dia",
        afternoon: "Boa tarde",
        evening: "Boa noite"
      },
      subscriptionBanner: {
        active: "Seu {{planName}} está ativo",
        activeDescription: "Você tem acesso a todos os recursos incluídos em seu plano.",
        expired: "Sua assinatura {{previousPlan}} expirou",
        expiredDescription: "Sua conta foi rebaixada para o plano gratuito. Agora você tem acesso limitado aos recursos.",
        renewButton: "Renovar assinatura",
        viewDetailsButton: "Ver detalhes do plano"
      },
      gettingStarted: {
        title: "Primeiros passos",
        progress: "{{completed}} de {{total}} concluídos",
        description: "Complete estas etapas para aproveitar ao máximo sua conta:",
        loading: "Carregando seu progresso...",
        congratulations: "Parabéns! Você concluiu todas as etapas de configuração.",
        steps: {
          profile: {
            title: "Complete seu perfil empresarial",
            description: "Adicione os detalhes da sua empresa e logotipo"
          },
          customer: {
            titleEmpty: "Adicione seu primeiro cliente",
            titleWithCount: "{{count}} clientes adicionados",
            descriptionEmpty: "Comece a construir sua base de clientes",
            descriptionWithCount: "Gerencie seus clientes"
          },
          product: {
            titleEmpty: "Crie seu primeiro produto",
            titleWithCount: "{{count}} produtos criados",
            descriptionEmpty: "Adicione produtos ao seu inventário",
            descriptionWithCount: "Gerencie seus produtos"
          },
          service: {
            titleEmpty: "Crie seu primeiro serviço",
            titleWithCount: "{{count}} serviços criados",
            descriptionEmpty: "Defina os serviços que você oferece",
            descriptionWithCount: "Gerencie seus serviços"
          },
          supplier: {
            titleEmpty: "Adicione seu primeiro fornecedor",
            titleWithCount: "{{count}} fornecedores adicionados",
            descriptionEmpty: "Acompanhe sua cadeia de suprimentos",
            descriptionWithCount: "Gerencie seus fornecedores"
          },
          invoice: {
            titleEmpty: "Crie sua primeira fatura",
            titleWithCount: "{{count}} faturas criadas",
            descriptionEmpty: "Comece a faturar seus clientes",
            descriptionWithCount: "Gerencie suas faturas"
          }
        }
      },
      recentUpdates: {
        title: "Atualizações recentes",
        noUpdates: "Nenhuma atualização recente para exibir.",
        description: "As atualizações sobre a atividade da sua conta aparecerão aqui.",
        activities: {
          salesToday: "${{amount}} em vendas hoje",
          unpaidInvoices: "{{count}} fatura{{plural}} não paga{{plural}} pendente{{plural}}",
          overdueInvoices: "{{count}} fatura{{plural}} vencida{{plural}} precisa{{plural}} de atenção",
          newCustomers: "{{count}} novo{{plural}} cliente{{plural}} este mês"
        }
      },
      quickStats: {
        title: "Estatísticas rápidas",
        customers: "Clientes",
        products: "Produtos",
        services: "Serviços",
        invoices: "Faturas"
      },
      planDetails: {
        title: "Detalhes da sua assinatura",
        perMonth: "por mês",
        active: "Ativo",
        currentPlan: "Plano atual",
        featuresIncluded: "Recursos incluídos",
        limitations: "Limitações no plano gratuito",
        upgradePrompt: "Atualize agora para desbloquear todos os recursos e remover limitações!",
        upgradeButton: "Atualizar aqui",
        upgradeToEnterprise: "Atualizar para Enterprise",
        close: "Fechar"
      },
      plans: {
        free: {
          name: "Plano gratuito",
          description: "Recursos básicos para pequenas empresas que estão começando",
          features: [
            "Faturamento básico",
            "Até 5 clientes",
            "Relatórios básicos",
            "Suporte por e-mail",
            "2GB de armazenamento"
          ],
          limitations: [
            "Limitado a 5 faturas por mês",
            "Sem marca personalizada",
            "Apenas relatórios básicos",
            "Sem acesso à API",
            "Apenas usuário único"
          ]
        },
        professional: {
          name: "Plano Profissional",
          description: "Recursos avançados para empresas em crescimento",
          features: [
            "Faturamento ilimitado",
            "Clientes ilimitados",
            "Relatórios avançados",
            "Suporte prioritário",
            "Marca personalizada",
            "15GB de armazenamento",
            "Até 3 usuários"
          ]
        },
        enterprise: {
          name: "Plano Enterprise",
          description: "Conjunto completo de ferramentas para empresas estabelecidas",
          features: [
            "Tudo em Profissional",
            "Armazenamento ilimitado",
            "Usuários ilimitados",
            "Gerente de conta dedicado",
            "Acesso avançado à API",
            "Funções e permissões personalizadas",
            "Recursos de segurança avançados",
            "Taxas de transação preferenciais"
          ]
        }
      }
    }
  },
  ru: { // Russian
    home: {
      greeting: {
        morning: "Доброе утро",
        afternoon: "Добрый день",
        evening: "Добрый вечер"
      },
      subscriptionBanner: {
        active: "Ваш {{planName}} активен",
        activeDescription: "У вас есть доступ ко всем функциям, включенным в ваш план.",
        expired: "Срок действия вашей подписки {{previousPlan}} истек",
        expiredDescription: "Ваша учетная запись была понижена до бесплатного плана. Теперь у вас ограниченный доступ к функциям.",
        renewButton: "Продлить подписку",
        viewDetailsButton: "Посмотреть детали плана"
      },
      gettingStarted: {
        title: "Начало работы",
        progress: "Выполнено {{completed}} из {{total}}",
        description: "Выполните эти шаги, чтобы получить максимальную отдачу от вашей учетной записи:",
        loading: "Загрузка вашего прогресса...",
        congratulations: "Поздравляем! Вы выполнили все шаги настройки.",
        steps: {
          profile: {
            title: "Заполните профиль вашего бизнеса",
            description: "Добавьте информацию о вашем бизнесе и логотип"
          },
          customer: {
            titleEmpty: "Добавьте вашего первого клиента",
            titleWithCount: "Добавлено клиентов: {{count}}",
            descriptionEmpty: "Начните создавать свою клиентскую базу",
            descriptionWithCount: "Управляйте вашими клиентами"
          },
          product: {
            titleEmpty: "Создайте ваш первый продукт",
            titleWithCount: "Создано продуктов: {{count}}",
            descriptionEmpty: "Добавьте продукты в ваш инвентарь",
            descriptionWithCount: "Управляйте вашими продуктами"
          },
          service: {
            titleEmpty: "Создайте вашу первую услугу",
            titleWithCount: "Создано услуг: {{count}}",
            descriptionEmpty: "Определите услуги, которые вы предлагаете",
            descriptionWithCount: "Управляйте вашими услугами"
          },
          supplier: {
            titleEmpty: "Добавьте вашего первого поставщика",
            titleWithCount: "Добавлено поставщиков: {{count}}",
            descriptionEmpty: "Отслеживайте вашу цепочку поставок",
            descriptionWithCount: "Управляйте вашими поставщиками"
          },
          invoice: {
            titleEmpty: "Создайте ваш первый счет",
            titleWithCount: "Создано счетов: {{count}}",
            descriptionEmpty: "Начните выставлять счета вашим клиентам",
            descriptionWithCount: "Управляйте вашими счетами"
          }
        }
      },
      recentUpdates: {
        title: "Последние обновления",
        noUpdates: "Нет последних обновлений для отображения.",
        description: "Обновления об активности вашей учетной записи появятся здесь.",
        activities: {
          salesToday: "${{amount}} продаж сегодня",
          unpaidInvoices: "{{count}} неоплаченных счетов в ожидании",
          overdueInvoices: "{{count}} просроченных счетов требуют внимания",
          newCustomers: "{{count}} новых клиентов в этом месяце"
        }
      },
      quickStats: {
        title: "Быстрая статистика",
        customers: "Клиенты",
        products: "Продукты",
        services: "Услуги",
        invoices: "Счета"
      },
      planDetails: {
        title: "Детали вашей подписки",
        perMonth: "в месяц",
        active: "Активен",
        currentPlan: "Текущий план",
        featuresIncluded: "Включенные функции",
        limitations: "Ограничения бесплатного плана",
        upgradePrompt: "Обновитесь сейчас, чтобы разблокировать все функции и снять ограничения!",
        upgradeButton: "Обновить здесь",
        upgradeToEnterprise: "Обновить до Enterprise",
        close: "Закрыть"
      },
      plans: {
        free: {
          name: "Бесплатный план",
          description: "Базовые функции для малого бизнеса, который только начинает",
          features: [
            "Базовое выставление счетов",
            "До 5 клиентов",
            "Базовая отчетность",
            "Поддержка по электронной почте",
            "2ГБ хранилища"
          ],
          limitations: [
            "Ограничено 5 счетами в месяц",
            "Без индивидуального брендинга",
            "Только базовая отчетность",
            "Нет доступа к API",
            "Только один пользователь"
          ]
        },
        professional: {
          name: "Профессиональный план",
          description: "Расширенные функции для растущего бизнеса",
          features: [
            "Неограниченное выставление счетов",
            "Неограниченное количество клиентов",
            "Расширенная отчетность",
            "Приоритетная поддержка",
            "Индивидуальный брендинг",
            "15ГБ хранилища",
            "До 3 пользователей"
          ]
        },
        enterprise: {
          name: "План Enterprise",
          description: "Полный набор инструментов для устоявшегося бизнеса",
          features: [
            "Все из Профессионального",
            "Неограниченное хранилище",
            "Неограниченное количество пользователей",
            "Выделенный менеджер аккаунта",
            "Расширенный доступ к API",
            "Настраиваемые роли и разрешения",
            "Расширенные функции безопасности",
            "Преференциальные тарифы на транзакции"
          ]
        }
      }
    }
  },
  sw: { // Swahili
    home: {
      greeting: {
        morning: "Habari ya asubuhi",
        afternoon: "Habari ya mchana",
        evening: "Habari ya jioni"
      },
      subscriptionBanner: {
        active: "{{planName}} yako iko hai",
        activeDescription: "Una ufikiaji wa vipengele vyote vilivyojumuishwa katika mpango wako.",
        expired: "Usajili wako wa {{previousPlan}} umekwisha",
        expiredDescription: "Akaunti yako imeshushwa hadi mpango wa bure. Sasa una ufikiaji mdogo wa vipengele.",
        renewButton: "Fufua Usajili",
        viewDetailsButton: "Tazama Maelezo ya Mpango"
      },
      gettingStarted: {
        title: "Kuanza",
        progress: "{{completed}} kati ya {{total}} zimekamilika",
        description: "Kamilisha hatua hizi ili kupata zaidi kutoka kwa akaunti yako:",
        loading: "Inapakia maendeleo yako...",
        congratulations: "Hongera! Umekamilisha hatua zote za usanidi.",
        steps: {
          profile: {
            title: "Kamilisha wasifu wa biashara yako",
            description: "Ongeza maelezo ya biashara yako na nembo"
          },
          customer: {
            titleEmpty: "Ongeza mteja wako wa kwanza",
            titleWithCount: "Wateja {{count}} wameongezwa",
            descriptionEmpty: "Anza kujenga msingi wa wateja wako",
            descriptionWithCount: "Simamia wateja wako"
          },
          product: {
            titleEmpty: "Unda bidhaa yako ya kwanza",
            titleWithCount: "Bidhaa {{count}} zimeundwa",
            descriptionEmpty: "Ongeza bidhaa kwenye hesabu yako",
            descriptionWithCount: "Simamia bidhaa zako"
          },
          service: {
            titleEmpty: "Unda huduma yako ya kwanza",
            titleWithCount: "Huduma {{count}} zimeundwa",
            descriptionEmpty: "Fafanua huduma unazotoa",
            descriptionWithCount: "Simamia huduma zako"
          },
          supplier: {
            titleEmpty: "Ongeza msambazaji wako wa kwanza",
            titleWithCount: "Wasambazaji {{count}} wameongezwa",
            descriptionEmpty: "Fuatilia mnyororo wako wa ugavi",
            descriptionWithCount: "Simamia wasambazaji wako"
          },
          invoice: {
            titleEmpty: "Unda ankara yako ya kwanza",
            titleWithCount: "Ankara {{count}} zimeundwa",
            descriptionEmpty: "Anza kutoza wateja wako",
            descriptionWithCount: "Simamia ankara zako"
          }
        }
      },
      recentUpdates: {
        title: "Masasisho ya Hivi Karibuni",
        noUpdates: "Hakuna masasisho ya hivi karibuni ya kuonyesha.",
        description: "Masasisho kuhusu shughuli za akaunti yako yataonekana hapa.",
        activities: {
          salesToday: "${{amount}} katika mauzo leo",
          unpaidInvoices: "Ankara {{count}} ambazo hazijalipwa{{plural}} zinasubiri",
          overdueInvoices: "Ankara {{count}} zilizochelewa{{plural}} zinahitaji uangalifu",
          newCustomers: "Wateja wapya {{count}}{{plural}} mwezi huu"
        }
      },
      quickStats: {
        title: "Takwimu za Haraka",
        customers: "Wateja",
        products: "Bidhaa",
        services: "Huduma",
        invoices: "Ankara"
      },
      planDetails: {
        title: "Maelezo ya Usajili Wako",
        perMonth: "kwa mwezi",
        active: "Hai",
        currentPlan: "Mpango wa Sasa",
        featuresIncluded: "Vipengele Vilivyojumuishwa",
        limitations: "Vikwazo kwenye Mpango wa Bure",
        upgradePrompt: "Boresha sasa ili kufungua vipengele vyote na kuondoa vikwazo!",
        upgradeButton: "Boresha Hapa",
        upgradeToEnterprise: "Boresha hadi Enterprise",
        close: "Funga"
      },
      plans: {
        free: {
          name: "Mpango wa Bure",
          description: "Vipengele vya msingi kwa biashara ndogo zinazoanza",
          features: [
            "Kutoa ankara za msingi",
            "Hadi wateja 5",
            "Ripoti za msingi",
            "Msaada wa barua pepe",
            "Hifadhi ya 2GB"
          ],
          limitations: [
            "Imepunguzwa hadi ankara 5 kwa mwezi",
            "Hakuna chapa maalum",
            "Ripoti za msingi tu",
            "Hakuna ufikiaji wa API",
            "Mtumiaji mmoja tu"
          ]
        },
        professional: {
          name: "Mpango wa Kitaalamu",
          description: "Vipengele vya hali ya juu kwa biashara zinazokua",
          features: [
            "Kutoa ankara bila kikomo",
            "Wateja wasio na kikomo",
            "Ripoti za hali ya juu",
            "Msaada wa kipaumbele",
            "Chapa maalum",
            "Hifadhi ya 15GB",
            "Hadi watumiaji 3"
          ]
        },
        enterprise: {
          name: "Mpango wa Enterprise",
          description: "Mkusanyiko kamili wa zana kwa biashara zilizojikita",
          features: [
            "Kila kitu katika Kitaalamu",
            "Hifadhi isiyo na kikomo",
            "Watumiaji wasio na kikomo",
            "Meneja wa akaunti aliyejitolea",
            "Ufikiaji wa API wa hali ya juu",
            "Majukumu na ruhusa maalum",
            "Vipengele vya usalama vya hali ya juu",
            "Viwango vya muamala vya upendeleo"
          ]
        }
      }
    }
  },
  tr: { // Turkish
    home: {
      greeting: {
        morning: "Günaydın",
        afternoon: "İyi günler",
        evening: "İyi akşamlar"
      },
      subscriptionBanner: {
        active: "{{planName}} planınız aktif",
        activeDescription: "Planınıza dahil olan tüm özelliklere erişiminiz var.",
        expired: "{{previousPlan}} aboneliğiniz sona erdi",
        expiredDescription: "Hesabınız ücretsiz plana düşürüldü. Artık özelliklere sınırlı erişiminiz var.",
        renewButton: "Aboneliği Yenile",
        viewDetailsButton: "Plan Detaylarını Görüntüle"
      },
      gettingStarted: {
        title: "Başlarken",
        progress: "{{total}} adımdan {{completed}} tanesi tamamlandı",
        description: "Hesabınızdan en iyi şekilde yararlanmak için bu adımları tamamlayın:",
        loading: "İlerlemeniz yükleniyor...",
        congratulations: "Tebrikler! Tüm kurulum adımlarını tamamladınız.",
        steps: {
          profile: {
            title: "İşletme profilinizi tamamlayın",
            description: "İşletme bilgilerinizi ve logonuzu ekleyin"
          },
          customer: {
            titleEmpty: "İlk müşterinizi ekleyin",
            titleWithCount: "{{count}} müşteri eklendi",
            descriptionEmpty: "Müşteri tabanınızı oluşturmaya başlayın",
            descriptionWithCount: "Müşterilerinizi yönetin"
          },
          product: {
            titleEmpty: "İlk ürününüzü oluşturun",
            titleWithCount: "{{count}} ürün oluşturuldu",
            descriptionEmpty: "Envanterinize ürün ekleyin",
            descriptionWithCount: "Ürünlerinizi yönetin"
          },
          service: {
            titleEmpty: "İlk hizmetinizi oluşturun",
            titleWithCount: "{{count}} hizmet oluşturuldu",
            descriptionEmpty: "Sunduğunuz hizmetleri tanımlayın",
            descriptionWithCount: "Hizmetlerinizi yönetin"
          },
          supplier: {
            titleEmpty: "İlk tedarikçinizi ekleyin",
            titleWithCount: "{{count}} tedarikçi eklendi",
            descriptionEmpty: "Tedarik zincirinizi takip edin",
            descriptionWithCount: "Tedarikçilerinizi yönetin"
          },
          invoice: {
            titleEmpty: "İlk faturanızı oluşturun",
            titleWithCount: "{{count}} fatura oluşturuldu",
            descriptionEmpty: "Müşterilerinize fatura kesmeye başlayın",
            descriptionWithCount: "Faturalarınızı yönetin"
          }
        }
      },
      recentUpdates: {
        title: "Son Güncellemeler",
        noUpdates: "Görüntülenecek son güncelleme yok.",
        description: "Hesap etkinliğinizle ilgili güncellemeler burada görünecek.",
        activities: {
          salesToday: "Bugün ${{amount}} satış",
          unpaidInvoices: "{{count}} ödenmemiş fatura{{plural}} bekliyor",
          overdueInvoices: "{{count}} vadesi geçmiş fatura{{plural}} dikkat gerektiriyor",
          newCustomers: "Bu ay {{count}} yeni müşteri{{plural}}"
        }
      },
      quickStats: {
        title: "Hızlı İstatistikler",
        customers: "Müşteriler",
        products: "Ürünler",
        services: "Hizmetler",
        invoices: "Faturalar"
      },
      planDetails: {
        title: "Abonelik Detaylarınız",
        perMonth: "aylık",
        active: "Aktif",
        currentPlan: "Mevcut Plan",
        featuresIncluded: "Dahil Edilen Özellikler",
        limitations: "Ücretsiz Plandaki Sınırlamalar",
        upgradePrompt: "Tüm özellikleri açmak ve sınırlamaları kaldırmak için şimdi yükseltin!",
        upgradeButton: "Buradan Yükseltin",
        upgradeToEnterprise: "Enterprise'a Yükseltin",
        close: "Kapat"
      },
      plans: {
        free: {
          name: "Ücretsiz Plan",
          description: "Yeni başlayan küçük işletmeler için temel özellikler",
          features: [
            "Temel faturalama",
            "5 müşteriye kadar",
            "Temel raporlama",
            "E-posta desteği",
            "2GB depolama"
          ],
          limitations: [
            "Ayda 5 faturayla sınırlı",
            "Özel marka yok",
            "Sadece temel raporlama",
            "API erişimi yok",
            "Sadece tek kullanıcı"
          ]
        },
        professional: {
          name: "Profesyonel Plan",
          description: "Büyüyen işletmeler için gelişmiş özellikler",
          features: [
            "Sınırsız faturalama",
            "Sınırsız müşteri",
            "Gelişmiş raporlama",
            "Öncelikli destek",
            "Özel marka",
            "15GB depolama",
            "3 kullanıcıya kadar"
          ]
        },
        enterprise: {
          name: "Enterprise Plan",
          description: "Kurulu işletmeler için tam araç paketi",
          features: [
            "Profesyonel'deki her şey",
            "Sınırsız depolama",
            "Sınırsız kullanıcı",
            "Özel hesap yöneticisi",
            "Gelişmiş API erişimi",
            "Özel roller ve izinler",
            "Gelişmiş güvenlik özellikleri",
            "Tercihli işlem oranları"
          ]
        }
      }
    }
  },
  vi: { // Vietnamese
    home: {
      greeting: {
        morning: "Chào buổi sáng",
        afternoon: "Chào buổi chiều",
        evening: "Chào buổi tối"
      },
      subscriptionBanner: {
        active: "{{planName}} của bạn đang hoạt động",
        activeDescription: "Bạn có quyền truy cập vào tất cả các tính năng có trong gói của mình.",
        expired: "Đăng ký {{previousPlan}} của bạn đã hết hạn",
        expiredDescription: "Tài khoản của bạn đã được hạ cấp xuống gói miễn phí. Bây giờ bạn có quyền truy cập hạn chế vào các tính năng.",
        renewButton: "Gia hạn đăng ký",
        viewDetailsButton: "Xem chi tiết gói"
      },
      gettingStarted: {
        title: "Bắt đầu",
        progress: "Đã hoàn thành {{completed}} trong số {{total}}",
        description: "Hoàn thành các bước này để tận dụng tối đa tài khoản của bạn:",
        loading: "Đang tải tiến trình của bạn...",
        congratulations: "Chúc mừng! Bạn đã hoàn thành tất cả các bước thiết lập.",
        steps: {
          profile: {
            title: "Hoàn thành hồ sơ doanh nghiệp của bạn",
            description: "Thêm chi tiết doanh nghiệp và logo của bạn"
          },
          customer: {
            titleEmpty: "Thêm khách hàng đầu tiên của bạn",
            titleWithCount: "Đã thêm {{count}} khách hàng",
            descriptionEmpty: "Bắt đầu xây dựng cơ sở khách hàng của bạn",
            descriptionWithCount: "Quản lý khách hàng của bạn"
          },
          product: {
            titleEmpty: "Tạo sản phẩm đầu tiên của bạn",
            titleWithCount: "Đã tạo {{count}} sản phẩm",
            descriptionEmpty: "Thêm sản phẩm vào kho của bạn",
            descriptionWithCount: "Quản lý sản phẩm của bạn"
          },
          service: {
            titleEmpty: "Tạo dịch vụ đầu tiên của bạn",
            titleWithCount: "Đã tạo {{count}} dịch vụ",
            descriptionEmpty: "Xác định các dịch vụ bạn cung cấp",
            descriptionWithCount: "Quản lý dịch vụ của bạn"
          },
          supplier: {
            titleEmpty: "Thêm nhà cung cấp đầu tiên của bạn",
            titleWithCount: "Đã thêm {{count}} nhà cung cấp",
            descriptionEmpty: "Theo dõi chuỗi cung ứng của bạn",
            descriptionWithCount: "Quản lý nhà cung cấp của bạn"
          },
          invoice: {
            titleEmpty: "Tạo hóa đơn đầu tiên của bạn",
            titleWithCount: "Đã tạo {{count}} hóa đơn",
            descriptionEmpty: "Bắt đầu lập hóa đơn cho khách hàng của bạn",
            descriptionWithCount: "Quản lý hóa đơn của bạn"
          }
        }
      },
      recentUpdates: {
        title: "Cập nhật gần đây",
        noUpdates: "Không có cập nhật gần đây để hiển thị.",
        description: "Cập nhật về hoạt động tài khoản của bạn sẽ xuất hiện ở đây.",
        activities: {
          salesToday: "${{amount}} doanh số hôm nay",
          unpaidInvoices: "{{count}} hóa đơn chưa thanh toán{{plural}} đang chờ xử lý",
          overdueInvoices: "{{count}} hóa đơn quá hạn{{plural}} cần chú ý",
          newCustomers: "{{count}} khách hàng mới{{plural}} tháng này"
        }
      },
      quickStats: {
        title: "Thống kê nhanh",
        customers: "Khách hàng",
        products: "Sản phẩm",
        services: "Dịch vụ",
        invoices: "Hóa đơn"
      },
      planDetails: {
        title: "Chi tiết đăng ký của bạn",
        perMonth: "mỗi tháng",
        active: "Hoạt động",
        currentPlan: "Gói hiện tại",
        featuresIncluded: "Tính năng bao gồm",
        limitations: "Hạn chế trên gói miễn phí",
        upgradePrompt: "Nâng cấp ngay để mở khóa tất cả các tính năng và loại bỏ hạn chế!",
        upgradeButton: "Nâng cấp tại đây",
        upgradeToEnterprise: "Nâng cấp lên Enterprise",
        close: "Đóng"
      },
      plans: {
        free: {
          name: "Gói miễn phí",
          description: "Tính năng cơ bản cho doanh nghiệp nhỏ mới bắt đầu",
          features: [
            "Lập hóa đơn cơ bản",
            "Tối đa 5 khách hàng",
            "Báo cáo cơ bản",
            "Hỗ trợ qua email",
            "2GB lưu trữ"
          ],
          limitations: [
            "Giới hạn 5 hóa đơn mỗi tháng",
            "Không có thương hiệu tùy chỉnh",
            "Chỉ báo cáo cơ bản",
            "Không có quyền truy cập API",
            "Chỉ một người dùng"
          ]
        },
        professional: {
          name: "Gói Chuyên nghiệp",
          description: "Tính năng nâng cao cho doanh nghiệp đang phát triển",
          features: [
            "Lập hóa đơn không giới hạn",
            "Khách hàng không giới hạn",
            "Báo cáo nâng cao",
            "Hỗ trợ ưu tiên",
            "Thương hiệu tùy chỉnh",
            "15GB lưu trữ",
            "Tối đa 3 người dùng"
          ]
        },
        enterprise: {
          name: "Gói Enterprise",
          description: "Bộ công cụ đầy đủ cho doanh nghiệp đã thành lập",
          features: [
            "Mọi thứ trong Chuyên nghiệp",
            "Lưu trữ không giới hạn",
            "Người dùng không giới hạn",
            "Quản lý tài khoản chuyên dụng",
            "Quyền truy cập API nâng cao",
            "Vai trò và quyền tùy chỉnh",
            "Tính năng bảo mật nâng cao",
            "Tỷ lệ giao dịch ưu đãi"
          ]
        }
      }
    }
  },
  yo: { // Yoruba
    home: {
      greeting: {
        morning: "E kaaro",
        afternoon: "E kaasan",
        evening: "E kaale"
      },
      subscriptionBanner: {
        active: "{{planName}} rẹ n ṣiṣẹ",
        activeDescription: "O ni iwọle si gbogbo awọn ẹya ti o wa ninu ero rẹ.",
        expired: "Alabapin {{previousPlan}} rẹ ti pari",
        expiredDescription: "A ti dinku akọọlẹ rẹ si ero ọfẹ. Nisisiyi o ni iwọle to lopin si awọn ẹya.",
        renewButton: "Sọ Alabapin Di Otun",
        viewDetailsButton: "Wo Awọn Alaye Ero"
      },
      gettingStarted: {
        title: "Bibẹrẹ",
        progress: "{{completed}} ninu {{total}} ti pari",
        description: "Pari awọn igbesẹ wọnyi lati gba ohun ti o dara julọ lati inu akọọlẹ rẹ:",
        loading: "N gbe ilọsiwaju rẹ jade...",
        congratulations: "O ku oriire! O ti pari gbogbo awọn igbesẹ atunto.",
        steps: {
          profile: {
            title: "Pari profaili iṣowo rẹ",
            description: "Fi awọn alaye iṣowo rẹ ati aami iṣowo kun"
          },
          customer: {
            titleEmpty: "Fi alabara akọkọ rẹ kun",
            titleWithCount: "Awọn alabara {{count}} ti a fi kun",
            descriptionEmpty: "Bẹrẹ si kọ ipilẹ alabara rẹ",
            descriptionWithCount: "Ṣakoso awọn alabara rẹ"
          },
          product: {
            titleEmpty: "Ṣẹda ọja akọkọ rẹ",
            titleWithCount: "Awọn ọja {{count}} ti a ṣẹda",
            descriptionEmpty: "Fi awọn ọja kun si oja rẹ",
            descriptionWithCount: "Ṣakoso awọn ọja rẹ"
          },
          service: {
            titleEmpty: "Ṣẹda iṣẹ akọkọ rẹ",
            titleWithCount: "Awọn iṣẹ {{count}} ti a ṣẹda",
            descriptionEmpty: "Ṣalaye awọn iṣẹ ti o n pese",
            descriptionWithCount: "Ṣakoso awọn iṣẹ rẹ"
          },
          supplier: {
            titleEmpty: "Fi olupese akọkọ rẹ kun",
            titleWithCount: "Awọn olupese {{count}} ti a fi kun",
            descriptionEmpty: "Tọpinpin ẹwọn ipese rẹ",
            descriptionWithCount: "Ṣakoso awọn olupese rẹ"
          },
          invoice: {
            titleEmpty: "Ṣẹda iwe-owo akọkọ rẹ",
            titleWithCount: "Awọn iwe-owo {{count}} ti a ṣẹda",
            descriptionEmpty: "Bẹrẹ si gba owo lọwọ awọn alabara rẹ",
            descriptionWithCount: "Ṣakoso awọn iwe-owo rẹ"
          }
        }
      },
      recentUpdates: {
        title: "Awọn Imudojuiwọn Aipẹ",
        noUpdates: "Ko si awọn imudojuiwọn aipẹ lati fi han.",
        description: "Awọn imudojuiwọn nipa iṣẹ akọọlẹ rẹ yoo han nibi.",
        activities: {
          salesToday: "${{amount}} ni tita loni",
          unpaidInvoices: "{{count}} iwe-owo ti ko sanwo{{plural}} n duro",
          overdueInvoices: "{{count}} iwe-owo ti o ti pẹ{{plural}} nilo akiyesi",
          newCustomers: "{{count}} alabara tuntun{{plural}} oṣu yii"
        }
      },
      quickStats: {
        title: "Awọn Iṣiro Iyara",
        customers: "Awọn Alabara",
        products: "Awọn Ọja",
        services: "Awọn Iṣẹ",
        invoices: "Awọn Iwe-owo"
      },
      planDetails: {
        title: "Awọn Alaye Alabapin Rẹ",
        perMonth: "ni oṣu kan",
        active: "Nṣiṣẹ",
        currentPlan: "Ero Lọwọlọwọ",
        featuresIncluded: "Awọn Ẹya Ti A Pọ Mọ",
        limitations: "Awọn Idiwọn lori Ero Ọfẹ",
        upgradePrompt: "Ṣe igbega ni bayi lati ṣi gbogbo awọn ẹya ati yọ awọn idiwọn kuro!",
        upgradeButton: "Ṣe Igbega Nibi",
        upgradeToEnterprise: "Ṣe igbega si Enterprise",
        close: "Ti"
      },
      plans: {
        free: {
          name: "Ero Ọfẹ",
          description: "Awọn ẹya ipilẹ fun awọn iṣowo kekere ti o ṣẹṣẹ bẹrẹ",
          features: [
            "Ifiweranṣẹ ipilẹ",
            "Titi di awọn alabara 5",
            "Iroyin ipilẹ",
            "Atilẹyin imeeli",
            "Ibi ipamọ 2GB"
          ],
          limitations: [
            "Opin si awọn iwe-owo 5 ni oṣu kan",
            "Ko si ami iyasọtọ aṣa",
            "Iroyin ipilẹ nikan",
            "Ko si iwọle API",
            "Olumulo kan ṣoṣo"
          ]
        },
        professional: {
          name: "Ero Alamọdaju",
          description: "Awọn ẹya ilọsiwaju fun awọn iṣowo ti n dagba",
          features: [
            "Ifiweranṣẹ ailopin",
            "Awọn alabara ailopin",
            "Iroyin ilọsiwaju",
            "Atilẹyin pataki",
            "Ami iyasọtọ aṣa",
            "Ibi ipamọ 15GB",
            "Titi di awọn olumulo 3"
          ]
        },
        enterprise: {
          name: "Ero Ile-iṣẹ",
          description: "Apapọ ohun elo pipe fun awọn iṣowo ti o ti fi idi mulẹ",
          features: [
            "Ohun gbogbo ni Alamọdaju",
            "Ibi ipamọ ailopin",
            "Awọn olumulo ailopin",
            "Alakoso akọọlẹ ti a ya sọtọ",
            "Iwọle API ilọsiwaju",
            "Awọn ipa ati awọn igbanilaaye aṣa",
            "Awọn ẹya aabo ilọsiwaju",
            "Awọn oṣuwọn iṣowo ayanfẹ"
          ]
        }
      }
    }
  },
  zh: { // Chinese
    home: {
      greeting: {
        morning: "早上好",
        afternoon: "下午好",
        evening: "晚上好"
      },
      subscriptionBanner: {
        active: "您的{{planName}}已激活",
        activeDescription: "您可以访问计划中包含的所有功能。",
        expired: "您的{{previousPlan}}订阅已过期",
        expiredDescription: "您的账户已降级为免费计划。现在您对功能的访问权限有限。",
        renewButton: "续订订阅",
        viewDetailsButton: "查看计划详情"
      },
      gettingStarted: {
        title: "入门指南",
        progress: "已完成 {{completed}}/{{total}}",
        description: "完成这些步骤以充分利用您的账户：",
        loading: "正在加载您的进度...",
        congratulations: "恭喜！您已完成所有设置步骤。",
        steps: {
          profile: {
            title: "完善您的企业资料",
            description: "添加您的企业详情和标志"
          },
          customer: {
            titleEmpty: "添加您的第一个客户",
            titleWithCount: "已添加 {{count}} 个客户",
            descriptionEmpty: "开始建立您的客户群",
            descriptionWithCount: "管理您的客户"
          },
          product: {
            titleEmpty: "创建您的第一个产品",
            titleWithCount: "已创建 {{count}} 个产品",
            descriptionEmpty: "将产品添加到您的库存",
            descriptionWithCount: "管理您的产品"
          },
          service: {
            titleEmpty: "创建您的第一项服务",
            titleWithCount: "已创建 {{count}} 项服务",
            descriptionEmpty: "定义您提供的服务",
            descriptionWithCount: "管理您的服务"
          },
          supplier: {
            titleEmpty: "添加您的第一个供应商",
            titleWithCount: "已添加 {{count}} 个供应商",
            descriptionEmpty: "跟踪您的供应链",
            descriptionWithCount: "管理您的供应商"
          },
          invoice: {
            titleEmpty: "创建您的第一张发票",
            titleWithCount: "已创建 {{count}} 张发票",
            descriptionEmpty: "开始向您的客户开具账单",
            descriptionWithCount: "管理您的发票"
          }
        }
      },
      recentUpdates: {
        title: "最近更新",
        noUpdates: "没有要显示的最近更新。",
        description: "有关您账户活动的更新将显示在这里。",
        activities: {
          salesToday: "今日销售额 ${{amount}}",
          unpaidInvoices: "{{count}} 张未付发票{{plural}}待处理",
          overdueInvoices: "{{count}} 张逾期发票{{plural}}需要关注",
          newCustomers: "本月新增 {{count}} 位客户{{plural}}"
        }
      },
      quickStats: {
        title: "快速统计",
        customers: "客户",
        products: "产品",
        services: "服务",
        invoices: "发票"
      },
      planDetails: {
        title: "您的订阅详情",
        perMonth: "每月",
        active: "激活",
        currentPlan: "当前计划",
        featuresIncluded: "包含的功能",
        limitations: "免费计划的限制",
        upgradePrompt: "立即升级以解锁所有功能并移除限制！",
        upgradeButton: "在此升级",
        upgradeToEnterprise: "升级到企业版",
        close: "关闭"
      },
      plans: {
        free: {
          name: "免费计划",
          description: "为刚起步的小型企业提供基本功能",
          features: [
            "基本发票",
            "最多5个客户",
            "基本报告",
            "电子邮件支持",
            "2GB存储空间"
          ],
          limitations: [
            "每月限制5张发票",
            "无自定义品牌",
            "仅基本报告",
            "无API访问权限",
            "仅单用户"
          ]
        },
        professional: {
          name: "专业计划",
          description: "为成长中的企业提供高级功能",
          features: [
            "无限制发票",
            "无限制客户",
            "高级报告",
            "优先支持",
            "自定义品牌",
            "15GB存储空间",
            "最多3个用户"
          ]
        },
        enterprise: {
          name: "企业计划",
          description: "为成熟企业提供完整的工具套件",
          features: [
            "专业版的所有功能",
            "无限存储空间",
            "无限用户",
            "专属客户经理",
            "高级API访问",
            "自定义角色和权限",
            "高级安全功能",
            "优惠交易费率"
          ]
        }
      }
    }
  },
  zu: { // Zulu
    home: {
      greeting: {
        morning: "Sawubona ekuseni",
        afternoon: "Sawubona ntambama",
        evening: "Sawubona kusihlwa"
      },
      subscriptionBanner: {
        active: "I-{{planName}} yakho iyasebenza",
        activeDescription: "Unokufinyelela kuzo zonke izici ezifakwe ohlelweni lwakho.",
        expired: "Ukubhalisa kwakho kwe-{{previousPlan}} kuphelelwe yisikhathi",
        expiredDescription: "I-akhawunti yakho yehliswe iye kuhlelo lwamahhala. Manje unokufinyelela okulinganiselwe kuzici.",
        renewButton: "Vuselela Ukubhalisa",
        viewDetailsButton: "Buka Imininingwane Yohlelo"
      },
      gettingStarted: {
        title: "Ukuqala",
        progress: "{{completed}} kwengu-{{total}} kuqediwe",
        description: "Qedela lezi zinyathelo ukuze uthole okungcono kakhulu ku-akhawunti yakho:",
        loading: "Ilayisha inqubekela phambili yakho...",
        congratulations: "Halala! Uqede zonke izinyathelo zokusetha.",
        steps: {
          profile: {
            title: "Qedela iphrofayela yebhizinisi lakho",
            description: "Faka imininingwane yebhizinisi lakho nelogo"
          },
          customer: {
            titleEmpty: "Faka ikhasimende lakho lokuqala",
            titleWithCount: "Amakhasimende angu-{{count}} afakiwe",
            descriptionEmpty: "Qala ukwakha isisekelo samakhasimende akho",
            descriptionWithCount: "Phatha amakhasimende akho"
          },
          product: {
            titleEmpty: "Dala umkhiqizo wakho wokuqala",
            titleWithCount: "Imikhiqizo engu-{{count}} idalwe",
            descriptionEmpty: "Faka imikhiqizo ohlwini lwakho lwempahla",
            descriptionWithCount: "Phatha imikhiqizo yakho"
          },
          service: {
            titleEmpty: "Dala isevisi yakho yokuqala",
            titleWithCount: "Amasevisi angu-{{count}} adalwe",
            descriptionEmpty: "Chaza amasevisi owanikezayo",
            descriptionWithCount: "Phatha amasevisi akho"
          },
          supplier: {
            titleEmpty: "Faka umphakeli wakho wokuqala",
            titleWithCount: "Abaphakeli abangu-{{count}} bafakiwe",
            descriptionEmpty: "Landelela uchungechunge lokuhlinzeka kwakho",
            descriptionWithCount: "Phatha abaphakeli bakho"
          },
          invoice: {
            titleEmpty: "Dala i-invoyisi yakho yokuqala",
            titleWithCount: "Ama-invoyisi angu-{{count}} adalwe",
            descriptionEmpty: "Qala ukukhokhisa amakhasimende akho",
            descriptionWithCount: "Phatha ama-invoyisi akho"
          }
        }
      },
      recentUpdates: {
        title: "Izibuyekezo Zakamuva",
        noUpdates: "Azikho izibuyekezo zakamuva ezizoboniswa.",
        description: "Izibuyekezo mayelana nomsebenzi we-akhawunti yakho zizovela lapha.",
        activities: {
          salesToday: "${{amount}} ekuthengisweni namuhla",
          unpaidInvoices: "{{count}} ama-invoyisi angakhokhelwanga{{plural}} alindile",
          overdueInvoices: "{{count}} ama-invoyisi asedlulile{{plural}} adinga ukunakwa",
          newCustomers: "{{count}} amakhasimende amasha{{plural}} kule nyanga"
        }
      },
      quickStats: {
        title: "Izibalo Ezisheshayo",
        customers: "Amakhasimende",
        products: "Imikhiqizo",
        services: "Amasevisi",
        invoices: "Ama-invoyisi"
      },
      planDetails: {
        title: "Imininingwane Yokubhalisa Kwakho",
        perMonth: "ngenyanga",
        active: "Iyasebenza",
        currentPlan: "Uhlelo Lwamanje",
        featuresIncluded: "Izici Ezifakiwe",
        limitations: "Imikhawulo Ohlelweni Lwamahhala",
        upgradePrompt: "Thuthukisa manje ukuvula zonke izici nokususa imikhawulo!",
        upgradeButton: "Thuthukisa Lapha",
        upgradeToEnterprise: "Thuthukisa uye ku-Enterprise",
        close: "Vala"
      },
      plans: {
        free: {
          name: "Uhlelo Lwamahhala",
          description: "Izici eziyisisekelo zamabhizinisi amancane asanda kuqala",
          features: [
            "Ama-invoyisi ayisisekelo",
            "Kuze kufike kumakhasimende ama-5",
            "Imibiko eyisisekelo",
            "Ukusekela nge-imeyili",
            "Isitoreji esingu-2GB"
          ],
          limitations: [
            "Kulinganiselwe kuma-invoyisi ama-5 ngenyanga",
            "Ayikho i-branding yangokwezifiso",
            "Imibiko eyisisekelo kuphela",
            "Akunakho ukufinyelela kwe-API",
            "Umsebenzisi oyedwa kuphela"
          ]
        },
        professional: {
          name: "Uhlelo Lochwepheshe",
          description: "Izici ezithuthukile zamabhizinisi akhulayo",
          features: [
            "Ama-invoyisi angenamkhawulo",
            "Amakhasimende angenamkhawulo",
            "Imibiko ethuthukile",
            "Ukusekela okubalulekile",
            "I-branding yangokwezifiso",
            "Isitoreji esingu-15GB",
            "Kuze kufike kubasebenzisi aba-3"
          ]
        },
        enterprise: {
          name: "Uhlelo Lwe-Enterprise",
          description: "Iqoqo eliphelele lamathuluzi amabhizinisi asunguliwe",
          features: [
            "Konke okuku-Professional",
            "Isitoreji esingenamkhawulo",
            "Abasebenzisi abangenamkhawulo",
            "Umphathi we-akhawunti ozinikele",
            "Ukufinyelela kwe-API okuthuthukile",
            "Izindima nezimvume ezingokwezifiso",
            "Izici zokuphepha ezithuthukile",
            "Amanani okuthengiselana athandwayo"
          ]
        }
      }
    }
  }
};

// Function to update a language file
function updateLanguageFile(lang, translations) {
  const filePath = path.join(__dirname, '..', 'public', 'locales', lang, 'dashboard.json');
  
  try {
    // Read existing file
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const existingData = JSON.parse(existingContent);
    
    // Merge new translations
    const updatedData = {
      ...existingData,
      home: translations.home
    };
    
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    console.log(`✅ Updated ${lang}/dashboard.json`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/dashboard.json:`, error.message);
  }
}

// Update all language files
Object.keys(translations).forEach(lang => {
  updateLanguageFile(lang, translations[lang]);
});

console.log('\nTranslation update complete!');