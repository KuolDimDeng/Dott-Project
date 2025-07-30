import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the page translations for all 10 new languages
const pageTranslations = {
  it: {
    "invite": {
      "title": "Invita un Proprietario di Azienda",
      "description1": "Conosci un proprietario di azienda che cerca di ottimizzare le proprie operazioni? Condividi Dott con loro!",
      "description2": "Dott aiuta le aziende ad automatizzare la pianificazione, gestire le relazioni con i clienti e gestire i pagamenti, tutto in un'unica app semplice. Il tuo contatto può risparmiare ore di lavoro amministrativo ogni settimana.",
      "formTitle": "Invia Invito",
      "methodLabel": "Scegli il metodo di invito",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Indirizzo Email del Proprietario dell'Azienda",
      "emailPlaceholder": "azienda@esempio.com",
      "phoneLabel": "Numero WhatsApp del Proprietario dell'Azienda",
      "phonePlaceholder": "+39123456789",
      "phoneHelperText": "Includi il codice paese (es. +39 per Italia, +1 per USA)",
      "sendEmailButton": "Invia via Email",
      "sendWhatsappButton": "Invia via WhatsApp",
      "sendingText": "Invio...",
      "defaultSender": "Un collega",
      "defaultUser": "Un utente Dott",
      "whatsappMessage": "🚀 *{{senderName}} ti ha invitato a unirti a Dott: Piattaforma Aziendale Globale!*\n\nCiao! Volevo raccomandare personalmente Dott, una piattaforma di gestione aziendale che ha trasformato il modo in cui gestisco le mie operazioni.\n\nDott riunisce tutto quello di cui hai bisogno:\n• Gestione vendite e clienti  \n• Tracciamento e controllo inventario\n• Fatturazione e pagamenti professionali\n• Report finanziari e analisi\n• Strumenti di collaborazione team\n• Insights aziendali AI e analisi\n• Geofencing e tracciamento posizione\n• Business intelligence in tempo reale\n\nDa quando implemento Dott, ho ridotto il lavoro amministrativo di ore ogni settimana acquisendo insights in tempo reale sulle prestazioni della mia azienda.\n\nInizia gratuitamente per sempre oggi: https://dottapps.com\n\nCordiali saluti,\n{{userName}}",
      "emailMessage": "{{senderName}} ti ha invitato a unirti a Dott: Piattaforma Aziendale Globale!\n\nCiao,\n\nVolevo raccomandare personalmente Dott, una piattaforma di gestione aziendale che ha trasformato il modo in cui gestisco le mie operazioni.\n\nDott riunisce tutto quello di cui hai bisogno in un unico posto:\n• Gestione vendite e clienti\n• Tracciamento e controllo inventario\n• Fatturazione e pagamenti professionali\n• Report finanziari e analisi\n• Strumenti di collaborazione team\n• Insights aziendali AI e analisi\n• Geofencing e tracciamento posizione\n• Business intelligence in tempo reale\n\nDa quando implemento Dott, ho ridotto il lavoro amministrativo di ore ogni settimana acquisendo insights in tempo reale sulle prestazioni della mia azienda. La piattaforma offre capacità di livello enterprise a una frazione dei costi del software tradizionale.\n\nCredo che Dott sarebbe particolarmente prezioso per le operazioni aziendali e gli obiettivi di crescita.\n\nInizia gratuitamente per sempre oggi: https://dottapps.com\n\nCordiali saluti,\n{{userName}}",
      "emailValidationError": "Per favore inserisci un indirizzo email valido.",
      "phoneValidationError": "Per favore inserisci un numero di telefono valido.",
      "successMessage": "Invito inviato con successo via {{method}} a {{recipient}}!",
      "errorMessage": "Invio dell'invito fallito. Riprova.",
      "networkError": "Errore di rete. Controlla la tua connessione e riprova."
    },
    "status": {
      "title": "Stato Dott",
      "subtitle": "Stato del sistema attuale e monitoraggio uptime",
      "refresh": "Aggiorna",
      "refreshing": "Aggiornamento...",
      "checking": "Controllo stato servizio...",
      "lastUpdated": "Ultimo aggiornamento",
      "uptime": "uptime",
      "duration": "90 giorni",
      "responseTime": "Tempo di risposta",
      "overall": {
        "operational": "Tutti i Sistemi Operativi",
        "degraded": "Alcuni Sistemi con Problemi",
        "outage": "Interruzione Servizio Rilevata",
        "unknown": "Stato Sistema Sconosciuto"
      },
      "state": {
        "operational": "Operativo",
        "degraded": "Degradato",
        "outage": "Interruzione",
        "unknown": "Sconosciuto"
      },
      "serviceStatus": {
        "title": "Stato Servizio",
        "description": "Uptime negli ultimi 90 giorni. Monitoraggio di tutti i servizi critici."
      },
      "timeline": {
        "past": "90 giorni fa",
        "today": "Oggi"
      },
      "monitoring": {
        "title": "Sul Nostro Monitoraggio",
        "checks": "I controlli di stato vengono eseguiti ogni 5 minuti",
        "response": "Tempi di risposta misurati da più posizioni",
        "history": "Dati storici memorizzati per 90 giorni",
        "alerts": "Avvisi automatici per interruzioni del servizio"
      },
      "help": {
        "title": "Hai Bisogno di Aiuto?",
        "supportEmail": "Email Supporto",
        "statusUpdates": "Aggiornamenti Stato",
        "followUs": "Seguici per aggiornamenti in tempo reale sullo stato del servizio"
      }
    }
  },
  pl: {
    "invite": {
      "title": "Zaproś Właściciela Firmy",
      "description1": "Znasz właściciela firmy, który chce usprawnić swoje operacje? Podziel się Dott z nim!",
      "description2": "Dott pomaga firmom automatyzować planowanie, zarządzać relacjami z klientami i obsługiwać płatności—wszystko w jednej prostej aplikacji. Twój kontakt może zaoszczędzić godziny pracy administracyjnej każdego tygodnia.",
      "formTitle": "Wyślij Zaproszenie",
      "methodLabel": "Wybierz metodę zaproszenia",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Adres Email Właściciela Firmy",
      "emailPlaceholder": "firma@przykład.com",
      "phoneLabel": "Numer WhatsApp Właściciela Firmy",
      "phonePlaceholder": "+48123456789",
      "phoneHelperText": "Dołącz kod kraju (np. +48 dla Polski, +1 dla USA)",
      "sendEmailButton": "Wyślij przez Email",
      "sendWhatsappButton": "Wyślij przez WhatsApp",
      "sendingText": "Wysyłanie...",
      "defaultSender": "Kolega",
      "defaultUser": "Użytkownik Dott",
      "whatsappMessage": "🚀 *{{senderName}} zaprosił Cię do dołączenia do Dott: Globalna Platforma Biznesowa!*\n\nCześć! Chciałem osobiście polecić Dott, platformę zarządzania biznesem, która przekształciła sposób prowadzenia moich operacji.\n\nDott łączy wszystko, czego potrzebujesz:\n• Zarządzanie sprzedażą i klientami  \n• Śledzenie i kontrola inwentarza\n• Profesjonalne fakturowanie i płatności\n• Raporty finansowe i analityka\n• Narzędzia współpracy zespołowej\n• Wglądy biznesowe AI i analityka\n• Geofencing i śledzenie lokalizacji\n• Inteligencja biznesowa w czasie rzeczywistym\n\nOd czasu wdrożenia Dott, zmniejszyłem pracę administracyjną o godziny każdego tygodnia, zyskując wglądy w czasie rzeczywistym w wydajność mojej firmy.\n\nZacznij za darmo na zawsze już dziś: https://dottapps.com\n\nZ poważaniem,\n{{userName}}",
      "emailMessage": "{{senderName}} zaprosił Cię do dołączenia do Dott: Globalna Platforma Biznesowa!\n\nCześć,\n\nChciałem osobiście polecić Dott, platformę zarządzania biznesem, która przekształciła sposób prowadzenia moich operacji.\n\nDott łączy wszystko, czego potrzebujesz w jednym miejscu:\n• Zarządzanie sprzedażą i klientami\n• Śledzenie i kontrola inwentarza\n• Profesjonalne fakturowanie i płatności\n• Raporty finansowe i analityka\n• Narzędzia współpracy zespołowej\n• Wglądy biznesowe AI i analityka\n• Geofencing i śledzenie lokalizacji\n• Inteligencja biznesowa w czasie rzeczywistym\n\nOd czasu wdrożenia Dott, zmniejszyłem pracę administracyjną o godziny każdego tygodnia, zyskując wglądy w czasie rzeczywistym w wydajność mojej firmy. Platforma dostarcza możliwości klasy enterprise za ułamek kosztów tradycyjnego oprogramowania.\n\nWierzę, że Dott byłby szczególnie cenny dla operacji biznesowych i celów wzrostu.\n\nZacznij za darmo na zawsze już dziś: https://dottapps.com\n\nZ poważaniem,\n{{userName}}",
      "emailValidationError": "Proszę podać prawidłowy adres email.",
      "phoneValidationError": "Proszę podać prawidłowy numer telefonu.",
      "successMessage": "Zaproszenie wysłane pomyślnie przez {{method}} do {{recipient}}!",
      "errorMessage": "Nie udało się wysłać zaproszenia. Spróbuj ponownie.",
      "networkError": "Błąd sieci. Sprawdź połączenie i spróbuj ponownie."
    },
    "status": {
      "title": "Status Dott",
      "subtitle": "Aktualny status systemu i monitorowanie dostępności",
      "refresh": "Odśwież",
      "refreshing": "Odświeżanie...",
      "checking": "Sprawdzanie statusu usługi...",
      "lastUpdated": "Ostatnio zaktualizowano",
      "uptime": "dostępność",
      "duration": "90 dni",
      "responseTime": "Czas odpowiedzi",
      "overall": {
        "operational": "Wszystkie Systemy Działają",
        "degraded": "Niektóre Systemy Mają Problemy",
        "outage": "Wykryto Awarię Usługi",
        "unknown": "Status Systemu Nieznany"
      },
      "state": {
        "operational": "Działający",
        "degraded": "Pogorszony",
        "outage": "Awaria",
        "unknown": "Nieznany"
      },
      "serviceStatus": {
        "title": "Status Usługi",
        "description": "Dostępność z ostatnich 90 dni. Monitorowanie wszystkich krytycznych usług."
      },
      "timeline": {
        "past": "90 dni temu",
        "today": "Dziś"
      },
      "monitoring": {
        "title": "O Naszym Monitorowaniu",
        "checks": "Sprawdzanie statusu co 5 minut",
        "response": "Czasy odpowiedzi mierzone z wielu lokalizacji",
        "history": "Dane historyczne przechowywane przez 90 dni",
        "alerts": "Automatyczne alerty o zakłóceniach usługi"
      },
      "help": {
        "title": "Potrzebujesz Pomocy?",
        "supportEmail": "Email Wsparcia",
        "statusUpdates": "Aktualizacje Statusu",
        "followUs": "Śledź nas, aby otrzymywać aktualizacje statusu usługi w czasie rzeczywistym"
      }
    }
  },
  th: {
    "invite": {
      "title": "เชิญเจ้าของธุรกิจ",
      "description1": "รู้จักเจ้าของธุรกิจที่ต้องการปรับปรุงการดำเนินงานของพวกเขาหรือไม่? แชร์ Dott กับพวกเขา!",
      "description2": "Dott ช่วยธุรกิจในการจัดการตารางอัตโนมัติ จัดการความสัมพันธ์กับลูกค้า และจัดการการชำระเงิน—ทั้งหมดในแอปเดียวที่ง่าย การเชื่อมต่อของคุณสามารถประหยัดเวลาในการทำงานบริหารได้หลายชั่วโมงต่อสัปดาห์",
      "formTitle": "ส่งคำเชิญ",
      "methodLabel": "เลือกวิธีการเชิญ",
      "emailButton": "อีเมล",
      "whatsappButton": "WhatsApp",
      "emailLabel": "ที่อยู่อีเมลของเจ้าของธุรกิจ",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "หมายเลข WhatsApp ของเจ้าของธุรกิจ",
      "phonePlaceholder": "+66123456789",
      "phoneHelperText": "รวมรหัสประเทศ (เช่น +66 สำหรับไทย, +1 สำหรับสหรัฐฯ)",
      "sendEmailButton": "ส่งทางอีเมล",
      "sendWhatsappButton": "ส่งทาง WhatsApp",
      "sendingText": "กำลังส่ง...",
      "defaultSender": "เพื่อนร่วมงาน",
      "defaultUser": "ผู้ใช้ Dott",
      "whatsappMessage": "🚀 *{{senderName}} ได้เชิญคุณเข้าร่วม Dott: แพลตฟอร์มธุรกิจระดับโลก!*\n\nสวัสดี! ฉันอยากแนะนำ Dott โดยส่วนตัว เป็นแพลตฟอร์มการจัดการธุรกิจที่เปลี่ยนแปลงวิธีการดำเนินงานของฉัน\n\nDott รวบรวมทุกสิ่งที่คุณต้องการ:\n• การจัดการการขายและลูกค้า  \n• การติดตามและควบคุมสินค้าคงคลัง\n• การออกใบแจ้งหนี้และชำระเงินแบบมืออาชีพ\n• รายงานทางการเงินและการวิเคราะห์\n• เครื่องมือการทำงานร่วมกัน\n• ข้อมูลเชิงลึกทางธุรกิจ AI และการวิเคราะห์\n• Geofencing และการติดตามตำแหน่ง\n• ปัญญาธุรกิจแบบเรียลไทม์\n\nตั้งแต่ที่ใช้ Dott ฉันได้ลดงานบริหารลงหลายชั่วโมงต่อสัปดาห์ในขณะที่ได้รับข้อมูลเชิงลึกเรียลไทม์เกี่ยวกับประสิทธิภาพของธุรกิจ\n\nเริ่มใช้ฟรีตลอดกาลได้วันนี้: https://dottapps.com\n\nด้วยความเคารพ,\n{{userName}}",
      "emailMessage": "{{senderName}} ได้เชิญคุณเข้าร่วม Dott: แพลตฟอร์มธุรกิจระดับโลก!\n\nสวัสดี,\n\nฉันอยากแนะนำ Dott โดยส่วนตัว เป็นแพลตฟอร์มการจัดการธุรกิจที่เปลี่ยนแปลงวิธีการดำเนินงานของฉัน\n\nDott รวบรวมทุกสิ่งที่คุณต้องการไว้ในที่เดียว:\n• การจัดการการขายและลูกค้า\n• การติดตามและควบคุมสินค้าคงคลัง\n• การออกใบแจ้งหนี้และชำระเงินแบบมืออาชีพ\n• รายงานทางการเงินและการวิเคราะห์\n• เครื่องมือการทำงานร่วมกัน\n• ข้อมูลเชิงลึกทางธุรกิจ AI และการวิเคราะห์\n• Geofencing และการติดตามตำแหน่ง\n• ปัญญาธุรกิจแบบเรียลไทม์\n\nตั้งแต่ที่ใช้ Dott ฉันได้ลดงานบริหารลงหลายชั่วโมงต่อสัปดาห์ในขณะที่ได้รับข้อมูลเชิงลึกเรียลไทม์เกี่ยวกับประสิทธิภาพของธุรกิจ แพลตฟอร์มนี้มีความสามารถระดับองค์กรในราคาที่เป็นเศษส่วนของซอฟต์แวร์แบบดั้งเดิม\n\nฉันเชื่อว่า Dott จะมีคุณค่าอย่างยิ่งสำหรับการดำเนินงานและเป้าหมายการเติบโตของธุรกิจ\n\nเริ่มใช้ฟรีตลอดกาลได้วันนี้: https://dottapps.com\n\nด้วยความเคารพ,\n{{userName}}",
      "emailValidationError": "กรุณากรอกที่อยู่อีเมลที่ถูกต้อง",
      "phoneValidationError": "กรุณากรอกหมายเลขโทรศัพท์ที่ถูกต้อง",
      "successMessage": "ส่งคำเชิญสำเร็จทาง {{method}} ไปยัง {{recipient}}!",
      "errorMessage": "ไม่สามารถส่งคำเชิญได้ กรุณาลองใหม่อีกครั้ง",
      "networkError": "ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง"
    },
    "status": {
      "title": "สถานะ Dott",
      "subtitle": "สถานะระบบปัจจุบันและการตรวจสอบความพร้อมใช้งาน",
      "refresh": "รีเฟรช",
      "refreshing": "กำลังรีเฟรช...",
      "checking": "กำลังตรวจสอบสถานะบริการ...",
      "lastUpdated": "อัปเดตล่าสุด",
      "uptime": "เวลาใช้งาน",
      "duration": "90 วัน",
      "responseTime": "เวลาตอบสนอง",
      "overall": {
        "operational": "ระบบทั้งหมดทำงานปกติ",
        "degraded": "ระบบบางส่วนมีปัญหา",
        "outage": "ตรวจพบการหยุดให้บริการ",
        "unknown": "ไม่ทราบสถานะระบบ"
      },
      "state": {
        "operational": "ทำงานปกติ",
        "degraded": "เสื่อมสภาพ",
        "outage": "หยุดให้บริการ",
        "unknown": "ไม่ทราบ"
      },
      "serviceStatus": {
        "title": "สถานะบริการ",
        "description": "เวลาใช้งานในช่วง 90 วันที่ผ่านมา การตรวจสอบบริการสำคัญทั้งหมด"
      },
      "timeline": {
        "past": "90 วันที่ผ่านมา",
        "today": "วันนี้"
      },
      "monitoring": {
        "title": "เกี่ยวกับการตรวจสอบของเรา",
        "checks": "การตรวจสอบสถานะทุก 5 นาที",
        "response": "เวลาตอบสนองที่วัดจากหลายตำแหน่ง",
        "history": "ข้อมูลประวัติที่เก็บไว้เป็นเวลา 90 วัน",
        "alerts": "การแจ้งเตือนอัตโนมัติสำหรับการหยุดชะงักของบริการ"
      },
      "help": {
        "title": "ต้องการความช่วยเหลือ?",
        "supportEmail": "อีเมลสนับสนุน",
        "statusUpdates": "อัปเดตสถานะ",
        "followUs": "ติดตามเราเพื่อรับอัپเดตสถานะบริการแบบเรียลไทม์"
      }
    }
  },
  bn: {
    "invite": {
      "title": "একজন ব্যবসায়িক মালিককে আমন্ত্রণ জানান",
      "description1": "এমন কোনো ব্যবসায়িক মালিককে চেনেন যিনি তাদের কার্যক্রম উন্নত করতে চান? তাদের সাথে Dott শেয়ার করুন!",
      "description2": "Dott ব্যবসায়িকদের সময়সূচি স্বয়ংক্রিয় করতে, গ্রাহক সম্পর্ক পরিচালনা করতে এবং পেমেন্ট পরিচালনা করতে সাহায্য করে—সব একটি সহজ অ্যাপে। আপনার সংযোগ প্রতি সপ্তাহে ঘণ্টার পর ঘণ্টা প্রশাসনিক কাজ সাশ্রয় করতে পারে।",
      "formTitle": "আমন্ত্রণ পাঠান",
      "methodLabel": "আমন্ত্রণের পদ্ধতি বেছে নিন",
      "emailButton": "ইমেইল",
      "whatsappButton": "WhatsApp",
      "emailLabel": "ব্যবসায়িক মালিকের ইমেইল ঠিকানা",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "ব্যবসায়িক মালিকের WhatsApp নম্বর",
      "phonePlaceholder": "+8801234567890",
      "phoneHelperText": "দেশের কোড সহ দিন (যেমন +880 বাংলাদেশের জন্য, +1 মার্কিন যুক্তরাষ্ট্রের জন্য)",
      "sendEmailButton": "ইমেইলের মাধ্যমে পাঠান",
      "sendWhatsappButton": "WhatsApp এর মাধ্যমে পাঠান",
      "sendingText": "পাঠানো হচ্ছে...",
      "defaultSender": "একজন সহকর্মী",
      "defaultUser": "একজন Dott ব্যবহারকারী",
      "whatsappMessage": "🚀 *{{senderName}} আপনাকে Dott এ যোগ দিতে আমন্ত্রণ জানিয়েছেন: গ্লোবাল বিজনেস প্ল্যাটফর্ম!*\n\nহ্যালো! আমি ব্যক্তিগতভাবে Dott সুপারিশ করতে চেয়েছিলাম, একটি ব্যবসা পরিচালনা প্ল্যাটফর্ম যা আমার ক্রিয়াকলাপ পরিচালনার পদ্ধতি রূপান্তরিত করেছে।\n\nDott আপনার প্রয়োজনীয় সব কিছু একসাথে এনে দেয়:\n• বিক্রয় এবং গ্রাহক ব্যবস্থাপনা  \n• ইনভেন্টরি ট্র্যাকিং এবং নিয়ন্ত্রণ\n• পেশাদার ইনভয়েসিং এবং পেমেন্ট\n• আর্থিক রিপোর্টিং এবং বিশ্লেষণ\n• টিম সহযোগিতার সরঞ্জাম\n• AI ব্যবসায়িক অন্তর্দৃষ্টি এবং বিশ্লেষণ\n• জিওফেন্সিং এবং অবস্থান ট্র্যাকিং\n• রিয়েল-টাইম ব্যবসায়িক বুদ্ধিমত্তা\n\nDott বাস্তবায়নের পর থেকে, আমি প্রতি সপ্তাহে ঘণ্টার পর ঘণ্টা প্রশাসনিক কাজ কমিয়েছি এবং আমার ব্যবসার কর্মক্ষমতায় রিয়েল-টাইম অন্তর্দৃষ্টি অর্জন করেছি।\n\nআজই বিনামূল্যে চিরকালের জন্য শুরু করুন: https://dottapps.com\n\nশুভেচ্ছা,\n{{userName}}",
      "emailMessage": "{{senderName}} আপনাকে Dott এ যোগ দিতে আমন্ত্রণ জানিয়েছেন: গ্লোবাল বিজনেস প্ল্যাটফর্ম!\n\nহ্যালো,\n\nআমি ব্যক্তিগতভাবে Dott সুপারিশ করতে চেয়েছিলাম, একটি ব্যবসা পরিচালনা প্ল্যাটফর্ম যা আমার ক্রিয়াকলাপ পরিচালনার পদ্ধতি রূপান্তরিত করেছে।\n\nDott এক জায়গায় আপনার প্রয়োজনীয় সব কিছু একসাথে এনে দেয়:\n• বিক্রয় এবং গ্রাহক ব্যবস্থাপনা\n• ইনভেন্টরি ট্র্যাকিং এবং নিয়ন্ত্রণ\n• পেশাদার ইনভয়েসিং এবং পেমেন্ট\n• আর্থিক রিপোর্টিং এবং বিশ্লেষণ\n• টিম সহযোগিতার সরঞ্জাম\n• AI ব্যবসায়িক অন্তর্দৃষ্টি এবং বিশ্লেষণ\n• জিওফেন্সিং এবং অবস্থান ট্র্যাকিং\n• রিয়েল-টাইম ব্যবসায়িক বুদ্ধিমত্তা\n\nDott বাস্তবায়নের পর থেকে, আমি প্রতি সপ্তাহে ঘণ্টার পর ঘণ্টা প্রশাসনিক কাজ কমিয়েছি এবং আমার ব্যবসার কর্মক্ষমতায় রিয়েল-টাইম অন্তর্দৃষ্টি অর্জন করেছি। প্ল্যাটফর্মটি ঐতিহ্যবাহী সফটওয়্যারের খরচের একটি ভগ্নাংশে এন্টারপ্রাইজ-গ্রেড ক্ষমতা প্রদান করে।\n\nআমি বিশ্বাস করি Dott আপনার ব্যবসায়িক ক্রিয়াকলাপ এবং বৃদ্ধির লক্ষ্যগুলির জন্য বিশেষভাবে মূল্যবান হবে।\n\nআজই বিনামূল্যে চিরকালের জন্য শুরু করুন: https://dottapps.com\n\nশুভেচ্ছা,\n{{userName}}",
      "emailValidationError": "অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা দিন।",
      "phoneValidationError": "অনুগ্রহ করে একটি বৈধ ফোন নম্বর দিন।",
      "successMessage": "আমন্ত্রণ সফলভাবে {{method}} এর মাধ্যমে {{recipient}} এ পাঠানো হয়েছে!",
      "errorMessage": "আমন্ত্রণ পাঠাতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।",
      "networkError": "নেটওয়ার্ক ত্রুটি। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।"
    },
    "status": {
      "title": "Dott স্ট্যাটাস",
      "subtitle": "বর্তমান সিস্টেম স্ট্যাটাস এবং আপটাইম মনিটরিং",
      "refresh": "রিফ্রেশ",
      "refreshing": "রিফ্রেশ হচ্ছে...",
      "checking": "সেবা স্ট্যাটাস পরীক্ষা করা হচ্ছে...",
      "lastUpdated": "সর্বশেষ আপডেট",
      "uptime": "আপটাইম",
      "duration": "৯০ দিন",
      "responseTime": "প্রতিক্রিয়ার সময়",
      "overall": {
        "operational": "সমস্ত সিস্টেম চালু",
        "degraded": "কিছু সিস্টেমে সমস্যা হচ্ছে",
        "outage": "সেবা বিঘ্ন শনাক্ত",
        "unknown": "সিস্টেম স্ট্যাটাস অজানা"
      },
      "state": {
        "operational": "চালু",
        "degraded": "অবনতি",
        "outage": "বিঘ্ন",
        "unknown": "অজানা"
      },
      "serviceStatus": {
        "title": "সেবা স্ট্যাটাস",
        "description": "গত ৯০ দিনের আপটাইম। সমস্ত গুরুত্বপূর্ণ সেবা পর্যবেক্ষণ।"
      },
      "timeline": {
        "past": "৯০ দিন আগে",
        "today": "আজ"
      },
      "monitoring": {
        "title": "আমাদের পর্যবেক্ষণ সম্পর্কে",
        "checks": "স্ট্যাটাস পরীক্ষা প্রতি ৫ মিনিটে চালানো হয়",
        "response": "একাধিক অবস্থান থেকে প্রতিক্রিয়ার সময় পরিমাপ",
        "history": "৯০ দিনের জন্য ঐতিহাসিক ডেটা সংরক্ষিত",
        "alerts": "সেবা বিঘ্নের জন্য স্বয়ংক্রিয় সতর্কতা"
      },
      "help": {
        "title": "সাহায্য প্রয়োজন?",
        "supportEmail": "সাপোর্ট ইমেইল",
        "statusUpdates": "স্ট্যাটাস আপডেট",
        "followUs": "সেবা স্ট্যাটাসের রিয়েল-টাইম আপডেটের জন্য আমাদের অনুসরণ করুন"
      }
    }
  },
  ur: {
    "invite": {
      "title": "کاروباری مالک کو دعوت دیں",
      "description1": "کیا آپ کسی ایسے کاروباری مالک کو جانتے ہیں جو اپنے کام کو بہتر بنانا چاہتا ہے؟ Dott کو ان کے ساتھ شیئر کریں!",
      "description2": "Dott کاروبار میں شیڈولنگ، کسٹمر رشتے، اور پیمنٹس کو خودکار بنانے میں مدد کرتا ہے—سب کچھ ایک آسان ایپ میں۔ آپ کا رابطہ ہر ہفتے انتظامی کام کے گھنٹے بچا سکتا ہے۔",
      "formTitle": "دعوت بھیجیں",
      "methodLabel": "دعوت کا طریقہ چنیں",
      "emailButton": "ای میل",
      "whatsappButton": "WhatsApp",
      "emailLabel": "کاروباری مالک کا ای میل پتہ",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "کاروباری مالک کا WhatsApp نمبر",
      "phonePlaceholder": "+92123456789",
      "phoneHelperText": "کنٹری کوڈ شامل کریں (جیسے +92 پاکستان کے لیے، +1 امریکہ کے لیے)",
      "sendEmailButton": "ای میل کے ذریعے بھیجیں",
      "sendWhatsappButton": "WhatsApp کے ذریعے بھیجیں",
      "sendingText": "بھیجا جا رہا ہے...",
      "defaultSender": "ایک ساتھی",
      "defaultUser": "ایک Dott صارف",
      "whatsappMessage": "🚀 *{{senderName}} نے آپ کو Dott میں شامل ہونے کی دعوت دی ہے: گلوبل بزنس پلیٹ فارم!*\n\nہیلو! میں ذاتی طور پر Dott کی سفارش کرنا چاہتا تھا، ایک بزنس مینجمنٹ پلیٹ فارم جس نے میرے کام کے طریقے کو تبدیل کردیا ہے۔\n\nDott آپ کی ضرورت کی ہر چیز لاتا ہے:\n• سیلز اور کسٹمر مینجمنٹ  \n• انوینٹری ٹریکنگ اور کنٹرول\n• پیشہ ورانہ انوائسنگ اور پیمنٹس\n• مالی رپورٹنگ اور تجزیات\n• ٹیم تعاون کے ٹولز\n• AI بزنس انسائٹس اور تجزیات\n• جیو فینسنگ اور لوکیشن ٹریکنگ\n• ریئل ٹائم بزنس انٹیلی جنس\n\nDott کو نافذ کرنے کے بعد سے، میں نے ہر ہفتے انتظامی کام کے گھنٹے کم کیے ہیں جبکہ اپنے کاروبار کی کارکردگی میں ریئل ٹائم بصیرت حاصل کی ہے۔\n\nآج ہی مفت میں ہمیشہ کے لیے شروع کریں: https://dottapps.com\n\nنیک خواہشات،\n{{userName}}",
      "emailMessage": "{{senderName}} نے آپ کو Dott میں شامل ہونے کی دعوت دی ہے: گلوبل بزنس پلیٹ فارم!\n\nہیلو،\n\nمیں ذاتی طور پر Dott کی سفارش کرنا چاہتا تھا، ایک بزنس مینجمنٹ پلیٹ فارم جس نے میرے کام کے طریقے کو تبدیل کردیا ہے۔\n\nDott ایک ہی جگہ آپ کی ضرورت کی ہر چیز لاتا ہے:\n• سیلز اور کسٹمر مینجمنٹ\n• انوینٹری ٹریکنگ اور کنٹرول\n• پیشہ ورانہ انوائسنگ اور پیمنٹس\n• مالی رپورٹنگ اور تجزیات\n• ٹیم تعاون کے ٹولز\n• AI بزنس انسائٹس اور تجزیات\n• جیو فینسنگ اور لوکیشن ٹریکنگ\n• ریئل ٹائم بزنس انٹیلی جنس\n\nDott کو نافذ کرنے کے بعد سے، میں نے ہر ہفتے انتظامی کام کے گھنٹے کم کیے ہیں جبکہ اپنے کاروبار کی کارکردگی میں ریئل ٹائم بصیرت حاصل کی ہے۔ یہ پلیٹ فارم روایتی سافٹ ویئر کی لاگت کے ایک حصے میں انٹرپرائز گریڈ صلاحیات فراہم کرتا ہے۔\n\nمجھے یقین ہے کہ Dott آپ کے کاروباری عمل اور ترقی کے اہداف کے لیے خاص طور پر قیمتی ہوگا۔\n\nآج ہی مفت میں ہمیشہ کے لیے شروع کریں: https://dottapps.com\n\nنیک خواہشات،\n{{userName}}",
      "emailValidationError": "براہ کرم درست ای میل ایڈریس داخل کریں۔",
      "phoneValidationError": "براہ کرم درست فون نمبر داخل کریں۔",
      "successMessage": "دعوت کامیابی سے {{method}} کے ذریعے {{recipient}} کو بھیجی گئی!",
      "errorMessage": "دعوت بھیجنے میں ناکام۔ براہ کرم دوبارہ کوشش کریں۔",
      "networkError": "نیٹ ورک کی خرابی۔ براہ کرم اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔"
    },
    "status": {
      "title": "Dott کی حالت",
      "subtitle": "موجودہ سسٹم کی حالت اور اپ ٹائم مانیٹرنگ",
      "refresh": "ریفریش",
      "refreshing": "ریفریش ہو رہا ہے...",
      "checking": "سروس کی حالت چیک کی جا رہی ہے...",
      "lastUpdated": "آخری اپڈیٹ",
      "uptime": "اپ ٹائم",
      "duration": "90 دن",
      "responseTime": "جوابی وقت",
      "overall": {
        "operational": "تمام سسٹم چالو",
        "degraded": "کچھ سسٹمز میں مسائل",
        "outage": "سروس میں خلل کا پتہ چلا",
        "unknown": "سسٹم کی حالت نامعلوم"
      },
      "state": {
        "operational": "چالو",
        "degraded": "کمزور",
        "outage": "خلل",
        "unknown": "نامعلوم"
      },
      "serviceStatus": {
        "title": "سروس کی حالت",
        "description": "پچھلے 90 دنوں میں اپ ٹائم۔ تمام اہم سروسز کی نگرانی۔"
      },
      "timeline": {
        "past": "90 دن پہلے",
        "today": "آج"
      },
      "monitoring": {
        "title": "ہماری نگرانی کے بارے میں",
        "checks": "حالت کی جانچ ہر 5 منٹ میں چلتی ہے",
        "response": "متعدد مقامات سے جوابی وقت کی پیمائش",
        "history": "تاریخی ڈیٹا 90 دنوں کے لیے محفوظ",
        "alerts": "سروس میں خلل کے لیے خودکار الرٹس"
      },
      "help": {
        "title": "مدد درکار؟",
        "supportEmail": "سپورٹ ای میل",
        "statusUpdates": "حالت کی اپڈیٹس",
        "followUs": "سروس کی حالت کی ریئل ٹائم اپڈیٹس کے لیے ہمیں فالو کریں"
      }
    }
  },
  tl: {
    "invite": {
      "title": "Imbitahan ang isang Business Owner",
      "description1": "Kilala mo ba ang business owner na nais mapabuti ang kanilang operasyon? Ibahagi ang Dott sa kanila!",
      "description2": "Tumutulong ang Dott sa mga negosyo na mag-automate ng scheduling, pamahalaan ang customer relationships, at hawakan ang mga bayad—lahat sa isang simpleng app. Ang inyong koneksyon ay makapag-save ng mga oras sa administrative work kada linggo.",
      "formTitle": "Magpadala ng Imbitasyon",
      "methodLabel": "Piliin ang paraan ng pag-imbita",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Email Address ng Business Owner",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "WhatsApp Number ng Business Owner",
      "phonePlaceholder": "+63123456789",
      "phoneHelperText": "Isama ang country code (hal. +63 para sa Pilipinas, +1 para sa US)",
      "sendEmailButton": "Ipadala sa Email",
      "sendWhatsappButton": "Ipadala sa WhatsApp",
      "sendingText": "Pinapadala...",
      "defaultSender": "Isang kasamahan",
      "defaultUser": "Isang Dott User",
      "whatsappMessage": "🚀 *In-imbitahan ka ni {{senderName}} na sumali sa Dott: Global Business Platform!*\n\nHello! Gusto ko nang personal na irekomenda ang Dott, isang business management platform na nag-transform sa paraan ng aking pag-ooperate.\n\nSinisilakbo ng Dott ang lahat ng kailangan mo:\n• Sales at customer management  \n• Inventory tracking at control\n• Professional invoicing at payments\n• Financial reporting at analytics\n• Team collaboration tools\n• AI Business insights at analytics\n• Geofencing at location tracking\n• Real-time business intelligence\n\nSimula nang gamitin ko ang Dott, nabawasan ko ng mga oras ang administrative work kada linggo habang nakakuha ng real-time insights sa performance ng aking business.\n\nMagsimula ng libre magpakailanman ngayon: https://dottapps.com\n\nPagmamahal,\n{{userName}}",
      "emailMessage": "In-imbitahan ka ni {{senderName}} na sumali sa Dott: Global Business Platform!\n\nHello,\n\nGusto ko nang personal na irekomenda ang Dott, isang business management platform na nag-transform sa paraan ng aking pag-ooperate.\n\nSinisilakbo ng Dott ang lahat ng kailangan mo sa isang lugar:\n• Sales at customer management\n• Inventory tracking at control\n• Professional invoicing at payments\n• Financial reporting at analytics\n• Team collaboration tools\n• AI Business insights at analytics\n• Geofencing at location tracking\n• Real-time business intelligence\n\nSimula nang gamitin ko ang Dott, nabawasan ko ng mga oras ang administrative work kada linggo habang nakakuha ng real-time insights sa performance ng aking business. Nagbibigay ang platform ng enterprise-grade capabilities sa fraction ng traditional software costs.\n\nNaniniwala ako na magiging valuable ang Dott para sa inyong business operations at growth goals.\n\nMagsimula ng libre magpakailanman ngayon: https://dottapps.com\n\nPagmamahal,\n{{userName}}",
      "emailValidationError": "Maglagay ng valid na email address.",
      "phoneValidationError": "Maglagay ng valid na phone number.",
      "successMessage": "Matagumpay na naipadala ang imbitasyon sa {{method}} kay {{recipient}}!",
      "errorMessage": "Hindi naipadala ang imbitasyon. Subukan ulit.",
      "networkError": "Network error. I-check ang inyong koneksyon at subukan ulit."
    },
    "status": {
      "title": "Dott Status",
      "subtitle": "Kasalukuyang system status at uptime monitoring",
      "refresh": "I-refresh",
      "refreshing": "Nire-refresh...",
      "checking": "Sinusuri ang service status...",
      "lastUpdated": "Huling nag-update",
      "uptime": "uptime",
      "duration": "90 araw",
      "responseTime": "Response time",
      "overall": {
        "operational": "Lahat ng Sistema ay Gumagana",
        "degraded": "May Mga Sistema na May Issues",
        "outage": "Nadetect ang Service Outage",
        "unknown": "Hindi Alam ang System Status"
      },
      "state": {
        "operational": "Gumagana",
        "degraded": "Degraded",
        "outage": "Outage",
        "unknown": "Hindi Alam"
      },
      "serviceStatus": {
        "title": "Service Status",
        "description": "Uptime sa nakaraang 90 araw. Monitoring ng lahat ng critical services."
      },
      "timeline": {
        "past": "90 araw na nakaraan",
        "today": "Ngayon"
      },
      "monitoring": {
        "title": "Tungkol sa Aming Monitoring",
        "checks": "Status checks na tumatakbo kada 5 minuto",
        "response": "Response times na sinusukat mula sa maraming lokasyon",
        "history": "Historical data na naka-store ng 90 araw",
        "alerts": "Automatic alerts para sa service disruptions"
      },
      "help": {
        "title": "Kailangan ng Tulong?",
        "supportEmail": "Support Email",
        "statusUpdates": "Status Updates",
        "followUs": "I-follow kami para sa real-time updates sa service status"
      }
    }
  },
  uk: {
    "invite": {
      "title": "Запросити власника бізнесу",
      "description1": "Знаєте власника бізнесу, який хоче оптимізувати свою діяльність? Поділіться з ними Dott!",
      "description2": "Dott допомагає бізнесу автоматизувати планування, управляти відносинами з клієнтами та обробляти платежі—все в одному простому додатку. Ваш контакт може заощадити години адміністративної роботи щотижня.",
      "formTitle": "Надіслати запрошення",
      "methodLabel": "Оберіть спосіб запрошення",
      "emailButton": "Електронна пошта",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Електронна адреса власника бізнесу",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "Номер WhatsApp власника бізнесу",
      "phonePlaceholder": "+380123456789",
      "phoneHelperText": "Включіть код країни (наприклад, +380 для України, +1 для США)",
      "sendEmailButton": "Надіслати електронною поштою",
      "sendWhatsappButton": "Надіслати через WhatsApp",
      "sendingText": "Надсилання...",
      "defaultSender": "Колега",
      "defaultUser": "Користувач Dott",
      "whatsappMessage": "🚀 *{{senderName}} запросив вас приєднатися до Dott: Глобальна бізнес-платформа!*\n\nПривіт! Я хотів особисто порекомендувати Dott, платформу управління бізнесом, яка трансформувала спосіб ведення моїх операцій.\n\nDott об'єднує все необхідне:\n• Управління продажами та клієнтами  \n• Відстеження та контроль запасів\n• Професійне виставлення рахунків та платежі\n• Фінансова звітність та аналітика\n• Інструменти співпраці команди\n• AI Бізнес-аналітика та інсайти\n• Геофенсинг та відстеження місцезнаходження\n• Бізнес-аналітика в реальному часі\n\nВідколи я впровадив Dott, я скоротив адміністративну роботу на години щотижня, отримуючи інсайти в реальному часі про продуктивність мого бізнесу.\n\nПочніть безкоштовно назавжди сьогодні: https://dottapps.com\n\nЗ повагою,\n{{userName}}",
      "emailMessage": "{{senderName}} запросив вас приєднатися до Dott: Глобальна бізнес-платформа!\n\nПривіт,\n\nЯ хотів особисто порекомендувати Dott, платформу управління бізнесом, яка трансформувала спосіб ведення моїх операцій.\n\nDott об'єднує все необхідне в одному місці:\n• Управління продажами та клієнтами\n• Відстеження та контроль запасів\n• Професійне виставлення рахунків та платежі\n• Фінансова звітність та аналітика\n• Інструменти співпраці команди\n• AI Бізнес-аналітика та інсайти\n• Геофенсинг та відстеження місцезнаходження\n• Бізнес-аналітика в реальному часі\n\nВідколи я впровадив Dott, я скоротив адміністративну роботу на години щотижня, отримуючи інсайти в реальному часі про продуктивність мого бізнесу. Платформа надає можливості корпоративного рівня за частку від вартості традиційного програмного забезпечення.\n\nЯ вірю, що Dott буде особливо цінним для ваших бізнес-операцій та цілей зростання.\n\nПочніть безкоштовно назавжди сьогодні: https://dottapps.com\n\nЗ повагою,\n{{userName}}",
      "emailValidationError": "Будь ласка, введіть дійсну електронну адресу.",
      "phoneValidationError": "Будь ласка, введіть дійсний номер телефону.",
      "successMessage": "Запрошення успішно надіслано через {{method}} до {{recipient}}!",
      "errorMessage": "Не вдалося надіслати запрошення. Спробуйте знову.",
      "networkError": "Помилка мережі. Перевірте підключення та спробуйте знову."
    },
    "status": {
      "title": "Статус Dott",
      "subtitle": "Поточний статус системи та моніторинг доступності",
      "refresh": "Оновити",
      "refreshing": "Оновлення...",
      "checking": "Перевірка статусу сервісу...",
      "lastUpdated": "Останнє оновлення",
      "uptime": "час роботи",
      "duration": "90 днів",
      "responseTime": "Час відповіді",
      "overall": {
        "operational": "Всі системи працюють",
        "degraded": "Деякі системи мають проблеми",
        "outage": "Виявлено збій сервісу",
        "unknown": "Статус системи невідомий"
      },
      "state": {
        "operational": "Працює",
        "degraded": "Погіршений",
        "outage": "Збій",
        "unknown": "Невідомий"
      },
      "serviceStatus": {
        "title": "Статус сервісу",
        "description": "Час роботи за останні 90 днів. Моніторинг всіх критичних сервісів."
      },
      "timeline": {
        "past": "90 днів тому",
        "today": "Сьогодні"
      },
      "monitoring": {
        "title": "Про наш моніторинг",
        "checks": "Перевірки статусу виконуються кожні 5 хвилин",
        "response": "Час відповіді вимірюється з декількох локацій",
        "history": "Історичні дані зберігаються протягом 90 днів",
        "alerts": "Автоматичні сповіщення про збої сервісу"
      },
      "help": {
        "title": "Потрібна допомога?",
        "supportEmail": "Email підтримки",
        "statusUpdates": "Оновлення статусу",
        "followUs": "Стежте за нами для отримання оновлень статусу сервісу в реальному часі"
      }
    }
  },
  fa: {
    "invite": {
      "title": "دعوت از مالک کسب‌وکار",
      "description1": "مالک کسب‌وکاری می‌شناسید که می‌خواهد عملیات خود را بهینه کند؟ Dott را با آن‌ها به اشتراک بگذارید!",
      "description2": "Dott به کسب‌وکارها کمک می‌کند تا زمان‌بندی را خودکار کنند، روابط مشتری را مدیریت کنند و پرداخت‌ها را انجام دهند—همه در یک اپلیکیشن ساده. ارتباط شما می‌تواند ساعت‌ها کار اداری را هر هفته صرفه‌جویی کند.",
      "formTitle": "ارسال دعوت‌نامه",
      "methodLabel": "روش دعوت را انتخاب کنید",
      "emailButton": "ایمیل",
      "whatsappButton": "WhatsApp",
      "emailLabel": "آدرس ایمیل مالک کسب‌وکار",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "شماره WhatsApp مالک کسب‌وکار",
      "phonePlaceholder": "+989123456789",
      "phoneHelperText": "کد کشور را شامل کنید (مثل +98 برای ایران، +1 برای آمریکا)",
      "sendEmailButton": "ارسال از طریق ایمیل",
      "sendWhatsappButton": "ارسال از طریق WhatsApp",
      "sendingText": "در حال ارسال...",
      "defaultSender": "یک همکار",
      "defaultUser": "یک کاربر Dott",
      "whatsappMessage": "🚀 *{{senderName}} شما را به پیوستن به Dott دعوت کرده است: پلتفرم کسب‌وکار جهانی!*\n\nسلام! می‌خواستم شخصاً Dott را توصیه کنم، پلتفرم مدیریت کسب‌وکار که نحوه اجرای عملیات من را تغییر داده است.\n\nDott همه چیزهایی که نیاز دارید را گرد هم می‌آورد:\n• مدیریت فروش و مشتری  \n• ردیابی و کنترل موجودی\n• صورتحساب حرفه‌ای و پرداخت‌ها\n• گزارش‌دهی مالی و تجزیه و تحلیل\n• ابزارهای همکاری تیم\n• بینش‌های تجاری AI و تجزیه و تحلیل\n• Geofencing و ردیابی موقعیت\n• هوش تجاری بلادرنگ\n\nاز زمان پیاده‌سازی Dott، کار اداری را ساعت‌ها در هفته کم کرده‌ام در حالی که بینش‌های بلادرنگ از عملکرد کسب‌وکارم به دست آورده‌ام.\n\nهمین امروز رایگان و برای همیشه شروع کنید: https://dottapps.com\n\nبا احترام،\n{{userName}}",
      "emailMessage": "{{senderName}} شما را به پیوستن به Dott دعوت کرده است: پلتفرم کسب‌وکار جهانی!\n\nسلام،\n\nمی‌خواستم شخصاً Dott را توصیه کنم، پلتفرم مدیریت کسب‌وکار که نحوه اجرای عملیات من را تغییر داده است.\n\nDott همه چیزهایی که نیاز دارید را در یک مکان گرد هم می‌آورد:\n• مدیریت فروش و مشتری\n• ردیابی و کنترل موجودی\n• صورتحساب حرفه‌ای و پرداخت‌ها\n• گزارش‌دهی مالی و تجزیه و تحلیل\n• ابزارهای همکاری تیم\n• بینش‌های تجاری AI و تجزیه و تحلیل\n• Geofencing و ردیابی موقعیت\n• هوش تجاری بلادرنگ\n\nاز زمان پیاده‌سازی Dott، کار اداری را ساعت‌ها در هفته کم کرده‌ام در حالی که بینش‌های بلادرنگ از عملکرد کسب‌وکارم به دست آورده‌ام. این پلتفرم قابلیت‌های سطح سازمانی را با کسری از هزینه‌های نرم‌افزار سنتی ارائه می‌دهد.\n\nباور دارم که Dott برای عملیات تجاری و اهداف رشد شما بسیار ارزشمند خواهد بود.\n\nهمین امروز رایگان و برای همیشه شروع کنید: https://dottapps.com\n\nبا احترام،\n{{userName}}",
      "emailValidationError": "لطفاً آدرس ایمیل معتبری وارد کنید.",
      "phoneValidationError": "لطفاً شماره تلفن معتبری وارد کنید.",
      "successMessage": "دعوت‌نامه با موفقیت از طریق {{method}} به {{recipient}} ارسال شد!",
      "errorMessage": "ارسال دعوت‌نامه ناموفق بود. لطفاً دوباره تلاش کنید.",
      "networkError": "خطای شبکه. لطفاً اتصال خود را بررسی کنید و دوباره تلاش کنید."
    },
    "status": {
      "title": "وضعیت Dott",
      "subtitle": "وضعیت فعلی سیستم و نظارت بر زمان فعالیت",
      "refresh": "تازه‌سازی",
      "refreshing": "در حال تازه‌سازی...",
      "checking": "بررسی وضعیت سرویس...",
      "lastUpdated": "آخرین به‌روزرسانی",
      "uptime": "زمان فعالیت",
      "duration": "90 روز",
      "responseTime": "زمان پاسخ",
      "overall": {
        "operational": "تمام سیستم‌ها فعال",
        "degraded": "برخی سیستم‌ها دچار مشکل",
        "outage": "قطعی سرویس شناسایی شد",
        "unknown": "وضعیت سیستم نامشخص"
      },
      "state": {
        "operational": "فعال",
        "degraded": "کاهش یافته",
        "outage": "قطعی",
        "unknown": "نامشخص"
      },
      "serviceStatus": {
        "title": "وضعیت سرویس",
        "description": "زمان فعالیت در 90 روز گذشته. نظارت بر تمام سرویس‌های حیاتی."
      },
      "timeline": {
        "past": "90 روز پیش",
        "today": "امروز"
      },
      "monitoring": {
        "title": "درباره نظارت ما",
        "checks": "بررسی وضعیت هر 5 دقیقه اجرا می‌شود",
        "response": "زمان پاسخ از چندین مکان اندازه‌گیری می‌شود",
        "history": "داده‌های تاریخی برای 90 روز ذخیره می‌شود",
        "alerts": "هشدارهای خودکار برای اختلال در سرویس"
      },
      "help": {
        "title": "نیاز به کمک دارید؟",
        "supportEmail": "ایمیل پشتیبانی",
        "statusUpdates": "به‌روزرسانی‌های وضعیت",
        "followUs": "ما را دنبال کنید تا به‌روزرسانی‌های وضعیت سرویس را بلادرنگ دریافت کنید"
      }
    }
  },
  sn: {
    "invite": {
      "title": "Kokera Muridzi weBhizinesi",
      "description1": "Une muridzi webhizinesi wauziva anoda kuvandudza mashandiro avo? Govana Dott navo!",
      "description2": "Dott inobatsira mabhizinesi kuita scheduling otomatiki, kubata hukama nevatengi, uye kubata mari—zvose mune imwe chete app iri nyore. Kubatana kwako kunogona kuchengetedza maawa ebasa redhministrative vhiki rega rega.",
      "formTitle": "Tumira Kukoka",
      "methodLabel": "Sarudza nzira yekukoka",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Email Address yeMuridzi weBhizinesi",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "WhatsApp Number yeMuridzi weBhizinesi",
      "phonePlaceholder": "+263123456789",
      "phoneHelperText": "Sanganisira country code (senge +263 yeZimbabwe, +1 yeUS)",
      "sendEmailButton": "Tumira neEmail",
      "sendWhatsappButton": "Tumira neWhatsApp",
      "sendingText": "Kutumira...",
      "defaultSender": "Mumwe mushandi",
      "defaultUser": "Mumwe Dott User",
      "whatsappMessage": "🚀 *{{senderName}} akakukoka kuti upinde muDott: Global Business Platform!*\n\nMhoro! Ndaida kukurudzira Dott, platform yekubata bhizinesi yakashandura nzira yandinoshandisa mashandiro angu.\n\nDott inounza zvose zvaunoda:\n• Sales nekubata vatengi  \n• Kutevera nekubata inventory\n• Professional invoicing nemari\n• Financial reporting neanalytics\n• Team collaboration tools\n• AI Business insights neanalytics\n• Geofencing nelocation tracking\n• Real-time business intelligence\n\nKubva pandatanga kushandisa Dott, ndakadzikisa basa readministrative nemaawa vhiki rega rega ndichiwana real-time insights pamusoro pekushanda kwebhizinesi rangu.\n\nTanga mahara nekusingaperi nhasi: https://dottapps.com\n\nNerudo,\n{{userName}}",
      "emailMessage": "{{senderName}} akakukoka kuti upinde muDott: Global Business Platform!\n\nMhoro,\n\nNdaida kukurudzira Dott, platform yekubata bhizinesi yakashandura nzira yandinoshandisa mashandiro angu.\n\nDott inounza zvose zvaunoda munzvimbo imwe:\n• Sales nekubata vatengi\n• Kutevera nekubata inventory\n• Professional invoicing nemari\n• Financial reporting neanalytics\n• Team collaboration tools\n• AI Business insights neanalytics\n• Geofencing nelocation tracking\n• Real-time business intelligence\n\nKubva pandatanga kushandisa Dott, ndakadzikisa basa readministrative nemaawa vhiki rega rega ndichiwana real-time insights pamusoro pekushanda kwebhizinesi rangu. Platform iyi inopa enterprise-grade capabilities panguva shoma yemitengo yetraditional software.\n\nNdinotenda kuti Dott ichakosha zvikuru kumabasa ebhizinesi uye zvaunoda kukura.\n\nTanga mahara nekusingaperi nhasi: https://dottapps.com\n\nNerudo,\n{{userName}}",
      "emailValidationError": "Ndapota isa email address yakanaka.",
      "phoneValidationError": "Ndapota isa phone number yakanaka.",
      "successMessage": "Kukoka kwakatumirwa zvakanaka ne{{method}} ku{{recipient}}!",
      "errorMessage": "Kutumira kukoka kwakundikana. Edza zvakare.",
      "networkError": "Network error. Ongorora kubatana kwako uye uyedze zvakare."
    },
    "status": {
      "title": "Dott Status",
      "subtitle": "System status yazvino uye uptime monitoring",
      "refresh": "Refresh",
      "refreshing": "Kurefresh...",
      "checking": "Kuongorora service status...",
      "lastUpdated": "Yakapedzisira kuupdate",
      "uptime": "uptime",
      "duration": "Mazuva makumi mapfumbamwe",
      "responseTime": "Response time",
      "overall": {
        "operational": "Masystem Ose Ari Kushanda",
        "degraded": "Mamwe Masystem Ane Matambudziko",
        "outage": "Service Outage Yakaonekwa",
        "unknown": "System Status Haizivicanwi"
      },
      "state": {
        "operational": "Kushanda",
        "degraded": "Degraded",
        "outage": "Outage",
        "unknown": "Haizivicanwi"
      },
      "serviceStatus": {
        "title": "Service Status",
        "description": "Uptime mumazuva makumi mapfumbamwe apfuura. Kutarisa masevhisi ose akakosha."
      },
      "timeline": {
        "past": "Mazuva makumi mapfumbamwe apfuura",
        "today": "Nhasi"
      },
      "monitoring": {
        "title": "Nezve Monitoring Yedu",
        "checks": "Status checks dzinomhanya chero maminitsi mashanu",
        "response": "Response times dzinoyerwa kubva kunzvimbo dzakawanda",
        "history": "Historical data yakachengetwa kwemazuva makumi mapfumbamwe",
        "alerts": "Automatic alerts yeservice disruptions"
      },
      "help": {
        "title": "Unoda Rubatsiro?",
        "supportEmail": "Support Email",
        "statusUpdates": "Status Updates",
        "followUs": "Titevere kuti uwane real-time updates paservice status"
      }
    }
  },
  ig: {
    "invite": {
      "title": "Kpọọ Onye Nwe Azụmahịa",
      "description1": "Ịmara onye nwe azụmahịa na-achọ imeziwanye ọrụ ha? Kerịta Dott na ha!",
      "description2": "Dott na-enyere azụmahịa aka ime nhazi oge n'onwe ya, jikwaa mmekọrịta ndị ahịa, na ijikwa ịkwụ ụgwọ—niile n'otu app dị mfe. Njikọ gị nwere ike ichekwa ọtụtụ awa ọrụ nchịkwa kwa izu.",
      "formTitle": "Zipu Ịkpọ",
      "methodLabel": "Họrọ ụzọ ịkpọ",
      "emailButton": "Email",
      "whatsappButton": "WhatsApp",
      "emailLabel": "Adreesị Email Onye Nwe Azụmahịa",
      "emailPlaceholder": "business@example.com",
      "phoneLabel": "Nọmba WhatsApp Onye Nwe Azụmahịa",
      "phonePlaceholder": "+234123456789",
      "phoneHelperText": "Tinye koodu mba (dịka +234 maka Naịjirịa, +1 maka US)",
      "sendEmailButton": "Zipu site na Email",
      "sendWhatsappButton": "Zipu site na WhatsApp",
      "sendingText": "Na-ezipu...",
      "defaultSender": "Otu onye ọrụ ibe",
      "defaultUser": "Otu onye ọrụ Dott",
      "whatsappMessage": "🚀 *{{senderName}} akpọọla gị ka ị sonye na Dott: Global Business Platform!*\n\nNdewo! Achọrọ m ịkwado Dott n'onwe m, ikpo okwu ijikwa azụmahịa nke gbanwere otú m si eme ọrụ m.\n\nDott na-eweta ihe niile ị chọrọ:\n• Njikwa ire ahịa na ndị ahịa  \n• Nsochi na njikwa ngwongwo\n• Ịkwụ ụgwọ ọkachamara na ịkwụ ụgwọ\n• Mkpesa ego na nyocha\n• Ngwá ọrụ nkwekọrịta ìgwè\n• AI Business insights na nyocha\n• Geofencing na nsochi ọnọdụ\n• Ọgụgụ isi azụmahịa n'oge\n\nKemgbe m malitere iji Dott, ebelatala m ọrụ nchịkwa ruo ọtụtụ awa kwa izu ebe m na-enweta nghọta n'oge gbasara arụmọrụ azụmahịa m.\n\nMalite n'efu ruo mgbe ebighị ebi taa: https://dottapps.com\n\nJi ịhụnanya,\n{{userName}}",
      "emailMessage": "{{senderName}} akpọọla gị ka ị sonye na Dott: Global Business Platform!\n\nNdewo,\n\nAchọrọ m ịkwado Dott n'onwe m, ikpo okwu ijikwa azụmahịa nke gbanwere otú m si eme ọrụ m.\n\nDott na-eweta ihe niile ị chọrọ n'otu ebe:\n• Njikwa ire ahịa na ndị ahịa\n• Nsochi na njikwa ngwongwo\n• Ịkwụ ụgwọ ọkachamara na ịkwụ ụgwọ\n• Mkpesa ego na nyocha\n• Ngwá ọrụ nkwekọrịta ìgwè\n• AI Business insights na nyocha\n• Geofencing na nsochi ọnọdụ\n• Ọgụgụ isi azụmahịa n'oge\n\nKemgbe m malitere iji Dott, ebelatala m ọrụ nchịkwa ruo ọtụtụ awa kwa izu ebe m na-enweta nghọta n'oge gbasara arụmọrụ azụmahịa m. Ikpo okwu a na-enye ikike ndị ụlọ ọrụ n'ọnụ ọgụgụ nta nke ọnụ ahịa yazara ngwanrọ ọdịnala.\n\nEkwere m na Dott ga-aba uru karị maka ọrụ azụmahịa gị na ebumnuche uto.\n\nMalite n'efu ruo mgbe ebighị ebi taa: https://dottapps.com\n\nJi ịhụnanya,\n{{userName}}",
      "emailValidationError": "Biko tinye adreesị email ziri ezi.",
      "phoneValidationError": "Biko tinye nọmba ekwentị ziri ezi.",
      "successMessage": "Ezipụrụ ịkpọ ahụ nke ọma site na {{method}} gaa {{recipient}}!",
      "errorMessage": "Ịkpọ ahụ emeghị. Biko nwaa ọzọ.",
      "networkError": "Nsogbu netwọk. Biko lelee njikọ gị ma nwaa ọzọ."
    },
    "status": {
      "title": "Ọnọdụ Dott",
      "subtitle": "Ọnọdụ sistemu ugbu a na nlekọta oge ọrụ",
      "refresh": "Nwee ọhụrụ",
      "refreshing": "Na-eme ọhụrụ...",
      "checking": "Na-enyocha ọnọdụ ọrụ...",
      "lastUpdated": "Nke ikpeazụ emelitere",
      "uptime": "oge ọrụ",
      "duration": "Ụbọchị 90",
      "responseTime": "Oge nzaghachi",
      "overall": {
        "operational": "Sistemu Niile Na-arụ Ọrụ",
        "degraded": "Ụfọdụ Sistemu Nwere Nsogbu",
        "outage": "Achọpụtara Nkwụsị Ọrụ",
        "unknown": "Amaghị Ọnọdụ Sistemu"
      },
      "state": {
        "operational": "Na-arụ ọrụ",
        "degraded": "Gbadara",
        "outage": "Nkwụsị",
        "unknown": "Amaghị"
      },
      "serviceStatus": {
        "title": "Ọnọdụ Ọrụ",
        "description": "Oge ọrụ n'ime ụbọchị 90 gara aga. Nlekọta ọrụ niile dị mkpa."
      },
      "timeline": {
        "past": "Ụbọchị 90 gara aga",
        "today": "Taa"
      },
      "monitoring": {
        "title": "Gbasara Nlekọta Anyị",
        "checks": "Nleba anya ọnọdụ na-eme kwa nkeji 5",
        "response": "A na-atụ oge nzaghachi site n'ọtụtụ ebe",
        "history": "Edobere data akụkọ maka ụbọchị 90",
        "alerts": "Ịdọ aka ná ntị na-akpaghị aka maka nkwụsị ọrụ"
      },
      "help": {
        "title": "Ịchọrọ Enyemaka?",
        "supportEmail": "Email Nkwado",
        "statusUpdates": "Mmelite Ọnọdụ",
        "followUs": "Soro anyị maka mmelite ọnọdụ ọrụ n'oge"
      }
    }
  }
};

