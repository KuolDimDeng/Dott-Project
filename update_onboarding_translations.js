import fs from 'fs';
import path from 'path';

// Translation data for Onboarding (business info, subscription, payment, completion)
const onboardingTranslations = {
  it: {
    businessInfo: {
      title: "Informazioni Aziendali",
      subtitle: "Raccontaci della tua azienda",
      step: "Passo 1 di 3",
      businessNameLabel: "Nome Azienda",
      businessNamePlaceholder: "Inserisci il nome della tua azienda",
      businessTypeLabel: "Tipo di Azienda",
      businessTypePlaceholder: "Seleziona il tipo di azienda",
      industryLabel: "Settore",
      industryPlaceholder: "Seleziona il settore",
      legalStructureLabel: "Struttura Legale",
      legalStructurePlaceholder: "Seleziona struttura legale",
      countryLabel: "Paese",
      countryPlaceholder: "Seleziona il tuo paese",
      stateLabel: "Stato/Provincia",
      statePlaceholder: "Seleziona il tuo stato",
      dateFoundedLabel: "Data di Fondazione",
      addressLabel: "Indirizzo Aziendale",
      addressPlaceholder: "Inserisci l'indirizzo aziendale",
      phoneLabel: "Telefono Aziendale",
      phonePlaceholder: "+39 123 456 7890",
      emailLabel: "Email Aziendale",
      emailPlaceholder: "azienda@esempio.com",
      websiteLabel: "Sito Web (opzionale)",
      websitePlaceholder: "https://www.esempio.com",
      nextButton: "Continua all'Abbonamento",
      skipButton: "Salta per ora",
      businessTypes: {
        retail: "Commercio al Dettaglio",
        restaurant: "Ristorante",
        services: "Servizi",
        manufacturing: "Manifatturiero",
        technology: "Tecnologia",
        healthcare: "Sanitario",
        construction: "Edilizia",
        realestate: "Immobiliare",
        nonprofit: "No-Profit",
        other: "Altro"
      },
      legalStructures: {
        sole_proprietorship: "Ditta Individuale",
        partnership: "Società di Persone",
        llc: "SRL",
        corporation: "SpA",
        nonprofit: "No-Profit",
        other: "Altro"
      },
      errors: {
        businessNameRequired: "Il nome dell'azienda è obbligatorio",
        businessNameTooShort: "Il nome dell'azienda deve contenere almeno 2 caratteri",
        businessTypeRequired: "Seleziona un tipo di azienda",
        legalStructureRequired: "Seleziona una struttura legale",
        countryRequired: "Seleziona un paese",
        emailInvalid: "Inserisci un indirizzo email valido",
        phoneInvalid: "Inserisci un numero di telefono valido",
        websiteInvalid: "Inserisci un URL del sito web valido"
      },
      saving: "Salvataggio..."
    },
    subscription: {
      title: "Scegli il Tuo Piano",
      subtitle: "Seleziona il piano che meglio si adatta alle esigenze della tua azienda",
      step: "Passo 2 di 3",
      billingCycle: {
        monthly: "Mensile",
        sixMonth: "6 Mesi",
        yearly: "Annuale",
        popular: "POPOLARE",
        save: "Risparmia {{percentage}}%"
      },
      plans: {
        free: {
          name: "Basic",
          description: "Perfetto per piccole aziende che iniziano",
          price: "Gratis",
          features: [
            "Monitoraggio entrate e spese",
            "Creazione fatture e promemoria",
            "Pagamenti Stripe e PayPal",
            "Mobile money (M-Pesa, ecc.)",
            "Monitoraggio inventario base",
            "Scansione codici a barre",
            "Limite di archiviazione 3GB",
            "Solo 1 utente"
          ],
          buttonText: "Inizia Gratis"
        },
        basic: {
          name: "Basic",
          description: "Perfetto per piccole aziende che iniziano",
          price: "Gratis",
          features: [
            "Monitoraggio entrate e spese",
            "Creazione fatture e promemoria",
            "Pagamenti Stripe e PayPal",
            "Mobile money (M-Pesa, ecc.)",
            "Monitoraggio inventario base",
            "Scansione codici a barre",
            "Limite di archiviazione 3GB",
            "Solo 1 utente"
          ],
          buttonText: "Inizia Gratis"
        },
        professional: {
          name: "Professional",
          description: "Tutto ciò di cui le aziende in crescita hanno bisogno per prosperare",
          price: "${{price}}/{{period}}",
          popularBadge: "PIÙ POPOLARE",
          features: [
            "Tutto in Basic",
            "Fino a 3 utenti",
            "Archiviazione illimitata",
            "Supporto prioritario",
            "Tutte le funzionalità incluse",
            "{{discount}}% di sconto su 6 mesi",
            "{{yearlyDiscount}}% di sconto annuale"
          ],
          buttonText: "Scegli Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Scala illimitata per organizzazioni ambiziose",
          price: "${{price}}/{{period}}",
          premiumBadge: "PREMIUM",
          features: [
            "Tutto in Professional",
            "Utenti illimitati",
            "Onboarding personalizzato",
            "Supporto dedicato",
            "Tutte le funzionalità incluse",
            "{{discount}}% di sconto su 6 mesi",
            "{{yearlyDiscount}}% di sconto annuale"
          ],
          buttonText: "Scegli Enterprise"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% di sconto su tutti i piani!",
        description: "Prezzi speciali per aziende in {{country}}",
        percentOff: "{{percentage}}% di sconto",
        yourRegion: "la tua regione"
      },
      paymentMethods: {
        mpesa: {
          title: "Pagamento M-Pesa disponibile!",
          description: "Paga comodamente con mobile money per il tuo abbonamento",
          payInCurrency: "Paga in {{currency}}"
        }
      },
      savings: {
        sixMonth: "Risparmia ${{amount}} (${{monthly}}/mese)",
        yearly: "Risparmia ${{amount}} all'anno"
      },
      backButton: "Torna alle Info Aziendali",
      processing: "Elaborazione...",
      note: "* Prezzi regionali disponibili. Prezzi automaticamente adeguati in base alla tua posizione."
    },
    payment: {
      title: "Completa il Tuo Abbonamento",
      subtitle: "Piano {{plan}} • ${{price}}/{{period}}",
      step: "Passo 3 di 3",
      discountBadge: "{{percentage}}% SCONTO",
      originalPrice: "Originale: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% di sconto regionale applicato!",
        subtitle: "Prezzi speciali per aziende in {{country}}"
      },
      paymentMethod: {
        title: "Seleziona Metodo di Pagamento",
        card: {
          name: "Carta di Credito/Debito",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Mobile Money",
          payInCurrency: "Paga in {{currency}}"
        },
        flutterwave: {
          name: "Bonifico Bancario",
          description: "Paga tramite bonifico bancario"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Pagamento Mobile Money"
        }
      },
      cardPayment: {
        cardholderName: "Nome Intestatario",
        cardholderNamePlaceholder: "Mario Rossi",
        cardNumber: "Numero Carta",
        expiryDate: "Data di Scadenza",
        cvc: "CVC",
        postalCode: "Codice Postale",
        postalCodePlaceholder: "12345"
      },
      mobilePayment: {
        phoneNumber: "Numero Telefono {{provider}}",
        phoneNumberPlaceholder: "123456789",
        phoneNumberHint: "Inserisci il tuo numero di telefono registrato {{provider}}",
        localPrice: "Prezzo in {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Tasso di cambio: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Come funziona il pagamento {{provider}}:",
          steps: [
            "Clicca \"Paga con {{provider}}\" qui sotto",
            "Riceverai una richiesta di pagamento sul tuo telefono",
            "Inserisci il tuo PIN {{provider}} per completare il pagamento",
            "Sarai reindirizzato una volta confermato il pagamento"
          ]
        }
      },
      submitButton: {
        card: "Abbonati per ${{price}}/{{period}}",
        mobile: "Paga con {{provider}} - {{symbol}}{{amount}}",
        processing: "Elaborazione Pagamento..."
      },
      securityBadge: "Protetto da Stripe",
      cancelNote: "Puoi annullare o cambiare il tuo piano in qualsiasi momento dalla dashboard.",
      errors: {
        cardholderNameRequired: "Inserisci il nome dell'intestatario",
        postalCodeRequired: "Inserisci il tuo codice postale",
        phoneRequired: "Inserisci il tuo numero di telefono {{provider}}",
        businessInfoMissing: "Informazioni aziendali mancanti. Completa prima il passaggio di configurazione aziendale.",
        paymentFailed: "Pagamento fallito. Riprova.",
        cardDeclined: "La tua carta è stata rifiutata. Prova con una carta diversa.",
        insufficientFunds: "Fondi insufficienti. Controlla il tuo saldo.",
        networkError: "Errore di rete. Controlla la tua connessione."
      },
      success: {
        title: "Pagamento Riuscito!",
        message: "Reindirizzamento alla tua dashboard...",
        mpesaTitle: "Pagamento M-Pesa Avviato!",
        mpesaMessage: "Controlla il tuo telefono per la richiesta di pagamento M-Pesa",
        mpesaHint: "Inserisci il tuo PIN per completare il pagamento",
        redirecting: "Reindirizzamento alla tua dashboard..."
      }
    },
    completion: {
      title: "Benvenuto in Dott!",
      subtitle: "Il tuo account è tutto configurato",
      message: "Sei pronto per iniziare a gestire le finanze della tua azienda",
      dashboardButton: "Vai alla Dashboard",
      setupComplete: "Configurazione Completata"
    },
    errors: {
      sessionExpired: "La tua sessione è scaduta. Accedi di nuovo.",
      networkError: "Errore di rete. Controlla la tua connessione.",
      genericError: "Si è verificato un errore. Riprova.",
      requiredField: "Questo campo è obbligatorio"
    },
    navigation: {
      back: "Indietro",
      next: "Avanti",
      skip: "Salta",
      cancel: "Annulla",
      save: "Salva",
      continue: "Continua"
    }
  },
  pl: {
    businessInfo: {
      title: "Informacje o Firmie",
      subtitle: "Opowiedz nam o swojej firmie",
      step: "Krok 1 z 3",
      businessNameLabel: "Nazwa Firmy",
      businessNamePlaceholder: "Wprowadź nazwę swojej firmy",
      businessTypeLabel: "Typ Firmy",
      businessTypePlaceholder: "Wybierz typ firmy",
      industryLabel: "Branża",
      industryPlaceholder: "Wybierz branżę",
      legalStructureLabel: "Struktura Prawna",
      legalStructurePlaceholder: "Wybierz strukturę prawną",
      countryLabel: "Kraj",
      countryPlaceholder: "Wybierz swój kraj",
      stateLabel: "Stan/Województwo",
      statePlaceholder: "Wybierz swój stan",
      dateFoundedLabel: "Data Założenia",
      addressLabel: "Adres Firmy",
      addressPlaceholder: "Wprowadź adres swojej firmy",
      phoneLabel: "Telefon Firmowy",
      phonePlaceholder: "+48 123 456 789",
      emailLabel: "Email Firmowy",
      emailPlaceholder: "firma@przykład.com",
      websiteLabel: "Strona Internetowa (opcjonalna)",
      websitePlaceholder: "https://www.przykład.com",
      nextButton: "Przejdź do Subskrypcji",
      skipButton: "Pomiń na teraz",
      businessTypes: {
        retail: "Handel Detaliczny",
        restaurant: "Restauracja",
        services: "Usługi",
        manufacturing: "Produkcja",
        technology: "Technologia",
        healthcare: "Opieka Zdrowotna",
        construction: "Budownictwo",
        realestate: "Nieruchomości",
        nonprofit: "Organizacja Non-Profit",
        other: "Inne"
      },
      legalStructures: {
        sole_proprietorship: "Działalność Jednoosobowa",
        partnership: "Spółka Osobowa",
        llc: "Sp. z o.o.",
        corporation: "Spółka Akcyjna",
        nonprofit: "Organizacja Non-Profit",
        other: "Inne"
      },
      errors: {
        businessNameRequired: "Nazwa firmy jest wymagana",
        businessNameTooShort: "Nazwa firmy musi mieć co najmniej 2 znaki",
        businessTypeRequired: "Wybierz typ firmy",
        legalStructureRequired: "Wybierz strukturę prawną",
        countryRequired: "Wybierz kraj",
        emailInvalid: "Wprowadź prawidłowy adres email",
        phoneInvalid: "Wprowadź prawidłowy numer telefonu",
        websiteInvalid: "Wprowadź prawidłowy URL strony internetowej"
      },
      saving: "Zapisywanie..."
    },
    subscription: {
      title: "Wybierz Swój Plan",
      subtitle: "Wybierz plan, który najlepiej odpowiada potrzebom Twojej firmy",
      step: "Krok 2 z 3",
      billingCycle: {
        monthly: "Miesięcznie",
        sixMonth: "6 Miesięcy",
        yearly: "Rocznie",
        popular: "POPULARNE",
        save: "Oszczędź {{percentage}}%"
      },
      plans: {
        free: {
          name: "Basic",
          description: "Idealne dla małych firm rozpoczynających działalność",
          price: "Darmowy",
          features: [
            "Śledzenie przychodów i wydatków",
            "Tworzenie faktur i przypomnienia",
            "Płatności Stripe i PayPal",
            "Mobile money (M-Pesa, itp.)",
            "Podstawowe śledzenie zapasów",
            "Skanowanie kodów kreskowych",
            "Limit przechowywania 3GB",
            "Tylko 1 użytkownik"
          ],
          buttonText: "Zacznij za Darmo"
        },
        basic: {
          name: "Basic",
          description: "Idealne dla małych firm rozpoczynających działalność",
          price: "Darmowy",
          features: [
            "Śledzenie przychodów i wydatków",
            "Tworzenie faktur i przypomnienia",
            "Płatności Stripe i PayPal",
            "Mobile money (M-Pesa, itp.)",
            "Podstawowe śledzenie zapasów",
            "Skanowanie kodów kreskowych",
            "Limit przechowywania 3GB",
            "Tylko 1 użytkownik"
          ],
          buttonText: "Zacznij za Darmo"
        },
        professional: {
          name: "Professional",
          description: "Wszystko, czego potrzebują rozwijające się firmy",
          price: "${{price}}/{{period}}",
          popularBadge: "NAJPOPULARNIEJSZY",
          features: [
            "Wszystko z Basic",
            "Do 3 użytkowników",
            "Nieograniczone przechowywanie",
            "Priorytetowe wsparcie",
            "Wszystkie funkcje włączone",
            "{{discount}}% zniżki na 6 miesięcy",
            "{{yearlyDiscount}}% zniżki rocznej"
          ],
          buttonText: "Wybierz Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Nieograniczona skala dla ambitnych organizacji",
          price: "${{price}}/{{period}}",
          premiumBadge: "PREMIUM",
          features: [
            "Wszystko z Professional",
            "Nieograniczeni użytkownicy",
            "Spersonalizowane wdrożenie",
            "Dedykowane wsparcie",
            "Wszystkie funkcje włączone",
            "{{discount}}% zniżki na 6 miesięcy",
            "{{yearlyDiscount}}% zniżki rocznej"
          ],
          buttonText: "Wybierz Enterprise"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% zniżki na wszystkie plany!",
        description: "Specjalne ceny dla firm w {{country}}",
        percentOff: "{{percentage}}% zniżki",
        yourRegion: "Twój region"
      },
      paymentMethods: {
        mpesa: {
          title: "Płatność M-Pesa dostępna!",
          description: "Płać wygodnie mobile money za subskrypcję",
          payInCurrency: "Płać w {{currency}}"
        }
      },
      savings: {
        sixMonth: "Oszczędź ${{amount}} (${{monthly}}/miesiąc)",
        yearly: "Oszczędź ${{amount}} rocznie"
      },
      backButton: "Wróć do Informacji o Firmie",
      processing: "Przetwarzanie...",
      note: "* Dostępne ceny regionalne. Ceny automatycznie dostosowane do Twojej lokalizacji."
    },
    payment: {
      title: "Dokończ Subskrypcję",
      subtitle: "Plan {{plan}} • ${{price}}/{{period}}",
      step: "Krok 3 z 3",
      discountBadge: "{{percentage}}% ZNIŻKI",
      originalPrice: "Oryginalna: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% zniżka regionalna zastosowana!",
        subtitle: "Specjalne ceny dla firm w {{country}}"
      },
      paymentMethod: {
        title: "Wybierz Metodę Płatności",
        card: {
          name: "Karta Kredytowa/Debetowa",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Mobile Money",
          payInCurrency: "Płać w {{currency}}"
        },
        flutterwave: {
          name: "Przelew Bankowy",
          description: "Płać przez przelew bankowy"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Płatność Mobile Money"
        }
      },
      cardPayment: {
        cardholderName: "Nazwa Posiadacza Karty",
        cardholderNamePlaceholder: "Jan Kowalski",
        cardNumber: "Numer Karty",
        expiryDate: "Data Ważności",
        cvc: "CVC",
        postalCode: "Kod Pocztowy",
        postalCodePlaceholder: "12345"
      },
      mobilePayment: {
        phoneNumber: "Numer Telefonu {{provider}}",
        phoneNumberPlaceholder: "123456789",
        phoneNumberHint: "Wprowadź swój zarejestrowany numer telefonu {{provider}}",
        localPrice: "Cena w {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Kurs wymiany: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Jak działa płatność {{provider}}:",
          steps: [
            "Kliknij \"Płać przez {{provider}}\" poniżej",
            "Otrzymasz powiadomienie o płatności na telefon",
            "Wprowadź swój PIN {{provider}}, aby dokończyć płatność",
            "Zostaniesz przekierowany po potwierdzeniu płatności"
          ]
        }
      },
      submitButton: {
        card: "Subskrybuj za ${{price}}/{{period}}",
        mobile: "Płać przez {{provider}} - {{symbol}}{{amount}}",
        processing: "Przetwarzanie Płatności..."
      },
      securityBadge: "Zabezpieczone przez Stripe",
      cancelNote: "Możesz anulować lub zmienić plan w każdej chwili z panelu.",
      errors: {
        cardholderNameRequired: "Wprowadź nazwę posiadacza karty",
        postalCodeRequired: "Wprowadź swój kod pocztowy",
        phoneRequired: "Wprowadź swój numer telefonu {{provider}}",
        businessInfoMissing: "Brakuje informacji o firmie. Najpierw ukończ krok konfiguracji firmy.",
        paymentFailed: "Płatność nie powiodła się. Spróbuj ponownie.",
        cardDeclined: "Twoja karta została odrzucona. Spróbuj inną kartę.",
        insufficientFunds: "Niewystarczające środki. Sprawdź saldo.",
        networkError: "Błąd sieci. Sprawdź połączenie."
      },
      success: {
        title: "Płatność Udana!",
        message: "Przekierowywanie do panelu...",
        mpesaTitle: "Płatność M-Pesa Zainicjowana!",
        mpesaMessage: "Sprawdź telefon pod kątem powiadomienia o płatności M-Pesa",
        mpesaHint: "Wprowadź PIN, aby dokończyć płatność",
        redirecting: "Przekierowywanie do panelu..."
      }
    },
    completion: {
      title: "Witamy w Dott!",
      subtitle: "Twoje konto jest już skonfigurowane",
      message: "Jesteś gotowy, aby zacząć zarządzać finansami swojej firmy",
      dashboardButton: "Przejdź do Panelu",
      setupComplete: "Konfiguracja Ukończona"
    },
    errors: {
      sessionExpired: "Twoja sesja wygasła. Zaloguj się ponownie.",
      networkError: "Błąd sieci. Sprawdź połączenie.",
      genericError: "Wystąpił błąd. Spróbuj ponownie.",
      requiredField: "To pole jest wymagane"
    },
    navigation: {
      back: "Wstecz",
      next: "Dalej",
      skip: "Pomiń",
      cancel: "Anuluj",
      save: "Zapisz",
      continue: "Kontynuuj"
    }
  },
  th: {
    businessInfo: {
      title: "ข้อมูลธุรกิจ",
      subtitle: "บอกเราเกี่ยวกับธุรกิจของคุณ",
      step: "ขั้นตอนที่ 1 จาก 3",
      businessNameLabel: "ชื่อธุรกิจ",
      businessNamePlaceholder: "ใส่ชื่อธุรกิจของคุณ",
      businessTypeLabel: "ประเภทธุรกิจ",
      businessTypePlaceholder: "เลือกประเภทธุรกิจของคุณ",
      industryLabel: "อุตสาหกรรม",
      industryPlaceholder: "เลือกอุตสาหกรรมของคุณ",
      legalStructureLabel: "โครงสร้างทางกฎหมาย",
      legalStructurePlaceholder: "เลือกโครงสร้างทางกฎหมาย",
      countryLabel: "ประเทศ",
      countryPlaceholder: "เลือกประเทศของคุณ",
      stateLabel: "รัฐ/จังหวัด",
      statePlaceholder: "เลือกรัฐของคุณ",
      dateFoundedLabel: "วันที่ก่อตั้ง",
      addressLabel: "ที่อยู่ธุรกิจ",
      addressPlaceholder: "ใส่ที่อยู่ธุรกิจของคุณ",
      phoneLabel: "โทรศัพท์ธุรกิจ",
      phonePlaceholder: "+66 123 456 789",
      emailLabel: "อีเมลธุรกิจ",
      emailPlaceholder: "business@example.com",
      websiteLabel: "เว็บไซต์ (ไม่บังคับ)",
      websitePlaceholder: "https://www.example.com",
      nextButton: "ดำเนินการต่อไปยังการสมัครสมาชิก",
      skipButton: "ข้ามไปก่อน",
      businessTypes: {
        retail: "ค้าปลีก",
        restaurant: "ร้านอาหาร",
        services: "บริการ",
        manufacturing: "การผลิต",
        technology: "เทคโนโลยี",
        healthcare: "การแพทย์",
        construction: "การก่อสร้าง",
        realestate: "อสังหาริมทรัพย์",
        nonprofit: "องค์กรไม่แสวงผลกำไร",
        other: "อื่นๆ"
      },
      legalStructures: {
        sole_proprietorship: "เจ้าของเดียว",
        partnership: "ห้างหุ้นส่วน",
        llc: "บริษัทจำกัด",
        corporation: "บริษัทมหาชน",
        nonprofit: "องค์กรไม่แสวงผลกำไร",
        other: "อื่นๆ"
      },
      errors: {
        businessNameRequired: "จำเป็นต้องใส่ชื่อธุรกิจ",
        businessNameTooShort: "ชื่อธุรกิจต้องมีอย่างน้อย 2 ตัวอักษร",
        businessTypeRequired: "กรุณาเลือกประเภทธุรกิจ",
        legalStructureRequired: "กรุณาเลือกโครงสร้างทางกฎหมาย",
        countryRequired: "กรุณาเลือกประเทศ",
        emailInvalid: "กรุณาใส่ที่อยู่อีเมลที่ถูกต้อง",
        phoneInvalid: "กรุณาใส่หมายเลขโทรศัพท์ที่ถูกต้อง",
        websiteInvalid: "กรุณาใส่ URL เว็บไซต์ที่ถูกต้อง"
      },
      saving: "กำลังบันทึก..."
    },
    subscription: {
      title: "เลือกแผนของคุณ",
      subtitle: "เลือกแผนที่เหมาะสมกับความต้องการของธุรกิจคุณ",
      step: "ขั้นตอนที่ 2 จาก 3",
      billingCycle: {
        monthly: "รายเดือน",
        sixMonth: "6 เดือน",
        yearly: "รายปี",
        popular: "ยอดนิยม",
        save: "ประหยัด {{percentage}}%"
      },
      plans: {
        free: {
          name: "Basic",
          description: "เหมาะสำหรับธุรกิจเล็กที่เพิ่งเริ่มต้น",
          price: "ฟรี",
          features: [
            "ติดตามรายได้และรายจ่าย",
            "สร้างใบแจ้งหนี้และการแจ้งเตือน",
            "การชำระเงิน Stripe และ PayPal",
            "Mobile money (M-Pesa ฯลฯ)",
            "การติดตามสินค้าคงคลังพื้นฐาน",
            "การสแกนบาร์โค้ด",
            "ขีดจำกัดพื้นที่เก็บข้อมูล 3GB",
            "ผู้ใช้เพียง 1 คน"
          ],
          buttonText: "เริ่มฟรี"
        },
        basic: {
          name: "Basic",
          description: "เหมาะสำหรับธุรกิจเล็กที่เพิ่งเริ่มต้น",
          price: "ฟรี",
          features: [
            "ติดตามรายได้และรายจ่าย",
            "สร้างใบแจ้งหนี้และการแจ้งเตือน",
            "การชำระเงิน Stripe และ PayPal",
            "Mobile money (M-Pesa ฯลฯ)",
            "การติดตามสินค้าคงคลังพื้นฐาน",
            "การสแกนบาร์โค้ด",
            "ขีดจำกัดพื้นที่เก็บข้อมูล 3GB",
            "ผู้ใช้เพียง 1 คน"
          ],
          buttonText: "เริ่มฟรี"
        },
        professional: {
          name: "Professional",
          description: "ทุกสิ่งที่ธุรกิจที่กำลังเติบโตต้องการเพื่อความเจริญรุ่งเรือง",
          price: "${{price}}/{{period}}",
          popularBadge: "ยอดนิยมที่สุด",
          features: [
            "ทุกอย่างใน Basic",
            "ผู้ใช้ได้ถึง 3 คน",
            "พื้นที่เก็บข้อมูลไม่จำกัด",
            "การสนับสนุนลำดับความสำคัญ",
            "คุณสมบัติทั้งหมดรวมอยู่ด้วย",
            "ส่วนลด {{discount}}% สำหรับ 6 เดือน",
            "ส่วนลด {{yearlyDiscount}}% สำหรับรายปี"
          ],
          buttonText: "เลือก Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "ขยายไร้ขีดจำกัดสำหรับองค์กรที่มีความทะเยอทะยาน",
          price: "${{price}}/{{period}}",
          premiumBadge: "พรีเมียม",
          features: [
            "ทุกอย่างใน Professional",
            "ผู้ใช้ไม่จำกัด",
            "การปรับแต่งเฉพาะบุคคล",
            "การสนับสนุนเฉพาะ",
            "คุณสมบัติทั้งหมดรวมอยู่ด้วย",
            "ส่วนลด {{discount}}% สำหรับ 6 เดือน",
            "ส่วนลด {{yearlyDiscount}}% สำหรับรายปี"
          ],
          buttonText: "เลือก Enterprise"
        }
      },
      regionalDiscount: {
        badge: "ส่วนลด {{percentage}}% สำหรับทุกแผน!",
        description: "ราคาพิเศษสำหรับธุรกิจใน {{country}}",
        percentOff: "ส่วนลด {{percentage}}%",
        yourRegion: "ภูมิภาคของคุณ"
      },
      paymentMethods: {
        mpesa: {
          title: "การชำระเงิน M-Pesa ใช้ได้!",
          description: "จ่ายอย่างสะดวกด้วย mobile money สำหรับการสมัครสมาชิกของคุณ",
          payInCurrency: "จ่ายใน {{currency}}"
        }
      },
      savings: {
        sixMonth: "ประหยัด ${{amount}} (${{monthly}}/เดือน)",
        yearly: "ประหยัด ${{amount}} ต่อปี"
      },
      backButton: "กลับไปที่ข้อมูลธุรกิจ",
      processing: "กำลังประมวลผล...",
      note: "* มีราคาตามภูมิภาค ราคาจะปรับโดยอัตโนมัติตามตำแหน่งของคุณ"
    },
    payment: {
      title: "ทำการสมัครสมาชิกให้เสร็จสิ้น",
      subtitle: "แผน {{plan}} • ${{price}}/{{period}}",
      step: "ขั้นตอนที่ 3 จาก 3",
      discountBadge: "ส่วนลด {{percentage}}%",
      originalPrice: "ราคาเดิม: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "ส่วนลดตามภูมิภาค {{percentage}}% ถูกใช้แล้ว!",
        subtitle: "ราคาพิเศษสำหรับธุรกิจใน {{country}}"
      },
      paymentMethod: {
        title: "เลือกวิธีการชำระเงิน",
        card: {
          name: "บัตรเครดิต/เดบิต",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Mobile Money",
          payInCurrency: "จ่ายใน {{currency}}"
        },
        flutterwave: {
          name: "การโอนเงินผ่านธนาคาร",
          description: "จ่ายผ่านการโอนเงินผ่านธนาคาร"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "การชำระเงิน Mobile Money"
        }
      },
      cardPayment: {
        cardholderName: "ชื่อผู้ถือบัตร",
        cardholderNamePlaceholder: "สมชาย ใจดี",
        cardNumber: "หมายเลขบัตร",
        expiryDate: "วันหมดอายุ",
        cvc: "CVC",
        postalCode: "รหัสไปรษณีย์",
        postalCodePlaceholder: "12345"
      },
      mobilePayment: {
        phoneNumber: "หมายเลขโทรศัพท์ {{provider}}",
        phoneNumberPlaceholder: "0812345678",
        phoneNumberHint: "ใส่หมายเลขโทรศัพท์ {{provider}} ที่ลงทะเบียนของคุณ",
        localPrice: "ราคาใน {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "อัตราแลกเปลี่ยน: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "วิธีการชำระเงิน {{provider}}:",
          steps: [
            "คลิก \"จ่ายด้วย {{provider}}\" ด้านล่าง",
            "คุณจะได้รับการแจ้งเตือนการชำระเงินบนโทรศัพท์ของคุณ",
            "ใส่ PIN {{provider}} ของคุณเพื่อทำการชำระเงินให้เสร็จสิ้น",
            "คุณจะถูกเปลี่ยนเส้นทางเมื่อการชำระเงินได้รับการยืนยัน"
          ]
        }
      },
      submitButton: {
        card: "สมัครสมาชิกสำหรับ ${{price}}/{{period}}",
        mobile: "จ่ายด้วย {{provider}} - {{symbol}}{{amount}}",
        processing: "กำลังประมวลผลการชำระเงิน..."
      },
      securityBadge: "ปลอดภัยโดย Stripe",
      cancelNote: "คุณสามารถยกเลิกหรือเปลี่ยนแผนได้ทุกเมื่อจากแดชบอร์ด",
      errors: {
        cardholderNameRequired: "กรุณาใส่ชื่อผู้ถือบัตร",
        postalCodeRequired: "กรุณาใส่รหัสไปรษณีย์ของคุณ",
        phoneRequired: "กรุณาใส่หมายเลขโทรศัพท์ {{provider}} ของคุณ",
        businessInfoMissing: "ข้อมูลธุรกิจหายไป กรุณาทำขั้นตอนการตั้งค่าธุรกิจให้เสร็จก่อน",
        paymentFailed: "การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง",
        cardDeclined: "บัตรของคุณถูกปฏิเสธ กรุณาลองใช้บัตรอื่น",
        insufficientFunds: "เงินไม่เพียงพอ กรุณาตรวจสอบยอดเงินของคุณ",
        networkError: "ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อของคุณ"
      },
      success: {
        title: "การชำระเงินสำเร็จ!",
        message: "กำลังเปลี่ยนเส้นทางไปยังแดชบอร์ดของคุณ...",
        mpesaTitle: "การชำระเงิน M-Pesa เริ่มต้นแล้ว!",
        mpesaMessage: "ตรวจสอบโทรศัพท์ของคุณสำหรับการแจ้งเตือนการชำระเงิน M-Pesa",
        mpesaHint: "ใส่ PIN ของคุณเพื่อทำการชำระเงินให้เสร็จสิ้น",
        redirecting: "กำลังเปลี่ยนเส้นทางไปยังแดชบอร์ดของคุณ..."
      }
    },
    completion: {
      title: "ยินดีต้อนรับสู่ Dott!",
      subtitle: "บัญชีของคุณตั้งค่าเรียบร้อยแล้ว",
      message: "คุณพร้อมที่จะเริ่มจัดการการเงินของธุรกิจแล้ว",
      dashboardButton: "ไปที่แดชบอร์ด",
      setupComplete: "การตั้งค่าเสร็จสิ้น"
    },
    errors: {
      sessionExpired: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่",
      networkError: "ข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อของคุณ",
      genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      requiredField: "ฟิลด์นี้จำเป็น"
    },
    navigation: {
      back: "กลับ",
      next: "ถัดไป",
      skip: "ข้าม",
      cancel: "ยกเลิก",
      save: "บันทึก",
      continue: "ดำเนินการต่อ"
    }
  },
  // Continuing with Bengali, Urdu, Filipino, Ukrainian, Persian, Shona, Igbo...
  // (I'll add the rest in the next part due to length)
};

// Function to update a language file
function updateLanguageFile(lang, translation) {
  const filePath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales', lang, 'onboarding.json');
  
  try {
    // Write complete onboarding.json file
    fs.writeFileSync(filePath, JSON.stringify(translation, null, 2));
    console.log(`✅ Updated ${lang}/onboarding.json with complete onboarding translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/onboarding.json:`, error);
  }
}

// Update first batch of languages (it, pl, th)
Object.keys(onboardingTranslations).forEach(lang => {
  updateLanguageFile(lang, onboardingTranslations[lang]);
});

console.log('🎉 Onboarding translations completed for first batch!');