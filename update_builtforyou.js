import fs from 'fs';
import path from 'path';

// Translation data for Built For You section
const builtForYouTranslations = {
  it: {
    builtForYou: {
      title: "Costruito per Te",
      heading: "Gestisci la tua azienda come un professionista!",
      subheading: "Costruito per imprenditori come te",
      cta: "Unisciti a migliaia di imprenditori in tutto il mondo che si fidano di Dott per gestire la loro attività",
      types: {
        freelancers: {
          title: "Freelancer",
          description: "Monitora i progetti, fattura i clienti istantaneamente e gestisci le tue finanze tutto in un posto. Ricevi pagamenti più velocemente con fatture professionali."
        },
        contractors: {
          title: "Appaltatori",
          description: "Gestisci progetti multipli, monitora i costi di materiali e manodopera, e invia preventivi professionali. Mantieni sano il tuo flusso di cassa."
        },
        entrepreneurs: {
          title: "Imprenditori",
          description: "Scala la tua startup con potenti strumenti per inventario, vendite e monitoraggio finanziario. Prendi decisioni basate sui dati."
        },
        consultants: {
          title: "Consulenti",
          description: "Fattura a ore o per progetto, monitora le spese e gestisci clienti multipli senza sforzo. Fatturazione professionale inclusa."
        },
        retail: {
          title: "Proprietari di Negozi",
          description: "Gestisci l'inventario con scansione codici a barre, monitora le vendite e accetta metodi di pagamento multipli incluso mobile money."
        },
        streetVendors: {
          title: "Venditori Ambulanti",
          description: "Design mobile-first semplice per monitorare vendite giornaliere, gestire inventario e accettare pagamenti digitali in movimento."
        },
        marketStalls: {
          title: "Proprietari di Bancarelle",
          description: "Perfetto per giornate di mercato intense. Inserimento vendite rapido, avvisi inventario e monitoraggio profitti giornalieri nella tua valuta locale."
        },
        mobileMoneyAgents: {
          title: "Agenti Mobile Money",
          description: "Monitora transazioni, gestisci saldi float e genera report per operatori di rete. Costruito per M-Pesa, MTN e altro."
        },
        restaurants: {
          title: "Proprietari di Piccoli Ristoranti",
          description: "Gestisci ordini, monitora ingredienti, calcola costi alimentari e gestisci sia servizio al tavolo che da asporto efficientemente."
        },
        serviceProviders: {
          title: "Fornitori di Servizi",
          description: "Per idraulici, elettricisti, meccanici e altro. Programma lavori, monitora parti e fattura al completamento."
        },
        onlineSellers: {
          title: "Venditori Online",
          description: "Sincronizza inventario su piattaforme, gestisci ordini e monitora spedizioni. Perfetto per venditori sui social media."
        },
        transport: {
          title: "Operatori di Trasporto",
          description: "Per operatori di taxi, boda boda e tuk-tuk. Monitora guadagni giornalieri, costi carburante e programmi manutenzione."
        }
      }
    }
  },
  pl: {
    builtForYou: {
      title: "Stworzone dla Ciebie",
      heading: "Zarządzaj swoim biznesem jak profesjonalista!",
      subheading: "Stworzone dla właścicieli firm takich jak Ty",
      cta: "Dołącz do tysięcy właścicieli firm na całym świecie, którzy ufają Dott w zarządzaniu swoją działalnością",
      types: {
        freelancers: {
          title: "Freelancerzy",
          description: "Śledź projekty, wystawiaj faktury klientom natychmiast i zarządzaj finansami w jednym miejscu. Otrzymuj płatności szybciej dzięki profesjonalnym fakturom."
        },
        contractors: {
          title: "Wykonawcy",
          description: "Zarządzaj wieloma projektami, śledź koszty materiałów i robocizny oraz wysyłaj profesjonalne oferty. Utrzymuj zdrowy przepływ gotówki."
        },
        entrepreneurs: {
          title: "Przedsiębiorcy",
          description: "Skaluj swój startup potężnymi narzędziami do zapasów, sprzedaży i śledzenia finansów. Podejmuj decyzje oparte na danych."
        },
        consultants: {
          title: "Konsultanci",
          description: "Rozliczaj za godziny lub projekt, śledź wydatki i zarządzaj wieloma klientami bez wysiłku. Profesjonalne fakturowanie w zestawie."
        },
        retail: {
          title: "Właściciele Sklepów Detalicznych",
          description: "Zarządzaj zapasami ze skanowaniem kodów kreskowych, śledź sprzedaż i akceptuj wiele metod płatności w tym mobile money."
        },
        streetVendors: {
          title: "Sprzedawcy Uliczni",
          description: "Prosty design mobile-first do śledzenia dziennej sprzedaży, zarządzania zapasami i akceptowania płatności cyfrowych w ruchu."
        },
        marketStalls: {
          title: "Właściciele Straganów",
          description: "Idealny na ruchliwe dni targowe. Szybkie wprowadzanie sprzedaży, alerty zapasów i śledzenie dziennych zysków w lokalnej walucie."
        },
        mobileMoneyAgents: {
          title: "Agenci Mobile Money",
          description: "Śledź transakcje, zarządzaj saldami float i generuj raporty dla operatorów sieci. Zbudowany dla M-Pesa, MTN i innych."
        },
        restaurants: {
          title: "Właściciele Małych Restauracji",
          description: "Zarządzaj zamówieniami, śledź składniki, obliczaj koszty żywności i efektywnie obsługuj zarówno na miejscu jak i na wynos."
        },
        serviceProviders: {
          title: "Usługodawcy",
          description: "Dla hydraulików, elektryków, mechaników i innych. Planuj prace, śledź części i wystawiaj faktury po ukończeniu."
        },
        onlineSellers: {
          title: "Sprzedawcy Online",
          description: "Synchronizuj zapasy na platformach, zarządzaj zamówieniami i śledź wysyłki. Idealny dla sprzedawców w mediach społecznościowych."
        },
        transport: {
          title: "Operatorzy Transportu",
          description: "Dla operatorów taksówek, boda boda i tuk-tuk. Śledź dzienne zarobki, koszty paliwa i harmonogramy konserwacji."
        }
      }
    }
  },
  th: {
    builtForYou: {
      title: "สร้างขึ้นสำหรับคุณ",
      heading: "จัดการธุรกิจของคุณเหมือนมืออาชีพ!",
      subheading: "สร้างขึ้นสำหรับเจ้าของธุรกิจเช่นคุณ",
      cta: "เข้าร่วมกับเจ้าของธุรกิจหลายพันคนทั่วโลกที่เชื่อมั่นใน Dott ในการจัดการธุรกิจของพวกเขา",
      types: {
        freelancers: {
          title: "ฟรีแลนซ์",
          description: "ติดตามโครงการ ออกใบแจ้งหนี้ลูกค้าทันที และจัดการการเงินของคุณในที่เดียว รับเงินเร็วขึ้นด้วยใบแจ้งหนี้มืออาชีพ"
        },
        contractors: {
          title: "ผู้รับเหมา",
          description: "จัดการหลายโครงการ ติดตามต้นทุนวัสดุและแรงงาน และส่งใบเสนอราคามืออาชีพ รักษากระแสเงินสดให้แข็งแรง"
        },
        entrepreneurs: {
          title: "ผู้ประกอบการ",
          description: "ขยายสตาร์ทอัพของคุณด้วยเครื่องมือที่ทรงพลังสำหรับสินค้าคงคลัง ยอดขาย และการติดตามทางการเงิน ตัดสินใจบนพื้นฐานข้อมูล"
        },
        consultants: {
          title: "ที่ปรึกษา",
          description: "เรียกเก็บเงินรายชั่วโมงหรือรายโครงการ ติดตามค่าใช้จ่าย และจัดการลูกค้าหลายรายอย่างง่ายดาย มีใบแจ้งหนี้มืออาชีพ"
        },
        retail: {
          title: "เจ้าของร้านค้าปลีก",
          description: "จัดการสินค้าคงคลังด้วยการสแกนบาร์โค้ด ติดตามยอดขาย และรับหลายวิธีการชำระเงินรวมถึงเงินมือถือ"
        },
        streetVendors: {
          title: "แผงลอย",
          description: "ออกแบบมือถือง่ายๆ สำหรับติดตามยอดขายรายวัน จัดการสินค้าคงคลัง และรับการชำระเงินดิจิทัลขณะเดินทาง"
        },
        marketStalls: {
          title: "เจ้าของแผงตลาด",
          description: "เหมาะสำหรับวันตลาดที่วุ่นวาย ป้อนยอดขายอย่างรวดเร็ว การแจ้งเตือนสินค้าคงคลัง และติดตามกำไรรายวันในสกุลเงินท้องถิ่นของคุณ"
        },
        mobileMoneyAgents: {
          title: "ตัวแทนเงินมือถือ",
          description: "ติดตามธุรกรรม จัดการยอดเงินลอย และสร้างรายงานสำหรับผู้ให้บริการเครือข่าย สร้างขึ้นสำหรับ M-Pesa, MTN และอื่นๆ"
        },
        restaurants: {
          title: "เจ้าของร้านอาหารเล็ก",
          description: "จัดการคำสั่งซื้อ ติดตามส่วนผสม คำนวณต้นทุนอาหาร และจัดการทั้งรับประทานในร้านและสั่งกลับบ้านอย่างมีประสิทธิภาพ"
        },
        serviceProviders: {
          title: "ผู้ให้บริการ",
          description: "สำหรับช่างประปา ช่างไฟฟ้า ช่างเครื่อง และอื่นๆ กำหนดตารางงาน ติดตามอะไหล่ และออกใบแจ้งหนี้เมื่อเสร็จสิ้น"
        },
        onlineSellers: {
          title: "ผู้ขายออนไลน์",
          description: "ซิงค์สินค้าคงคลังข้ามแพลตฟอร์ม จัดการคำสั่งซื้อ และติดตามการจัดส่ง เหมาะสำหรับผู้ขายสื่อสังคม"
        },
        transport: {
          title: "ผู้ประกอบการขนส่ง",
          description: "สำหรับผู้ประกอบการแท็กซี่ บอดาบอดา และตุ๊กตุ๊ก ติดตามรายได้รายวัน ต้นทุนเชื้อเพลิง และตารางการบำรุงรักษา"
        }
      }
    }
  },
  bn: {
    builtForYou: {
      title: "আপনার জন্য তৈরি",
      heading: "একজন পেশাদারের মতো আপনার ব্যবসা পরিচালনা করুন!",
      subheading: "আপনার মতো ব্যবসার মালিকদের জন্য তৈরি",
      cta: "বিশ্বব্যাপী হাজার হাজার ব্যবসার মালিকদের সাথে যোগ দিন যারা তাদের ব্যবসা পরিচালনার জন্য Dott-এর উপর আস্থা রাখেন",
      types: {
        freelancers: {
          title: "ফ্রিল্যান্সার",
          description: "প্রকল্প ট্র্যাক করুন, ক্লায়েন্টদের তাৎক্ষণিক ইনভয়েস করুন এবং এক জায়গায় আপনার আর্থিক ব্যবস্থাপনা করুন। পেশাদার ইনভয়েসের সাথে দ্রুত অর্থ প্রাপ্তি করুন।"
        },
        contractors: {
          title: "ঠিকাদার",
          description: "একাধিক প্রকল্প পরিচালনা করুন, উপকরণ এবং শ্রম খরচ ট্র্যাক করুন এবং পেশাদার উদ্ধৃতি পাঠান। আপনার নগদ প্রবাহ সুস্থ রাখুন।"
        },
        entrepreneurs: {
          title: "উদ্যোক্তা",
          description: "ইনভেন্টরি, বিক্রয় এবং আর্থিক ট্র্যাকিংয়ের জন্য শক্তিশালী সরঞ্জাম দিয়ে আপনার স্টার্টআপ স্কেল করুন। ডেটা-চালিত সিদ্ধান্ত নিন।"
        },
        consultants: {
          title: "পরামর্শদাতা",
          description: "ঘন্টা বা প্রকল্প অনুযায়ী বিল করুন, খরচ ট্র্যাক করুন এবং একাধিক ক্লায়েন্ট সহজেই পরিচালনা করুন। পেশাদার ইনভয়েসিং অন্তর্ভুক্ত।"
        },
        retail: {
          title: "খুচরা দোকানের মালিক",
          description: "বারকোড স্ক্যানিং দিয়ে ইনভেন্টরি পরিচালনা করুন, বিক্রয় ট্র্যাক করুন এবং মোবাইল মানিসহ একাধিক পেমেন্ট পদ্ধতি গ্রহণ করুন।"
        },
        streetVendors: {
          title: "রাস্তার বিক্রেতা",
          description: "দৈনিক বিক্রয় ট্র্যাক করার জন্য সহজ মোবাইল-প্রথম ডিজাইন, ইনভেন্টরি পরিচালনা এবং চলার পথে ডিজিটাল পেমেন্ট গ্রহণ।"
        },
        marketStalls: {
          title: "বাজারের স্টলের মালিক",
          description: "ব্যস্ত বাজারের দিনের জন্য নিখুঁত। দ্রুত বিক্রয় এন্ট্রি, ইনভেন্টরি সতর্কতা এবং আপনার স্থানীয় মুদ্রায় দৈনিক লাভ ট্র্যাকিং।"
        },
        mobileMoneyAgents: {
          title: "মোবাইল মানি এজেন্ট",
          description: "লেনদেন ট্র্যাক করুন, ফ্লোট ব্যালেন্স পরিচালনা করুন এবং নেটওয়ার্ক অপারেটরদের জন্য রিপোর্ট তৈরি করুন। M-Pesa, MTN এবং আরও অনেকের জন্য তৈরি।"
        },
        restaurants: {
          title: "ছোট রেস্তোরাঁর মালিক",
          description: "অর্ডার পরিচালনা করুন, উপাদান ট্র্যাক করুন, খাবারের খরচ গণনা করুন এবং দক্ষতার সাথে ডাইন-ইন এবং টেকঅ্যাওয়ে উভয়ই পরিচালনা করুন।"
        },
        serviceProviders: {
          title: "সেবা প্রদানকারী",
          description: "প্লাম্বার, ইলেকট্রিশিয়ান, মেকানিক এবং আরও অনেকের জন্য। কাজ নির্ধারণ করুন, যন্ত্রাংশ ট্র্যাক করুন এবং সমাপ্তিতে ইনভয়েস করুন।"
        },
        onlineSellers: {
          title: "অনলাইন বিক্রেতা",
          description: "প্ল্যাটফর্ম জুড়ে ইনভেন্টরি সিঙ্ক করুন, অর্ডার পরিচালনা করুন এবং শিপিং ট্র্যাক করুন। সোশ্যাল মিডিয়া বিক্রেতাদের জন্য নিখুঁত।"
        },
        transport: {
          title: "পরিবহন অপারেটর",
          description: "ট্যাক্সি, বোডা বোডা এবং তুক-তুক অপারেটরদের জন্য। দৈনিক আয়, জ্বালানি খরচ এবং রক্ষণাবেক্ষণের সময়সূচী ট্র্যাক করুন।"
        }
      }
    }
  },
  ur: {
    builtForYou: {
      title: "آپ کے لیے بنایا گیا",
      heading: "اپنے کاروبار کو پیشہ ورانہ انداز میں چلائیں!",
      subheading: "آپ جیسے کاروباری مالکان کے لیے بنایا گیا",
      cta: "دنیا بھر کے ہزاروں کاروباری مالکان کے ساتھ شامل ہوں جو اپنے کاروبار کے انتظام کے لیے Dott پر بھروسہ کرتے ہیں",
      types: {
        freelancers: {
          title: "فری لانسرز",
          description: "پروجیکٹس کا پتہ لگائیں، کلائنٹس کو فوری طور پر انوائس کریں اور اپنی مالیات کو ایک جگہ منظم کریں۔ پیشہ ورانہ انوائسز کے ساتھ تیزی سے ادائیگی حاصل کریں۔"
        },
        contractors: {
          title: "ٹھیکیدار",
          description: "متعدد پروجیکٹس کا انتظام کریں، مواد اور لیبر کی لاگت کا پتہ لگائیں اور پیشہ ورانہ کوٹس بھیجیں۔ اپنے کیش فلو کو صحت مند رکھیں۔"
        },
        entrepreneurs: {
          title: "کاروباری",
          description: "انوینٹری، سیلز اور مالیاتی ٹریکنگ کے لیے طاقتور ٹولز کے ساتھ اپنے اسٹارٹ اپ کو بڑھائیں۔ ڈیٹا پر مبنی فیصلے کریں۔"
        },
        consultants: {
          title: "مشیر",
          description: "گھنٹے یا پروجیکٹ کے لحاظ سے بل کریں، اخراجات کا پتہ لگائیں اور متعدد کلائنٹس کو آسانی سے منظم کریں۔ پیشہ ورانہ انوائسنگ شامل ہے۔"
        },
        retail: {
          title: "ریٹیل شاپ کے مالکان",
          description: "بار کوڈ اسکیننگ کے ساتھ انوینٹری کا انتظام کریں، سیلز کا پتہ لگائیں اور موبائل منی سمیت متعدد ادائیگی کے طریقے قبول کریں۔"
        },
        streetVendors: {
          title: "سڑکی فروش",
          description: "روزانہ کی سیلز کا پتہ لگانے کے لیے آسان موبائل فرسٹ ڈیزائن، انوینٹری کا انتظام اور چلتے پھرتے ڈیجیٹل ادائیگیاں قبول کریں۔"
        },
        marketStalls: {
          title: "مارکیٹ اسٹال کے مالکان",
          description: "مصروف مارکیٹ کے دنوں کے لیے بہترین۔ تیز سیلز انٹری، انوینٹری الرٹس اور آپ کی مقامی کرنسی میں روزانہ منافع کی ٹریکنگ۔"
        },
        mobileMoneyAgents: {
          title: "موبائل منی ایجنٹس",
          description: "لین دین کا پتہ لگائیں، فلوٹ بیلنس کا انتظام کریں اور نیٹ ورک آپریٹرز کے لیے رپورٹس بنائیں۔ M-Pesa، MTN اور مزید کے لیے بنایا گیا۔"
        },
        restaurants: {
          title: "چھوٹے ریسٹورنٹ کے مالکان",
          description: "آرڈرز کا انتظام کریں، اجزاء کا پتہ لگائیں، کھانے کی لاگت کیلکولیٹ کریں اور ڈائن ان اور ٹیک اوے دونوں کو مؤثر طریقے سے ہینڈل کریں۔"
        },
        serviceProviders: {
          title: "سروس فراہم کنندگان",
          description: "پلمبرز، الیکٹریشنز، میکینکس اور مزید کے لیے۔ کام شیڈول کریں، پارٹس کا پتہ لگائیں اور مکمل ہونے پر انوائس کریں۔"
        },
        onlineSellers: {
          title: "آن لائن سیلرز",
          description: "پلیٹ فارمز میں انوینٹری سنک کریں، آرڈرز کا انتظام کریں اور شپنگ کا پتہ لگائیں۔ سوشل میڈیا سیلرز کے لیے بہترین۔"
        },
        transport: {
          title: "ٹرانسپورٹ آپریٹرز",
          description: "ٹیکسی، بوڈا بوڈا اور ٹک ٹک آپریٹرز کے لیے۔ روزانہ کی آمدنی، ایندھن کی لاگت اور مینٹیننس شیڈول کا پتہ لگائیں۔"
        }
      }
    }
  },
  tl: {
    builtForYou: {
      title: "Ginawa Para Sa Iyo",
      heading: "Pamahalaan ang inyong negosyo tulad ng isang propesyonal!",
      subheading: "Ginawa para sa mga may-ari ng negosyo tulad ninyo",
      cta: "Sumali sa libu-libong may-ari ng negosyo sa buong mundo na nagtitiwala sa Dott upang pamahalaan ang kanilang negosyo",
      types: {
        freelancers: {
          title: "Freelancers",
          description: "Subaybayan ang mga proyekto, mag-invoice sa mga kliyente agad, at pamahalaan ang inyong pananalapi sa isang lugar. Makakuha ng bayad nang mas mabilis gamit ang propesyonal na mga invoice."
        },
        contractors: {
          title: "Contractors",
          description: "Pamahalaan ang maraming proyekto, subaybayan ang gastos sa mga materyales at paggawa, at magpadala ng propesyonal na mga quote. Panatilihin ang malusog na cash flow."
        },
        entrepreneurs: {
          title: "Entrepreneurs",
          description: "I-scale ang inyong startup gamit ang malakas na mga tools para sa inventory, benta, at financial tracking. Gumawa ng mga desisyon na batay sa datos."
        },
        consultants: {
          title: "Consultants",
          description: "Mag-bill ayon sa oras o proyekto, subaybayan ang mga gastos, at pamahalaan ang maraming kliyente nang walang hirap. Kasama ang propesyonal na invoicing."
        },
        retail: {
          title: "Mga May-ari ng Retail Shop",
          description: "Pamahalaan ang inventory gamit ang barcode scanning, subaybayan ang benta, at tumanggap ng maraming paraan ng pagbabayad kasama ang mobile money."
        },
        streetVendors: {
          title: "Street Vendors",
          description: "Simpleng mobile-first na disenyo upang subaybayan ang araw-araw na benta, pamahalaan ang inventory, at tumanggap ng digital payments habang naglalakbay."
        },
        marketStalls: {
          title: "Mga May-ari ng Market Stall",
          description: "Perpekto para sa mga abalang araw sa palengke. Mabilis na pagpasok ng benta, mga alerto sa inventory, at araw-araw na pagsubaybay ng kita sa inyong lokal na pera."
        },
        mobileMoneyAgents: {
          title: "Mobile Money Agents",
          description: "Subaybayan ang mga transaksyon, pamahalaan ang mga float balance, at lumikha ng mga ulat para sa mga network operator. Ginawa para sa M-Pesa, MTN, at iba pa."
        },
        restaurants: {
          title: "Mga May-ari ng Maliliit na Restaurant",
          description: "Pamahalaan ang mga order, subaybayan ang mga sangkap, kalkulahin ang gastos sa pagkain, at hawakan nang epektibo ang dine-in at takeaway."
        },
        serviceProviders: {
          title: "Service Providers",
          description: "Para sa mga plumber, electrician, mechanic, at iba pa. Mag-schedule ng mga trabaho, subaybayan ang mga parts, at mag-invoice pagkatapos matapos."
        },
        onlineSellers: {
          title: "Online Sellers",
          description: "I-sync ang inventory sa mga platform, pamahalaan ang mga order, at subaybayan ang shipping. Perpekto para sa mga social media sellers."
        },
        transport: {
          title: "Transport Operators",
          description: "Para sa mga operator ng taxi, boda boda, at tuk-tuk. Subaybayan ang araw-araw na kita, gastos sa gasolina, at mga schedule ng maintenance."
        }
      }
    }
  },
  uk: {
    builtForYou: {
      title: "Створено для Вас",
      heading: "Керуйте своїм бізнесом як професіонал!",
      subheading: "Створено для власників бізнесу, таких як ви",
      cta: "Приєднуйтесь до тисяч власників бізнесу по всьому світу, які довіряють Dott керувати своїм бізнесом",
      types: {
        freelancers: {
          title: "Фрілансери",
          description: "Відстежуйте проекти, виставляйте рахунки клієнтам миттєво та керуйте своїми фінансами в одному місці. Отримуйте оплату швидше з професійними рахунками."
        },
        contractors: {
          title: "Підрядники",
          description: "Керуйте кількома проектами, відстежуйте витрати на матеріали та робочу силу і надсилайте професійні кошториси. Підтримуйте здоровий грошовий потік."
        },
        entrepreneurs: {
          title: "Підприємці",
          description: "Масштабуйте свій стартап потужними інструментами для інвентаризації, продажів та фінансового відстеження. Приймайте рішення на основі даних."
        },
        consultants: {
          title: "Консультанти",
          description: "Виставляйте рахунки по годинах або проектах, відстежуйте витрати та керуйте кількома клієнтами без зусиль. Професійне виставлення рахунків включено."
        },
        retail: {
          title: "Власники Роздрібних Магазинів",
          description: "Керуйте інвентаром зі скануванням штрих-кодів, відстежуйте продажі та приймайте кілька способів оплати, включаючи мобільні гроші."
        },
        streetVendors: {
          title: "Вуличні Торговці",
          description: "Простий mobile-first дизайн для відстеження щоденних продажів, керування інвентарем та прийому цифрових платежів на ходу."
        },
        marketStalls: {
          title: "Власники Ринкових Прилавків",
          description: "Ідеально для жвавих ринкових днів. Швидке введення продажів, сповіщення про інвентар та щоденне відстеження прибутку у вашій місцевій валюті."
        },
        mobileMoneyAgents: {
          title: "Агенти Мобільних Грошей",
          description: "Відстежуйте транзакції, керуйте залишками float та генеруйте звіти для мережевих операторів. Створено для M-Pesa, MTN та інших."
        },
        restaurants: {
          title: "Власники Малих Ресторанів",
          description: "Керуйте замовленнями, відстежуйте інгредієнти, обчислюйте витрати на їжу та ефективно обробляйте як обід у ресторані, так і на винос."
        },
        serviceProviders: {
          title: "Постачальники Послуг",
          description: "Для сантехніків, електриків, механіків та інших. Плануйте роботи, відстежуйте деталі та виставляйте рахунки після завершення."
        },
        onlineSellers: {
          title: "Онлайн Продавці",
          description: "Синхронізуйте інвентар між платформами, керуйте замовленнями та відстежуйте доставку. Ідеально для продавців соціальних мереж."
        },
        transport: {
          title: "Оператори Транспорту",
          description: "Для операторів таксі, боди-боди та тук-тук. Відстежуйте щоденні заробітки, витрати на паливо та графіки технічного обслуговування."
        }
      }
    }
  },
  fa: {
    builtForYou: {
      title: "ساخته شده برای شما",
      heading: "کسب و کار خود را مانند یک حرفه‌ای مدیریت کنید!",
      subheading: "برای صاحبان کسب و کار مانند شما ساخته شده",
      cta: "به هزاران صاحب کسب و کار در سراسر جهان بپیوندید که برای مدیریت کسب و کار خود به Dott اعتماد می‌کنند",
      types: {
        freelancers: {
          title: "فریلنسرها",
          description: "پروژه‌ها را پیگیری کنید، فوراً برای مشتریان صورتحساب صادر کنید و امور مالی خود را در یک مکان مدیریت کنید. با صورتحساب‌های حرفه‌ای سریع‌تر پول دریافت کنید."
        },
        contractors: {
          title: "پیمانکاران",
          description: "چندین پروژه را مدیریت کنید، هزینه‌های مواد و نیروی کار را پیگیری کنید و پیشنهادات حرفه‌ای ارسال کنید. جریان نقدی خود را سالم نگه دارید."
        },
        entrepreneurs: {
          title: "کارآفرینان",
          description: "استارتاپ خود را با ابزارهای قدرتمند برای موجودی، فروش و پیگیری مالی مقیاس‌بندی کنید. تصمیمات مبتنی بر داده بگیرید."
        },
        consultants: {
          title: "مشاوران",
          description: "بر اساس ساعت یا پروژه صورتحساب صادر کنید، هزینه‌ها را پیگیری کنید و چندین مشتری را بدون زحمت مدیریت کنید. صورتحساب‌گیری حرفه‌ای شامل است."
        },
        retail: {
          title: "صاحبان فروشگاه‌های خرده‌فروشی",
          description: "موجودی را با اسکن بارکد مدیریت کنید، فروش را پیگیری کنید و چندین روش پرداخت از جمله پول موبایل را بپذیرید."
        },
        streetVendors: {
          title: "فروشندگان خیابانی",
          description: "طراحی ساده mobile-first برای پیگیری فروش روزانه، مدیریت موجودی و پذیرش پرداخت‌های دیجیتال در حین حرکت."
        },
        marketStalls: {
          title: "صاحبان غرفه‌های بازار",
          description: "عالی برای روزهای شلوغ بازار. ورود سریع فروش، هشدارهای موجودی و پیگیری سود روزانه در ارز محلی شما."
        },
        mobileMoneyAgents: {
          title: "نمایندگان پول موبایل",
          description: "تراکنش‌ها را پیگیری کنید، موجودی‌های float را مدیریت کنید و گزارش‌هایی برای اپراتورهای شبکه تولید کنید. برای M-Pesa، MTN و غیره ساخته شده."
        },
        restaurants: {
          title: "صاحبان رستوران‌های کوچک",
          description: "سفارشات را مدیریت کنید، مواد اولیه را پیگیری کنید، هزینه‌های غذا را محاسبه کنید و هم سرو در محل و هم بیرون بر را به طور مؤثر اداره کنید."
        },
        serviceProviders: {
          title: "ارائه‌دهندگان خدمات",
          description: "برای لوله‌کشان، برقکاران، مکانیک‌ها و غیره. کارها را زمان‌بندی کنید، قطعات را پیگیری کنید و پس از تکمیل صورتحساب صادر کنید."
        },
        onlineSellers: {
          title: "فروشندگان آنلاین",
          description: "موجودی را در پلتفرم‌ها همگام‌سازی کنید، سفارشات را مدیریت کنید و حمل و نقل را پیگیری کنید. عالی برای فروشندگان رسانه‌های اجتماعی."
        },
        transport: {
          title: "اپراتورهای حمل و نقل",
          description: "برای اپراتورهای تاکسی، بودا بودا و توک توک. درآمد روزانه، هزینه‌های سوخت و برنامه‌های تعمیر و نگهداری را پیگیری کنید."
        }
      }
    }
  },
  sn: {
    builtForYou: {
      title: "Yakagadzirirwa Iwe",
      heading: "Tongera bhizinesi rako semunyanzvi!",
      subheading: "Yakagadzirirwa varidzi vebhizinesi vakafanana newe",
      cta: "Bata mazuru evaridzi vebhizinesi pasi rose vanovimba naDott kutonga bhizinesi ravo",
      types: {
        freelancers: {
          title: "Freelancers",
          description: "Tevera mapurojekiti, tuma mabhiri kuvatengi nekukasika uye tonge mari yako munzvimbo imwe. Wana mari nekukasika nemabhiri ehunyanzvi."
        },
        contractors: {
          title: "Contractors",
          description: "Tonga mapurojekiti akawanda, tevera mutengo wezvinhu nebasa uye tuma maquote ehunyanzvi. Chengetedza kuyerera kwemari kwako kwakanaka."
        },
        entrepreneurs: {
          title: "Entrepreneurs",
          description: "Wedza startup yako nezvishandiso zvine simba zveinventory, kutengesa, nekutevera mari. Ita sarudzo dzinotsamira padata."
        },
        consultants: {
          title: "Consultants",
          description: "Bhadharisa neawa kana purojekiti, tevera zvinoshandiswa uye tonga vatengi vakawanda zvisingaome. Kubhadhara kwehunyanzvi kwakabatanidzwa."
        },
        retail: {
          title: "Varidzi veZvitoro",
          description: "Tonga inventory nekuscan barcode, tevera kutengesa uye gamuchira nzira dzekubhadhara dzakawanda kusanganisira mobile money."
        },
        streetVendors: {
          title: "Vatengi veMumigwagwa",
          description: "Dhizaini iri nyore ye mobile-first kutevera kutengesa kwezuva nezuva, kutonga inventory uye kugamuchira mubhadharo wedhijitari munzira."
        },
        marketStalls: {
          title: "Varidzi veZvitoro zveMisika",
          description: "Zvakanaka pamazuva akabatikana emisika. Kuisa kutengesa nekukasika, yambiro yeinventory, nekutevera purofiti yezuva rimwe nerimwe mumari yako yemuno."
        },
        mobileMoneyAgents: {
          title: "Vamiririri veMobile Money",
          description: "Tevera kutengesa, tonga zviyero zvefloat uye gadzira mishumo yevashandi venetwork. Yakavakirwa M-Pesa, MTN, nezvimwe."
        },
        restaurants: {
          title: "Varidzi veRestaurant Diki",
          description: "Tonga maoda, tevera zvidyiwa, verengera mutengo wechikafu uye bata zvese zvekudyira mukati nekubvisa zvichibudirira."
        },
        serviceProviders: {
          title: "Vapan'i Vebasa",
          description: "Kuvanachiremba vemvura, magetsi, mota, nezvimwe. Rongovedza mabasa, tevera zvikamu uye bhadhara pakupera."
        },
        onlineSellers: {
          title: "Vatengi veOnline",
          description: "Batanidza inventory kuburikidza nemapuratifomu, tonga maoda uye tevera kutumira. Zvakanaka kuvatengi vesocial media."
        },
        transport: {
          title: "Vashandisi veTransport",
          description: "Kuvashandi vetaxi, boda boda, netuk-tuk. Tevera mari yezuva nezuva, mutengo wepeturu, nemagadzirirwo ekugadzirisa."
        }
      }
    }
  },
  ig: {
    builtForYou: {
      title: "Ewuru Maka Gị",
      heading: "Jikwaa azụmahịa gị dị ka onye ọkachamara!",
      subheading: "Ewuru maka ndị nwe azụmahịa dị ka gị",
      cta: "Sonye na ọtụtụ puku ndị nwe azụmahịa n'ụwa niile na-atụkwasị Dott obi iji jikwaa azụmahịa ha",
      types: {
        freelancers: {
          title: "Freelancers",
          description: "Soro ọrụ, nyefeere ndị ahịa akwụkwọ ụgwọ ozugbo ma jikwaa ego gị n'otu ebe. Nweta ego ngwa ngwa site na akwụkwọ ụgwọ ọkachamara."
        },
        contractors: {
          title: "Ndị Ọrụ Nkwekọrịta",
          description: "Jikwaa ọtụtụ ọrụ, soro ọnụ ahịa ihe na ọrụ ma zitere ndị ahịa ọnụ ahịa ọkachamara. Debe ego gị ka ọ na-eru gị."
        },
        entrepreneurs: {
          title: "Ndị Ọchụnta Ego",
          description: "Wee startup gị site na ngwaọrụ dị ike maka ngwa ahịa, ire ere na nleba anya ego. Me mkpebi dabere na data."
        },
        consultants: {
          title: "Ndị Ndụmọdụ",
          description: "Kwụọ site na elekere ma ọ bụ ọrụ, soro mmefu ma jikwaa ọtụtụ ndị ahịa n'enweghị nsogbu. Akwụkwọ ụgwọ ọkachamara gụnyere."
        },
        retail: {
          title: "Ndị Nwe Ụlọ Ahịa Nta",
          description: "Jikwaa ngwa ahịa site na nyocha barcode, soro ire ere ma nabata ụzọ ịkwụ ụgwọ dị iche iche gụnyere mobile money."
        },
        streetVendors: {
          title: "Ndị Na-ere N'okporo Ụzọ",
          description: "Nhazi mobile-first dị mfe iji soro ire ere kwa ụbọchị, jikwaa ngwa ahịa ma nabata ịkwụ ụgwọ dijitalụ n'ije."
        },
        marketStalls: {
          title: "Ndị Nwe Ụlọ Ahịa Ahịa",
          description: "Dị mma maka ụbọchị ahịa ndị na-achọkarị ihe. Ntinye ire ere ngwa ngwa, mkpọtụ ngwa ahịa na nleba anya uru kwa ụbọchị n'ego obodo gị."
        },
        mobileMoneyAgents: {
          title: "Ndị Nnọchianya Mobile Money",
          description: "Soro azụmahịa, jikwaa nguzozi float ma mepụta akụkọ maka ndị ọrụ netwọk. Ewuru maka M-Pesa, MTN na ndị ọzọ."
        },
        restaurants: {
          title: "Ndị Nwe Nri Nta",
          description: "Jikwaa ọda, soro ihe nri, gbakọọ ọnụ ahịa nri ma jikwaa ma iri nri n'ime na ibu n'ụzọ dị irè."
        },
        serviceProviders: {
          title: "Ndị Na-enye Ọrụ",
          description: "Maka ndị ọrụ mmiri, ọkụ latrik, ndị rụrụ ụgbọala na ndị ọzọ. Hazie ọrụ, soro akụkụ ma nye akwụkwọ ụgwọ mgbe emechara."
        },
        onlineSellers: {
          title: "Ndị Na-ere Online",
          description: "Jikọọ ngwa ahịa n'ofe ikpo okwu, jikwaa ọda ma soro mbupu. Dị mma maka ndị na-ere mgbasa ozi."
        },
        transport: {
          title: "Ndị Ọrụ Njem",
          description: "Maka ndị ọrụ taksi, boda boda na tuk-tuk. Soro ego kwa ụbọchị, ọnụ ahịa mmanụ na usoro nlekọta."
        }
      }
    }
  }
};

// Function to update a language file
function updateLanguageFile(lang, translation) {
  const filePath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales', lang, 'common.json');
  
  try {
    // Read existing file
    let existingData = {};
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    }
    
    // Merge translations
    existingData.builtForYou = translation.builtForYou;
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log(`✅ Updated ${lang}/common.json with Built For You translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error);
  }
}

// Update all languages
Object.keys(builtForYouTranslations).forEach(lang => {
  updateLanguageFile(lang, builtForYouTranslations[lang]);
});

console.log('🎉 Built For You translations completed!');