import fs from 'fs';
import path from 'path';

// Translation data for Integrations section
const integrationsTranslations = {
  it: {
    integrations: {
      title: "Integrazioni",
      heading: "Connettiti con gli strumenti che ami",
      subheading: "Integra senza problemi con popolari strumenti business e piattaforme di pagamento",
      availableNow: "Disponibile Ora",
      comingSoon: "Prossimamente",
      logoAlt: "Logo {{name}}",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Invia fatture e ricevute direttamente ai clienti"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Accetta pagamenti mobile money senza problemi"
      },
      stripe: {
        name: "Stripe",
        description: "Elabora pagamenti con carta globalmente"
      },
      shopify: {
        name: "Shopify",
        description: "Sincronizza il tuo inventario e-commerce"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Connetti il tuo negozio WordPress"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Importa ed esporta dati contabili"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Gestisci il tuo business Amazon"
      }
    }
  },
  pl: {
    integrations: {
      title: "Integracje",
      heading: "Połącz się z narzędziami, które kochasz",
      subheading: "Bezproblemowo integruj z popularnymi narzędziami biznesowymi i platformami płatności",
      availableNow: "Dostępne Teraz",
      comingSoon: "Wkrótce",
      logoAlt: "Logo {{name}}",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Wysyłaj faktury i paragony bezpośrednio do klientów"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Akceptuj płatności mobilne bezproblemowo"
      },
      stripe: {
        name: "Stripe",
        description: "Przetwarzaj płatności kartą globalnie"
      },
      shopify: {
        name: "Shopify",
        description: "Synchronizuj swój inwentarz e-commerce"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Połącz swój sklep WordPress"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Importuj i eksportuj dane księgowe"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Zarządzaj swoim biznesem Amazon"
      }
    }
  },
  th: {
    integrations: {
      title: "การเชื่อมต่อ",
      heading: "เชื่อมต่อกับเครื่องมือที่คุณรัก",
      subheading: "เชื่อมต่ออย่างราบรื่นกับเครื่องมือธุรกิจยอดนิยมและแพลตฟอร์มการชำระเงิน",
      availableNow: "พร้อมใช้งานแล้ว",
      comingSoon: "เร็วๆ นี้",
      logoAlt: "โลโก้ {{name}}",
      whatsapp: {
        name: "WhatsApp Business",
        description: "ส่งใบแจ้งหนี้และใบเสร็จไปยังลูกค้าโดยตรง"
      },
      mpesa: {
        name: "M-Pesa",
        description: "รับการชำระเงินแบบ mobile money อย่างราบรื่น"
      },
      stripe: {
        name: "Stripe",
        description: "ประมวลผลการชำระเงินด้วยบัตรทั่วโลก"
      },
      shopify: {
        name: "Shopify",
        description: "ซิงค์สินค้าคงคลัง e-commerce ของคุณ"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "เชื่อมต่อร้านค้า WordPress ของคุณ"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "นำเข้าและส่งออกข้อมูลบัญชี"
      },
      amazon: {
        name: "Amazon Seller",
        description: "จัดการธุรกิจ Amazon ของคุณ"
      }
    }
  },
  bn: {
    integrations: {
      title: "ইন্টিগ্রেশন",
      heading: "আপনার পছন্দের টুলগুলির সাথে সংযুক্ত হন",
      subheading: "জনপ্রিয় ব্যবসায়িক টুল এবং পেমেন্ট প্ল্যাটফর্মের সাথে নির্বিঘ্নে একীভূত হন",
      availableNow: "এখনই উপলব্ধ",
      comingSoon: "শীঘ্রই আসছে",
      logoAlt: "{{name}} লোগো",
      whatsapp: {
        name: "WhatsApp Business",
        description: "গ্রাহকদের কাছে সরাসরি ইনভয়েস এবং রসিদ পাঠান"
      },
      mpesa: {
        name: "M-Pesa",
        description: "নির্বিঘ্নে মোবাইল মানি পেমেন্ট গ্রহণ করুন"
      },
      stripe: {
        name: "Stripe",
        description: "বিশ্বব্যাপী কার্ড পেমেন্ট প্রক্রিয়া করুন"
      },
      shopify: {
        name: "Shopify",
        description: "আপনার ই-কমার্স ইনভেন্টরি সিঙ্ক করুন"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "আপনার WordPress স্টোর সংযুক্ত করুন"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "অ্যাকাউন্টিং ডেটা আমদানি ও রপ্তানি করুন"
      },
      amazon: {
        name: "Amazon Seller",
        description: "আপনার Amazon ব্যবসা পরিচালনা করুন"
      }
    }
  },
  ur: {
    integrations: {
      title: "انضمام",
      heading: "اپنے پسندیدہ ٹولز کے ساتھ جڑیں",
      subheading: "مقبول کاروباری ٹولز اور ادائیگی کے پلیٹ فارمز کے ساتھ آسانی سے ضم کریں",
      availableNow: "ابھی دستیاب",
      comingSoon: "جلد آرہا",
      logoAlt: "{{name}} لوگو",
      whatsapp: {
        name: "WhatsApp Business",
        description: "گاہکوں کو براہ راست انوائسز اور رسیدیں بھیجیں"
      },
      mpesa: {
        name: "M-Pesa",
        description: "آسانی سے موبائل منی پیمنٹس قبول کریں"
      },
      stripe: {
        name: "Stripe",
        description: "عالمی سطح پر کارڈ پیمنٹس پروسیس کریں"
      },
      shopify: {
        name: "Shopify",
        description: "اپنے ای کامرس انوینٹری کو سنک کریں"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "اپنا WordPress اسٹور کنکٹ کریں"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "اکاؤنٹنگ ڈیٹا امپورٹ اور ایکسپورٹ کریں"
      },
      amazon: {
        name: "Amazon Seller",
        description: "اپنا Amazon کاروبار منظم کریں"
      }
    }
  },
  tl: {
    integrations: {
      title: "Mga Integration",
      heading: "Kumonekta sa mga tools na mahal mo",
      subheading: "Walang problema na mag-integrate sa mga sikat na business tools at payment platforms",
      availableNow: "Available Na Ngayon",
      comingSoon: "Malapit Na",
      logoAlt: "{{name}} logo",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Magpadala ng mga invoice at resibo direkta sa mga customer"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Tumanggap ng mobile money payments nang walang problema"
      },
      stripe: {
        name: "Stripe",
        description: "Mag-process ng card payments sa buong mundo"
      },
      shopify: {
        name: "Shopify",
        description: "I-sync ang inyong e-commerce inventory"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Ikonekta ang inyong WordPress store"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Mag-import at mag-export ng accounting data"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Pamahalaan ang inyong Amazon business"
      }
    }
  },
  uk: {
    integrations: {
      title: "Інтеграції",
      heading: "Підключайтеся до інструментів, які ви любите",
      subheading: "Безперешкодно інтегруйтеся з популярними бізнес-інструментами та платіжними платформами",
      availableNow: "Доступно Зараз",
      comingSoon: "Незабаром",
      logoAlt: "Логотип {{name}}",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Надсилайте рахунки та чеки безпосередньо клієнтам"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Приймайте мобільні платежі без проблем"
      },
      stripe: {
        name: "Stripe",
        description: "Обробляйте картковий платежі по всьому світу"
      },
      shopify: {
        name: "Shopify",
        description: "Синхронізуйте свій інвентар електронної комерції"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Підключіть свій магазин WordPress"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Імпортуйте та експортуйте бухгалтерські дані"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Керуйте своїм бізнесом на Amazon"
      }
    }
  },
  fa: {
    integrations: {
      title: "ادغام‌ها",
      heading: "با ابزارهایی که دوست دارید متصل شوید",
      subheading: "به راحتی با ابزارهای تجاری محبوب و پلتفرم‌های پرداخت ادغام کنید",
      availableNow: "هم اکنون در دسترس",
      comingSoon: "به زودی",
      logoAlt: "لوگوی {{name}}",
      whatsapp: {
        name: "WhatsApp Business",
        description: "صورتحساب‌ها و رسیدها را مستقیماً برای مشتریان ارسال کنید"
      },
      mpesa: {
        name: "M-Pesa",
        description: "پرداخت‌های پول موبایل را بدون مشکل بپذیرید"
      },
      stripe: {
        name: "Stripe",
        description: "پرداخت‌های کارتی را در سراسر جهان پردازش کنید"
      },
      shopify: {
        name: "Shopify",
        description: "موجودی تجارت الکترونیک خود را همگام‌سازی کنید"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "فروشگاه WordPress خود را متصل کنید"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "داده‌های حسابداری را وارد و صادر کنید"
      },
      amazon: {
        name: "Amazon Seller",
        description: "کسب و کار Amazon خود را مدیریت کنید"
      }
    }
  },
  sn: {
    integrations: {
      title: "Kubatanidza",
      heading: "Batanidza nezvishandiso zvaunoda",
      subheading: "Batanidza zvisina dambudziko nezvishandiso zvebhizinesi zvinofarirwa nemaplatifomu ekubhadhara",
      availableNow: "Zviripo Zvino",
      comingSoon: "Zvichauya Uku",
      logoAlt: "{{name}} logo",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Tumira mabhiri nezvikwereti zvakananga kuvatengi"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Gamuchira mubhadharo wemobile money zvisina dambudziko"
      },
      stripe: {
        name: "Stripe",
        description: "Gadzirisa mubhadharo wemakadi pasi rose"
      },
      shopify: {
        name: "Shopify",
        description: "Batidzirai inventory yenyu ye-commerce"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Batanidza chitoro chenyu cheWordPress"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Pinza uye budisa data yeaccounting"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Tonga bhizinesi renyu reAmazon"
      }
    }
  },
  ig: {
    integrations: {
      title: "Njikọta",
      heading: "Jikọọ na ngwaọrụ ndị ị hụrụ n'anya",
      subheading: "Jikọọ na ngwaọrụ azụmahịa a ma ama na ikpo okwu ịkwụ ụgwọ n'enweghị nsogbu",
      availableNow: "Dị ugbu a",
      comingSoon: "Na-abịa n'oge na-adịghị anya",
      logoAlt: "{{name}} logo",
      whatsapp: {
        name: "WhatsApp Business",
        description: "Zipụrụ akwụkwọ ụgwọ na akwụkwọ nnata ozugbo nye ndị ahịa"
      },
      mpesa: {
        name: "M-Pesa",
        description: "Nabata ịkwụ ụgwọ mobile money n'enweghị nsogbu"
      },
      stripe: {
        name: "Stripe",
        description: "Hazie ịkwụ ụgwọ kaadị n'ụwa niile"
      },
      shopify: {
        name: "Shopify",
        description: "Jikọọ ngwa ahịa e-commerce gị"
      },
      woocommerce: {
        name: "WooCommerce",
        description: "Jikọọ ụlọ ahịa WordPress gị"
      },
      quickbooks: {
        name: "QuickBooks",
        description: "Bubata ma mepụta data akụkọ"
      },
      amazon: {
        name: "Amazon Seller",
        description: "Jikwaa azụmahịa Amazon gị"
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
    existingData.integrations = translation.integrations;
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log(`✅ Updated ${lang}/common.json with Integrations translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error);
  }
}

// Update all languages
Object.keys(integrationsTranslations).forEach(lang => {
  updateLanguageFile(lang, integrationsTranslations[lang]);
});

console.log('🎉 Integrations translations completed!');