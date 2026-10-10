<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseOffering;
use App\Models\Enrollment;
use App\Models\Grade;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_create_a_student(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.example',
            'role' => 'administrator',
            'status' => 'active',
        ]);
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $login->assertOk()->assertJsonPath('success', true);

        $this->withHeader('Authorization', 'Bearer '.$login->json('data.token'))
            ->postJson('/api/v1/students', [
                'student_number' => '2026-00001',
                'first_name' => 'Ada',
                'last_name' => 'Lovelace',
                'program_id' => $program->id,
                'year_level' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.student_number', '2026-00001');

        $this->assertDatabaseHas('students', ['student_number' => '2026-00001']);
    }

    public function test_student_validation_and_duplicate_number_are_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $program = Program::create(['code' => 'BSCS', 'name' => 'Computer Science']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/students', [
            'student_number' => '2026-00001',
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'program_id' => $program->id,
            'year_level' => 1,
        ])->assertCreated();

        $this->postJson('/api/v1/students', [
            'student_number' => '2026-00001',
            'first_name' => 'Duplicate',
            'last_name' => 'Student',
            'program_id' => $program->id,
            'year_level' => 1,
        ])->assertStatus(422)->assertJsonPath('success', false)->assertJsonStructure(['errors' => ['student_number']]);
    }

    public function test_year_level_supports_program_extensions_but_cannot_exceed_six(): void
    {
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/students', [
        'student_number' => '2026-EXT-06',
        'first_name' => 'Extended',
        'last_name' => 'Student',
        'program_id' => $program->id,
        'year_level' => 6,
        ])->assertCreated()->assertJsonPath('data.year_level', 6);

        $this->postJson('/api/v1/students', [
        'student_number' => '2026-EXT-07',
        'first_name' => 'Invalid',
        'last_name' => 'Student',
        'program_id' => $program->id,
        'year_level' => 7,
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['year_level']]);
    }

    public function test_student_role_cannot_create_programs(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'student', 'status' => 'active']));

        $this->postJson('/api/v1/programs', ['code' => 'BSIT', 'name' => 'Information Technology'])
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_unauthenticated_api_requests_return_json_401(): void
    {
        $this->getJson('/api/v1/students')
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->get('/api/v1/students')
            ->assertUnauthorized()
            ->assertJsonPath('success', false);
    }

    public function test_invalid_login_credentials_return_401(): void
    {
        $user = User::factory()->create(['email' => 'invalid-login@test.example']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'incorrect-password',
        ])->assertUnauthorized()->assertJsonPath('success', false);
    }

    public function test_logout_revokes_token_and_missing_students_return_404(): void
    {
        $user = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk()->assertJsonMissingPath('data.password');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id, 'name' => 'test-token']);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withToken($user->createToken('another-token')->plainTextToken)
            ->getJson('/api/v1/students/999999')
            ->assertNotFound();
    }

    public function test_student_can_only_read_their_own_enrollments_and_grades(): void
    {
        [$ownEnrollment, $otherEnrollment] = $this->createAcademicRecords();
        $studentUser = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'student_id' => $ownEnrollment->student_id,
        ]);
        $ownGrade = Grade::create(['enrollment_id' => $ownEnrollment->id, 'final_grade' => 90]);
        $otherGrade = Grade::create(['enrollment_id' => $otherEnrollment->id, 'final_grade' => 80]);
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/v1/enrollments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownEnrollment->id);
        $this->getJson('/api/v1/enrollments/'.$otherEnrollment->id)->assertForbidden();
        $this->getJson('/api/v1/grades')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownGrade->id);
        $this->getJson('/api/v1/grades/'.$otherGrade->id)->assertForbidden();
        $this->getJson('/api/v1/students/'.$otherEnrollment->student_id.'/academic-record')->assertForbidden();
    }

    public function test_instructor_reads_only_assigned_offerings_and_related_records(): void
    {
        [$assignedEnrollment, $otherEnrollment, $assignedOffering, $otherOffering] = $this->createAcademicRecords(true);
        $instructor = $assignedOffering->instructor;
        Grade::create(['enrollment_id' => $assignedEnrollment->id, 'final_grade' => 90]);
        $otherGrade = Grade::create(['enrollment_id' => $otherEnrollment->id, 'final_grade' => 80]);
        Sanctum::actingAs($instructor);

        $this->getJson('/api/v1/course-offerings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignedOffering->id);
        $this->getJson('/api/v1/course-offerings/'.$otherOffering->id)->assertForbidden();
        $this->getJson('/api/v1/course-offerings/'.$otherOffering->id.'/students')->assertForbidden();
        $this->getJson('/api/v1/enrollments')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/grades')->assertOk()->assertJsonCount(1, 'data');
        $this->patchJson('/api/v1/grades/'.$otherGrade->id, ['final_grade' => 70])->assertForbidden();
    }

    public function test_student_patch_accepts_a_single_field_and_search_is_portable(): void
    {
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        $student = $this->createStudent($program, '2026-00001', 'Ada', 'Lovelace');
        $this->createStudent($program, '2026-00002', 'Grace', 'Hopper');
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/students/'.$student->id, ['first_name' => 'Augusta'])
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Augusta');
        $this->getJson('/api/v1/students?search=augusta&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.student_number', '2026-00001')
            ->assertJsonPath('meta.per_page', 1);

        Course::create(['course_code' => 'IT201', 'course_title' => 'Database Systems', 'units' => 3, 'status' => 'active']);
        Course::create(['course_code' => 'IT202', 'course_title' => 'Networking', 'units' => 3, 'status' => 'inactive']);
        $this->getJson('/api/v1/courses?search=database&status=active&sort=-course_code&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_code', 'IT201')
            ->assertJsonPath('meta.per_page', 1);
    }

    public function test_recently_updated_students_are_returned_first(): void
    {
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        Carbon::setTestNow('2026-06-01 10:00:00');
        $olderStudent = $this->createStudent($program, '2026-00001', 'Ada', 'Lovelace');
        $newerStudent = $this->createStudent($program, '2026-00002', 'Grace', 'Hopper');
        Sanctum::actingAs($admin);

        try {
            Carbon::setTestNow('2026-06-01 10:01:00');
            $this->patchJson('/api/v1/students/'.$olderStudent->id, ['first_name' => 'Augusta'])->assertOk();

            $this->getJson('/api/v1/students?sort=-updated_at')
                ->assertOk()
                ->assertJsonPath('data.0.id', $olderStudent->id)
                ->assertJsonPath('data.1.id', $newerStudent->id);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_enrollment_duplicate_and_grade_range_are_enforced_by_api(): void
    {
        [, , $offering] = $this->createAcademicRecords();
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $program = Program::where('code', 'BSIT')->firstOrFail();
        $student = $this->createStudent($program, '2026-00003', 'Katherine', 'Johnson');
        Sanctum::actingAs($admin);

        $enrollmentResponse = $this->postJson('/api/v1/enrollments', [
            'student_id' => $student->id,
            'course_offering_id' => $offering->id,
        ])->assertCreated();
        $enrollmentId = $enrollmentResponse->json('data.id');

        $this->postJson('/api/v1/enrollments', [
            'student_id' => $student->id,
            'course_offering_id' => $offering->id,
        ])->assertStatus(409);
        $this->postJson('/api/v1/grades', [
            'enrollment_id' => $enrollmentId,
            'final_grade' => 101,
        ])->assertStatus(422)->assertJsonPath('success', false);
        $this->postJson('/api/v1/grades', [
            'enrollment_id' => $enrollmentId,
            'midterm_grade' => 88,
            'final_grade' => 91,
        ])->assertCreated();
    }

    private function createAcademicRecords(bool $withInstructors = false): array
    {
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        $studentOne = $this->createStudent($program, '2026-00001', 'Ada', 'Lovelace');
        $studentTwo = $this->createStudent($program, '2026-00002', 'Grace', 'Hopper');
        $course = Course::create(['course_code' => 'IT101', 'course_title' => 'Programming', 'units' => 3]);
        $term = AcademicTerm::create([
            'academic_year' => '2026-2027',
            'semester' => '1st Semester',
            'start_date' => '2026-08-01',
            'end_date' => '2026-12-20',
        ]);
        $instructorOne = User::factory()->create(['role' => 'instructor', 'status' => 'active']);
        $instructorTwo = $withInstructors ? User::factory()->create(['role' => 'instructor', 'status' => 'active']) : $instructorOne;
        $offeringOne = $this->createOffering($course, $term, $instructorOne, 'A');
        $offeringTwo = $this->createOffering($course, $term, $instructorTwo, 'B');
        $enrollmentOne = $this->createEnrollment($studentOne, $offeringOne);
        $enrollmentTwo = $this->createEnrollment($studentTwo, $offeringTwo);

        return [$enrollmentOne, $enrollmentTwo, $offeringOne, $offeringTwo];
    }

    private function createStudent(Program $program, string $number, string $firstName, string $lastName): Student
    {
        return Student::create([
            'student_number' => $number,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'program_id' => $program->id,
            'year_level' => 1,
        ]);
    }

    private function createOffering(Course $course, AcademicTerm $term, User $instructor, string $section): CourseOffering
    {
        return CourseOffering::create([
            'course_id' => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id' => $instructor->id,
            'section' => $section,
            'capacity' => 30,
        ]);
    }

    private function createEnrollment(Student $student, CourseOffering $offering): Enrollment
    {
        return Enrollment::create([
            'student_id' => $student->id,
            'course_offering_id' => $offering->id,
            'enrollment_date' => '2026-09-01',
        ]);
    }
}
