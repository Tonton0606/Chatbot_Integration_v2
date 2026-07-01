import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// New landing page components
import Navbar from '../components/newlanding/sections/Navbar.jsx';
import Hero from '../components/newlanding/sections/Hero.jsx';
import TrustedBy from '../components/newlanding/sections/TrustedBy.tsx';
import Services from '../components/newlanding/sections/Services.tsx';
import Features from '../components/newlanding/sections/Features.tsx';
import VideoShowcase from '../components/newlanding/sections/VideoShowcase.jsx';
import AIEngine from '../components/newlanding/sections/AIEngine.tsx';
import Process from '../components/newlanding/sections/Process.tsx';
import Testimonials from '../components/newlanding/sections/Testimonials.tsx';
import Contact from '../components/newlanding/sections/Contact.tsx';
import Footer from '../components/newlanding/sections/Footer.tsx';
import LandingChatbot from '../components/newlanding/LandingChatbot.jsx';
import SparkleParticles from '../components/newlanding/SparkleParticles.jsx';
import CursorSpotlight from '../components/newlanding/CursorSpotlight.jsx';

// Modals
import BookingModal from '../components/newlanding/BookingModal.jsx';

function NewLandingPage() {
  const navigate = useNavigate();
  const [bookingModal, setBookingModal] = useState(false);

  const handleOpenBooking = () => {
    setBookingModal(true);
  };
  const handleOpenLogin = () => navigate('/login');
  const handleOpenSignup = () => navigate('/signup');

  return (
    <div className="min-h-screen bg-[#070b14] text-foreground overflow-x-hidden">
      {/* Global ambient effects */}
      <SparkleParticles />
      <CursorSpotlight />

      <Navbar
        onLogin={handleOpenLogin}
        onSignup={handleOpenSignup}
        onBookDemo={handleOpenBooking}
      />
      <main>
        <Hero onCtaClick={handleOpenSignup} />
        <VideoShowcase />
        <TrustedBy />
        <Services />
        <Features />
        <AIEngine />
        <Process />
        <Testimonials />
        <Contact />
      </main>
      <LandingChatbot businessName="Exponify" />
      <Footer />


      <BookingModal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
      />
    </div>
  );
}

export default NewLandingPage;
