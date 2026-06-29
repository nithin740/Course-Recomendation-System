"""
Generate synthetic course recommendation dataset.
Creates courses.csv and user_interactions.csv with realistic data.
"""

import csv
import random
import os

random.seed(42)

# ── Course catalog data ──────────────────────────────────────────────────────

CATEGORIES = {
    "Data Science": {
        "sub_categories": ["Machine Learning", "Deep Learning", "Data Analysis", "Data Visualization", "Statistics", "Big Data"],
        "skills": ["Python", "R", "SQL", "TensorFlow", "Pandas", "NumPy", "Matplotlib", "Scikit-learn", "Spark", "Tableau"],
        "title_templates": [
            "{sub} Fundamentals", "Complete {sub} Bootcamp", "{sub} for Beginners",
            "Advanced {sub}", "Practical {sub} with Python", "{sub} Masterclass",
            "{sub}: From Zero to Hero", "Hands-On {sub}", "{sub} A-Z", "Professional {sub}"
        ]
    },
    "Web Development": {
        "sub_categories": ["Frontend", "Backend", "Full Stack", "React", "Node.js", "Django"],
        "skills": ["HTML", "CSS", "JavaScript", "React", "Angular", "Vue.js", "Node.js", "Express", "Django", "Flask", "TypeScript", "REST API"],
        "title_templates": [
            "The Complete {sub} Developer Course", "{sub} Development Bootcamp",
            "Modern {sub} with Projects", "Build Real-World {sub} Applications",
            "{sub} for Web Developers", "{sub} Masterclass 2024", "Learn {sub} by Building Projects",
            "Complete Guide to {sub}", "Pro {sub} Development", "{sub} from Scratch"
        ]
    },
    "Artificial Intelligence": {
        "sub_categories": ["Neural Networks", "NLP", "Computer Vision", "Reinforcement Learning", "Generative AI", "Robotics"],
        "skills": ["Python", "TensorFlow", "PyTorch", "Keras", "OpenCV", "NLTK", "Transformers", "GPT", "CNN", "RNN"],
        "title_templates": [
            "{sub} Complete Guide", "Introduction to {sub}", "{sub} with Python",
            "Applied {sub}", "{sub} and Deep Learning", "Building {sub} Systems",
            "{sub} Projects and Applications", "Mastering {sub}", "{sub} Engineering",
            "{sub} in Practice"
        ]
    },
    "Cloud Computing": {
        "sub_categories": ["AWS", "Azure", "Google Cloud", "DevOps", "Docker", "Kubernetes"],
        "skills": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Ansible", "Jenkins"],
        "title_templates": [
            "{sub} Certified Solutions Architect", "{sub} for Beginners",
            "{sub} Practitioner Essentials", "Mastering {sub}", "{sub} DevOps Pipeline",
            "{sub} Infrastructure as Code", "Deploy with {sub}", "{sub} Administration",
            "{sub} Security Fundamentals", "Scaling with {sub}"
        ]
    },
    "Mobile Development": {
        "sub_categories": ["Android", "iOS", "Flutter", "React Native", "Swift", "Kotlin"],
        "skills": ["Java", "Kotlin", "Swift", "Dart", "Flutter", "React Native", "Xcode", "Android Studio", "Firebase", "REST API"],
        "title_templates": [
            "Complete {sub} Development", "{sub} App Development Bootcamp",
            "Build Apps with {sub}", "{sub} for Beginners", "Professional {sub} Development",
            "{sub} Projects: Build 10 Apps", "Modern {sub} Architecture",
            "Mastering {sub}", "{sub}: From Idea to App Store", "{sub} UI/UX Design"
        ]
    },
    "Cybersecurity": {
        "sub_categories": ["Ethical Hacking", "Network Security", "Penetration Testing", "Cryptography", "SOC Analysis", "Malware Analysis"],
        "skills": ["Linux", "Wireshark", "Metasploit", "Nmap", "Burp Suite", "Python", "Firewalls", "SIEM", "Encryption", "Forensics"],
        "title_templates": [
            "{sub} Complete Course", "Learn {sub}", "{sub} from Scratch",
            "{sub} for IT Professionals", "Advanced {sub}", "{sub} Certification Prep",
            "Hands-On {sub}", "Real-World {sub}", "{sub} Masterclass", "{sub} Essentials"
        ]
    },
    "Business & Management": {
        "sub_categories": ["Project Management", "Digital Marketing", "Entrepreneurship", "Finance", "Leadership", "Product Management"],
        "skills": ["Agile", "Scrum", "SEO", "Google Analytics", "Excel", "Power BI", "Strategy", "Budgeting", "Communication", "Negotiation"],
        "title_templates": [
            "{sub} Essentials", "The Complete {sub} Course", "{sub} for Professionals",
            "Mastering {sub}", "{sub} Strategies That Work", "{sub} Certification",
            "{sub} in the Real World", "Advanced {sub} Techniques", "{sub} MBA",
            "{sub} Fundamentals"
        ]
    },
    "Design": {
        "sub_categories": ["UI/UX Design", "Graphic Design", "3D Modeling", "Motion Graphics", "Web Design", "Brand Design"],
        "skills": ["Figma", "Adobe XD", "Photoshop", "Illustrator", "After Effects", "Blender", "Sketch", "InVision", "CSS", "Typography"],
        "title_templates": [
            "{sub} Masterclass", "Complete {sub} Bootcamp", "{sub} from Zero to Pro",
            "Professional {sub}", "Modern {sub}", "Learn {sub} in 30 Days",
            "{sub} for Beginners", "Advanced {sub} Techniques", "{sub} Portfolio Projects",
            "Creative {sub}"
        ]
    },
    "Database & SQL": {
        "sub_categories": ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Database Design", "Data Warehousing"],
        "skills": ["SQL", "MySQL", "PostgreSQL", "MongoDB", "NoSQL", "Data Modeling", "ETL", "Normalization", "Indexing", "Replication"],
        "title_templates": [
            "The Complete {sub} Course", "{sub} for Data Professionals",
            "Mastering {sub}", "{sub} from Beginner to Expert", "Advanced {sub}",
            "{sub} Performance Tuning", "Hands-On {sub}", "{sub} Bootcamp",
            "{sub} for Developers", "Real-World {sub}"
        ]
    },
    "Programming Languages": {
        "sub_categories": ["Python", "Java", "C++", "Go", "Rust", "JavaScript"],
        "skills": ["OOP", "Data Structures", "Algorithms", "Design Patterns", "Testing", "Debugging", "Git", "CLI", "Concurrency", "Memory Management"],
        "title_templates": [
            "Learn {sub} Programming", "{sub} for Absolute Beginners",
            "Complete {sub} Developer Course", "Advanced {sub} Programming",
            "{sub} Data Structures & Algorithms", "Mastering {sub}",
            "{sub} Projects for Portfolio", "Professional {sub}", "{sub} in Depth",
            "{sub} Problem Solving"
        ]
    }
}

