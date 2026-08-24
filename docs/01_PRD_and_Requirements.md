# Product Requirements Document (PRD)

## 1. Product Overview
**Name:** AI Smart Study Assistant
**Purpose:** An AI-powered platform designed to help students learn more effectively by interacting with their study materials, generating assessments, and tracking their progress.

## 2. Functional Requirements
* **User Management:** Registration, login, JWT-based authentication.
* **Document Management:** Upload PDFs, list uploaded documents, delete documents.
* **Study & Interaction:** Chat with documents (RAG), request summaries.
* **Assessment Generation:** Generate MCQs, flashcards, and quizzes based on specific documents or topics.
* **Progress Tracking:** Record quiz scores, track time spent, analyze weak topics.
* **Study Planning:** Generate a personalized study schedule based on weak topics and upcoming exams.

## 3. Non-functional Requirements
* **Performance:** Chat responses should appear within 2-3 seconds. Document processing for a 50-page PDF should complete within 30 seconds.
* **Scalability:** Microservices architecture to scale the AI processing independently from the web server.
* **Security:** Passwords must be hashed (bcrypt). JWT for stateless API auth. PDFs securely stored.
* **Reliability:** Graceful error handling for AI API limits and timeouts.

## 4. User Personas
* **Alex the CS Student:** Needs to cram for exams. Uploads lecture slides to generate flashcards and clarify complex topics quickly.
* **Sarah the Medical Student:** Has massive textbooks. Needs to summarize chapters and extract key definitions without reading hundreds of pages.

## 5. Main User Journeys
* **Onboarding:** User signs up -> Logs in -> Lands on Dashboard.
* **Study Session:** Uploads a PDF -> System processes it -> User asks "Explain chapter 3 simply" -> AI answers with citations.
* **Assessment:** User selects a document -> Clicks "Generate Quiz" -> Takes a 10-question MCQ test -> Submits -> System updates "weak topics" dashboard.
