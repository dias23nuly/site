/* общие функции */
window.Fridge = window.Fridge || {};
(() => {
    const app = window.Fridge;
    const read = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        }
        catch {
            return fallback;
        }
    };
    const save = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch { }
    };
    app.read = read;
    app.save = save;
    /* избранное */
    app.getFavorites = () => {
        const favorites = read('fridge-favorites', []);
        return Array.isArray(favorites) ? favorites.filter(id => Number.isInteger(id)) : [];
    };
    app.isFavorite = id => app.getFavorites().includes(Number(id));
    app.toggleFavorite = id => {
        const number = Number(id);
        const favorites = app.getFavorites();
        const next = favorites.includes(number) ? favorites.filter(item => item !== number) : [...favorites, number];
        save('fridge-favorites', next);
        $(document).trigger('fridge:favorites');
        app.toast(next.includes(number) ? 'Added to favorites' : 'Removed from favorites');
        return next.includes(number);
    };
    /* уведомления */
    app.toast = message => {
        const $toast = $('<div class="toast" role="status"></div>').text(message);
        $('#toast-region').append($toast);
        setTimeout(() => {
            $toast.addClass('leaving');
            setTimeout(() => $toast.remove(), 320);
        }, 2700);
    };
    app.escape = value => $('<span>').text(String(value)).html();
    app.showSkeletons = ($grid, count = 6) => {
        $grid.html(Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join(''));
        $grid.attr('aria-busy', 'true');
    };
    app.showError = ($target, message) => {
        $target.html(`<div class="error-panel" role="alert">${app.escape(message)} <button type="button" class="button button-small button-outline retry-load">Retry</button></div>`);
        $target.attr('aria-busy', 'false');
    };
    /* события */
    $(function () {
        const $html = $('html');
        const updateTheme = () => {
            const dark = $html.attr('data-theme') === 'dark';
            $('#theme-toggle').text(dark ? 'Light' : 'Dark').attr('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        };
        updateTheme();
        $('#theme-toggle').on('click', () => {
            const next = $html.attr('data-theme') === 'dark' ? 'light' : 'dark';
            $html.attr('data-theme', next);
            save('fridge-theme', next);
            updateTheme();
        });
        const $menu = $('#mobile-nav');
        const $toggle = $('#menu-toggle');
        const closeMenu = () => {
            $toggle.removeClass('is-open').attr('aria-expanded', 'false');
            $menu.hide();
        };
        $toggle.on('click', () => {
            const open = $toggle.attr('aria-expanded') !== 'true';
            $toggle.toggleClass('is-open', open).attr('aria-expanded', String(open));
            $menu.toggle(open);
        });
        $menu.on('click', 'a', closeMenu);
        $(document).on('keydown', event => {
            if (event.key === 'Escape')
                closeMenu();
        });
        window.addEventListener('resize', () => {
            if (innerWidth >= 900)
                closeMenu();
        });
        $(window).on('scroll', () => $('#back-to-top').toggleClass('visible', scrollY > 450));
        $('#back-to-top').on('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    /* форма */
        $('#contact-form').on('submit', function (event) {
            event.preventDefault();
            const values = {
                name: $('#contact-name').val().trim(),
                email: $('#contact-email').val().trim(),
                message: $('#contact-message').val().trim()
            };
            const errors = {
                name: values.name.length < 2 ? 'Enter at least 2 characters.' : '',
                email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? 'Enter a valid email address.' : '',
                message: values.message.length < 10 ? 'Write at least 10 characters.' : ''
            };
            Object.entries(errors).forEach(([field, error]) => {
                $(`#${field}-error`).text(error);
                $(`#contact-${field}`).attr('aria-invalid', String(Boolean(error)));
            });
            if (Object.values(errors).some(Boolean)) {
                const first = Object.keys(errors).find(key => errors[key]);
                $(`#contact-${first}`).trigger('focus');
                $('#form-success').addClass('hidden').text('');
                return;
            }
            // Static sites have no email backend. Prepare a real .eml draft instead of claiming to send.
            const clean = value => value.replace(/[\r\n]+/g, ' ').trim();
            const message = [
                'To: ',
                `Reply-To: ${clean(values.email)}`,
                'Subject: Message from Recipes from a Fridge',
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                '',
                `Name: ${values.name}`,
                `Email: ${values.email}`,
                '',
                values.message
            ].join('\r\n');
            const url = URL.createObjectURL(new Blob([message], { type: 'message/rfc822' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'fridge-contact-draft.eml';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            $('#form-success').removeClass('hidden').text('Email draft downloaded. Open it in your email app, enter a recipient and send it yourself. No message has been sent yet.');
            $(this).find('[aria-invalid]').attr('aria-invalid', 'false');
            app.toast('Email draft prepared (not sent)');
        });
        $('#contact-form .field').on('input', function () {
            const key = this.id.replace('contact-', '');
            $(`#${key}-error`).text('');
            $(this).attr('aria-invalid', 'false');
        });
        $('#year').text(new Date().getFullYear());
    });
})();