// Languages to update
const languages = ['it', 'pl', 'th', 'bn', 'ur', 'tl', 'uk', 'fa', 'sn', 'ig'];

function updateLanguageFile(lang) {
  const filePath = path.join(__dirname, 'frontend/pyfactor_next/public/locales', lang, 'navigation.json');
  
  try {
    // Read existing file
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge with new translations
    const updatedContent = {
      ...existingContent,
      ...pageTranslations[lang]
    };
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf8');
    
    console.log(`✅ Updated navigation.json for ${lang}`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}:`, error.message);
  }
}

// Update all language files
console.log('🚀 Adding page translations for Invite a Business Owner and Dott Status pages...\n');

languages.forEach(lang => {
  updateLanguageFile(lang);
});

console.log('\n🎉 All page translations have been added successfully!');
console.log('\nTranslation keys added:');
console.log('📧 Invite a Business Owner page:');
console.log('  - invite.title, invite.description1, invite.description2');
console.log('  - invite.formTitle, invite.methodLabel');
console.log('  - invite.emailButton, invite.whatsappButton');
console.log('  - invite.emailLabel, invite.phoneLabel');
console.log('  - invite.sendEmailButton, invite.sendWhatsappButton');
console.log('  - invite.whatsappMessage, invite.emailMessage');
console.log('  - invite.successMessage, invite.errorMessage, etc.');
console.log('');
console.log('📊 Dott Status page:');
console.log('  - status.title, status.subtitle, status.refresh');
console.log('  - status.overall.operational, status.overall.degraded');
console.log('  - status.serviceStatus.title, status.monitoring.title');
console.log('  - status.help.title, status.help.supportEmail, etc.');