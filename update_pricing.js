import fs from 'fs';
import path from 'path';

// Translation data for Pricing section
const pricingTranslations = {
  it: {
    pricing: {
      eyebrow: "Prezzi Semplici e Trasparenti",
      heading: "Scegli il Piano Giusto per la Tua Azienda",
      subheading: "Nessun costo nascosto. Nessuna carta di credito richiesta per il piano Basic. Cancella quando vuoi.",
      billing: {
        monthly: "Mensile",
        sixMonths: "6 Mesi",
        annual: "Annuale",
        popular: "POPOLARE",
        save20: "RISPARMIA 20%"
      },
      period: {
        month: "/mese",
        sixMonths: "/6 mesi",
        year: "/anno"
      },
      mostPopular: "PIÙ POPOLARE",
      plans: {
        basic: {
          name: "Basic",
          description: "Perfetto per iniziare",
          cta: "Inizia Gratis"
        },
        professional: {
          name: "Professional",
          description: "Per aziende in crescita che hanno bisogno di più",
          cta: "Ottieni Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Scala illimitata per grandi organizzazioni",
          cta: "Inizia Enterprise"
        }
      }
    }
  },
  pl: {
    pricing: {
      eyebrow: "Proste, Przejrzyste Ceny",
      heading: "Wybierz Odpowiedni Plan dla Twojej Firmy",
      subheading: "Bez ukrytych opłat. Karta kredytowa nie jest wymagana dla planu Basic. Anuluj w dowolnym momencie.",
      billing: {
        monthly: "Miesięcznie",
        sixMonths: "6 Miesięcy",
        annual: "Rocznie",
        popular: "POPULARNE",
        save20: "OSZCZĘDŹ 20%"
      },
      period: {
        month: "/miesiąc",
        sixMonths: "/6 miesięcy",
        year: "/rok"
      },
      mostPopular: "NAJPOPULARNIEJSZY",
      plans: {
        basic: {
          name: "Basic",
          description: "Idealny na start",
          cta: "Zacznij Za Darmo"
        },
        professional: {
          name: "Professional",
          description: "Dla rozwijających się firm, które potrzebują więcej",
          cta: "Wybierz Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Nieograniczona skala dla dużych organizacji",
          cta: "Zacznij Enterprise"
        }
      }
    }
  },
  th: {
    pricing: {
      eyebrow: "ราคาที่เรียบง่ายและโปร่งใส",
      heading: "เลือกแผนที่เหมาะสมกับธุรกิจของคุณ",
      subheading: "ไม่มีค่าใช้จ่ายที่ซ่อนเร้น ไม่ต้องใช้บัตรเครดิตสำหรับแผน Basic ยกเลิกได้ทุกเมื่อ",
      billing: {
        monthly: "รายเดือน",
        sixMonths: "6 เดือน",
        annual: "รายปี",
        popular: "ยอดนิยม",
        save20: "ประหยัด 20%"
      },
      period: {
        month: "/เดือน",
        sixMonths: "/6 เดือน",
        year: "/ปี"
      },
      mostPopular: "ยอดนิยมที่สุด",
      plans: {
        basic: {
          name: "Basic",
          description: "เหมาะสำหรับการเริ่มต้น",
          cta: "เริ่มฟรี"
        },
        professional: {
          name: "Professional",
          description: "สำหรับธุรกิจที่เติบโตที่ต้องการมากกว่า",
          cta: "เลือก Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "ขยายไร้ขีดจำกัดสำหรับองค์กรขนาดใหญ่",
          cta: "เริ่ม Enterprise"
        }
      }
    }
  },
  bn: {
    pricing: {
      eyebrow: "সহজ, স্বচ্ছ মূল্য",
      heading: "আপনার ব্যবসার জন্য সঠিক পরিকল্পনা বেছে নিন",
      subheading: "কোনো লুকানো ফি নেই। Basic পরিকল্পনার জন্য কোনো ক্রেডিট কার্ডের প্রয়োজন নেই। যেকোনো সময় বাতিল করুন।",
      billing: {
        monthly: "মাসিক",
        sixMonths: "৬ মাস",
        annual: "বার্ষিক",
        popular: "জনপ্রিয়",
        save20: "২০% সাশ্রয়"
      },
      period: {
        month: "/মাস",
        sixMonths: "/৬ মাস",
        year: "/বছর"
      },
      mostPopular: "সবচেয়ে জনপ্রিয়",
      plans: {
        basic: {
          name: "Basic",
          description: "শুরুর জন্য নিখুঁত",
          cta: "বিনামূল্যে শুরু করুন"
        },
        professional: {
          name: "Professional",
          description: "ক্রমবর্ধমান ব্যবসার জন্য যাদের আরও প্রয়োজন",
          cta: "Professional নিন"
        },
        enterprise: {
          name: "Enterprise",
          description: "বড় সংস্থার জন্য সীমাহীন স্কেল",
          cta: "Enterprise শুরু করুন"
        }
      }
    }
  },
  ur: {
    pricing: {
      eyebrow: "سادہ، شفاف قیمتیں",
      heading: "اپنے کاروبار کے لیے صحیح پلان منتخب کریں",
      subheading: "کوئی چھپی ہوئی فیس نہیں۔ Basic پلان کے لیے کوئی کریڈٹ کارڈ درکار نہیں۔ کسی بھی وقت منسوخ کریں۔",
      billing: {
        monthly: "ماہانہ",
        sixMonths: "6 ماہ",
        annual: "سالانہ",
        popular: "مقبول",
        save20: "20% بچائیں"
      },
      period: {
        month: "/ماہ",
        sixMonths: "/6 ماہ",
        year: "/سال"
      },
      mostPopular: "سب سے زیادہ مقبول",
      plans: {
        basic: {
          name: "Basic",
          description: "شروعات کے لیے بہترین",
          cta: "مفت شروع کریں"
        },
        professional: {
          name: "Professional",
          description: "بڑھتے ہوئے کاروبار کے لیے جن کو زیادہ کی ضرورت ہے",
          cta: "Professional حاصل کریں"
        },
        enterprise: {
          name: "Enterprise",
          description: "بڑی تنظیموں کے لیے لامحدود پیمانہ",
          cta: "Enterprise شروع کریں"
        }
      }
    }
  },
  tl: {
    pricing: {
      eyebrow: "Simple, Transparent na Presyo",
      heading: "Pumili ng Tamang Plan para sa Inyong Business",
      subheading: "Walang nakatagong bayad. Walang credit card na kailangan para sa Basic plan. Cancel anumang oras.",
      billing: {
        monthly: "Buwanang",
        sixMonths: "6 na Buwan",
        annual: "Taunan",
        popular: "SIKAT",
        save20: "MAKATIPID NG 20%"
      },
      period: {
        month: "/buwan",
        sixMonths: "/6 na buwan",
        year: "/taon"
      },
      mostPopular: "PINAKASIKAT",
      plans: {
        basic: {
          name: "Basic",
          description: "Perpekto para sa pagsisimula",
          cta: "Simulan Nang Libre"
        },
        professional: {
          name: "Professional",
          description: "Para sa lumalaking business na kailangan ng higit pa",
          cta: "Kunin ang Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Walang limitasyon na scale para sa malalaking organisasyon",
          cta: "Simulan ang Enterprise"
        }
      }
    }
  },
  uk: {
    pricing: {
      eyebrow: "Прості, Прозорі Ціни",
      heading: "Оберіть Правильний План для Вашого Бізнесу",
      subheading: "Без прихованих комісій. Кредитна картка не потрібна для плану Basic. Скасуйте будь-коли.",
      billing: {
        monthly: "Щомісячно",
        sixMonths: "6 Місяців",
        annual: "Щорічно",
        popular: "ПОПУЛЯРНИЙ",
        save20: "ЗАОЩАДЬ 20%"
      },
      period: {
        month: "/місяць",
        sixMonths: "/6 місяців",
        year: "/рік"
      },
      mostPopular: "НАЙПОПУЛЯРНІШИЙ",
      plans: {
        basic: {
          name: "Basic",
          description: "Ідеально для початку",
          cta: "Почати Безкоштовно"
        },
        professional: {
          name: "Professional",
          description: "Для зростаючих бізнесів, яким потрібно більше",
          cta: "Отримати Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Необмежений масштаб для великих організацій",
          cta: "Почати Enterprise"
        }
      }
    }
  },
  fa: {
    pricing: {
      eyebrow: "قیمت‌های ساده و شفاف",
      heading: "طرح مناسب را برای کسب‌وکار خود انتخاب کنید",
      subheading: "بدون هزینه پنهان. برای طرح Basic کارت اعتباری نیاز نیست. هر زمان که خواستید لغو کنید.",
      billing: {
        monthly: "ماهانه",
        sixMonths: "۶ ماهه",
        annual: "سالانه",
        popular: "محبوب",
        save20: "۲۰٪ صرفه‌جویی"
      },
      period: {
        month: "/ماه",
        sixMonths: "/۶ ماه",
        year: "/سال"
      },
      mostPopular: "محبوب‌ترین",
      plans: {
        basic: {
          name: "Basic",
          description: "عالی برای شروع",
          cta: "شروع رایگان"
        },
        professional: {
          name: "Professional",
          description: "برای کسب‌وکارهای در حال رشد که به بیشتر نیاز دارند",
          cta: "Professional دریافت کنید"
        },
        enterprise: {
          name: "Enterprise",
          description: "مقیاس نامحدود برای سازمان‌های بزرگ",
          cta: "Enterprise شروع کنید"
        }
      }
    }
  },
  sn: {
    pricing: {
      eyebrow: "Mitengo Iri Nyore uye Yakajeka",
      heading: "Sarudza Chirongwa Chakakodzera Bhizinesi Rako",
      subheading: "Hapana mitengo yakavanzika. Hapana kadhi rechikwereti rinodiwa kune Basic plan. Misa chero riini.",
      billing: {
        monthly: "Pamwedzi",
        sixMonths: "Mwedzi 6",
        annual: "Pagore",
        popular: "YAKAKURUMBIRA",
        save20: "CHENGETEDZA 20%"
      },
      period: {
        month: "/mwedzi",
        sixMonths: "/mwedzi 6",
        year: "/gore"
      },
      mostPopular: "YAKANYANYA KUKURUMBIRA",
      plans: {
        basic: {
          name: "Basic",
          description: "Yakanakira kutanga",
          cta: "Tanga Mahara"
        },
        professional: {
          name: "Professional",
          description: "Kune mabhizinesi ari kukura anoda zvakawanda",
          cta: "Tora Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Kusina muganhu kune masangano makuru",
          cta: "Tanga Enterprise"
        }
      }
    }
  },
  ig: {
    pricing: {
      eyebrow: "Ọnụ ahịa dị mfe na nke doro anya",
      heading: "Họrọ atụmatụ kwesịrị ekwesị maka azụmahịa gị",
      subheading: "Enweghị ụgwọ zoro ezo. Achọghị kaadị kredit maka atụmatụ Basic. Kagbuo mgbe ọ bụla.",
      billing: {
        monthly: "Kwa ọnwa",
        sixMonths: "Ọnwa 6",
        annual: "Kwa afọ",
        popular: "AMA AMA",
        save20: "CHEKWAA 20%"
      },
      period: {
        month: "/ọnwa",
        sixMonths: "/ọnwa 6",
        year: "/afọ"
      },
      mostPopular: "KACHA AMA AMA",
      plans: {
        basic: {
          name: "Basic",
          description: "Zuru oke maka mmalite",
          cta: "Malite n'efu"
        },
        professional: {
          name: "Professional",
          description: "Maka azụmahịa na-eto eto nke chọrọ karịa",
          cta: "Nweta Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Enweghị oke maka nnukwu nzukọ",
          cta: "Malite Enterprise"
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
    existingData.pricing = translation.pricing;
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log(`✅ Updated ${lang}/common.json with Pricing translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error);
  }
}

// Update all languages
Object.keys(pricingTranslations).forEach(lang => {
  updateLanguageFile(lang, pricingTranslations[lang]);
});

console.log('🎉 Pricing translations completed!');