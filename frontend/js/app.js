/**
 * App Controller — Main application logic, routing, and UI rendering
 * Handles SPA navigation, rendering course cards, recommendations, etc.
 */

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────
    const state = {
        currentPage: 'home',
        currentUser: 1,
        explorePage: 1,
        selectedRefCourse: null,
        currentRecMethod: 'hybrid',
        stats: null,
        categories: null,
        loggedInUser: null,  // { name, email }
    };

    // ── Category Icons & CSS Classes ─────────────────────────────────────
    const CATEGORY_ICONS = {
        'Data Science': 'database',
        'Web Development': 'code-2',
        'Artificial Intelligence': 'brain',
        'Cloud Computing': 'cloud',
        'Mobile Development': 'smartphone',
        'Cybersecurity': 'shield-check',
        'Business & Management': 'briefcase',
        'Design': 'palette',
        'Database & SQL': 'hard-drive',
        'Programming Languages': 'terminal',
    };

    function getCategoryClass(category) {
        return 'cat--' + category.toLowerCase().replace(/[&\s]+/g, '-').replace(/-+/g, '-');
    }

    // ── Utility: Format numbers ──────────────────────────────────────────
    function formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    // ── Utility: Star rating HTML ────────────────────────────────────────
    function renderStars(rating) {
        let html = '<div class="stars">';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                html += '<svg class="star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else if (i - 0.5 <= rating) {
                html += '<svg class="star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" opacity="0.5"/></svg>';
            } else {
                html += '<svg class="star star--empty" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
        }
        html += '</div>';
        return html;
    }

    // ── Render a single course card ──────────────────────────────────────
    function renderCourseCard(course, extraBadge = '') {
        const diffClass = 'difficulty--' + (course.difficulty || 'beginner').toLowerCase();
        const catClass = getCategoryClass(course.category || 'General');

        let scoreHtml = '';
        if (course.similarity_score !== undefined) {
            scoreHtml = `<div class="course-card__score">Similarity: ${(course.similarity_score * 100).toFixed(1)}%</div>`;
        } else if (course.predicted_score !== undefined) {
            scoreHtml = `<div class="course-card__score">Predicted Score: ${course.predicted_score.toFixed(3)}</div>`;
        } else if (course.knn_similarity !== undefined) {
            scoreHtml = `<div class="course-card__score">KNN Similarity: ${(course.knn_similarity * 100).toFixed(1)}%</div>`;
        } else if (course.hybrid_score !== undefined) {
            scoreHtml = `<div class="course-card__score">Hybrid Score: ${course.hybrid_score.toFixed(3)}</div>`;
        } else if (course.popularity_score !== undefined) {
            scoreHtml = `<div class="course-card__score">Popularity: ${(course.popularity_score * 100).toFixed(0)}%</div>`;
        }

        return `
            <div class="course-card" data-course-id="${course.course_id}" onclick="App.openCourseModal(${course.course_id})">
                <div class="course-card__header">
                    <span class="course-card__category ${catClass}">${course.category || 'General'}</span>
                    <span class="course-card__difficulty ${diffClass}">${course.difficulty || 'Beginner'}</span>
                </div>
                <h3 class="course-card__title">${escapeHtml(course.title)}</h3>
                <div class="course-card__instructor">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    ${escapeHtml(course.instructor || 'Unknown')}
                </div>
                <div class="course-card__rating">
                    ${renderStars(course.rating || 0)}
                    <span class="course-card__rating-value">${(course.rating || 0).toFixed(1)}</span>
                    <span class="course-card__rating-count">(${formatNumber(course.num_reviews || 0)})</span>
                </div>
                <div class="course-card__meta">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${course.duration_hours || 0}h
                    </span>
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        ${formatNumber(course.num_subscribers || 0)}
                    </span>
                </div>
                ${scoreHtml}
            </div>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ══════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ══════════════════════════════════════════════════════════════════════

    function navigateTo(page) {
        state.currentPage = page;

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Show/hide pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // Load page data
        switch (page) {
            case 'home': loadHomePage(); break;
            case 'explore': loadExplorePage(); break;
            case 'recommend': loadRecommendPage(); break;
            case 'analytics': loadAnalyticsPage(); break;
            case 'dashboard': loadDashboardPage(); break;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ══════════════════════════════════════════════════════════════════════
    // HOME PAGE
    // ══════════════════════════════════════════════════════════════════════

    async function loadHomePage() {
        try {
            // Load stats
            if (!state.stats) {
                const statsRes = await API.getStats();
                state.stats = statsRes.stats;
            }
            const s = state.stats;
            document.getElementById('stat-courses').textContent = formatNumber(s.total_courses);
            document.getElementById('stat-categories').textContent = s.total_categories;
            document.getElementById('stat-users').textContent = formatNumber(s.total_users);
            document.getElementById('stat-interactions').textContent = formatNumber(s.total_interactions);

            // Trending courses
            const trendingRes = await API.getPopularCourses(null, 8);
            const trendingGrid = document.getElementById('trending-courses');
            trendingGrid.innerHTML = (trendingRes.recommendations || [])
                .map(c => renderCourseCard(c)).join('');

            // Categories
            if (!state.categories) {
                const catRes = await API.getCategories();
                state.categories = catRes.categories;
            }
            renderCategoryGrid();

        } catch (err) {
            console.error('Failed to load home page:', err);
        }
    }

    function renderCategoryGrid() {
        const grid = document.getElementById('categories-grid');
        if (!state.categories) return;

        grid.innerHTML = Object.entries(state.categories).map(([name, count]) => {
            const icon = CATEGORY_ICONS[name] || 'folder';
            return `
                <div class="category-card" onclick="App.exploreCategoryFromHome('${escapeHtml(name)}')">
                    <div class="category-card__icon">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="category-card__name">${escapeHtml(name)}</div>
                    <div class="category-card__count">${count} courses</div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    // ══════════════════════════════════════════════════════════════════════
    // EXPLORE PAGE
    // ══════════════════════════════════════════════════════════════════════

    async function loadExplorePage(page = 1) {
        try {
            // Populate category filter
            if (!state.categories) {
                const catRes = await API.getCategories();
                state.categories = catRes.categories;
            }
            const catSelect = document.getElementById('filter-category');
            if (catSelect.options.length <= 1) {
                Object.keys(state.categories).forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    catSelect.appendChild(opt);
                });
            }

            await fetchExploreResults(page);
        } catch (err) {
            console.error('Failed to load explore page:', err);
        }
    }

    async function fetchExploreResults(page = 1) {
        const params = {
            category: document.getElementById('filter-category').value,
            difficulty: document.getElementById('filter-difficulty').value,
            min_rating: document.getElementById('filter-rating').value,
            sort_by: document.getElementById('filter-sort').value,
            page: page,
            per_page: 18,
        };

        const res = await API.getCourses(params);
        const grid = document.getElementById('explore-courses');
        grid.innerHTML = (res.courses || []).map(c => renderCourseCard(c)).join('');

        state.explorePage = page;
        renderPagination(res.pagination);
    }

    async function searchExplore() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) {
            fetchExploreResults(1);
            return;
        }

        const res = await API.searchCourses(query, 30);
        const grid = document.getElementById('explore-courses');
        grid.innerHTML = (res.results || []).map(c => renderCourseCard(c)).join('');

        document.getElementById('pagination').innerHTML =
            `<span style="color: var(--text-muted);">${res.count} results for "${escapeHtml(query)}"</span>`;
    }

    function renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!pagination || pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        const { page, total_pages } = pagination;

        html += `<button ${page <= 1 ? 'disabled' : ''} onclick="App.loadExplorePage(${page - 1})">‹ Prev</button>`;

        const start = Math.max(1, page - 2);
        const end = Math.min(total_pages, page + 2);

        if (start > 1) {
            html += `<button onclick="App.loadExplorePage(1)">1</button>`;
            if (start > 2) html += `<span style="color: var(--text-muted)">…</span>`;
        }

        for (let i = start; i <= end; i++) {
            html += `<button class="${i === page ? 'active' : ''}" onclick="App.loadExplorePage(${i})">${i}</button>`;
        }

        if (end < total_pages) {
            if (end < total_pages - 1) html += `<span style="color: var(--text-muted)">…</span>`;
            html += `<button onclick="App.loadExplorePage(${total_pages})">${total_pages}</button>`;
        }

        html += `<button ${page >= total_pages ? 'disabled' : ''} onclick="App.loadExplorePage(${page + 1})">Next ›</button>`;

        container.innerHTML = html;
    }

    // ══════════════════════════════════════════════════════════════════════
    // RECOMMEND PAGE
    // ══════════════════════════════════════════════════════════════════════

    async function loadRecommendPage() {
        try {
            await loadUserProfile();

            // Auto-fetch hybrid recommendations
            if (state.currentRecMethod === 'hybrid' || state.currentRecMethod === 'collaborative' || state.currentRecMethod === 'popular') {
                await fetchRecommendations();
            }
        } catch (err) {
            console.error('Failed to load recommend page:', err);
        }
    }

    async function loadUserProfile() {
        try {
            const res = await API.getUserProfile(state.currentUser);
            const profile = res.profile;
            if (!profile) return;

            document.getElementById('profile-name').textContent = `User ${profile.user_id} Profile`;
            document.getElementById('profile-stats').textContent =
                `${profile.courses_taken} courses taken · ${profile.completion_rate}% completion rate`;

            const details = document.getElementById('profile-details');
            details.innerHTML = `
                <div class="profile-detail">
                    <div class="profile-detail__label">Courses Taken</div>
                    <div class="profile-detail__value">${profile.courses_taken}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail__label">Avg Rating Given</div>
                    <div class="profile-detail__value">${profile.avg_rating_given} ★</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail__label">Completion Rate</div>
                    <div class="profile-detail__value">${profile.completion_rate}%</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail__label">Preferred Difficulty</div>
                    <div class="profile-detail__value">${profile.preferred_difficulty}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail__label">Top Categories</div>
                    <div class="profile-tags">
                        ${Object.keys(profile.preferred_categories || {}).map(c =>
                            `<span class="profile-tag">${escapeHtml(c)}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail__label">Top Skills</div>
                    <div class="profile-tags">
                        ${Object.keys(profile.top_skills || {}).map(s =>
                            `<span class="profile-tag">${escapeHtml(s)}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load user profile:', err);
        }
    }

    function switchRecMethod(method) {
        state.currentRecMethod = method;

        document.querySelectorAll('.rec-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.method === method);
        });

        // Show course selector for content-based and KNN
        const selector = document.getElementById('course-selector');
        if (method === 'content' || method === 'knn') {
            selector.style.display = '';
        } else {
            selector.style.display = 'none';
            // Auto-fetch for non-course-dependent methods
            fetchRecommendations();
        }
    }

    async function fetchRecommendations() {
        const method = state.currentRecMethod;
        const userId = state.currentUser;
        const grid = document.getElementById('rec-courses');
        const header = document.getElementById('rec-results-header');
        const empty = document.getElementById('rec-empty');
        const label = document.getElementById('rec-method-label');
        const badge = document.getElementById('rec-count-badge');

        grid.innerHTML = '<div class="skeleton" style="height:200px;grid-column:1/-1;"></div>';
        header.style.display = 'none';
        empty.style.display = 'none';

        try {
            let res;
            switch (method) {
                case 'hybrid':
                    res = await API.getHybridRecommendations(userId, state.selectedRefCourse, 12);
                    break;
                case 'collaborative':
                    res = await API.getCollaborativeRecommendations(userId, 12);
                    break;
                case 'content':
                    if (!state.selectedRefCourse) {
                        grid.innerHTML = '';
                        empty.style.display = '';
                        empty.querySelector('p').textContent = 'Select a reference course above to get content-based recommendations';
                        return;
                    }
                    res = await API.getContentRecommendations(state.selectedRefCourse, 12);
                    break;
                case 'knn':
                    if (!state.selectedRefCourse) {
                        grid.innerHTML = '';
                        empty.style.display = '';
                        empty.querySelector('p').textContent = 'Select a reference course above to get KNN recommendations';
                        return;
                    }
                    res = await API.getKNNRecommendations(state.selectedRefCourse, 12);
                    break;
                case 'popular':
                    res = await API.getPopularCourses(null, 12);
                    break;
            }

            const recs = res.recommendations || [];
            if (recs.length === 0) {
                grid.innerHTML = '';
                empty.style.display = '';
                empty.querySelector('p').textContent = 'No recommendations found. Try a different method or user.';
                return;
            }

            header.style.display = 'flex';
            label.textContent = res.method || 'Recommendations';
            badge.textContent = `${recs.length} courses`;
            grid.innerHTML = recs.map(c => renderCourseCard(c)).join('');
            empty.style.display = 'none';

        } catch (err) {
            console.error('Failed to fetch recommendations:', err);
            grid.innerHTML = `<p style="color: var(--accent-rose); grid-column:1/-1; text-align:center;">Failed to load recommendations. Is the backend running?</p>`;
        }
    }

    // Reference course search for content/KNN
    let refSearchTimeout = null;
    async function refCourseSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('ref-course-results').classList.remove('show');
            return;
        }

        clearTimeout(refSearchTimeout);
        refSearchTimeout = setTimeout(async () => {
            try {
                const res = await API.searchCourses(query, 8);
                const container = document.getElementById('ref-course-results');
                if (!res.results || res.results.length === 0) {
                    container.innerHTML = '<div class="course-selector__result-item" style="color: var(--text-muted);">No courses found</div>';
                } else {
                    container.innerHTML = res.results.map(c =>
                        `<div class="course-selector__result-item" onclick="App.selectRefCourse(${c.course_id}, '${escapeHtml(c.title).replace(/'/g, "\\'")}')">${escapeHtml(c.title)} <span style="color:var(--text-muted);font-size:0.78rem;">(${c.category})</span></div>`
                    ).join('');
                }
                container.classList.add('show');
            } catch (err) {
                console.error(err);
            }
        }, 300);
    }

    function selectRefCourse(courseId, title) {
        state.selectedRefCourse = courseId;
        document.getElementById('ref-course-results').classList.remove('show');
        document.getElementById('ref-course-search').value = '';
        document.getElementById('ref-course-selected').style.display = 'flex';
        document.getElementById('ref-course-name').textContent = title;
    }

    function clearRefCourse() {
        state.selectedRefCourse = null;
        document.getElementById('ref-course-selected').style.display = 'none';
        document.getElementById('ref-course-name').textContent = '';
    }

    // ══════════════════════════════════════════════════════════════════════
    // ANALYTICS PAGE
    // ══════════════════════════════════════════════════════════════════════

    async function loadAnalyticsPage() {
        try {
            if (!state.stats) {
                const res = await API.getStats();
                state.stats = res.stats;
            }
            const s = state.stats;

            // Stat cards
            document.getElementById('analytics-total-courses').textContent = formatNumber(s.total_courses);
            document.getElementById('analytics-total-users').textContent = formatNumber(s.total_users);
            document.getElementById('analytics-total-interactions').textContent = formatNumber(s.total_interactions);
            document.getElementById('analytics-avg-rating').textContent = s.avg_rating;

            // Charts
            Charts.renderCategoryChart('chart-category', s.category_distribution);
            Charts.renderDifficultyChart('chart-difficulty', s.difficulty_distribution);
            Charts.renderRatingChart('chart-ratings', s.rating_distribution);
            Charts.renderInstructorsChart('chart-instructors', s.top_instructors);

        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // DASHBOARD PAGE
    // ══════════════════════════════════════════════════════════════════════

    async function loadDashboardPage() {
        if (!state.loggedInUser) {
            document.getElementById('dash-stats').style.display = 'none';
            document.getElementById('dash-courses-section').style.display = 'none';
            document.getElementById('dash-welcome').style.display = 'none';
            document.getElementById('dash-subtitle').style.display = 'none';
            document.getElementById('dash-profile-section').style.display = 'none';
            
            const empty = document.getElementById('dash-empty');
            empty.style.display = 'flex';
            empty.innerHTML = `
                <i data-lucide="lock" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem;"></i>
                <h3>Authentication Required</h3>
                <p>Please log in or register to view your personalized dashboard and track your enrolled courses.</p>
                <button class="btn btn--primary" style="margin-top:1rem;" onclick="App.showAuth()">Sign In / Register</button>
            `;
            lucide.createIcons();
            return;
        }

        document.getElementById('dash-welcome').innerHTML = `Welcome back, <span style="color:var(--accent-blue);">${escapeHtml(state.loggedInUser.name)}</span>!`;
        document.getElementById('dash-welcome').style.display = 'block';
        document.getElementById('dash-subtitle').style.display = 'block';
        document.getElementById('dash-profile-section').style.display = 'flex';
        document.getElementById('dash-stats').style.display = 'grid';
        document.getElementById('dash-courses-section').style.display = 'block';

        try {
            const res = await API.getDashboard(state.loggedInUser.email);
            const d = res.dashboard;

            // Populate Profile section
            document.getElementById('profile-name').textContent = d.name || state.loggedInUser.name;
            document.getElementById('profile-email').textContent = d.email || state.loggedInUser.email;
            document.getElementById('profile-initial').textContent = (d.name || state.loggedInUser.name).charAt(0).toUpperCase();

            document.getElementById('dash-total-enrolled').textContent = d.total_enrolled || 0;
            document.getElementById('dash-in-progress').textContent = d.in_progress || 0;
            document.getElementById('dash-completed').textContent = d.completed || 0;
            document.getElementById('dash-avg-progress').textContent = `${d.avg_progress || 0}%`;

            const grid = document.getElementById('dash-courses-grid');
            const empty = document.getElementById('dash-empty');
            
            if (d.courses && d.courses.length > 0) {
                grid.style.display = 'grid';
                empty.style.display = 'none';
                grid.innerHTML = d.courses.map(c => renderDashCourseCard(c)).join('');
            } else {
                grid.style.display = 'none';
                empty.style.display = 'flex';
            }
            lucide.createIcons();
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    }

    function renderDashCourseCard(course) {
        const catClass = getCategoryClass(course.category || 'General');
        return `
            <div class="dash-course-card glass-card">
                <div class="dash-course-card__header">
                    <div>
                        <span class="course-card__category ${catClass}">${escapeHtml(course.category || 'General')}</span>
                    </div>
                </div>
                <h3 class="dash-course-card__title">${escapeHtml(course.title)}</h3>
                <div class="dash-course-card__progress" style="margin-top:var(--space-md); margin-bottom:var(--space-md);">
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${course.progress || 0}%; background:var(--accent-purple); height:100%; border-radius:1rem;"></div>
                    </div>
                    <div class="progress-stats" style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
                        <span>Progress</span>
                        <span>${course.progress || 0}% Complete</span>
                    </div>
                </div>
                <!-- Controls -->
                <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: space-between;">
                    <div style="flex:1;">
                        <input type="range" style="width:100%; cursor:pointer;" min="0" max="100" value="${course.progress || 0}" 
                               onchange="App.updateProgress('${course.course_id}', this.value)">
                    </div>
                    <button class="btn btn--sm btn--glass" onclick="App.unenrollCourse('${course.course_id}')" title="Unenroll">
                        <i data-lucide="trash-2"></i>
                    </button>
                    <button class="btn btn--sm btn--primary" onclick="App.openCourseModal('${course.course_id}')" title="Details">
                        <i data-lucide="external-link"></i>
                    </button>
                </div>
            </div>
        `;
    }

    async function updateProgress(courseId, progress) {
        try {
            await API.updateProgress(state.loggedInUser.email, courseId, parseInt(progress));
            loadDashboardPage();
        } catch (err) {
            console.error(err);
        }
    }

    async function unenrollCourse(courseId) {
        if (!confirm('Are you sure you want to unenroll from this course?')) return;
        try {
            await API.unenrollCourse(state.loggedInUser.email, courseId);
            loadDashboardPage();
        } catch (err) {
            console.error(err);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // COURSE DETAIL MODAL
    // ══════════════════════════════════════════════════════════════════════

    async function openCourseModal(courseId) {
        const modal = document.getElementById('course-modal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        try {
            const res = await API.getCourse(courseId);
            const c = res.course;

            const catClass = getCategoryClass(c.category || 'General');
            document.getElementById('modal-category').textContent = c.category;
            document.getElementById('modal-category').className = `modal__category-badge ${catClass}`;
            document.getElementById('modal-title').textContent = c.title;
            document.getElementById('modal-instructor').innerHTML =
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${escapeHtml(c.instructor)}`;
            document.getElementById('modal-difficulty').innerHTML =
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/></svg> ${c.difficulty}`;
            document.getElementById('modal-duration').innerHTML =
                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${c.duration_hours}h`;

            document.getElementById('modal-rating').innerHTML =
                `${renderStars(c.rating)} <strong style="color:var(--accent-amber);font-size:1.2rem;">${c.rating}</strong> <span style="color:var(--text-muted);">(${formatNumber(c.num_reviews)} reviews)</span>`;

            document.getElementById('modal-description').textContent = c.description;

            const skills = (c.skills || '').split(',').map(s => s.trim()).filter(Boolean);
            document.getElementById('modal-skills').innerHTML = skills.map(s =>
                `<span class="skill-tag">${escapeHtml(s)}</span>`
            ).join('');

            document.getElementById('modal-subscribers').textContent = formatNumber(c.num_subscribers);
            document.getElementById('modal-reviews').textContent = formatNumber(c.num_reviews);

            // Load similar courses (content-based)
            const simRes = await API.getContentRecommendations(courseId, 4);
            const simGrid = document.getElementById('modal-similar-courses');
            simGrid.innerHTML = (simRes.recommendations || []).map(sc => renderCourseCard(sc)).join('');

            // Setup enroll button
            const enrollBtn = document.getElementById('btn-enroll-course');
            const newEnrollBtn = enrollBtn.cloneNode(true);
            enrollBtn.parentNode.replaceChild(newEnrollBtn, enrollBtn);
            
            newEnrollBtn.addEventListener('click', async () => {
                if (!state.loggedInUser) {
                    alert('Please log in to enroll in courses.');
                    return;
                }
                newEnrollBtn.innerHTML = '<i data-lucide="loader"></i> Enrolling...';
                lucide.createIcons();
                try {
                    const enrollRes = await API.enrollCourse(state.loggedInUser.email, courseId);
                    if (enrollRes.status === 200 || enrollRes.status === 201) {
                        newEnrollBtn.innerHTML = '<i data-lucide="check"></i> Enrolled!';
                        newEnrollBtn.style.background = 'var(--accent-green)';
                        newEnrollBtn.style.color = '#fff';
                    } else {
                        newEnrollBtn.innerHTML = 'Enrollment Failed';
                    }
                    lucide.createIcons();
                } catch (err) {
                    console.error('Failed to enroll:', err);
                }
            });

        } catch (err) {
            console.error('Failed to load course details:', err);
        }
    }

    function closeCourseModal() {
        document.getElementById('course-modal').style.display = 'none';
        document.body.style.overflow = '';
    }

    // ══════════════════════════════════════════════════════════════════════
    // EXPLORE FROM HOME (click category)
    // ══════════════════════════════════════════════════════════════════════

    function exploreCategoryFromHome(category) {
        navigateTo('explore');
        setTimeout(() => {
            document.getElementById('filter-category').value = category;
            fetchExploreResults(1);
        }, 100);
    }

    // ══════════════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════════════

    function showAuthAlert(id, message, type = 'error') {
        const alert = document.getElementById(id);
        alert.textContent = message;
        alert.className = `auth-alert auth-alert--${type}`;
        alert.style.display = 'block';
    }

    function hideAuthAlert(id) {
        const alert = document.getElementById(id);
        alert.style.display = 'none';
    }

    function showApp(user) {
        state.loggedInUser = user;
        sessionStorage.setItem('courseai_user', JSON.stringify(user));
        
        // Sync ML state
        if (user.ml_user_id) {
            state.currentUser = user.ml_user_id;
            const select = document.getElementById('user-select');
            if (select) select.value = user.ml_user_id;
        }

        document.getElementById('auth-wrapper').style.display = 'none';
        document.getElementById('navbar').style.display = '';
        document.getElementById('main-content').style.display = '';
        document.getElementById('app-footer').style.display = '';

        // Show user name in navbar
        document.getElementById('navbar-user-name').textContent = user.name;

        lucide.createIcons();
        navigateTo('home');
    }


    function showAuth() {
        state.loggedInUser = null;
        sessionStorage.removeItem('courseai_user');

        document.getElementById('auth-wrapper').style.display = '';
        document.getElementById('navbar').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('app-footer').style.display = 'none';

        // Reset forms
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        hideAuthAlert('login-alert');

        lucide.createIcons();
    }

    async function handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        hideAuthAlert('login-alert');

        if (!email || !password) {
            showAuthAlert('login-alert', 'Please enter your email and password.');
            return;
        }

        try {
            const res = await API.login(email, password);
            if (res.status === 200) {
                showApp(res.data.user);
            } else {
                showAuthAlert('login-alert', res.data.error || 'Login failed.');
            }
        } catch (err) {
            showAuthAlert('login-alert', 'Cannot connect to server. Is the backend running?');
        }
    }

    async function handleRegister() {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        hideAuthAlert('register-alert');

        if (!name || !email || !password) {
            showAuthAlert('register-alert', 'All fields are required.');
            return;
        }
        if (password.length < 6) {
            showAuthAlert('register-alert', 'Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            showAuthAlert('register-alert', 'Passwords do not match.');
            return;
        }

        try {
            const res = await API.register(name, email, password);
            if (res.status === 201) {
                // Switch to login form with success message
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = '';
                document.getElementById('login-email').value = email;
                showAuthAlert('login-alert', 'Account created! Please sign in.', 'success');
            } else {
                showAuthAlert('register-alert', res.data.error || 'Registration failed.');
            }
        } catch (err) {
            showAuthAlert('register-alert', 'Cannot connect to server. Is the backend running?');
        }
    }

    function handleLogout() {
        showAuth();
    }

    // ══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ══════════════════════════════════════════════════════════════════════

    async function init() {
        // ── Auth event listeners ─────────────────────────────────────────
        document.getElementById('login-btn').addEventListener('click', handleLogin);
        document.getElementById('register-btn').addEventListener('click', handleRegister);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);

        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = '';
            hideAuthAlert('login-alert');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = '';
            hideAuthAlert('register-alert');
        });

        // Enter key on auth forms
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        document.getElementById('register-confirm').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleRegister();
        });

        // ── Setup nav links ──────────────────────────────────────────────
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.page);
            });
        });

        // Hero buttons
        document.getElementById('hero-explore-btn').addEventListener('click', () => navigateTo('explore'));
        document.getElementById('hero-recommend-btn').addEventListener('click', () => navigateTo('recommend'));

        // User selector
        try {
            const usersRes = await API.getUsers();
            const select = document.getElementById('user-select');
            select.innerHTML = (usersRes.user_ids || []).map(id =>
                `<option value="${id}">User ${id}</option>`
            ).join('');
            select.addEventListener('change', (e) => {
                state.currentUser = parseInt(e.target.value);
                if (state.currentPage === 'recommend') {
                    loadRecommendPage();
                }
            });
        } catch (err) {
            console.error('Failed to load users:', err);
        }

        // Search
        document.getElementById('search-btn').addEventListener('click', searchExplore);
        document.getElementById('search-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchExplore();
        });

        // Filters
        document.getElementById('apply-filters-btn').addEventListener('click', () => fetchExploreResults(1));
        document.getElementById('reset-filters-btn').addEventListener('click', () => {
            document.getElementById('filter-category').value = '';
            document.getElementById('filter-difficulty').value = '';
            document.getElementById('filter-rating').value = '';
            document.getElementById('filter-sort').value = 'rating';
            fetchExploreResults(1);
        });

        // Rec tabs
        document.querySelectorAll('.rec-tab').forEach(tab => {
            tab.addEventListener('click', () => switchRecMethod(tab.dataset.method));
        });

        // Ref course search
        document.getElementById('ref-course-search').addEventListener('input', (e) => {
            refCourseSearch(e.target.value);
        });
        document.getElementById('ref-course-clear').addEventListener('click', clearRefCourse);
        document.getElementById('get-recs-btn').addEventListener('click', fetchRecommendations);

        // Close ref course dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.course-selector__search')) {
                document.getElementById('ref-course-results').classList.remove('show');
            }
        });

        // Modal
        document.getElementById('modal-close').addEventListener('click', closeCourseModal);
        document.getElementById('course-modal').addEventListener('click', (e) => {
            if (e.target.id === 'course-modal') closeCourseModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeCourseModal();
        });

        // Hash routing
        function handleHash() {
            const hash = window.location.hash.replace('#', '') || 'home';
            if (['home', 'explore', 'recommend', 'analytics'].includes(hash)) {
                navigateTo(hash);
            }
        }
        window.addEventListener('hashchange', handleHash);

        // Initialize icons
        lucide.createIcons();

        // ── Check for existing session ───────────────────────────────────
        const saved = sessionStorage.getItem('courseai_user');
        if (saved) {
            try {
                showApp(JSON.parse(saved));
            } catch {
                showAuth();
            }
        } else {
            showAuth();
        }
    }

    // ── Public API ───────────────────────────────────────────────────────
    window.App = {
        openCourseModal,
        loadExplorePage: (page) => fetchExploreResults(page),
        exploreCategoryFromHome,
        selectRefCourse,
        clearRefCourse,
        updateProgress,
        unenrollCourse,
        loadDashboardPage,
        renderDashCourseCard,
        showAuth,
    };

    // Boot
    document.addEventListener('DOMContentLoaded', init);
})();