INSTRUCTORS = [
    "Dr. Sarah Chen", "Prof. James Miller", "Angela Rodriguez", "Michael Brooks",
    "Dr. Priya Sharma", "David Kim", "Emma Thompson", "Raj Patel",
    "Lisa Wang", "Carlos Mendez", "Dr. Alex Johnson", "Sophie Martin",
    "Kevin O'Brien", "Fatima Al-Hassan", "Thomas Wright", "Dr. Yuki Tanaka",
    "Olivia Davis", "Marcus Green", "Dr. Nina Petrov", "Samuel Lee",
    "Aisha Khan", "Roberto Silva", "Hannah Wilson", "Dr. Chris Evans",
    "Maya Gupta", "Patrick Murphy", "Diana Ross", "Ahmed Hassan",
    "Victoria Chang", "Jason Taylor"
]

DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"]
DIFF_WEIGHTS = [0.40, 0.40, 0.20]


def generate_description(title, category, sub_cat, difficulty, skills):
    """Generate a realistic course description."""
    intros = [
        f"This comprehensive {difficulty.lower()} course covers {sub_cat} in depth.",
        f"Learn {sub_cat} from industry experts in this hands-on {difficulty.lower()} course.",
        f"Master the fundamentals of {sub_cat} with real-world projects and exercises.",
        f"A complete guide to {sub_cat} designed for {difficulty.lower()}-level learners.",
        f"Dive deep into {sub_cat} with practical examples and industry best practices.",
    ]
    middles = [
        f"You will gain practical experience with {', '.join(skills[:3])} and more.",
        f"Topics include {', '.join(skills[:4])} applied to real scenarios.",
        f"Build portfolio-ready projects using {', '.join(skills[:3])}.",
        f"Covers essential tools like {', '.join(skills[:3])} with hands-on labs.",
    ]
    endings = [
        f"Perfect for anyone looking to advance their career in {category}.",
        f"Join thousands of students already learning {sub_cat}.",
        f"By the end, you'll be confident in applying {sub_cat} concepts professionally.",
        f"Includes certificate of completion and lifetime access to materials.",
    ]
    return f"{random.choice(intros)} {random.choice(middles)} {random.choice(endings)}"


