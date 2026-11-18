/* окно рецепта */
(() => {
    const app = window.Fridge;
    let activeRecipe = null;
    let servings = 1;
    let lastFocused = null;
    let closingTimer = null;
    const $root = () => $('#recipe-modal');
    const formatAmount = amount => {
        const rounded = Math.round(amount * 100) / 100;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    };
    const ingredientLabel = name => {
        const quantity = activeRecipe.quantities?.[name];
        if (!quantity)
            return name;
        const amount = formatAmount(quantity.amount * servings / activeRecipe.servings);
        return `${amount} ${quantity.unit} ${name}`;
    };
    /* ингредиенты */
    const drawIngredients = () => {
        const $list = $('#modal-ingredients').empty();
        activeRecipe.ingredients.forEach(name => {
            const $li = $('<li>');
            const $label = $('<label>');
            const $input = $('<input type="checkbox">').attr('aria-label', `Mark ${name} as prepared`);
            $label.append($input, $('<span>').text(ingredientLabel(name)));
            $list.append($li.append($label));
        });
        $('#servings-count').text(servings);
        $('#servings-decrease').prop('disabled', servings <= 1);
        $('#servings-increase').prop('disabled', servings >= 12);
    };
    app.openRecipe = recipe => {
        if (!recipe)
            return;
        clearTimeout(closingTimer);
        activeRecipe = recipe;
        servings = recipe.servings;
        lastFocused = document.activeElement;
        $('#modal-image').off('error').on('error', function () {
            $(this).off('error').attr('src', 'assets/recipe-placeholder.svg');
        });
        $('#modal-image').attr({ src: recipe.image, alt: recipe.title });
        $('#modal-title').text(recipe.title);
        $('#modal-category').text(recipe.category);
        $('#modal-time').text(`${recipe.time} min`);
        $('#modal-calories').text(`${recipe.calories} kcal per serving`);
        $('#modal-difficulty').text(recipe.difficulty);
        $('#modal-steps').empty();
        recipe.steps.forEach(step => $('#modal-steps').append($('<li>').text(step)));
        drawIngredients();
        $root().css('display', 'flex').attr('aria-hidden', 'false');
        $('body').addClass('modal-open');
        requestAnimationFrame(() => $root().addClass('is-visible'));
        $('#modal-close').trigger('focus');
    };
    app.closeRecipe = () => {
        if ($root().attr('aria-hidden') === 'true')
            return;
        $root().removeClass('is-visible').attr('aria-hidden', 'true');
        $('body').removeClass('modal-open');
        const focusTarget = lastFocused;
        const finish = () => {
            $root().hide();
            if (focusTarget && document.contains(focusTarget))
                focusTarget.focus();
        };
        if (matchMedia('(prefers-reduced-motion: reduce)').matches)
            finish();
        else
            closingTimer = setTimeout(finish, 280);
    };
    const focusable = () => $root().find('button:not(:disabled),input:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])').filter(':visible');
    $(function () {
        $('#modal-close').on('click', app.closeRecipe);
        $root().on('mousedown', event => {
            if (event.target === $root()[0])
                app.closeRecipe();
        });
        $(document).on('keydown', event => {
            if ($root().attr('aria-hidden') !== 'false')
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                app.closeRecipe();
            }
            if (event.key === 'Tab') {
                const items = focusable().toArray();
                if (!items.length)
                    return;
                const first = items[0];
                const last = items[items.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });
        $('#servings-decrease').on('click', () => {
            servings = Math.max(1, servings - 1);
            drawIngredients();
        });
        $('#servings-increase').on('click', () => {
            servings = Math.min(12, servings + 1);
            drawIngredients();
        });
        $('#copy-shopping-list').on('click', async () => {
            if (!activeRecipe)
                return;
            const selected = app.read('fridge-ingredients', []);
            const pantry = app.pantry || ['salt', 'pepper', 'water', 'oil'];
            const missing = activeRecipe.ingredients.filter(name => !selected.includes(name) && !pantry.includes(name));
            const text = (missing.length ? missing : activeRecipe.ingredients).map(ingredientLabel).join('\n');
            try {
                if (navigator.clipboard && window.isSecureContext)
                    await navigator.clipboard.writeText(text);
                else {
                    const $area = $('<textarea>').val(text).appendTo('body');
                    $area[0].select();
                    const copied = document.execCommand('copy');
                    $area.remove();
                    if (!copied)
                        throw new Error('Clipboard unavailable');
                }
                app.toast(missing.length ? 'Missing ingredients copied' : 'Ingredient list copied');
            }
            catch {
                app.toast('Could not access clipboard');
            }
        });
    });
})();
