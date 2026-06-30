/**
 * API Client — Handles all backend communication
 * Connects to Flask REST API at localhost:5000
 */

const API_BASE = 'https://course-recomendation-system-oryt.onrender.com';

const API = {
    // ── Auth ─────────────────────────────────────────────────────────────
    async register(name, email, password) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return { status: res.status, data: await res.json() };
    },

    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return { status: res.status, data: await res.json() };
    },

    // ── Dashboard ────────────────────────────────────────────────────────
    async getDashboard(email) {
        const res = await fetch(`${API_BASE}/dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return res.json();
    },

    async enrollCourse(email, courseId) {
        const res = await fetch(`${API_BASE}/dashboard/enroll/${courseId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return { status: res.status, data: await res.json() };
    },

    async updateProgress(email, courseId, progress, rating = null) {
        const body = { email, progress };
        if (rating !== null) body.rating = rating;
        const res = await fetch(`${API_BASE}/dashboard/progress/${courseId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return { status: res.status, data: await res.json() };
    },

    async unenrollCourse(email, courseId) {
        const res = await fetch(`${API_BASE}/dashboard/unenroll/${courseId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return { status: res.status, data: await res.json() };
    },

    // ── Courses ──────────────────────────────────────────────────────────

    async getCourses(params = {}) {
        const query = new URLSearchParams();
        if (params.category) query.set('category', params.category);
        if (params.difficulty) query.set('difficulty', params.difficulty);
        if (params.min_rating) query.set('min_rating', params.min_rating);
        if (params.sort_by) query.set('sort_by', params.sort_by);
        if (params.order) query.set('order', params.order || 'desc');
        if (params.page) query.set('page', params.page);
        if (params.per_page) query.set('per_page', params.per_page || 20);

        const res = await fetch(`${API_BASE}/courses?${query}`);
        return res.json();
    },

    async getCourse(courseId) {
        const res = await fetch(`${API_BASE}/courses/${courseId}`);
        return res.json();
    },

    async getCategories() {
        const res = await fetch(`${API_BASE}/courses/categories`);
        return res.json();
    },

    // ── Search ───────────────────────────────────────────────────────────
    async searchCourses(query, limit = 20) {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return res.json();
    },

    // ── Recommendations ──────────────────────────────────────────────────
    async getContentRecommendations(courseId, n = 10) {
        const res = await fetch(`${API_BASE}/recommend/content/${courseId}?n=${n}`);
        return res.json();
    },

    async getCollaborativeRecommendations(userId, n = 10) {
        const res = await fetch(`${API_BASE}/recommend/collaborative/${userId}?n=${n}`);
        return res.json();
    },

    async getKNNRecommendations(courseId, n = 10) {
        const res = await fetch(`${API_BASE}/recommend/knn/${courseId}?n=${n}`);
        return res.json();
    },

    async getHybridRecommendations(userId, courseId = null, n = 10) {
        const params = new URLSearchParams({ user_id: userId, n: n });
        if (courseId) params.set('course_id', courseId);
        const res = await fetch(`${API_BASE}/recommend/hybrid?${params}`);
        return res.json();
    },

    async getPopularCourses(category = null, n = 10) {
        const params = new URLSearchParams({ n: n });
        if (category) params.set('category', category);
        const res = await fetch(`${API_BASE}/recommend/popular?${params}`);
        return res.json();
    },

    // ── Users ────────────────────────────────────────────────────────────
    async getUsers() {
        const res = await fetch(`${API_BASE}/users`);
        return res.json();
    },

    async getUserProfile(userId) {
        const res = await fetch(`${API_BASE}/users/${userId}/profile`);
        return res.json();
    },

    // ── Stats ────────────────────────────────────────────────────────────
    async getStats() {
        const res = await fetch(`${API_BASE}/stats`);
        return res.json();
    }
};
