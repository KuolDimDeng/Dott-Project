import fs from 'fs';
import path from 'path';

// Translation data for Auth (signin, signup, forgot password, etc.)
const authTranslations = {
  it: {
    signin: {
      title: "Bentornato",
      subtitle: "Accedi al tuo account",
      emailLabel: "Indirizzo email",
      passwordLabel: "Password",
      rememberMe: "Ricordami",
      forgotPassword: "Password dimenticata?",
      signinButton: "Accedi",
      signingIn: "Accesso in corso...",
      orContinueWith: "Oppure continua con",
      googleSignin: "Accedi con Google",
      noAccount: "Non hai un account?",
      signupLink: "Registrati",
      termsText: "Accedendo, accetti i nostri",
      errors: {
        emailRequired: "L'email è obbligatoria",
        passwordRequired: "La password è obbligatoria",
        invalidCredentials: "Email o password non valida",
        accountLocked: "Il tuo account è stato bloccato. Contatta il supporto.",
        networkError: "Errore di rete. Controlla la tua connessione.",
        genericError: "Si è verificato un errore. Riprova.",
        emailNotVerified: "Verifica il tuo indirizzo email prima di accedere. Controlla la tua casella di posta per l'email di verifica.",
        backendUnavailable: "I nostri server sono temporaneamente non disponibili. Riprova tra qualche momento.",
        sessionCreationFailed: "Impossibile accedere in questo momento. Riprova o usa il login email/password.",
        sessionExpired: "La tua sessione è scaduta. Accedi di nuovo.",
        tokenExchangeFailed: "Accesso con Google fallito. Prova a usare email/password o contatta il supporto.",
        oauthConfigurationError: "L'accesso con Google è temporaneamente non disponibile a causa di un problema di configurazione. Usa il login email/password.",
        enterEmailFirst: "Inserisci prima il tuo indirizzo email",
        passwordResetSent: "Email di reset password inviata! Controlla la tua casella di posta.",
        passwordResetError: "Errore nell'invio dell'email di reset password"
      }
    },
    signup: {
      title: "Crea il tuo account",
      subtitle: "Inizia la tua prova gratuita oggi",
      firstNameLabel: "Nome",
      lastNameLabel: "Cognome",
      emailLabel: "Indirizzo email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Conferma password",
      signupButton: "Crea account",
      creatingAccount: "Creazione account...",
      orContinueWith: "Oppure continua con",
      googleSignup: "Registrati con Google",
      hasAccount: "Hai già un account?",
      signinLink: "Accedi",
      termsText: "Registrandoti, accetti i nostri",
      termsLink: "Termini di Servizio",
      andText: "e",
      privacyLink: "Politica sulla Privacy",
      passwordRequirements: {
        title: "La password deve contenere:",
        minLength: "Almeno 8 caratteri",
        uppercase: "Una lettera maiuscola",
        lowercase: "Una lettera minuscola",
        number: "Un numero",
        special: "Un carattere speciale"
      },
      errors: {
        firstNameRequired: "Il nome è obbligatorio",
        lastNameRequired: "Il cognome è obbligatorio",
        emailRequired: "L'email è obbligatoria",
        emailInvalid: "Inserisci un'email valida",
        emailExists: "Esiste già un account con questa email",
        passwordRequired: "La password è obbligatoria",
        passwordTooShort: "La password deve contenere almeno 8 caratteri",
        passwordTooWeak: "La password è troppo debole",
        passwordMismatch: "Le password non corrispondono",
        termsRequired: "Devi accettare i termini e le condizioni",
        genericError: "Si è verificato un errore. Riprova.",
        accountCreated: "Account creato con successo! Controlla la tua email per verificare l'account prima di accedere."
      },
      verificationEmail: {
        resendButton: "Reinvia email di verifica",
        emailRequired: "Inserisci il tuo indirizzo email",
        sent: "Email di verifica inviata! Controlla la tua casella di posta.",
        error: "Errore nell'invio dell'email di verifica. Riprova."
      }
    },
    forgotPassword: {
      title: "Reimposta la tua password",
      subtitle: "Inserisci la tua email e ti invieremo un link di reset",
      emailLabel: "Indirizzo email",
      sendButton: "Invia link di reset",
      sending: "Invio in corso...",
      backToSignin: "Torna all'accesso",
      success: {
        title: "Controlla la tua email",
        message: "Abbiamo inviato un link di reset password a {{email}}"
      },
      errors: {
        emailRequired: "L'email è obbligatoria",
        emailInvalid: "Inserisci un'email valida",
        emailNotFound: "Nessun account trovato con questa email",
        tooManyAttempts: "Troppi tentativi. Riprova più tardi."
      }
    },
    resetPassword: {
      title: "Crea nuova password",
      subtitle: "Inserisci la tua nuova password qui sotto",
      newPasswordLabel: "Nuova password",
      confirmPasswordLabel: "Conferma nuova password",
      resetButton: "Reimposta password",
      resetting: "Reimpostazione...",
      success: {
        title: "Reset password riuscito",
        message: "La tua password è stata reimpostata. Ora puoi accedere con la tua nuova password.",
        signinButton: "Accedi"
      },
      errors: {
        tokenInvalid: "Questo link di reset non è valido o è scaduto",
        passwordRequired: "La password è obbligatoria",
        passwordTooShort: "La password deve contenere almeno 8 caratteri",
        passwordMismatch: "Le password non corrispondono"
      }
    },
    oauth: {
      processing: "Completamento autenticazione...",
      redirecting: "Reindirizzamento...",
      errors: {
        cancelled: "L'autenticazione è stata annullata",
        failed: "Autenticazione fallita. Riprova.",
        accountExists: "Esiste già un account con questa email"
      }
    }
  },
  pl: {
    signin: {
      title: "Witamy ponownie",
      subtitle: "Zaloguj się do swojego konta",
      emailLabel: "Adres email",
      passwordLabel: "Hasło",
      rememberMe: "Zapamiętaj mnie",
      forgotPassword: "Zapomniałeś hasła?",
      signinButton: "Zaloguj się",
      signingIn: "Logowanie...",
      orContinueWith: "Lub kontynuuj z",
      googleSignin: "Zaloguj się przez Google",
      noAccount: "Nie masz konta?",
      signupLink: "Zarejestruj się",
      termsText: "Logując się, akceptujesz nasze",
      errors: {
        emailRequired: "Email jest wymagany",
        passwordRequired: "Hasło jest wymagane",
        invalidCredentials: "Nieprawidłowy email lub hasło",
        accountLocked: "Twoje konto zostało zablokowane. Skontaktuj się z pomocą techniczną.",
        networkError: "Błąd sieci. Sprawdź swoje połączenie.",
        genericError: "Wystąpił błąd. Spróbuj ponownie.",
        emailNotVerified: "Zweryfikuj swój adres email przed zalogowaniem. Sprawdź swoją skrzynkę pocztową, aby znaleźć email weryfikacyjny.",
        backendUnavailable: "Nasze serwery są tymczasowo niedostępne. Spróbuj ponownie za chwilę.",
        sessionCreationFailed: "Nie można zalogować się w tym momencie. Spróbuj ponownie lub użyj logowania email/hasło.",
        sessionExpired: "Twoja sesja wygasła. Zaloguj się ponownie.",
        tokenExchangeFailed: "Logowanie przez Google nie powiodło się. Spróbuj użyć email/hasło lub skontaktuj się z pomocą techniczną.",
        oauthConfigurationError: "Logowanie przez Google jest tymczasowo niedostępne z powodu problemu konfiguracyjnego. Użyj logowania email/hasło.",
        enterEmailFirst: "Najpierw wprowadź swój adres email",
        passwordResetSent: "Email z resetem hasła został wysłany! Sprawdź swoją skrzynkę pocztową.",
        passwordResetError: "Błąd wysyłania emaila z resetem hasła"
      }
    },
    signup: {
      title: "Utwórz swoje konto",
      subtitle: "Rozpocznij bezpłatny okres próbny już dziś",
      firstNameLabel: "Imię",
      lastNameLabel: "Nazwisko",
      emailLabel: "Adres email",
      passwordLabel: "Hasło",
      confirmPasswordLabel: "Potwierdź hasło",
      signupButton: "Utwórz konto",
      creatingAccount: "Tworzenie konta...",
      orContinueWith: "Lub kontynuuj z",
      googleSignup: "Zarejestruj się przez Google",
      hasAccount: "Masz już konto?",
      signinLink: "Zaloguj się",
      termsText: "Rejestrując się, akceptujesz nasze",
      termsLink: "Warunki Usługi",
      andText: "i",
      privacyLink: "Politykę Prywatności",
      passwordRequirements: {
        title: "Hasło musi zawierać:",
        minLength: "Co najmniej 8 znaków",
        uppercase: "Jedną wielką literę",
        lowercase: "Jedną małą literę",
        number: "Jedną cyfrę",
        special: "Jeden znak specjalny"
      },
      errors: {
        firstNameRequired: "Imię jest wymagane",
        lastNameRequired: "Nazwisko jest wymagane",
        emailRequired: "Email jest wymagany",
        emailInvalid: "Wprowadź prawidłowy email",
        emailExists: "Konto z tym emailem już istnieje",
        passwordRequired: "Hasło jest wymagane",
        passwordTooShort: "Hasło musi mieć co najmniej 8 znaków",
        passwordTooWeak: "Hasło jest za słabe",
        passwordMismatch: "Hasła nie pasują do siebie",
        termsRequired: "Musisz zaakceptować warunki i zasady",
        genericError: "Wystąpił błąd. Spróbuj ponownie.",
        accountCreated: "Konto utworzone pomyślnie! Sprawdź swój email, aby zweryfikować konto przed zalogowaniem."
      },
      verificationEmail: {
        resendButton: "Wyślij ponownie email weryfikacyjny",
        emailRequired: "Wprowadź swój adres email",
        sent: "Email weryfikacyjny wysłany! Sprawdź swoją skrzynkę pocztową.",
        error: "Błąd wysyłania emaila weryfikacyjnego. Spróbuj ponownie."
      }
    },
    forgotPassword: {
      title: "Zresetuj swoje hasło",
      subtitle: "Wprowadź swój email, a wyślemy Ci link do resetu",
      emailLabel: "Adres email",
      sendButton: "Wyślij link resetujący",
      sending: "Wysyłanie...",
      backToSignin: "Powrót do logowania",
      success: {
        title: "Sprawdź swój email",
        message: "Wysłaliśmy link do resetowania hasła na {{email}}"
      },
      errors: {
        emailRequired: "Email jest wymagany",
        emailInvalid: "Wprowadź prawidłowy email",
        emailNotFound: "Nie znaleziono konta z tym emailem",
        tooManyAttempts: "Za dużo prób. Spróbuj ponownie później."
      }
    },
    resetPassword: {
      title: "Utwórz nowe hasło",
      subtitle: "Wprowadź swoje nowe hasło poniżej",
      newPasswordLabel: "Nowe hasło",
      confirmPasswordLabel: "Potwierdź nowe hasło",
      resetButton: "Zresetuj hasło",
      resetting: "Resetowanie...",
      success: {
        title: "Reset hasła zakończony sukcesem",
        message: "Twoje hasło zostało zresetowane. Możesz teraz zalogować się swoim nowym hasłem.",
        signinButton: "Zaloguj się"
      },
      errors: {
        tokenInvalid: "Ten link resetujący jest nieprawidłowy lub wygasł",
        passwordRequired: "Hasło jest wymagane",
        passwordTooShort: "Hasło musi mieć co najmniej 8 znaków",
        passwordMismatch: "Hasła nie pasują do siebie"
      }
    },
    oauth: {
      processing: "Kończenie uwierzytelniania...",
      redirecting: "Przekierowywanie...",
      errors: {
        cancelled: "Uwierzytelnianie zostało anulowane",
        failed: "Uwierzytelnianie nie powiodło się. Spróbuj ponownie.",
        accountExists: "Konto z tym emailem już istnieje"
      }
    }
  },
  th: {
    signin: {
      title: "ยินดีต้อนรับกลับ",
      subtitle: "เข้าสู่ระบบบัญชีของคุณ",
      emailLabel: "ที่อยู่อีเมล",
      passwordLabel: "รหัสผ่าน",
      rememberMe: "จดจำฉัน",
      forgotPassword: "ลืมรหัสผ่าน?",
      signinButton: "เข้าสู่ระบบ",
      signingIn: "กำลังเข้าสู่ระบบ...",
      orContinueWith: "หรือเข้าสู่ระบบด้วย",
      googleSignin: "เข้าสู่ระบบด้วย Google",
      noAccount: "ยังไม่มีบัญชี?",
      signupLink: "สมัครสมาชิก",
      termsText: "การเข้าสู่ระบบ คุณตกลงยอมรับ",
      errors: {
        emailRequired: "จำเป็นต้องใส่อีเมล",
        passwordRequired: "จำเป็นต้องใส่รหัสผ่าน",
        invalidCredentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        accountLocked: "บัญชีของคุณถูกล็อค กรุณาติดต่อฝ่ายสนับสนุน",
        networkError: "เกิดข้อผิดพลาดของเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ",
        genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        emailNotVerified: "กรุณายืนยันที่อยู่อีเมลของคุณก่อนเข้าสู่ระบบ ตรวจสอบอีเมลยืนยันในกล่องจดหมาย",
        backendUnavailable: "เซิร์ฟเวอร์ของเราไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ในอีกสักครู่",
        sessionCreationFailed: "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่หรือใช้การเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน",
        sessionExpired: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่",
        tokenExchangeFailed: "การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใช้อีเมล/รหัสผ่าน หรือติดต่อฝ่ายสนับสนุน",
        oauthConfigurationError: "การเข้าสู่ระบบด้วย Google ไม่พร้อมใช้งานชั่วคราวเนื่องจากปัญหาการกำหนดค่า กรุณาใช้การเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน",
        enterEmailFirst: "กรุณาใส่ที่อยู่อีเมลก่อน",
        passwordResetSent: "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว! ตรวจสอบกล่องจดหมายของคุณ",
        passwordResetError: "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน"
      }
    },
    signup: {
      title: "สร้างบัญชีของคุณ",
      subtitle: "เริ่มทดลองใช้ฟรีวันนี้",
      firstNameLabel: "ชื่อจริง",
      lastNameLabel: "นามสกุล",
      emailLabel: "ที่อยู่อีเมล",
      passwordLabel: "รหัสผ่าน",
      confirmPasswordLabel: "ยืนยันรหัสผ่าน",
      signupButton: "สร้างบัญชี",
      creatingAccount: "กำลังสร้างบัญชี...",
      orContinueWith: "หรือเข้าสู่ระบบด้วย",
      googleSignup: "สมัครด้วย Google",
      hasAccount: "มีบัญชีอยู่แล้ว?",
      signinLink: "เข้าสู่ระบบ",
      termsText: "การสมัครสมาชิก คุณตกลงยอมรับ",
      termsLink: "เงื่อนไขการใช้บริการ",
      andText: "และ",
      privacyLink: "นโยบายความเป็นส่วนตัว",
      passwordRequirements: {
        title: "รหัสผ่านต้องมี:",
        minLength: "อย่างน้อย 8 ตัวอักษร",
        uppercase: "ตัวพิมพ์ใหญ่หนึ่งตัว",
        lowercase: "ตัวพิมพ์เล็กหนึ่งตัว",
        number: "ตัวเลขหนึ่งตัว",
        special: "อักขระพิเศษหนึ่งตัว"
      },
      errors: {
        firstNameRequired: "จำเป็นต้องใส่ชื่อจริง",
        lastNameRequired: "จำเป็นต้องใส่นามสกุล",
        emailRequired: "จำเป็นต้องใส่อีเมล",
        emailInvalid: "กรุณาใส่อีเมลที่ถูกต้อง",
        emailExists: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว",
        passwordRequired: "จำเป็นต้องใส่รหัสผ่าน",
        passwordTooShort: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
        passwordTooWeak: "รหัสผ่านแข็งแรงไม่พอ",
        passwordMismatch: "รหัสผ่านไม่ตรงกัน",
        termsRequired: "คุณต้องยอมรับเงื่อนไขและข้อตกลง",
        genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        accountCreated: "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ"
      },
      verificationEmail: {
        resendButton: "ส่งอีเมลยืนยันใหม่",
        emailRequired: "กรุณาใส่ที่อยู่อีเมลของคุณ",
        sent: "ส่งอีเมลยืนยันแล้ว! กรุณาตรวจสอบกล่องจดหมายของคุณ",
        error: "เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน กรุณาลองใหม่อีกครั้ง"
      }
    },
    forgotPassword: {
      title: "รีเซ็ตรหัสผ่านของคุณ",
      subtitle: "ใส่อีเมลของคุณ เราจะส่งลิงก์รีเซ็ตให้",
      emailLabel: "ที่อยู่อีเมล",
      sendButton: "ส่งลิงก์รีเซ็ต",
      sending: "กำลังส่ง...",
      backToSignin: "กลับไปเข้าสู่ระบบ",
      success: {
        title: "ตรวจสอบอีเมลของคุณ",
        message: "เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ {{email}}"
      },
      errors: {
        emailRequired: "จำเป็นต้องใส่อีเมล",
        emailInvalid: "กรุณาใส่อีเมลที่ถูกต้อง",
        emailNotFound: "ไม่พบบัญชีที่ใช้อีเมลนี้",
        tooManyAttempts: "ลองหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง"
      }
    },
    resetPassword: {
      title: "สร้างรหัสผ่านใหม่",
      subtitle: "ใส่รหัสผ่านใหม่ของคุณด้านล่าง",
      newPasswordLabel: "รหัสผ่านใหม่",
      confirmPasswordLabel: "ยืนยันรหัสผ่านใหม่",
      resetButton: "รีเซ็ตรหัสผ่าน",
      resetting: "กำลังรีเซ็ต...",
      success: {
        title: "รีเซ็ตรหัสผ่านสำเร็จ",
        message: "รหัสผ่านของคุณได้ถูกรีเซ็ตแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้",
        signinButton: "เข้าสู่ระบบ"
      },
      errors: {
        tokenInvalid: "ลิงก์รีเซ็ตนี้ไม่ถูกต้องหรือหมดอายุแล้ว",
        passwordRequired: "จำเป็นต้องใส่รหัสผ่าน",
        passwordTooShort: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
        passwordMismatch: "รหัสผ่านไม่ตรงกัน"
      }
    },
    oauth: {
      processing: "กำลังเสร็จสิ้นการยืนยันตัวตน...",
      redirecting: "กำลังเปลี่ยนเส้นทาง...",
      errors: {
        cancelled: "การยืนยันตัวตนถูกยกเลิก",
        failed: "การยืนยันตัวตนล้มเหลว กรุณาลองใหม่อีกครั้ง",
        accountExists: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว"
      }
    }
  },
  bn: {
    signin: {
      title: "পুনরায় স্বাগতম",
      subtitle: "আপনার অ্যাকাউন্টে সাইন ইন করুন",
      emailLabel: "ইমেইল ঠিকানা",
      passwordLabel: "পাসওয়ার্ড",
      rememberMe: "আমাকে মনে রাখুন",
      forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
      signinButton: "সাইন ইন",
      signingIn: "সাইন ইন হচ্ছে...",
      orContinueWith: "অথবা চালিয়ে যান",
      googleSignin: "Google দিয়ে সাইন ইন করুন",
      noAccount: "কোনো অ্যাকাউন্ট নেই?",
      signupLink: "সাইন আপ",
      termsText: "সাইন ইন করে, আপনি আমাদের সাথে সম্মত হন",
      errors: {
        emailRequired: "ইমেইল প্রয়োজন",
        passwordRequired: "পাসওয়ার্ড প্রয়োজন",
        invalidCredentials: "অবৈধ ইমেইল বা পাসওয়ার্ড",
        accountLocked: "আপনার অ্যাকাউন্ট লক হয়ে গেছে। দয়া করে সাপোর্টের সাথে যোগাযোগ করুন।",
        networkError: "নেটওয়ার্ক ত্রুটি। দয়া করে আপনার সংযোগ পরীক্ষা করুন।",
        genericError: "একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।",
        emailNotVerified: "সাইন ইন করার আগে দয়া করে আপনার ইমেইল ঠিকানা যাচাই করুন। যাচাইকরণ ইমেইলের জন্য আপনার ইনবক্স চেক করুন।",
        backendUnavailable: "আমাদের সার্ভার সাময়িকভাবে অনুপলব্ধ। দয়া করে কিছুক্ষণ পরে আবার চেষ্টা করুন।",
        sessionCreationFailed: "এই মুহূর্তে সাইন ইন করতে অক্ষম। দয়া করে আবার চেষ্টা করুন বা ইমেইল/পাসওয়ার্ড লগইন ব্যবহার করুন।",
        sessionExpired: "আপনার সেশন মেয়াদ উত্তীর্ণ হয়েছে। দয়া করে আবার সাইন ইন করুন।",
        tokenExchangeFailed: "Google দিয়ে সাইন ইন ব্যর্থ হয়েছে। দয়া করে ইমেইল/পাসওয়ার্ড ব্যবহার করার চেষ্টা করুন বা সাপোর্টের সাথে যোগাযোগ করুন।",
        oauthConfigurationError: "কনফিগারেশন সমস্যার কারণে Google সাইন-ইন সাময়িকভাবে অনুপলব্ধ। দয়া করে ইমেইল/পাসওয়ার্ড লগইন ব্যবহার করুন।",
        enterEmailFirst: "দয়া করে প্রথমে আপনার ইমেইল ঠিকানা লিখুন",
        passwordResetSent: "পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে! আপনার ইনবক্স চেক করুন।",
        passwordResetError: "পাসওয়ার্ড রিসেট ইমেইল পাঠাতে ত্রুটি"
      }
    },
    signup: {
      title: "আপনার অ্যাকাউন্ট তৈরি করুন",
      subtitle: "আজই আপনার বিনামূল্যে ট্রায়াল শুরু করুন",
      firstNameLabel: "প্রথম নাম",
      lastNameLabel: "শেষ নাম",
      emailLabel: "ইমেইল ঠিকানা",
      passwordLabel: "পাসওয়ার্ড",
      confirmPasswordLabel: "পাসওয়ার্ড নিশ্চিত করুন",
      signupButton: "অ্যাকাউন্ট তৈরি করুন",
      creatingAccount: "অ্যাকাউন্ট তৈরি হচ্ছে...",
      orContinueWith: "অথবা চালিয়ে যান",
      googleSignup: "Google দিয়ে সাইন আপ করুন",
      hasAccount: "ইতিমধ্যে একটি অ্যাকাউন্ট আছে?",
      signinLink: "সাইন ইন",
      termsText: "সাইন আপ করে, আপনি আমাদের সাথে সম্মত হন",
      termsLink: "সেবার শর্তাবলী",
      andText: "এবং",
      privacyLink: "গোপনীয়তা নীতি",
      passwordRequirements: {
        title: "পাসওয়ার্ডে অবশ্যই থাকতে হবে:",
        minLength: "কমপক্ষে ৮টি অক্ষর",
        uppercase: "একটি বড় হাতের অক্ষর",
        lowercase: "একটি ছোট হাতের অক্ষর",
        number: "একটি সংখ্যা",
        special: "একটি বিশেষ অক্ষর"
      },
      errors: {
        firstNameRequired: "প্রথম নাম প্রয়োজন",
        lastNameRequired: "শেষ নাম প্রয়োজন",
        emailRequired: "ইমেইল প্রয়োজন",
        emailInvalid: "দয়া করে একটি বৈধ ইমেইল লিখুন",
        emailExists: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে",
        passwordRequired: "পাসওয়ার্ড প্রয়োজন",
        passwordTooShort: "পাসওয়ার্ড কমপক্ষে ৮টি অক্ষরের হতে হবে",
        passwordTooWeak: "পাসওয়ার্ড খুবই দুর্বল",
        passwordMismatch: "পাসওয়ার্ড মিলছে না",
        termsRequired: "আপনাকে অবশ্যই শর্তাবলী ও নীতিমালা মেনে নিতে হবে",
        genericError: "একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।",
        accountCreated: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! সাইন ইন করার আগে আপনার অ্যাকাউন্ট যাচাই করতে আপনার ইমেইল চেক করুন।"
      },
      verificationEmail: {
        resendButton: "যাচাইকরণ ইমেইল পুনরায় পাঠান",
        emailRequired: "দয়া করে আপনার ইমেইল ঠিকানা লিখুন",
        sent: "যাচাইকরণ ইমেইল পাঠানো হয়েছে! দয়া করে আপনার ইনবক্স চেক করুন।",
        error: "যাচাইকরণ ইমেইল পাঠাতে ত্রুটি। দয়া করে আবার চেষ্টা করুন।"
      }
    },
    forgotPassword: {
      title: "আপনার পাসওয়ার্ড রিসেট করুন",
      subtitle: "আপনার ইমেইল লিখুন এবং আমরা আপনাকে একটি রিসেট লিঙ্ক পাঠাব",
      emailLabel: "ইমেইল ঠিকানা",
      sendButton: "রিসেট লিঙ্ক পাঠান",
      sending: "পাঠানো হচ্ছে...",
      backToSignin: "সাইন ইনে ফিরে যান",
      success: {
        title: "আপনার ইমেইল চেক করুন",
        message: "আমরা {{email}} এ একটি পাসওয়ার্ড রিসেট লিঙ্ক পাঠিয়েছি"
      },
      errors: {
        emailRequired: "ইমেইল প্রয়োজন",
        emailInvalid: "দয়া করে একটি বৈধ ইমেইল লিখুন",
        emailNotFound: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি",
        tooManyAttempts: "অনেক বেশি চেষ্টা। দয়া করে পরে আবার চেষ্টা করুন।"
      }
    },
    resetPassword: {
      title: "নতুন পাসওয়ার্ড তৈরি করুন",
      subtitle: "নিচে আপনার নতুন পাসওয়ার্ড লিখুন",
      newPasswordLabel: "নতুন পাসওয়ার্ড",
      confirmPasswordLabel: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
      resetButton: "পাসওয়ার্ড রিসেট করুন",
      resetting: "রিসেট হচ্ছে...",
      success: {
        title: "পাসওয়ার্ড রিসেট সফল",
        message: "আপনার পাসওয়ার্ড রিসেট হয়েছে। এখন আপনি আপনার নতুন পাসওয়ার্ড দিয়ে সাইন ইন করতে পারেন।",
        signinButton: "সাইন ইন"
      },
      errors: {
        tokenInvalid: "এই রিসেট লিঙ্কটি অবৈধ বা মেয়াদোত্তীর্ণ",
        passwordRequired: "পাসওয়ার্ড প্রয়োজন",
        passwordTooShort: "পাসওয়ার্ড কমপক্ষে ৮টি অক্ষরের হতে হবে",
        passwordMismatch: "পাসওয়ার্ড মিলছে না"
      }
    },
    oauth: {
      processing: "প্রমাণীকরণ সম্পূর্ণ করা হচ্ছে...",
      redirecting: "রিডিরেক্ট করা হচ্ছে...",
      errors: {
        cancelled: "প্রমাণীকরণ বাতিল করা হয়েছে",
        failed: "প্রমাণীকরণ ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
        accountExists: "এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে"
      }
    }
  },
  ur: {
    signin: {
      title: "واپس آپ کا استقبال",
      subtitle: "اپنے اکاؤنٹ میں سائن ان کریں",
      emailLabel: "ای میل ایڈریس",
      passwordLabel: "پاس ورڈ",
      rememberMe: "مجھے یاد رکھیں",
      forgotPassword: "پاس ورڈ بھول گئے؟",
      signinButton: "سائن ان",
      signingIn: "سائن ان ہو رہا ہے...",
      orContinueWith: "یا جاری رکھیں",
      googleSignin: "Google کے ساتھ سائن ان کریں",
      noAccount: "کوئی اکاؤنٹ نہیں ہے؟",
      signupLink: "سائن اپ",
      termsText: "سائن ان کرکے، آپ ہماری شرائط سے اتفاق کرتے ہیں",
      errors: {
        emailRequired: "ای میل ضروری ہے",
        passwordRequired: "پاس ورڈ ضروری ہے",
        invalidCredentials: "غلط ای میل یا پاس ورڈ",
        accountLocked: "آپ کا اکاؤنٹ لاک ہو گیا ہے۔ براہ کرم سپورٹ سے رابطہ کریں۔",
        networkError: "نیٹ ورک کی خرابی۔ براہ کرم اپنا کنکشن چیک کریں۔",
        genericError: "ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔",
        emailNotVerified: "براہ کرم سائن ان کرنے سے پہلے اپنا ای میل ایڈریس تصدیق کریں۔ تصدیقی ای میل کے لیے اپنا ان باکس چیک کریں۔",
        backendUnavailable: "ہمارے سرورز عارضی طور پر دستیاب نہیں ہیں۔ براہ کرم تھوڑی دیر بعد کوشش کریں۔",
        sessionCreationFailed: "اس وقت سائن ان کرنے میں ناکام۔ براہ کرم دوبارہ کوشش کریں یا ای میل/پاس ورڈ لاگ ان استعمال کریں۔",
        sessionExpired: "آپ کا سیشن ختم ہو گیا ہے۔ براہ کرم دوبارہ سائن ان کریں۔",
        tokenExchangeFailed: "Google کے ساتھ سائن ان ناکام۔ براہ کرم ای میل/پاس ورڈ استعمال کرنے کی کوشش کریں یا سپورٹ سے رابطہ کریں۔",
        oauthConfigurationError: "کنفیگریشن کے مسئلے کی وجہ سے Google سائن ان عارضی طور پر دستیاب نہیں۔ براہ کرم ای میل/پاس ورڈ لاگ ان استعمال کریں۔",
        enterEmailFirst: "براہ کرم پہلے اپنا ای میل ایڈریس داخل کریں",
        passwordResetSent: "پاس ورڈ ری سیٹ ای میل بھیج دیا گیا! اپنا ان باکس چیک کریں۔",
        passwordResetError: "پاس ورڈ ری سیٹ ای میل بھیجنے میں خرابی"
      }
    },
    signup: {
      title: "اپنا اکاؤنٹ بنائیں",
      subtitle: "آج ہی اپنا مفت ٹرائل شروع کریں",
      firstNameLabel: "پہلا نام",
      lastNameLabel: "آخری نام",
      emailLabel: "ای میل ایڈریس",
      passwordLabel: "پاس ورڈ",
      confirmPasswordLabel: "پاس ورڈ کی تصدیق کریں",
      signupButton: "اکاؤنٹ بنائیں",
      creatingAccount: "اکاؤنٹ بنایا جا رہا ہے...",
      orContinueWith: "یا جاری رکھیں",
      googleSignup: "Google کے ساتھ سائن اپ کریں",
      hasAccount: "پہلے سے اکاؤنٹ ہے؟",
      signinLink: "سائن ان",
      termsText: "سائن اپ کرکے، آپ ہماری شرائط سے اتفاق کرتے ہیں",
      termsLink: "خدمات کی شرائط",
      andText: "اور",
      privacyLink: "رازداری کی پالیسی",
      passwordRequirements: {
        title: "پاس ورڈ میں ہونا ضروری ہے:",
        minLength: "کم از کم 8 حروف",
        uppercase: "ایک بڑا حرف",
        lowercase: "ایک چھوٹا حرف",
        number: "ایک نمبر",
        special: "ایک خاص کریکٹر"
      },
      errors: {
        firstNameRequired: "پہلا نام ضروری ہے",
        lastNameRequired: "آخری نام ضروری ہے",
        emailRequired: "ای میل ضروری ہے",
        emailInvalid: "براہ کرم درست ای میل داخل کریں",
        emailExists: "اس ای میل کے ساتھ پہلے سے اکاؤنٹ موجود ہے",
        passwordRequired: "پاس ورڈ ضروری ہے",
        passwordTooShort: "پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے",
        passwordTooWeak: "پاس ورڈ بہت کمزور ہے",
        passwordMismatch: "پاس ورڈ میل نہیں کھاتے",
        termsRequired: "آپ کو شرائط و ضوابط قبول کرنا ضروری ہے",
        genericError: "ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔",
        accountCreated: "اکاؤنٹ کامیابی سے بن گیا! سائن ان کرنے سے پہلے اپنا اکاؤنٹ تصدیق کرنے کے لیے اپنا ای میل چیک کریں۔"
      },
      verificationEmail: {
        resendButton: "تصدیقی ای میل دوبارہ بھیجیں",
        emailRequired: "براہ کرم اپنا ای میل ایڈریس داخل کریں",
        sent: "تصدیقی ای میل بھیج دیا گیا! براہ کرم اپنا ان باکس چیک کریں۔",
        error: "تصدیقی ای میل بھیجنے میں خرابی۔ براہ کرم دوبارہ کوشش کریں۔"
      }
    },
    forgotPassword: {
      title: "اپنا پاس ورڈ ری سیٹ کریں",
      subtitle: "اپنا ای میل داخل کریں اور ہم آپ کو ری سیٹ لنک بھیجیں گے",
      emailLabel: "ای میل ایڈریس",
      sendButton: "ری سیٹ لنک بھیجیں",
      sending: "بھیجا جا رہا ہے...",
      backToSignin: "سائن ان پر واپس",
      success: {
        title: "اپنا ای میل چیک کریں",
        message: "ہم نے {{email}} پر پاس ورڈ ری سیٹ لنک بھیجا ہے"
      },
      errors: {
        emailRequired: "ای میل ضروری ہے",
        emailInvalid: "براہ کرم درست ای میل داخل کریں",
        emailNotFound: "اس ای میل کے ساتھ کوئی اکاؤنٹ نہیں ملا",
        tooManyAttempts: "بہت زیادہ کوششیں۔ براہ کرم بعد میں کوشش کریں۔"
      }
    },
    resetPassword: {
      title: "نیا پاس ورڈ بنائیں",
      subtitle: "نیچے اپنا نیا پاس ورڈ داخل کریں",
      newPasswordLabel: "نیا پاس ورڈ",
      confirmPasswordLabel: "نیا پاس ورڈ کی تصدیق کریں",
      resetButton: "پاس ورڈ ری سیٹ کریں",
      resetting: "ری سیٹ ہو رہا ہے...",
      success: {
        title: "پاس ورڈ ری سیٹ کامیاب",
        message: "آپ کا پاس ورڈ ری سیٹ ہو گیا ہے۔ اب آپ اپنے نئے پاس ورڈ کے ساتھ سائن ان کر سکتے ہیں۔",
        signinButton: "سائن ان"
      },
      errors: {
        tokenInvalid: "یہ ری سیٹ لنک غلط ہے یا ختم ہو گیا ہے",
        passwordRequired: "پاس ورڈ ضروری ہے",
        passwordTooShort: "پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے",
        passwordMismatch: "پاس ورڈ میل نہیں کھاتے"
      }
    },
    oauth: {
      processing: "تصدیق مکمل کی جا رہی ہے...",
      redirecting: "ری ڈائریکٹ ہو رہا ہے...",
      errors: {
        cancelled: "تصدیق منسوخ کر دی گئی",
        failed: "تصدیق ناکام۔ براہ کرم دوبارہ کوشش کریں۔",
        accountExists: "اس ای میل کے ساتھ پہلے سے اکاؤنٹ موجود ہے"
      }
    }
  },
  tl: {
    signin: {
      title: "Maligayang pagbabalik",
      subtitle: "Mag-sign in sa inyong account",
      emailLabel: "Email address",
      passwordLabel: "Password",
      rememberMe: "Tandaan ako",
      forgotPassword: "Nakalimutan ang password?",
      signinButton: "Mag-sign in",
      signingIn: "Nag-sign in...",
      orContinueWith: "O magpatuloy gamit ang",
      googleSignin: "Mag-sign in gamit ang Google",
      noAccount: "Walang account?",
      signupLink: "Mag-sign up",
      termsText: "Sa pag-sign in, sumasang-ayon kayo sa aming",
      errors: {
        emailRequired: "Kailangan ang email",
        passwordRequired: "Kailangan ang password",
        invalidCredentials: "Maling email o password",
        accountLocked: "Na-lock ang inyong account. Makipag-ugnayan sa support.",
        networkError: "Network error. Suriin ang inyong connection.",
        genericError: "May nagkaproblema. Subukan ulit.",
        emailNotVerified: "I-verify muna ang inyong email address bago mag-sign in. Tignan ang inyong inbox para sa verification email.",
        backendUnavailable: "Ang aming mga server ay pansamantalang hindi available. Subukan ulit maya-maya.",
        sessionCreationFailed: "Hindi maka-sign in ngayon. Subukan ulit o gamitin ang email/password login.",
        sessionExpired: "Nag-expire na ang inyong session. Mag-sign in ulit.",
        tokenExchangeFailed: "Hindi nagtagumpay ang sign in gamit ang Google. Subukan ang email/password o makipag-ugnayan sa support.",
        oauthConfigurationError: "Ang Google sign-in ay pansamantalang hindi available dahil sa configuration issue. Gamitin ang email/password login.",
        enterEmailFirst: "Ilagay muna ang inyong email address",
        passwordResetSent: "Naipadala na ang password reset email! Tignan ang inyong inbox.",
        passwordResetError: "Error sa pagpapadala ng password reset email"
      }
    },
    signup: {
      title: "Gumawa ng inyong account",
      subtitle: "Simulan ang inyong free trial ngayon",
      firstNameLabel: "Unang pangalan",
      lastNameLabel: "Apelyido",
      emailLabel: "Email address",
      passwordLabel: "Password",
      confirmPasswordLabel: "I-confirm ang password",
      signupButton: "Gumawa ng account",
      creatingAccount: "Ginagawa ang account...",
      orContinueWith: "O magpatuloy gamit ang",
      googleSignup: "Mag-sign up gamit ang Google",
      hasAccount: "May account na?",
      signinLink: "Mag-sign in",
      termsText: "Sa pag-sign up, sumasang-ayon kayo sa aming",
      termsLink: "Terms of Service",
      andText: "at",
      privacyLink: "Privacy Policy",
      passwordRequirements: {
        title: "Ang password ay dapat may:",
        minLength: "Hindi bababa sa 8 characters",
        uppercase: "Isang malaking titik",
        lowercase: "Isang maliit na titik",
        number: "Isang numero",
        special: "Isang special character"
      },
      errors: {
        firstNameRequired: "Kailangan ang unang pangalan",
        lastNameRequired: "Kailangan ang apelyido",
        emailRequired: "Kailangan ang email",
        emailInvalid: "Maglagay ng tamang email",
        emailExists: "May account na gamit ang email na ito",
        passwordRequired: "Kailangan ang password",
        passwordTooShort: "Ang password ay dapat hindi bababa sa 8 characters",
        passwordTooWeak: "Ang password ay masyadong mahina",
        passwordMismatch: "Hindi tugma ang mga password",
        termsRequired: "Dapat tanggapin ang terms at conditions",
        genericError: "May nagkaproblema. Subukan ulit.",
        accountCreated: "Matagumpay na nagawa ang account! I-check ang inyong email para i-verify ang account bago mag-sign in."
      },
      verificationEmail: {
        resendButton: "I-resend ang verification email",
        emailRequired: "Ilagay ang inyong email address",
        sent: "Naipadala na ang verification email! I-check ang inyong inbox.",
        error: "Error sa pagpapadala ng verification email. Subukan ulit."
      }
    },
    forgotPassword: {
      title: "I-reset ang inyong password",
      subtitle: "Ilagay ang inyong email at ipapadala namin ang reset link",
      emailLabel: "Email address",
      sendButton: "Ipadala ang reset link",
      sending: "Pinapadala...",
      backToSignin: "Bumalik sa sign in",
      success: {
        title: "I-check ang inyong email",
        message: "Naipadala namin ang password reset link sa {{email}}"
      },
      errors: {
        emailRequired: "Kailangan ang email",
        emailInvalid: "Maglagay ng tamang email",
        emailNotFound: "Walang account na nakita gamit ang email na ito",
        tooManyAttempts: "Masyadong maraming attempt. Subukan ulit mamaya."
      }
    },
    resetPassword: {
      title: "Gumawa ng bagong password",
      subtitle: "Ilagay ang inyong bagong password sa ibaba",
      newPasswordLabel: "Bagong password",
      confirmPasswordLabel: "I-confirm ang bagong password",
      resetButton: "I-reset ang password",
      resetting: "Nire-reset...",
      success: {
        title: "Matagumpay na na-reset ang password",
        message: "Na-reset na ang inyong password. Pwede na kayong mag-sign in gamit ang bagong password.",
        signinButton: "Mag-sign in"
      },
      errors: {
        tokenInvalid: "Ang reset link na ito ay invalid o nag-expire na",
        passwordRequired: "Kailangan ang password",
        passwordTooShort: "Ang password ay dapat hindi bababa sa 8 characters",
        passwordMismatch: "Hindi tugma ang mga password"
      }
    },
    oauth: {
      processing: "Tinatatapos ang authentication...",
      redirecting: "Nire-redirect...",
      errors: {
        cancelled: "Na-cancel ang authentication",
        failed: "Hindi nagtagumpay ang authentication. Subukan ulit.",
        accountExists: "May account na gamit ang email na ito"
      }
    }
  },
  uk: {
    signin: {
      title: "З поверненням",
      subtitle: "Увійдіть до свого облікового запису",
      emailLabel: "Електронна пошта",
      passwordLabel: "Пароль",
      rememberMe: "Запам'ятати мене",
      forgotPassword: "Забули пароль?",
      signinButton: "Увійти",
      signingIn: "Вхід...",
      orContinueWith: "Або продовжити з",
      googleSignin: "Увійти через Google",
      noAccount: "Немає облікового запису?",
      signupLink: "Зареєструватись",
      termsText: "Входячи, ви погоджуєтесь з нашими",
      errors: {
        emailRequired: "Електронна пошта обов'язкова",
        passwordRequired: "Пароль обов'язковий",
        invalidCredentials: "Неправильна електронна пошта або пароль",
        accountLocked: "Ваш обліковий запис заблоковано. Зверніться до служби підтримки.",
        networkError: "Помилка мережі. Перевірте ваше з'єднання.",
        genericError: "Сталася помилка. Спробуйте ще раз.",
        emailNotVerified: "Будь ласка, підтвердіть вашу електронну пошту перед входом. Перевірте вашу скриньку для листа підтвердження.",
        backendUnavailable: "Наші сервери тимчасово недоступні. Спробуйте ще раз через кілька хвилин.",
        sessionCreationFailed: "Неможливо увійти зараз. Спробуйте ще раз або використайте вхід email/пароль.",
        sessionExpired: "Ваша сесія закінчилась. Увійдіть знову.",
        tokenExchangeFailed: "Вхід через Google не вдався. Спробуйте використати email/пароль або зверніться до підтримки.",
        oauthConfigurationError: "Вхід через Google тимчасово недоступний через проблему конфігурації. Використайте вхід email/пароль.",
        enterEmailFirst: "Спочатку введіть вашу електронну пошту",
        passwordResetSent: "Лист для скидання пароля надіслано! Перевірте вашу скриньку.",
        passwordResetError: "Помилка надсилання листа для скидання пароля"
      }
    },
    signup: {
      title: "Створіть ваш обліковий запис",
      subtitle: "Почніть безкоштовний тестовий період сьогодні",
      firstNameLabel: "Ім'я",
      lastNameLabel: "Прізвище",
      emailLabel: "Електронна пошта",
      passwordLabel: "Пароль",
      confirmPasswordLabel: "Підтвердіть пароль",
      signupButton: "Створити обліковий запис",
      creatingAccount: "Створення облікового запису...",
      orContinueWith: "Або продовжити з",
      googleSignup: "Зареєструватись через Google",
      hasAccount: "Вже маєте обліковий запис?",
      signinLink: "Увійти",
      termsText: "Реєструючись, ви погоджуєтесь з нашими",
      termsLink: "Умовами використання",
      andText: "та",
      privacyLink: "Політикою конфіденційності",
      passwordRequirements: {
        title: "Пароль повинен містити:",
        minLength: "Принаймні 8 символів",
        uppercase: "Одну велику літеру",
        lowercase: "Одну малу літеру",
        number: "Одну цифру",
        special: "Один спеціальний символ"
      },
      errors: {
        firstNameRequired: "Ім'я обов'язкове",
        lastNameRequired: "Прізвище обов'язкове",
        emailRequired: "Електронна пошта обов'язкова",
        emailInvalid: "Введіть правильну електронну пошту",
        emailExists: "Обліковий запис з цією електронною поштою вже існує",
        passwordRequired: "Пароль обов'язковий",
        passwordTooShort: "Пароль повинен містити принаймні 8 символів",
        passwordTooWeak: "Пароль занадто слабкий",
        passwordMismatch: "Паролі не співпадають",
        termsRequired: "Ви повинні прийняти умови та положення",
        genericError: "Сталася помилка. Спробуйте ще раз.",
        accountCreated: "Обліковий запис успішно створено! Перевірте вашу електронну пошту для підтвердження облікового запису перед входом."
      },
      verificationEmail: {
        resendButton: "Надіслати лист підтвердження повторно",
        emailRequired: "Введіть вашу електронну пошту",
        sent: "Лист підтвердження надіслано! Перевірте вашу скриньку.",
        error: "Помилка надсилання листа підтвердження. Спробуйте ще раз."
      }
    },
    forgotPassword: {
      title: "Скиньте ваш пароль",
      subtitle: "Введіть вашу електронну пошту і ми надішлемо вам посилання для скидання",
      emailLabel: "Електронна пошта",
      sendButton: "Надіслати посилання для скидання",
      sending: "Надсилання...",
      backToSignin: "Повернутись до входу",
      success: {
        title: "Перевірте вашу електронну пошту",
        message: "Ми надіслали посилання для скидання пароля на {{email}}"
      },
      errors: {
        emailRequired: "Електронна пошта обов'язкова",
        emailInvalid: "Введіть правильну електронну пошту",
        emailNotFound: "Обліковий запис з цією електронною поштою не знайдено",
        tooManyAttempts: "Занадто багато спроб. Спробуйте пізніше."
      }
    },
    resetPassword: {
      title: "Створіть новий пароль",
      subtitle: "Введіть ваш новий пароль нижче",
      newPasswordLabel: "Новий пароль",
      confirmPasswordLabel: "Підтвердіть новий пароль",
      resetButton: "Скинути пароль",
      resetting: "Скидання...",
      success: {
        title: "Пароль успішно скинуто",
        message: "Ваш пароль було скинуто. Тепер ви можете увійти з новим паролем.",
        signinButton: "Увійти"
      },
      errors: {
        tokenInvalid: "Це посилання для скидання недійсне або застаріле",
        passwordRequired: "Пароль обов'язковий",
        passwordTooShort: "Пароль повинен містити принаймні 8 символів",
        passwordMismatch: "Паролі не співпадають"
      }
    },
    oauth: {
      processing: "Завершення автентифікації...",
      redirecting: "Перенаправлення...",
      errors: {
        cancelled: "Автентифікацію скасовано",
        failed: "Автентифікація не вдалась. Спробуйте ще раз.",
        accountExists: "Обліковий запис з цією електронною поштою вже існує"
      }
    }
  },
  fa: {
    signin: {
      title: "خوش آمدید",
      subtitle: "وارد حساب کاربری خود شوید",
      emailLabel: "آدرس ایمیل",
      passwordLabel: "رمز عبور",
      rememberMe: "مرا به خاطر بسپار",
      forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
      signinButton: "ورود",
      signingIn: "در حال ورود...",
      orContinueWith: "یا ادامه دهید با",
      googleSignin: "ورود با Google",
      noAccount: "حساب کاربری ندارید؟",
      signupLink: "ثبت نام",
      termsText: "با ورود، شما با ما موافقت می‌کنید",
      errors: {
        emailRequired: "ایمیل الزامی است",
        passwordRequired: "رمز عبور الزامی است",
        invalidCredentials: "ایمیل یا رمز عبور نامعتبر",
        accountLocked: "حساب کاربری شما قفل شده است. لطفاً با پشتیبانی تماس بگیرید.",
        networkError: "خطای شبکه. لطفاً اتصال خود را بررسی کنید.",
        genericError: "خطایی رخ داده است. لطفاً دوباره تلاش کنید.",
        emailNotVerified: "لطفاً قبل از ورود، آدرس ایمیل خود را تأیید کنید. صندوق ورودی خود را برای ایمیل تأیید بررسی کنید.",
        backendUnavailable: "سرورهای ما موقتاً در دسترس نیستند. لطفاً چند لحظه بعد تلاش کنید.",
        sessionCreationFailed: "در حال حاضر امکان ورود وجود ندارد. لطفاً دوباره تلاش کنید یا از ورود ایمیل/رمز عبور استفاده کنید.",
        sessionExpired: "جلسه شما منقضی شده است. لطفاً دوباره وارد شوید.",
        tokenExchangeFailed: "ورود با Google ناموفق بود. لطفاً از ایمیل/رمز عبور استفاده کنید یا با پشتیبانی تماس بگیرید.",
        oauthConfigurationError: "ورود با Google به دلیل مشکل پیکربندی موقتاً در دسترس نیست. لطفاً از ورود ایمیل/رمز عبور استفاده کنید.",
        enterEmailFirst: "لطفاً ابتدا آدرس ایمیل خود را وارد کنید",
        passwordResetSent: "ایمیل بازنشانی رمز عبور ارسال شد! صندوق ورودی خود را بررسی کنید.",
        passwordResetError: "خطا در ارسال ایمیل بازنشانی رمز عبور"
      }
    },
    signup: {
      title: "حساب کاربری خود را ایجاد کنید",
      subtitle: "آزمایش رایگان خود را امروز شروع کنید",
      firstNameLabel: "نام",
      lastNameLabel: "نام خانوادگی",
      emailLabel: "آدرس ایمیل",
      passwordLabel: "رمز عبور",
      confirmPasswordLabel: "تأیید رمز عبور",
      signupButton: "ایجاد حساب کاربری",
      creatingAccount: "در حال ایجاد حساب کاربری...",
      orContinueWith: "یا ادامه دهید با",
      googleSignup: "ثبت نام با Google",
      hasAccount: "قبلاً حساب کاربری دارید؟",
      signinLink: "ورود",
      termsText: "با ثبت نام، شما با ما موافقت می‌کنید",
      termsLink: "شرایط خدمات",
      andText: "و",
      privacyLink: "سیاست حریم خصوصی",
      passwordRequirements: {
        title: "رمز عبور باید شامل باشد:",
        minLength: "حداقل ۸ کاراکتر",
        uppercase: "یک حرف بزرگ",
        lowercase: "یک حرف کوچک",
        number: "یک عدد",
        special: "یک کاراکتر ویژه"
      },
      errors: {
        firstNameRequired: "نام الزامی است",
        lastNameRequired: "نام خانوادگی الزامی است",
        emailRequired: "ایمیل الزامی است",
        emailInvalid: "لطفاً ایمیل معتبری وارد کنید",
        emailExists: "حساب کاربری با این ایمیل از قبل وجود دارد",
        passwordRequired: "رمز عبور الزامی است",
        passwordTooShort: "رمز عبور باید حداقل ۸ کاراکتر باشد",
        passwordTooWeak: "رمز عبور خیلی ضعیف است",
        passwordMismatch: "رمزهای عبور مطابقت ندارند",
        termsRequired: "شما باید شرایط و ضوابط را بپذیرید",
        genericError: "خطایی رخ داده است. لطفاً دوباره تلاش کنید.",
        accountCreated: "حساب کاربری با موفقیت ایجاد شد! قبل از ورود، ایمیل خود را برای تأیید حساب کاربری بررسی کنید."
      },
      verificationEmail: {
        resendButton: "ارسال مجدد ایمیل تأیید",
        emailRequired: "لطفاً آدرس ایمیل خود را وارد کنید",
        sent: "ایمیل تأیید ارسال شد! لطفاً صندوق ورودی خود را بررسی کنید.",
        error: "خطا در ارسال ایمیل تأیید. لطفاً دوباره تلاش کنید."
      }
    },
    forgotPassword: {
      title: "بازنشانی رمز عبور خود",
      subtitle: "ایمیل خود را وارد کنید تا لینک بازنشانی برایتان ارسال کنیم",
      emailLabel: "آدرس ایمیل",
      sendButton: "ارسال لینک بازنشانی",
      sending: "در حال ارسال...",
      backToSignin: "بازگشت به ورود",
      success: {
        title: "ایمیل خود را بررسی کنید",
        message: "لینک بازنشانی رمز عبور را به {{email}} ارسال کردیم"
      },
      errors: {
        emailRequired: "ایمیل الزامی است",
        emailInvalid: "لطفاً ایمیل معتبری وارد کنید",
        emailNotFound: "حساب کاربری با این ایمیل یافت نشد",
        tooManyAttempts: "تلاش‌های زیاد. لطفاً بعداً تلاش کنید."
      }
    },
    resetPassword: {
      title: "رمز عبور جدید ایجاد کنید",
      subtitle: "رمز عبور جدید خود را در زیر وارد کنید",
      newPasswordLabel: "رمز عبور جدید",
      confirmPasswordLabel: "تأیید رمز عبور جدید",
      resetButton: "بازنشانی رمز عبور",
      resetting: "در حال بازنشانی...",
      success: {
        title: "بازنشانی رمز عبور موفق",
        message: "رمز عبور شما بازنشانی شد. اکنون می‌توانید با رمز عبور جدید وارد شوید.",
        signinButton: "ورود"
      },
      errors: {
        tokenInvalid: "این لینک بازنشانی نامعتبر یا منقضی شده است",
        passwordRequired: "رمز عبور الزامی است",
        passwordTooShort: "رمز عبور باید حداقل ۸ کاراکتر باشد",
        passwordMismatch: "رمزهای عبور مطابقت ندارند"
      }
    },
    oauth: {
      processing: "در حال تکمیل احراز هویت...",
      redirecting: "در حال تغییر مسیر...",
      errors: {
        cancelled: "احراز هویت لغو شد",
        failed: "احراز هویت ناموفق بود. لطفاً دوباره تلاش کنید.",
        accountExists: "حساب کاربری با این ایمیل از قبل وجود دارد"
      }
    }
  },
  sn: {
    signin: {
      title: "Takagamuchira",
      subtitle: "Pinda muaccount yako",
      emailLabel: "Email address",
      passwordLabel: "Password",
      rememberMe: "Ndirangarire",
      forgotPassword: "Wakanganwa password?",
      signinButton: "Pinda",
      signingIn: "Uchipinda...",
      orContinueWith: "Kana enderera ne",
      googleSignin: "Pinda ne Google",
      noAccount: "Hauna account?",
      signupLink: "Nyoreresa",
      termsText: "Nekupinda, unobvuma",
      errors: {
        emailRequired: "Email inodiwa",
        passwordRequired: "Password inodiwa",
        invalidCredentials: "Email kana password isiri chaiyo",
        accountLocked: "Account yako yakavharwa. Taura nevanobatsira.",
        networkError: "Network yakakanganisa. Tarisa connection yako.",
        genericError: "Pane chakakanganisa. Edza zvakare.",
        emailNotVerified: "Ndapota simbisa email address yako usati wapinda. Tarisa mu inbox mako email yekusimbisa.",
        backendUnavailable: "Ma server edu haasi kushanda kwenguva pfupi. Edza zvakare mangwana.",
        sessionCreationFailed: "Hatikwanise kupinda izvozvi. Edza zvakare kana shandisa email/password login.",
        sessionExpired: "Session yako yapera. Pinda zvakare.",
        tokenExchangeFailed: "Kupinda ne Google hakuna kubuda. Edza email/password kana taura nevanobatsira.",
        oauthConfigurationError: "Google sign-in haisi kushanda nekuda kwedambudziko. Shandisa email/password login.",
        enterEmailFirst: "Ndapota isa email address yako kutanga",
        passwordResetSent: "Password reset email yakatumirwa! Tarisa mu inbox mako.",
        passwordResetError: "Dambudziko rekutumira password reset email"
      }
    },
    signup: {
      title: "Gadzira account yako",
      subtitle: "Tanga free trial yako nhasi",
      firstNameLabel: "Zita rekutanga",
      lastNameLabel: "Zita remhuri",
      emailLabel: "Email address",
      passwordLabel: "Password",
      confirmPasswordLabel: "Simbisa password",
      signupButton: "Gadzira account",
      creatingAccount: "Tichigadzira account...",
      orContinueWith: "Kana enderera ne",
      googleSignup: "Nyoreresa ne Google",
      hasAccount: "Unetovo account?",
      signinLink: "Pinda",
      termsText: "Nekugadzira account, unobvuma",
      termsLink: "Terms of Service",
      andText: "ne",
      privacyLink: "Privacy Policy",
      passwordRequirements: {
        title: "Password inofanira kunge ine:",
        minLength: "Makona anosvika 8",
        uppercase: "Bhii guru rimwe",
        lowercase: "Bhii duku rimwe",
        number: "Nhamba imwe",
        special: "Chimiro chakasarudzika chimwe"
      },
      errors: {
        firstNameRequired: "Zita rekutanga rinodiwa",
        lastNameRequired: "Zita remhuri rinodiwa",
        emailRequired: "Email inodiwa",
        emailInvalid: "Ndapota isa email chaiyo",
        emailExists: "Account ine email iyi itovapo",
        passwordRequired: "Password inodiwa",
        passwordTooShort: "Password inofanira kunge ine makona anosvika 8",
        passwordTooWeak: "Password haisisimba",
        passwordMismatch: "Ma password haafanane",
        termsRequired: "Unofanira kubvuma terms ne conditions",
        genericError: "Pane chakakanganisa. Edza zvakare.",
        accountCreated: "Account yakagadzirwa zvakanaka! Tarisa email yako kuti usimbise account usati wapinda."
      },
      verificationEmail: {
        resendButton: "Tumira zvakare verification email",
        emailRequired: "Ndapota isa email address yako",
        sent: "Verification email yakatumirwa! Ndapota tarisa mu inbox mako.",
        error: "Dambudziko rekutumira verification email. Edza zvakare."
      }
    },
    forgotPassword: {
      title: "Gadzirisa password yako",
      subtitle: "Isa email yako uye tichakutumira link yekugadzirisa",
      emailLabel: "Email address",
      sendButton: "Tumira reset link",
      sending: "Tichitumira...",
      backToSignin: "Dzokera pakupinda",
      success: {
        title: "Tarisa email yako",
        message: "Takatumira password reset link ku {{email}}"
      },
      errors: {
        emailRequired: "Email inodiwa",
        emailInvalid: "Ndapota isa email chaiyo",
        emailNotFound: "Hapana account ine email iyi",
        tooManyAttempts: "Wakaedza kazhinji. Edza zvakare pashure."
      }
    },
    resetPassword: {
      title: "Gadzira password itsva",
      subtitle: "Isa password yako itsva pazasi",
      newPasswordLabel: "Password itsva",
      confirmPasswordLabel: "Simbisa password itsva",
      resetButton: "Gadzirisa password",
      resetting: "Tichigadzirisa...",
      success: {
        title: "Password yakagadzirwa zvakanaka",
        message: "Password yako yakagadzirwa. Ikozvino unogona kupinda ne password itsva.",
        signinButton: "Pinda"
      },
      errors: {
        tokenInvalid: "Reset link iyi haina kubatika kana yakapera",
        passwordRequired: "Password inodiwa",
        passwordTooShort: "Password inofanira kunge ine makona anosvika 8",
        passwordMismatch: "Ma password haafanane"
      }
    },
    oauth: {
      processing: "Tichipedza authentication...",
      redirecting: "Tichitumira...",
      errors: {
        cancelled: "Authentication yakarega",
        failed: "Authentication haina kubuda. Edza zvakare.",
        accountExists: "Account ine email iyi itovapo"
      }
    }
  },
  ig: {
    signin: {
      title: "Nnọọ",
      subtitle: "Banye n'akaụntụ gị",
      emailLabel: "Adreesị email",
      passwordLabel: "Paswọdụ",
      rememberMe: "Cheta m",
      forgotPassword: "Ichefula paswọdụ?",
      signinButton: "Banye",
      signingIn: "Na-abanye...",
      orContinueWith: "Ma ọ bụ gaa n'ihu na",
      googleSignin: "Banye na Google",
      noAccount: "Enweghị akaụntụ?",
      signupLink: "Debanye aha",
      termsText: "Site na ịbanye, ị na-ekweta na",
      errors: {
        emailRequired: "Email dị mkpa",
        passwordRequired: "Paswọdụ dị mkpa",
        invalidCredentials: "Email ma ọ bụ paswọdụ ezighi ezi",
        accountLocked: "E kpọchiri akaụntụ gị. Kpọtụrụ nkwado.",
        networkError: "Nsogbu netwọk. Lelee njikọ gị.",
        genericError: "Nsogbu mere. Nwaa ọzọ.",
        emailNotVerified: "Biko kwado adreesị email gị tupu ịbanye. Lelee igbe akwụkwọ ozi gị maka email nkwado.",
        backendUnavailable: "Sava anyị adịghị arụ ọrụ nwa oge. Nwaa ọzọ n'oge na-adịghị anya.",
        sessionCreationFailed: "Enweghị ike ịbanye ugbu a. Nwaa ọzọ ma ọ bụ jiri email/paswọdụ banye.",
        sessionExpired: "Oge gị agwụla. Banye ọzọ.",
        tokenExchangeFailed: "Ịbanye na Google adaghị. Nwaa iji email/paswọdụ ma ọ bụ kpọtụrụ nkwado.",
        oauthConfigurationError: "Ịbanye Google adịghị arụ ọrụ nwa oge n'ihi nsogbu nhazi. Jiri email/paswọdụ banye.",
        enterEmailFirst: "Biko tinye adreesị email gị mbụ",
        passwordResetSent: "E zigara email nweghachi paswọdụ! Lee igbe akwụkwọ ozi gị.",
        passwordResetError: "Nsogbu na izipu email nweghachi paswọdụ"
      }
    },
    signup: {
      title: "Mepụta akaụntụ gị",
      subtitle: "Malite nnwale efu gị taa",
      firstNameLabel: "Aha mbụ",
      lastNameLabel: "Aha ikpeazụ",
      emailLabel: "Adreesị email",
      passwordLabel: "Paswọdụ",
      confirmPasswordLabel: "Kwado paswọdụ",
      signupButton: "Mepụta akaụntụ",
      creatingAccount: "Na-emepụta akaụntụ...",
      orContinueWith: "Ma ọ bụ gaa n'ihu na",
      googleSignup: "Debanye aha na Google",
      hasAccount: "Enwere akaụntụ?",
      signinLink: "Banye",
      termsText: "Site na idebanye aha, ị na-ekweta na",
      termsLink: "Usoro Ọrụ",
      andText: "na",
      privacyLink: "Iwu Nzuzo",
      passwordRequirements: {
        title: "Paswọdụ ga-enwerịrị:",
        minLength: "Opekata nta mkpụrụ akwụkwọ 8",
        uppercase: "Otu mkpụrụ akwụkwọ ukwu",
        lowercase: "Otu mkpụrụ akwụkwọ nta",
        number: "Otu ọnụọgụgụ",
        special: "Otu mkpụrụ akwụkwọ pụrụ iche"
      },
      errors: {
        firstNameRequired: "Aha mbụ dị mkpa",
        lastNameRequired: "Aha ikpeazụ dị mkpa",
        emailRequired: "Email dị mkpa",
        emailInvalid: "Biko tinye email ziri ezi",
        emailExists: "Akaụntụ nwere email a dị adị",
        passwordRequired: "Paswọdụ dị mkpa",
        passwordTooShort: "Paswọdụ ga-enwerịrị opekata nta mkpụrụ akwụkwọ 8",
        passwordTooWeak: "Paswọdụ adịghị ike",
        passwordMismatch: "Paswọdụ ekwekọghị",
        termsRequired: "Ị ga-anabata usoro na ọnọdụ",
        genericError: "Nsogbu mere. Nwaa ọzọ.",
        accountCreated: "E mepụtara akaụntụ nke ọma! Lee email gị iji kwado akaụntụ tupu ịbanye."
      },
      verificationEmail: {
        resendButton: "Zigaa email nkwado ọzọ",
        emailRequired: "Biko tinye adreesị email gị",
        sent: "E zigara email nkwado! Biko lee igbe akwụkwọ ozi gị.",
        error: "Nsogbu na izipu email nkwado. Nwaa ọzọ."
      }
    },
    forgotPassword: {
      title: "Weghachi paswọdụ gị",
      subtitle: "Tinye email gị, anyị ga-ezigara gị njikọ nweghachi",
      emailLabel: "Adreesị email",
      sendButton: "Zipu njikọ nweghachi",
      sending: "Na-ezipu...",
      backToSignin: "Laghachi na ịbanye",
      success: {
        title: "Lee email gị",
        message: "Anyị zigara njikọ nweghachi paswọdụ na {{email}}"
      },
      errors: {
        emailRequired: "Email dị mkpa",
        emailInvalid: "Biko tinye email ziri ezi",
        emailNotFound: "Ahụghị akaụntụ nwere email a",
        tooManyAttempts: "Ọtụtụ mgbalị. Nwaa ọzọ mgbe oge gafere."
      }
    },
    resetPassword: {
      title: "Mepụta paswọdụ ọhụrụ",
      subtitle: "Tinye paswọdụ ọhụrụ gị n'okpuru",
      newPasswordLabel: "Paswọdụ ọhụrụ",
      confirmPasswordLabel: "Kwado paswọdụ ọhụrụ",
      resetButton: "Weghachi paswọdụ",
      resetting: "Na-eweghachi...",
      success: {
        title: "Nweghachi paswọdụ gara nke ọma",
        message: "E weghachiri paswọdụ gị. Ugbu a ị nwere ike iji paswọdụ ọhụrụ banye.",
        signinButton: "Banye"
      },
      errors: {
        tokenInvalid: "Njikọ nweghachi a ezighi ezi ma ọ bụ agwụla",
        passwordRequired: "Paswọdụ dị mkpa",
        passwordTooShort: "Paswọdụ ga-enwerịrị opekata nta mkpụrụ akwụkwọ 8",
        passwordMismatch: "Paswọdụ ekwekọghị"
      }
    },
    oauth: {
      processing: "Na-emecha nyocha...",
      redirecting: "Na-atụgharị...",
      errors: {
        cancelled: "E kagburu nyocha",
        failed: "Nyocha adaghị. Nwaa ọzọ.",
        accountExists: "Akaụntụ nwere email a dị adị"
      }
    }
  }
};

// Function to update a language file
function updateLanguageFile(lang, translation) {
  const filePath = path.join('/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales', lang, 'auth.json');
  
  try {
    // Write complete auth.json file
    fs.writeFileSync(filePath, JSON.stringify(translation, null, 2));
    console.log(`✅ Updated ${lang}/auth.json with complete auth translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/auth.json:`, error);
  }
}

// Update all languages
Object.keys(authTranslations).forEach(lang => {
  updateLanguageFile(lang, authTranslations[lang]);
});

console.log('🎉 Auth translations completed for all 10 languages!');