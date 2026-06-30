"""
Flask REST API Server
Serves as the central 'Server & Database' in the system architecture.
Connects the frontend (End User) to the Data Processing Unit and ML Model.

Endpoints:
  /api/courses          — Course catalog (with filters & pagination)
  /api/courses/<id>     — Single course details
  /api/courses/categories — Category list
  /api/recommend/*      — Recommendation endpoints
  /api/search           — Course search
  /api/stats            — Analytics data
  /api/users/<id>/profile — User learning profile
"""

import os
import sys
import json
import hashlib
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add backend dir to path
sys.path.insert(0, os.path.dirname(__file__))

from data_loader import DataLoader
from recommender import CourseRecommender

# ── Initialize Flask App ─────────────────────────────────────────────────────

CORS(app, resources={
    "/api/*": {
        "origins": [
            "https://nithin740.github.io"
        ]
    }
})

# ── Load Data & Train Models ────────────────────────────────────────────────

print("=" * 60)
print("  Course Recommendation System — Starting Server")
print("=" * 60)
print()

data_loader = DataLoader()
data_loader.load()

recommender = CourseRecommender(data_loader)
recommender.train()

print()
print("  Server ready!")
print("=" * 60)


# ── Helper: Convert DataFrame to JSON-safe list ─────────────────────────────

def df_to_list(df):
    """Convert a DataFrame to a list of dicts, handling NaN."""
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    if isinstance(df, list):
        return df

    # Select columns to return (exclude internal/normalized columns)
    exclude_cols = {"combined_features", "skills_text", "rating_norm",
                    "reviews_norm", "subscribers_norm", "duration_norm"}
    cols = [c for c in df.columns if c not in exclude_cols]
    result = df[cols].copy()

    # Convert skills separator back to comma
    if "skills" in result.columns:
        result["skills"] = result["skills"].str.replace("|", ", ", regex=False)

    records = result.to_dict(orient="records")
    # Replace NaN with None
    for record in records:
        for key, val in record.items():
            if isinstance(val, float) and (val != val):  # NaN check
                record[key] = None
    return records


# ── Auth helpers ─────────────────────────────────────────────────────────────

USERS_FILE = os.path.join(os.path.dirname(__file__), "data", "users.json")


def _load_users():
    """Load registered users from JSON file."""
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(users):
    """Save users dict to JSON file."""
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def _hash_password(password):
    """Hash a password with SHA-256."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── Authentication ───────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if "@" not in email or "." not in email:
        return jsonify({"error": "Please enter a valid email address."}), 400

    users = _load_users()

    if email in users:
        return jsonify({"error": "An account with this email already exists."}), 409

    users[email] = {
        "name": name,
        "email": email,
        "password_hash": _hash_password(password),
        "enrolled_courses": {},
        "ml_user_id": 1,  # Default to 1 for new generic users
    }
    _save_users(users)

    return jsonify({
        "message": "Registration successful!",
        "user": {"name": name, "email": email, "ml_user_id": 1}
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Log in with email and password."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    users = _load_users()
    user = users.get(email)

    if not user or user["password_hash"] != _hash_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    ml_id = user.get("ml_user_id", 1)

    return jsonify({
        "message": "Login successful!",
        "user": {"name": user["name"], "email": user["email"], "ml_user_id": ml_id}
    })


# ── User Dashboard & Progress ────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["POST"])
def get_dashboard():
    """Get the logged-in user's dashboard (enrolled courses + progress)."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    users = _load_users()
    user = users.get(email)
    if not user:
        return jsonify({"error": "User not found."}), 404

    enrolled = user.get("enrolled_courses", {})

    # Build dashboard with full course details
    courses_df = data_loader.get_courses()
    enrolled_list = []
    total_progress = 0

    for cid_str, info in enrolled.items():
        cid = int(cid_str)
        course = data_loader.get_course_by_id(cid)
        if course is not None:
            course_dict = course.to_dict()
            course_dict["skills"] = str(course_dict.get("skills", "")).replace("|", ", ")
            course_dict["course_id"] = int(course_dict.get("course_id", cid))
            course_dict["rating"] = float(course_dict.get("rating", 0.0))
            course_dict["num_reviews"] = int(course_dict.get("num_reviews", 0))
            course_dict["num_subscribers"] = int(course_dict.get("num_subscribers", 0))
            course_dict["duration_hours"] = float(course_dict.get("duration_hours", 0.0))

            for key in ["combined_features", "skills_text", "rating_norm",
                        "reviews_norm", "subscribers_norm", "duration_norm"]:
                course_dict.pop(key, None)
            course_dict["progress"] = info.get("progress", 0)
            course_dict["enrolled_at"] = info.get("enrolled_at", "")
            course_dict["user_rating"] = info.get("user_rating", None)
            enrolled_list.append(course_dict)
            total_progress += info.get("progress", 0)

    completed = sum(1 for c in enrolled_list if c["progress"] >= 100)
    in_progress = sum(1 for c in enrolled_list if 0 < c["progress"] < 100)
    avg_progress = round(total_progress / len(enrolled_list), 1) if enrolled_list else 0

    return jsonify({
        "dashboard": {
            "name": user["name"],
            "email": user["email"],
            "total_enrolled": len(enrolled_list),
            "completed": completed,
            "in_progress": in_progress,
            "avg_progress": avg_progress,
            "courses": enrolled_list,
        }
    })


