# Interview Preparation Roadmap API

This API has been updated to generate comprehensive interview preparation roadmaps based on company and job details.

## New API Endpoint

### POST `/api/interview-roadmap`

**Request Body:**
```json
{
  "companyName": "Google",
  "jobDescription": "We are looking for a Software Development Engineer to join our team. You will be responsible for designing, developing, and maintaining scalable software systems. Requirements include strong programming skills in Python/Java, experience with cloud platforms, and knowledge of data structures and algorithms.",
  "jobRole": "SDE-1",
  "weblink": "https://careers.google.com/jobs/results/1234567890" // optional
}
```

**Response:**
```json
{
  "success": true,
  "roadmap": {
    "company": "Google",
    "role": "SDE-1",
    "rounds": [
      {
        "type": "MCQ",
        "topics": {
          "OS": {
            "difficulty": "medium",
            "preparation_modules": ["Operating Systems", "Process Management"],
            "description": "Questions about operating system concepts, process scheduling, memory management",
            "resources": ["Operating System Concepts", "LeetCode OS problems"]
          },
          "DBMS": {
            "difficulty": "medium",
            "preparation_modules": ["Database Design", "SQL"],
            "description": "Database concepts, SQL queries, normalization",
            "resources": ["Database System Concepts", "SQL practice"]
          },
          "Networks": {
            "difficulty": "easy",
            "preparation_modules": ["Computer Networks", "HTTP/HTTPS"],
            "description": "Basic networking concepts, protocols",
            "resources": ["Computer Networks", "Network protocols"]
          }
        },
        "duration": "45 minutes",
        "format": "Online",
        "description": "Multiple choice questions covering computer science fundamentals"
      },
      {
        "type": "Coding",
        "topics": {
          "Arrays": {
            "difficulty": "easy",
            "preparation_modules": ["Data Structures", "Algorithms"],
            "description": "Array manipulation, two-pointer technique",
            "resources": ["LeetCode Array problems", "GeeksforGeeks"]
          },
          "DP": {
            "difficulty": "hard",
            "preparation_modules": ["Dynamic Programming", "Algorithms"],
            "description": "Dynamic programming problems, optimization",
            "resources": ["DP patterns", "LeetCode DP"]
          },
          "Graphs": {
            "difficulty": "hard",
            "preparation_modules": ["Graph Algorithms", "Data Structures"],
            "description": "Graph traversal, shortest path, minimum spanning tree",
            "resources": ["Graph algorithms", "LeetCode Graph"]
          }
        },
        "duration": "60 minutes",
        "format": "Online/In-person",
        "description": "Coding problems focusing on algorithms and data structures"
      },
      {
        "type": "HR",
        "topics": {
          "Behavioral": {
            "difficulty": "medium",
            "preparation_modules": ["STAR Method", "Communication"],
            "description": "Behavioral questions using STAR method",
            "resources": ["Behavioral interview prep", "STAR examples"]
          },
          "Communication": {
            "difficulty": "easy",
            "preparation_modules": ["Soft Skills", "Presentation"],
            "description": "Communication skills, explaining technical concepts",
            "resources": ["Communication skills", "Technical presentation"]
          }
        },
        "duration": "30 minutes",
        "format": "In-person/Video",
        "description": "Behavioral and cultural fit assessment"
      }
    ],
    "preparation_timeline": {
      "weeks_1_2": [
        "Review computer science fundamentals (OS, DBMS, Networks)",
        "Practice basic data structures (Arrays, Strings, Linked Lists)",
        "Solve easy-level coding problems"
      ],
      "weeks_3_4": [
        "Focus on algorithms (Sorting, Searching, Recursion)",
        "Practice medium-level coding problems",
        "Study system design basics"
      ],
      "weeks_5_6": [
        "Advanced topics (DP, Graphs, Trees)",
        "Practice hard-level coding problems",
        "Mock interviews and behavioral preparation"
      ]
    },
    "key_skills": [
      "Data Structures and Algorithms",
      "System Design",
      "Programming Languages (Python/Java)",
      "Cloud Platforms",
      "Problem Solving"
    ],
    "company_specific_tips": [
      "Focus on clean, efficient code",
      "Understand Google's engineering culture",
      "Prepare for 'Googleyness' questions",
      "Practice explaining your thought process",
      "Research Google's recent projects and technologies"
    ],
    "difficulty_overall": "hard"
  }
}
```

## Environment Variables Required

Make sure to set the following environment variables:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
FIRECRAWL_KEY=your_firecrawl_api_key_here  # optional, for web research
```

## Usage Example

```bash
curl -X POST http://localhost:3051/api/interview-roadmap \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Google",
    "jobDescription": "Software Development Engineer role focusing on scalable systems",
    "jobRole": "SDE-1"
  }'
```

## Features

- **Company-specific research**: Uses web search to gather current information about the company
- **Job description analysis**: Parses job requirements to identify key skills and topics
- **Structured roadmap**: Provides organized preparation timeline and difficulty levels
- **Resource recommendations**: Suggests specific resources for each topic
- **Interview rounds**: Identifies different types of interview rounds (MCQ, Coding, HR, etc.)
- **Preparation modules**: Maps skills to specific preparation areas (DSA, OOP, SQL, etc.)

## Legacy Support

The original `/api/research` endpoint is still available for backward compatibility, but now generates interview roadmaps instead of general research.
