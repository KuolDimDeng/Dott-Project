import fs from 'fs';
import path from 'path';

// Translation data for FAQ, Contact Form, and Footer sections
const missingSectionsTranslations = {
  it: {
    faq: {
      eyebrow: "FAQ",
      heading: "Domande frequenti",
      subheading: "Trova risposte alle domande comuni sulla nostra piattaforma e servizi.",
      global: {
        question: "Dott funziona per le aziende fuori dagli Stati Uniti?",
        answer: "Sì, Dott è progettato per funzionare globalmente. Supportiamo più valute, lingue e metodi di pagamento regionali. La nostra piattaforma è conforme alle normative fiscali di vari paesi, permettendoti di gestire la tua azienda ovunque nel mondo."
      },
      cost: {
        question: "Quanto costa?",
        answer: "Offriamo un piano Basic gratuito che include le funzionalità principali. Il nostro piano Professional costa €35/mese per le aziende in crescita, e il piano Enterprise €95/mese per grandi organizzazioni con utenti illimitati. Offriamo anche sconti del 50% per aziende nei paesi in via di sviluppo. Visita la nostra pagina dei prezzi per un confronto dettagliato."
      },
      onboarding: {
        question: "Quanto tempo ci vuole per configurarlo?",
        answer: "La maggior parte delle aziende diventa operativa con Dott in meno di un giorno. La nostra procedura guidata di configurazione intuitiva ti guida attraverso il processo, e il nostro team di successo clienti è disponibile per aiutarti se hai bisogno di assistenza. Se stai migrando da un altro sistema, offriamo strumenti per importare i tuoi dati esistenti."
      },
      support: {
        question: "Che tipo di supporto offrite?",
        answer: "Forniamo supporto clienti 24/7 via chat, email e telefono. Il nostro team è disponibile in più lingue per assistere aziende in diversi fusi orari. I piani premium includono account manager dedicati e supporto prioritario."
      },
      data: {
        question: "I miei dati aziendali sono sicuri?",
        answer: "Sì, prendiamo la sicurezza sul serio. Dott utilizza crittografia di livello bancario per proteggere i tuoi dati, audit di sicurezza regolari, ed è conforme a GDPR e altre normative regionali sulla protezione dei dati. I tuoi dati aziendali vengono sottoposti a backup regolari e archiviati in modo sicuro nel cloud."
      },
      integration: {
        question: "Posso integrare con altri strumenti che uso?",
        answer: "Assolutamente. Dott si integra con processori di pagamento popolari, software di contabilità, piattaforme e-commerce e altri strumenti aziendali. Offriamo anche un'API per integrazioni personalizzate. Controlla la nostra pagina delle integrazioni per un elenco completo dei servizi supportati."
      }
    },
    contact: {
      eyebrow: "Contattaci",
      heading: "Mettiti in contatto",
      subheading: "Hai domande su Dott? Il nostro team è qui per aiutarti a trovare la soluzione perfetta per la tua azienda.",
      infoTitle: "Informazioni di Contatto",
      infoSubtitle: "Compila il modulo o contattaci direttamente utilizzando le informazioni sottostanti.",
      email: "Email",
      address: "Indirizzo",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "Stati Uniti",
      form: {
        name: "Nome Completo",
        email: "Indirizzo Email",
        company: "Azienda",
        phone: "Numero di Telefono",
        subject: {
          label: "In cosa possiamo aiutarti?",
          general: "Richiesta Generale",
          sales: "Domanda Vendite",
          support: "Supporto Tecnico",
          demo: "Richiedi una Demo",
          partnership: "Opportunità di Partnership"
        },
        message: "Messaggio",
        submit: "Invia Messaggio",
        sending: "Invio..."
      },
      error: {
        name: "Il nome è obbligatorio",
        email: {
          required: "L'email è obbligatoria",
          invalid: "Inserisci un indirizzo email valido"
        },
        message: "Il messaggio è obbligatorio"
      },
      submitting: "Invio del tuo messaggio...",
      success: "Grazie per averci contattato! Ti risponderemo a breve.",
      error: "Impossibile inviare il tuo messaggio. Riprova o scrivici direttamente a support@dottapps.com."
    },
    footer: {
      footerHeading: "Footer",
      logoAlt: "Logo Dott",
      tagline: "Rendere la gestione aziendale semplice ed efficiente per le aziende di tutto il mondo.",
      home: "Home",
      features: "Funzionalità",
      pricing: "Prezzi",
      blog: "Blog",
      contact: "Contatti",
      product: "Prodotto",
      inventory: "Gestione Inventario",
      accounting: "Contabilità",
      invoicing: "Fatturazione",
      payments: "Pagamenti",
      pos: "Punto Vendita",
      company: "Azienda",
      about: "Chi Siamo",
      careers: "Carriere",
      press: "Stampa",
      partners: "Partner",
      support: "Supporto",
      help: "Centro Assistenza",
      docs: "Documentazione",
      status: "Stato del Sistema",
      security: "Sicurezza",
      legal: "Legale",
      privacy: "Politica sulla Privacy",
      terms: "Termini di Servizio",
      cookies: "Politica sui Cookie",
      rights: "Tutti i diritti riservati.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  pl: {
    faq: {
      eyebrow: "FAQ",
      heading: "Często zadawane pytania",
      subheading: "Znajdź odpowiedzi na najczęstsze pytania o naszą platformę i usługi.",
      global: {
        question: "Czy Dott działa dla firm spoza USA?",
        answer: "Tak, Dott został zaprojektowany do działania na całym świecie. Obsługujemy wiele walut, języków i regionalnych metod płatności. Nasza platforma jest zgodna z przepisami podatkowymi różnych krajów, pozwalając prowadzić biznes w dowolnym miejscu na świecie."
      },
      cost: {
        question: "Ile to kosztuje?",
        answer: "Oferujemy darmowy plan Basic, który zawiera podstawowe funkcje. Nasz plan Professional kosztuje 35$/miesiąc dla rozwijających się firm, a plan Enterprise 95$/miesiąc dla dużych organizacji z nieograniczoną liczbą użytkowników. Oferujemy również 50% zniżki dla firm w krajach rozwijających się. Odwiedź naszą stronę cenową, aby uzyskać szczegółowe porównanie."
      },
      onboarding: {
        question: "Ile czasu zajmuje konfiguracja?",
        answer: "Większość firm uruchamia się z Dott w mniej niż jeden dzień. Nasz intuicyjny kreator konfiguracji przeprowadzi Cię przez proces, a nasz zespół sukcesu klienta jest dostępny, aby pomóc, jeśli potrzebujesz wsparcia. Jeśli migrujesz z innego systemu, oferujemy narzędzia do importu istniejących danych."
      },
      support: {
        question: "Jaki rodzaj wsparcia oferujecie?",
        answer: "Zapewniamy 24/7 obsługę klienta przez czat, email i telefon. Nasz zespół jest dostępny w wielu językach, aby pomóc firmom w różnych strefach czasowych. Plany premium obejmują dedykowanych menedżerów kont i priorytetowe wsparcie."
      },
      data: {
        question: "Czy moje dane biznesowe są bezpieczne?",
        answer: "Tak, poważnie traktujemy bezpieczeństwo. Dott używa szyfrowania na poziomie bankowym do ochrony Twoich danych, regularne audyty bezpieczeństwa i jest zgodny z RODO i innymi regionalnymi przepisami o ochronie danych. Twoje dane biznesowe są regularnie archiwizowane i bezpiecznie przechowywane w chmurze."
      },
      integration: {
        question: "Czy mogę zintegrować z innymi narzędziami, których używam?",
        answer: "Absolutnie. Dott integruje się z popularnymi procesorami płatności, oprogramowaniem księgowym, platformami e-commerce i innymi narzędziami biznesowymi. Oferujemy również API do niestandardowych integracji. Sprawdź naszą stronę integracji, aby uzyskać pełną listę obsługiwanych usług."
      }
    },
    contact: {
      eyebrow: "Skontaktuj się z nami",
      heading: "Skontaktuj się",
      subheading: "Masz pytania o Dott? Nasz zespół jest tutaj, aby pomóc Ci znaleźć idealne rozwiązanie dla Twojej firmy.",
      infoTitle: "Informacje kontaktowe",
      infoSubtitle: "Wypełnij formularz lub skontaktuj się z nami bezpośrednio, korzystając z poniższych informacji.",
      email: "Email",
      address: "Adres",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "Stany Zjednoczone",
      form: {
        name: "Pełne imię i nazwisko",
        email: "Adres email",
        company: "Firma",
        phone: "Numer telefonu",
        subject: {
          label: "W czym możemy pomóc?",
          general: "Ogólne zapytanie",
          sales: "Pytanie o sprzedaż",
          support: "Wsparcie techniczne",
          demo: "Poproś o demo",
          partnership: "Możliwość partnerstwa"
        },
        message: "Wiadomość",
        submit: "Wyślij wiadomość",
        sending: "Wysyłanie..."
      },
      error: {
        name: "Imię jest wymagane",
        email: {
          required: "Email jest wymagany",
          invalid: "Wprowadź prawidłowy adres email"
        },
        message: "Wiadomość jest wymagana"
      },
      submitting: "Wysyłanie Twojej wiadomości...",
      success: "Dziękujemy za kontakt! Wkrótce się z Tobą skontaktujemy.",
      error: "Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz do nas bezpośrednio na support@dottapps.com."
    },
    footer: {
      footerHeading: "Stopka",
      logoAlt: "Logo Dott",
      tagline: "Sprawiamy, że zarządzanie biznesem jest proste i wydajne dla firm na całym świecie.",
      home: "Główna",
      features: "Funkcje",
      pricing: "Cennik",
      blog: "Blog",
      contact: "Kontakt",
      product: "Produkt",
      inventory: "Zarządzanie zapasami",
      accounting: "Księgowość",
      invoicing: "Fakturowanie",
      payments: "Płatności",
      pos: "Punkt sprzedaży",
      company: "Firma",
      about: "O nas",
      careers: "Kariera",
      press: "Prasa",
      partners: "Partnerzy",
      support: "Wsparcie",
      help: "Centrum pomocy",
      docs: "Dokumentacja",
      status: "Status systemu",
      security: "Bezpieczeństwo",
      legal: "Prawne",
      privacy: "Polityka prywatności",
      terms: "Warunki usługi",
      cookies: "Polityka cookies",
      rights: "Wszelkie prawa zastrzeżone.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  th: {
    faq: {
      eyebrow: "คำถามที่พบบ่อย",
      heading: "คำถามที่พบบ่อย",
      subheading: "ค้นหาคำตอบสำหรับคำถามทั่วไปเกี่ยวกับแพลตฟอร์มและบริการของเรา",
      global: {
        question: "Dott ใช้งานได้กับธุรกิจนอกสหรัฐอเมริกาหรือไม่?",
        answer: "ได้ครับ Dott ถูกออกแบบมาเพื่อใช้งานทั่วโลก เราสนับสนุนหลายสกุลเงิน หลายภาษา และวิธีการชำระเงินในแต่ละภูมิภาค แพลตฟอร์มของเราปฏิบัติตามกฎระเบียบภาษีในหลายประเทศ ทำให้คุณสามารถดำเนินธุรกิจได้ทุกที่ในโลก"
      },
      cost: {
        question: "ราคาเท่าไหร่?",
        answer: "เรามีแผน Basic ฟรีที่รวมฟีเจอร์หลัก แผน Professional ของเราราคา $35/เดือนสำหรับธุรกิจที่กำลังเติบโต และแผน Enterprise $95/เดือนสำหรับองค์กรขนาดใหญ่ที่มีผู้ใช้ไม่จำกัด เรายังมีส่วนลด 50% สำหรับธุรกิจในประเทศกำลังพัฒนา เยี่ยมชมหน้าราคาของเราเพื่อดูการเปรียบเทียบโดยละเอียด"
      },
      onboarding: {
        question: "ใช้เวลาเท่าไหร่ในการตั้งค่า?",
        answer: "ธุรกิจส่วนใหญ่สามารถเริ่มใช้งาน Dott ได้ในเวลาไม่ถึงหนึ่งวัน วิซาร์ดการตั้งค่าที่ใช้งานง่ายของเราจะแนะนำคุณตลอดกระบวนการ และทีมความสำเร็จของลูกค้าพร้อมให้ความช่วยเหลือหากคุณต้องการความช่วยเหลือ หากคุณกำลังย้ายจากระบบอื่น เรามีเครื่องมือในการนำเข้าข้อมูลที่มีอยู่"
      },
      support: {
        question: "คุณให้การสนับสนุนแบบไหน?",
        answer: "เราให้การสนับสนุนลูกค้า 24/7 ผ่านแชท อีเมล และโทรศัพท์ ทีมของเรามีบริการในหลายภาษาเพื่อช่วยเหลือธุรกิจในเขตเวลาต่างๆ แผนพรีเมียมรวมถึงผู้จัดการบัญชีเฉพาะและการสนับสนุนแบบลำดับความสำคัญ"
      },
      data: {
        question: "ข้อมูลธุรกิจของฉันปลอดภัยหรือไม่?",
        answer: "ใช่ เราให้ความสำคัญกับความปลอดภัยอย่างจริงจัง Dott ใช้การเข้ารหัสระดับธนาคารเพื่อปกป้องข้อมูลของคุณ การตรวจสอบความปลอดภัยเป็นประจำ และปฏิบัติตาม GDPR และกฎระเบียบการปกป้องข้อมูลในภูมิภาคอื่นๆ ข้อมูลธุรกิจของคุณจะได้รับการสำรองข้อมูลเป็นประจำและจัดเก็บอย่างปลอดภัยในคลาวด์"
      },
      integration: {
        question: "ฉันสามารถรวมกับเครื่องมืออื่นที่ฉันใช้ได้หรือไม่?",
        answer: "แน่นอน Dott รวมกับโปรเซสเซอร์การชำระเงินยอดนิยม ซอฟต์แวร์บัญชี แพลตฟอร์มอีคอมเมิร์ส และเครื่องมือธุรกิจอื่นๆ เรายังมี API สำหรับการรวมแบบกำหนดเอง ตรวจสอบหน้าการรวมของเราสำหรับรายการบริการที่รองรับทั้งหมด"
      }
    },
    contact: {
      eyebrow: "ติดต่อเรา",
      heading: "ติดต่อเรา",
      subheading: "มีคำถามเกี่ยวกับ Dott หรือไม่? ทีมของเราพร้อมช่วยคุณหาโซลูชันที่เหมาะสมสำหรับธุรกิจของคุณ",
      infoTitle: "ข้อมูลการติดต่อ",
      infoSubtitle: "กรอกแบบฟอร์มหรือติดต่อเราโดยตรงโดยใช้ข้อมูลด้านล่าง",
      email: "อีเมล",
      address: "ที่อยู่",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "สหรัฐอเมริกา",
      form: {
        name: "ชื่อเต็ม",
        email: "ที่อยู่อีเมล",
        company: "บริษัท",
        phone: "หมายเลขโทรศัพท์",
        subject: {
          label: "เราสามารถช่วยคุณในเรื่องอะไร?",
          general: "คำถามทั่วไป",
          sales: "คำถามเกี่ยวกับการขาย",
          support: "การสนับสนุนทางเทคนิค",
          demo: "ขอดูการสาธิต",
          partnership: "โอกาสการเป็นพันธมิตร"
        },
        message: "ข้อความ",
        submit: "ส่งข้อความ",
        sending: "กำลังส่ง..."
      },
      error: {
        name: "จำเป็นต้องใส่ชื่อ",
        email: {
          required: "จำเป็นต้องใส่อีเมล",
          invalid: "กรุณาใส่ที่อยู่อีเมลที่ถูกต้อง"
        },
        message: "จำเป็นต้องใส่ข้อความ"
      },
      submitting: "กำลังส่งข้อความของคุณ...",
      success: "ขอบคุณที่ติดต่อเรา! เราจะติดต่อกลับไปเร็วๆ นี้",
      error: "ไม่สามารถส่งข้อความของคุณได้ กรุณาลองใหม่อีกครั้งหรือส่งอีเมลถึงเราโดยตรงที่ support@dottapps.com"
    },
    footer: {
      footerHeading: "ส่วนท้าย",
      logoAlt: "โลโก้ Dott",
      tagline: "ทำให้การจัดการธุรกิจเป็นเรื่องง่ายและมีประสิทธิภาพสำหรับบริษัททั่วโลก",
      home: "หน้าแรก",
      features: "คุณสมบัติ",
      pricing: "ราคา",
      blog: "บล็อก",
      contact: "ติดต่อ",
      product: "ผลิตภัณฑ์",
      inventory: "การจัดการสินค้าคงคลัง",
      accounting: "บัญชี",
      invoicing: "การออกใบแจ้งหนี้",
      payments: "การชำระเงิน",
      pos: "จุดขาย",
      company: "บริษัท",
      about: "เกี่ยวกับเรา",
      careers: "อาชีพ",
      press: "สื่อมวลชน",
      partners: "พันธมิตร",
      support: "สนับสนุน",
      help: "ศูนย์ช่วยเหลือ",
      docs: "เอกสาร",
      status: "สถานะระบบ",
      security: "ความปลอดภัย",
      legal: "กฎหมาย",
      privacy: "นโยบายความเป็นส่วนตัว",
      terms: "เงื่อนไขการบริการ",
      cookies: "นโยบายคุกกี้",
      rights: "สงวนลิขสิทธิ์ทั้งหมด",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  bn: {
    faq: {
      eyebrow: "প্রশ্নোত্তর",
      heading: "প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী",
      subheading: "আমাদের প্ল্যাটফর্ম এবং সেবা সম্পর্কে সাধারণ প্রশ্নের উত্তর খুঁজুন।",
      global: {
        question: "Dott কি মার্কিন যুক্তরাষ্ট্রের বাইরের ব্যবসার জন্য কাজ করে?",
        answer: "হ্যাঁ, Dott বিশ্বব্যাপী কাজ করার জন্য ডিজাইন করা হয়েছে। আমরা একাধিক মুদ্রা, ভাষা এবং আঞ্চলিক পেমেন্ট পদ্ধতি সমর্থন করি। আমাদের প্ল্যাটফর্ম বিভিন্ন দেশের কর নিয়মকানুন মেনে চলে, যা আপনাকে বিশ্বের যেকোনো জায়গায় আপনার ব্যবসা চালাতে দেয়।"
      },
      cost: {
        question: "এর দাম কত?",
        answer: "আমরা একটি বিনামূল্যে বেসিক প্ল্যান অফার করি যাতে মূল বৈশিষ্ট্যগুলি রয়েছে। আমাদের প্রফেশনাল প্ল্যান ক্রমবর্ধমান ব্যবসার জন্য $৩৫/মাস, এবং আমাদের এন্টারপ্রাইজ প্ল্যান সীমাহীন ব্যবহারকারীসহ বড় প্রতিষ্ঠানের জন্য $৯৫/মাস। আমরা উন্নয়নশীল দেশের ব্যবসার জন্য ৫০% ছাড়ও অফার করি। বিস্তারিত তুলনার জন্য আমাদের মূল্য পৃষ্ঠা দেখুন।"
      },
      onboarding: {
        question: "সেটআপ করতে কত সময় লাগে?",
        answer: "বেশিরভাগ ব্যবসা এক দিনের কম সময়ে Dott দিয়ে চালু হয়ে যায়। আমাদের স্বজ্ঞাত সেটআপ উইজার্ড আপনাকে প্রক্রিয়ার মাধ্যমে গাইড করে, এবং আপনার সহায়তার প্রয়োজন হলে আমাদের গ্রাহক সাফল্য দল সাহায্য করতে উপলব্ধ। আপনি যদি অন্য সিস্টেম থেকে মাইগ্রেট করেন, আমরা আপনার বিদ্যমান ডেটা আমদানি করার জন্য টুল অফার করি।"
      },
      support: {
        question: "আপনারা কী ধরনের সহায়তা প্রদান করেন?",
        answer: "আমরা চ্যাট, ইমেইল এবং ফোনের মাধ্যমে ২৪/৭ গ্রাহক সহায়তা প্রদান করি। আমাদের দল বিভিন্ন সময় অঞ্চলের ব্যবসাগুলিকে সহায়তা করার জন্য একাধিক ভাষায় উপলব্ধ। প্রিমিয়াম প্ল্যানে নিবেদিত অ্যাকাউন্ট ম্যানেজার এবং অগ্রাধিকার সহায়তা অন্তর্ভুক্ত রয়েছে।"
      },
      data: {
        question: "আমার ব্যবসায়িক ডেটা কি নিরাপদ?",
        answer: "হ্যাঁ, আমরা নিরাপত্তাকে গুরুত্ব সহকারে নিই। Dott আপনার ডেটা রক্ষা করতে ব্যাংক-স্তরের এনক্রিপশন, নিয়মিত নিরাপত্তা অডিট ব্যবহার করে এবং GDPR এবং অন্যান্য আঞ্চলিক ডেটা সুরক্ষা নিয়মকানুন মেনে চলে। আপনার ব্যবসায়িক ডেটা নিয়মিতভাবে ব্যাকআপ হয় এবং ক্লাউডে নিরাপদে সংরক্ষিত হয়।"
      },
      integration: {
        question: "আমি যে অন্যান্য টুলগুলি ব্যবহার করি তার সাথে কি ইন্টিগ্রেট করতে পারি?",
        answer: "অবশ্যই। Dott জনপ্রিয় পেমেন্ট প্রসেসর, অ্যাকাউন্টিং সফটওয়্যার, ই-কমার্স প্ল্যাটফর্ম এবং অন্যান্য ব্যবসায়িক টুলের সাথে ইন্টিগ্রেট করে। আমরা কাস্টম ইন্টিগ্রেশনের জন্য একটি API-ও অফার করি। সমর্থিত সেবাগুলির সম্পূর্ণ তালিকার জন্য আমাদের ইন্টিগ্রেশন পৃষ্ঠা দেখুন।"
      }
    },
    contact: {
      eyebrow: "যোগাযোগ করুন",
      heading: "যোগাযোগ করুন",
      subheading: "Dott সম্পর্কে প্রশ্ন আছে? আমাদের দল আপনার ব্যবসার জন্য নিখুঁত সমাধান খুঁজে পেতে সাহায্য করতে এখানে রয়েছে।",
      infoTitle: "যোগাযোগের তথ্য",
      infoSubtitle: "ফর্মটি পূরণ করুন বা নিচের তথ্য ব্যবহার করে সরাসরি আমাদের সাথে যোগাযোগ করুন।",
      email: "ইমেইল",
      address: "ঠিকানা",
      addressLine1: "৮০০ এন কিং স্ট্রিট",
      addressLine2: "স্যুট ৩০৪ #২৭৯৭",
      addressLine3: "উইলমিংটন, ডিই ১৯৮০১",
      addressLine4: "যুক্তরাষ্ট্র",
      form: {
        name: "পূর্ণ নাম",
        email: "ইমেইল ঠিকানা",
        company: "কোম্পানি",
        phone: "ফোন নম্বর",
        subject: {
          label: "আমরা কীভাবে আপনাকে সাহায্য করতে পারি?",
          general: "সাধারণ জিজ্ঞাসা",
          sales: "বিক্রয় প্রশ্ন",
          support: "প্রযুক্তিগত সহায়তা",
          demo: "ডেমোর অনুরোধ",
          partnership: "অংশীদারিত্বের সুযোগ"
        },
        message: "বার্তা",
        submit: "বার্তা পাঠান",
        sending: "পাঠানো হচ্ছে..."
      },
      error: {
        name: "নাম প্রয়োজন",
        email: {
          required: "ইমেইল প্রয়োজন",
          invalid: "দয়া করে একটি বৈধ ইমেইল ঠিকানা লিখুন"
        },
        message: "বার্তা প্রয়োজন"
      },
      submitting: "আপনার বার্তা পাঠানো হচ্ছে...",
      success: "যোগাযোগ করার জন্য ধন্যবাদ! আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
      error: "আপনার বার্তা পাঠাতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন বা সরাসরি support@dottapps.com এ ইমেইল করুন।"
    },
    footer: {
      footerHeading: "ফুটার",
      logoAlt: "Dott লোগো",
      tagline: "বিশ্বব্যাপী কোম্পানিগুলির জন্য ব্যবসা ব্যবস্থাপনাকে সহজ এবং দক্ষ করে তোলা।",
      home: "হোম",
      features: "বৈশিষ্ট্য",
      pricing: "মূল্য",
      blog: "ব্লগ",
      contact: "যোগাযোগ",
      product: "পণ্য",
      inventory: "ইনভেন্টরি ব্যবস্থাপনা",
      accounting: "হিসাবরক্ষণ",
      invoicing: "ইনভয়েসিং",
      payments: "পেমেন্ট",
      pos: "পয়েন্ট অফ সেল",
      company: "কোম্পানি",
      about: "আমাদের সম্পর্কে",
      careers: "ক্যারিয়ার",
      press: "প্রেস",
      partners: "অংশীদার",
      support: "সহায়তা",
      help: "সহায়তা কেন্দ্র",
      docs: "ডকুমেন্টেশন",
      status: "সিস্টেম স্ট্যাটাস",
      security: "নিরাপত্তা",
      legal: "আইনি",
      privacy: "গোপনীয়তা নীতি",
      terms: "সেবার শর্তাবলী",
      cookies: "কুকি নীতি",
      rights: "সকল অধিকার সংরক্ষিত।",
      social: {
        facebook: "ফেসবুক",
        twitter: "টুইটার",
        linkedin: "লিংকডইন"
      }
    }
  },
  ur: {
    faq: {
      eyebrow: "اکثر پوچھے جانے والے سوالات",
      heading: "اکثر پوچھے جانے والے سوالات",
      subheading: "ہمارے پلیٹ فارم اور خدمات کے بارے میں عام سوالات کے جوابات تلاش کریں۔",
      global: {
        question: "کیا Dott امریکہ سے باہر کے کاروبار کے لیے کام کرتا ہے؟",
        answer: "جی ہاں، Dott عالمی سطح پر کام کرنے کے لیے ڈیزائن کیا گیا ہے۔ ہم متعدد کرنسیاں، زبانیں، اور علاقائی ادائیگی کے طریقے سپورٹ کرتے ہیں۔ ہمارا پلیٹ فارم مختلف ممالک میں ٹیکس ریگولیشنز کے ساتھ comply کرتا ہے، جو آپ کو دنیا میں کہیں بھی اپنا کاروبار چلانے کی اجازت دیتا ہے۔"
      },
      cost: {
        question: "اس کی لاگت کیا ہے؟",
        answer: "ہم ایک مفت بنیادی پلان پیش کرتے ہیں جس میں بنیادی فیچرز شامل ہیں۔ ہمارا پروفیشنل پلان بڑھتے ہوئے کاروبار کے لیے $35/ماہ ہے، اور ہمارا انٹرپرائز پلان لامحدود صارفین کے ساتھ بڑی تنظیموں کے لیے $95/ماہ ہے۔ ہم ترقی پذیر ممالک میں کاروبار کے لیے 50% رعایت بھی دیتے ہیں۔ تفصیلی موازنے کے لیے ہمارے قیمت کا صفحہ دیکھیں۔"
      },
      onboarding: {
        question: "سیٹ اپ کرنے میں کتنا وقت لگتا ہے؟",
        answer: "زیادہ تر کاروبار ایک دن سے کم وقت میں Dott کے ساتھ شروع ہو جاتے ہیں۔ ہمارا بدیہی سیٹ اپ وزرڈ آپ کو پروسیس کے ذریعے رہنمائی کرتا ہے، اور اگر آپ کو مدد کی ضرورت ہو تو ہماری کسٹمر سکسیس ٹیم دستیاب ہے۔ اگر آپ کسی اور سسٹم سے منتقل ہو رہے ہیں، تو ہم آپ کے موجودہ ڈیٹا کو import کرنے کے لیے ٹولز فراہم کرتے ہیں۔"
      },
      support: {
        question: "آپ کس قسم کی سپورٹ پیش کرتے ہیں؟",
        answer: "ہم چیٹ، ای میل، اور فون کے ذریعے 24/7 کسٹمر سپورٹ فراہم کرتے ہیں۔ ہماری ٹیم مختلف ٹائم زونز میں کاروبار کی مدد کے لیے متعدد زبانوں میں دستیاب ہے۔ پریمیم پلانز میں مخصوص اکاؤنٹ منیجرز اور ترجیحی سپورٹ شامل ہے۔"
      },
      data: {
        question: "کیا میرا کاروباری ڈیٹا محفوظ ہے؟",
        answer: "جی ہاں، ہم سیکیورٹی کو سنجیدگی سے لیتے ہیں۔ Dott آپ کے ڈیٹا کی حفاظت کے لیے بینک لیول انکرپشن، باقاعدگی سے سیکیورٹی آڈٹس استعمال کرتا ہے، اور GDPR اور دیگر علاقائی ڈیٹا پروٹیکشن ریگولیشنز کا پابند ہے۔ آپ کا کاروباری ڈیٹا باقاعدگی سے بیک اپ ہوتا ہے اور کلاؤڈ میں محفوظ طریقے سے محفوظ ہے۔"
      },
      integration: {
        question: "کیا میں دوسرے ٹولز کے ساتھ integrate کر سکتا ہوں جو میں استعمال کرتا ہوں؟",
        answer: "بالکل۔ Dott مقبول پیمنٹ پروسیسرز، اکاؤنٹنگ سافٹ ویئر، ای کامرس پلیٹ فارمز، اور دیگر کاروباری ٹولز کے ساتھ integrate کرتا ہے۔ ہم کسٹم integrations کے لیے API بھی پیش کرتے ہیں۔ سپورٹ کردہ خدمات کی مکمل فہرست کے لیے ہمارے integration صفحے کو چیک کریں۔"
      }
    },
    contact: {
      eyebrow: "رابطہ کریں",
      heading: "رابطے میں رہیں",
      subheading: "Dott کے بارے میں سوالات ہیں؟ ہماری ٹیم آپ کے کاروبار کے لیے بہترین حل تلاش کرنے میں آپ کی مدد کے لیے یہاں ہے۔",
      infoTitle: "رابطے کی معلومات",
      infoSubtitle: "فارم بھریں یا نیچے دی گئی معلومات استعمال کرکے براہ راست ہم سے رابطہ کریں۔",
      email: "ای میل",
      address: "پتہ",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "ریاستہائے متحدہ",
      form: {
        name: "پورا نام",
        email: "ای میل ایڈریس",
        company: "کمپنی",
        phone: "فون نمبر",
        subject: {
          label: "ہم آپ کی کیا مدد کر سکتے ہیں؟",
          general: "عمومی استفسار",
          sales: "سیلز کا سوال",
          support: "تکنیکی سپورٹ",
          demo: "ڈیمو کی درخواست",
          partnership: "پارٹنرشپ کا موقع"
        },
        message: "پیغام",
        submit: "پیغام بھیجیں",
        sending: "بھیجا جا رہا ہے..."
      },
      error: {
        name: "نام ضروری ہے",
        email: {
          required: "ای میل ضروری ہے",
          invalid: "براہ کرم درست ای میل ایڈریس داخل کریں"
        },
        message: "پیغام ضروری ہے"
      },
      submitting: "آپ کا پیغام بھیجا جا رہا ہے...",
      success: "رابطے کے لیے شکریہ! ہم جلد ہی آپ سے رابطہ کریں گے۔",
      error: "آپ کا پیغام بھیجنے میں ناکام۔ براہ کرم دوبارہ کوشش کریں یا براہ راست support@dottapps.com پر ای میل کریں۔"
    },
    footer: {
      footerHeading: "فوٹر",
      logoAlt: "Dott لوگو",
      tagline: "دنیا بھر کی کمپنیوں کے لیے کاروباری انتظام کو آسان اور موثر بنانا۔",
      home: "ہوم",
      features: "خصوصیات",
      pricing: "قیمت",
      blog: "بلاگ",
      contact: "رابطہ",
      product: "پروڈکٹ",
      inventory: "انوینٹری مینجمنٹ",
      accounting: "اکاؤنٹنگ",
      invoicing: "انوائسنگ",
      payments: "پیمنٹس",
      pos: "پوائنٹ آف سیل",
      company: "کمپنی",
      about: "ہمارے بارے میں",
      careers: "کیریئر",
      press: "پریس",
      partners: "پارٹنرز",
      support: "سپورٹ",
      help: "ہیلپ سینٹر",
      docs: "دستاویزات",
      status: "سسٹم کی صورتحال",
      security: "سیکیورٹی",
      legal: "قانونی",
      privacy: "رازداری کی پالیسی",
      terms: "خدمات کی شرائط",
      cookies: "کوکی پالیسی",
      rights: "تمام حقوق محفوظ ہیں۔",
      social: {
        facebook: "فیس بک",
        twitter: "ٹوئٹر",
        linkedin: "لنکڈان"
      }
    }
  },
  tl: {
    faq: {
      eyebrow: "FAQ",
      heading: "Mga madalas na tanong",
      subheading: "Hanapin ang mga sagot sa mga karaniwang tanong tungkol sa aming platform at mga serbisyo.",
      global: {
        question: "Gumagana ba ang Dott para sa mga negosyo sa labas ng US?",
        answer: "Oo, ang Dott ay dinisenyo para gumana sa buong mundo. Sinusuportahan namin ang maraming currency, wika, at mga regional na paraan ng pagbayad. Ang aming platform ay sumusunod sa mga tax regulation sa iba't ibang bansa, na nagbibigay-daan sa inyo na magpatakbo ng negosyo kahit saan sa mundo."
      },
      cost: {
        question: "Magkano ang gastos?",
        answer: "Nag-offer kami ng libreng Basic plan na may mga pangunahing feature. Ang aming Professional plan ay $35/buwan para sa mga lumalaking negosyo, at ang aming Enterprise plan ay $95/buwan para sa malalaking organisasyon na may walang limitasyong mga user. Nag-offer din kami ng 50% discount para sa mga negosyo sa mga developing countries. Bisitahin ang aming pricing page para sa detalyadong paghahambing."
      },
      onboarding: {
        question: "Gaano katagal ang pag-setup?",
        answer: "Karamihan ng mga negosyo ay nakakapag-up and running sa Dott sa loob ng kulang sa isang araw. Ang aming intuitive setup wizard ay gagabay sa inyo sa proseso, at ang aming customer success team ay available para tumulong kung kailangan ninyo ng tulong. Kung nag-migrate kayo mula sa ibang system, nag-offer kami ng mga tool para ma-import ang inyong existing data."
      },
      support: {
        question: "Anong uri ng suporta ang inyo-offer?",
        answer: "Nagbibigay kami ng 24/7 customer support sa pamamagitan ng chat, email, at phone. Ang aming team ay available sa maraming wika para tumulong sa mga negosyo sa iba't ibang time zone. Ang mga premium plan ay may kasamang dedicated account manager at priority support."
      },
      data: {
        question: "Secure ba ang aking business data?",
        answer: "Oo, sineseryoso namin ang security. Gumagamit ang Dott ng bank-level encryption para protektahan ang inyong data, regular security audit, at sumusunod sa GDPR at iba pang regional data protection regulation. Ang inyong business data ay regular na nababackup at secure na nakastore sa cloud."
      },
      integration: {
        question: "Pwede ba akong mag-integrate sa iba pang tools na ginagamit ko?",
        answer: "Syempre. Nag-iintegrate ang Dott sa mga sikat na payment processor, accounting software, e-commerce platform, at iba pang business tool. Nag-offer din kami ng API para sa mga custom integration. I-check ang aming integration page para sa buong listahan ng mga supported service."
      }
    },
    contact: {
      eyebrow: "Makipag-ugnayan",
      heading: "Makipag-ugnayan",
      subheading: "May mga tanong tungkol sa Dott? Nandito ang aming team para tulungan kayong mahanap ang perpektong solusyon para sa inyong negosyo.",
      infoTitle: "Contact Information",
      infoSubtitle: "Punan ang form o direktang makipag-ugnayan sa amin gamit ang impormasyon sa baba.",
      email: "Email",
      address: "Address",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "United States",
      form: {
        name: "Buong Pangalan",
        email: "Email Address",
        company: "Kumpanya",
        phone: "Phone Number",
        subject: {
          label: "Paano namin kayo matutulungan?",
          general: "General na Tanong",
          sales: "Sales na Tanong",
          support: "Technical Support",
          demo: "Humingi ng Demo",
          partnership: "Partnership Opportunity"
        },
        message: "Mensahe",
        submit: "Ipadala ang Mensahe",
        sending: "Pinapadala..."
      },
      error: {
        name: "Kailangan ang pangalan",
        email: {
          required: "Kailangan ang email",
          invalid: "Maglagay ng wastong email address"
        },
        message: "Kailangan ang mensahe"
      },
      submitting: "Pinapadala ang inyong mensahe...",
      success: "Salamat sa pag-contact! Makikipag-ugnayan kami sa inyo kaagad.",
      error: "Hindi naipadala ang inyong mensahe. Subukan ulit o mag-email direkta sa support@dottapps.com."
    },
    footer: {
      footerHeading: "Footer",
      logoAlt: "Dott Logo",
      tagline: "Ginagawang simple at efficient ang business management para sa mga kumpanya sa buong mundo.",
      home: "Home",
      features: "Features",
      pricing: "Pricing",
      blog: "Blog",
      contact: "Contact",
      product: "Product",
      inventory: "Inventory Management",
      accounting: "Accounting",
      invoicing: "Invoicing",
      payments: "Payments",
      pos: "Point of Sale",
      company: "Company",
      about: "About Us",
      careers: "Careers",
      press: "Press",
      partners: "Partners",
      support: "Support",
      help: "Help Center",
      docs: "Documentation",
      status: "System Status",
      security: "Security",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      cookies: "Cookie Policy",
      rights: "Lahat ng karapatan ay nakalaan.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  uk: {
    faq: {
      eyebrow: "FAQ",
      heading: "Часті питання",
      subheading: "Знайдіть відповіді на поширені запитання про нашу платформу та послуги.",
      global: {
        question: "Чи працює Dott для бізнесу поза США?",
        answer: "Так, Dott розроблений для роботи в усьому світі. Ми підтримуємо кілька валют, мов та регіональні способи оплати. Наша платформа відповідає податковим нормам різних країн, дозволяючи вам вести бізнес будь-де у світі."
      },
      cost: {
        question: "Скільки це коштує?",
        answer: "Ми пропонуємо безкоштовний план Basic, який включає основні функції. Наш план Professional коштує $35/місяць для зростаючих підприємств, а наш план Enterprise — $95/місяць для великих організацій з необмеженою кількістю користувачів. Ми також пропонуємо 50% знижку для підприємств у країнах, що розвиваються. Відвідайте нашу сторінку з цінами для детального порівняння."
      },
      onboarding: {
        question: "Скільки часу займає налаштування?",
        answer: "Більшість підприємств запускаються з Dott менш ніж за день. Наш інтуїтивний майстер налаштування проведе вас через процес, а наша команда успіху клієнтів доступна для допомоги, якщо вам потрібна підтримка. Якщо ви мігруєте з іншої системи, ми пропонуємо інструменти для імпорту ваших існуючих даних."
      },
      support: {
        question: "Який тип підтримки ви пропонуєте?",
        answer: "Ми надаємо 24/7 підтримку клієнтів через чат, електронну пошту та телефон. Наша команда доступна кількома мовами для допомоги підприємствам у різних часових поясах. Преміум плани включають виділених менеджерів облікових записів та пріоритетну підтримку."
      },
      data: {
        question: "Чи безпечні мої бізнес-дані?",
        answer: "Так, ми серйозно ставимося до безпеки. Dott використовує шифрування банківського рівня для захисту ваших даних, регулярні аудити безпеки та відповідає GDPR та іншим регіональним нормам захисту даних. Ваші бізнес-дані регулярно резервуються та безпечно зберігаються в хмарі."
      },
      integration: {
        question: "Чи можу я інтегруватися з іншими інструментами, які використовую?",
        answer: "Звичайно. Dott інтегрується з популярними процесорами платежів, бухгалтерським програмним забезпеченням, платформами електронної комерції та іншими бізнес-інструментами. Ми також пропонуємо API для користувацьких інтеграцій. Перевірте нашу сторінку інтеграцій для повного списку підтримуваних послуг."
      }
    },
    contact: {
      eyebrow: "Зв'яжіться з нами",
      heading: "Зв'яжіться",
      subheading: "Є питання про Dott? Наша команда тут, щоб допомогти вам знайти ідеальне рішення для вашого бізнесу.",
      infoTitle: "Контактна інформація",
      infoSubtitle: "Заповніть форму або зверніться до нас безпосередньо, використовуючи інформацію нижче.",
      email: "Електронна пошта",
      address: "Адреса",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "Сполучені Штати",
      form: {
        name: "Повне ім'я",
        email: "Адреса електронної пошти",
        company: "Компанія",
        phone: "Номер телефону",
        subject: {
          label: "Чим ми можемо допомогти?",
          general: "Загальний запит",
          sales: "Питання про продажі",
          support: "Технічна підтримка",
          demo: "Запросити демо",
          partnership: "Можливість партнерства"
        },
        message: "Повідомлення",
        submit: "Надіслати повідомлення",
        sending: "Надсилання..."
      },
      error: {
        name: "Ім'я обов'язкове",
        email: {
          required: "Електронна пошта обов'язкова",
          invalid: "Будь ласка, введіть правильну адресу електронної пошти"
        },
        message: "Повідомлення обов'язкове"
      },
      submitting: "Надсилання вашого повідомлення...",
      success: "Дякуємо за звернення! Ми зв'яжемося з вами найближчим часом.",
      error: "Не вдалося надіслати ваше повідомлення. Спробуйте ще раз або напишіть безпосередньо на support@dottapps.com."
    },
    footer: {
      footerHeading: "Нижній колонтитул",
      logoAlt: "Логотип Dott",
      tagline: "Робимо управління бізнесом простим та ефективним для компаній у всьому світі.",
      home: "Головна",
      features: "Функції",
      pricing: "Ціни",
      blog: "Блог",
      contact: "Контакти",
      product: "Продукт",
      inventory: "Управління запасами",
      accounting: "Бухгалтерія",
      invoicing: "Виставлення рахунків",
      payments: "Платежі",
      pos: "Точка продажу",
      company: "Компанія",
      about: "Про нас",
      careers: "Кар'єра",
      press: "Преса",
      partners: "Партнери",
      support: "Підтримка",
      help: "Центр допомоги",
      docs: "Документація",
      status: "Статус системи",
      security: "Безпека",
      legal: "Правова інформація",
      privacy: "Політика конфіденційності",
      terms: "Умови використання",
      cookies: "Політика файлів cookie",
      rights: "Всі права захищені.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  fa: {
    faq: {
      eyebrow: "سوالات متداول",
      heading: "سوالات متداول",
      subheading: "پاسخ سوالات رایج در مورد پلتفرم و خدمات ما را پیدا کنید.",
      global: {
        question: "آیا Dott برای کسب‌وکارهای خارج از آمریکا کار می‌کند؟",
        answer: "بله، Dott برای کار در سراسر جهان طراحی شده است. ما از چندین ارز، زبان و روش‌های پرداخت منطقه‌ای پشتیبانی می‌کنیم. پلتفرم ما با مقررات مالیاتی کشورهای مختلف مطابقت دارد و به شما امکان اداره کسب‌وکار در هر نقطه از جهان را می‌دهد."
      },
      cost: {
        question: "هزینه آن چقدر است؟",
        answer: "ما یک طرح رایگان Basic ارائه می‌دهیم که شامل ویژگی‌های اصلی است. طرح Professional ما $35/ماه برای کسب‌وکارهای در حال رشد و طرح Enterprise ما $95/ماه برای سازمان‌های بزرگ با کاربران نامحدود است. همچنین 50% تخفیف برای کسب‌وکارها در کشورهای در حال توسعه ارائه می‌دهیم. برای مقایسه تفصیلی به صفحه قیمت‌گذاری ما مراجعه کنید."
      },
      onboarding: {
        question: "راه‌اندازی چقدر طول می‌کشد؟",
        answer: "اکثر کسب‌وکارها در کمتر از یک روز با Dott راه‌اندازی می‌شوند. جادوگر راه‌اندازی بصری ما شما را در طول فرآیند راهنمایی می‌کند و تیم موفقیت مشتری ما در صورت نیاز به کمک در دسترس است. اگر از سیستم دیگری مهاجرت می‌کنید، ابزارهایی برای وارد کردن داده‌های موجود شما ارائه می‌دهیم."
      },
      support: {
        question: "چه نوع پشتیبانی ارائه می‌دهید؟",
        answer: "ما پشتیبانی مشتری 24/7 از طریق چت، ایمیل و تلفن ارائه می‌دهیم. تیم ما به چندین زبان برای کمک به کسب‌وکارها در مناطق زمانی مختلف در دسترس است. طرح‌های پریمیم شامل مدیران حساب اختصاصی و پشتیبانی اولویت‌دار است."
      },
      data: {
        question: "آیا داده‌های کسب‌وکار من امن است؟",
        answer: "بله، ما امنیت را جدی می‌گیریم. Dott از رمزگذاری سطح بانکی برای محافظت از داده‌های شما، ممیزی‌های امنیتی منظم استفاده می‌کند و با GDPR و سایر مقررات محافظت از داده‌های منطقه‌ای مطابقت دارد. داده‌های کسب‌وکار شما به طور منظم پشتیبان‌گیری شده و به صورت امن در ابر ذخیره می‌شود."
      },
      integration: {
        question: "آیا می‌توانم با ابزارهای دیگری که استفاده می‌کنم ادغام کنم؟",
        answer: "مطلقاً. Dott با پردازنده‌های پرداخت محبوب، نرم‌افزار حسابداری، پلتفرم‌های تجارت الکترونیک و سایر ابزارهای کسب‌وکار ادغام می‌شود. همچنین API برای ادغام‌های سفارشی ارائه می‌دهیم. صفحه ادغام ما را برای فهرست کامل خدمات پشتیبانی شده بررسی کنید."
      }
    },
    contact: {
      eyebrow: "تماس با ما",
      heading: "در تماس باشید",
      subheading: "سوالی درباره Dott دارید؟ تیم ما اینجاست تا به شما کمک کند راه‌حل کاملی برای کسب‌وکارتان پیدا کنید.",
      infoTitle: "اطلاعات تماس",
      infoSubtitle: "فرم را پر کنید یا با استفاده از اطلاعات زیر مستقیماً با ما تماس بگیرید.",
      email: "ایمیل",
      address: "آدرس",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "ایالات متحده آمریکا",
      form: {
        name: "نام کامل",
        email: "آدرس ایمیل",
        company: "شرکت",
        phone: "شماره تلفن",
        subject: {
          label: "چطور می‌تونیم کمکتان کنیم؟",
          general: "استعلام عمومی",
          sales: "سوال فروش",
          support: "پشتیبانی فنی",
          demo: "درخواست نمایش",
          partnership: "فرصت همکاری"
        },
        message: "پیام",
        submit: "ارسال پیام",
        sending: "در حال ارسال..."
      },
      error: {
        name: "نام الزامی است",
        email: {
          required: "ایمیل الزامی است",
          invalid: "لطفاً یک آدرس ایمیل معتبر وارد کنید"
        },
        message: "پیام الزامی است"
      },
      submitting: "در حال ارسال پیام شما...",
      success: "از تماس شما متشکریم! به زودی با شما تماس خواهیم گرفت.",
      error: "ارسال پیام شما ناموفق بود. لطفاً دوباره تلاش کنید یا مستقیماً به support@dottapps.com ایمیل بزنید."
    },
    footer: {
      footerHeading: "پاورقی",
      logoAlt: "لوگوی Dott",
      tagline: "مدیریت کسب‌وکار را برای شرکت‌های سراسر جهان ساده و کارآمد می‌کنیم.",
      home: "خانه",
      features: "ویژگی‌ها",
      pricing: "قیمت‌گذاری",
      blog: "بلاگ",
      contact: "تماس",
      product: "محصول",
      inventory: "مدیریت موجودی",
      accounting: "حسابداری",
      invoicing: "صدور فاکتور",
      payments: "پرداخت‌ها",
      pos: "نقطه فروش",
      company: "شرکت",
      about: "درباره ما",
      careers: "مشاغل",
      press: "مطبوعات",
      partners: "شرکای تجاری",
      support: "پشتیبانی",
      help: "مرکز راهنمایی",
      docs: "مستندات",
      status: "وضعیت سیستم",
      security: "امنیت",
      legal: "حقوقی",
      privacy: "سیاست حریم خصوصی",
      terms: "شرایط خدمات",
      cookies: "سیاست کوکی",
      rights: "تمام حقوق محفوظ است.",
      social: {
        facebook: "فیسبوک",
        twitter: "توییتر",
        linkedin: "لینکدین"
      }
    }
  },
  sn: {
    faq: {
      eyebrow: "Mibvunzo Inowanzo Kubvunzwa",
      heading: "Mibvunzo inowanzo kubvunzwa",
      subheading: "Tsvaga mhinduro kumibvunzo yakajairika nezve platform yedu nemabasa edu.",
      global: {
        question: "Dott inoshanda here kumabhizinesi ari kunze kweUS?",
        answer: "Hongu, Dott yakagadzirirwa kushanda pasi rose. Tinotsigira mari dzakawanda, mitauro, uye nzira dzekubhadhara dzematunhu. Platform yedu inotevera mitemo yemutero munyika dzakasiyana, ichikubvumira kutanga bhizinesi kwose kwose panyika."
      },
      cost: {
        question: "Mutengo wacho ndeupi?",
        answer: "Tinopa chirongwa chemahara cheBasic chine zvimiro zvakakoshesa. Chirongwa chedu cheProfessional nde$35/mwedzi chemabhizinesi ari kukura, uye chirongwa chedu cheEnterprise nde$95/mwedzi chemasangano makuru nevashandisi vasina muganhu. Tinopazve kuderedzwa kwe50% kumabhizinesi munyika dziri kusimukira. Shanya peji yedu yemitengo kuti uone kupimisana kwakakura."
      },
      onboarding: {
        question: "Zvinotora nguva yakadii kugadziridza?",
        answer: "Mabhizinesi mazhinji anokwanisa kutanga kushanda neDott mukati mezuva rimwe. Setup wizard yedu inokutungamirira muchiitiko chose, uye timu yedu yekubudirira kwevatengi inowanikwa kubatsira kana uchida rubatsiro. Kana uchitamira kubva kune imwe system, tinopa maturusi ekupinza data yako iripo."
      },
      support: {
        question: "Munopa rutsigiro rwerudzi rupi?",
        answer: "Tinopa rutsigiro rwevatengi 24/7 kuburikidza nechat, email, uye runhare. Timu yedu inowanikwa mumitauro yakawanda kubatsira mabhizinesi munzvimbo dzakasiyana dzenguva. Zvirongwa zvePremium zvinosanganisira mamaneja eaccount akatsaurirwa uye rutsigiro rwekukoshesa."
      },
      data: {
        question: "Data yangu yebhizinesi yakachengeteka here?",
        answer: "Hongu, tinotora chengetedzo zvakanyanya. Dott inoshandisa encryption yemubhengi kudzivirira data yako, ongororo dzakagara dzechengetedzo, uye inotevera GDPR nezvimwe zviga zvamatunhu zvekuchengetedza data. Data yako yebhizinesi inogara ichiombwa uye yakachengetedzwa zvakachengeteka mudenga."
      },
      integration: {
        question: "Ndinogona here kubatanidza nemamwe maturusi andinoshandisa?",
        answer: "Zvirokwazvo. Dott inobatanidza neakakurumbira ekubhadhara maitiro, software yehuwandu, mapuratifomu e-commerce, nemamwe maturusi ebhizinesi. Tinopazve API yekubatanidza kwakagadzirirwa. Tarisa peji yedu yekubatanidza kuti uwane rondedzero yakazara yemasevhisi anotsigirwa."
      }
    },
    contact: {
      eyebrow: "Tibate",
      heading: "Tibate",
      subheading: "Une mibvunzo nezve Dott? Timu yedu iri pano kukubatsira kuwana mhinduro yakakwana yebhizinesi rako.",
      infoTitle: "Ruzivo Rwekubata",
      infoSubtitle: "Zadza fomu kana tibate zvakananga uchishandisa ruzivo rwuri pazasi.",
      email: "Email",
      address: "Kero",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "United States",
      form: {
        name: "Zita Rakazara",
        email: "Email Address",
        company: "Kambani",
        phone: "Nhamba Yenhare",
        subject: {
          label: "Tingakubatsire sei?",
          general: "Mubvunzo Wakajairwa",
          sales: "Mubvunzo Wekutengesa",
          support: "Rubatsiro Rwehunyanzvi",
          demo: "Kumbira Demo",
          partnership: "Mukana Wekudyidzana"
        },
        message: "Meseji",
        submit: "Tumira Meseji",
        sending: "Kutumira..."
      },
      error: {
        name: "Zita rinodiwa",
        email: {
          required: "Email inodiwa",
          invalid: "Ndapota isa email address chairo"
        },
        message: "Meseji inodiwa"
      },
      submitting: "Tichitumira meseji yako...",
      success: "Tinotenda nekutibata! Tichakubata nekukurumidza.",
      error: "Kutumira meseji yako hakuna kubudirira. Edza zvakare kana nyora zvakananga ku support@dottapps.com."
    },
    footer: {
      footerHeading: "Footer",
      logoAlt: "Dott Logo",
      tagline: "Kuita manejimendi yebhizinesi kuti ive nyore uye inoshanda kumakambani pasi rose.",
      home: "Home",
      features: "Zvinhu",
      pricing: "Mitengo",
      blog: "Blog",
      contact: "Kubata",
      product: "Chigadzirwa",
      inventory: "Manejimendi Yezvinhu",
      accounting: "Accounting",
      invoicing: "Kubvisa Mabhiri",
      payments: "Kubhadhara",
      pos: "Point of Sale",
      company: "Kambani",
      about: "Nezve Isu",
      careers: "Mabasa",
      press: "Press",
      partners: "Vadyidzani",
      support: "Rutsigiro",
      help: "Help Center",
      docs: "Documentation",
      status: "System Status",
      security: "Chengetedzo",
      legal: "Zvemutemo",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      cookies: "Cookie Policy",
      rights: "Kodzero dzese dzakachengetedzwa.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  },
  ig: {
    faq: {
      eyebrow: "Ajụjụ a na-ajụkarị",
      heading: "Ajụjụ a na-ajụkarị",
      subheading: "Chọta azịza nye ajụjụ ndị a na-ajụkarị gbasara ikpo okwu anyị na ọrụ anyị.",
      global: {
        question: "Dott ọ na-arụ ọrụ maka azụmahịa ndị nọ na mpụga US?",
        answer: "Ee, e mere Dott ka ọ rụọ ọrụ n'ụwa niile. Anyị na-akwado ọtụtụ ego, asụsụ, na ụzọ ịkwụ ụgwọ mpaghara. Ikpo okwu anyị na-agbaso iwu ụtụ isi nke mba dị iche iche, na-enye gị ohere ịchịkwa azụmahịa gị ebe ọ bụla n'ụwa."
      },
      cost: {
        question: "Ego ole ka ọ na-efu?",
        answer: "Anyị na-enye atụmatụ Basic n'efu nke nwere atụmatụ ndị bụ isi. Atụmatụ Professional anyị bụ $35/ọnwa maka azụmahịa na-eto eto, na atụmatụ Enterprise anyị bụ $95/ọnwa maka nnukwu nzukọ nwere ndị ọrụ na-enweghị oke. Anyị na-enyekwa mbelata 50% maka azụmahịa na mba ndị na-emepe emepe. Gaa na ibe ọnụahịa anyị maka ntụnyere zuru oke."
      },
      onboarding: {
        question: "Ogologo oge ole ka nhazi na-ewe?",
        answer: "Ọtụtụ azụmahịa na-amalite ịrụ ọrụ na Dott n'ime ihe na-erughị otu ụbọchị. Ọkachamara nhazi wizard anyị ga-eduzi gị site na usoro ahụ, na ndị otu ihe ịga nke ọma ndị ahịa anyị dị njikere inye aka ma ọ bụrụ na ịchọrọ enyemaka. Ọ bụrụ na ị na-akwaga site na sistemụ ọzọ, anyị na-enye ngwaọrụ iji bubata data gị dị adị."
      },
      support: {
        question: "Kedu ụdị nkwado ị na-enye?",
        answer: "Anyị na-enye nkwado ndị ahịa 24/7 site na nkata, email, na ekwentị. Ndị otu anyị dị n'asụsụ dị iche iche iji nyere azụmahịa aka na mpaghara oge dị iche iche. Atụmatụ premium gụnyere ndị njikwa akaụntụ raara onwe ha nye na nkwado mbụ."
      },
      data: {
        question: "Data azụmahịa m ọ dị mma?",
        answer: "Ee, anyị na-ewere nchekwa dị ka ihe dị mkpa. Dott na-eji encryption ọkwa ụlọ akụ iji chebe data gị, nyocha nchekwa mgbe niile, ma na-agbaso GDPR na iwu nchekwa data mpaghara ndị ọzọ. A na-edobe data azụmahịa gị mgbe niile ma na-echekwa ya n'ụzọ dị mma na igwe ojii."
      },
      integration: {
        question: "Enwere m ike ijikọ ya na ngwaọrụ ndị ọzọ m na-eji?",
        answer: "N'ezie. Dott na-ejikọ na ndị na-ahụ maka ịkwụ ụgwọ ama ama, software ịgụta ego, ikpo okwu azụmahịa eletrọnịkị, na ngwaọrụ azụmahịa ndị ọzọ. Anyị na-enyekwa API maka njikọ ahaziri iche. Lelee ibe njikọ anyị maka ndepụta zuru oke nke ọrụ ndị a na-akwado."
      }
    },
    contact: {
      eyebrow: "Kpọtụrụ anyị",
      heading: "Kpọtụrụ",
      subheading: "Nwere ajụjụ gbasara Dott? Ndị otu anyị nọ ebe a iji nyere gị aka ịchọta ngwọta zuru oke maka azụmahịa gị.",
      infoTitle: "Ozi Nkwukọrịta",
      infoSubtitle: "Dejupụta fọm ahụ ma ọ bụ kpọtụrụ anyị ozugbo site na iji ozi dị n'okpuru.",
      email: "Email",
      address: "Adreesị",
      addressLine1: "800 N King Street",
      addressLine2: "Suite 304 #2797",
      addressLine3: "Wilmington, DE 19801",
      addressLine4: "United States",
      form: {
        name: "Aha Zuru Ezu",
        email: "Adreesị Email",
        company: "Ụlọ Ọrụ",
        phone: "Nọmba Ekwentị",
        subject: {
          label: "Kedu ka anyị nwere ike inyere gị aka?",
          general: "Ajụjụ Izugbe",
          sales: "Ajụjụ Ire Ahịa",
          support: "Nkwado Nka na Ụzụ",
          demo: "Rịọ Demo",
          partnership: "Ohere Mmekọrịta"
        },
        message: "Ozi",
        submit: "Zipu Ozi",
        sending: "Na-ezipu..."
      },
      error: {
        name: "Aha dị mkpa",
        email: {
          required: "Email dị mkpa",
          invalid: "Biko tinye adreesị email ziri ezi"
        },
        message: "Ozi dị mkpa"
      },
      submitting: "Na-ezipu ozi gị...",
      success: "Daalụ maka ikwu okwu! Anyị ga-akpọtụrụ gị n'oge na-adịghị anya.",
      error: "Enweghị ike izipu ozi gị. Nwaa ọzọ ma ọ bụ degara anyị ozugbo na support@dottapps.com."
    },
    footer: {
      footerHeading: "Ala ibe",
      logoAlt: "Akara Dott",
      tagline: "Na-eme ka njikwa azụmahịa dị mfe ma rụọ ọrụ nke ọma maka ụlọ ọrụ n'ụwa niile.",
      home: "Ụlọ",
      features: "Atụmatụ",
      pricing: "Ọnụahịa",
      blog: "Blog",
      contact: "Kwukọrịta",
      product: "Ngwaahịa",
      inventory: "Njikwa Ngwa Ahịa",
      accounting: "Ndekọ Akụkọ",
      invoicing: "Ịmepụta Akwụkwọ Ụgwọ",
      payments: "Ịkwụ Ụgwọ",
      pos: "Ebe Ire Ahịa",
      company: "Ụlọ Ọrụ",
      about: "Maka Anyị",
      careers: "Ọrụ",
      press: "Akwụkwọ Akụkọ",
      partners: "Ndị Mmekọ",
      support: "Nkwado",
      help: "Ebe Enyemaka",
      docs: "Akwụkwọ",
      status: "Ọnọdụ Sistemụ",
      security: "Nchekwa",
      legal: "Iwu",
      privacy: "Iwu Nzuzo",
      terms: "Usoro Ọrụ",
      cookies: "Iwu Cookie",
      rights: "A na-echekwa ikike niile.",
      social: {
        facebook: "Facebook",
        twitter: "Twitter",
        linkedin: "LinkedIn"
      }
    }
  }
};

// Function to update a language file
function updateLanguageFile(lang, translations) {
  const filePath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales', lang, 'common.json');
  
  try {
    // Read existing file
    let existingData = {};
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    }
    
    // Merge translations - add FAQ, Contact, and Footer sections
    existingData.faq = translations.faq;
    existingData.contact = translations.contact;
    existingData.footer = translations.footer;
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log(`✅ Updated ${lang}/common.json with FAQ, Contact, and Footer translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error);
  }
}

// Update all languages
Object.keys(missingSectionsTranslations).forEach(lang => {
  updateLanguageFile(lang, missingSectionsTranslations[lang]);
});

console.log('🎉 Missing landing page sections (FAQ, Contact, Footer) translations completed for all 10 languages!');