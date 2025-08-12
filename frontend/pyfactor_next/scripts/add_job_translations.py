#!/usr/bin/env python3
import json
import os
from pathlib import Path

# Define the translations for job features
job_translations = {
    'en': {
        'highlights': {
            'jobs': {
                'title': 'Comprehensive Job Management',
                'description': 'End-to-end job costing from quote to completion. Track materials, labor, and expenses with real-time profitability analysis. Perfect for service businesses, contractors, and field operations with mobile-first design.',
                'imageAlt': 'Job management and costing interface',
                'features': {
                    'jobCosting': 'Real-time job costing',
                    'mobileFieldApp': 'Mobile field app',
                    'materialTracking': 'Material tracking',
                    'timeTracking': 'Auto time tracking',
                    'photoCapture': 'Photo capture',
                    'digitalSignatures': 'Digital signatures',
                    'profitabilityAnalysis': 'Profitability analysis',
                    'offlineSupport': 'Offline support'
                }
            },
            'jobCosting': 'Real-time job costing',
            'mobileFieldApp': 'Mobile field worker app',
            'materialLaborTracking': 'Material & labor tracking'
        },
        'feature': {
            'jobs': 'Job Management & Costing',
            'jobs.description': 'End-to-end project tracking with real-time costing, mobile field app, and profitability analysis'
        }
    },
    'es': {
        'highlights': {
            'jobs': {
                'title': 'Gestión Integral de Trabajos',
                'description': 'Costeo de trabajos de principio a fin desde la cotización hasta la finalización. Rastrea materiales, mano de obra y gastos con análisis de rentabilidad en tiempo real. Perfecto para empresas de servicios, contratistas y operaciones de campo con diseño móvil primero.',
                'imageAlt': 'Interfaz de gestión y costeo de trabajos',
                'features': {
                    'jobCosting': 'Costeo de trabajos en tiempo real',
                    'mobileFieldApp': 'Aplicación móvil de campo',
                    'materialTracking': 'Seguimiento de materiales',
                    'timeTracking': 'Seguimiento automático de tiempo',
                    'photoCapture': 'Captura de fotos',
                    'digitalSignatures': 'Firmas digitales',
                    'profitabilityAnalysis': 'Análisis de rentabilidad',
                    'offlineSupport': 'Soporte sin conexión'
                }
            },
            'jobCosting': 'Costeo de trabajos en tiempo real',
            'mobileFieldApp': 'Aplicación móvil para trabajadores de campo',
            'materialLaborTracking': 'Seguimiento de materiales y mano de obra'
        },
        'feature': {
            'jobs': 'Gestión y Costeo de Trabajos',
            'jobs.description': 'Seguimiento de proyectos de principio a fin con costeo en tiempo real, aplicación móvil de campo y análisis de rentabilidad'
        }
    },
    'fr': {
        'highlights': {
            'jobs': {
                'title': 'Gestion Complète des Chantiers',
                'description': 'Calcul des coûts des chantiers de bout en bout, du devis à l\'achèvement. Suivez les matériaux, la main-d\'œuvre et les dépenses avec une analyse de rentabilité en temps réel. Parfait pour les entreprises de services, les entrepreneurs et les opérations sur le terrain avec une conception mobile-first.',
                'imageAlt': 'Interface de gestion et de calcul des coûts des chantiers',
                'features': {
                    'jobCosting': 'Calcul des coûts en temps réel',
                    'mobileFieldApp': 'Application mobile de terrain',
                    'materialTracking': 'Suivi des matériaux',
                    'timeTracking': 'Suivi automatique du temps',
                    'photoCapture': 'Capture de photos',
                    'digitalSignatures': 'Signatures numériques',
                    'profitabilityAnalysis': 'Analyse de rentabilité',
                    'offlineSupport': 'Support hors ligne'
                }
            },
            'jobCosting': 'Calcul des coûts en temps réel',
            'mobileFieldApp': 'Application mobile pour travailleurs de terrain',
            'materialLaborTracking': 'Suivi des matériaux et de la main-d\'œuvre'
        },
        'feature': {
            'jobs': 'Gestion et Calcul des Coûts des Chantiers',
            'jobs.description': 'Suivi de projet de bout en bout avec calcul des coûts en temps réel, application mobile de terrain et analyse de rentabilité'
        }
    },
    'pt': {
        'highlights': {
            'jobs': {
                'title': 'Gestão Completa de Trabalhos',
                'description': 'Custeio de trabalhos de ponta a ponta, desde o orçamento até a conclusão. Acompanhe materiais, mão de obra e despesas com análise de lucratividade em tempo real. Perfeito para empresas de serviços, empreiteiros e operações de campo com design mobile-first.',
                'imageAlt': 'Interface de gestão e custeio de trabalhos',
                'features': {
                    'jobCosting': 'Custeio de trabalhos em tempo real',
                    'mobileFieldApp': 'Aplicativo móvel de campo',
                    'materialTracking': 'Rastreamento de materiais',
                    'timeTracking': 'Rastreamento automático de tempo',
                    'photoCapture': 'Captura de fotos',
                    'digitalSignatures': 'Assinaturas digitais',
                    'profitabilityAnalysis': 'Análise de lucratividade',
                    'offlineSupport': 'Suporte offline'
                }
            },
            'jobCosting': 'Custeio de trabalhos em tempo real',
            'mobileFieldApp': 'Aplicativo móvel para trabalhadores de campo',
            'materialLaborTracking': 'Rastreamento de materiais e mão de obra'
        },
        'feature': {
            'jobs': 'Gestão e Custeio de Trabalhos',
            'jobs.description': 'Acompanhamento de projetos de ponta a ponta com custeio em tempo real, aplicativo móvel de campo e análise de lucratividade'
        }
    },
    'de': {
        'highlights': {
            'jobs': {
                'title': 'Umfassendes Auftragsmanagement',
                'description': 'End-to-End-Auftragskalkulation vom Angebot bis zur Fertigstellung. Verfolgen Sie Materialien, Arbeitskosten und Ausgaben mit Echtzeit-Rentabilitätsanalyse. Perfekt für Dienstleistungsunternehmen, Auftragnehmer und Außendienstoperationen mit Mobile-First-Design.',
                'imageAlt': 'Schnittstelle für Auftragsmanagement und Kalkulation',
                'features': {
                    'jobCosting': 'Echtzeit-Auftragskalkulation',
                    'mobileFieldApp': 'Mobile Außendienst-App',
                    'materialTracking': 'Materialverfolgung',
                    'timeTracking': 'Automatische Zeiterfassung',
                    'photoCapture': 'Fotoaufnahme',
                    'digitalSignatures': 'Digitale Signaturen',
                    'profitabilityAnalysis': 'Rentabilitätsanalyse',
                    'offlineSupport': 'Offline-Unterstützung'
                }
            },
            'jobCosting': 'Echtzeit-Auftragskalkulation',
            'mobileFieldApp': 'Mobile App für Außendienstmitarbeiter',
            'materialLaborTracking': 'Material- und Arbeitsverfolgung'
        },
        'feature': {
            'jobs': 'Auftragsmanagement & Kalkulation',
            'jobs.description': 'End-to-End-Projektverfolgung mit Echtzeit-Kalkulation, mobiler Außendienst-App und Rentabilitätsanalyse'
        }
    },
    'zh': {
        'highlights': {
            'jobs': {
                'title': '综合作业管理',
                'description': '从报价到完成的端到端作业成本核算。通过实时盈利能力分析跟踪材料、人工和费用。非常适合服务企业、承包商和现场操作，采用移动优先设计。',
                'imageAlt': '作业管理和成本核算界面',
                'features': {
                    'jobCosting': '实时作业成本核算',
                    'mobileFieldApp': '移动现场应用',
                    'materialTracking': '材料跟踪',
                    'timeTracking': '自动时间跟踪',
                    'photoCapture': '照片拍摄',
                    'digitalSignatures': '数字签名',
                    'profitabilityAnalysis': '盈利能力分析',
                    'offlineSupport': '离线支持'
                }
            },
            'jobCosting': '实时作业成本核算',
            'mobileFieldApp': '现场工作人员移动应用',
            'materialLaborTracking': '材料和人工跟踪'
        },
        'feature': {
            'jobs': '作业管理与成本核算',
            'jobs.description': '端到端项目跟踪，具有实时成本核算、移动现场应用和盈利能力分析'
        }
    },
    'ar': {
        'highlights': {
            'jobs': {
                'title': 'إدارة شاملة للمهام',
                'description': 'حساب تكاليف المهام من البداية إلى النهاية من العرض إلى الإنجاز. تتبع المواد والعمالة والمصروفات مع تحليل الربحية في الوقت الفعلي. مثالي لشركات الخدمات والمقاولين والعمليات الميدانية مع تصميم الهاتف المحمول أولاً.',
                'imageAlt': 'واجهة إدارة المهام وحساب التكاليف',
                'features': {
                    'jobCosting': 'حساب تكاليف المهام في الوقت الفعلي',
                    'mobileFieldApp': 'تطبيق ميداني للهاتف المحمول',
                    'materialTracking': 'تتبع المواد',
                    'timeTracking': 'تتبع الوقت التلقائي',
                    'photoCapture': 'التقاط الصور',
                    'digitalSignatures': 'التوقيعات الرقمية',
                    'profitabilityAnalysis': 'تحليل الربحية',
                    'offlineSupport': 'الدعم دون اتصال'
                }
            },
            'jobCosting': 'حساب تكاليف المهام في الوقت الفعلي',
            'mobileFieldApp': 'تطبيق متنقل للعاملين الميدانيين',
            'materialLaborTracking': 'تتبع المواد والعمالة'
        },
        'feature': {
            'jobs': 'إدارة المهام وحساب التكاليف',
            'jobs.description': 'تتبع المشاريع من البداية إلى النهاية مع حساب التكاليف في الوقت الفعلي وتطبيق ميداني للهاتف المحمول وتحليل الربحية'
        }
    },
    'sw': {
        'highlights': {
            'jobs': {
                'title': 'Usimamizi Kamili wa Kazi',
                'description': 'Ukadiriaji wa gharama za kazi kutoka nukuu hadi kukamilika. Fuatilia vifaa, kazi na matumizi kwa uchanganuzi wa faida ya wakati halisi. Kamili kwa biashara za huduma, makandarasi na shughuli za uwandani zenye muundo wa simu ya kwanza.',
                'imageAlt': 'Kiolesura cha usimamizi wa kazi na ukadiriaji wa gharama',
                'features': {
                    'jobCosting': 'Ukadiriaji wa gharama za kazi wakati halisi',
                    'mobileFieldApp': 'Programu ya simu ya uwandani',
                    'materialTracking': 'Ufuatiliaji wa vifaa',
                    'timeTracking': 'Ufuatiliaji wa muda kiotomatiki',
                    'photoCapture': 'Kupiga picha',
                    'digitalSignatures': 'Saini za kidijitali',
                    'profitabilityAnalysis': 'Uchanganuzi wa faida',
                    'offlineSupport': 'Usaidizi nje ya mtandao'
                }
            },
            'jobCosting': 'Ukadiriaji wa gharama za kazi wakati halisi',
            'mobileFieldApp': 'Programu ya simu kwa wafanyakazi wa uwandani',
            'materialLaborTracking': 'Ufuatiliaji wa vifaa na kazi'
        },
        'feature': {
            'jobs': 'Usimamizi wa Kazi na Ukadiriaji wa Gharama',
            'jobs.description': 'Ufuatiliaji wa mradi kutoka mwanzo hadi mwisho na ukadiriaji wa gharama wa wakati halisi, programu ya simu ya uwandani na uchanganuzi wa faida'
        }
    },
    'hi': {
        'highlights': {
            'jobs': {
                'title': 'व्यापक कार्य प्रबंधन',
                'description': 'कोटेशन से पूर्णता तक एंड-टू-एंड जॉब कॉस्टिंग। रीयल-टाइम लाभप्रदता विश्लेषण के साथ सामग्री, श्रम और खर्चों को ट्रैक करें। मोबाइल-फर्स्ट डिज़ाइन के साथ सेवा व्यवसायों, ठेकेदारों और फील्ड ऑपरेशन के लिए बिल्कुल सही।',
                'imageAlt': 'कार्य प्रबंधन और लागत निर्धारण इंटरफ़ेस',
                'features': {
                    'jobCosting': 'रीयल-टाइम जॉब कॉस्टिंग',
                    'mobileFieldApp': 'मोबाइल फील्ड ऐप',
                    'materialTracking': 'सामग्री ट्रैकिंग',
                    'timeTracking': 'ऑटो टाइम ट्रैकिंग',
                    'photoCapture': 'फोटो कैप्चर',
                    'digitalSignatures': 'डिजिटल हस्ताक्षर',
                    'profitabilityAnalysis': 'लाभप्रदता विश्लेषण',
                    'offlineSupport': 'ऑफ़लाइन समर्थन'
                }
            },
            'jobCosting': 'रीयल-टाइम जॉब कॉस्टिंग',
            'mobileFieldApp': 'फील्ड वर्कर्स के लिए मोबाइल ऐप',
            'materialLaborTracking': 'सामग्री और श्रम ट्रैकिंग'
        },
        'feature': {
            'jobs': 'कार्य प्रबंधन और लागत निर्धारण',
            'jobs.description': 'रीयल-टाइम कॉस्टिंग, मोबाइल फील्ड ऐप और लाभप्रदता विश्लेषण के साथ एंड-टू-एंड प्रोजेक्ट ट्रैकिंग'
        }
    },
    'ru': {
        'highlights': {
            'jobs': {
                'title': 'Комплексное управление работами',
                'description': 'Сквозной расчет стоимости работ от предложения до завершения. Отслеживайте материалы, труд и расходы с анализом рентабельности в реальном времени. Идеально подходит для сервисных компаний, подрядчиков и полевых операций с мобильным дизайном.',
                'imageAlt': 'Интерфейс управления работами и расчета стоимости',
                'features': {
                    'jobCosting': 'Расчет стоимости работ в реальном времени',
                    'mobileFieldApp': 'Мобильное полевое приложение',
                    'materialTracking': 'Отслеживание материалов',
                    'timeTracking': 'Автоматическое отслеживание времени',
                    'photoCapture': 'Захват фотографий',
                    'digitalSignatures': 'Цифровые подписи',
                    'profitabilityAnalysis': 'Анализ рентабельности',
                    'offlineSupport': 'Поддержка офлайн'
                }
            },
            'jobCosting': 'Расчет стоимости работ в реальном времени',
            'mobileFieldApp': 'Мобильное приложение для полевых работников',
            'materialLaborTracking': 'Отслеживание материалов и труда'
        },
        'feature': {
            'jobs': 'Управление работами и расчет стоимости',
            'jobs.description': 'Сквозное отслеживание проектов с расчетом стоимости в реальном времени, мобильным полевым приложением и анализом рентабельности'
        }
    },
    'ja': {
        'highlights': {
            'jobs': {
                'title': '包括的な作業管理',
                'description': '見積もりから完了までのエンドツーエンドの作業原価計算。リアルタイムの収益性分析で材料、労働、経費を追跡します。モバイルファーストデザインのサービス事業、請負業者、現場作業に最適です。',
                'imageAlt': '作業管理と原価計算のインターフェース',
                'features': {
                    'jobCosting': 'リアルタイムの作業原価計算',
                    'mobileFieldApp': 'モバイルフィールドアプリ',
                    'materialTracking': '材料追跡',
                    'timeTracking': '自動時間追跡',
                    'photoCapture': '写真撮影',
                    'digitalSignatures': 'デジタル署名',
                    'profitabilityAnalysis': '収益性分析',
                    'offlineSupport': 'オフラインサポート'
                }
            },
            'jobCosting': 'リアルタイムの作業原価計算',
            'mobileFieldApp': 'フィールドワーカー向けモバイルアプリ',
            'materialLaborTracking': '材料と労働の追跡'
        },
        'feature': {
            'jobs': '作業管理と原価計算',
            'jobs.description': 'リアルタイムの原価計算、モバイルフィールドアプリ、収益性分析を備えたエンドツーエンドのプロジェクト追跡'
        }
    },
    'tr': {
        'highlights': {
            'jobs': {
                'title': 'Kapsamlı İş Yönetimi',
                'description': 'Tekliften tamamlanmaya kadar uçtan uca iş maliyetlendirmesi. Gerçek zamanlı kârlılık analiziyle malzemeleri, işçiliği ve giderleri takip edin. Mobil öncelikli tasarımla hizmet işletmeleri, müteahhitler ve saha operasyonları için mükemmel.',
                'imageAlt': 'İş yönetimi ve maliyetlendirme arayüzü',
                'features': {
                    'jobCosting': 'Gerçek zamanlı iş maliyetlendirmesi',
                    'mobileFieldApp': 'Mobil saha uygulaması',
                    'materialTracking': 'Malzeme takibi',
                    'timeTracking': 'Otomatik zaman takibi',
                    'photoCapture': 'Fotoğraf çekimi',
                    'digitalSignatures': 'Dijital imzalar',
                    'profitabilityAnalysis': 'Kârlılık analizi',
                    'offlineSupport': 'Çevrimdışı destek'
                }
            },
            'jobCosting': 'Gerçek zamanlı iş maliyetlendirmesi',
            'mobileFieldApp': 'Saha çalışanları için mobil uygulama',
            'materialLaborTracking': 'Malzeme ve işçilik takibi'
        },
        'feature': {
            'jobs': 'İş Yönetimi ve Maliyetlendirme',
            'jobs.description': 'Gerçek zamanlı maliyetlendirme, mobil saha uygulaması ve kârlılık analiziyle uçtan uca proje takibi'
        }
    },
    'id': {
        'highlights': {
            'jobs': {
                'title': 'Manajemen Pekerjaan Komprehensif',
                'description': 'Perhitungan biaya pekerjaan end-to-end dari penawaran hingga penyelesaian. Lacak bahan, tenaga kerja, dan pengeluaran dengan analisis profitabilitas real-time. Sempurna untuk bisnis layanan, kontraktor, dan operasi lapangan dengan desain mobile-first.',
                'imageAlt': 'Antarmuka manajemen pekerjaan dan perhitungan biaya',
                'features': {
                    'jobCosting': 'Perhitungan biaya pekerjaan real-time',
                    'mobileFieldApp': 'Aplikasi lapangan mobile',
                    'materialTracking': 'Pelacakan material',
                    'timeTracking': 'Pelacakan waktu otomatis',
                    'photoCapture': 'Pengambilan foto',
                    'digitalSignatures': 'Tanda tangan digital',
                    'profitabilityAnalysis': 'Analisis profitabilitas',
                    'offlineSupport': 'Dukungan offline'
                }
            },
            'jobCosting': 'Perhitungan biaya pekerjaan real-time',
            'mobileFieldApp': 'Aplikasi mobile untuk pekerja lapangan',
            'materialLaborTracking': 'Pelacakan material dan tenaga kerja'
        },
        'feature': {
            'jobs': 'Manajemen Pekerjaan & Perhitungan Biaya',
            'jobs.description': 'Pelacakan proyek end-to-end dengan perhitungan biaya real-time, aplikasi lapangan mobile, dan analisis profitabilitas'
        }
    },
    'vi': {
        'highlights': {
            'jobs': {
                'title': 'Quản lý Công việc Toàn diện',
                'description': 'Tính chi phí công việc từ đầu đến cuối từ báo giá đến hoàn thành. Theo dõi vật liệu, lao động và chi phí với phân tích lợi nhuận thời gian thực. Hoàn hảo cho doanh nghiệp dịch vụ, nhà thầu và hoạt động thực địa với thiết kế ưu tiên di động.',
                'imageAlt': 'Giao diện quản lý công việc và tính chi phí',
                'features': {
                    'jobCosting': 'Tính chi phí công việc thời gian thực',
                    'mobileFieldApp': 'Ứng dụng di động thực địa',
                    'materialTracking': 'Theo dõi vật liệu',
                    'timeTracking': 'Theo dõi thời gian tự động',
                    'photoCapture': 'Chụp ảnh',
                    'digitalSignatures': 'Chữ ký số',
                    'profitabilityAnalysis': 'Phân tích lợi nhuận',
                    'offlineSupport': 'Hỗ trợ ngoại tuyến'
                }
            },
            'jobCosting': 'Tính chi phí công việc thời gian thực',
            'mobileFieldApp': 'Ứng dụng di động cho nhân viên thực địa',
            'materialLaborTracking': 'Theo dõi vật liệu và lao động'
        },
        'feature': {
            'jobs': 'Quản lý Công việc & Tính Chi phí',
            'jobs.description': 'Theo dõi dự án từ đầu đến cuối với tính chi phí thời gian thực, ứng dụng di động thực địa và phân tích lợi nhuận'
        }
    },
    'nl': {
        'highlights': {
            'jobs': {
                'title': 'Uitgebreid Opdrachtenbeher',
                'description': 'End-to-end opdrachtkostenberekening van offerte tot voltooiing. Volg materialen, arbeid en uitgaven met realtime winstgevendheidsanalyse. Perfect voor dienstverlenende bedrijven, aannemers en veldoperaties met mobile-first ontwerp.',
                'imageAlt': 'Interface voor opdrachtbeheer en kostenberekening',
                'features': {
                    'jobCosting': 'Realtime opdrachtkostenberekening',
                    'mobileFieldApp': 'Mobiele veld-app',
                    'materialTracking': 'Materiaaltracking',
                    'timeTracking': 'Automatische tijdregistratie',
                    'photoCapture': 'Foto vastleggen',
                    'digitalSignatures': 'Digitale handtekeningen',
                    'profitabilityAnalysis': 'Winstgevendheidsanalyse',
                    'offlineSupport': 'Offline ondersteuning'
                }
            },
            'jobCosting': 'Realtime opdrachtkostenberekening',
            'mobileFieldApp': 'Mobiele app voor veldmedewerkers',
            'materialLaborTracking': 'Materiaal- en arbeidstracking'
        },
        'feature': {
            'jobs': 'Opdrachtbeheer & Kostenberekening',
            'jobs.description': 'End-to-end projecttracking met realtime kostenberekening, mobiele veld-app en winstgevendheidsanalyse'
        }
    },
    'ha': {
        'highlights': {
            'jobs': {
                'title': 'Cikakken Gudanar da Ayyuka',
                'description': 'Ƙididdigar farashin aiki daga farko zuwa ƙarshe daga farashi zuwa kammalawa. Bi diddigin kayayyaki, aiki da kashe kuɗi tare da nazarin riba na ainihin lokaci. Cikakke don kasuwancin sabis, \'yan kwangila da ayyukan filin tare da ƙirar wayar hannu ta farko.',
                'imageAlt': 'Gudanar da ayyuka da tsarin ƙididdige farashi',
                'features': {
                    'jobCosting': 'Ƙididdigar farashin aiki na ainihin lokaci',
                    'mobileFieldApp': 'Aikace-aikacen filin wayar hannu',
                    'materialTracking': 'Bin diddigin kayayyaki',
                    'timeTracking': 'Bin diddigin lokaci ta atomatik',
                    'photoCapture': 'Ɗaukar hoto',
                    'digitalSignatures': 'Sa hannun dijital',
                    'profitabilityAnalysis': 'Nazarin riba',
                    'offlineSupport': 'Tallafin rashin layi'
                }
            },
            'jobCosting': 'Ƙididdigar farashin aiki na ainihin lokaci',
            'mobileFieldApp': 'Aikace-aikacen wayar hannu don ma\'aikatan filin',
            'materialLaborTracking': 'Bin diddigin kayayyaki da aiki'
        },
        'feature': {
            'jobs': 'Gudanar da Ayyuka & Ƙididdigar Farashi',
            'jobs.description': 'Bin diddigin aikin farko zuwa ƙarshe tare da ƙididdige farashi na ainihin lokaci, aikace-aikacen filin wayar hannu da nazarin riba'
        }
    },
    'yo': {
        'highlights': {
            'jobs': {
                'title': 'Iṣakoso Iṣẹ Okeerẹ',
                'description': 'Iṣiro iye owo iṣẹ lati ibẹrẹ si ipari lati iye owo si ipari. Tọpa awọn ohun elo, iṣẹ ati awọn inawo pẹlu itupalẹ ere ni akoko gidi. Pipe fun awọn iṣowo iṣẹ, awọn alagbaṣe ati awọn iṣẹ aaye pẹlu apẹrẹ alagbeka akọkọ.',
                'imageAlt': 'Ni wiwo iṣakoso iṣẹ ati iṣiro iye owo',
                'features': {
                    'jobCosting': 'Iṣiro iye owo iṣẹ ni akoko gidi',
                    'mobileFieldApp': 'Ohun elo aaye alagbeka',
                    'materialTracking': 'Titọpa ohun elo',
                    'timeTracking': 'Titọpa akoko laifọwọyi',
                    'photoCapture': 'Yiya aworan',
                    'digitalSignatures': 'Awọn ibuwọlu oni-nọmba',
                    'profitabilityAnalysis': 'Itupalẹ ere',
                    'offlineSupport': 'Atilẹyin aisinipo'
                }
            },
            'jobCosting': 'Iṣiro iye owo iṣẹ ni akoko gidi',
            'mobileFieldApp': 'Ohun elo alagbeka fun awọn oṣiṣẹ aaye',
            'materialLaborTracking': 'Titọpa ohun elo ati iṣẹ'
        },
        'feature': {
            'jobs': 'Iṣakoso Iṣẹ & Iṣiro Iye owo',
            'jobs.description': 'Titọpa iṣẹ akanṣe lati ibẹrẹ si ipari pẹlu iṣiro iye owo ni akoko gidi, ohun elo aaye alagbeka ati itupalẹ ere'
        }
    },
    'am': {
        'highlights': {
            'jobs': {
                'title': 'ሁሉን አቀፍ የሥራ አስተዳደር',
                'description': 'ከዋጋ ጥቅስ እስከ ማጠናቀቅ ድረስ ከጫፍ እስከ ጫፍ የሥራ ወጪ ስሌት። በእውነተኛ ጊዜ ትርፋማነት ትንተና ቁሳቁሶችን፣ ጉልበትን እና ወጪዎችን ይከታተሉ። ለአገልግሎት ንግዶች፣ ኮንትራክተሮች እና የመስክ ስራዎች ከሞባይል-መጀመሪያ ዲዛይን ጋር ፍጹም።',
                'imageAlt': 'የሥራ አስተዳደር እና ወጪ ስሌት መገናኛ',
                'features': {
                    'jobCosting': 'የእውነተኛ ጊዜ የሥራ ወጪ ስሌት',
                    'mobileFieldApp': 'የሞባይል መስክ መተግበሪያ',
                    'materialTracking': 'የቁሳቁስ መከታተል',
                    'timeTracking': 'አውቶማቲክ ጊዜ መከታተል',
                    'photoCapture': 'ፎቶ ማንሳት',
                    'digitalSignatures': 'ዲጂታል ፊርማዎች',
                    'profitabilityAnalysis': 'የትርፋማነት ትንተና',
                    'offlineSupport': 'ከመስመር ውጭ ድጋፍ'
                }
            },
            'jobCosting': 'የእውነተኛ ጊዜ የሥራ ወጪ ስሌት',
            'mobileFieldApp': 'ለመስክ ሠራተኞች የሞባይል መተግበሪያ',
            'materialLaborTracking': 'የቁሳቁስ እና የጉልበት መከታተል'
        },
        'feature': {
            'jobs': 'የሥራ አስተዳደር እና ወጪ ስሌት',
            'jobs.description': 'ከጫፍ እስከ ጫፍ ፕሮጀክት መከታተል ከእውነተኛ ጊዜ ወጪ ስሌት፣ የሞባይል መስክ መተግበሪያ እና የትርፋማነት ትንተና ጋር'
        }
    },
    'zu': {
        'highlights': {
            'jobs': {
                'title': 'Ukuphathwa Kwemisebenzi Okuphelele',
                'description': 'Ukubala izindleko zomsebenzi kusuka ekuqaleni kuze kube sekugcineni kusuka esilinganisweni kuze kube sekuphothulweni. Landelela izinto zokusebenza, abasebenzi nezindleko ngokuhlaziya inzuzo yesikhathi sangempela. Kulungele amabhizinisi ezinsiza, osonkontileka kanye nokusebenza kwenkundla nokuklama kokuqala kweselula.',
                'imageAlt': 'Isikhombimsebenzisi sokuphatha umsebenzi nokubala izindleko',
                'features': {
                    'jobCosting': 'Ukubala izindleko zomsebenzi zesikhathi sangempela',
                    'mobileFieldApp': 'Uhlelo lokusebenza lwenkundla yeselula',
                    'materialTracking': 'Ukulandelela izinto zokusebenza',
                    'timeTracking': 'Ukulandelela isikhathi ngokuzenzakalelayo',
                    'photoCapture': 'Ukuthatha isithombe',
                    'digitalSignatures': 'Amasignesha edijithali',
                    'profitabilityAnalysis': 'Ukuhlaziya inzuzo',
                    'offlineSupport': 'Ukusekela ngaphandle kwe-inthanethi'
                }
            },
            'jobCosting': 'Ukubala izindleko zomsebenzi zesikhathi sangempela',
            'mobileFieldApp': 'Uhlelo lokusebenza lweselula labasebenzi benkundla',
            'materialLaborTracking': 'Ukulandelela izinto zokusebenza nabasebenzi'
        },
        'feature': {
            'jobs': 'Ukuphathwa Kwemisebenzi Nokubala Izindleko',
            'jobs.description': 'Ukulandelela iphrojekthi kusuka ekuqaleni kuze kube sekugcineni ngokubala izindleko zesikhathi sangempela, uhlelo lokusebenza lwenkundla yeselula nokuhlaziya inzuzo'
        }
    },
    'ko': {
        'highlights': {
            'jobs': {
                'title': '포괄적인 작업 관리',
                'description': '견적부터 완료까지 전체 작업 원가 계산. 실시간 수익성 분석으로 자재, 노동력 및 비용을 추적합니다. 모바일 우선 디자인으로 서비스 비즈니스, 계약업체 및 현장 운영에 완벽합니다.',
                'imageAlt': '작업 관리 및 원가 계산 인터페이스',
                'features': {
                    'jobCosting': '실시간 작업 원가 계산',
                    'mobileFieldApp': '모바일 현장 앱',
                    'materialTracking': '자재 추적',
                    'timeTracking': '자동 시간 추적',
                    'photoCapture': '사진 캡처',
                    'digitalSignatures': '디지털 서명',
                    'profitabilityAnalysis': '수익성 분석',
                    'offlineSupport': '오프라인 지원'
                }
            },
            'jobCosting': '실시간 작업 원가 계산',
            'mobileFieldApp': '현장 작업자를 위한 모바일 앱',
            'materialLaborTracking': '자재 및 노동력 추적'
        },
        'feature': {
            'jobs': '작업 관리 및 원가 계산',
            'jobs.description': '실시간 원가 계산, 모바일 현장 앱 및 수익성 분석을 통한 전체 프로젝트 추적'
        }
    }
}

def update_language_file(lang_code, translations):
    """Update a specific language file with job translations"""
    file_path = Path(f'/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales/{lang_code}/common.json')
    
    try:
        # Read existing file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Merge new translations
        if 'highlights' not in data:
            data['highlights'] = {}
        if 'feature' not in data:
            data['feature'] = {}
            
        # Update highlights
        data['highlights'].update(translations['highlights'])
        
        # Update features
        data['feature'].update(translations['feature'])
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Updated {lang_code}/common.json")
        
    except Exception as e:
        print(f"❌ Error updating {lang_code}: {e}")

# Update all language files
for lang_code, translations in job_translations.items():
    update_language_file(lang_code, translations)

print("\n✨ Job translations added to all language files!")