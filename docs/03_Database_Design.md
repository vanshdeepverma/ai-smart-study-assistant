# Database Design (PostgreSQL + pgvector)

## 1. Entity Relationship (ER) Diagram
```mermaid
erDiagram
    USERS ||--o{ DOCUMENTS : uploads
    USERS ||--o{ QUIZZES : takes
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : split_into
    DOCUMENTS ||--o{ QUIZZES : generates
    QUIZZES ||--o{ QUESTIONS : contains
    
    USERS {
        uuid id PK
        string email
        string password_hash
        string name
        timestamp created_at
    }
    DOCUMENTS {
        uuid id PK
        uuid user_id FK
        string filename
        string file_url
        int page_count
        timestamp uploaded_at
    }
    DOCUMENT_CHUNKS {
        uuid id PK
        uuid document_id FK
        text content
        int page_number
        vector embedding
    }
    QUIZZES {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        int score
        int total_questions
        timestamp taken_at
    }
    QUESTIONS {
        uuid id PK
        uuid quiz_id FK
        text question_text
        jsonb options
        string correct_answer
        string user_answer
    }
```

## 2. Schema Details
* **`users`**: Manages authentication.
* **`documents`**: Metadata for uploaded files.
* **`document_chunks`**: This is the core RAG table. The `embedding` column uses the `vector` type provided by `pgvector`. We will create an HNSW index on this column for hyper-fast semantic search.
* **`quizzes` & `questions`**: Tracks user assessments and performance to power the analytics dashboard.
