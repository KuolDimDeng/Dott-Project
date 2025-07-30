import fs from 'fs';
import path from 'path';

const languages = ['it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'];

const highlightsTranslations = {
  it: {
    "highlights": {
      "eyebrow": "Vantaggi Chiave",
      "heading": "Perché le aziende scelgono Dott",
      "subheading": "Funzionalità avanzate che ci distinguono dalla concorrenza e aiutano la tua azienda a crescere.",
      "learnMore": "Scopri di più",
      "features": {
        "label": "Caratteristiche principali:"
      },
      "mobile": {
        "title": "Applicazione Mobile",
        "description": "Accedi ai dati della tua azienda sempre e ovunque con la nostra potente app mobile. Gestisci inventario, elabora vendite e visualizza report in tempo reale ovunque tu sia.",
        "imageAlt": "Screenshot dell'applicazione mobile"
      },
      "pos": {
        "title": "POS e Scansione Codici a Barre",
        "description": "Trasforma qualsiasi dispositivo in un potente sistema di punto vendita. Scansiona codici a barre istantaneamente, elabora vendite velocemente, monitora l'inventario in tempo reale e accetta tutti i metodi di pagamento inclusi contanti, carte e mobile money.",
        "imageAlt": "Sistema POS con funzione di scansione codici a barre",
        "features": {
          "quickCheckout": "Checkout veloce",
          "barcodeScanning": "Scansione codici a barre",
          "allPaymentTypes": "Tutti i tipi di pagamento",
          "inventoryTracking": "Monitoraggio inventario",
          "offlineMode": "Modalità offline",
          "mobileReady": "Pronto per mobile"
        }
      },
      "ai": {
        "title": "Approfondimenti Basati su AI",
        "description": "Ottieni raccomandazioni intelligenti e analisi predittive basate sui dati della tua azienda. La nostra AI ti aiuta a prevedere la domanda, ottimizzare l'inventario e identificare opportunità di crescita.",
        "imageAlt": "Screenshot del dashboard di analisi AI"
      },
      "jobs": {
        "title": "Gestione Lavori Completa",
        "description": "Calcolo costi end-to-end dal preventivo al completamento. Monitora materiali, manodopera e spese con analisi di redditività in tempo reale. Perfetto per aziende di servizi, appaltatori e operazioni sul campo con design mobile-first.",
        "imageAlt": "Interfaccia di gestione e calcolo costi lavori",
        "features": {
          "jobCosting": "Calcolo costi lavori in tempo reale",
          "mobileFieldApp": "App mobile per operatori",
          "materialTracking": "Monitoraggio materiali",
          "timeTracking": "Monitoraggio tempo automatico",
          "photoCapture": "Cattura foto",
          "digitalSignatures": "Firme digitali",
          "profitabilityAnalysis": "Analisi redditività",
          "offlineSupport": "Supporto offline"
        }
      },
      "geofencing": {
        "title": "Geofencing e Monitoraggio Posizione",
        "description": "Garantisci il monitoraggio accurato del tempo con clock in/out basato su GPS. Perfetto per team sul campo, autisti delle consegne e lavoratori remoti. Imposta confini virtuali per i siti di lavoro e ricevi avvisi quando i dipendenti entrano o escono dalle aree designate.",
        "imageAlt": "Interfaccia di geofencing e monitoraggio posizione",
        "features": {
          "gpsClockInOut": "Clock in/out GPS",
          "virtualBoundaries": "Confini virtuali",
          "realTimeAlerts": "Avvisi in tempo reale",
          "automatedTimesheets": "Timesheet automatizzati",
          "complianceReady": "Pronto per conformità",
          "teamManagement": "Gestione team"
        }
      },
      "mobilemoney": {
        "title": "Pagamenti Mobile Money",
        "description": "Accetta pagamenti da qualsiasi parte del mondo. L'integrazione M-Pesa è attiva in Kenya, con MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix e Mercado Pago in arrivo. Raggiungi miliardi di clienti che preferiscono il mobile money rispetto al banking tradizionale.",
        "imageAlt": "Opzioni di pagamento mobile money",
        "available": "Metodi di pagamento:",
        "live": "Ora Disponibile:",
        "coming": "Prossimamente:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "Trasforma la comunicazione con i clienti con l'integrazione WhatsApp Business. Crea e gestisci il tuo catalogo prodotti, invia automaticamente fatture e ricevute, fornisci supporto clienti istantaneo e raggiungi i clienti sulla loro piattaforma di messaggistica preferita.",
        "imageAlt": "Interfaccia di integrazione WhatsApp Business"
      },
      "languages": {
        "title": "30+ Lingue Supportate",
        "description": "Raggiungi i clienti e gestisci la tua azienda nella tua lingua preferita. Dall'inglese al swahili, dallo spagnolo al mandarino, supportiamo oltre 30 lingue per rendere Dott accessibile alle aziende di tutto il mondo.",
        "imageAlt": "Dimostrazione interfaccia multilingue",
        "availableIn": "Disponibile in:"
      }
    }
  },
  pl: {
    "highlights": {
      "eyebrow": "Kluczowe Korzyści",
      "heading": "Dlaczego firmy wybierają Dott",
      "subheading": "Zaawansowane funkcje, które wyróżniają nas od konkurencji i pomagają Twojej firmie rosnąć.",
      "learnMore": "Dowiedz się więcej",
      "features": {
        "label": "Kluczowe funkcje:"
      },
      "mobile": {
        "title": "Aplikacja Mobilna",
        "description": "Uzyskaj dostęp do danych swojej firmy zawsze i wszędzie dzięki naszej potężnej aplikacji mobilnej. Zarządzaj zapasami, przetwarzaj sprzedaż i przeglądaj raporty w czasie rzeczywistym w podróży.",
        "imageAlt": "Zrzut ekranu aplikacji mobilnej"
      },
      "pos": {
        "title": "POS i Skanowanie Kodów Kreskowych",
        "description": "Przekształć dowolne urządzenie w potężny system punktu sprzedaży. Skanuj kody kreskowe natychmiast, przetwarzaj sprzedaż szybko, śledź zapasy w czasie rzeczywistym i akceptuj wszystkie metody płatności, w tym gotówkę, karty i mobile money.",
        "imageAlt": "System POS z funkcją skanowania kodów kreskowych",
        "features": {
          "quickCheckout": "Szybka kasa",
          "barcodeScanning": "Skanowanie kodów kreskowych",
          "allPaymentTypes": "Wszystkie typy płatności",
          "inventoryTracking": "Śledzenie zapasów",
          "offlineMode": "Tryb offline",
          "mobileReady": "Gotowy na mobile"
        }
      },
      "ai": {
        "title": "Wglądy Oparte na AI",
        "description": "Otrzymuj inteligentne rekomendacje i analizy predykcyjne oparte na danych Twojej firmy. Nasza AI pomaga przewidywać popyt, optymalizować zapasy i identyfikować możliwości wzrostu.",
        "imageAlt": "Zrzut ekranu pulpitu analityki AI"
      },
      "jobs": {
        "title": "Kompleksowe Zarządzanie Zleceniami",
        "description": "Kompleksowe wyceny od oferty do ukończenia. Śledź materiały, robociznę i wydatki z analizą rentowności w czasie rzeczywistym. Idealne dla firm usługowych, wykonawców i operacji terenowych z designem mobile-first.",
        "imageAlt": "Interfejs zarządzania i wyceny zleceń",
        "features": {
          "jobCosting": "Wycena zleceń w czasie rzeczywistym",
          "mobileFieldApp": "Aplikacja mobilna dla pracowników terenowych",
          "materialTracking": "Śledzenie materiałów",
          "timeTracking": "Automatyczne śledzenie czasu",
          "photoCapture": "Przechwytywanie zdjęć",
          "digitalSignatures": "Podpisy cyfrowe",
          "profitabilityAnalysis": "Analiza rentowności",
          "offlineSupport": "Wsparcie offline"
        }
      },
      "geofencing": {
        "title": "Geofencing i Śledzenie Lokalizacji",
        "description": "Zapewnij dokładne śledzenie czasu z wejściem/wyjściem opartym na GPS. Idealne dla zespołów terenowych, kierowców dostaw i pracowników zdalnych. Ustaw wirtualne granice dla miejsc pracy i otrzymuj alerty, gdy pracownicy wchodzą lub opuszczają wyznaczone obszary.",
        "imageAlt": "Interfejs geofencing i śledzenia lokalizacji",
        "features": {
          "gpsClockInOut": "Wejście/wyjście GPS",
          "virtualBoundaries": "Wirtualne granice",
          "realTimeAlerts": "Alerty w czasie rzeczywistym",
          "automatedTimesheets": "Zautomatyzowane karty czasu pracy",
          "complianceReady": "Gotowy na zgodność",
          "teamManagement": "Zarządzanie zespołem"
        }
      },
      "mobilemoney": {
        "title": "Płatności Mobile Money",
        "description": "Akceptuj płatności z dowolnego miejsca na świecie. Integracja M-Pesa jest aktywna w Kenii, a MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix i Mercado Pago już wkrótce. Docieraj do miliardów klientów, którzy preferują mobile money od tradycyjnej bankowości.",
        "imageAlt": "Opcje płatności mobile money",
        "available": "Metody płatności:",
        "live": "Teraz Dostępne:",
        "coming": "Wkrótce:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "Przekształć komunikację z klientami dzięki integracji WhatsApp Business. Twórz i zarządzaj katalogiem produktów, automatycznie wysyłaj faktury i paragony, zapewniaj natychmiastowe wsparcie klientów i docieraj do klientów na ich preferowanej platformie komunikacyjnej.",
        "imageAlt": "Interfejs integracji WhatsApp Business"
      },
      "languages": {
        "title": "30+ Obsługiwanych Języków",
        "description": "Docieraj do klientów i zarządzaj firmą w preferowanym języku. Od angielskiego po suahili, od hiszpańskiego po mandaryński, obsługujemy ponad 30 języków, aby uczynić Dott dostępnym dla firm na całym świecie.",
        "imageAlt": "Demonstracja wielojęzycznego interfejsu",
        "availableIn": "Dostępne w:"
      }
    }
  },
  th: {
    "highlights": {
      "eyebrow": "ประโยชน์หลัก",
      "heading": "ทำไมธุรกิจถึงเลือก Dott",
      "subheading": "คุณสมบัติขั้นสูงที่ทำให้เราแตกต่างจากคู่แข่งและช่วยให้ธุรกิจของคุณเติบโต",
      "learnMore": "เรียนรู้เพิ่มเติม",
      "features": {
        "label": "คุณสมบัติหลัก:"
      },
      "mobile": {
        "title": "แอปพลิเคชันมือถือ",
        "description": "เข้าถึงข้อมูลธุรกิจของคุณได้ทุกที่ทุกเวลาด้วยแอปมือถือที่ทรงพลังของเรา จัดการสินค้าคงคลัง ประมวลผลการขาย และดูรายงานแบบเรียลไทม์ได้ขณะเดินทาง",
        "imageAlt": "ภาพหน้าจอแอปพลิเคชันมือถือ"
      },
      "pos": {
        "title": "POS และการสแกนบาร์โค้ด",
        "description": "เปลี่ยนอุปกรณ์ใดก็ได้ให้เป็นระบบจุดขายที่ทรงพลัง สแกนบาร์โค้ดได้ทันที ประมวลผลการขายอย่างรวดเร็ว ติดตามสินค้าคงคลังแบบเรียลไทม์ และรับการชำระเงินทุกรูปแบบรวมถึงเงินสด บัตร และ mobile money",
        "imageAlt": "ระบบ POS พร้อมฟีเจอร์สแกนบาร์โค้ด",
        "features": {
          "quickCheckout": "เช็คเอาท์รวดเร็ว",
          "barcodeScanning": "สแกนบาร์โค้ด",
          "allPaymentTypes": "การชำระเงินทุกประเภท",
          "inventoryTracking": "ติดตามสินค้าคงคลัง",
          "offlineMode": "โหมดออฟไลน์",
          "mobileReady": "พร้อมใช้บนมือถือ"
        }
      },
      "ai": {
        "title": "ข้อมูลเชิงลึกขับเคลื่อนด้วย AI",
        "description": "รับคำแนะนำอันชาญฉลาดและการวิเคราะห์เชิงคาดการณ์ที่อิงจากข้อมูลธุรกิจของคุณ AI ของเราช่วยคุณคาดการณ์ความต้องการ เพิ่มประสิทธิภาพสินค้าคงคลัง และระบุโอกาสการเติบโต",
        "imageAlt": "ภาพหน้าจอแดชบอร์ดการวิเคราะห์ AI"
      },
      "jobs": {
        "title": "การจัดการงานแบบครบวงจร",
        "description": "การคำนวณต้นทุนจากการเสนอราคาจนถึงการเสร็จสิ้น ติดตามวัสดุ แรงงาน และค่าใช้จ่ายพร้อมการวิเคราะห์ผลกำไรแบบเรียลไทม์ เหมาะสำหรับธุรกิจบริการ ผู้รับเหมา และการดำเนินงานภาคสนามด้วยการออกแบบ mobile-first",
        "imageAlt": "อินเทอร์เฟซการจัดการงานและการคำนวณต้นทุน",
        "features": {
          "jobCosting": "คำนวณต้นทุนงานแบบเรียลไทม์",
          "mobileFieldApp": "แอปมือถือสำหรับพนักงานภาคสนาม",
          "materialTracking": "ติดตามวัสดุ",
          "timeTracking": "ติดตามเวลาอัตโนมัติ",
          "photoCapture": "บันทึกภาพ",
          "digitalSignatures": "ลายเซ็นดิจิทัล",
          "profitabilityAnalysis": "การวิเคราะห์ผลกำไร",
          "offlineSupport": "รองรับการใช้งานออฟไลน์"
        }
      },
      "geofencing": {
        "title": "Geofencing และการติดตามตำแหน่ง",
        "description": "รับประกันการติดตามเวลาที่แม่นยำด้วยการเข้า/ออกงานที่ใช้ GPS เหมาะสำหรับทีมภาคสนาม คนขับส่งของ และพนักงานระยะไกล ตั้งค่าขอบเขตเสมือนสำหรับสถานที่ทำงานและรับการแจ้งเตือนเมื่อพนักงานเข้าหรือออกจากพื้นที่ที่กำหนด",
        "imageAlt": "อินเทอร์เฟซ geofencing และการติดตามตำแหน่ง",
        "features": {
          "gpsClockInOut": "เข้า/ออกงาน GPS",
          "virtualBoundaries": "ขอบเขตเสมือน",
          "realTimeAlerts": "การแจ้งเตือนแบบเรียลไทม์",
          "automatedTimesheets": "ใบลงเวลาอัตโนมัติ",
          "complianceReady": "พร้อมสำหรับการปฏิบัติตามกฎระเบียบ",
          "teamManagement": "การจัดการทีม"
        }
      },
      "mobilemoney": {
        "title": "การชำระเงิน Mobile Money",
        "description": "รับการชำระเงินจากทุกที่ในโลก การผสานรวม M-Pesa ใช้งานได้แล้วในเคนยา โดยมี MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix และ Mercado Pago กำลังจะมาเร็วๆ นี้ เข้าถึงลูกค้าหลายพันล้านคนที่ชอบ mobile money มากกว่าธนาคารแบบดั้งเดิม",
        "imageAlt": "ตัวเลือกการชำระเงิน mobile money",
        "available": "วิธีการชำระเงิน:",
        "live": "ใช้งานได้แล้ว:",
        "coming": "กำลังจะมา:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "เปลี่ยนแปลงการสื่อสารกับลูกค้าด้วยการผสานรวม WhatsApp Business สร้างและจัดการแค็ตตาล็อกผลิตภัณฑ์ของคุณ ส่งใบแจ้งหนี้และใบเสร็จโดยอัตโนมัติ ให้การสนับสนุนลูกค้าทันที และเข้าถึงลูกค้าบนแพลตฟอร์มข้อความที่พวกเขาชอบ",
        "imageAlt": "อินเทอร์เฟซการผสานรวม WhatsApp Business"
      },
      "languages": {
        "title": "รองรับ 30+ ภาษา",
        "description": "เข้าถึงลูกค้าและจัดการธุรกิจในภาษาที่คุณชอบ จากภาษาอังกฤษถึงสวาฮีลี จากสเปนถึงจีนกลาง เรารองรับกว่า 30 ภาษาเพื่อทำให้ Dott เข้าถึงได้สำหรับธุรกิจทั่วโลก",
        "imageAlt": "การสาธิตอินเทอร์เฟซหลายภาษา",
        "availableIn": "มีให้บริการใน:"
      }
    }
  },
  bn: {
    "highlights": {
      "eyebrow": "মূল সুবিধা",
      "heading": "কেন ব্যবসাগুলি Dott বেছে নেয়",
      "subheading": "উন্নত বৈশিষ্ট্য যা আমাদের প্রতিযোগিতা থেকে আলাদা করে এবং আপনার ব্যবসাকে বৃদ্ধি পেতে সাহায্য করে।",
      "learnMore": "আরও জানুন",
      "features": {
        "label": "মূল বৈশিষ্ট্য:"
      },
      "mobile": {
        "title": "মোবাইল অ্যাপ্লিকেশন",
        "description": "আমাদের শক্তিশালী মোবাইল অ্যাপের সাথে যেকোনো সময় যেকোনো জায়গায় আপনার ব্যবসায়িক ডেটা অ্যাক্সেস করুন। চলার পথে ইনভেন্টরি পরিচালনা করুন, বিক্রয় প্রক্রিয়া করুন এবং রিয়েল-টাইম রিপোর্ট দেখুন।",
        "imageAlt": "মোবাইল অ্যাপ্লিকেশনের স্ক্রিনশট"
      },
      "pos": {
        "title": "POS এবং বারকোড স্ক্যানিং",
        "description": "যেকোনো ডিভাইসকে একটি শক্তিশালী পয়েন্ট-অফ-সেল সিস্টেমে রূপান্তর করুন। তাৎক্ষণিকভাবে বারকোড স্ক্যান করুন, দ্রুত বিক্রয় প্রক্রিয়া করুন, রিয়েল-টাইমে ইনভেন্টরি ট্র্যাক করুন এবং নগদ, কার্ড এবং মোবাইল মানি সহ সমস্ত পেমেন্ট পদ্ধতি গ্রহণ করুন।",
        "imageAlt": "বারকোড স্ক্যানিং বৈশিষ্ট্য সহ POS সিস্টেম",
        "features": {
          "quickCheckout": "দ্রুত চেকআউট",
          "barcodeScanning": "বারকোড স্ক্যানিং",
          "allPaymentTypes": "সমস্ত পেমেন্ট ধরনের",
          "inventoryTracking": "ইনভেন্টরি ট্র্যাকিং",
          "offlineMode": "অফলাইন মোড",
          "mobileReady": "মোবাইল প্রস্তুত"
        }
      },
      "ai": {
        "title": "AI-চালিত অন্তর্দৃষ্টি",
        "description": "আপনার ব্যবসায়িক ডেটার উপর ভিত্তি করে স্মার্ট সুপারিশ এবং ভবিষ্যদ্বাণীমূলক বিশ্লেষণ পান। আমাদের AI আপনাকে চাহিদা পূর্বাভাস দিতে, ইনভেন্টরি অপ্টিমাইজ করতে এবং বৃদ্ধির সুযোগ চিহ্নিত করতে সাহায্য করে।",
        "imageAlt": "AI অ্যানালিটিক্স ড্যাশবোর্ডের স্ক্রিনশট"
      },
      "jobs": {
        "title": "ব্যাপক কাজ ব্যবস্থাপনা",
        "description": "উদ্ধৃতি থেকে সমাপ্তি পর্যন্ত এন্ড-টু-এন্ড কাজের খরচ। রিয়েল-টাইম লাভজনকতা বিশ্লেষণের সাথে উপকরণ, শ্রম এবং খরচ ট্র্যাক করুন। মোবাইল-ফার্স্ট ডিজাইনের সাথে সেবা ব্যবসা, ঠিকাদার এবং ফিল্ড অপারেশনের জন্য নিখুঁত।",
        "imageAlt": "কাজ ব্যবস্থাপনা এবং খরচ ইন্টারফেস",
        "features": {
          "jobCosting": "রিয়েল-টাইম কাজের খরচ",
          "mobileFieldApp": "ফিল্ড কর্মীদের জন্য মোবাইল অ্যাপ",
          "materialTracking": "উপাদান ট্র্যাকিং",
          "timeTracking": "স্বয়ংক্রিয় সময় ট্র্যাকিং",
          "photoCapture": "ছবি ক্যাপচার",
          "digitalSignatures": "ডিজিটাল স্বাক্ষর",
          "profitabilityAnalysis": "লাভজনকতা বিশ্লেষণ",
          "offlineSupport": "অফলাইন সহায়তা"
        }
      },
      "geofencing": {
        "title": "জিওফেন্সিং ও অবস্থান ট্র্যাকিং",
        "description": "GPS-ভিত্তিক ক্লক ইন/আউটের সাথে নির্ভুল সময় ট্র্যাকিং নিশ্চিত করুন। ফিল্ড টিম, ডেলিভারি ড্রাইভার এবং দূরবর্তী কর্মীদের জন্য নিখুঁত। কাজের সাইটের জন্য ভার্চুয়াল সীমানা সেট করুন এবং কর্মচারীরা নির্ধারিত এলাকায় প্রবেশ বা ছেড়ে গেলে সতর্কতা পান।",
        "imageAlt": "জিওফেন্সিং এবং অবস্থান ট্র্যাকিং ইন্টারফেস",
        "features": {
          "gpsClockInOut": "GPS ক্লক ইন/আউট",
          "virtualBoundaries": "ভার্চুয়াল সীমানা",
          "realTimeAlerts": "রিয়েল-টাইম সতর্কতা",
          "automatedTimesheets": "স্বয়ংক্রিয় টাইমশিট",
          "complianceReady": "কমপ্লায়েন্স প্রস্তুত",
          "teamManagement": "টিম ব্যবস্থাপনা"
        }
      },
      "mobilemoney": {
        "title": "মোবাইল মানি পেমেন্ট",
        "description": "বিশ্বের যেকোনো জায়গা থেকে পেমেন্ট গ্রহণ করুন। M-Pesa একীকরণ কেনিয়ায় লাইভ, MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix এবং Mercado Pago শীঘ্রই আসছে। ঐতিহ্যবাহী ব্যাংকিংয়ের চেয়ে মোবাইল মানি পছন্দ করে এমন বিলিয়ন গ্রাহকদের কাছে পৌঁছান।",
        "imageAlt": "মোবাইল মানি পেমেন্ট বিকল্প",
        "available": "পেমেন্ট পদ্ধতি:",
        "live": "এখন উপলব্ধ:",
        "coming": "শীঘ্রই আসছে:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "WhatsApp Business একীকরণের সাথে গ্রাহক যোগাযোগ রূপান্তর করুন। আপনার পণ্য ক্যাটালগ তৈরি এবং পরিচালনা করুন, স্বয়ংক্রিয়ভাবে চালান এবং রসিদ পাঠান, তাৎক্ষণিক গ্রাহক সহায়তা প্রদান করুন এবং তাদের পছন্দের মেসেজিং প্ল্যাটফর্মে গ্রাহকদের কাছে পৌঁছান।",
        "imageAlt": "WhatsApp Business একীকরণ ইন্টারফেস"
      },
      "languages": {
        "title": "30+ ভাষা সমর্থিত",
        "description": "আপনার পছন্দের ভাষায় গ্রাহকদের কাছে পৌঁছান এবং আপনার ব্যবসা পরিচালনা করুন। ইংরেজি থেকে সোয়াহিলি, স্প্যানিশ থেকে ম্যান্ডারিন, আমরা 30 টিরও বেশি ভাষা সমর্থন করি বিশ্বব্যাপী ব্যবসার কাছে Dott অ্যাক্সেসযোগ্য করতে।",
        "imageAlt": "বহুভাষিক ইন্টারফেস প্রদর্শন",
        "availableIn": "এতে উপলব্ধ:"
      }
    }
  },
  ur: {
    "highlights": {
      "eyebrow": "کلیدی فوائد",
      "heading": "کیوں کاروبار Dott کا انتخاب کرتے ہیں",
      "subheading": "جدید خصوصیات جو ہمیں مقابلے سے الگ کرتی ہیں اور آپ کے کاروبار کو بڑھنے میں مدد کرتی ہیں۔",
      "learnMore": "مزید جانیں",
      "features": {
        "label": "کلیدی خصوصیات:"
      },
      "mobile": {
        "title": "موبائل ایپلیکیشن",
        "description": "ہماری طاقتور موبائل ایپ کے ساتھ کہیں بھی کسی بھی وقت اپنے کاروباری ڈیٹا تک رسائی حاصل کریں۔ سفر میں انوینٹری کا انتظام کریں، فروخت پر عمل کریں اور ریئل ٹائم رپورٹس دیکھیں۔",
        "imageAlt": "موبائل ایپلیکیشن کا اسکرین شاٹ"
      },
      "pos": {
        "title": "POS اور بارکوڈ اسکیننگ",
        "description": "کسی بھی ڈیوائس کو طاقتور پوائنٹ آف سیل سسٹم میں تبدیل کریں۔ فوری طور پر بارکوڈ اسکین کریں، فروخت کو تیزی سے پروسیس کریں، ریئل ٹائم میں انوینٹری کو ٹریک کریں اور نقد، کارڈ اور موبائل منی سمیت تمام ادائیگی کے طریقے قبول کریں۔",
        "imageAlt": "بارکوڈ اسکیننگ فیچر کے ساتھ POS سسٹم",
        "features": {
          "quickCheckout": "فوری چیک آؤٹ",
          "barcodeScanning": "بارکوڈ اسکیننگ",
          "allPaymentTypes": "تمام ادائیگی کی اقسام",
          "inventoryTracking": "انوینٹری ٹریکنگ",
          "offlineMode": "آف لائن موڈ",
          "mobileReady": "موبائل ریڈی"
        }
      },
      "ai": {
        "title": "AI پر مبنی بصیرت",
        "description": "اپنے کاروباری ڈیٹا کی بنیاد پر ذہین سفارشات اور پیشن گوئی کا تجزیہ حاصل کریں۔ ہماری AI آپ کو مانگ کا پیشن گوئی کرنے، انوینٹری کو بہتر بنانے اور ترقی کے مواقع کی شناخت کرنے میں مدد کرتی ہے۔",
        "imageAlt": "AI تجزیات ڈیش بورڈ کا اسکرین شاٹ"
      },
      "jobs": {
        "title": "جامع ملازمت کا انتظام",
        "description": "قیمت سے تکمیل تک مکمل ملازمت کی لاگت۔ ریئل ٹائم منافع کے تجزیے کے ساتھ مواد، محنت اور اخراجات کو ٹریک کریں۔ موبائل فرسٹ ڈیزائن کے ساتھ سروس کاروبار، ٹھیکیداروں اور فیلڈ آپریشنز کے لیے بہترین۔",
        "imageAlt": "ملازمت کا انتظام اور لاگت کا انٹرفیس",
        "features": {
          "jobCosting": "ریئل ٹائم ملازمت کی لاگت",
          "mobileFieldApp": "فیلڈ ورکرز کے لیے موبائل ایپ",
          "materialTracking": "مواد کی ٹریکنگ",
          "timeTracking": "خودکار وقت کی ٹریکنگ",
          "photoCapture": "تصویر کیپچر",
          "digitalSignatures": "ڈیجیٹل دستخط",
          "profitabilityAnalysis": "منافع کا تجزیہ",
          "offlineSupport": "آف لائن سپورٹ"
        }
      },
      "geofencing": {
        "title": "جیو فینسنگ اور مقام کی ٹریکنگ",
        "description": "GPS پر مبنی کلاک ان/آؤٹ کے ساتھ درست وقت کی ٹریکنگ کو یقینی بنائیں۔ فیلڈ ٹیمز، ڈیلیوری ڈرائیورز اور ریموٹ ورکرز کے لیے بہترین۔ کام کی جگہوں کے لیے ورچوئل باؤنڈریز سیٹ کریں اور جب ملازمین مخصوص علاقوں میں داخل یا باہر نکلیں تو الرٹ حاصل کریں۔",
        "imageAlt": "جیو فینسنگ اور مقام کی ٹریکنگ انٹرفیس",
        "features": {
          "gpsClockInOut": "GPS کلاک ان/آؤٹ",
          "virtualBoundaries": "ورچوئل باؤنڈریز",
          "realTimeAlerts": "ریئل ٹائم الرٹس",
          "automatedTimesheets": "خودکار ٹائم شیٹس",
          "complianceReady": "کمپلائنس ریڈی",
          "teamManagement": "ٹیم کا انتظام"
        }
      },
      "mobilemoney": {
        "title": "موبائل منی پیمنٹس",
        "description": "دنیا میں کہیں سے بھی ادائیگیاں قبول کریں۔ M-Pesa انٹیگریشن کینیا میں لائیو ہے، MTN Mobile Money، Airtel Money، Orange Money، GCash، Paytm، Pix اور Mercado Pago جلد آ رہے ہیں۔ اربوں گاہکوں تک پہنچیں جو روایتی بینکنگ کے بجائے موبائل منی کو ترجیح دیتے ہیں۔",
        "imageAlt": "موبائل منی پیمنٹ کے اختیارات",
        "available": "ادائیگی کے طریقے:",
        "live": "اب دستیاب:",
        "coming": "جلد آ رہا ہے:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "WhatsApp Business انٹیگریشن کے ساتھ کسٹمر کمیونیکیشن کو تبدیل کریں۔ اپنا پروڈکٹ کیٹالاگ بنائیں اور منظم کریں، خودکار طور پر انوائسز اور رسیدیں بھیجیں، فوری کسٹمر سپورٹ فراہم کریں اور اپنے ترجیحی میسجنگ پلیٹفارم پر گاہکوں تک پہنچیں۔",
        "imageAlt": "WhatsApp Business انٹیگریشن انٹرفیس"
      },
      "languages": {
        "title": "30+ زبانوں کی سپورٹ",
        "description": "اپنی ترجیحی زبان میں گاہکوں تک پہنچیں اور اپنا کاروبار چلائیں۔ انگریزی سے سواحلی تک، ہسپانوی سے مینڈارن تک، ہم 30 سے زیادہ زبانوں کی سپورٹ کرتے ہیں تاکہ Dott کو دنیا بھر کے کاروباروں کے لیے قابل رسائی بنایا جا سکے۔",
        "imageAlt": "کثیر لسانی انٹرفیس کا مظاہرہ",
        "availableIn": "دستیاب:"
      }
    }
  },
  tl: {
    "highlights": {
      "eyebrow": "Mga Pangunahing Benepisyo",
      "heading": "Bakit pinipili ng mga negosyo ang Dott",
      "subheading": "Mga advanced na feature na nagiging kaibahan namin sa kompetensya at tumutulong sa inyong business na lumago.",
      "learnMore": "Matuto pa",
      "features": {
        "label": "Mga pangunahing feature:"
      },
      "mobile": {
        "title": "Mobile Application",
        "description": "I-access ang inyong business data kahit saan at kahit kailan gamit ang aming powerful na mobile app. Pamahalaan ang inventory, mag-process ng sales, at tingnan ang real-time reports habang naglalakbay.",
        "imageAlt": "Screenshot ng mobile application"
      },
      "pos": {
        "title": "POS at Barcode Scanning",
        "description": "Gawing powerful na point-of-sale system ang kahit anong device. Mag-scan ng barcode nang mabilis, mag-process ng sales nang mabilis, i-track ang inventory sa real-time, at tanggapin ang lahat ng paraan ng pagbabayad kabilang ang cash, cards, at mobile money.",
        "imageAlt": "POS system na may barcode scanning feature",
        "features": {
          "quickCheckout": "Mabilis na checkout",
          "barcodeScanning": "Barcode scanning",
          "allPaymentTypes": "Lahat ng uri ng pagbabayad",
          "inventoryTracking": "Inventory tracking",
          "offlineMode": "Offline mode",
          "mobileReady": "Mobile ready"
        }
      },
      "ai": {
        "title": "AI-Powered na Insights",
        "description": "Makakuha ng mga smart na rekomendasyon at predictive analytics batay sa inyong business data. Tumutulong ang aming AI na mag-forecast ng demand, i-optimize ang inventory, at i-identify ang mga opportunity para sa paglago.",
        "imageAlt": "Screenshot ng AI analytics dashboard"
      },
      "jobs": {
        "title": "Comprehensive na Job Management",
        "description": "End-to-end na job costing mula sa quote hanggang completion. I-track ang materials, labor, at expenses na may real-time profitability analysis. Perfect para sa service businesses, contractors, at field operations na may mobile-first design.",
        "imageAlt": "Job management at costing interface",
        "features": {
          "jobCosting": "Real-time na job costing",
          "mobileFieldApp": "Mobile app para sa field workers",
          "materialTracking": "Material tracking",
          "timeTracking": "Automatic time tracking",
          "photoCapture": "Photo capture",
          "digitalSignatures": "Digital signatures",
          "profitabilityAnalysis": "Profitability analysis",
          "offlineSupport": "Offline support"
        }
      },
      "geofencing": {
        "title": "Geofencing at Location Tracking",
        "description": "Siguruhin ang tumpak na time tracking gamit ang GPS-based na clock in/out. Perfect para sa field teams, delivery drivers, at remote workers. Mag-set up ng virtual boundaries para sa work sites at makakuha ng alerts kapag pumasok o lumabas ang mga empleyado sa designated areas.",
        "imageAlt": "Geofencing at location tracking interface",
        "features": {
          "gpsClockInOut": "GPS clock in/out",
          "virtualBoundaries": "Virtual boundaries",
          "realTimeAlerts": "Real-time alerts",
          "automatedTimesheets": "Automated timesheets",
          "complianceReady": "Compliance ready",
          "teamManagement": "Team management"
        }
      },
      "mobilemoney": {
        "title": "Mobile Money Payments",
        "description": "Tanggapin ang mga bayad mula saanmang parte ng mundo. Live na ang M-Pesa integration sa Kenya, at paparating na ang MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix, at Mercado Pago. Maabot ang bilyun-bilyong customer na mas gusto ang mobile money kaysa traditional banking.",
        "imageAlt": "Mobile money payment options",
        "available": "Mga paraan ng pagbabayad:",
        "live": "Available Na Ngayon:",
        "coming": "Paparating Na:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "I-transform ang customer communication gamit ang WhatsApp Business integration. Gumawa at pamahalaan ang inyong product catalog, automatic na magpadala ng invoices at receipts, magbigay ng instant customer support, at maabot ang mga customer sa kanilang preferred messaging platform.",
        "imageAlt": "WhatsApp Business integration interface"
      },
      "languages": {
        "title": "30+ na Suportadong Wika",
        "description": "Maabot ang mga customer at pamahalaan ang inyong business sa inyong preferred na wika. Mula sa English hanggang Swahili, Spanish hanggang Mandarin, sinusuportahan namin ang mahigit 30 wika para gawing accessible ang Dott sa mga business worldwide.",
        "imageAlt": "Multi-language interface demonstration",
        "availableIn": "Available sa:"
      }
    }
  },
  uk: {
    "highlights": {
      "eyebrow": "Ключові Переваги",
      "heading": "Чому бізнеси обирають Dott",
      "subheading": "Передові функції, які відрізняють нас від конкурентів і допомагають вашому бізнесу рости.",
      "learnMore": "Дізнатися більше",
      "features": {
        "label": "Ключові функції:"
      },
      "mobile": {
        "title": "Мобільний Додаток",
        "description": "Отримуйте доступ до ваших бізнес-даних завжди і скрізь з нашим потужним мобільним додатком. Керуйте інвентарем, обробляйте продажі та переглядайте звіти в реальному часі на ходу.",
        "imageAlt": "Скріншот мобільного додатку"
      },
      "pos": {
        "title": "POS та Сканування Штрих-кодів",
        "description": "Перетворіть будь-який пристрій на потужну систему точки продажу. Миттєво скануйте штрих-коди, швидко обробляйте продажі, відстежуйте інвентар в реальному часі та приймайте всі способи оплати, включаючи готівку, карти та мобільні гроші.",
        "imageAlt": "POS система з функцією сканування штрих-кодів",
        "features": {
          "quickCheckout": "Швидкий розрахунок",
          "barcodeScanning": "Сканування штрих-кодів",
          "allPaymentTypes": "Всі типи платежів",
          "inventoryTracking": "Відстеження інвентаря",
          "offlineMode": "Офлайн режим",
          "mobileReady": "Готовий для мобільних"
        }
      },
      "ai": {
        "title": "Аналітика на основі ШІ",
        "description": "Отримуйте розумні рекомендації та прогнозну аналітику на основі ваших бізнес-даних. Наш ШІ допомагає прогнозувати попит, оптимізувати інвентар і виявляти можливості для зростання.",
        "imageAlt": "Скріншот панелі аналітики ШІ"
      },
      "jobs": {
        "title": "Комплексне Управління Роботами",
        "description": "Наскрізний розрахунок вартості робіт від пропозиції до завершення. Відстежуйте матеріали, трудовитрати та витрати з аналізом прибутковості в реальному часі. Ідеально підходить для сервісних підприємств, підрядників та польових операцій з мобільним дизайном.",
        "imageAlt": "Інтерфейс управління роботами та розрахунку вартості",
        "features": {
          "jobCosting": "Розрахунок вартості робіт в реальному часі",
          "mobileFieldApp": "Мобільний додаток для польових працівників",
          "materialTracking": "Відстеження матеріалів",
          "timeTracking": "Автоматичне відстеження часу",
          "photoCapture": "Захоплення фото",
          "digitalSignatures": "Цифрові підписи",
          "profitabilityAnalysis": "Аналіз прибутковості",
          "offlineSupport": "Офлайн підтримка"
        }
      },
      "geofencing": {
        "title": "Геофенсинг та Відстеження Місцезнаходження",
        "description": "Забезпечте точне відстеження часу з відмічанням входу/виходу на основі GPS. Ідеально підходить для польових команд, водіїв доставки та віддалених працівників. Встановлюйте віртуальні межі для робочих майданчиків та отримуйте сповіщення, коли співробітники входять або залишають призначені зони.",
        "imageAlt": "Інтерфейс геофенсингу та відстеження місцезнаходження",
        "features": {
          "gpsClockInOut": "GPS відмічання входу/виходу",
          "virtualBoundaries": "Віртуальні межі",
          "realTimeAlerts": "Сповіщення в реальному часі",
          "automatedTimesheets": "Автоматизовані табелі",
          "complianceReady": "Готовий до відповідності",
          "teamManagement": "Управління командою"
        }
      },
      "mobilemoney": {
        "title": "Платежі через Мобільні Гроші",
        "description": "Приймайте платежі з будь-якої точки світу. Інтеграція M-Pesa працює в Кенії, незабаром з'являться MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix та Mercado Pago. Досягніть мільярдів клієнтів, які надають перевагу мобільним грошам над традиційним банкінгом.",
        "imageAlt": "Варіанти платежів через мобільні гроші",
        "available": "Способи оплати:",
        "live": "Зараз Доступно:",
        "coming": "Незабаром:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "Трансформуйте спілкування з клієнтами за допомогою інтеграції WhatsApp Business. Створюйте та керуйте каталогом товарів, автоматично надсилайте рахунки та квитанції, надавайте миттєву підтримку клієнтів та досягайте клієнтів на їхній улюбленій платформі обміну повідомленнями.",
        "imageAlt": "Інтерфейс інтеграції WhatsApp Business"
      },
      "languages": {
        "title": "Підтримка 30+ Мов",
        "description": "Досягайте клієнтів та керуйте своїм бізнесом вашою улюбленою мовою. Від англійської до суахілі, від іспанської до китайської, ми підтримуємо понад 30 мов, щоб зробити Dott доступним для бізнесу по всьому світу.",
        "imageAlt": "Демонстрація багатомовного інтерфейсу",
        "availableIn": "Доступно мовами:"
      }
    }
  },
  fa: {
    "highlights": {
      "eyebrow": "مزایای کلیدی",
      "heading": "چرا کسب‌وکارها Dott را انتخاب می‌کنند",
      "subheading": "ویژگی‌های پیشرفته‌ای که ما را از رقبا متمایز می‌کند و به رشد کسب‌وکار شما کمک می‌کند.",
      "learnMore": "بیشتر بدانید",
      "features": {
        "label": "ویژگی‌های کلیدی:"
      },
      "mobile": {
        "title": "اپلیکیشن موبایل",
        "description": "با اپ قدرتمند موبایل ما هر زمان و هر جا به داده‌های کسب‌وکارتان دسترسی داشته باشید. موجودی را مدیریت کنید، فروش را پردازش کنید و گزارش‌های زمان واقعی را در حین حرکت مشاهده کنید.",
        "imageAlt": "اسکرین‌شات اپلیکیشن موبایل"
      },
      "pos": {
        "title": "POS و اسکن بارکد",
        "description": "هر دستگاهی را به سیستم فروش قدرتمند تبدیل کنید. فوراً بارکد اسکن کنید، فروش را سریع پردازش کنید، موجودی را در زمان واقعی پیگیری کنید و تمام روش‌های پرداخت از جمله نقد، کارت و پول موبایل را بپذیرید.",
        "imageAlt": "سیستم POS با قابلیت اسکن بارکد",
        "features": {
          "quickCheckout": "تسویه سریع",
          "barcodeScanning": "اسکن بارکد",
          "allPaymentTypes": "تمام انواع پرداخت",
          "inventoryTracking": "پیگیری موجودی",
          "offlineMode": "حالت آفلاین",
          "mobileReady": "آماده موبایل"
        }
      },
      "ai": {
        "title": "بینش‌های مبتنی بر هوش مصنوعی",
        "description": "توصیه‌های هوشمند و تحلیل‌های پیش‌بینانه بر اساس داده‌های کسب‌وکارتان دریافت کنید. هوش مصنوعی ما به شما کمک می‌کند تقاضا را پیش‌بینی کنید، موجودی را بهینه کنید و فرصت‌های رشد را شناسایی کنید.",
        "imageAlt": "اسکرین‌شات داشبورد تحلیل هوش مصنوعی"
      },
      "jobs": {
        "title": "مدیریت جامع پروژه‌ها",
        "description": "هزینه‌یابی سرتاسری پروژه از قیمت‌گذاری تا تکمیل. مواد، نیروی کار و هزینه‌ها را با تحلیل سودآوری در زمان واقعی پیگیری کنید. برای کسب‌وکارهای خدماتی، پیمانکاران و عملیات میدانی با طراحی موبایل‌محور مناسب است.",
        "imageAlt": "رابط مدیریت پروژه و هزینه‌یابی",
        "features": {
          "jobCosting": "هزینه‌یابی پروژه در زمان واقعی",
          "mobileFieldApp": "اپ موبایل برای کارگران میدانی",
          "materialTracking": "پیگیری مواد",
          "timeTracking": "پیگیری خودکار زمان",
          "photoCapture": "ضبط عکس",
          "digitalSignatures": "امضای دیجیتال",
          "profitabilityAnalysis": "تحلیل سودآوری",
          "offlineSupport": "پشتیبانی آفلاین"
        }
      },
      "geofencing": {
        "title": "محدودسازی جغرافیایی و پیگیری موقعیت",
        "description": "پیگیری دقیق زمان را با ورود/خروج مبتنی بر GPS تضمین کنید. برای تیم‌های میدانی، راننده‌های تحویل و کارگران از راه دور مناسب است. مرزهای مجازی برای سایت‌های کاری تعیین کنید و هنگام ورود یا خروج کارمندان از نواحی تعیین‌شده هشدار دریافت کنید.",
        "imageAlt": "رابط محدودسازی جغرافیایی و پیگیری موقعیت",
        "features": {
          "gpsClockInOut": "ورود/خروج GPS",
          "virtualBoundaries": "مرزهای مجازی",
          "realTimeAlerts": "هشدارهای زمان واقعی",
          "automatedTimesheets": "کارکردهای خودکار",
          "complianceReady": "آماده انطباق",
          "teamManagement": "مدیریت تیم"
        }
      },
      "mobilemoney": {
        "title": "پرداخت‌های پول موبایل",
        "description": "از هر نقطه‌ای از جهان پرداخت دریافت کنید. ادغام M-Pesa در کنیا فعال است و MTN Mobile Money، Airtel Money، Orange Money، GCash، Paytm، Pix و Mercado Pago به زودی می‌آیند. به میلیاردها مشتری که پول موبایل را به بانکداری سنتی ترجیح می‌دهند دسترسی پیدا کنید.",
        "imageAlt": "گزینه‌های پرداخت پول موبایل",
        "available": "روش‌های پرداخت:",
        "live": "اکنون در دسترس:",
        "coming": "به زودی:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "ارتباط با مشتریان را با ادغام WhatsApp Business متحول کنید. کاتالوگ محصولات خود را ایجاد و مدیریت کنید، به طور خودکار فاکتورها و رسیدها را ارسال کنید، پشتیبانی فوری مشتریان ارائه دهید و در پلتفرم پیام‌رسان مورد علاقه آن‌ها به مشتریان دسترسی پیدا کنید.",
        "imageAlt": "رابط ادغام WhatsApp Business"
      },
      "languages": {
        "title": "پشتیبانی از بیش از 30 زبان",
        "description": "به زبان مورد علاقه خود به مشتریان دسترسی پیدا کنید و کسب‌وکارتان را مدیریت کنید. از انگلیسی تا سواحیلی، از اسپانیایی تا چینی، ما از بیش از 30 زبان پشتیبانی می‌کنیم تا Dott را برای کسب‌وکارها در سراسر جهان در دسترس قرار دهیم.",
        "imageAlt": "نمایش رابط چندزبانه",
        "availableIn": "در دسترس به زبان‌های:"
      }
    }
  },
  sn: {
    "highlights": {
      "eyebrow": "Zvakakosha",
      "heading": "Nei mabhizinesi achisarudza Dott",
      "subheading": "Advanced features inoita kuti tive vakasiyana nevamwe uye inobatsira bhizinesi rako kukura.",
      "learnMore": "Dzidza zvimwe",
      "features": {
        "label": "Zvakakosha:"
      },
      "mobile": {
        "title": "Mobile Application",
        "description": "Wana data yebhizinesi rako chero nguva uye chero kupi neapp yedu ine simba. Manage inventory, process sales, uye uone real-time reports paunofamba.",
        "imageAlt": "Screenshot ye mobile application"
      },
      "pos": {
        "title": "POS ne Barcode Scanning",
        "description": "Shandura chero device kuve powerful point-of-sale system. Scan barcode pakarepo, process sales nekukurumidza, track inventory mu real-time, uye gamuchira ese mazhinji ekubhadhara kusanganisira mari, makadhi, ne mobile money.",
        "imageAlt": "POS system ine barcode scanning feature",
        "features": {
          "quickCheckout": "Quick checkout",
          "barcodeScanning": "Barcode scanning",
          "allPaymentTypes": "Ese marudzi ekubhadhara",
          "inventoryTracking": "Inventory tracking",
          "offlineMode": "Offline mode",
          "mobileReady": "Mobile ready"
        }
      },
      "ai": {
        "title": "AI-Powered Insights",
        "description": "Wana smart recommendations ne predictive analytics zvichibva ku data yebhizinesi rako. AI yedu inokubatsira kufunga demand, optimize inventory, uye identify mikana yekukura.",
        "imageAlt": "Screenshot ye AI analytics dashboard"
      },
      "jobs": {
        "title": "Comprehensive Job Management",
        "description": "End-to-end job costing kubva ku quote kusvika pakupera. Track zvinhu, basa, ne maexpenses ine real-time profitability analysis. Yakanakira service businesses, contractors, ne field operations ine mobile-first design.",
        "imageAlt": "Job management ne costing interface",
        "features": {
          "jobCosting": "Real-time job costing",
          "mobileFieldApp": "Mobile app yevashandi vemu field",
          "materialTracking": "Material tracking",
          "timeTracking": "Automatic time tracking",
          "photoCapture": "Photo capture",
          "digitalSignatures": "Digital signatures",
          "profitabilityAnalysis": "Profitability analysis",
          "offlineSupport": "Offline support"
        }
      },
      "geofencing": {
        "title": "Geofencing ne Location Tracking",
        "description": "Vimbisa accurate time tracking ne GPS-based clock in/out. Yakanakira field teams, delivery drivers, ne remote workers. Set virtual boundaries ye work sites uye wana alerts kana vashandi vapinda kana vabuda munzvimbo dzakatsaurwa.",
        "imageAlt": "Geofencing ne location tracking interface",
        "features": {
          "gpsClockInOut": "GPS clock in/out",
          "virtualBoundaries": "Virtual boundaries",
          "realTimeAlerts": "Real-time alerts",
          "automatedTimesheets": "Automated timesheets",
          "complianceReady": "Compliance ready",
          "teamManagement": "Team management"
        }
      },
      "mobilemoney": {
        "title": "Mobile Money Payments",
        "description": "Gamuchira mabhadharo kubva chero kupi munyika. M-Pesa integration iri live muKenya, uye MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix, ne Mercado Pago zvirikuuya. Svika kumabhiriyoni evatengi vanofarira mobile money pane traditional banking.",
        "imageAlt": "Mobile money payment options",
        "available": "Nzira dzekubhadhara:",
        "live": "Zviripo Zvino:",
        "coming": "Zvirikuuya:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "Shandura kutaurirana nevatengi ne WhatsApp Business integration. Gadzira uye manage product catalog yako, otomatiki tuma ma invoices ne receipts, ipa instant customer support, uye svika kuvatengi pa messaging platform yavakafarira.",
        "imageAlt": "WhatsApp Business integration interface"
      },
      "languages": {
        "title": "30+ Mitauro Inotsigirwa",
        "description": "Svika kuvatengi uye manage bhizinesi rako nemutauro waunofarira. Kubva kuChirungu kusvika kuSwahili, kuSpanish kusvika kuMandarin, tinotsigira mitauro inopfuura 30 kuita kuti Dott iwane kuma businesses munyika yose.",
        "imageAlt": "Multi-language interface demonstration",
        "availableIn": "Inowanikwa mu:"
      }
    }
  },
  ig: {
    "highlights": {
      "eyebrow": "Uru Ndi Isi",
      "heading": "Gịnị mere ndị azụmahịa ji họrọ Dott",
      "subheading": "Njirimara dị elu nke na-eme ka anyị dị iche n'etiti ndị asọmpi ma na-enyere azụmahịa gị aka ịbawanye.",
      "learnMore": "Mụtakwuo",
      "features": {
        "label": "Njirimara isi:"
      },
      "mobile": {
        "title": "Ngwa Mkpanaka",
        "description": "Nweta data azụmahịa gị mgbe ọ bụla na ebe ọ bụla site na ngwa mkpanaka anyị dị ike. Jikwaa ngwongwo, hazie ahịa, ma hụ akụkọ oge dị ugbu a mgbe ị na-aga.",
        "imageAlt": "Foto ngwa mkpanaka"
      },
      "pos": {
        "title": "POS na Nyocha Barcode",
        "description": "Gbanwee ngwaọrụ ọ bụla ka ọ bụrụ sistemụ ire ahịa dị ike. Nyochaa barcode ozugbo, hazie ahịa ngwa ngwa, soro ngwongwo n'oge dị ugbu a, ma nabata ụzọ ịkwụ ụgwọ niile gụnyere ego, kaadị, na ego mkpanaka.",
        "imageAlt": "Sistemụ POS nwere njirimara nyocha barcode",
        "features": {
          "quickCheckout": "Nkwụghachi ngwa ngwa",
          "barcodeScanning": "Nyocha barcode",
          "allPaymentTypes": "Ụdị nkwụghachi niile",
          "inventoryTracking": "Nsochi ngwongwo",
          "offlineMode": "Ọnọdụ na-adịghị n'ịntanetị",
          "mobileReady": "Njikere mkpanaka"
        }
      },
      "ai": {
        "title": "Nghọta AI",
        "description": "Nweta ndụmọdụ amamihe na nyocha amụma dabere na data azụmahịa gị. AI anyị na-enyere gị aka ịkọ ihe achọrọ, meziwanye ngwongwo, ma chọpụta ohere maka uto.",
        "imageAlt": "Foto dashboard nyocha AI"
      },
      "jobs": {
        "title": "Njikwa Ọrụ Zuru Ezu",
        "description": "Ọnụahịa ọrụ site na quote ruo n'ọgwụgwụ. Soro ihe, ọrụ, na mmefu ego na nyocha uru n'oge dị ugbu a. Dị mma maka azụmahịa ọrụ, ndị na-arụ ọrụ, na ọrụ ọhịa nwere nhazi mkpanaka mbụ.",
        "imageAlt": "Njikwa ọrụ na interface ọnụahịa",
        "features": {
          "jobCosting": "Ọnụahịa ọrụ n'oge dị ugbu a",
          "mobileFieldApp": "Ngwa mkpanaka maka ndị ọrụ ọhịa",
          "materialTracking": "Nsochi ihe",
          "timeTracking": "Nsochi oge akpaghị aka",
          "photoCapture": "Njide foto",
          "digitalSignatures": "Mbinye aka dijitalụ",
          "profitabilityAnalysis": "Nyocha uru",
          "offlineSupport": "Nkwado na-adịghị n'ịntanetị"
        }
      },
      "geofencing": {
        "title": "Geofencing na Nsochi Ebe",
        "description": "Gbaa nsochi oge ziri ezi na GPS clock in/out. Dị mma maka ndị otu ọhịa, ndị ọkwọ ụgbọala nnyefe, na ndị ọrụ dị anya. Tọọ oke mpaghara maka saịtị ọrụ ma nweta mkpesa mgbe ndị ọrụ batara ma ọ bụ pụọ na mpaghara ahọpụtara.",
        "imageAlt": "Geofencing na interface nsochi ebe",
        "features": {
          "gpsClockInOut": "GPS clock in/out",
          "virtualBoundaries": "Oke mpaghara",
          "realTimeAlerts": "Mkpesa oge dị ugbu a",
          "automatedTimesheets": "Akwụkwọ oge akpaghị aka",
          "complianceReady": "Njikere nrube isi",
          "teamManagement": "Njikwa otu"
        }
      },
      "mobilemoney": {
        "title": "Nkwụghachi Ego Mkpanaka",
        "description": "Nabata nkwụghachi site n'akụkụ ọ bụla nke ụwa. Njikọta M-Pesa na-arụ ọrụ na Kenya, na MTN Mobile Money, Airtel Money, Orange Money, GCash, Paytm, Pix, na Mercado Pago na-abịa. Ruo ọtụtụ ijeri ndị ahịa na-ahọrọ ego mkpanaka karịa ụlọ akụ omenala.",
        "imageAlt": "Nhọrọ nkwụghachi ego mkpanaka",
        "available": "Ụzọ ịkwụ ụgwọ:",
        "live": "Dị Ugbu a:",
        "coming": "Na-abịa:"
      },
      "whatsapp": {
        "title": "WhatsApp Business",
        "description": "Gbanwee nkwurịta okwu ndị ahịa site na njikọta WhatsApp Business. Mepụta ma jikwaa katalọgụ ngwaahịa gị, zigara akwụkwọ ụgwọ na akwụkwọ nnata na-enweghị onye, nye nkwado ndị ahịa ozugbo, ma ruo ndị ahịa n'usoro ozi ha kachasị masị.",
        "imageAlt": "Interface njikọta WhatsApp Business"
      },
      "languages": {
        "title": "Asụsụ 30+ A Na-akwado",
        "description": "Ruo ndị ahịa ma jikwaa azụmahịa gị n'asụsụ ị hụrụ n'anya. Site na Bekee ruo Swahili, Spanish ruo Mandarin, anyị na-akwado asụsụ karịrị 30 iji mee ka Dott ruo azụmahịa niile n'ụwa.",
        "imageAlt": "Ngosi interface asụsụ ọtụtụ",
        "availableIn": "Dị na:"
      }
    }
  }
};

console.log('Adding highlights translations to 10 new languages...');

languages.forEach(lang => {
  const filePath = `/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales/${lang}/common.json`;
  
  try {
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Add highlights translations
    existingData.highlights = highlightsTranslations[lang].highlights;
    
    // Update the "20+ languages" to "30+ languages" in hero section
    if (existingData.hero && existingData.hero.benefit && existingData.hero.benefit.languages) {
      const currentText = existingData.hero.benefit.languages;
      if (currentText.includes('20')) {
        existingData.hero.benefit.languages = currentText.replace('20', '30');
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log(`✅ Updated ${lang}/common.json with highlights section`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}:`, error.message);
  }
});

console.log('\n🎉 All highlights translations added successfully!');