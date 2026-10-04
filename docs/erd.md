# Student Information Management ERD

```mermaid
erDiagram
    PROGRAMS ||--o{ STUDENTS : includes
    STUDENTS ||--o| USERS : authenticates_as
    COURSES ||--o{ COURSE_OFFERINGS : scheduled_as
    ACADEMIC_TERMS ||--o{ COURSE_OFFERINGS : contains
    USERS ||--o{ COURSE_OFFERINGS : instructs
    STUDENTS ||--o{ ENROLLMENTS : registers
    COURSE_OFFERINGS ||--o{ ENROLLMENTS : has
    ENROLLMENTS ||--o| GRADES : receives

    USERS {
        bigint id PK
        string name
        string email UK
        string password
        string role
        string status
        bigint student_id FK
    }
    PROGRAMS {
        bigint id PK
        string code UK
        string name
        string status
    }
    STUDENTS {
        bigint id PK
        string student_number UK
        string first_name
        string last_name
        string email UK
        bigint program_id FK
        tinyint year_level
        string status
    }
    COURSES {
        bigint id PK
        string course_code UK
        string course_title
        tinyint units
        string status
    }
    ACADEMIC_TERMS {
        bigint id PK
        string academic_year
        string semester
        date start_date
        date end_date
        string status
    }
    COURSE_OFFERINGS {
        bigint id PK
        bigint course_id FK
        bigint academic_term_id FK
        bigint instructor_id FK
        string section
        string schedule
        string room
        smallint capacity
        string status
    }
    ENROLLMENTS {
        bigint id PK
        bigint student_id FK
        bigint course_offering_id FK
        date enrollment_date
        string status
    }
    GRADES {
        bigint id PK
        bigint enrollment_id FK_UK
        decimal midterm_grade
        decimal final_grade
        string remarks
    }
```

The schema enforces unique student numbers and course codes, one enrollment per student/offering pair, and at most one grade per enrollment. User roles are stored in `users.role`; student accounts are linked to one student profile through nullable `users.student_id`.