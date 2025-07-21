const fs = require('fs');
const path = require('path');

// Translation data for Smart Insights in all 20 languages
const smartInsightsTranslations = {
  en: {
    "title": "Smart Insights",
    "subtitle": "AI-powered business intelligence assistant",
    "loading": "Initializing Smart Insights...",
    "popularQueries": "Popular Queries",
    "credits": {
      "available": "Available Credits",
      "usedThisMonth": "Used this month: {{count}}",
      "buyButton": "Buy Credits"
    },
    "chat": {
      "startConversation": "Start a conversation",
      "askAnything": "Ask me anything about your business data",
      "placeholder": "Ask about your business..."
    },
    "categories": {
      "revenue": {
        "title": "Revenue & Sales",
        "query1": "Show my revenue trend with a chart",
        "query2": "Which products are bestsellers? Include a chart",
        "query3": "Create a chart of sales by customer segment",
        "query4": "What's my average order value trend?"
      },
      "customers": {
        "title": "Customer Insights",
        "query1": "Show my top customers in a chart",
        "query2": "What's my customer retention rate? Show as percentage chart",
        "query3": "Create a visualization of new vs returning customers",
        "query4": "Which customers are at risk? Include analysis chart"
      },
      "inventory": {
        "title": "Inventory Analysis",
        "query1": "What products need restocking? Show in a chart",
        "query2": "Visualize inventory turnover rates",
        "query3": "Create a chart of slow-moving vs fast-moving items",
        "query4": "Show my current stock value breakdown"
      },
      "performance": {
        "title": "Business Performance",
        "query1": "How is my business performing? Include charts",
        "query2": "Compare this month to last month with visualizations",
        "query3": "Show my profit margins in a chart",
        "query4": "Create an expense breakdown visualization"
      }
    },
    "packages": {
      "starter": {
        "name": "Starter Pack"
      },
      "growth": {
        "name": "Growth Pack"
      },
      "pro": {
        "name": "Professional"
      },
      "enterprise": {
        "name": "Enterprise"
      }
    },
    "buyCredits": {
      "title": "Buy Smart Insight Credits",
      "description": "Choose a credit package to continue using Smart Insights",
      "bestValue": "Best Value",
      "creditsCount": "{{count}} credits",
      "perCredit": "${{price}} per credit",
      "loadingPackages": "Loading credit packages...",
      "cancel": "Cancel",
      "continueToPayment": "Continue to Payment"
    },
    "errors": {
      "noCredits": "No credits remaining. Please purchase more credits.",
      "initFailed": "Failed to initialize. Please refresh the page.",
      "processingError": "I apologize, but I encountered an error processing your request. Please try again.",
      "loadingError": "Error loading Smart Insights"
    }
  },
  es: {
    "title": "Perspectivas Inteligentes",
    "subtitle": "Asistente de inteligencia empresarial impulsado por IA",
    "loading": "Inicializando Perspectivas Inteligentes...",
    "popularQueries": "Consultas Populares",
    "credits": {
      "available": "Créditos Disponibles",
      "usedThisMonth": "Usados este mes: {{count}}",
      "buyButton": "Comprar Créditos"
    },
    "chat": {
      "startConversation": "Iniciar una conversación",
      "askAnything": "Pregúntame cualquier cosa sobre los datos de tu negocio",
      "placeholder": "Pregunta sobre tu negocio..."
    },
    "categories": {
      "revenue": {
        "title": "Ingresos y Ventas",
        "query1": "Muestra mi tendencia de ingresos con un gráfico",
        "query2": "¿Qué productos son más vendidos? Incluye un gráfico",
        "query3": "Crea un gráfico de ventas por segmento de clientes",
        "query4": "¿Cuál es mi tendencia de valor promedio de pedido?"
      },
      "customers": {
        "title": "Perspectivas de Clientes",
        "query1": "Muestra mis mejores clientes en un gráfico",
        "query2": "¿Cuál es mi tasa de retención de clientes? Muestra como gráfico de porcentaje",
        "query3": "Crea una visualización de clientes nuevos vs recurrentes",
        "query4": "¿Qué clientes están en riesgo? Incluye gráfico de análisis"
      },
      "inventory": {
        "title": "Análisis de Inventario",
        "query1": "¿Qué productos necesitan reabastecimiento? Muestra en un gráfico",
        "query2": "Visualiza las tasas de rotación de inventario",
        "query3": "Crea un gráfico de artículos de movimiento lento vs rápido",
        "query4": "Muestra mi desglose actual del valor del stock"
      },
      "performance": {
        "title": "Desempeño del Negocio",
        "query1": "¿Cómo está funcionando mi negocio? Incluye gráficos",
        "query2": "Compara este mes con el mes pasado con visualizaciones",
        "query3": "Muestra mis márgenes de ganancia en un gráfico",
        "query4": "Crea una visualización del desglose de gastos"
      }
    },
    "packages": {
      "starter": {
        "name": "Paquete Inicial"
      },
      "growth": {
        "name": "Paquete de Crecimiento"
      },
      "pro": {
        "name": "Profesional"
      },
      "enterprise": {
        "name": "Empresarial"
      }
    },
    "buyCredits": {
      "title": "Comprar Créditos de Perspectivas Inteligentes",
      "description": "Elige un paquete de créditos para continuar usando Perspectivas Inteligentes",
      "bestValue": "Mejor Valor",
      "creditsCount": "{{count}} créditos",
      "perCredit": "${{price}} por crédito",
      "loadingPackages": "Cargando paquetes de créditos...",
      "cancel": "Cancelar",
      "continueToPayment": "Continuar al Pago"
    },
    "errors": {
      "noCredits": "No quedan créditos. Por favor compra más créditos.",
      "initFailed": "Error al inicializar. Por favor actualiza la página.",
      "processingError": "Lo siento, encontré un error al procesar tu solicitud. Por favor intenta de nuevo.",
      "loadingError": "Error al cargar Perspectivas Inteligentes"
    }
  },
  fr: {
    "title": "Analyses Intelligentes",
    "subtitle": "Assistant d'intelligence d'affaires alimenté par l'IA",
    "loading": "Initialisation des Analyses Intelligentes...",
    "popularQueries": "Requêtes Populaires",
    "credits": {
      "available": "Crédits Disponibles",
      "usedThisMonth": "Utilisés ce mois-ci : {{count}}",
      "buyButton": "Acheter des Crédits"
    },
    "chat": {
      "startConversation": "Démarrer une conversation",
      "askAnything": "Demandez-moi n'importe quoi sur vos données d'entreprise",
      "placeholder": "Posez des questions sur votre entreprise..."
    },
    "categories": {
      "revenue": {
        "title": "Revenus et Ventes",
        "query1": "Montrez ma tendance de revenus avec un graphique",
        "query2": "Quels produits sont les plus vendus ? Inclure un graphique",
        "query3": "Créer un graphique des ventes par segment de clients",
        "query4": "Quelle est ma tendance de valeur moyenne de commande ?"
      },
      "customers": {
        "title": "Analyses Clients",
        "query1": "Montrez mes meilleurs clients dans un graphique",
        "query2": "Quel est mon taux de rétention client ? Afficher en graphique de pourcentage",
        "query3": "Créer une visualisation des clients nouveaux vs récurrents",
        "query4": "Quels clients sont à risque ? Inclure un graphique d'analyse"
      },
      "inventory": {
        "title": "Analyse d'Inventaire",
        "query1": "Quels produits ont besoin d'être réapprovisionnés ? Afficher dans un graphique",
        "query2": "Visualiser les taux de rotation des stocks",
        "query3": "Créer un graphique des articles à rotation lente vs rapide",
        "query4": "Montrer ma répartition actuelle de la valeur du stock"
      },
      "performance": {
        "title": "Performance de l'Entreprise",
        "query1": "Comment mon entreprise se porte-t-elle ? Inclure des graphiques",
        "query2": "Comparer ce mois au mois dernier avec des visualisations",
        "query3": "Montrez mes marges bénéficiaires dans un graphique",
        "query4": "Créer une visualisation de la répartition des dépenses"
      }
    },
    "packages": {
      "starter": {
        "name": "Pack Débutant"
      },
      "growth": {
        "name": "Pack Croissance"
      },
      "pro": {
        "name": "Professionnel"
      },
      "enterprise": {
        "name": "Entreprise"
      }
    },
    "buyCredits": {
      "title": "Acheter des Crédits d'Analyses Intelligentes",
      "description": "Choisissez un forfait de crédits pour continuer à utiliser les Analyses Intelligentes",
      "bestValue": "Meilleure Valeur",
      "creditsCount": "{{count}} crédits",
      "perCredit": "{{price}}$ par crédit",
      "loadingPackages": "Chargement des forfaits de crédits...",
      "cancel": "Annuler",
      "continueToPayment": "Continuer vers le Paiement"
    },
    "errors": {
      "noCredits": "Aucun crédit restant. Veuillez acheter plus de crédits.",
      "initFailed": "Échec de l'initialisation. Veuillez actualiser la page.",
      "processingError": "Je m'excuse, mais j'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.",
      "loadingError": "Erreur lors du chargement des Analyses Intelligentes"
    }
  },
  pt: {
    "title": "Insights Inteligentes",
    "subtitle": "Assistente de inteligência empresarial alimentado por IA",
    "loading": "Inicializando Insights Inteligentes...",
    "popularQueries": "Consultas Populares",
    "credits": {
      "available": "Créditos Disponíveis",
      "usedThisMonth": "Usados este mês: {{count}}",
      "buyButton": "Comprar Créditos"
    },
    "chat": {
      "startConversation": "Iniciar uma conversa",
      "askAnything": "Pergunte-me qualquer coisa sobre os dados do seu negócio",
      "placeholder": "Pergunte sobre o seu negócio..."
    },
    "categories": {
      "revenue": {
        "title": "Receitas e Vendas",
        "query1": "Mostre minha tendência de receita com um gráfico",
        "query2": "Quais produtos são mais vendidos? Inclua um gráfico",
        "query3": "Crie um gráfico de vendas por segmento de clientes",
        "query4": "Qual é minha tendência de valor médio de pedido?"
      },
      "customers": {
        "title": "Insights de Clientes",
        "query1": "Mostre meus melhores clientes em um gráfico",
        "query2": "Qual é minha taxa de retenção de clientes? Mostre como gráfico de porcentagem",
        "query3": "Crie uma visualização de clientes novos vs recorrentes",
        "query4": "Quais clientes estão em risco? Inclua gráfico de análise"
      },
      "inventory": {
        "title": "Análise de Inventário",
        "query1": "Quais produtos precisam de reabastecimento? Mostre em um gráfico",
        "query2": "Visualize as taxas de rotatividade de estoque",
        "query3": "Crie um gráfico de itens de movimento lento vs rápido",
        "query4": "Mostre minha divisão atual do valor do estoque"
      },
      "performance": {
        "title": "Desempenho do Negócio",
        "query1": "Como está o desempenho do meu negócio? Inclua gráficos",
        "query2": "Compare este mês com o mês passado com visualizações",
        "query3": "Mostre minhas margens de lucro em um gráfico",
        "query4": "Crie uma visualização da divisão de despesas"
      }
    },
    "packages": {
      "starter": {
        "name": "Pacote Inicial"
      },
      "growth": {
        "name": "Pacote de Crescimento"
      },
      "pro": {
        "name": "Profissional"
      },
      "enterprise": {
        "name": "Empresarial"
      }
    },
    "buyCredits": {
      "title": "Comprar Créditos de Insights Inteligentes",
      "description": "Escolha um pacote de créditos para continuar usando Insights Inteligentes",
      "bestValue": "Melhor Valor",
      "creditsCount": "{{count}} créditos",
      "perCredit": "${{price}} por crédito",
      "loadingPackages": "Carregando pacotes de créditos...",
      "cancel": "Cancelar",
      "continueToPayment": "Continuar para Pagamento"
    },
    "errors": {
      "noCredits": "Sem créditos restantes. Por favor, compre mais créditos.",
      "initFailed": "Falha ao inicializar. Por favor, atualize a página.",
      "processingError": "Desculpe, encontrei um erro ao processar sua solicitação. Por favor, tente novamente.",
      "loadingError": "Erro ao carregar Insights Inteligentes"
    }
  },
  de: {
    "title": "Intelligente Einblicke",
    "subtitle": "KI-gestützter Business Intelligence-Assistent",
    "loading": "Intelligente Einblicke werden initialisiert...",
    "popularQueries": "Beliebte Abfragen",
    "credits": {
      "available": "Verfügbare Credits",
      "usedThisMonth": "Diesen Monat verwendet: {{count}}",
      "buyButton": "Credits kaufen"
    },
    "chat": {
      "startConversation": "Gespräch beginnen",
      "askAnything": "Fragen Sie mich alles über Ihre Geschäftsdaten",
      "placeholder": "Fragen Sie nach Ihrem Geschäft..."
    },
    "categories": {
      "revenue": {
        "title": "Umsatz & Verkäufe",
        "query1": "Zeigen Sie meinen Umsatztrend mit einem Diagramm",
        "query2": "Welche Produkte sind Bestseller? Mit Diagramm einschließen",
        "query3": "Erstellen Sie ein Diagramm der Verkäufe nach Kundensegmenten",
        "query4": "Wie ist mein durchschnittlicher Bestellwerttrend?"
      },
      "customers": {
        "title": "Kundeneinblicke",
        "query1": "Zeigen Sie meine Top-Kunden in einem Diagramm",
        "query2": "Wie hoch ist meine Kundenbindungsrate? Als Prozentdiagramm anzeigen",
        "query3": "Erstellen Sie eine Visualisierung von neuen vs wiederkehrenden Kunden",
        "query4": "Welche Kunden sind gefährdet? Mit Analysediagramm einschließen"
      },
      "inventory": {
        "title": "Bestandsanalyse",
        "query1": "Welche Produkte müssen aufgefüllt werden? In einem Diagramm anzeigen",
        "query2": "Visualisieren Sie Lagerumschlagsraten",
        "query3": "Erstellen Sie ein Diagramm von langsam vs schnell bewegten Artikeln",
        "query4": "Zeigen Sie meine aktuelle Bestandswertaufschlüsselung"
      },
      "performance": {
        "title": "Geschäftsleistung",
        "query1": "Wie läuft mein Geschäft? Mit Diagrammen einschließen",
        "query2": "Vergleichen Sie diesen Monat mit dem letzten Monat mit Visualisierungen",
        "query3": "Zeigen Sie meine Gewinnmargen in einem Diagramm",
        "query4": "Erstellen Sie eine Visualisierung der Ausgabenaufschlüsselung"
      }
    },
    "packages": {
      "starter": {
        "name": "Starterpaket"
      },
      "growth": {
        "name": "Wachstumspaket"
      },
      "pro": {
        "name": "Professionell"
      },
      "enterprise": {
        "name": "Unternehmen"
      }
    },
    "buyCredits": {
      "title": "Intelligente Einblicke Credits kaufen",
      "description": "Wählen Sie ein Credit-Paket, um Intelligente Einblicke weiter zu nutzen",
      "bestValue": "Bester Wert",
      "creditsCount": "{{count}} Credits",
      "perCredit": "${{price}} pro Credit",
      "loadingPackages": "Credit-Pakete werden geladen...",
      "cancel": "Abbrechen",
      "continueToPayment": "Weiter zur Zahlung"
    },
    "errors": {
      "noCredits": "Keine Credits mehr vorhanden. Bitte kaufen Sie weitere Credits.",
      "initFailed": "Initialisierung fehlgeschlagen. Bitte aktualisieren Sie die Seite.",
      "processingError": "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
      "loadingError": "Fehler beim Laden der Intelligenten Einblicke"
    }
  },
  zh: {
    "title": "智能洞察",
    "subtitle": "AI驱动的商业智能助手",
    "loading": "正在初始化智能洞察...",
    "popularQueries": "热门查询",
    "credits": {
      "available": "可用积分",
      "usedThisMonth": "本月已使用：{{count}}",
      "buyButton": "购买积分"
    },
    "chat": {
      "startConversation": "开始对话",
      "askAnything": "询问有关您业务数据的任何问题",
      "placeholder": "询问您的业务..."
    },
    "categories": {
      "revenue": {
        "title": "收入与销售",
        "query1": "显示我的收入趋势图表",
        "query2": "哪些产品是畅销品？包括图表",
        "query3": "创建按客户细分的销售图表",
        "query4": "我的平均订单价值趋势是什么？"
      },
      "customers": {
        "title": "客户洞察",
        "query1": "在图表中显示我的顶级客户",
        "query2": "我的客户保留率是多少？显示为百分比图表",
        "query3": "创建新客户与回头客的可视化",
        "query4": "哪些客户有风险？包括分析图表"
      },
      "inventory": {
        "title": "库存分析",
        "query1": "哪些产品需要补货？在图表中显示",
        "query2": "可视化库存周转率",
        "query3": "创建慢速与快速移动商品的图表",
        "query4": "显示我当前的库存价值细分"
      },
      "performance": {
        "title": "业务绩效",
        "query1": "我的业务表现如何？包括图表",
        "query2": "用可视化比较本月与上月",
        "query3": "在图表中显示我的利润率",
        "query4": "创建费用明细可视化"
      }
    },
    "packages": {
      "starter": {
        "name": "入门包"
      },
      "growth": {
        "name": "成长包"
      },
      "pro": {
        "name": "专业版"
      },
      "enterprise": {
        "name": "企业版"
      }
    },
    "buyCredits": {
      "title": "购买智能洞察积分",
      "description": "选择积分套餐以继续使用智能洞察",
      "bestValue": "超值",
      "creditsCount": "{{count}} 积分",
      "perCredit": "每积分 ${{price}}",
      "loadingPackages": "正在加载积分套餐...",
      "cancel": "取消",
      "continueToPayment": "继续付款"
    },
    "errors": {
      "noCredits": "没有剩余积分。请购买更多积分。",
      "initFailed": "初始化失败。请刷新页面。",
      "processingError": "抱歉，处理您的请求时遇到错误。请重试。",
      "loadingError": "加载智能洞察时出错"
    }
  },
  ar: {
    "title": "الرؤى الذكية",
    "subtitle": "مساعد ذكاء الأعمال المدعوم بالذكاء الاصطناعي",
    "loading": "جارٍ تهيئة الرؤى الذكية...",
    "popularQueries": "الاستعلامات الشائعة",
    "credits": {
      "available": "الأرصدة المتاحة",
      "usedThisMonth": "المستخدمة هذا الشهر: {{count}}",
      "buyButton": "شراء أرصدة"
    },
    "chat": {
      "startConversation": "ابدأ محادثة",
      "askAnything": "اسألني أي شيء عن بيانات عملك",
      "placeholder": "اسأل عن عملك..."
    },
    "categories": {
      "revenue": {
        "title": "الإيرادات والمبيعات",
        "query1": "أظهر اتجاه إيراداتي بمخطط",
        "query2": "ما هي المنتجات الأكثر مبيعاً؟ قم بتضمين مخطط",
        "query3": "أنشئ مخططاً للمبيعات حسب شريحة العملاء",
        "query4": "ما هو اتجاه متوسط قيمة الطلب لدي؟"
      },
      "customers": {
        "title": "رؤى العملاء",
        "query1": "أظهر أفضل عملائي في مخطط",
        "query2": "ما هو معدل الاحتفاظ بالعملاء لدي؟ أظهر كمخطط نسبة مئوية",
        "query3": "أنشئ تصويراً للعملاء الجدد مقابل العائدين",
        "query4": "أي العملاء في خطر؟ قم بتضمين مخطط تحليل"
      },
      "inventory": {
        "title": "تحليل المخزون",
        "query1": "ما المنتجات التي تحتاج إلى إعادة تخزين؟ أظهر في مخطط",
        "query2": "تصور معدلات دوران المخزون",
        "query3": "أنشئ مخططاً للعناصر بطيئة الحركة مقابل سريعة الحركة",
        "query4": "أظهر تفصيل قيمة المخزون الحالي"
      },
      "performance": {
        "title": "أداء الأعمال",
        "query1": "كيف يسير أداء عملي؟ قم بتضمين المخططات",
        "query2": "قارن هذا الشهر بالشهر الماضي مع التصورات",
        "query3": "أظهر هوامش ربحي في مخطط",
        "query4": "أنشئ تصويراً لتفصيل المصروفات"
      }
    },
    "packages": {
      "starter": {
        "name": "حزمة البداية"
      },
      "growth": {
        "name": "حزمة النمو"
      },
      "pro": {
        "name": "احترافي"
      },
      "enterprise": {
        "name": "مؤسسي"
      }
    },
    "buyCredits": {
      "title": "شراء أرصدة الرؤى الذكية",
      "description": "اختر حزمة أرصدة لمتابعة استخدام الرؤى الذكية",
      "bestValue": "أفضل قيمة",
      "creditsCount": "{{count}} رصيد",
      "perCredit": "${{price}} لكل رصيد",
      "loadingPackages": "جارٍ تحميل حزم الأرصدة...",
      "cancel": "إلغاء",
      "continueToPayment": "المتابعة إلى الدفع"
    },
    "errors": {
      "noCredits": "لا توجد أرصدة متبقية. يرجى شراء المزيد من الأرصدة.",
      "initFailed": "فشلت التهيئة. يرجى تحديث الصفحة.",
      "processingError": "أعتذر، لكنني واجهت خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.",
      "loadingError": "خطأ في تحميل الرؤى الذكية"
    }
  },
  sw: {
    "title": "Maarifa Makini",
    "subtitle": "Msaidizi wa akili ya biashara unaoendeshwa na AI",
    "loading": "Inaanzisha Maarifa Makini...",
    "popularQueries": "Maswali Maarufu",
    "credits": {
      "available": "Mikopo Inayopatikana",
      "usedThisMonth": "Iliyotumika mwezi huu: {{count}}",
      "buyButton": "Nunua Mikopo"
    },
    "chat": {
      "startConversation": "Anza mazungumzo",
      "askAnything": "Niulize chochote kuhusu data ya biashara yako",
      "placeholder": "Uliza kuhusu biashara yako..."
    },
    "categories": {
      "revenue": {
        "title": "Mapato na Mauzo",
        "query1": "Onyesha mwelekeo wa mapato yangu kwa chati",
        "query2": "Ni bidhaa zipi zinazouzwa zaidi? Jumuisha chati",
        "query3": "Unda chati ya mauzo kwa kundi la wateja",
        "query4": "Mwelekeo wa wastani wa thamani ya agizo langu ni upi?"
      },
      "customers": {
        "title": "Maarifa ya Wateja",
        "query1": "Onyesha wateja wangu wakuu katika chati",
        "query2": "Kiwango changu cha kuhifadhi wateja ni kipi? Onyesha kama chati ya asilimia",
        "query3": "Unda taswira ya wateja wapya dhidi ya wanaorudia",
        "query4": "Ni wateja gani walio hatarini? Jumuisha chati ya uchambuzi"
      },
      "inventory": {
        "title": "Uchambuzi wa Hesabu",
        "query1": "Ni bidhaa zipi zinahitaji kujazwa tena? Onyesha katika chati",
        "query2": "Onyesha viwango vya mzunguko wa hesabu",
        "query3": "Unda chati ya vitu vinavyosonga polepole dhidi ya haraka",
        "query4": "Onyesha mgawanyiko wa thamani ya hisa yangu ya sasa"
      },
      "performance": {
        "title": "Utendaji wa Biashara",
        "query1": "Biashara yangu inafanyaje? Jumuisha chati",
        "query2": "Linganisha mwezi huu na mwezi uliopita kwa taswira",
        "query3": "Onyesha pato langu katika chati",
        "query4": "Unda taswira ya mgawanyiko wa gharama"
      }
    },
    "packages": {
      "starter": {
        "name": "Kifurushi cha Kuanza"
      },
      "growth": {
        "name": "Kifurushi cha Ukuaji"
      },
      "pro": {
        "name": "Kitaalamu"
      },
      "enterprise": {
        "name": "Biashara"
      }
    },
    "buyCredits": {
      "title": "Nunua Mikopo ya Maarifa Makini",
      "description": "Chagua kifurushi cha mikopo ili kuendelea kutumia Maarifa Makini",
      "bestValue": "Thamani Bora",
      "creditsCount": "Mikopo {{count}}",
      "perCredit": "${{price}} kwa mkopo",
      "loadingPackages": "Inapakia vifurushi vya mikopo...",
      "cancel": "Ghairi",
      "continueToPayment": "Endelea kwa Malipo"
    },
    "errors": {
      "noCredits": "Hakuna mikopo iliyobaki. Tafadhali nunua mikopo zaidi.",
      "initFailed": "Imeshindwa kuanzisha. Tafadhali onyesha upya ukurasa.",
      "processingError": "Samahani, nimekutana na hitilafu wakati wa kushughulikia ombi lako. Tafadhali jaribu tena.",
      "loadingError": "Hitilafu katika kupakia Maarifa Makini"
    }
  },
  hi: {
    "title": "स्मार्ट अंतर्दृष्टि",
    "subtitle": "AI-संचालित व्यावसायिक बुद्धिमत्ता सहायक",
    "loading": "स्मार्ट अंतर्दृष्टि आरंभ कर रहे हैं...",
    "popularQueries": "लोकप्रिय प्रश्न",
    "credits": {
      "available": "उपलब्ध क्रेडिट",
      "usedThisMonth": "इस महीने उपयोग किए गए: {{count}}",
      "buyButton": "क्रेडिट खरीदें"
    },
    "chat": {
      "startConversation": "बातचीत शुरू करें",
      "askAnything": "अपने व्यावसायिक डेटा के बारे में मुझसे कुछ भी पूछें",
      "placeholder": "अपने व्यवसाय के बारे में पूछें..."
    },
    "categories": {
      "revenue": {
        "title": "राजस्व और बिक्री",
        "query1": "चार्ट के साथ मेरी राजस्व प्रवृत्ति दिखाएं",
        "query2": "कौन से उत्पाद सबसे ज्यादा बिकने वाले हैं? चार्ट शामिल करें",
        "query3": "ग्राहक खंड द्वारा बिक्री का चार्ट बनाएं",
        "query4": "मेरी औसत ऑर्डर मूल्य प्रवृत्ति क्या है?"
      },
      "customers": {
        "title": "ग्राहक अंतर्दृष्टि",
        "query1": "चार्ट में मेरे शीर्ष ग्राहक दिखाएं",
        "query2": "मेरी ग्राहक प्रतिधारण दर क्या है? प्रतिशत चार्ट के रूप में दिखाएं",
        "query3": "नए बनाम लौटने वाले ग्राहकों का दृश्य बनाएं",
        "query4": "कौन से ग्राहक जोखिम में हैं? विश्लेषण चार्ट शामिल करें"
      },
      "inventory": {
        "title": "इन्वेंट्री विश्लेषण",
        "query1": "किन उत्पादों को फिर से स्टॉक करने की आवश्यकता है? चार्ट में दिखाएं",
        "query2": "इन्वेंट्री टर्नओवर दरों को दृश्यमान करें",
        "query3": "धीमी गति से बनाम तेज़ गति से चलने वाली वस्तुओं का चार्ट बनाएं",
        "query4": "मेरे वर्तमान स्टॉक मूल्य विभाजन को दिखाएं"
      },
      "performance": {
        "title": "व्यावसायिक प्रदर्शन",
        "query1": "मेरा व्यवसाय कैसा प्रदर्शन कर रहा है? चार्ट शामिल करें",
        "query2": "दृश्यों के साथ इस महीने की तुलना पिछले महीने से करें",
        "query3": "चार्ट में मेरे लाभ मार्जिन दिखाएं",
        "query4": "व्यय विभाजन दृश्य बनाएं"
      }
    },
    "packages": {
      "starter": {
        "name": "स्टार्टर पैक"
      },
      "growth": {
        "name": "ग्रोथ पैक"
      },
      "pro": {
        "name": "प्रोफेशनल"
      },
      "enterprise": {
        "name": "एंटरप्राइज़"
      }
    },
    "buyCredits": {
      "title": "स्मार्ट अंतर्दृष्टि क्रेडिट खरीदें",
      "description": "स्मार्ट अंतर्दृष्टि का उपयोग जारी रखने के लिए क्रेडिट पैकेज चुनें",
      "bestValue": "सर्वोत्तम मूल्य",
      "creditsCount": "{{count}} क्रेडिट",
      "perCredit": "${{price}} प्रति क्रेडिट",
      "loadingPackages": "क्रेडिट पैकेज लोड हो रहे हैं...",
      "cancel": "रद्द करें",
      "continueToPayment": "भुगतान जारी रखें"
    },
    "errors": {
      "noCredits": "कोई क्रेडिट शेष नहीं। कृपया अधिक क्रेडिट खरीदें।",
      "initFailed": "आरंभ करना विफल। कृपया पृष्ठ को रीफ्रेश करें।",
      "processingError": "मुझे खेद है, लेकिन आपके अनुरोध को संसाधित करते समय मुझे एक त्रुटि मिली। कृपया पुनः प्रयास करें।",
      "loadingError": "स्मार्ट अंतर्दृष्टि लोड करने में त्रुटि"
    }
  },
  ru: {
    "title": "Умные Аналитики",
    "subtitle": "Помощник бизнес-аналитики на основе ИИ",
    "loading": "Инициализация Умных Аналитик...",
    "popularQueries": "Популярные Запросы",
    "credits": {
      "available": "Доступные Кредиты",
      "usedThisMonth": "Использовано в этом месяце: {{count}}",
      "buyButton": "Купить Кредиты"
    },
    "chat": {
      "startConversation": "Начать разговор",
      "askAnything": "Спросите меня что угодно о данных вашего бизнеса",
      "placeholder": "Спросите о вашем бизнесе..."
    },
    "categories": {
      "revenue": {
        "title": "Доходы и Продажи",
        "query1": "Покажите тренд моих доходов с графиком",
        "query2": "Какие продукты являются бестселлерами? Включите график",
        "query3": "Создайте график продаж по сегментам клиентов",
        "query4": "Какова тенденция средней стоимости заказа?"
      },
      "customers": {
        "title": "Аналитика Клиентов",
        "query1": "Покажите моих лучших клиентов на графике",
        "query2": "Какова моя скорость удержания клиентов? Покажите в виде процентного графика",
        "query3": "Создайте визуализацию новых и возвращающихся клиентов",
        "query4": "Какие клиенты находятся в зоне риска? Включите аналитический график"
      },
      "inventory": {
        "title": "Анализ Инвентаря",
        "query1": "Какие продукты нуждаются в пополнении? Покажите на графике",
        "query2": "Визуализируйте коэффициенты оборачиваемости запасов",
        "query3": "Создайте график медленно и быстро движущихся товаров",
        "query4": "Покажите разбивку текущей стоимости запасов"
      },
      "performance": {
        "title": "Эффективность Бизнеса",
        "query1": "Как работает мой бизнес? Включите графики",
        "query2": "Сравните этот месяц с прошлым месяцем с визуализациями",
        "query3": "Покажите мою прибыльность на графике",
        "query4": "Создайте визуализацию разбивки расходов"
      }
    },
    "packages": {
      "starter": {
        "name": "Стартовый Пакет"
      },
      "growth": {
        "name": "Пакет Роста"
      },
      "pro": {
        "name": "Профессиональный"
      },
      "enterprise": {
        "name": "Корпоративный"
      }
    },
    "buyCredits": {
      "title": "Купить Кредиты Умных Аналитик",
      "description": "Выберите пакет кредитов для продолжения использования Умных Аналитик",
      "bestValue": "Лучшая Цена",
      "creditsCount": "{{count}} кредитов",
      "perCredit": "${{price}} за кредит",
      "loadingPackages": "Загрузка пакетов кредитов...",
      "cancel": "Отмена",
      "continueToPayment": "Продолжить к Оплате"
    },
    "errors": {
      "noCredits": "Кредиты закончились. Пожалуйста, купите больше кредитов.",
      "initFailed": "Не удалось инициализировать. Пожалуйста, обновите страницу.",
      "processingError": "Извините, но при обработке вашего запроса произошла ошибка. Пожалуйста, попробуйте снова.",
      "loadingError": "Ошибка загрузки Умных Аналитик"
    }
  },
  ja: {
    "title": "スマートインサイト",
    "subtitle": "AI搭載のビジネスインテリジェンスアシスタント",
    "loading": "スマートインサイトを初期化しています...",
    "popularQueries": "人気のクエリ",
    "credits": {
      "available": "利用可能なクレジット",
      "usedThisMonth": "今月の使用数：{{count}}",
      "buyButton": "クレジットを購入"
    },
    "chat": {
      "startConversation": "会話を開始",
      "askAnything": "ビジネスデータについて何でも聞いてください",
      "placeholder": "ビジネスについて質問..."
    },
    "categories": {
      "revenue": {
        "title": "収益と売上",
        "query1": "収益トレンドをチャートで表示",
        "query2": "どの製品がベストセラーですか？チャートを含める",
        "query3": "顧客セグメント別の売上チャートを作成",
        "query4": "平均注文額のトレンドは？"
      },
      "customers": {
        "title": "顧客インサイト",
        "query1": "トップ顧客をチャートで表示",
        "query2": "顧客維持率は？パーセンテージチャートで表示",
        "query3": "新規顧客とリピート顧客の視覚化を作成",
        "query4": "どの顧客がリスクにありますか？分析チャートを含める"
      },
      "inventory": {
        "title": "在庫分析",
        "query1": "どの製品が補充必要？チャートで表示",
        "query2": "在庫回転率を視覚化",
        "query3": "動きの遅い商品と速い商品のチャートを作成",
        "query4": "現在の在庫価値の内訳を表示"
      },
      "performance": {
        "title": "ビジネスパフォーマンス",
        "query1": "ビジネスの調子は？チャートを含める",
        "query2": "今月と先月を視覚化で比較",
        "query3": "利益率をチャートで表示",
        "query4": "経費内訳の視覚化を作成"
      }
    },
    "packages": {
      "starter": {
        "name": "スターターパック"
      },
      "growth": {
        "name": "グロースパック"
      },
      "pro": {
        "name": "プロフェッショナル"
      },
      "enterprise": {
        "name": "エンタープライズ"
      }
    },
    "buyCredits": {
      "title": "スマートインサイトクレジットを購入",
      "description": "スマートインサイトの使用を続けるためにクレジットパッケージを選択",
      "bestValue": "最高値",
      "creditsCount": "{{count}}クレジット",
      "perCredit": "クレジットあたり${{price}}",
      "loadingPackages": "クレジットパッケージを読み込み中...",
      "cancel": "キャンセル",
      "continueToPayment": "支払いへ進む"
    },
    "errors": {
      "noCredits": "クレジットが残っていません。追加のクレジットを購入してください。",
      "initFailed": "初期化に失敗しました。ページを更新してください。",
      "processingError": "申し訳ございません。リクエストの処理中にエラーが発生しました。もう一度お試しください。",
      "loadingError": "スマートインサイトの読み込みエラー"
    }
  },
  tr: {
    "title": "Akıllı İçgörüler",
    "subtitle": "Yapay zeka destekli iş zekası asistanı",
    "loading": "Akıllı İçgörüler başlatılıyor...",
    "popularQueries": "Popüler Sorgular",
    "credits": {
      "available": "Kullanılabilir Krediler",
      "usedThisMonth": "Bu ay kullanılan: {{count}}",
      "buyButton": "Kredi Satın Al"
    },
    "chat": {
      "startConversation": "Sohbet başlat",
      "askAnything": "İş verileriniz hakkında bana herhangi bir şey sorun",
      "placeholder": "İşiniz hakkında sorun..."
    },
    "categories": {
      "revenue": {
        "title": "Gelir ve Satışlar",
        "query1": "Gelir trendimi grafikle göster",
        "query2": "Hangi ürünler en çok satanlar? Grafik ekle",
        "query3": "Müşteri segmentine göre satış grafiği oluştur",
        "query4": "Ortalama sipariş değeri trendim nedir?"
      },
      "customers": {
        "title": "Müşteri İçgörüleri",
        "query1": "En iyi müşterilerimi grafikte göster",
        "query2": "Müşteri tutma oranım nedir? Yüzde grafiği olarak göster",
        "query3": "Yeni ve geri dönen müşterilerin görselleştirmesini oluştur",
        "query4": "Hangi müşteriler risk altında? Analiz grafiği ekle"
      },
      "inventory": {
        "title": "Envanter Analizi",
        "query1": "Hangi ürünlerin yeniden stoklanması gerekiyor? Grafikte göster",
        "query2": "Envanter devir hızlarını görselleştir",
        "query3": "Yavaş ve hızlı hareket eden ürünlerin grafiğini oluştur",
        "query4": "Mevcut stok değeri dağılımımı göster"
      },
      "performance": {
        "title": "İş Performansı",
        "query1": "İşim nasıl performans gösteriyor? Grafikler ekle",
        "query2": "Bu ayı geçen ayla görselleştirmelerle karşılaştır",
        "query3": "Kar marjlarımı grafikte göster",
        "query4": "Gider dağılımı görselleştirmesi oluştur"
      }
    },
    "packages": {
      "starter": {
        "name": "Başlangıç Paketi"
      },
      "growth": {
        "name": "Büyüme Paketi"
      },
      "pro": {
        "name": "Profesyonel"
      },
      "enterprise": {
        "name": "Kurumsal"
      }
    },
    "buyCredits": {
      "title": "Akıllı İçgörü Kredisi Satın Al",
      "description": "Akıllı İçgörüleri kullanmaya devam etmek için bir kredi paketi seçin",
      "bestValue": "En İyi Değer",
      "creditsCount": "{{count}} kredi",
      "perCredit": "Kredi başına ${{price}}",
      "loadingPackages": "Kredi paketleri yükleniyor...",
      "cancel": "İptal",
      "continueToPayment": "Ödemeye Devam Et"
    },
    "errors": {
      "noCredits": "Kalan kredi yok. Lütfen daha fazla kredi satın alın.",
      "initFailed": "Başlatma başarısız. Lütfen sayfayı yenileyin.",
      "processingError": "Özür dilerim, isteğinizi işlerken bir hatayla karşılaştım. Lütfen tekrar deneyin.",
      "loadingError": "Akıllı İçgörüler yüklenirken hata"
    }
  },
  id: {
    "title": "Wawasan Cerdas",
    "subtitle": "Asisten intelijen bisnis bertenaga AI",
    "loading": "Menginisialisasi Wawasan Cerdas...",
    "popularQueries": "Pertanyaan Populer",
    "credits": {
      "available": "Kredit Tersedia",
      "usedThisMonth": "Digunakan bulan ini: {{count}}",
      "buyButton": "Beli Kredit"
    },
    "chat": {
      "startConversation": "Mulai percakapan",
      "askAnything": "Tanyakan apa saja tentang data bisnis Anda",
      "placeholder": "Tanyakan tentang bisnis Anda..."
    },
    "categories": {
      "revenue": {
        "title": "Pendapatan & Penjualan",
        "query1": "Tampilkan tren pendapatan saya dengan grafik",
        "query2": "Produk mana yang terlaris? Sertakan grafik",
        "query3": "Buat grafik penjualan berdasarkan segmen pelanggan",
        "query4": "Bagaimana tren nilai pesanan rata-rata saya?"
      },
      "customers": {
        "title": "Wawasan Pelanggan",
        "query1": "Tampilkan pelanggan teratas saya dalam grafik",
        "query2": "Berapa tingkat retensi pelanggan saya? Tampilkan sebagai grafik persentase",
        "query3": "Buat visualisasi pelanggan baru vs pelanggan yang kembali",
        "query4": "Pelanggan mana yang berisiko? Sertakan grafik analisis"
      },
      "inventory": {
        "title": "Analisis Inventaris",
        "query1": "Produk mana yang perlu diisi ulang? Tampilkan dalam grafik",
        "query2": "Visualisasikan tingkat perputaran inventaris",
        "query3": "Buat grafik barang bergerak lambat vs cepat",
        "query4": "Tampilkan rincian nilai stok saat ini"
      },
      "performance": {
        "title": "Kinerja Bisnis",
        "query1": "Bagaimana kinerja bisnis saya? Sertakan grafik",
        "query2": "Bandingkan bulan ini dengan bulan lalu dengan visualisasi",
        "query3": "Tampilkan margin keuntungan saya dalam grafik",
        "query4": "Buat visualisasi rincian pengeluaran"
      }
    },
    "packages": {
      "starter": {
        "name": "Paket Pemula"
      },
      "growth": {
        "name": "Paket Pertumbuhan"
      },
      "pro": {
        "name": "Profesional"
      },
      "enterprise": {
        "name": "Perusahaan"
      }
    },
    "buyCredits": {
      "title": "Beli Kredit Wawasan Cerdas",
      "description": "Pilih paket kredit untuk melanjutkan menggunakan Wawasan Cerdas",
      "bestValue": "Nilai Terbaik",
      "creditsCount": "{{count}} kredit",
      "perCredit": "${{price}} per kredit",
      "loadingPackages": "Memuat paket kredit...",
      "cancel": "Batal",
      "continueToPayment": "Lanjut ke Pembayaran"
    },
    "errors": {
      "noCredits": "Tidak ada kredit tersisa. Silakan beli lebih banyak kredit.",
      "initFailed": "Gagal menginisialisasi. Silakan muat ulang halaman.",
      "processingError": "Maaf, saya mengalami kesalahan saat memproses permintaan Anda. Silakan coba lagi.",
      "loadingError": "Kesalahan memuat Wawasan Cerdas"
    }
  },
  vi: {
    "title": "Thông Tin Thông Minh",
    "subtitle": "Trợ lý thông tin kinh doanh được hỗ trợ bởi AI",
    "loading": "Đang khởi tạo Thông Tin Thông Minh...",
    "popularQueries": "Câu Hỏi Phổ Biến",
    "credits": {
      "available": "Tín Dụng Khả Dụng",
      "usedThisMonth": "Đã sử dụng tháng này: {{count}}",
      "buyButton": "Mua Tín Dụng"
    },
    "chat": {
      "startConversation": "Bắt đầu cuộc trò chuyện",
      "askAnything": "Hỏi tôi bất cứ điều gì về dữ liệu kinh doanh của bạn",
      "placeholder": "Hỏi về doanh nghiệp của bạn..."
    },
    "categories": {
      "revenue": {
        "title": "Doanh Thu & Bán Hàng",
        "query1": "Hiển thị xu hướng doanh thu của tôi với biểu đồ",
        "query2": "Sản phẩm nào bán chạy nhất? Bao gồm biểu đồ",
        "query3": "Tạo biểu đồ bán hàng theo phân khúc khách hàng",
        "query4": "Xu hướng giá trị đơn hàng trung bình của tôi là gì?"
      },
      "customers": {
        "title": "Thông Tin Khách Hàng",
        "query1": "Hiển thị khách hàng hàng đầu của tôi trong biểu đồ",
        "query2": "Tỷ lệ giữ chân khách hàng của tôi là bao nhiêu? Hiển thị dưới dạng biểu đồ phần trăm",
        "query3": "Tạo hình ảnh trực quan về khách hàng mới so với khách hàng quay lại",
        "query4": "Khách hàng nào có rủi ro? Bao gồm biểu đồ phân tích"
      },
      "inventory": {
        "title": "Phân Tích Hàng Tồn Kho",
        "query1": "Sản phẩm nào cần bổ sung? Hiển thị trong biểu đồ",
        "query2": "Trực quan hóa tỷ lệ luân chuyển hàng tồn kho",
        "query3": "Tạo biểu đồ các mặt hàng chậm luân chuyển so với nhanh",
        "query4": "Hiển thị phân tích giá trị tồn kho hiện tại"
      },
      "performance": {
        "title": "Hiệu Suất Kinh Doanh",
        "query1": "Doanh nghiệp của tôi đang hoạt động như thế nào? Bao gồm biểu đồ",
        "query2": "So sánh tháng này với tháng trước bằng hình ảnh trực quan",
        "query3": "Hiển thị biên lợi nhuận của tôi trong biểu đồ",
        "query4": "Tạo hình ảnh trực quan phân tích chi phí"
      }
    },
    "packages": {
      "starter": {
        "name": "Gói Khởi Đầu"
      },
      "growth": {
        "name": "Gói Tăng Trưởng"
      },
      "pro": {
        "name": "Chuyên Nghiệp"
      },
      "enterprise": {
        "name": "Doanh Nghiệp"
      }
    },
    "buyCredits": {
      "title": "Mua Tín Dụng Thông Tin Thông Minh",
      "description": "Chọn gói tín dụng để tiếp tục sử dụng Thông Tin Thông Minh",
      "bestValue": "Giá Trị Tốt Nhất",
      "creditsCount": "{{count}} tín dụng",
      "perCredit": "${{price}} mỗi tín dụng",
      "loadingPackages": "Đang tải gói tín dụng...",
      "cancel": "Hủy",
      "continueToPayment": "Tiếp Tục Thanh Toán"
    },
    "errors": {
      "noCredits": "Không còn tín dụng. Vui lòng mua thêm tín dụng.",
      "initFailed": "Không thể khởi tạo. Vui lòng làm mới trang.",
      "processingError": "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.",
      "loadingError": "Lỗi khi tải Thông Tin Thông Minh"
    }
  },
  nl: {
    "title": "Slimme Inzichten",
    "subtitle": "AI-aangedreven business intelligence-assistent",
    "loading": "Slimme Inzichten initialiseren...",
    "popularQueries": "Populaire Zoekopdrachten",
    "credits": {
      "available": "Beschikbare Credits",
      "usedThisMonth": "Deze maand gebruikt: {{count}}",
      "buyButton": "Credits Kopen"
    },
    "chat": {
      "startConversation": "Start een gesprek",
      "askAnything": "Vraag me alles over uw bedrijfsgegevens",
      "placeholder": "Vraag over uw bedrijf..."
    },
    "categories": {
      "revenue": {
        "title": "Omzet & Verkoop",
        "query1": "Toon mijn omzettrend met een grafiek",
        "query2": "Welke producten zijn bestsellers? Voeg een grafiek toe",
        "query3": "Maak een grafiek van verkoop per klantsegment",
        "query4": "Wat is mijn gemiddelde bestelwaarde trend?"
      },
      "customers": {
        "title": "Klantinzichten",
        "query1": "Toon mijn topklanten in een grafiek",
        "query2": "Wat is mijn klantretentiepercentage? Toon als percentagegrafiek",
        "query3": "Maak een visualisatie van nieuwe versus terugkerende klanten",
        "query4": "Welke klanten lopen risico? Voeg analysegrafiek toe"
      },
      "inventory": {
        "title": "Voorraadanalyse",
        "query1": "Welke producten moeten worden aangevuld? Toon in een grafiek",
        "query2": "Visualiseer voorraadomloopcijfers",
        "query3": "Maak een grafiek van langzaam versus snel bewegende artikelen",
        "query4": "Toon mijn huidige voorraadwaarde-uitsplitsing"
      },
      "performance": {
        "title": "Bedrijfsprestaties",
        "query1": "Hoe presteert mijn bedrijf? Voeg grafieken toe",
        "query2": "Vergelijk deze maand met vorige maand met visualisaties",
        "query3": "Toon mijn winstmarges in een grafiek",
        "query4": "Maak een visualisatie van uitgavenuitsplitsing"
      }
    },
    "packages": {
      "starter": {
        "name": "Starterspakket"
      },
      "growth": {
        "name": "Groeipakket"
      },
      "pro": {
        "name": "Professioneel"
      },
      "enterprise": {
        "name": "Onderneming"
      }
    },
    "buyCredits": {
      "title": "Koop Slimme Inzichten Credits",
      "description": "Kies een creditpakket om Slimme Inzichten te blijven gebruiken",
      "bestValue": "Beste Waarde",
      "creditsCount": "{{count}} credits",
      "perCredit": "${{price}} per credit",
      "loadingPackages": "Creditpakketten laden...",
      "cancel": "Annuleren",
      "continueToPayment": "Doorgaan naar Betaling"
    },
    "errors": {
      "noCredits": "Geen credits meer. Koop alstublieft meer credits.",
      "initFailed": "Initialisatie mislukt. Vernieuw de pagina.",
      "processingError": "Sorry, ik ondervond een fout bij het verwerken van uw verzoek. Probeer het opnieuw.",
      "loadingError": "Fout bij het laden van Slimme Inzichten"
    }
  },
  ha: {
    "title": "Basirar Wayo",
    "subtitle": "Mataimakin hankali na kasuwanci mai ikon AI",
    "loading": "Ana fara Basirar Wayo...",
    "popularQueries": "Tambayoyi Shahararru",
    "credits": {
      "available": "Ƙididdigar da ake da su",
      "usedThisMonth": "An yi amfani wannan watan: {{count}}",
      "buyButton": "Sayi Ƙididdiga"
    },
    "chat": {
      "startConversation": "Fara tattaunawa",
      "askAnything": "Tambaye ni komai game da bayanan kasuwancin ku",
      "placeholder": "Tambaya game da kasuwancin ku..."
    },
    "categories": {
      "revenue": {
        "title": "Kuɗin Shiga da Tallace-tallace",
        "query1": "Nuna yanayin kuɗin shiga na tare da jadawali",
        "query2": "Wane samfurori ne suka fi sayarwa? Haɗa jadawali",
        "query3": "Ƙirƙiri jadawalin tallace-tallace ta ɓangaren abokan ciniki",
        "query4": "Menene matsakaicin ƙimar oda ta?"
      },
      "customers": {
        "title": "Basirar Abokan Ciniki",
        "query1": "Nuna manyan abokan cinikina a cikin jadawali",
        "query2": "Menene adadin riƙe abokan ciniki na? Nuna a matsayin jadawalin kashi",
        "query3": "Ƙirƙiri hoto na sabbin abokan ciniki da masu dawowa",
        "query4": "Wane abokan ciniki ne ke cikin haɗari? Haɗa jadawalin bincike"
      },
      "inventory": {
        "title": "Binciken Kayayyaki",
        "query1": "Wane samfurori ne ke buƙatar sake cikawa? Nuna a cikin jadawali",
        "query2": "Nuna yanayin jujjuyawar kayayyaki",
        "query3": "Ƙirƙiri jadawalin kayayyaki masu tafiya a hankali da sauri",
        "query4": "Nuna rarrabuwar ƙimar kaya na yanzu"
      },
      "performance": {
        "title": "Aikin Kasuwanci",
        "query1": "Yaya kasuwanci na yake aiki? Haɗa jadawali",
        "query2": "Kwatanta wannan watan da watan da ya wuce tare da hotuna",
        "query3": "Nuna ribar riba ta a cikin jadawali",
        "query4": "Ƙirƙiri hoton rarrabuwar kashe kuɗi"
      }
    },
    "packages": {
      "starter": {
        "name": "Kunshin Farawa"
      },
      "growth": {
        "name": "Kunshin Haɓaka"
      },
      "pro": {
        "name": "Ƙwararru"
      },
      "enterprise": {
        "name": "Kasuwanci"
      }
    },
    "buyCredits": {
      "title": "Sayi Ƙididdigar Basirar Wayo",
      "description": "Zaɓi kunshin ƙididdiga don ci gaba da amfani da Basirar Wayo",
      "bestValue": "Mafi Kyawun Ƙima",
      "creditsCount": "Ƙididdiga {{count}}",
      "perCredit": "${{price}} kowace ƙididdiga",
      "loadingPackages": "Ana loda kunshiyoyin ƙididdiga...",
      "cancel": "Soke",
      "continueToPayment": "Ci gaba zuwa Biyan Kuɗi"
    },
    "errors": {
      "noCredits": "Babu sauran ƙididdiga. Da fatan za a sayi ƙarin ƙididdiga.",
      "initFailed": "An gaza farawa. Da fatan za a sabunta shafin.",
      "processingError": "Yi haƙuri, na ci karo da kuskure wajen aiwatar da buƙatarku. Da fatan za a sake gwadawa.",
      "loadingError": "Kuskure wajen loda Basirar Wayo"
    }
  },
  yo: {
    "title": "Awọn Oye Ọgbọn",
    "subtitle": "Oluranlọwọ ọgbọn iṣowo ti AI n ṣiṣẹ",
    "loading": "N bẹrẹ Awọn Oye Ọgbọn...",
    "popularQueries": "Awọn Ibeere Olokiki",
    "credits": {
      "available": "Awọn Kirẹditi Ti o Wa",
      "usedThisMonth": "Ti lo oṣu yii: {{count}}",
      "buyButton": "Ra Awọn Kirẹditi"
    },
    "chat": {
      "startConversation": "Bẹrẹ ibaraẹnisọrọ",
      "askAnything": "Beere mi ohunkohun nipa data iṣowo rẹ",
      "placeholder": "Beere nipa iṣowo rẹ..."
    },
    "categories": {
      "revenue": {
        "title": "Owo-wiwọle ati Tita",
        "query1": "Fi aṣa owo-wiwọle mi han pẹlu aworan",
        "query2": "Awọn ọja wo ni o ta julọ? Pẹlu aworan",
        "query3": "Ṣẹda aworan tita nipasẹ apakan alabara",
        "query4": "Kini aṣa iye aṣẹ apapọ mi?"
      },
      "customers": {
        "title": "Awọn Oye Alabara",
        "query1": "Fi awọn alabara to ga julọ mi han ninu aworan",
        "query2": "Kini oṣuwọn idaduro alabara mi? Fi han bi aworan ogorun",
        "query3": "Ṣẹda ifihan ti awọn alabara tuntun vs awọn ti n pada",
        "query4": "Awọn alabara wo ni o wa ninu ewu? Pẹlu aworan itupalẹ"
      },
      "inventory": {
        "title": "Itupalẹ Iṣura",
        "query1": "Awọn ọja wo ni o nilo atunṣe? Fi han ninu aworan",
        "query2": "Ṣe afihan awọn oṣuwọn iyipo iṣura",
        "query3": "Ṣẹda aworan ti awọn nkan ti n lọ laiyara vs yiyara",
        "query4": "Fi pinpin iye iṣura lọwọlọwọ mi han"
      },
      "performance": {
        "title": "Iṣẹ Iṣowo",
        "query1": "Bawo ni iṣowo mi ṣe n ṣiṣẹ? Pẹlu awọn aworan",
        "query2": "Ṣe afiwe oṣu yii pẹlu oṣu to kọja pẹlu awọn ifihan",
        "query3": "Fi awọn ala ere mi han ninu aworan",
        "query4": "Ṣẹda ifihan pinpin inawo"
      }
    },
    "packages": {
      "starter": {
        "name": "Idii Ibẹrẹ"
      },
      "growth": {
        "name": "Idii Idagba"
      },
      "pro": {
        "name": "Alamọdaju"
      },
      "enterprise": {
        "name": "Ile-iṣẹ"
      }
    },
    "buyCredits": {
      "title": "Ra Awọn Kirẹditi Oye Ọgbọn",
      "description": "Yan idii kirẹditi lati tẹsiwaju lilo Awọn Oye Ọgbọn",
      "bestValue": "Iye To Dara Julọ",
      "creditsCount": "Awọn kirẹditi {{count}}",
      "perCredit": "${{price}} fun kirẹditi kọọkan",
      "loadingPackages": "N gbe awọn idii kirẹditi...",
      "cancel": "Fagile",
      "continueToPayment": "Tẹsiwaju si Isanwo"
    },
    "errors": {
      "noCredits": "Ko si awọn kirẹditi to ku. Jọwọ ra awọn kirẹditi diẹ sii.",
      "initFailed": "Ibẹrẹ kuna. Jọwọ sọ oju-iwe di otun.",
      "processingError": "Ma binu, mo ba aṣiṣe pade nigba ti mo n ṣiṣẹ ibeere rẹ. Jọwọ gbiyanju lẹẹkansi.",
      "loadingError": "Aṣiṣe ninu gbigbe Awọn Oye Ọgbọn"
    }
  },
  am: {
    "title": "ብልህ ግንዛቤዎች",
    "subtitle": "በ AI የተደገፈ የንግድ ብልህነት ረዳት",
    "loading": "ብልህ ግንዛቤዎችን በማስጀመር ላይ...",
    "popularQueries": "ታዋቂ ጥያቄዎች",
    "credits": {
      "available": "የሚገኙ ክሬዲቶች",
      "usedThisMonth": "በዚህ ወር የተጠቀሙ: {{count}}",
      "buyButton": "ክሬዲቶችን ይግዙ"
    },
    "chat": {
      "startConversation": "ውይይት ይጀምሩ",
      "askAnything": "ስለ ንግድዎ ውሂብ ማንኛውንም ነገር ይጠይቁኝ",
      "placeholder": "ስለ ንግድዎ ይጠይቁ..."
    },
    "categories": {
      "revenue": {
        "title": "ገቢ እና ሽያጮች",
        "query1": "የገቢ አዝማሚያዬን በቻርት አሳይ",
        "query2": "የትኞቹ ምርቶች በጣም የሚሸጡ ናቸው? ቻርት አካትት",
        "query3": "በደንበኛ ክፍል የሽያጭ ቻርት ይፍጠሩ",
        "query4": "አማካይ የትዕዛዝ ዋጋ አዝማሚያዬ ምንድነው?"
      },
      "customers": {
        "title": "የደንበኛ ግንዛቤዎች",
        "query1": "ከፍተኛ ደንበኞቼን በቻርት አሳይ",
        "query2": "የደንበኛ ማቆያ መጠኔ ምን ያህል ነው? በመቶኛ ቻርት አሳይ",
        "query3": "አዲስ እና ተመላሽ ደንበኞችን ምስላዊ መግለጫ ይፍጠሩ",
        "query4": "የትኞቹ ደንበኞች አደጋ ላይ ናቸው? የትንተና ቻርት አካትት"
      },
      "inventory": {
        "title": "የእቃ ዝርዝር ትንተና",
        "query1": "የትኞቹ ምርቶች መሙላት ያስፈልጋቸዋል? በቻርት አሳይ",
        "query2": "የእቃ ዝርዝር ዞሮ መጠኖችን በምስል አሳይ",
        "query3": "ቀስ ብሎ የሚንቀሳቀስ እና ፈጣን የሚንቀሳቀሱ እቃዎች ቻርት ይፍጠሩ",
        "query4": "አሁን ያለኝን የአክሲዮን ዋጋ ክፍፍል አሳይ"
      },
      "performance": {
        "title": "የንግድ አፈጻጸም",
        "query1": "ንግዴ እንዴት እየሰራ ነው? ቻርቶችን አካትት",
        "query2": "ይህን ወር ካለፈው ወር ጋር በምስላዊ መግለጫዎች አነጻጽር",
        "query3": "የትርፍ ህዳጎቼን በቻርት አሳይ",
        "query4": "የወጪ ክፍፍል ምስላዊ መግለጫ ይፍጠሩ"
      }
    },
    "packages": {
      "starter": {
        "name": "መጀመሪያ ጥቅል"
      },
      "growth": {
        "name": "እድገት ጥቅል"
      },
      "pro": {
        "name": "ባለሙያ"
      },
      "enterprise": {
        "name": "ድርጅት"
      }
    },
    "buyCredits": {
      "title": "ብልህ ግንዛቤ ክሬዲቶችን ይግዙ",
      "description": "ብልህ ግንዛቤዎችን መጠቀም ለመቀጠል የክሬዲት ጥቅል ይምረጡ",
      "bestValue": "ምርጥ ዋጋ",
      "creditsCount": "{{count}} ክሬዲቶች",
      "perCredit": "${{price}} በክሬዲት",
      "loadingPackages": "የክሬዲት ጥቅሎችን በመጫን ላይ...",
      "cancel": "ሰርዝ",
      "continueToPayment": "ወደ ክፍያ ቀጥል"
    },
    "errors": {
      "noCredits": "ምንም ክሬዲቶች አልቀሩም። እባክዎ ተጨማሪ ክሬዲቶችን ይግዙ።",
      "initFailed": "ማስጀመር አልተሳካም። እባክዎ ገጹን ያድሱ።",
      "processingError": "ይቅርታ፣ ጥያቄዎን በሚሰራበት ጊዜ ስህተት አጋጥሞኛል። እባክዎ እንደገና ይሞክሩ።",
      "loadingError": "ብልህ ግንዛቤዎችን በመጫን ላይ ስህተት"
    }
  },
  zu: {
    "title": "Ukuqonda Okuhlakaniphile",
    "subtitle": "Umsizi wobuhlakani bebhizinisi oqhutshwa yi-AI",
    "loading": "Iqalisa Ukuqonda Okuhlakaniphile...",
    "popularQueries": "Imibuzo Edumile",
    "credits": {
      "available": "Amakhredithi Atholakalayo",
      "usedThisMonth": "Asetshenzisiwe kule nyanga: {{count}}",
      "buyButton": "Thenga Amakhredithi"
    },
    "chat": {
      "startConversation": "Qala ingxoxo",
      "askAnything": "Ngibuze noma yini ngedatha yebhizinisi lakho",
      "placeholder": "Buza ngebhizinisi lakho..."
    },
    "categories": {
      "revenue": {
        "title": "Imali Engenayo Nokuthengisa",
        "query1": "Khombisa ukuthambekela kwemali yami engenayo ngeshadi",
        "query2": "Yimiphi imikhiqizo ethengiswa kakhulu? Faka ishadi",
        "query3": "Dala ishadi lokuthengisa ngokwengxenye yamakhasimende",
        "query4": "Lithini ithrendi lenani lami eli-oda eliphakathi?"
      },
      "customers": {
        "title": "Ukuqonda Kwamakhasimende",
        "query1": "Khombisa amakhasimende ami aphezulu eshadini",
        "query2": "Lithini izinga lami lokugcina amakhasimende? Khombisa njengeshadi lephesenti",
        "query3": "Dala umbono wamakhasimende amasha vs abuyayo",
        "query4": "Yimaphi amakhasimende asengozini? Faka ishadi lokuhlaziya"
      },
      "inventory": {
        "title": "Ukuhlaziya Impahla",
        "query1": "Yimiphi imikhiqizo edinga ukugcwaliswa? Khombisa eshadini",
        "query2": "Bonisa amazinga okuphenduka kwempahla",
        "query3": "Dala ishadi lezinto ezihamba kancane vs ngokushesha",
        "query4": "Khombisa ukuhlukaniswa kwenani lempahla yami yamanje"
      },
      "performance": {
        "title": "Ukusebenza Kwebhizinisi",
        "query1": "Ibhizinisi lami lisebenza kanjani? Faka amashadi",
        "query2": "Qhathanisa le nyanga nenyanga edlule ngemibono",
        "query3": "Khombisa amamajini ami enzuzo eshadini",
        "query4": "Dala umbono wokuhlukaniswa kwezindleko"
      }
    },
    "packages": {
      "starter": {
        "name": "Iphakethe Lokuqala"
      },
      "growth": {
        "name": "Iphakethe Lokukhula"
      },
      "pro": {
        "name": "Uchwepheshe"
      },
      "enterprise": {
        "name": "Ibhizinisi"
      }
    },
    "buyCredits": {
      "title": "Thenga Amakhredithi Okuqonda Okuhlakaniphile",
      "description": "Khetha iphakethe lamakhredithi ukuze uqhubeke usebenzisa Ukuqonda Okuhlakaniphile",
      "bestValue": "Inani Elihle Kakhulu",
      "creditsCount": "Amakhredithi angu-{{count}}",
      "perCredit": "${{price}} ngekhredithi",
      "loadingPackages": "Ilayisha amaphakethe amakhredithi...",
      "cancel": "Khansela",
      "continueToPayment": "Qhubeka Nokukhokha"
    },
    "errors": {
      "noCredits": "Awekho amakhredithi asele. Sicela uthenge amakhredithi amaningi.",
      "initFailed": "Ukuqalisa kuhlulekile. Sicela uvuselele ikhasi.",
      "processingError": "Ngiyaxolisa, ngihlangabezane nephutha lapho ngicubungula isicelo sakho. Sicela uzame futhi.",
      "loadingError": "Iphutha ekulayisheni Ukuqonda Okuhlakaniphile"
    }
  },
  ko: {
    "title": "스마트 인사이트",
    "subtitle": "AI 기반 비즈니스 인텔리전스 어시스턴트",
    "loading": "스마트 인사이트 초기화 중...",
    "popularQueries": "인기 쿼리",
    "credits": {
      "available": "사용 가능한 크레딧",
      "usedThisMonth": "이번 달 사용: {{count}}",
      "buyButton": "크레딧 구매"
    },
    "chat": {
      "startConversation": "대화 시작",
      "askAnything": "비즈니스 데이터에 대해 무엇이든 물어보세요",
      "placeholder": "비즈니스에 대해 물어보세요..."
    },
    "categories": {
      "revenue": {
        "title": "수익 및 판매",
        "query1": "차트로 수익 추세 보기",
        "query2": "어떤 제품이 베스트셀러인가요? 차트 포함",
        "query3": "고객 세그먼트별 판매 차트 생성",
        "query4": "평균 주문 가치 추세는?"
      },
      "customers": {
        "title": "고객 인사이트",
        "query1": "차트에서 상위 고객 표시",
        "query2": "고객 유지율은? 백분율 차트로 표시",
        "query3": "신규 대 재방문 고객 시각화 생성",
        "query4": "위험에 처한 고객은? 분석 차트 포함"
      },
      "inventory": {
        "title": "재고 분석",
        "query1": "재입고가 필요한 제품은? 차트로 표시",
        "query2": "재고 회전율 시각화",
        "query3": "느리게 대 빠르게 움직이는 품목 차트 생성",
        "query4": "현재 재고 가치 분석 표시"
      },
      "performance": {
        "title": "비즈니스 성과",
        "query1": "내 비즈니스 성과는? 차트 포함",
        "query2": "이번 달과 지난 달 시각화로 비교",
        "query3": "차트에서 수익률 표시",
        "query4": "비용 분석 시각화 생성"
      }
    },
    "packages": {
      "starter": {
        "name": "스타터 팩"
      },
      "growth": {
        "name": "성장 팩"
      },
      "pro": {
        "name": "프로페셔널"
      },
      "enterprise": {
        "name": "엔터프라이즈"
      }
    },
    "buyCredits": {
      "title": "스마트 인사이트 크레딧 구매",
      "description": "스마트 인사이트를 계속 사용하려면 크레딧 패키지를 선택하세요",
      "bestValue": "최고 가치",
      "creditsCount": "{{count}} 크레딧",
      "perCredit": "크레딧당 ${{price}}",
      "loadingPackages": "크레딧 패키지 로딩 중...",
      "cancel": "취소",
      "continueToPayment": "결제 진행"
    },
    "errors": {
      "noCredits": "남은 크레딧이 없습니다. 더 많은 크레딧을 구매해주세요.",
      "initFailed": "초기화 실패. 페이지를 새로고침해주세요.",
      "processingError": "죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.",
      "loadingError": "스마트 인사이트 로딩 오류"
    }
  }
};

// Languages array
const languages = ['en', 'es', 'fr', 'pt', 'de', 'zh', 'ar', 'sw', 'hi', 'ru', 'ja', 'tr', 'id', 'vi', 'nl', 'ha', 'yo', 'am', 'zu', 'ko'];

// Add translations to each language file
languages.forEach(lang => {
  if (lang === 'en') return; // Skip English as we already added it manually
  
  const filePath = path.join(__dirname, '..', 'public', 'locales', lang, 'navigation.json');
  
  try {
    // Read existing file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Add Smart Insights translations
    data.smartInsights = smartInsightsTranslations[lang];
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ Added Smart Insights translations to ${lang}/navigation.json`);
  } catch (error) {
    console.error(`❌ Error processing ${lang}/navigation.json:`, error.message);
  }
});

console.log('\n✨ Smart Insights translations added to all language files!');