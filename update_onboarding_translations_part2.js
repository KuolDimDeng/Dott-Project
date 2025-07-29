import fs from 'fs';
import path from 'path';

// Translation data for remaining 7 languages: Bengali, Urdu, Filipino, Ukrainian, Persian, Shona, Igbo
const onboardingTranslations = {
  bn: {
    businessInfo: {
      title: "ব্যবসায়িক তথ্য",
      subtitle: "আপনার ব্যবসা সম্পর্কে আমাদের বলুন",
      step: "ধাপ ১ এর ৩",
      businessNameLabel: "ব্যবসার নাম",
      businessNamePlaceholder: "আপনার ব্যবসার নাম লিখুন",
      businessTypeLabel: "ব্যবসার ধরন",
      businessTypePlaceholder: "আপনার ব্যবসার ধরন নির্বাচন করুন",
      industryLabel: "শিল্প",
      industryPlaceholder: "আপনার শিল্প নির্বাচন করুন",
      legalStructureLabel: "আইনি কাঠামো",
      legalStructurePlaceholder: "আইনি কাঠামো নির্বাচন করুন",
      countryLabel: "দেশ",
      countryPlaceholder: "আপনার দেশ নির্বাচন করুন",
      stateLabel: "রাজ্য/প্রদেশ",
      statePlaceholder: "আপনার রাজ্য নির্বাচন করুন",
      dateFoundedLabel: "প্রতিষ্ঠার তারিখ",
      addressLabel: "ব্যবসায়িক ঠিকানা",
      addressPlaceholder: "আপনার ব্যবসায়িক ঠিকানা লিখুন",
      phoneLabel: "ব্যবসায়িক ফোন",
      phonePlaceholder: "+880 123 456 789",
      emailLabel: "ব্যবসায়িক ইমেইল",
      emailPlaceholder: "business@example.com",
      websiteLabel: "ওয়েবসাইট (ঐচ্ছিক)",
      websitePlaceholder: "https://www.example.com",
      nextButton: "সাবস্ক্রিপশনে চালিয়ে যান",
      skipButton: "এখনই বাদ দিন",
      businessTypes: {
        retail: "খুচরা বিক্রয়",
        restaurant: "রেস্তোরাঁ",
        services: "সেবা",
        manufacturing: "উৎপাদন",
        technology: "প্রযুক্তি",
        healthcare: "স্বাস্থ্যসেবা",
        construction: "নির্মাণ",
        realestate: "স্থাবর সম্পত্তি",
        nonprofit: "অলাভজনক",
        other: "অন্যান্য"
      },
      legalStructures: {
        sole_proprietorship: "একক মালিকানা",
        partnership: "অংশীদারিত্ব",
        llc: "লিমিটেড কোম্পানি",
        corporation: "কর্পোরেশন",
        nonprofit: "অলাভজনক",
        other: "অন্যান্য"
      },
      errors: {
        businessNameRequired: "ব্যবসার নাম প্রয়োজন",
        businessNameTooShort: "ব্যবসার নাম কমপক্ষে ২টি অক্ষরের হতে হবে",
        businessTypeRequired: "দয়া করে একটি ব্যবসার ধরন নির্বাচন করুন",
        legalStructureRequired: "দয়া করে একটি আইনি কাঠামো নির্বাচন করুন",
        countryRequired: "দয়া করে একটি দেশ নির্বাচন করুন",
        emailInvalid: "দয়া করে একটি বৈধ ইমেইল ঠিকানা লিখুন",
        phoneInvalid: "দয়া করে একটি বৈধ ফোন নম্বর লিখুন",
        websiteInvalid: "দয়া করে একটি বৈধ ওয়েবসাইট URL লিখুন"
      },
      saving: "সংরক্ষণ করা হচ্ছে..."
    },
    subscription: {
      title: "আপনার পরিকল্পনা বেছে নিন",
      subtitle: "আপনার ব্যবসার চাহিদার সাথে সবচেয়ে ভালো মানানসই পরিকল্পনা নির্বাচন করুন",
      step: "ধাপ ২ এর ৩",
      billingCycle: {
        monthly: "মাসিক",
        sixMonth: "৬ মাস",
        yearly: "বার্ষিক",
        popular: "জনপ্রিয়",
        save: "{{percentage}}% সাশ্রয় করুন"
      },
      plans: {
        free: {
          name: "বেসিক",
          description: "শুরুর জন্য ছোট ব্যবসার জন্য নিখুঁত",
          price: "বিনামূল্যে",
          features: [
            "আয় এবং ব্যয় ট্র্যাকিং",
            "ইনভয়েস তৈরি এবং অনুস্মারক",
            "Stripe এবং PayPal পেমেন্ট",
            "মোবাইল মানি (M-Pesa ইত্যাদি)",
            "বেসিক ইনভেন্টরি ট্র্যাকিং",
            "বারকোড স্ক্যানিং",
            "৩GB স্টোরেজ সীমা",
            "শুধুমাত্র ১ জন ব্যবহারকারী"
          ],
          buttonText: "বিনামূল্যে শুরু করুন"
        },
        basic: {
          name: "বেসিক",
          description: "শুরুর জন্য ছোট ব্যবসার জন্য নিখুঁত",
          price: "বিনামূল্যে",
          features: [
            "আয় এবং ব্যয় ট্র্যাকিং",
            "ইনভয়েস তৈরি এবং অনুস্মারক",
            "Stripe এবং PayPal পেমেন্ট",
            "মোবাইল মানি (M-Pesa ইত্যাদি)",
            "বেসিক ইনভেন্টরি ট্র্যাকিং",
            "বারকোড স্ক্যানিং",
            "৩GB স্টোরেজ সীমা",
            "শুধুমাত্র ১ জন ব্যবহারকারী"
          ],
          buttonText: "বিনামূল্যে শুরু করুন"
        },
        professional: {
          name: "প্রফেশনাল",
          description: "ক্রমবর্ধমান ব্যবসার প্রয়োজনীয় সবকিছু",
          price: "${{price}}/{{period}}",
          popularBadge: "সবচেয়ে জনপ্রিয়",
          features: [
            "বেসিকের সবকিছু",
            "৩ জন পর্যন্ত ব্যবহারকারী",
            "সীমাহীন স্টোরেজ",
            "অগ্রাধিকার সহায়তা",
            "সকল বৈশিষ্ট্য অন্তর্ভুক্ত",
            "৬ মাসে {{discount}}% ছাড়",
            "বার্ষিক {{yearlyDiscount}}% ছাড়"
          ],
          buttonText: "প্রফেশনাল বেছে নিন"
        },
        enterprise: {
          name: "এন্টারপ্রাইজ",
          description: "উচ্চাভিলাষী সংস্থার জন্য সীমাহীন স্কেল",
          price: "${{price}}/{{period}}",
          premiumBadge: "প্রিমিয়াম",
          features: [
            "প্রফেশনালের সবকিছু",
            "সীমাহীন ব্যবহারকারী",
            "কাস্টম অনবোর্ডিং",
            "নিবেদিত সহায়তা",
            "সকল বৈশিষ্ট্য অন্তর্ভুক্ত",
            "৬ মাসে {{discount}}% ছাড়",
            "বার্ষিক {{yearlyDiscount}}% ছাড়"
          ],
          buttonText: "এন্টারপ্রাইজ বেছে নিন"
        }
      },
      regionalDiscount: {
        badge: "সব পরিকল্পনায় {{percentage}}% ছাড়!",
        description: "{{country}}-এর ব্যবসার জন্য বিশেষ মূল্য",
        percentOff: "{{percentage}}% ছাড়",
        yourRegion: "আপনার অঞ্চল"
      },
      paymentMethods: {
        mpesa: {
          title: "M-Pesa পেমেন্ট উপলব্ধ!",
          description: "আপনার সাবস্ক্রিপশনের জন্য মোবাইল মানি দিয়ে সুবিধাজনকভাবে পেমেন্ট করুন",
          payInCurrency: "{{currency}}-তে পেমেন্ট করুন"
        }
      },
      savings: {
        sixMonth: "${{amount}} সাশ্রয় (${{monthly}}/মাস)",
        yearly: "বছরে ${{amount}} সাশ্রয়"
      },
      backButton: "ব্যবসায়িক তথ্যে ফিরে যান",
      processing: "প্রক্রিয়াকরণ...",
      note: "* আঞ্চলিক মূল্য উপলব্ধ। আপনার অবস্থানের উপর ভিত্তি করে মূল্য স্বয়ংক্রিয়ভাবে সমন্বিত।"
    },
    payment: {
      title: "আপনার সাবস্ক্রিপশন সম্পূর্ণ করুন",
      subtitle: "{{plan}} পরিকল্পনা • ${{price}}/{{period}}",
      step: "ধাপ ৩ এর ৩",
      discountBadge: "{{percentage}}% ছাড়",
      originalPrice: "মূল: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% আঞ্চলিক ছাড় প্রয়োগ করা হয়েছে!",
        subtitle: "{{country}}-এর ব্যবসার জন্য বিশেষ মূল্য"
      },
      paymentMethod: {
        title: "পেমেন্ট পদ্ধতি নির্বাচন করুন",
        card: {
          name: "ক্রেডিট/ডেবিট কার্ড",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "মোবাইল মানি",
          payInCurrency: "{{currency}}-তে পেমেন্ট করুন"
        },
        flutterwave: {
          name: "ব্যাংক ট্রান্সফার",
          description: "ব্যাংক ট্রান্সফারের মাধ্যমে পেমেন্ট করুন"
        },
        mtn: {
          name: "MTN মোবাইল মানি",
          description: "মোবাইল মানি পেমেন্ট"
        }
      },
      cardPayment: {
        cardholderName: "কার্ডধারীর নাম",
        cardholderNamePlaceholder: "রহিম উদ্দিন",
        cardNumber: "কার্ড নম্বর",
        expiryDate: "মেয়াদ উত্তীর্ণের তারিখ",
        cvc: "CVC",
        postalCode: "পোস্টাল কোড",
        postalCodePlaceholder: "১২৩৪"
      },
      mobilePayment: {
        phoneNumber: "{{provider}} ফোন নম্বর",
        phoneNumberPlaceholder: "০১৭১২৩৪৫৬৭৮",
        phoneNumberHint: "আপনার নিবন্ধিত {{provider}} ফোন নম্বর লিখুন",
        localPrice: "{{currency}}-তে মূল্য: {{symbol}} {{amount}}",
        exchangeRate: "বিনিময় হার: ১ USD = {{rate}} {{currency}}",
        instructions: {
          title: "{{provider}} পেমেন্ট কীভাবে কাজ করে:",
          steps: [
            "নিচে \"{{provider}} দিয়ে পেমেন্ট করুন\" ক্লিক করুন",
            "আপনার ফোনে একটি পেমেন্ট প্রম্পট পাবেন",
            "পেমেন্ট সম্পূর্ণ করতে আপনার {{provider}} PIN লিখুন",
            "পেমেন্ট নিশ্চিত হলে আপনাকে রিডাইরেক্ট করা হবে"
          ]
        }
      },
      submitButton: {
        card: "${{price}}/{{period}} সাবস্ক্রাইব করুন",
        mobile: "{{provider}} দিয়ে পেমেন্ট - {{symbol}}{{amount}}",
        processing: "পেমেন্ট প্রক্রিয়াকরণ..."
      },
      securityBadge: "Stripe দ্বারা সুরক্ষিত",
      cancelNote: "আপনি যেকোনো সময় আপনার ড্যাশবোর্ড থেকে বাতিল বা পরিকল্পনা পরিবর্তন করতে পারেন।",
      errors: {
        cardholderNameRequired: "দয়া করে কার্ডধারীর নাম লিখুন",
        postalCodeRequired: "দয়া করে আপনার পোস্টাল কোড লিখুন",
        phoneRequired: "দয়া করে আপনার {{provider}} ফোন নম্বর লিখুন",
        businessInfoMissing: "ব্যবসায়িক তথ্য অনুপস্থিত। দয়া করে প্রথমে ব্যবসায়িক সেটআপ ধাপ সম্পূর্ণ করুন।",
        paymentFailed: "পেমেন্ট ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
        cardDeclined: "আপনার কার্ড প্রত্যাখ্যান করা হয়েছে। দয়া করে অন্য কার্ড ব্যবহার করুন।",
        insufficientFunds: "অপর্যাপ্ত অর্থ। দয়া করে আপনার ব্যালেন্স চেক করুন।",
        networkError: "নেটওয়ার্ক ত্রুটি। দয়া করে আপনার সংযোগ চেক করুন।"
      },
      success: {
        title: "পেমেন্ট সফল!",
        message: "আপনার ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...",
        mpesaTitle: "M-Pesa পেমেন্ট শুরু করা হয়েছে!",
        mpesaMessage: "M-Pesa পেমেন্ট প্রম্পটের জন্য আপনার ফোন চেক করুন",
        mpesaHint: "পেমেন্ট সম্পূর্ণ করতে আপনার PIN লিখুন",
        redirecting: "আপনার ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে..."
      }
    },
    completion: {
      title: "Dott-এ স্বাগতম!",
      subtitle: "আপনার অ্যাকাউন্ট সব সেট আপ হয়ে গেছে",
      message: "আপনি আপনার ব্যবসার অর্থ ব্যবস্থাপনা শুরু করার জন্য প্রস্তুত",
      dashboardButton: "ড্যাশবোর্ডে যান",
      setupComplete: "সেটআপ সম্পূর্ণ"
    },
    errors: {
      sessionExpired: "আপনার সেশন মেয়াদ উত্তীর্ণ হয়েছে। দয়া করে আবার সাইন ইন করুন।",
      networkError: "নেটওয়ার্ক ত্রুটি। দয়া করে আপনার সংযোগ চেক করুন।",
      genericError: "একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।",
      requiredField: "এই ফিল্ডটি প্রয়োজনীয়"
    },
    navigation: {
      back: "পিছনে",
      next: "পরবর্তী",
      skip: "বাদ দিন",
      cancel: "বাতিল",
      save: "সংরক্ষণ",
      continue: "চালিয়ে যান"
    }
  },
  ur: {
    businessInfo: {
      title: "کاروباری معلومات",
      subtitle: "اپنے کاروبار کے بارے میں بتائیں",
      step: "قدم 1 از 3",
      businessNameLabel: "کاروبار کا نام",
      businessNamePlaceholder: "اپنے کاروبار کا نام درج کریں",
      businessTypeLabel: "کاروبار کی قسم",
      businessTypePlaceholder: "اپنے کاروبار کی قسم منتخب کریں",
      industryLabel: "صنعت",
      industryPlaceholder: "اپنی صنعت منتخب کریں",
      legalStructureLabel: "قانونی ڈھانچہ",
      legalStructurePlaceholder: "قانونی ڈھانچہ منتخب کریں",
      countryLabel: "ملک",
      countryPlaceholder: "اپنا ملک منتخب کریں",
      stateLabel: "ریاست/صوبہ",
      statePlaceholder: "اپنی ریاست منتخب کریں",
      dateFoundedLabel: "قائم کرنے کی تاریخ",
      addressLabel: "کاروباری پتہ",
      addressPlaceholder: "اپنا کاروباری پتہ درج کریں",
      phoneLabel: "کاروباری فون",
      phonePlaceholder: "+92 123 456 789",
      emailLabel: "کاروباری ای میل",
      emailPlaceholder: "business@example.com",
      websiteLabel: "ویب سائٹ (اختیاری)",
      websitePlaceholder: "https://www.example.com",
      nextButton: "سبسکرپشن پر جاری رکھیں",
      skipButton: "ابھی چھوڑیں",
      businessTypes: {
        retail: "خردہ فروشی",
        restaurant: "ریسٹورنٹ",
        services: "خدمات",
        manufacturing: "مینوفیکچرنگ",
        technology: "ٹیکنالوجی",
        healthcare: "صحت کی دیکھ بھال",
        construction: "تعمیرات",
        realestate: "رئیل اسٹیٹ",
        nonprofit: "غیر منافع بخش",
        other: "دیگر"
      },
      legalStructures: {
        sole_proprietorship: "واحد ملکیت",
        partnership: "شراکت",
        llc: "محدود کمپنی",
        corporation: "کارپوریشن",
        nonprofit: "غیر منافع بخش",
        other: "دیگر"
      },
      errors: {
        businessNameRequired: "کاروبار کا نام ضروری ہے",
        businessNameTooShort: "کاروبار کا نام کم از کم 2 حروف کا ہونا چاہیے",
        businessTypeRequired: "براہ کرم کاروبار کی قسم منتخب کریں",
        legalStructureRequired: "براہ کرم قانونی ڈھانچہ منتخب کریں",
        countryRequired: "براہ کرم ملک منتخب کریں",
        emailInvalid: "براہ کرم درست ای میل ایڈریس درج کریں",
        phoneInvalid: "براہ کرم درست فون نمبر درج کریں",
        websiteInvalid: "براہ کرم درست ویب سائٹ URL درج کریں"
      },
      saving: "محفوظ کر رہا ہے..."
    },
    subscription: {
      title: "اپنا پلان منتخب کریں",
      subtitle: "وہ پلان منتخب کریں جو آپ کے کاروبار کی ضروریات کے لیے سب سے بہتر ہو",
      step: "قدم 2 از 3",
      billingCycle: {
        monthly: "ماہانہ",
        sixMonth: "6 ماہ",
        yearly: "سالانہ",
        popular: "مقبول",
        save: "{{percentage}}% بچائیں"
      },
      plans: {
        free: {
          name: "بنیادی",
          description: "شروعات کرنے والے چھوٹے کاروبار کے لیے بہترین",
          price: "مفت",
          features: [
            "آمدنی اور اخراجات کی ٹریکنگ",
            "انوائس بنانا اور یاد دہانی",
            "Stripe اور PayPal پیمنٹس",
            "موبائل منی (M-Pesa وغیرہ)",
            "بنیادی انوینٹری ٹریکنگ",
            "بارکوڈ اسکیننگ",
            "3GB اسٹوریج حد",
            "صرف 1 صارف"
          ],
          buttonText: "مفت شروع کریں"
        },
        basic: {
          name: "بنیادی",
          description: "شروعات کرنے والے چھوٹے کاروبار کے لیے بہترین",
          price: "مفت",
          features: [
            "آمدنی اور اخراجات کی ٹریکنگ",
            "انوائس بنانا اور یاد دہانی",
            "Stripe اور PayPal پیمنٹس",
            "موبائل منی (M-Pesa وغیرہ)",
            "بنیادی انوینٹری ٹریکنگ",
            "بارکوڈ اسکیننگ",
            "3GB اسٹوریج حد",
            "صرف 1 صارف"
          ],
          buttonText: "مفت شروع کریں"
        },
        professional: {
          name: "پیشہ ور",
          description: "بڑھتے ہوئے کاروبار کو پھلنے پھولنے کے لیے درکار ہر چیز",
          price: "${{price}}/{{period}}",
          popularBadge: "سب سے زیادہ مقبول",
          features: [
            "بنیادی میں سب کچھ",
            "3 صارفین تک",
            "لامحدود اسٹوریج",
            "ترجیحی سپورٹ",
            "تمام فیچرز شامل",
            "6 ماہ پر {{discount}}% ڈسکاؤنٹ",
            "سالانہ {{yearlyDiscount}}% ڈسکاؤنٹ"
          ],
          buttonText: "پیشہ ور منتخب کریں"
        },
        enterprise: {
          name: "انٹرپرائز",
          description: "پرامن تنظیموں کے لیے لامحدود پیمانہ",
          price: "${{price}}/{{period}}",
          premiumBadge: "پریمیم",
          features: [
            "پیشہ ور میں سب کچھ",
            "لامحدود صارفین",
            "کسٹم آن بورڈنگ",
            "مخصوص سپورٹ",
            "تمام فیچرز شامل",
            "6 ماہ پر {{discount}}% ڈسکاؤنٹ",
            "سالانہ {{yearlyDiscount}}% ڈسکاؤنٹ"
          ],
          buttonText: "انٹرپرائز منتخب کریں"
        }
      },
      regionalDiscount: {
        badge: "تمام پلانز پر {{percentage}}% ڈسکاؤنٹ!",
        description: "{{country}} میں کاروبار کے لیے خاص قیمت",
        percentOff: "{{percentage}}% ڈسکاؤنٹ",
        yourRegion: "آپ کا علاقہ"
      },
      paymentMethods: {
        mpesa: {
          title: "M-Pesa پیمنٹ دستیاب!",
          description: "اپنی سبسکرپشن کے لیے موبائل منی سے آسانی سے ادائیگی کریں",
          payInCurrency: "{{currency}} میں ادائیگی کریں"
        }
      },
      savings: {
        sixMonth: "${{amount}} بچائیں (${{monthly}}/ماہ)",
        yearly: "سال میں ${{amount}} بچائیں"
      },
      backButton: "کاروباری معلومات پر واپس",
      processing: "پروسیسنگ...",
      note: "* علاقائی قیمتیں دستیاب۔ آپ کے مقام کی بنیاد پر قیمتیں خودکار طور پر ایڈجسٹ ہو جاتی ہیں۔"
    },
    payment: {
      title: "اپنی سبسکرپشن مکمل کریں",
      subtitle: "{{plan}} پلان • ${{price}}/{{period}}",
      step: "قدم 3 از 3",
      discountBadge: "{{percentage}}% ڈسکاؤنٹ",
      originalPrice: "اصل: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% علاقائی ڈسکاؤنٹ لاگو!",
        subtitle: "{{country}} میں کاروبار کے لیے خاص قیمت"
      },
      paymentMethod: {
        title: "ادائیگی کا طریقہ منتخب کریں",
        card: {
          name: "کریڈٹ/ڈیبٹ کارڈ",
          description: "Visa، Mastercard، Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "موبائل منی",
          payInCurrency: "{{currency}} میں ادائیگی کریں"
        },
        flutterwave: {
          name: "بینک ٹرانسفر",
          description: "بینک ٹرانسفر کے ذریعے ادائیگی کریں"
        },
        mtn: {
          name: "MTN موبائل منی",
          description: "موبائل منی ادائیگی"
        }
      },
      cardPayment: {
        cardholderName: "کارڈ ہولڈر کا نام",
        cardholderNamePlaceholder: "احمد علی",
        cardNumber: "کارڈ نمبر",
        expiryDate: "ختم ہونے کی تاریخ",
        cvc: "CVC",
        postalCode: "پوسٹل کوڈ",
        postalCodePlaceholder: "12345"
      },
      mobilePayment: {
        phoneNumber: "{{provider}} فون نمبر",
        phoneNumberPlaceholder: "03001234567",
        phoneNumberHint: "اپنا رجسٹرڈ {{provider}} فون نمبر درج کریں",
        localPrice: "{{currency}} میں قیمت: {{symbol}} {{amount}}",
        exchangeRate: "تبادلہ کی شرح: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "{{provider}} پیمنٹ کیسے کام کرتا ہے:",
          steps: [
            "نیچے \"{{provider}} سے ادائیگی کریں\" کلک کریں",
            "آپ کو اپنے فون پر پیمنٹ پرامپٹ ملے گا",
            "ادائیگی مکمل کرنے کے لیے اپنا {{provider}} PIN درج کریں",
            "ادائیگی کنفرم ہونے پر آپ کو ری ڈائریکٹ کر دیا جائے گا"
          ]
        }
      },
      submitButton: {
        card: "${{price}}/{{period}} کے لیے سبسکرائب کریں",
        mobile: "{{provider}} سے ادائیگی - {{symbol}}{{amount}}",
        processing: "پیمنٹ پروسیس ہو رہا ہے..."
      },
      securityBadge: "Stripe کے ذریعے محفوظ",
      cancelNote: "آپ اپنے ڈیش بورڈ سے کسی بھی وقت منسوخ کر سکتے ہیں یا پلان تبدیل کر سکتے ہیں۔",
      errors: {
        cardholderNameRequired: "براہ کرم کارڈ ہولڈر کا نام درج کریں",
        postalCodeRequired: "براہ کرم اپنا پوسٹل کوڈ درج کریں",
        phoneRequired: "براہ کرم اپنا {{provider}} فون نمبر درج کریں",
        businessInfoMissing: "کاروباری معلومات غائب ہیں۔ براہ کرم پہلے کاروباری سیٹ اپ کا قدم مکمل کریں۔",
        paymentFailed: "ادائیگی ناکام۔ براہ کرم دوبارہ کوشش کریں۔",
        cardDeclined: "آپ کا کارڈ مسترد کر دیا گیا۔ براہ کرم مختلف کارڈ آزمائیں۔",
        insufficientFunds: "ناکافی فنڈز۔ براہ کرم اپنا بیلنس چیک کریں۔",
        networkError: "نیٹ ورک کی خرابی۔ براہ کرم اپنا کنکشن چیک کریں۔"
      },
      success: {
        title: "ادائیگی کامیاب!",
        message: "آپ کے ڈیش بورڈ پر ری ڈائریکٹ کر رہا ہے...",
        mpesaTitle: "M-Pesa پیمنٹ شروع!",
        mpesaMessage: "M-Pesa پیمنٹ پرامپٹ کے لیے اپنا فون چیک کریں",
        mpesaHint: "ادائیگی مکمل کرنے کے لیے اپنا PIN درج کریں",
        redirecting: "آپ کے ڈیش بورڈ پر ری ڈائریکٹ کر رہا ہے..."
      }
    },
    completion: {
      title: "Dott میں خوش آمدید!",
      subtitle: "آپ کا اکاؤنٹ سب سیٹ اپ ہو گیا",
      message: "آپ اپنے کاروبار کی مالیات کا انتظام شروع کرنے کے لیے تیار ہیں",
      dashboardButton: "ڈیش بورڈ پر جائیں",
      setupComplete: "سیٹ اپ مکمل"
    },
    errors: {
      sessionExpired: "آپ کا سیشن ختم ہو گیا ہے۔ براہ کرم دوبارہ سائن ان کریں۔",
      networkError: "نیٹ ورک کی خرابی۔ براہ کرم اپنا کنکشن چیک کریں۔",
      genericError: "ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔",
      requiredField: "یہ فیلڈ ضروری ہے"
    },
    navigation: {
      back: "واپس",
      next: "اگلا",
      skip: "چھوڑیں",
      cancel: "منسوخ",
      save: "محفوظ کریں",
      continue: "جاری رکھیں"
    }
  },
  tl: {
    businessInfo: {
      title: "Impormasyon ng Negosyo",
      subtitle: "Sabihin sa amin ang tungkol sa inyong negosyo",
      step: "Hakbang 1 ng 3",
      businessNameLabel: "Pangalan ng Negosyo",
      businessNamePlaceholder: "Ilagay ang pangalan ng inyong negosyo",
      businessTypeLabel: "Uri ng Negosyo",
      businessTypePlaceholder: "Piliin ang uri ng inyong negosyo",
      industryLabel: "Industriya",
      industryPlaceholder: "Piliin ang inyong industriya",
      legalStructureLabel: "Legal na Istraktura",
      legalStructurePlaceholder: "Piliin ang legal na istraktura",
      countryLabel: "Bansa",
      countryPlaceholder: "Piliin ang inyong bansa",
      stateLabel: "Estado/Lalawigan",
      statePlaceholder: "Piliin ang inyong estado",
      dateFoundedLabel: "Petsa ng Pagkakatatag",
      addressLabel: "Address ng Negosyo",
      addressPlaceholder: "Ilagay ang address ng inyong negosyo",
      phoneLabel: "Telepono ng Negosyo",
      phonePlaceholder: "+63 123 456 789",
      emailLabel: "Email ng Negosyo",
      emailPlaceholder: "negosyo@halimbawa.com",
      websiteLabel: "Website (opsyonal)",
      websitePlaceholder: "https://www.halimbawa.com",
      nextButton: "Magpatuloy sa Subscription",
      skipButton: "I-skip muna",
      businessTypes: {
        retail: "Retail",
        restaurant: "Restaurant",
        services: "Mga Serbisyo",
        manufacturing: "Manufacturing",
        technology: "Teknolohiya",
        healthcare: "Healthcare",
        construction: "Konstruksiyon",
        realestate: "Real Estate",
        nonprofit: "Non-Profit",
        other: "Iba pa"
      },
      legalStructures: {
        sole_proprietorship: "Sole Proprietorship",
        partnership: "Partnership",
        llc: "Limited Company",
        corporation: "Corporation",
        nonprofit: "Non-Profit",
        other: "Iba pa"
      },
      errors: {
        businessNameRequired: "Kailangan ang pangalan ng negosyo",
        businessNameTooShort: "Ang pangalan ng negosyo ay dapat hindi bababa sa 2 character",
        businessTypeRequired: "Mangyaring pumili ng uri ng negosyo",
        legalStructureRequired: "Mangyaring pumili ng legal na istraktura",
        countryRequired: "Mangyaring pumili ng bansa",
        emailInvalid: "Mangyaring maglagay ng wastong email address",
        phoneInvalid: "Mangyaring maglagay ng wastong phone number",
        websiteInvalid: "Mangyaring maglagay ng wastong website URL"
      },
      saving: "Nise-save..."
    },
    subscription: {
      title: "Piliin Ang Inyong Plan",
      subtitle: "Piliin ang plan na pinakaangkop sa pangangailangan ng inyong negosyo",
      step: "Hakbang 2 ng 3",
      billingCycle: {
        monthly: "Buwanang",
        sixMonth: "6 na Buwan",
        yearly: "Taunan",
        popular: "SIKAT",
        save: "Makatipid ng {{percentage}}%"
      },
      plans: {
        free: {
          name: "Basic",
          description: "Perpekto para sa mga maliliit na negosyong nagsisimula pa lang",
          price: "Libre",
          features: [
            "Pagsubaybay sa kita at gastos",
            "Paggawa ng invoice at mga paalala",
            "Stripe at PayPal payments",
            "Mobile money (M-Pesa, atbp.)",
            "Basic inventory tracking",
            "Barcode scanning",
            "3GB storage limit",
            "1 user lamang"
          ],
          buttonText: "Simulan Nang Libre"
        },
        basic: {
          name: "Basic",
          description: "Perpekto para sa mga maliliit na negosyong nagsisimula pa lang",
          price: "Libre",
          features: [
            "Pagsubaybay sa kita at gastos",
            "Paggawa ng invoice at mga paalala",
            "Stripe at PayPal payments",
            "Mobile money (M-Pesa, atbp.)",
            "Basic inventory tracking",
            "Barcode scanning",
            "3GB storage limit",
            "1 user lamang"
          ],
          buttonText: "Simulan Nang Libre"
        },
        professional: {
          name: "Professional",
          description: "Lahat ng kailangan ng mga lumalaking negosyo para umangat",
          price: "${{price}}/{{period}}",
          popularBadge: "PINAKASIKAT",
          features: [
            "Lahat sa Basic",
            "Hanggang 3 users",
            "Walang limitasyon sa storage",
            "Priority support",
            "Lahat ng features kasama",
            "{{discount}}% discount sa 6 months",
            "{{yearlyDiscount}}% discount sa yearly"
          ],
          buttonText: "Piliin ang Professional"
        },
        enterprise: {
          name: "Enterprise",
          description: "Walang limitasyon na scale para sa malalaking organisasyon",
          price: "${{price}}/{{period}}",
          premiumBadge: "PREMIUM",
          features: [
            "Lahat sa Professional",
            "Walang limitasyon sa users",
            "Custom onboarding",
            "Dedicated support",
            "Lahat ng features kasama",
            "{{discount}}% discount sa 6 months",
            "{{yearlyDiscount}}% discount sa yearly"
          ],
          buttonText: "Piliin ang Enterprise"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% off sa lahat ng plans!",
        description: "Special pricing para sa mga negosyo sa {{country}}",
        percentOff: "{{percentage}}% off",
        yourRegion: "inyong rehiyon"
      },
      paymentMethods: {
        mpesa: {
          title: "M-Pesa payment available!",
          description: "Magbayad nang convenient gamit ang mobile money para sa inyong subscription",
          payInCurrency: "Magbayad sa {{currency}}"
        }
      },
      savings: {
        sixMonth: "Makatipid ng ${{amount}} (${{monthly}}/month)",
        yearly: "Makatipid ng ${{amount}} bawat taon"
      },
      backButton: "Bumalik sa Business Info",
      processing: "Pinoproseso...",
      note: "* May regional pricing. Ang mga presyo ay awtomatikong ina-adjust base sa inyong location."
    },
    payment: {
      title: "Tapusin Ang Inyong Subscription",
      subtitle: "{{plan}} Plan • ${{price}}/{{period}}",
      step: "Hakbang 3 ng 3",
      discountBadge: "{{percentage}}% DISCOUNT",
      originalPrice: "Original: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% regional discount applied!",
        subtitle: "Special pricing para sa mga negosyo sa {{country}}"
      },
      paymentMethod: {
        title: "Piliin ang Payment Method",
        card: {
          name: "Credit/Debit Card",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Mobile Money",
          payInCurrency: "Magbayad sa {{currency}}"
        },
        flutterwave: {
          name: "Bank Transfer",
          description: "Magbayad through bank transfer"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Mobile Money Payment"
        }
      },
      cardPayment: {
        cardholderName: "Pangalan ng Cardholder",
        cardholderNamePlaceholder: "Juan dela Cruz",
        cardNumber: "Card Number",
        expiryDate: "Expiration Date",
        cvc: "CVC",
        postalCode: "Postal Code",
        postalCodePlaceholder: "1234"
      },
      mobilePayment: {
        phoneNumber: "{{provider}} Phone Number",
        phoneNumberPlaceholder: "09123456789",
        phoneNumberHint: "Ilagay ang inyong registered {{provider}} phone number",
        localPrice: "Presyo sa {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Exchange rate: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Paano gumagana ang {{provider}} payment:",
          steps: [
            "I-click ang \"Pay with {{provider}}\" sa baba",
            "Makatanggap kayo ng payment prompt sa inyong phone",
            "I-enter ang inyong {{provider}} PIN para matapos ang payment",
            "Ma-redirect kayo kapag na-confirm ang payment"
          ]
        }
      },
      submitButton: {
        card: "Mag-subscribe para sa ${{price}}/{{period}}",
        mobile: "Magbayad gamit ang {{provider}} - {{symbol}}{{amount}}",
        processing: "Pinoproseso ang Payment..."
      },
      securityBadge: "Secured by Stripe",
      cancelNote: "Pwede ninyong i-cancel o baguhin ang plan anumang oras sa dashboard.",
      errors: {
        cardholderNameRequired: "Mangyaring ilagay ang pangalan ng cardholder",
        postalCodeRequired: "Mangyaring ilagay ang inyong postal code",
        phoneRequired: "Mangyaring ilagay ang inyong {{provider}} phone number",
        businessInfoMissing: "Kulang ang business information. Mangyaring tapusin muna ang business setup step.",
        paymentFailed: "Hindi nagtagumpay ang payment. Subukan ulit.",
        cardDeclined: "Na-decline ang inyong card. Subukan ang ibang card.",
        insufficientFunds: "Hindi sapat ang pondo. I-check ang inyong balance.",
        networkError: "Network error. I-check ang inyong connection."
      },
      success: {
        title: "Matagumpay ang Payment!",
        message: "Ni-redirect sa inyong dashboard...",
        mpesaTitle: "Na-initiate ang M-Pesa Payment!",
        mpesaMessage: "I-check ang inyong phone para sa M-Pesa payment prompt",
        mpesaHint: "I-enter ang inyong PIN para matapos ang payment",
        redirecting: "Ni-redirect sa inyong dashboard..."
      }
    },
    completion: {
      title: "Maligayang pagdating sa Dott!",
      subtitle: "Na-setup na ang inyong account",
      message: "Handa na kayong simulan ang pag-manage ng finances ng inyong business",
      dashboardButton: "Pumunta sa Dashboard",
      setupComplete: "Tapos na ang Setup"
    },
    errors: {
      sessionExpired: "Nag-expire na ang inyong session. Mag-sign in ulit.",
      networkError: "Network error. I-check ang inyong connection.",
      genericError: "May naging problema. Subukan ulit.",
      requiredField: "Kailangan ang field na ito"
    },
    navigation: {
      back: "Bumalik",
      next: "Susunod",
      skip: "I-skip",
      cancel: "I-cancel",
      save: "I-save",
      continue: "Magpatuloy"
    }
  },
  uk: {
    businessInfo: {
      title: "Інформація про Бізнес",
      subtitle: "Розкажіть нам про ваш бізнес",
      step: "Крок 1 з 3",
      businessNameLabel: "Назва Бізнесу",
      businessNamePlaceholder: "Введіть назву вашого бізнесу",
      businessTypeLabel: "Тип Бізнесу",
      businessTypePlaceholder: "Оберіть тип вашого бізнесу",
      industryLabel: "Галузь",
      industryPlaceholder: "Оберіть вашу галузь",
      legalStructureLabel: "Правова Структура",
      legalStructurePlaceholder: "Оберіть правову структуру",
      countryLabel: "Країна",
      countryPlaceholder: "Оберіть вашу країну",
      stateLabel: "Штат/Область",
      statePlaceholder: "Оберіть ваш штат",
      dateFoundedLabel: "Дата Заснування",
      addressLabel: "Адреса Бізнесу",
      addressPlaceholder: "Введіть адресу вашого бізнесу",
      phoneLabel: "Телефон Бізнесу",
      phonePlaceholder: "+380 123 456 789",
      emailLabel: "Email Бізнесу",
      emailPlaceholder: "biznes@priklad.com",
      websiteLabel: "Веб-сайт (необов'язково)",
      websitePlaceholder: "https://www.priklad.com",
      nextButton: "Продовжити до Підписки",
      skipButton: "Пропустити зараз",
      businessTypes: {
        retail: "Роздрібна Торгівля",
        restaurant: "Ресторан",
        services: "Послуги",
        manufacturing: "Виробництво",
        technology: "Технології",
        healthcare: "Охорона Здоров'я",
        construction: "Будівництво",
        realestate: "Нерухомість",
        nonprofit: "Неприбуткова Організація",
        other: "Інше"
      },
      legalStructures: {
        sole_proprietorship: "Приватне Підприємство",
        partnership: "Партнерство",
        llc: "ТОВ",
        corporation: "Корпорація",
        nonprofit: "Неприбуткова Організація",
        other: "Інше"
      },
      errors: {
        businessNameRequired: "Назва бізнесу обов'язкова",
        businessNameTooShort: "Назва бізнесу повинна містити принаймні 2 символи",
        businessTypeRequired: "Будь ласка, оберіть тип бізнесу",
        legalStructureRequired: "Будь ласка, оберіть правову структуру",
        countryRequired: "Будь ласка, оберіть країну",
        emailInvalid: "Будь ласка, введіть правильну електронну адресу",
        phoneInvalid: "Будь ласка, введіть правильний номер телефону",
        websiteInvalid: "Будь ласка, введіть правильний URL веб-сайту"
      },
      saving: "Збереження..."
    },
    subscription: {
      title: "Оберіть Ваш План",
      subtitle: "Оберіть план, який найкраще підходить для потреб вашого бізнесу",
      step: "Крок 2 з 3",
      billingCycle: {
        monthly: "Щомісячно",
        sixMonth: "6 Місяців",
        yearly: "Щорічно",
        popular: "ПОПУЛЯРНИЙ",
        save: "Заощадьте {{percentage}}%"
      },
      plans: {
        free: {
          name: "Базовий",
          description: "Ідеально для малих підприємств, які тільки починають",
          price: "Безкоштовно",
          features: [
            "Відстеження доходів і витрат",
            "Створення рахунків і нагадування",
            "Платежі Stripe і PayPal",
            "Мобільні гроші (M-Pesa тощо)",
            "Базове відстеження інвентаря",
            "Сканування штрих-кодів",
            "Обмеження зберігання 3GB",
            "Тільки 1 користувач"
          ],
          buttonText: "Почати Безкоштовно"
        },
        basic: {
          name: "Базовий",
          description: "Ідеально для малих підприємств, які тільки починають",
          price: "Безкоштовно",
          features: [
            "Відстеження доходів і витрат",
            "Створення рахунків і нагадування",
            "Платежі Stripe і PayPal",
            "Мобільні гроші (M-Pesa тощо)",
            "Базове відстеження інвентаря",
            "Сканування штрих-кодів",
            "Обмеження зберігання 3GB",
            "Тільки 1 користувач"
          ],
          buttonText: "Почати Безкоштовно"
        },
        professional: {
          name: "Професійний",
          description: "Все, що потрібно підприємствам, що зростають, для процвітання",
          price: "${{price}}/{{period}}",
          popularBadge: "НАЙПОПУЛЯРНІШИЙ",
          features: [
            "Все з Базового",
            "До 3 користувачів",
            "Необмежене зберігання",
            "Пріоритетна підтримка",
            "Всі функції включені",
            "{{discount}}% знижка на 6 місяців",
            "{{yearlyDiscount}}% річна знижка"
          ],
          buttonText: "Обрати Професійний"
        },
        enterprise: {
          name: "Корпоративний",
          description: "Необмежений масштаб для амбітних організацій",
          price: "${{price}}/{{period}}",
          premiumBadge: "ПРЕМІУМ",
          features: [
            "Все з Професійного",
            "Необмежена кількість користувачів",
            "Персоналізоване впровадження",
            "Виділена підтримка",
            "Всі функції включені",
            "{{discount}}% знижка на 6 місяців",
            "{{yearlyDiscount}}% річна знижка"
          ],
          buttonText: "Обрати Корпоративний"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% знижка на всі плани!",
        description: "Спеціальні ціни для підприємств у {{country}}",
        percentOff: "{{percentage}}% знижка",
        yourRegion: "ваш регіон"
      },
      paymentMethods: {
        mpesa: {
          title: "Платіж M-Pesa доступний!",
          description: "Зручна оплата мобільними грошима за вашу підписку",
          payInCurrency: "Платіть у {{currency}}"
        }
      },
      savings: {
        sixMonth: "Заощадьте ${{amount}} (${{monthly}}/місяць)",
        yearly: "Заощадьте ${{amount}} на рік"
      },
      backButton: "Назад до Інформації про Бізнес",
      processing: "Обробка...",
      note: "* Доступні регіональні ціни. Ціни автоматично коригуються відповідно до вашого місцезнаходження."
    },
    payment: {
      title: "Завершіть Вашу Підписку",
      subtitle: "План {{plan}} • ${{price}}/{{period}}",
      step: "Крок 3 з 3",
      discountBadge: "{{percentage}}% ЗНИЖКА",
      originalPrice: "Оригінал: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% регіональна знижка застосована!",
        subtitle: "Спеціальні ціни для підприємств у {{country}}"
      },
      paymentMethod: {
        title: "Оберіть Спосіб Оплати",
        card: {
          name: "Кредитна/Дебетна Картка",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Мобільні Гроші",
          payInCurrency: "Платіть у {{currency}}"
        },
        flutterwave: {
          name: "Банківський Переказ",
          description: "Платіть через банківський переказ"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Платіж Мобільними Грошима"
        }
      },
      cardPayment: {
        cardholderName: "Ім'я Власника Картки",
        cardholderNamePlaceholder: "Іван Петренко",
        cardNumber: "Номер Картки",
        expiryDate: "Термін Дії",
        cvc: "CVC",
        postalCode: "Поштовий Індекс",
        postalCodePlaceholder: "01001"
      },
      mobilePayment: {
        phoneNumber: "Номер Телефону {{provider}}",
        phoneNumberPlaceholder: "0671234567",
        phoneNumberHint: "Введіть ваш зареєстрований номер телефону {{provider}}",
        localPrice: "Ціна в {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Обмінний курс: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Як працює платіж {{provider}}:",
          steps: [
            "Натисніть \"Платити через {{provider}}\" нижче",
            "Ви отримаєте запит на платіж на ваш телефон",
            "Введіть ваш PIN {{provider}} для завершення платежу",
            "Вас буде перенаправлено після підтвердження платежу"
          ]
        }
      },
      submitButton: {
        card: "Підписатися за ${{price}}/{{period}}",
        mobile: "Платити через {{provider}} - {{symbol}}{{amount}}",
        processing: "Обробка Платежу..."
      },
      securityBadge: "Захищено Stripe",
      cancelNote: "Ви можете скасувати або змінити план у будь-який час з панелі керування.",
      errors: {
        cardholderNameRequired: "Будь ласка, введіть ім'я власника картки",
        postalCodeRequired: "Будь ласка, введіть ваш поштовий індекс",
        phoneRequired: "Будь ласка, введіть ваш номер телефону {{provider}}",
        businessInfoMissing: "Відсутня інформація про бізнес. Будь ласка, спочатку завершіть крок налаштування бізнесу.",
        paymentFailed: "Платіж не вдався. Будь ласка, спробуйте ще раз.",
        cardDeclined: "Вашу картку було відхилено. Будь ласка, спробуйте іншу картку.",
        insufficientFunds: "Недостатньо коштів. Будь ласка, перевірте ваш баланс.",
        networkError: "Помилка мережі. Будь ласка, перевірте ваше з'єднання."
      },
      success: {
        title: "Платіж Успішний!",
        message: "Перенаправлення до вашої панелі керування...",
        mpesaTitle: "Платіж M-Pesa Ініційовано!",
        mpesaMessage: "Перевірте ваш телефон на предмет запиту платежу M-Pesa",
        mpesaHint: "Введіть ваш PIN для завершення платежу",
        redirecting: "Перенаправлення до вашої панелі керування..."
      }
    },
    completion: {
      title: "Ласкаво просимо до Dott!",
      subtitle: "Ваш обліковий запис повністю налаштовано",
      message: "Ви готові почати керувати фінансами вашого бізнесу",
      dashboardButton: "Перейти до Панелі Керування",
      setupComplete: "Налаштування Завершено"
    },
    errors: {
      sessionExpired: "Ваша сесія закінчилась. Будь ласка, увійдіть знову.",
      networkError: "Помилка мережі. Будь ласка, перевірте ваше з'єднання.",
      genericError: "Сталася помилка. Будь ласка, спробуйте ще раз.",
      requiredField: "Це поле обов'язкове"
    },
    navigation: {
      back: "Назад",
      next: "Далі",
      skip: "Пропустити",
      cancel: "Скасувати",
      save: "Зберегти",
      continue: "Продовжити"
    }
  },
  fa: {
    businessInfo: {
      title: "اطلاعات کسب‌وکار",
      subtitle: "در مورد کسب‌وکارتان به ما بگویید",
      step: "مرحله ۱ از ۳",
      businessNameLabel: "نام کسب‌وکار",
      businessNamePlaceholder: "نام کسب‌وکارتان را وارد کنید",
      businessTypeLabel: "نوع کسب‌وکار",
      businessTypePlaceholder: "نوع کسب‌وکارتان را انتخاب کنید",
      industryLabel: "صنعت",
      industryPlaceholder: "صنعت خود را انتخاب کنید",
      legalStructureLabel: "ساختار حقوقی",
      legalStructurePlaceholder: "ساختار حقوقی را انتخاب کنید",
      countryLabel: "کشور",
      countryPlaceholder: "کشورتان را انتخاب کنید",
      stateLabel: "ایالت/استان",
      statePlaceholder: "ایالت خود را انتخاب کنید",
      dateFoundedLabel: "تاریخ تأسیس",
      addressLabel: "آدرس کسب‌وکار",
      addressPlaceholder: "آدرس کسب‌وکارتان را وارد کنید",
      phoneLabel: "تلفن کسب‌وکار",
      phonePlaceholder: "+98 123 456 789",
      emailLabel: "ایمیل کسب‌وکار",
      emailPlaceholder: "business@example.com",
      websiteLabel: "وب‌سایت (اختیاری)",
      websitePlaceholder: "https://www.example.com",
      nextButton: "ادامه به اشتراک",
      skipButton: "فعلاً رد کن",
      businessTypes: {
        retail: "خرده‌فروشی",
        restaurant: "رستوران",
        services: "خدمات",
        manufacturing: "تولید",
        technology: "فناوری",
        healthcare: "مراقبت‌های بهداشتی",
        construction: "ساخت‌وساز",
        realestate: "املاک",
        nonprofit: "غیرانتفاعی",
        other: "سایر"
      },
      legalStructures: {
        sole_proprietorship: "مالکیت انفرادی",
        partnership: "شراکت",
        llc: "شرکت محدود",
        corporation: "شرکت سهامی",
        nonprofit: "غیرانتفاعی",
        other: "سایر"
      },
      errors: {
        businessNameRequired: "نام کسب‌وکار الزامی است",
        businessNameTooShort: "نام کسب‌وکار باید حداقل ۲ کاراکتر باشد",
        businessTypeRequired: "لطفاً نوع کسب‌وکار را انتخاب کنید",
        legalStructureRequired: "لطفاً ساختار حقوقی را انتخاب کنید",
        countryRequired: "لطفاً کشور را انتخاب کنید",
        emailInvalid: "لطفاً آدرس ایمیل معتبری وارد کنید",
        phoneInvalid: "لطفاً شماره تلفن معتبری وارد کنید",
        websiteInvalid: "لطفاً URL وب‌سایت معتبری وارد کنید"
      },
      saving: "در حال ذخیره..."
    },
    subscription: {
      title: "طرح خود را انتخاب کنید",
      subtitle: "طرحی را انتخاب کنید که بهترین مطابقت را با نیازهای کسب‌وکارتان دارد",
      step: "مرحله ۲ از ۳",
      billingCycle: {
        monthly: "ماهانه",
        sixMonth: "۶ ماهه",
        yearly: "سالانه",
        popular: "محبوب",
        save: "{{percentage}}% صرفه‌جویی"
      },
      plans: {
        free: {
          name: "پایه",
          description: "عالی برای کسب‌وکارهای کوچک که تازه شروع می‌کنند",
          price: "رایگان",
          features: [
            "ردیابی درآمد و هزینه",
            "ایجاد فاکتور و یادآوری",
            "پرداخت‌های Stripe و PayPal",
            "پول موبایل (M-Pesa و غیره)",
            "ردیابی موجودی پایه",
            "اسکن بارکد",
            "محدودیت ذخیره‌سازی ۳GB",
            "فقط ۱ کاربر"
          ],
          buttonText: "شروع رایگان"
        },
        basic: {
          name: "پایه",
          description: "عالی برای کسب‌وکارهای کوچک که تازه شروع می‌کنند",
          price: "رایگان",
          features: [
            "ردیابی درآمد و هزینه",
            "ایجاد فاکتور و یادآوری",
            "پرداخت‌های Stripe و PayPal",
            "پول موبایل (M-Pesa و غیره)",
            "ردیابی موجودی پایه",
            "اسکن بارکد",
            "محدودیت ذخیره‌سازی ۳GB",
            "فقط ۱ کاربر"
          ],
          buttonText: "شروع رایگان"
        },
        professional: {
          name: "حرفه‌ای",
          description: "هر آنچه کسب‌وکارهای در حال رشد برای پیشرفت نیاز دارند",
          price: "${{price}}/{{period}}",
          popularBadge: "محبوب‌ترین",
          features: [
            "همه چیز در پایه",
            "تا ۳ کاربر",
            "ذخیره‌سازی نامحدود",
            "پشتیبانی اولویت‌دار",
            "همه قابلیت‌ها شامل",
            "{{discount}}% تخفیف ۶ ماهه",
            "{{yearlyDiscount}}% تخفیف سالانه"
          ],
          buttonText: "انتخاب حرفه‌ای"
        },
        enterprise: {
          name: "سازمانی",
          description: "مقیاس نامحدود برای سازمان‌های جاه‌طلب",
          price: "${{price}}/{{period}}",
          premiumBadge: "پریمیم",
          features: [
            "همه چیز در حرفه‌ای",
            "کاربران نامحدود",
            "راه‌اندازی سفارشی",
            "پشتیبانی اختصاصی",
            "همه قابلیت‌ها شامل",
            "{{discount}}% تخفیف ۶ ماهه",
            "{{yearlyDiscount}}% تخفیف سالانه"
          ],
          buttonText: "انتخاب سازمانی"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% تخفیف روی همه طرح‌ها!",
        description: "قیمت‌گذاری ویژه برای کسب‌وکارها در {{country}}",
        percentOff: "{{percentage}}% تخفیف",
        yourRegion: "منطقه شما"
      },
      paymentMethods: {
        mpesa: {
          title: "پرداخت M-Pesa در دسترس!",
          description: "به راحتی با پول موبایل برای اشتراکتان پرداخت کنید",
          payInCurrency: "پرداخت در {{currency}}"
        }
      },
      savings: {
        sixMonth: "{{amount}}$ صرفه‌جویی ({{monthly}}$/ماه)",
        yearly: "سالانه {{amount}}$ صرفه‌جویی"
      },
      backButton: "بازگشت به اطلاعات کسب‌وکار",
      processing: "در حال پردازش...",
      note: "*قیمت‌گذاری منطقه‌ای در دسترس. قیمت‌ها به طور خودکار بر اساس موقعیت شما تنظیم می‌شوند."
    },
    payment: {
      title: "اشتراک خود را تکمیل کنید",
      subtitle: "طرح {{plan}} • ${{price}}/{{period}}",
      step: "مرحله ۳ از ۳",
      discountBadge: "{{percentage}}% تخفیف",
      originalPrice: "اصلی: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% تخفیف منطقه‌ای اعمال شد!",
        subtitle: "قیمت‌گذاری ویژه برای کسب‌وکارها در {{country}}"
      },
      paymentMethod: {
        title: "روش پرداخت را انتخاب کنید",
        card: {
          name: "کارت اعتباری/نقدی",
          description: "Visa، Mastercard، Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "پول موبایل",
          payInCurrency: "پرداخت در {{currency}}"
        },
        flutterwave: {
          name: "انتقال بانکی",
          description: "از طریق انتقال بانکی پرداخت کنید"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "پرداخت پول موبایل"
        }
      },
      cardPayment: {
        cardholderName: "نام دارنده کارت",
        cardholderNamePlaceholder: "علی احمدی",
        cardNumber: "شماره کارت",
        expiryDate: "تاریخ انقضا",
        cvc: "CVC",
        postalCode: "کد پستی",
        postalCodePlaceholder: "12345"
      },
      mobilePayment: {
        phoneNumber: "شماره تلفن {{provider}}",
        phoneNumberPlaceholder: "09123456789",
        phoneNumberHint: "شماره تلفن ثبت‌شده {{provider}} خود را وارد کنید",
        localPrice: "قیمت در {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "نرخ تبدیل: ۱ USD = {{rate}} {{currency}}",
        instructions: {
          title: "نحوه کار پرداخت {{provider}}:",
          steps: [
            "روی \"پرداخت با {{provider}}\" در زیر کلیک کنید",
            "درخواست پرداخت را روی تلفنتان دریافت خواهید کرد",
            "PIN {{provider}} خود را برای تکمیل پرداخت وارد کنید",
            "پس از تأیید پرداخت هدایت خواهید شد"
          ]
        }
      },
      submitButton: {
        card: "اشتراک برای ${{price}}/{{period}}",
        mobile: "پرداخت با {{provider}} - {{symbol}}{{amount}}",
        processing: "در حال پردازش پرداخت..."
      },
      securityBadge: "امنیت توسط Stripe",
      cancelNote: "می‌توانید هر زمان از داشبورد لغو کنید یا طرح را تغییر دهید.",
      errors: {
        cardholderNameRequired: "لطفاً نام دارنده کارت را وارد کنید",
        postalCodeRequired: "لطفاً کد پستی خود را وارد کنید",
        phoneRequired: "لطفاً شماره تلفن {{provider}} خود را وارد کنید",
        businessInfoMissing: "اطلاعات کسب‌وکار وجود ندارد. لطفاً ابتدا مرحله راه‌اندازی کسب‌وکار را تکمیل کنید.",
        paymentFailed: "پرداخت ناموفق. لطفاً دوباره تلاش کنید.",
        cardDeclined: "کارت شما رد شد. لطفاً کارت دیگری امتحان کنید.",
        insufficientFunds: "موجودی ناکافی. لطفاً موجودی خود را بررسی کنید.",
        networkError: "خطای شبکه. لطفاً اتصال خود را بررسی کنید."
      },
      success: {
        title: "پرداخت موفق!",
        message: "هدایت به داشبورد شما...",
        mpesaTitle: "پرداخت M-Pesa آغاز شد!",
        mpesaMessage: "تلفن خود را برای درخواست پرداخت M-Pesa بررسی کنید",
        mpesaHint: "PIN خود را برای تکمیل پرداخت وارد کنید",
        redirecting: "هدایت به داشبورد شما..."
      }
    },
    completion: {
      title: "خوش آمدید به Dott!",
      subtitle: "حساب شما کاملاً راه‌اندازی شد",
      message: "آماده شروع مدیریت مالی کسب‌وکارتان هستید",
      dashboardButton: "برو به داشبورد",
      setupComplete: "راه‌اندازی کامل"
    },
    errors: {
      sessionExpired: "جلسه شما منقضی شده. لطفاً دوباره وارد شوید.",
      networkError: "خطای شبکه. لطفاً اتصال خود را بررسی کنید.",
      genericError: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
      requiredField: "این فیلد الزامی است"
    },
    navigation: {
      back: "برگشت",
      next: "بعدی",
      skip: "رد کردن",
      cancel: "لغو",
      save: "ذخیره",
      continue: "ادامه"
    }
  },
  sn: {
    businessInfo: {
      title: "Ruzivo Rwekubhizinesi",
      subtitle: "Tiudze nezve bhizinesi renyu",
      step: "Nhanho 1 ye 3",
      businessNameLabel: "Zita Rebhizinesi",
      businessNamePlaceholder: "Isa zita rebhizinesi renyu",
      businessTypeLabel: "Mhando Yebhizinesi",
      businessTypePlaceholder: "Sarudza mhando yebhizinesi renyu",
      industryLabel: "Indasitiri",
      industryPlaceholder: "Sarudza indasitiri yenyu",
      legalStructureLabel: "Chimiro Chemutemo",
      legalStructurePlaceholder: "Sarudza chimiro chemutemo",
      countryLabel: "Nyika",
      countryPlaceholder: "Sarudza nyika yenyu",
      stateLabel: "Dunhu/Matunhu",
      statePlaceholder: "Sarudza dunhu renyu",
      dateFoundedLabel: "Zuva Rekuvambwa",
      addressLabel: "Kero Yebhizinesi",
      addressPlaceholder: "Isa kero yebhizinesi renyu",
      phoneLabel: "Nhare Yebhizinesi",
      phonePlaceholder: "+263 123 456 789",
      emailLabel: "Email Yebhizinesi",
      emailPlaceholder: "bhizinesi@muenzaniso.com",
      websiteLabel: "Webhusaiti (isina kukosha)",
      websitePlaceholder: "https://www.muenzaniso.com",
      nextButton: "Enderera kuSubscription",
      skipButton: "Siya izvozvi",
      businessTypes: {
        retail: "Kutengesa",
        restaurant: "Resitorendi",
        services: "Mabasa",
        manufacturing: "Kugadzira",
        technology: "Tekinoroji",
        healthcare: "Hutano",
        construction: "Kuvaka",
        realestate: "Ivhu Nedzimba",
        nonprofit: "Zvisingaite Purofiti",
        other: "Zvimwe"
      },
      legalStructures: {
        sole_proprietorship: "Muridzi Mumwe",
        partnership: "Kudyidzana",
        llc: "Kambani Inoshanda",
        corporation: "Korporesheni",
        nonprofit: "Zvisingaite Purofiti",
        other: "Zvimwe"
      },
      errors: {
        businessNameRequired: "Zita rebhizinesi rinodiwa",
        businessNameTooShort: "Zita rebhizinesi rinofanira kunge rine mavara anosvika 2",
        businessTypeRequired: "Ndapota sarudza mhando yebhizinesi",
        legalStructureRequired: "Ndapota sarudza chimiro chemutemo",
        countryRequired: "Ndapota sarudza nyika",
        emailInvalid: "Ndapota isa kero ye-email chairo",
        phoneInvalid: "Ndapota isa nhamba yenhare chairo",
        websiteInvalid: "Ndapota isa URL yewebhusaiti chairo"
      },
      saving: "Tichichengetedza..."
    },
    subscription: {
      title: "Sarudza Chirongwa Chenyu",
      subtitle: "Sarudza chirongwa chinokodzera zvinodiwa nebhizinesi renyu",
      step: "Nhanho 2 ye 3",
      billingCycle: {
        monthly: "Pamwedzi",
        sixMonth: "Mwedzi 6",
        yearly: "Pagore",
        popular: "WAKAKURUMBIRA",
        save: "Chengetedza {{percentage}}%"
      },
      plans: {
        free: {
          name: "Zvekutanga",
          description: "Zvakanakira mabhizinesi madiki anotanga",
          price: "Mahara",
          features: [
            "Kutevera mari inopinda nemari inobuda",
            "Kugadzira mabhiri nekuyeuchidza",
            "Kubhadhara neStripe nePayPal",
            "Mobile money (M-Pesa nezvimwe)",
            "Kutevera zvinhu zvekutanga",
            "Kuona mabhakodhi",
            "Muganhu wekuchengetedza 3GB",
            "Mushandisi 1 chete"
          ],
          buttonText: "Tanga Mahara"
        },
        basic: {
          name: "Zvekutanga",
          description: "Zvakanakira mabhizinesi madiki anotanga",
          price: "Mahara",
          features: [
            "Kutevera mari inopinda nemari inobuda",
            "Kugadzira mabhiri nekuyeuchidza",
            "Kubhadhara neStripe nePayPal",
            "Mobile money (M-Pesa nezvimwe)",
            "Kutevera zvinhu zvekutanga",
            "Kuona mabhakodhi",
            "Muganhu wekuchengetedza 3GB",
            "Mushandisi 1 chete"
          ],
          buttonText: "Tanga Mahara"
        },
        professional: {
          name: "Nyanzvi",
          description: "Zvese zvinodiwa nemabhizinesi ari kukura kuti abudirire",
          price: "${{price}}/{{period}}",
          popularBadge: "INONYANYA KUKURUMBIRA",
          features: [
            "Zvese muZvekutanga",
            "Kusvika pavashandisi 3",
            "Kuchengetedza kusina muganhu",
            "Rubatsiro rwepamberi",
            "Zvese zviri mukati",
            "{{discount}}% kuderedzwa kwemwedzi 6",
            "{{yearlyDiscount}}% kuderedzwa kwegore"
          ],
          buttonText: "Sarudza Nyanzvi"
        },
        enterprise: {
          name: "Kambani",
          description: "Kukura kusina muganhu kumasangano makuru",
          price: "${{price}}/{{period}}",
          premiumBadge: "PREMIUM",
          features: [
            "Zvese muNyanzvi",
            "Vashandisi vasina muganhu",
            "Kugadzirira kwakasarudzika",
            "Rubatsiro rwakatsaurirwa",
            "Zvese zviri mukati",
            "{{discount}}% kuderedzwa kwemwedzi 6",
            "{{yearlyDiscount}}% kuderedzwa kwegore"
          ],
          buttonText: "Sarudza Kambani"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% kuderedzwa pazvese zvirongwa!",
        description: "Mitengo yakasarudzika yemabhizinesi mu{{country}}",
        percentOff: "{{percentage}}% kuderedzwa",
        yourRegion: "nzvimbo yenyu"
      },
      paymentMethods: {
        mpesa: {
          title: "Kubhadhara kweM-Pesa kunowanikwa!",
          description: "Bhadharai zvakareruka nemobile money yesubscription yenyu",
          payInCurrency: "Bhadharai mu{{currency}}"
        }
      },
      savings: {
        sixMonth: "Chengetedza ${{amount}} (${{monthly}}/mwedzi)",
        yearly: "Chengetedza ${{amount}} pagore"
      },
      backButton: "Dzokera kuRuzivo Rwekubhizinesi",
      processing: "Tichigadzirisa...",
      note: "* Mitengo yematunhu inowanikwa. Mitengo inogadziridzwa yega zvichienderana nenzvimbo yenyu."
    },
    payment: {
      title: "Pedzisa Subscription Yenyu",
      subtitle: "Chirongwa che{{plan}} • ${{price}}/{{period}}",
      step: "Nhanho 3 ye 3",
      discountBadge: "{{percentage}}% KUDEREDZWA",
      originalPrice: "Chekutanga: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% kuderedzwa kwematunhu kwaiswa!",
        subtitle: "Mitengo yakasarudzika yemabhizinesi mu{{country}}"
      },
      paymentMethod: {
        title: "Sarudza Nzira Yekubhadhara",
        card: {
          name: "Kadhi Yekikiredhi/Debhiti",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Mobile Money",
          payInCurrency: "Bhadharai mu{{currency}}"
        },
        flutterwave: {
          name: "Kutumira Kubhengi",
          description: "Bhadharai kuburikidza nekutumira kubhengi"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Kubhadhara Mobile Money"
        }
      },
      cardPayment: {
        cardholderName: "Zita reMusina Kadhi",
        cardholderNamePlaceholder: "Tendai Mukamuri",
        cardNumber: "Nhamba yeKadhi",
        expiryDate: "Zuva Rekupera",
        cvc: "CVC",
        postalCode: "Kodhi yePosti",
        postalCodePlaceholder: "1000"
      },
      mobilePayment: {
        phoneNumber: "Nhamba yeNhare ye{{provider}}",
        phoneNumberPlaceholder: "0771234567",
        phoneNumberHint: "Isa nhamba yenyu yenhare yakanyorwa ku{{provider}}",
        localPrice: "Mutengo mu{{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Chiyero chekuchinja: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Maitiro ekubhadhara ne{{provider}}:",
          steps: [
            "Bata \"Bhadhara ne{{provider}}\" pazasi",
            "Muchapiwa chikumbiro chekubhadhara panhare yenyu",
            "Isa PIN yenyu ye{{provider}} kuti mupedze kubhadhara",
            "Muchaendeswa kune imwe nzvimbo kubhadhara kwakasimbiswa"
          ]
        }
      },
      submitButton: {
        card: "Subscribe ye${{price}}/{{period}}",
        mobile: "Bhadhara ne{{provider}} - {{symbol}}{{amount}}",
        processing: "Tichigadzirisa Kubhadhara..."
      },
      securityBadge: "Yakachengetedzwa neStripe",
      cancelNote: "Munogona kumisa kana kuchinja chirongwa chero nguva kubva padashboard.",
      errors: {
        cardholderNameRequired: "Ndapota isa zita remusina kadhi",
        postalCodeRequired: "Ndapota isa kodhi yenyu yeposti",
        phoneRequired: "Ndapota isa nhamba yenyu yenhare ye{{provider}}",
        businessInfoMissing: "Ruzivo rwekubhizinesi haruna. Ndapota pedzisa nhanho yekugadzirira bhizinesi kutanga.",
        paymentFailed: "Kubhadhara kwakadudza. Ndapota edza zvakare.",
        cardDeclined: "Kadhi yenyu yakarambidzwa. Ndapota edza imwe kadhi.",
        insufficientFunds: "Mari haina kukwana. Ndapota tarisa balance yenyu.",
        networkError: "Dambudziko renetwork. Ndapota tarisa kubatana kwenyu."
      },
      success: {
        title: "Kubhadhara Kwakabudirira!",
        message: "Tichikuendesai kudashboard yenyu...",
        mpesaTitle: "Kubhadhara kweM-Pesa Kwatanga!",
        mpesaMessage: "Tarisai nhare yenyu chikumbiro chekubhadhara cheM-Pesa",
        mpesaHint: "Isai PIN yenyu kuti mupedze kubhadhara",
        redirecting: "Tichikuendesai kudashboard yenyu..."
      }
    },
    completion: {
      title: "Makagamuchirwa kuDott!",
      subtitle: "Account yenyu yagadzirwa zvese",
      message: "Makagadzirira kutanga kubata mari yebhizinesi renyu",
      dashboardButton: "Enda kuDashboard",
      setupComplete: "Kugadzirira Kwapera"
    },
    errors: {
      sessionExpired: "Session yenyu yapera. Ndapota pinda zvakare.",
      networkError: "Dambudziko renetwork. Ndapota tarisa kubatana kwenyu.",
      genericError: "Pane chakakanganisa. Ndapota edza zvakare.",
      requiredField: "Munda uyu unodiwa"
    },
    navigation: {
      back: "Kumashure",
      next: "Inotevera",
      skip: "Siya",
      cancel: "Kanzura",
      save: "Chengetedza",
      continue: "Enderera"
    }
  },
  ig: {
    businessInfo: {
      title: "Ozi Azụmahịa",
      subtitle: "Gwa anyị maka azụmahịa gị",
      step: "Nzọụkwụ 1 nke 3",
      businessNameLabel: "Aha Azụmahịa",
      businessNamePlaceholder: "Tinye aha azụmahịa gị",
      businessTypeLabel: "Ụdị Azụmahịa",
      businessTypePlaceholder: "Họrọ ụdị azụmahịa gị",
      industryLabel: "Ụlọ Ọrụ",
      industryPlaceholder: "Họrọ ụlọ ọrụ gị",
      legalStructureLabel: "Usoro Iwu",
      legalStructurePlaceholder: "Họrọ usoro iwu",
      countryLabel: "Obodo",
      countryPlaceholder: "Họrọ obodo gị",
      stateLabel: "Steeti/Mpaghara",
      statePlaceholder: "Họrọ steeti gị",
      dateFoundedLabel: "Ụbọchị E Hibere",
      addressLabel: "Adreesị Azụmahịa",
      addressPlaceholder: "Tinye adreesị azụmahịa gị",
      phoneLabel: "Ekwentị Azụmahịa",
      phonePlaceholder: "+234 123 456 7890",
      emailLabel: "Email Azụmahịa",
      emailPlaceholder: "azụmahịa@ọmụmaatụ.com",
      websiteLabel: "Websaịtị (nhọrọ)",
      websitePlaceholder: "https://www.ọmụmaatụ.com",
      nextButton: "Gaa n'ihu na Ndebanye Aha",
      skipButton: "Hapụ ugbu a",
      businessTypes: {
        retail: "Ire Ahịa",
        restaurant: "Ụlọ Oriri",
        services: "Ọrụ",
        manufacturing: "Nrụpụta",
        technology: "Teknụzụ",
        healthcare: "Nlekọta Ahụike",
        construction: "Owuwu",
        realestate: "Ala na Ụlọ",
        nonprofit: "Enweghị Uru",
        other: "Ndị Ọzọ"
      },
      legalStructures: {
        sole_proprietorship: "Onye Nwe Naanị Ya",
        partnership: "Mmekọrịta",
        llc: "Ụlọ Ọrụ Nwere Oke",
        corporation: "Kọpọreshọn",
        nonprofit: "Enweghị Uru",
        other: "Ndị Ọzọ"
      },
      errors: {
        businessNameRequired: "Aha azụmahịa dị mkpa",
        businessNameTooShort: "Aha azụmahịa ga-enwerịrị opekata nta mkpụrụ akwụkwọ 2",
        businessTypeRequired: "Biko họrọ ụdị azụmahịa",
        legalStructureRequired: "Biko họrọ usoro iwu",
        countryRequired: "Biko họrọ obodo",
        emailInvalid: "Biko tinye adreesị email ziri ezi",
        phoneInvalid: "Biko tinye nọmba ekwentị ziri ezi",
        websiteInvalid: "Biko tinye URL websaịtị ziri ezi"
      },
      saving: "Na-echekwa..."
    },
    subscription: {
      title: "Họrọ Atụmatụ Gị",
      subtitle: "Họrọ atụmatụ kacha dabara adaba mkpa azụmahịa gị",
      step: "Nzọụkwụ 2 nke 3",
      billingCycle: {
        monthly: "Kwa Ọnwa",
        sixMonth: "Ọnwa 6",
        yearly: "Kwa Afọ",
        popular: "AMA AMA",
        save: "Chekwaa {{percentage}}%"
      },
      plans: {
        free: {
          name: "Ntọala",
          description: "Zuru oke maka obere azụmahịa na-amalite",
          price: "N'efu",
          features: [
            "Nsochi ego na-abata na nke na-apụ",
            "Nrụpụta akwụkwọ ụgwọ na ncheta",
            "Ịkwụ ụgwọ Stripe na PayPal",
            "Ego ekwentị (M-Pesa na ndị ọzọ)",
            "Nsochi ngwa ahịa ntọala",
            "Nscanị barcode",
            "Oke nchekwa 3GB",
            "Naanị onye ọrụ 1"
          ],
          buttonText: "Malite N'efu"
        },
        basic: {
          name: "Ntọala",
          description: "Zuru oke maka obere azụmahịa na-amalite",
          price: "N'efu",
          features: [
            "Nsochi ego na-abata na nke na-apụ",
            "Nrụpụta akwụkwọ ụgwọ na ncheta",
            "Ịkwụ ụgwọ Stripe na PayPal",
            "Ego ekwentị (M-Pesa na ndị ọzọ)",
            "Nsochi ngwa ahịa ntọala",
            "Nscanị barcode",
            "Oke nchekwa 3GB",
            "Naanị onye ọrụ 1"
          ],
          buttonText: "Malite N'efu"
        },
        professional: {
          name: "Nkà",
          description: "Ihe niile azụmahịa na-eto eto chọrọ iji mee nke ọma",
          price: "${{price}}/{{period}}",
          popularBadge: "KACHA AMA AMA",
          features: [
            "Ihe niile na Ntọala",
            "Ruo ndị ọrụ 3",
            "Nchekwa enweghị oke",
            "Nkwado mbụ",
            "Atụmatụ niile gụnyere",
            "{{discount}}% mbelata maka ọnwa 6",
            "{{yearlyDiscount}}% mbelata kwa afọ"
          ],
          buttonText: "Họrọ Nkà"
        },
        enterprise: {
          name: "Nnukwu Ụlọ Ọrụ",
          description: "Ogo enweghị oke maka nnukwu nzukọ",
          price: "${{price}}/{{period}}",
          premiumBadge: "PREMIUM",
          features: [
            "Ihe niile na Nkà",
            "Ndị ọrụ enweghị oke",
            "Nkwado pụrụ iche",
            "Nkwado raara onwe ya nye",
            "Atụmatụ niile gụnyere",
            "{{discount}}% mbelata maka ọnwa 6",
            "{{yearlyDiscount}}% mbelata kwa afọ"
          ],
          buttonText: "Họrọ Nnukwu Ụlọ Ọrụ"
        }
      },
      regionalDiscount: {
        badge: "{{percentage}}% mbelata na atụmatụ niile!",
        description: "Ọnụ ahịa pụrụ iche maka azụmahịa na {{country}}",
        percentOff: "{{percentage}}% mbelata",
        yourRegion: "mpaghara gị"
      },
      paymentMethods: {
        mpesa: {
          title: "Ịkwụ ụgwọ M-Pesa dị!",
          description: "Kwụọ ụgwọ na-enweghị nsogbu site na ego ekwentị maka ndebanye aha gị",
          payInCurrency: "Kwụọ na {{currency}}"
        }
      },
      savings: {
        sixMonth: "Chekwaa ${{amount}} (${{monthly}}/ọnwa)",
        yearly: "Chekwaa ${{amount}} kwa afọ"
      },
      backButton: "Laghachi na Ozi Azụmahịa",
      processing: "Na-ahazi...",
      note: "* Ọnụ ahịa mpaghara dị. A na-edozi ọnụ ahịa na-akpaghị aka dabere na ebe ị nọ."
    },
    payment: {
      title: "Mezuo Ndebanye Aha Gị",
      subtitle: "Atụmatụ {{plan}} • ${{price}}/{{period}}",
      step: "Nzọụkwụ 3 nke 3",
      discountBadge: "{{percentage}}% MBELATA",
      originalPrice: "Nke Mbụ: ${{price}}/{{period}}",
      regionalDiscountBanner: {
        title: "{{percentage}}% mbelata mpaghara etinyere!",
        subtitle: "Ọnụ ahịa pụrụ iche maka azụmahịa na {{country}}"
      },
      paymentMethod: {
        title: "Họrọ Ụzọ Ịkwụ Ụgwọ",
        card: {
          name: "Kaadị Kredit/Debit",
          description: "Visa, Mastercard, Amex"
        },
        mpesa: {
          name: "M-Pesa",
          description: "Ego Ekwentị",
          payInCurrency: "Kwụọ na {{currency}}"
        },
        flutterwave: {
          name: "Nnyefe Bank",
          description: "Kwụọ ụgwọ site na nnyefe bank"
        },
        mtn: {
          name: "MTN Mobile Money",
          description: "Ịkwụ Ụgwọ na Ego Ekwentị"
        }
      },
      cardPayment: {
        cardholderName: "Aha Onye Nwe Kaadị",
        cardholderNamePlaceholder: "Emeka Okafor",
        cardNumber: "Nọmba Kaadị",
        expiryDate: "Ụbọchị Nkwụsị",
        cvc: "CVC",
        postalCode: "Koodu Nzi Ozi",
        postalCodePlaceholder: "100001"
      },
      mobilePayment: {
        phoneNumber: "Nọmba Ekwentị {{provider}}",
        phoneNumberPlaceholder: "08012345678",
        phoneNumberHint: "Tinye nọmba ekwentị {{provider}} gị edebanyere aha",
        localPrice: "Ọnụ ahịa na {{currency}}: {{symbol}} {{amount}}",
        exchangeRate: "Ọnụ ahịa mgbanwe: 1 USD = {{rate}} {{currency}}",
        instructions: {
          title: "Otú ịkwụ ụgwọ {{provider}} si arụ ọrụ:",
          steps: [
            "Pịa \"Kwụọ na {{provider}}\" n'okpuru",
            "Ị ga-anata arịrịọ ịkwụ ụgwọ na ekwentị gị",
            "Tinye PIN {{provider}} gị iji mezuo ịkwụ ụgwọ",
            "A ga-edugharị gị ozugbo akwụọla ụgwọ"
          ]
        }
      },
      submitButton: {
        card: "Debanye aha maka ${{price}}/{{period}}",
        mobile: "Kwụọ na {{provider}} - {{symbol}}{{amount}}",
        processing: "Na-ahazi Ịkwụ Ụgwọ..."
      },
      securityBadge: "Stripe na-echebe",
      cancelNote: "Ị nwere ike ịkagbu ma ọ bụ gbanwee atụmatụ mgbe ọ bụla site na dashboard.",
      errors: {
        cardholderNameRequired: "Biko tinye aha onye nwe kaadị",
        postalCodeRequired: "Biko tinye koodu nzi ozi gị",
        phoneRequired: "Biko tinye nọmba ekwentị {{provider}} gị",
        businessInfoMissing: "Ozi azụmahịa na-efu. Biko buuru ụzọ mezuo nzọụkwụ nhazi azụmahịa.",
        paymentFailed: "Ịkwụ ụgwọ adaghị. Biko nwaa ọzọ.",
        cardDeclined: "A jụrụ kaadị gị. Biko nwaa kaadị ọzọ.",
        insufficientFunds: "Ego ezughị. Biko lee balance gị.",
        networkError: "Nsogbu netwọk. Biko lee njikọ gị."
      },
      success: {
        title: "Ịkwụ Ụgwọ Gara Nke Ọma!",
        message: "Na-edugharị gị na dashboard gị...",
        mpesaTitle: "Ịkwụ Ụgwọ M-Pesa Malitere!",
        mpesaMessage: "Lee ekwentị gị maka arịrịọ ịkwụ ụgwọ M-Pesa",
        mpesaHint: "Tinye PIN gị iji mezuo ịkwụ ụgwọ",
        redirecting: "Na-edugharị gị na dashboard gị..."
      }
    },
    completion: {
      title: "Nnọọ na Dott!",
      subtitle: "Akaụntụ gị ka edobere",
      message: "Ị dị njikere ịmalite ijikwa ego azụmahịa gị",
      dashboardButton: "Gaa na Dashboard",
      setupComplete: "Nhazi Ewezugala"
    },
    errors: {
      sessionExpired: "Oge gị agwụla. Biko banye ọzọ.",
      networkError: "Nsogbu netwọk. Biko lee njikọ gị.",
      genericError: "Nsogbu mere. Biko nwaa ọzọ.",
      requiredField: "Oghere a dị mkpa"
    },
    navigation: {
      back: "Azụ",
      next: "Na-esote",
      skip: "Mafụ",
      cancel: "Kagbuo",
      save: "Chekwaa",
      continue: "Gaa n'ihu"
    }
  }
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

// Update remaining 7 languages
Object.keys(onboardingTranslations).forEach(lang => {
  updateLanguageFile(lang, onboardingTranslations[lang]);
});

console.log('🎉 Onboarding translations completed for remaining 7 languages!');