def generate_courses(num_courses=500):
    """Generate the course catalog."""
    courses = []
    course_id = 1
    categories = list(CATEGORIES.keys())

    for _ in range(num_courses):
        category = random.choice(categories)
        cat_data = CATEGORIES[category]
        sub_cat = random.choice(cat_data["sub_categories"])
        difficulty = random.choices(DIFFICULTIES, weights=DIFF_WEIGHTS, k=1)[0]
        template = random.choice(cat_data["title_templates"])
        title = template.format(sub=sub_cat)

        # Ensure unique-ish titles
        title = f"{title} [{course_id}]" if random.random() < 0.3 else title

        num_skills = random.randint(3, 6)
        skills = random.sample(cat_data["skills"], min(num_skills, len(cat_data["skills"])))

        rating = round(random.triangular(2.5, 5.0, 4.2), 1)
        rating = min(rating, 5.0)
        num_reviews = random.randint(50, 15000)
        num_subscribers = num_reviews * random.randint(3, 12)
        duration = round(random.triangular(2, 80, 20), 1)

        description = generate_description(title, category, sub_cat, difficulty, skills)

        courses.append({
            "course_id": course_id,
            "title": title,
            "category": category,
            "sub_category": sub_cat,
            "difficulty": difficulty,
            "rating": rating,
            "num_reviews": num_reviews,
            "num_subscribers": num_subscribers,
            "duration_hours": duration,
            "description": description,
            "skills": "|".join(skills),
            "instructor": random.choice(INSTRUCTORS)
        })
        course_id += 1

    return courses


def generate_interactions(courses, num_users=50, avg_interactions=40):
    """Generate user-course interaction data."""
    interactions = []
    course_ids = [c["course_id"] for c in courses]
    course_map = {c["course_id"]: c for c in courses}

    for user_id in range(1, num_users + 1):
        # Each user has preferred categories (1-3)
        preferred_cats = random.sample(list(CATEGORIES.keys()), k=random.randint(1, 3))
        preferred_course_ids = [
            c["course_id"] for c in courses if c["category"] in preferred_cats
        ]
        other_course_ids = [cid for cid in course_ids if cid not in preferred_course_ids]

        num_interactions = random.randint(20, avg_interactions * 2)

        # 70% from preferred categories, 30% exploration
        num_preferred = int(num_interactions * 0.7)
        num_other = num_interactions - num_preferred

        chosen_preferred = random.sample(preferred_course_ids, min(num_preferred, len(preferred_course_ids)))
        chosen_other = random.sample(other_course_ids, min(num_other, len(other_course_ids)))
        chosen = chosen_preferred + chosen_other
        random.shuffle(chosen)

        for cid in chosen:
            # Users rate preferred-category courses higher
            course = course_map[cid]
            if course["category"] in preferred_cats:
                rating = random.choices([3, 4, 5], weights=[0.15, 0.35, 0.50], k=1)[0]
            else:
                rating = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.15, 0.30, 0.30, 0.20], k=1)[0]

            completed = random.random() < 0.65

            interactions.append({
                "user_id": user_id,
                "course_id": cid,
                "rating": rating,
                "completed": completed
            })

    return interactions


def save_csv(data, filepath, fieldnames):
    """Save list of dicts to CSV."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"  ✓ Saved {len(data)} rows → {filepath}")


def main():
    print("Generating Course Recommendation Dataset...")
    print()

    data_dir = os.path.join(os.path.dirname(__file__), "data")

    # Generate courses
    courses = generate_courses(500)
    save_csv(courses, os.path.join(data_dir, "courses.csv"), [
        "course_id", "title", "category", "sub_category", "difficulty",
        "rating", "num_reviews", "num_subscribers", "duration_hours",
        "description", "skills", "instructor"
    ])

    # Generate interactions
    interactions = generate_interactions(courses, num_users=50, avg_interactions=40)
    save_csv(interactions, os.path.join(data_dir, "user_interactions.csv"), [
        "user_id", "course_id", "rating", "completed"
    ])

    print()
    print(f"Dataset Summary:")
    print(f"  Courses:      {len(courses)}")
    print(f"  Users:        50")
    print(f"  Interactions: {len(interactions)}")
    print(f"  Categories:   {len(CATEGORIES)}")
    print(f"  Done!")


if __name__ == "__main__":
    main()
