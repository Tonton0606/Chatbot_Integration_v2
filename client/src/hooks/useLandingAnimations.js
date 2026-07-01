import { useEffect, useRef } from 'react';

function useLandingAnimations() {
  const observerRef = useRef(null);

  useEffect(() => {
    const initAnimations = () => {
      const config = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1,
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ep-in-view');
          }
        });
      }, config);

      observerRef.current = observer;

      const observeElements = () => {
        const animatedElements = document.querySelectorAll(
          '.ep-reveal-up, .ep-reveal-left, .ep-reveal-right, .ep-reveal-scale, ' +
            '.ep-service-card, .ep-pillar, .ep-form, .ep-field, .ep-pricing-card, ' +
            '.ep-about-text, .ep-about-body, .ep-section-eyebrow, .ep-section-title, .ep-section-sub'
        );

        animatedElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const isInView = rect.top < window.innerHeight && rect.bottom > 0;

          if (isInView) {
            el.classList.add('ep-in-view');
          } else {
            observer.observe(el);
          }
        });

        const staggerContainers = document.querySelectorAll('.ep-stagger-children');
        staggerContainers.forEach((container) => {
          const rect = container.getBoundingClientRect();
          const isInView = rect.top < window.innerHeight && rect.bottom > 0;

          if (isInView) {
            container.classList.add('ep-in-view');
          } else {
            observer.observe(container);
          }
        });
      };

      observeElements();

      const timeout = setTimeout(observeElements, 100);

      const handleScroll = () => {
        const animatedElements = document.querySelectorAll(
          '.ep-reveal-up, .ep-reveal-left, .ep-reveal-right, .ep-reveal-scale, ' +
            '.ep-service-card, .ep-pillar, .ep-form, .ep-field, .ep-pricing-card, ' +
            '.ep-about-text, .ep-about-body, .ep-section-eyebrow, .ep-section-title, .ep-section-sub'
        );

        animatedElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const isInView = rect.top < window.innerHeight && rect.bottom > 0;

          if (isInView && !el.classList.contains('ep-in-view')) {
            el.classList.add('ep-in-view');
          }
        });
      };

      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    };

    const timer = setTimeout(initAnimations, 50);
    window.addEventListener('load', initAnimations);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', initAnimations);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const hero = document.querySelector('.ep-hero');
      if (!hero) return;

      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      hero.style.setProperty('--ep-mouse-x', `${x}px`);
      hero.style.setProperty('--ep-mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
}

export default useLandingAnimations;
