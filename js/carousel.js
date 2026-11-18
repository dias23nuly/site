/* карусель */
(() => {
    const app = window.Fridge;
    app.mountCarousel = recipes => {
        const $root = $('#featured-carousel');
        if (!$root.length)
            return;
        const $track = $('#carousel-track');
        const $dots = $('#carousel-dots');
        let current = 0;
        let timer = null;
        let startX = null;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const visible = () => innerWidth >= 900 ? 3 : innerWidth >= 600 ? 2 : 1;
        const maxIndex = () => Math.max(0, recipes.length - visible());
        const paint = () => {
            current = Math.max(0, Math.min(current, maxIndex()));
            const first = $track.children().get(0);
            if (!first)
                return;
            const width = first.getBoundingClientRect().width + 20;
            $track.css('transform', `translateX(${-current * width}px)`);
            $dots.empty();
            for (let i = 0; i <= maxIndex(); i++) {
                const $dot = $('<button class="carousel-dot" type="button"></button>');
                $dot.attr({ 'aria-label': `Go to featured slide ${i + 1}`, 'aria-current': String(i === current) });
                $dot.on('click', () => {
                    current = i;
                    paint();
                    restart();
                });
                $dots.append($dot);
            }
        };
        const move = direction => {
            current = direction > 0 ? current >= maxIndex() ? 0 : current + 1 : current <= 0 ? maxIndex() : current - 1;
            paint();
        };
        const stop = () => {
            if (timer)
                clearInterval(timer);
            timer = null;
        };
        const start = () => {
            stop();
            if (!reduced && !document.hidden && recipes.length > visible())
                timer = setInterval(() => move(1), 5000);
        };
        const restart = () => {
            stop();
            start();
        };
        $track.empty();
        recipes.forEach(recipe => $track.append($('<div class="carousel-slide"></div>').append(app.createCard(recipe))));
        $('#carousel-prev').off('click').on('click', () => {
            move(-1);
            restart();
        });
        $('#carousel-next').off('click').on('click', () => {
            move(1);
            restart();
        });
        $root.off('mouseenter mouseleave keydown touchstart touchend');
        $root.on('mouseenter focusin', stop).on('mouseleave focusout', event => {
            if (!event.relatedTarget || !$root[0].contains(event.relatedTarget))
                start();
        });
        $root.on('keydown', event => {
            if (event.target.closest('.recipe-card,.favorite-btn,.carousel-dot'))
                return;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                move(event.key === 'ArrowRight' ? 1 : -1);
                restart();
            }
        });
        $root.on('touchstart', event => {
            startX = event.originalEvent.changedTouches[0].screenX;
            stop();
        });
        $root.on('touchend', event => {
            if (startX === null)
                return;
            const diff = event.originalEvent.changedTouches[0].screenX - startX;
            if (Math.abs(diff) > 45)
                move(diff < 0 ? 1 : -1);
            startX = null;
            start();
        });
        window.addEventListener('resize', () => {
            paint();
            start();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden)
                stop();
            else
                start();
        });
        paint();
        start();
        if (app.observe)
            app.observe($root[0]);
    };
})();
