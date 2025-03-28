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
    <main className="bg-white min-h-screen">
      <AppBar />
      <Hero />
      <Features />
      <Highlights />
      <Testimonials />
      <Pricing />
      <FAQ />
      <ContactForm />
      <Footer />
    </main>
  );
}
