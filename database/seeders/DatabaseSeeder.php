<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseOffering;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $users = collect([
            ['name' => 'System Administrator', 'email' => 'admin@example.com', 'role' => 'administrator'],
            ['name' => 'Registrar Staff', 'email' => 'registrar@example.com', 'role' => 'registrar'],
            ['name' => 'Records Staff', 'email' => 'staff@example.com', 'role' => 'staff'],
            ['name' => 'Instructor One', 'email' => 'instructor1@example.com', 'role' => 'instructor'],
            ['name' => 'Instructor Two', 'email' => 'instructor2@example.com', 'role' => 'instructor'],
            ['name' => 'Demo Student', 'email' => 'student@example.com', 'role' => 'student'],
        ])->map(fn (array $attributes) => User::factory()->create($attributes));

        $programs = collect([
            ['code' => 'BSIT', 'name' => 'Bachelor of Science in Information Technology'],
            ['code' => 'BSCS', 'name' => 'Bachelor of Science in Computer Science'],
            ['code' => 'BSEMC', 'name' => 'Bachelor of Science in Entertainment and Multimedia Computing'],
        ])->map(fn (array $attributes) => Program::create($attributes));

        $students = collect(range(1, 100))->map(function (int $number) use ($programs): Student {
            return Student::create([
                'student_number' => '2026-'.str_pad((string) $number, 5, '0', STR_PAD_LEFT),
                'first_name' => 'Student',
                'last_name' => 'Demo'.$number,
                'email' => 'student'.$number.'@example.com',
                'program_id' => $programs[($number - 1) % 3]->id,
                'year_level' => (($number - 1) % 4) + 1,
                'status' => 'active',
            ]);
        });

        $users->firstWhere('role', 'student')->update(['student_id' => $students->first()->id]);

        $courses = collect(range(1, 20))->map(fn (int $number) => Course::create([
            'course_code' => 'IT'.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'course_title' => 'Information Technology Course '.$number,
            'units' => 3,
        ]));

        $terms = collect([
            ['academic_year' => '2026-2027', 'semester' => '1st Semester', 'start_date' => '2026-08-01', 'end_date' => '2026-12-20'],
            ['academic_year' => '2026-2027', 'semester' => '2nd Semester', 'start_date' => '2027-01-05', 'end_date' => '2027-05-30'],
        ])->map(fn (array $attributes) => AcademicTerm::create($attributes));

        $instructors = $users->where('role', 'instructor')->values();
        $offerings = $courses->map(function (Course $course, int $index) use ($terms, $instructors): CourseOffering {
            return CourseOffering::create([
                'course_id' => $course->id,
                'academic_term_id' => $terms[$index % 2]->id,
                'instructor_id' => $instructors[$index % 2]->id,
                'section' => 'A',
                'schedule' => 'Monday and Wednesday 09:00-10:30',
                'room' => 'Room '.(100 + $index),
                'capacity' => 40,
            ]);
        });

        $enrollments = collect();
        $offerings->each(function (CourseOffering $offering, int $offeringIndex) use ($students, &$enrollments): void {
            $students->slice(($offeringIndex * 10) % 100, 10)->each(function (Student $student) use ($offering, &$enrollments): void {
                $enrollments->push(Enrollment::create([
                    'student_id' => $student->id,
                    'course_offering_id' => $offering->id,
                    'enrollment_date' => now()->toDateString(),
                ]));
            });
        });

        $enrollments->take(100)->each(fn (Enrollment $enrollment, int $index) => Grade::create([
            'enrollment_id' => $enrollment->id,
            'midterm_grade' => 75 + ($index % 20),
            'final_grade' => 78 + ($index % 18),
            'remarks' => 'Seeded demonstration grade',
        ]));

    }
}
