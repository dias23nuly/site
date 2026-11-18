/* рецепты */
(() => {
    const app = window.Fridge;
    const pantry = ['salt', 'pepper', 'water', 'oil'];
    app.pantry = pantry;
    let recipes = [];
    let request = null;
    let selected = app.read('fridge-ingredients', []);
    if (!Array.isArray(selected)) selected = [];
    selected = selected.filter(value => typeof value === 'string').map(value => value.trim().toLowerCase());
    let homeHasSearched = false;
    const popular = ['eggs', 'milk', 'cheese', 'tomato', 'chicken', 'potato', 'onion', 'carrot', 'rice', 'pasta', 'butter', 'cucumber'];
    const normal = item => String(item).trim().toLowerCase();
    const allIngredients = () => [...new Set(recipes.flatMap(recipe => recipe.ingredients))].filter(item => !pantry.includes(item)).sort();
    /* совпадения */
    const score = recipe => {
        const available = new Set([...selected, ...pantry]);
        const matched = recipe.ingredients.filter(ingredient => available.has(ingredient)).length;
        return {
            percent: Math.round(matched / recipe.ingredients.length * 100),
            missing: recipe.ingredients.filter(ingredient => !available.has(ingredient))
        };
    };
    /* загрузка json */
    const getData = () => {
        if (!request) {
            request = fetch('data/recipes.json', { cache: 'no-cache' })
                .then(response => {
                if (!response.ok)
                    throw new Error('Recipe data is unavailable');
                return response.json();
            })
                .then(data => {
                if (!Array.isArray(data) || !data.length)
                    throw new Error('Invalid recipe data');
                recipes = data;
                return recipes;
            }).catch(error => {
                request = null;
                throw error;
            });
        }
        return request;
    };
    /* карточки */
    app.createCard = (recipe, showMatch = selected.length > 0) => {
        const match = score(recipe);
        const $card = $('<article class="recipe-card reveal"></article>');
        $card.attr('data-recipe-id', recipe.id);
        const $image = $('<div class="card-image"></div>');
        const $img = $('<img loading="lazy">').attr({ src: recipe.image, alt: recipe.title });
        $img.on('error', function () {
            $(this).off('error').attr('src', 'assets/recipe-placeholder.svg');
        });
        const $favorite = $('<button class="favorite-btn" type="button"></button>');
        $favorite.attr({ 'data-favorite-id': recipe.id, 'aria-label': app.isFavorite(recipe.id) ? `Remove ${recipe.title} from favorites` : `Add ${recipe.title} to favorites`, 'aria-pressed': String(app.isFavorite(recipe.id)) });
        $favorite.text(app.isFavorite(recipe.id) ? 'Saved' : 'Save').toggleClass('is-favorite', app.isFavorite(recipe.id));
        $image.append($img, $favorite);
        const $body = $('<div class="card-body"></div>');
        const $open = $('<button class="recipe-open" type="button"></button>');
        $open.text('View recipe');
        $open.attr('aria-label', `View ${recipe.title}`);
        const $top = $('<div class="card-top"></div>').append($('<span>').text(recipe.category));
        if (showMatch)
            $top.append($('<span class="match-badge"></span>').text(`${match.percent}% match`));
        $body.append($top, $('<h3 class="card-title"></h3>').text(recipe.title), $('<div class="card-meta"></div>').append($('<span>').text(`${recipe.time} min`), $('<span>').text(recipe.difficulty), $('<span>').text(`${recipe.calories} kcal`)));
        if (showMatch && match.missing.length)
            $body.append($('<p class="missing"></p>').text(`Missing: ${match.missing.join(', ')}`));
        return $card.append($image, $body, $open);
    };
    const drawGrid = ($grid, items, matching = false) => {
        $grid.empty().attr('aria-busy', 'false');
        if (!items.length) {
            $grid.append('<div class="empty-state"><div class="empty-icon" aria-hidden="true">—</div><h3>No recipes found</h3><p>Try other ingredients or loosen your filters.</p></div>');
        }
        else
            items.forEach(recipe => {
                const $col = $('<div class="recipe-column col-12 col-sm-6 col-lg-4"></div>');
                $col.append(app.createCard(recipe, matching));
                $grid.append($col);
            });
        if (app.observe)
            app.observe($grid[0]);
    };
    const refreshTags = () => {
        $('#selected-ingredients').empty();
        selected.forEach(name => {
            const $tag = $('<span class="tag"></span>').append($('<span>').text(name));
            $tag.append($('<button type="button">×</button>').attr({ 'data-remove': name, 'aria-label': `Remove ${name}` }));
            $('#selected-ingredients').append($tag);
        });
        $('#popular-ingredients .chip').each(function () {
            $(this).attr('aria-pressed', String(selected.includes($(this).attr('data-ingredient'))));
        });
        app.save('fridge-ingredients', selected);
        if ($('#recipe-grid').length)
            drawAll();
        if (homeHasSearched)
            drawHome();
    };
    const addIngredient = value => {
        const name = normal(value);
        if (!allIngredients().includes(name)) {
            app.toast('Select an ingredient from the suggestions');
            return false;
        }
        if (selected.includes(name)) {
            app.toast('Ingredient already selected');
            return false;
        }
        selected = [...selected, name];
        refreshTags();
        $('#ingredient-input').val('');
        $('#ingredient-suggestions').addClass('hidden').empty();
        app.toast('Ingredient added');
        return true;
    };
    const drawHome = () => {
        // Recipes with all ingredients available come first. Other recipes are suggestions.
        const sorted = [...recipes].sort((a, b) => score(b).percent - score(a).percent || a.time - b.time);
        const exact = sorted.filter(recipe => score(recipe).missing.length === 0);
        const suggestions = sorted.filter(recipe => score(recipe).missing.length > 0);
        const $results = $('#home-results');
        $results.removeClass('hidden').addClass('entering');
        const $grid = $('#home-recipe-grid');
        if (selected.length === 0) {
            $('#home-result-count').text('Select ingredients to find exact matches. Here are recipes you can explore.');
            drawGrid($grid, sorted.slice(0, 9), true);
        } else if (exact.length) {
            $('#home-result-count').text(`${exact.length} ready-to-cook recipe${exact.length === 1 ? '' : 's'} · ${suggestions.length} more ideas`);
            drawGrid($grid, exact, true);
            if (suggestions.length) {
                $grid.append($('<div class="col-12 recipe-group-heading"></div>').append(
                    $('<h3></h3>').text('More ideas (some ingredients missing)'),
                    $('<p class="muted"></p>').text('These recipes need a few extra ingredients.')
                ));
                suggestions.slice(0, 6).forEach(recipe => {
                    $grid.append($('<div class="recipe-column col-12 col-sm-6 col-lg-4"></div>').append(app.createCard(recipe, true)));
                });
                if (app.observe) app.observe($grid[0]);
            }
        } else {
            $('#home-result-count').text('No complete matches yet. Try adding ingredients or explore the closest recipes below.');
            drawGrid($grid, suggestions.slice(0, 9), true);
        }
        setTimeout(() => $results.removeClass('entering'), 450);
    };
    const readFilters = () => ({
        query: normal($('#recipe-search').val() || ''),
        category: $('#filter-category').val() || 'all',
        difficulty: $('#filter-difficulty').val() || 'all',
        maxTime: Number($('#filter-time').val() || 60),
        tag: $('#filter-tag').val() || 'all',
        favoritesOnly: $('#favorites-only').is(':checked'),
        sort: $('#filter-sort').val() || 'match'
    });
    function drawAll() {
        if (!recipes.length || !$('#recipe-grid').length)
            return;
        const filters = readFilters();
        let list = recipes.filter(recipe => {
            const searchMatch = `${recipe.title} ${recipe.ingredients.join(' ')}`.toLowerCase().includes(filters.query);
            return searchMatch && (filters.category === 'all' || recipe.category === filters.category)
                && (filters.difficulty === 'all' || recipe.difficulty === filters.difficulty)
                && recipe.time <= filters.maxTime && (filters.tag === 'all' || recipe.tags.includes(filters.tag))
                && (!filters.favoritesOnly || app.isFavorite(recipe.id));
        });
        if (filters.sort === 'time') {
            list.sort((a, b) => a.time - b.time);
        }
        else if (filters.sort === 'calories') {
            list.sort((a, b) => a.calories - b.calories);
        }
        else {
            list.sort((a, b) => score(b).percent - score(a).percent);
        }
        $('#result-count').text(`${list.length} ${list.length === 1 ? 'recipe' : 'recipes'} found`);
        $('#time-value').text(`${filters.maxTime} min`);
        drawGrid($('#recipe-grid'), list, selected.length > 0);
        $('#recipe-grid').addClass('entering');
        setTimeout(() => $('#recipe-grid').removeClass('entering'), 450);
    }
    const populatePicker = () => {
        const $popular = $('#popular-ingredients');
        popular.forEach(name => $popular.append($('<button type="button" class="chip"></button>').text(`+ ${name}`).attr({ 'data-ingredient': name, 'aria-pressed': 'false' })));
        refreshTags();
    };
    const showSuggestions = query => {
        const $box = $('#ingredient-suggestions').empty();
        const matching = query ? allIngredients().filter(name => name.includes(normal(query)) && !selected.includes(name)).slice(0, 8) : [];
        if (!matching.length) {
            $box.addClass('hidden');
            return;
        }
        matching.forEach(name => $box.append($('<li>').append($('<button type="button"></button>').text(name).attr('data-suggestion', name))));
        $box.removeClass('hidden');
    };
    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };
    $(function () {
        const $grid = $('#recipe-grid').length ? $('#recipe-grid') : $('#home-recipe-grid');
        if ($grid.length)
            app.showSkeletons($grid, 6);
        getData().then(() => {
            if ($('#ingredient-input').length)
                populatePicker();
            if ($('#recipe-grid').length)
                drawAll();
            if ($('#featured-carousel').length)
                app.mountCarousel(recipes.slice(0, 8));
            if ($grid.length && !$('#recipe-grid').length)
                $grid.empty().attr('aria-busy', 'false');
        }).catch(() => {
            if ($grid.length)
                app.showError($grid, 'Recipes could not be loaded. Run this site using a local HTTP server and try again.');
            else
                app.toast('Recipe data could not be loaded');
        });
        $(document).on('click', '.retry-load', () => location.reload());
        $(document).on('click', '.recipe-open', function () {
            const id = Number($(this).closest('.recipe-card').attr('data-recipe-id'));
            const recipe = recipes.find(item => item.id === id);
            app.openRecipe(recipe);
        });
        $(document).on('click', '.favorite-btn', function (event) {
            event.stopPropagation();
            app.toggleFavorite($(this).attr('data-favorite-id'));
        });
        $(document).on('fridge:favorites', () => {
            $('.favorite-btn').each(function () {
                const id = $(this).attr('data-favorite-id');
                const active = app.isFavorite(id);
                const title = recipes.find(item => item.id === Number(id))?.title || 'recipe';
                $(this).text(active ? 'Saved' : 'Save').toggleClass('is-favorite', active)
                    .attr({ 'aria-pressed': String(active), 'aria-label': `${active ? 'Remove' : 'Add'} ${title} ${active ? 'from' : 'to'} favorites` });
            });
            if ($('#favorites-only').is(':checked'))
                drawAll();
        });
        $('#ingredient-input').on('input', function () {
            showSuggestions($(this).val());
        });
        $('#ingredient-input').on('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                addIngredient($('#ingredient-suggestions [data-suggestion]').first().attr('data-suggestion') || $(this).val());
            }
            if (event.key === 'ArrowDown') {
                const first = $('#ingredient-suggestions button').first();
                if (first.length) {
                    event.preventDefault();
                    first.trigger('focus');
                }
            }
            if (event.key === 'Escape')
                $('#ingredient-suggestions').addClass('hidden');
        });
        $('#ingredient-suggestions').on('keydown', 'button', function (event) {
            if (event.key === 'Escape') {
                $('#ingredient-suggestions').addClass('hidden');
                $('#ingredient-input').trigger('focus');
            }
        });
        $(document).on('click', '[data-suggestion]', function () {
            addIngredient($(this).attr('data-suggestion'));
        });
        $(document).on('click', '[data-ingredient]', function () {
            addIngredient($(this).attr('data-ingredient'));
        });
        $(document).on('click', '[data-remove]', function () {
            selected = selected.filter(name => name !== $(this).attr('data-remove'));
            refreshTags();
        });
        $('#clear-ingredients').on('click', () => {
            selected = [];
            refreshTags();
            app.toast('Ingredients cleared');
        });
        $('#find-recipes').on('click', () => {
            homeHasSearched = true;
            drawHome();
            $('#home-results')[0].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        });
        $('#recipe-search').on('input', debounce(drawAll, 220));
        $('#filter-category,#filter-difficulty,#filter-tag,#filter-sort,#favorites-only').on('change', drawAll);
        $('#filter-time').on('input', drawAll);
        $('#reset-filters').on('click', () => {
            $('#recipe-search').val('');
            $('#filter-category,#filter-difficulty,#filter-tag').val('all');
            $('#filter-sort').val('match');
            $('#filter-time').val(60);
            $('#favorites-only').prop('checked', false);
            drawAll();
        });
        $('#surprise-me').on('click', () => {
            if (!recipes.length)
                return app.toast('Recipes are still loading');
            app.openRecipe(recipes[Math.floor(Math.random() * recipes.length)]);
        });
    });
})();
