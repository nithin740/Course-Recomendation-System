"""
ML Recommendation Engine
Implements multiple recommendation strategies:
  - Content-Based Filtering (TF-IDF + Cosine Similarity)
  - Collaborative Filtering (SVD-based Matrix Factorization)
  - KNN-Based Recommendations
  - Hybrid Recommendations (weighted blend)

Corresponds to the 'Machine Learning Model' block in the system architecture.
"""

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.neighbors import NearestNeighbors


class CourseRecommender:
    """ML-powered course recommendation engine."""

    def __init__(self, data_loader):
        self.data = data_loader
        self.cosine_sim = None
        self.svd_model = None
        self.svd_matrix = None
        self.knn_model = None
        self._trained = False

    def train(self):
        """Train all recommendation models."""
        print("Training recommendation models...")
        self._compute_cosine_similarity()
        self._train_svd()
        self._train_knn()
        self._trained = True
        print("  ✓ All models trained successfully!")

    # ═══════════════════════════════════════════════════════════════════════════
    # MODEL 1: Content-Based Filtering
    #   Uses TF-IDF vectors of course descriptions/skills + cosine similarity
    #   Recommends courses similar to a given course
    # ═══════════════════════════════════════════════════════════════════════════

    def _compute_cosine_similarity(self):
        """Compute pairwise cosine similarity between all courses."""
        tfidf_matrix = self.data.get_tfidf_matrix()
        self.cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
        print(f"  ✓ Content-based model: cosine similarity matrix "
              f"({self.cosine_sim.shape[0]}×{self.cosine_sim.shape[1]})")

    def get_content_recommendations(self, course_id, n=10):
        """
        Content-Based Filtering: recommend courses similar to a given course.
        Uses TF-IDF features and cosine similarity.
        """
        courses_df = self.data.get_courses()
        idx_matches = courses_df.index[courses_df["course_id"] == course_id]

        if len(idx_matches) == 0:
            return []

        idx = idx_matches[0]
        sim_scores = list(enumerate(self.cosine_sim[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        # Skip the first one (the course itself)
        sim_scores = sim_scores[1:n + 1]

        course_indices = [i[0] for i in sim_scores]
        similarities = [round(float(i[1]), 4) for i in sim_scores]

        results = courses_df.iloc[course_indices].copy()
        results["similarity_score"] = similarities
        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # MODEL 2: Collaborative Filtering (SVD-based Matrix Factorization)
    #   Decomposes the user-course rating matrix to find latent factors
    #   Predicts ratings for unseen courses
    # ═══════════════════════════════════════════════════════════════════════════

    def _train_svd(self, n_components=20):
        """Train SVD model on user-course rating matrix."""
        user_course_matrix = self.data.get_user_course_matrix()

        # Number of components limited by matrix dimensions
        n_components = min(n_components, min(user_course_matrix.shape) - 1)

        self.svd_model = TruncatedSVD(n_components=n_components, random_state=42)
        self.svd_matrix = self.svd_model.fit_transform(user_course_matrix)

        explained_var = self.svd_model.explained_variance_ratio_.sum()
        print(f"  ✓ Collaborative model: SVD with {n_components} components "
              f"({explained_var:.1%} variance explained)")

    def get_collaborative_recommendations(self, user_id, n=10):
        """
        Collaborative Filtering: recommend courses based on similar users' preferences.
        Uses SVD matrix factorization to predict ratings.
        """
        user_course_matrix = self.data.get_user_course_matrix()
        courses_df = self.data.get_courses()

        if user_id not in user_course_matrix.index:
            # Cold start: return popular courses
            return self.get_popular_courses(n=n)

        user_idx = list(user_course_matrix.index).index(user_id)

        # Reconstruct predicted ratings from SVD
        predicted_ratings = np.dot(
            self.svd_matrix[user_idx],
            self.svd_model.components_
        )

        # Get courses the user hasn't rated
        user_ratings = user_course_matrix.loc[user_id]
        unrated_mask = user_ratings == 0
        unrated_course_ids = user_ratings[unrated_mask].index.tolist()

        # Map predictions to unrated courses
        course_predictions = {}
        for course_id in unrated_course_ids:
            if course_id in user_course_matrix.columns:
                col_idx = list(user_course_matrix.columns).index(course_id)
                course_predictions[course_id] = predicted_ratings[col_idx]

        # Sort by predicted rating
        top_courses = sorted(course_predictions.items(), key=lambda x: x[1], reverse=True)[:n]

        if not top_courses:
            return self.get_popular_courses(n=n)

        top_ids = [c[0] for c in top_courses]
        pred_scores = [round(float(c[1]), 4) for c in top_courses]

        results = courses_df[courses_df["course_id"].isin(top_ids)].copy()
        score_map = dict(zip(top_ids, pred_scores))
        results["predicted_score"] = results["course_id"].map(score_map)
        results = results.sort_values("predicted_score", ascending=False)
        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # MODEL 3: K-Nearest Neighbors
    #   Finds the K most similar courses based on TF-IDF feature vectors
    # ═══════════════════════════════════════════════════════════════════════════

    def _train_knn(self, n_neighbors=11):
        """Train KNN model on TF-IDF feature vectors."""
        tfidf_matrix = self.data.get_tfidf_matrix()
        n_neighbors = min(n_neighbors, tfidf_matrix.shape[0])

        self.knn_model = NearestNeighbors(
            n_neighbors=n_neighbors,
            metric="cosine",
            algorithm="brute"
        )
        self.knn_model.fit(tfidf_matrix)
        print(f"  ✓ KNN model: {n_neighbors} neighbors, cosine metric")

    def get_knn_recommendations(self, course_id, n=10):
        """
        KNN-Based: find the K nearest courses to a given course.
        """
        courses_df = self.data.get_courses()
        idx_matches = courses_df.index[courses_df["course_id"] == course_id]

        if len(idx_matches) == 0:
            return []

        idx = idx_matches[0]
        tfidf_matrix = self.data.get_tfidf_matrix()

        distances, indices = self.knn_model.kneighbors(
            tfidf_matrix[idx].reshape(1, -1),
            n_neighbors=n + 1
        )

        # Skip first (itself), convert distance to similarity
        neighbor_indices = indices[0][1:n + 1]
        neighbor_distances = distances[0][1:n + 1]
        similarities = [round(1 - d, 4) for d in neighbor_distances]

        results = courses_df.iloc[neighbor_indices].copy()
        results["knn_similarity"] = similarities
        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # MODEL 4: Hybrid Recommendations
    #   Combines content-based + collaborative filtering
    # ═══════════════════════════════════════════════════════════════════════════

    def get_hybrid_recommendations(self, user_id, course_id=None, n=10,
                                    content_weight=0.4, collab_weight=0.6):
        """
        Hybrid approach: blend content-based and collaborative recommendations.
        """
        courses_df = self.data.get_courses()
        all_ids = set(courses_df["course_id"].tolist())
        scores = {cid: 0.0 for cid in all_ids}

        # Collaborative component
        collab_recs = self.get_collaborative_recommendations(user_id, n=n * 2)
        if isinstance(collab_recs, pd.DataFrame) and not collab_recs.empty:
            max_score = collab_recs["predicted_score"].max() if "predicted_score" in collab_recs.columns else 1.0
            if max_score == 0:
                max_score = 1.0
            for _, row in collab_recs.iterrows():
                pred = row.get("predicted_score", row.get("rating", 0))
                scores[row["course_id"]] += collab_weight * (pred / max_score)

        # Content component (if a reference course is provided)
        if course_id is not None:
            content_recs = self.get_content_recommendations(course_id, n=n * 2)
            if isinstance(content_recs, pd.DataFrame) and not content_recs.empty:
                for _, row in content_recs.iterrows():
                    scores[row["course_id"]] += content_weight * row["similarity_score"]

        # Remove courses user already rated
        user_history = self.data.get_user_history(user_id)
        rated_ids = set(user_history["course_id"].tolist()) if not user_history.empty else set()

        filtered_scores = {k: v for k, v in scores.items() if k not in rated_ids and v > 0}
        top_ids = sorted(filtered_scores, key=filtered_scores.get, reverse=True)[:n]

        results = courses_df[courses_df["course_id"].isin(top_ids)].copy()
        results["hybrid_score"] = results["course_id"].map(filtered_scores)
        results = results.sort_values("hybrid_score", ascending=False)
        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # Popular / Trending courses (fallback)
    # ═══════════════════════════════════════════════════════════════════════════

    def get_popular_courses(self, category=None, n=10):
        """Get popular courses, optionally filtered by category."""
        df = self.data.get_courses().copy()

        if category:
            df = df[df["category"].str.lower() == category.lower()]

        # Score = weighted combination of rating, reviews, subscribers
        df["popularity_score"] = (
            df["rating_norm"] * 0.3 +
            df["reviews_norm"] * 0.3 +
            df["subscribers_norm"] * 0.4
        )

        return df.nlargest(n, "popularity_score")

    def get_user_profile_summary(self, user_id):
        """Get a summary of a user's learning profile."""
        history = self.data.get_user_history(user_id)
        courses_df = self.data.get_courses()

        if history.empty:
            return None

        user_courses = courses_df[courses_df["course_id"].isin(history["course_id"])]
        avg_rating = history["rating"].mean()
        completion_rate = history["completed"].mean()

        preferred_cats = user_courses["category"].value_counts().head(3).to_dict()
        preferred_skills = {}
        for skills_str in user_courses["skills"]:
            for skill in str(skills_str).split("|"):
                skill = skill.strip()
                if skill:
                    preferred_skills[skill] = preferred_skills.get(skill, 0) + 1
        top_skills = dict(sorted(preferred_skills.items(), key=lambda x: x[1], reverse=True)[:8])

        return {
            "user_id": int(user_id),
            "courses_taken": int(len(history)),
            "avg_rating_given": round(float(avg_rating), 2),
            "completion_rate": round(float(completion_rate) * 100, 1),
            "preferred_categories": preferred_cats,
            "top_skills": top_skills,
            "preferred_difficulty": user_courses["difficulty"].mode().iloc[0]
                if not user_courses["difficulty"].mode().empty else "Beginner"
        }
