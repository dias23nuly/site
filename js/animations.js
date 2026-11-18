/* анимация */
(() => {
    const app = window.Fridge;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = !reducedMotion && 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: .08, rootMargin: '0px 0px 35px 0px' })
        : null;
    app.observe = root => {
        (root || document).querySelectorAll('.reveal:not(.is-revealed)').forEach(element => {
            if (!observer)
                element.classList.add('is-revealed');
            else
                observer.observe(element);
        });
    };
    document.addEventListener('DOMContentLoaded', () => app.observe(document));
})();
