# CourseAI — ML-Powered Course Recommendation System

An intelligent course recommendation system that uses machine learning algorithms to provide personalized course suggestions based on user preferences and learning history.

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![Scikit-learn](https://img.shields.io/badge/Scikit--learn-1.x-F7931E?logo=scikit-learn&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        End User (Browser)                       │
│              HTML / CSS / JavaScript Frontend                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────────┐
│                   Flask Server (app.py)                          │
│               Server & Database Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  Data Processing     │    │  Machine Learning Model        │ │
│  │  (data_loader.py)    │───▶│  (recommender.py)              │ │
│  │                      │    │                                │ │
│  │  • Data Cleaning     │    │  • Content-Based (TF-IDF)     │ │
│  │  • Normalization     │    │  • Collaborative (SVD)        │ │
│  │  • Feature Eng.      │    │  • KNN Recommendations        │ │
│  │  • TF-IDF Vectors    │    │  • Hybrid Approach            │ │
│  └──────────┬───────────┘    └────────────────────────────────┘ │
│             │                                                    │
│  ┌──────────▼───────────┐                                       │
│  │  Dataset (CSV)       │                                       │
│  │  • courses.csv       │                                       │
│  │  • interactions.csv  │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

## ML Algorithms

| Algorithm | Technique | Description |
|---|---|---|
| **Content-Based Filtering** | TF-IDF + Cosine Similarity | Recommends courses with similar descriptions and skills |
| **Collaborative Filtering** | SVD Matrix Factorization | Finds patterns in user-course interactions |
| **K-Nearest Neighbors** | KNN + Cosine Distance | Finds K most similar courses in feature space |
| **Hybrid** | Weighted Ensemble | Combines content + collaborative for best results |

## Tech Stack

### Backend
- **Python 3.8+**
- **Flask** — REST API server
- **Scikit-learn** — ML models (TF-IDF, SVD, KNN)
- **Pandas / NumPy** — Data processing
- **Matplotlib** — Visualization support

### Frontend
- **HTML5** — Semantic structure
- **CSS3** — Glassmorphism design, animations, responsive
- **JavaScript (ES6)** — SPA with hash routing
- **Chart.js** — Interactive analytics charts
- **Lucide Icons** — Icon library

## Quick Start

### 1. Clone & Install

```bash
cd mlproject/backend
pip install -r requirements.txt
```

### 2. Generate Dataset

```bash
python generate_data.py
```

### 3. Start Server

```bash
python app.py
```

### 4. Open in Browser

Navigate to: **https://course-recomendation-system-oryt.onrender.com/**

## Project Structure

```
mlproject/
├── backend/
│   ├── app.py               # Flask REST API server
│   ├── recommender.py       # ML recommendation engine
│   ├── data_loader.py       # Data processing pipeline
│   ├── generate_data.py     # Dataset generator
│   ├── requirements.txt     # Python dependencies
│   └── data/
│       ├── courses.csv      # 500 courses across 10 categories
│       └── user_interactions.csv  # 2000+ user ratings
│
├── frontend/
│   ├── index.html           # Single-page application
│   ├── css/styles.css       # Design system
│   └── js/
│       ├── app.js           # App controller & routing
│       ├── api.js           # Backend API client
│       └── charts.js        # Chart.js visualizations
│
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/courses` | GET | List courses (filters, pagination) |
| `/api/courses/<id>` | GET | Course details |
| `/api/courses/categories` | GET | Category list |
| `/api/search?q=` | GET | Search courses |
| `/api/recommend/content/<course_id>` | GET | Content-based recommendations |
| `/api/recommend/collaborative/<user_id>` | GET | Collaborative filtering |
| `/api/recommend/knn/<course_id>` | GET | KNN recommendations |
| `/api/recommend/hybrid` | GET/POST | Hybrid recommendations |
| `/api/recommend/popular` | GET | Trending courses |
| `/api/users` | GET | List user IDs |
| `/api/users/<id>/profile` | GET | User learning profile |
| `/api/stats` | GET | Dataset analytics |

## Dataset

- **500 courses** across 10 categories
- **50 simulated users** with preference patterns
- **2000+ interactions** (ratings + completions)
- Categories: Data Science, Web Dev, AI, Cloud, Mobile, Cybersecurity, Business, Design, Database, Programming

## Future Enhancements

- Deep learning models (neural collaborative filtering)
- Real-time user data integration
- Skill-based and career-path recommendations
- Feedback-based model retraining
- Mobile app version