@app.route("/api/dashboard/enroll/<int:course_id>", methods=["POST"])
def enroll_course(course_id):
    """Enroll the user in a course."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    users = _load_users()
    user = users.get(email)
    if not user:
        return jsonify({"error": "User not found."}), 404

    # Check course exists
    course = data_loader.get_course_by_id(course_id)
    if course is None:
        return jsonify({"error": "Course not found."}), 404

    enrolled = user.get("enrolled_courses", {})
    cid_str = str(course_id)

    if cid_str in enrolled:
        return jsonify({"error": "Already enrolled in this course."}), 409

    from datetime import datetime
    enrolled[cid_str] = {
        "progress": 0,
        "enrolled_at": datetime.now().isoformat(),
        "user_rating": None,
    }
    user["enrolled_courses"] = enrolled
    _save_users(users)

    return jsonify({"message": f"Enrolled in course {course_id}!", "course_id": course_id}), 201


@app.route("/api/dashboard/progress/<int:course_id>", methods=["POST"])
def update_progress(course_id):
    """Update progress (0-100) and optionally rate a course."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    progress = data.get("progress", None)
    user_rating = data.get("rating", None)

    if not email:
        return jsonify({"error": "Email is required."}), 400

    users = _load_users()
    user = users.get(email)
    if not user:
        return jsonify({"error": "User not found."}), 404

    enrolled = user.get("enrolled_courses", {})
    cid_str = str(course_id)

    if cid_str not in enrolled:
        return jsonify({"error": "Not enrolled in this course."}), 404

    if progress is not None:
        enrolled[cid_str]["progress"] = max(0, min(100, int(progress)))
    if user_rating is not None:
        enrolled[cid_str]["user_rating"] = max(1, min(5, float(user_rating)))

    user["enrolled_courses"] = enrolled
    _save_users(users)

    return jsonify({
        "message": "Progress updated!",
        "course_id": course_id,
        "progress": enrolled[cid_str]["progress"],
        "rating": enrolled[cid_str]["user_rating"],
    })


@app.route("/api/dashboard/unenroll/<int:course_id>", methods=["POST"])
def unenroll_course(course_id):
    """Remove a course from the user's enrolled list."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    users = _load_users()
    user = users.get(email)
    if not user:
        return jsonify({"error": "User not found."}), 404

    enrolled = user.get("enrolled_courses", {})
    cid_str = str(course_id)

    if cid_str not in enrolled:
        return jsonify({"error": "Not enrolled in this course."}), 404

    del enrolled[cid_str]
    user["enrolled_courses"] = enrolled
    _save_users(users)

    return jsonify({"message": "Unenrolled from course.", "course_id": course_id})


# ── Courses ──────────────────────────────────────────────────────────────────

@app.route("/api/courses", methods=["GET"])
def get_courses():
    """Get all courses with optional filtering and pagination."""
    df = data_loader.get_courses().copy()

    # Filters
    category = request.args.get("category")
    difficulty = request.args.get("difficulty")
    min_rating = request.args.get("min_rating", type=float)
    sort_by = request.args.get("sort_by", "rating")
    order = request.args.get("order", "desc")

    if category:
        df = df[df["category"].str.lower() == category.lower()]
    if difficulty:
        df = df[df["difficulty"].str.lower() == difficulty.lower()]
    if min_rating:
        df = df[df["rating"] >= min_rating]

    # Sorting
    sort_col = sort_by if sort_by in df.columns else "rating"
    ascending = order.lower() == "asc"
    df = df.sort_values(sort_col, ascending=ascending)

    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)
    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    df_page = df.iloc[start:end]

    return jsonify({
        "courses": df_to_list(df_page),
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    })


@app.route("/api/courses/<int:course_id>", methods=["GET"])
def get_course(course_id):
    """Get a single course by ID."""
    course = data_loader.get_course_by_id(course_id)
    if course is None:
        return jsonify({"error": "Course not found"}), 404

    course_dict = course.to_dict()
    course_dict["skills"] = str(course_dict.get("skills", "")).replace("|", ", ")
    # Remove internal columns
    for key in ["combined_features", "skills_text", "rating_norm",
                "reviews_norm", "subscribers_norm", "duration_norm"]:
        course_dict.pop(key, None)

    return jsonify({"course": course_dict})


@app.route("/api/courses/categories", methods=["GET"])
def get_categories():
    """Get all categories with course counts."""
    categories = data_loader.get_categories()
    return jsonify({"categories": categories})


# ── Search ───────────────────────────────────────────────────────────────────

@app.route("/api/search", methods=["GET"])
def search_courses():
    """Search courses by keyword."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400

    limit = request.args.get("limit", 20, type=int)
    results = data_loader.search_courses(query, limit=limit)
    return jsonify({
        "query": query,
        "results": df_to_list(results),
        "count": len(results)
    })


