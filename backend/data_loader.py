"""
Data Loader & Preprocessor
Handles loading CSV data, cleaning, and feature engineering for the recommendation engine.
Corresponds to the 'Data Processing Unit' in the system architecture:
  - Data Cleaning & Normalization
  - Feature Engineering
"""

import os
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler


class DataLoader:
    """Loads and preprocesses course and user interaction data."""

    def __init__(self, data_dir=None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), "data")
        self.data_dir = data_dir
        self.courses_df = None
        self.interactions_df = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None
        self.user_course_matrix = None
        self._loaded = False

    def load(self):
        """Load and preprocess all data."""
        self._load_csv()
        self._clean_data()
        self._engineer_features()
        self._build_user_course_matrix()
        self._loaded = True
        return self

    # ── Step 1: Data Collection (load raw CSV) ───────────────────────────────

    def _load_csv(self):
        """Load raw CSV files into DataFrames."""
        courses_path = os.path.join(self.data_dir, "courses.csv")
        interactions_path = os.path.join(self.data_dir, "user_interactions.csv")

        if not os.path.exists(courses_path) or not os.path.exists(interactions_path):
            raise FileNotFoundError(
                f"Dataset files not found in {self.data_dir}. "
                "Run 'python generate_data.py' first."
            )

        self.courses_df = pd.read_csv(courses_path)
        self.interactions_df = pd.read_csv(interactions_path)

        print(f"  Loaded {len(self.courses_df)} courses, "
              f"{len(self.interactions_df)} interactions")

    # ── Step 2: Data Cleaning & Normalization ────────────────────────────────

    def _clean_data(self):
        """Clean data: handle missing values, normalize types."""
        df = self.courses_df

        # Fill missing text fields
        df["title"] = df["title"].fillna("Untitled Course")
        df["description"] = df["description"].fillna("")
        df["skills"] = df["skills"].fillna("")
        df["category"] = df["category"].fillna("General")
        df["sub_category"] = df["sub_category"].fillna("General")
        df["difficulty"] = df["difficulty"].fillna("Beginner")
        df["instructor"] = df["instructor"].fillna("Unknown")

        # Fill missing numeric fields
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce").fillna(3.0)
        df["num_reviews"] = pd.to_numeric(df["num_reviews"], errors="coerce").fillna(0).astype(int)
        df["num_subscribers"] = pd.to_numeric(df["num_subscribers"], errors="coerce").fillna(0).astype(int)
        df["duration_hours"] = pd.to_numeric(df["duration_hours"], errors="coerce").fillna(10.0)

        # Clamp rating to [1, 5]
        df["rating"] = df["rating"].clip(1.0, 5.0)

        # Normalize numeric features for ML (keep originals too)
        scaler = MinMaxScaler()
        df[["rating_norm", "reviews_norm", "subscribers_norm", "duration_norm"]] = scaler.fit_transform(
            df[["rating", "num_reviews", "num_subscribers", "duration_hours"]]
        )

        # Clean interactions
        idf = self.interactions_df
        idf["rating"] = pd.to_numeric(idf["rating"], errors="coerce").fillna(3).astype(int)
        idf["rating"] = idf["rating"].clip(1, 5)
        idf["completed"] = idf["completed"].astype(bool)

        self.courses_df = df
        self.interactions_df = idf

    # ── Step 3: Feature Engineering ──────────────────────────────────────────

    def _engineer_features(self):
        """Create combined text feature and compute TF-IDF matrix."""
        df = self.courses_df

        # Combine text fields into a single feature for content-based filtering
        # Skills use | separator in CSV, replace with spaces
        df["skills_text"] = df["skills"].str.replace("|", " ", regex=False)
        df["combined_features"] = (
            df["title"] + " " +
            df["category"] + " " +
            df["sub_category"] + " " +
            df["difficulty"] + " " +
            df["skills_text"] + " " +
            df["description"]
        ).str.lower()

        # TF-IDF Vectorization on combined features
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2)
        )
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(df["combined_features"])

        print(f"  TF-IDF matrix shape: {self.tfidf_matrix.shape}")

        self.courses_df = df

    # ── Step 4: Build User-Course Matrix ─────────────────────────────────────

    def _build_user_course_matrix(self):
        """Build user-course rating matrix for collaborative filtering."""
        self.user_course_matrix = self.interactions_df.pivot_table(
            index="user_id",
            columns="course_id",
            values="rating",
            aggfunc="mean"
        ).fillna(0)

        print(f"  User-course matrix shape: {self.user_course_matrix.shape}")

    # ── Accessors ────────────────────────────────────────────────────────────

    def get_courses(self):
        return self.courses_df

    def get_interactions(self):
        return self.interactions_df

    def get_tfidf_matrix(self):
        return self.tfidf_matrix

    def get_user_course_matrix(self):
        return self.user_course_matrix

    def get_course_by_id(self, course_id):
        """Get a single course by ID."""
        row = self.courses_df[self.courses_df["course_id"] == course_id]
        if row.empty:
            return None
        return row.iloc[0]

    def get_user_history(self, user_id):
        """Get courses a user has interacted with."""
        user_data = self.interactions_df[self.interactions_df["user_id"] == user_id]
        return user_data

    def get_categories(self):
        """Get unique categories with counts."""
        return self.courses_df["category"].value_counts().to_dict()

    def get_stats(self):
        """Get dataset statistics for the analytics dashboard."""
        df = self.courses_df
        idf = self.interactions_df

        return {
            "total_courses": int(len(df)),
            "total_users": int(idf["user_id"].nunique()),
            "total_interactions": int(len(idf)),
            "total_categories": int(df["category"].nunique()),
            "avg_rating": round(float(df["rating"].mean()), 2),
            "avg_duration": round(float(df["duration_hours"].mean()), 1),
            "category_distribution": df["category"].value_counts().to_dict(),
            "difficulty_distribution": df["difficulty"].value_counts().to_dict(),
            "rating_distribution": idf["rating"].value_counts().sort_index().to_dict(),
            "top_instructors": df.groupby("instructor")["num_subscribers"].sum()
                .nlargest(10).to_dict(),
            "courses_per_difficulty": df.groupby("difficulty")["rating"]
                .mean().round(2).to_dict(),
            "avg_reviews_per_category": df.groupby("category")["num_reviews"]
                .mean().round(0).astype(int).to_dict(),
        }

    def search_courses(self, query, limit=20):
        """Search courses by keyword in title, description, skills."""
        query_lower = query.lower()
        df = self.courses_df
        mask = (
            df["title"].str.lower().str.contains(query_lower, na=False) |
            df["description"].str.lower().str.contains(query_lower, na=False) |
            df["skills_text"].str.lower().str.contains(query_lower, na=False) |
            df["category"].str.lower().str.contains(query_lower, na=False) |
            df["sub_category"].str.lower().str.contains(query_lower, na=False)
        )
        results = df[mask].head(limit)
        return results
