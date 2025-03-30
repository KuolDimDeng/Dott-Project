import AppBar from '@/app/components/AppBar';
import Hero from '@/app/components/Hero';
import Features from '@/app/components/Features';
import Highlights from '@/app/components/Highlights';
import Testimonials from '@/app/components/Testimonials';
import Pricing from '@/app/components/Pricing';
import FAQ from '@/app/components/FAQ';
import ContactForm from '@/app/components/ContactForm';
import Footer from '@/app/components/Footer';

export const metadata = {
  title: 'Dott, LLC | Business Management Platform',
  description: 'Global business management software with advanced inventory, barcode scanning, and regional payment solutions—all in one intuitive platform.',
};

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* NavBar */}
      <div className="sticky top-0 z-50 bg-white">
        <AppBar />
      </div>
      
      {/* Hero Section - Light blue gradient background */}
      <div className="bg-gradient-to-b from-blue-50 to-white">
        <Hero />
      </div>
      
      {/* Features Section - Light neutral background */}
      <div className="bg-gray-50">
        <Features />
      </div>
      
      {/* Highlights Section - Soft purple background */}
      <div className="bg-purple-50">
        <Highlights />
      </div>
      
      {/* Testimonials Section - White background */}
      <div className="bg-white">
        <Testimonials />
      </div>
      
      {/* Pricing Section - Light cyan background */}
      <div className="bg-cyan-50">
        <Pricing />
      </div>
      
      {/* FAQ Section - Light amber background */}
      <div className="bg-amber-50">
        <FAQ />
      </div>
      
      {/* Contact Form Section - Light green background */}
      <div className="bg-green-50">
        <ContactForm />
      </div>
      
      {/* Footer */}
      <div className="bg-white">
        <Footer />
      </div>
    </main>
  );
}