# ── Recommendations ──────────────────────────────────────────────────────────

@app.route("/api/recommend/content/<int:course_id>", methods=["GET"])
def recommend_content(course_id):
    """Content-Based recommendations: courses similar to the given course."""
    n = request.args.get("n", 10, type=int)
    results = recommender.get_content_recommendations(course_id, n=n)
    return jsonify({
        "method": "Content-Based Filtering",
        "reference_course_id": course_id,
        "recommendations": df_to_list(results)
    })


@app.route("/api/recommend/collaborative/<int:user_id>", methods=["GET"])
def recommend_collaborative(user_id):
    """Collaborative Filtering recommendations for a user."""
    n = request.args.get("n", 10, type=int)
    results = recommender.get_collaborative_recommendations(user_id, n=n)
    return jsonify({
        "method": "Collaborative Filtering (SVD)",
        "user_id": user_id,
        "recommendations": df_to_list(results)
    })


@app.route("/api/recommend/knn/<int:course_id>", methods=["GET"])
def recommend_knn(course_id):
    """KNN-based recommendations: nearest neighbor courses."""
    n = request.args.get("n", 10, type=int)
    results = recommender.get_knn_recommendations(course_id, n=n)
    return jsonify({
        "method": "K-Nearest Neighbors",
        "reference_course_id": course_id,
        "recommendations": df_to_list(results)
    })


@app.route("/api/recommend/hybrid", methods=["GET", "POST"])
def recommend_hybrid():
    """Hybrid recommendations combining content + collaborative."""
    if request.method == "POST":
        data = request.get_json() or {}
    else:
        data = request.args

    user_id = int(data.get("user_id", 1))
    course_id = data.get("course_id", None)
    if course_id is not None:
        course_id = int(course_id)
    n = int(data.get("n", 10))

    results = recommender.get_hybrid_recommendations(user_id, course_id, n=n)
    return jsonify({
        "method": "Hybrid (Content + Collaborative)",
        "user_id": user_id,
        "reference_course_id": course_id,
        "recommendations": df_to_list(results)
    })


@app.route("/api/recommend/popular", methods=["GET"])
def recommend_popular():
    """Get popular/trending courses."""
    category = request.args.get("category")
    n = request.args.get("n", 10, type=int)
    results = recommender.get_popular_courses(category=category, n=n)
    return jsonify({
        "method": "Popularity-Based",
        "category": category,
        "recommendations": df_to_list(results)
    })


# ── User Profile ─────────────────────────────────────────────────────────────

@app.route("/api/users/<int:user_id>/profile", methods=["GET"])
def get_user_profile(user_id):
    """Get user learning profile summary."""
    profile = recommender.get_user_profile_summary(user_id)
    if profile is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"profile": profile})


@app.route("/api/users", methods=["GET"])
def list_users():
    """List all user IDs."""
    interactions = data_loader.get_interactions()
    user_ids = sorted(interactions["user_id"].unique().tolist())
    return jsonify({"user_ids": user_ids, "count": len(user_ids)})


# ── Analytics / Stats ────────────────────────────────────────────────────────

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get dataset statistics for analytics dashboard."""
    stats = data_loader.get_stats()
    return jsonify({"stats": stats})


# ── Serve Frontend ───────────────────────────────────────────────────────────

@app.route("/")
def home():
    return {
        "message": "Course Recommendation System API",
        "status": "running"
    }


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print()
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
