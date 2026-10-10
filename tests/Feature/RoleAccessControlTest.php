<?php

namespace Tests\Feature;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseOffering;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_deactivated_user_tokens_are_rejected_but_logout_still_works(): void
    {
        $user = User::factory()->create(['role' => 'registrar', 'status' => 'active']);
        $token = $user->createToken('api-token')->plainTextToken;
        $user->update(['status' => 'inactive']);

        $this->withToken($token)->getJson('/api/v1/students')
            ->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'This account has been deactivated. Contact your administrator.');

        $this->withToken($token)->postJson('/api/v1/programs', ['code' => 'BSIT', 'name' => 'IT'])
            ->assertForbidden();

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_student_can_read_own_profile_but_never_modify_it(): void
    {
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        $own = $this->createStudent($program, '2026-00001', 'Ada', 'Lovelace');
        $studentUser = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'student_id' => $own->id,
        ]);
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/v1/students')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);
        $this->getJson('/api/v1/students/'.$own->id)->assertOk()->assertJsonPath('data.id', $own->id);

        $this->postJson('/api/v1/students', [
            'student_number' => '2026-00099',
            'first_name' => 'New',
            'last_name' => 'Student',
            'program_id' => $program->id,
            'year_level' => 1,
        ])->assertForbidden();

        $this->patchJson('/api/v1/students/'.$own->id, ['first_name' => 'Changed'])->assertForbidden();
        $this->deleteJson('/api/v1/students/'.$own->id)->assertForbidden();
        $this->assertDatabaseHas('students', ['id' => $own->id, 'first_name' => 'Ada', 'status' => 'active']);
    }

    public function test_student_without_a_linked_profile_is_rejected_on_scoped_collections(): void
    {
        $user = User::factory()->create(['role' => 'student', 'status' => 'active', 'student_id' => null]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/students')->assertForbidden()->assertJsonPath('success', false);
        $this->getJson('/api/v1/enrollments')->assertForbidden();
        $this->getJson('/api/v1/grades')->assertForbidden();
    }

    public function test_instructor_sees_only_students_enrolled_in_their_offerings(): void
    {
        [$enrollmentOne, $enrollmentTwo] = $this->createAcademicRecords(true);
        $ownStudent = $enrollmentOne->student;
        $otherStudent = $enrollmentTwo->student;
        Sanctum::actingAs($enrollmentOne->courseOffering->instructor);

        $this->getJson('/api/v1/students')->assertForbidden();

        $this->getJson('/api/v1/students/'.$ownStudent->id)
            ->assertOk()
            ->assertJsonPath('data.id', $ownStudent->id);
        $this->getJson('/api/v1/students/'.$ownStudent->id.'/academic-record')->assertOk();
        $this->getJson('/api/v1/students/'.$ownStudent->id.'/grades')->assertOk();

        $this->getJson('/api/v1/students/'.$otherStudent->id)->assertForbidden();
        $this->getJson('/api/v1/students/'.$otherStudent->id.'/academic-record')->assertForbidden();
        $this->getJson('/api/v1/students/'.$otherStudent->id.'/enrollments')->assertForbidden();
    }

    public function test_student_sees_only_enrolled_offering_and_never_a_roster(): void
    {
        [$enrollmentOne, , $offeringOne, $offeringTwo] = $this->createAcademicRecords(true);
        $studentUser = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'student_id' => $enrollmentOne->student_id,
        ]);
        Sanctum::actingAs($studentUser);

        $this->getJson('/api/v1/course-offerings')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $offeringOne->id);

        $this->getJson('/api/v1/course-offerings/'.$offeringOne->id)->assertOk();
        $this->getJson('/api/v1/course-offerings/'.$offeringTwo->id)->assertForbidden();

        $this->getJson('/api/v1/course-offerings/'.$offeringOne->id.'/students')->assertForbidden();
        $this->postJson('/api/v1/course-offerings', [
            'course_id' => 1,
            'academic_term_id' => 1,
            'instructor_id' => 1,
            'section' => 'Z',
            'capacity' => 30,
        ])->assertForbidden();
    }

    public function test_staff_role_has_full_management_permissions(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff', 'status' => 'active']));
        $program = Program::create(['code' => 'BSCS', 'name' => 'Computer Science']);

        $this->postJson('/api/v1/programs', ['code' => 'BSIS', 'name' => 'Information Systems'])
            ->assertCreated();
        $this->getJson('/api/v1/students')->assertOk();
        $this->postJson('/api/v1/courses', [
            'course_code' => 'IT101',
            'course_title' => 'Programming 1',
            'units' => 3,
        ])->assertCreated();
        $this->postJson('/api/v1/students', [
            'student_number' => '2026-00050',
            'first_name' => 'Katherine',
            'last_name' => 'Johnson',
            'program_id' => $program->id,
            'year_level' => 2,
        ])->assertCreated();
    }

    public function test_write_endpoints_are_denied_to_instructors_and_students(): void
    {
        [, , $offeringOne] = $this->createAcademicRecords(true);
        $managementPayloads = [
            ['/api/v1/programs', ['code' => 'BSIT', 'name' => 'IT']],
            ['/api/v1/students', ['student_number' => 'X', 'first_name' => 'A', 'last_name' => 'B', 'program_id' => 1, 'year_level' => 1]],
            ['/api/v1/courses', ['course_code' => 'IT999', 'course_title' => 'X', 'units' => 3]],
            ['/api/v1/course-offerings', ['course_id' => 1, 'academic_term_id' => 1, 'instructor_id' => 1, 'section' => 'Z', 'capacity' => 30]],
            ['/api/v1/enrollments', ['student_id' => 1, 'course_offering_id' => 1]],
        ];

        Sanctum::actingAs($offeringOne->instructor);
        foreach ($managementPayloads as [$uri, $payload]) {
            $this->postJson($uri, $payload)->assertForbidden();
        }

        $program = Program::create(['code' => 'BSEM', 'name' => 'Multimedia']);
        $studentUser = User::factory()->create([
            'role' => 'student',
            'status' => 'active',
            'student_id' => $offeringOne->enrollments()->first()->student_id ?? null,
        ]);
        Sanctum::actingAs($studentUser);

        foreach ($managementPayloads as [$uri, $payload]) {
            $this->postJson($uri, $payload)->assertForbidden();
        }
        $this->postJson('/api/v1/grades', ['enrollment_id' => 1, 'final_grade' => 90])->assertForbidden();
        $this->getJson('/api/v1/programs/'.$program->id)->assertOk();
    }

    public function test_instructor_grade_writes_are_scoped_to_their_own_offerings(): void
    {
        [$enrollmentOne, $enrollmentTwo] = $this->createAcademicRecords(true);
        $instructorOne = $enrollmentOne->courseOffering->instructor;
        Sanctum::actingAs($instructorOne);

        $this->postJson('/api/v1/grades', ['enrollment_id' => $enrollmentOne->id, 'period' => 'final', 'final_grade' => 90])
            ->assertCreated();

        $this->postJson('/api/v1/grades', ['enrollment_id' => $enrollmentTwo->id, 'period' => 'final', 'final_grade' => 90])
            ->assertForbidden();

        $otherGrade = Grade::create(['enrollment_id' => $enrollmentTwo->id, 'final_grade' => 80]);
        $this->getJson('/api/v1/grades/'.$otherGrade->id)->assertForbidden();
        $this->patchJson('/api/v1/grades/'.$otherGrade->id, ['period' => 'final', 'final_grade' => 75])->assertForbidden();

        $ownGrade = Grade::where('enrollment_id', $enrollmentOne->id)->firstOrFail();
        $this->getJson('/api/v1/grades/'.$ownGrade->id)->assertOk();
        $this->patchJson('/api/v1/grades/'.$ownGrade->id, ['period' => 'final', 'final_grade' => 91])->assertOk();
    }

    public function test_management_roles_can_read_every_record_kind(): void
    {
        [$enrollment, $otherEnrollment] = $this->createAcademicRecords();

        foreach (['administrator', 'registrar', 'staff'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role, 'status' => 'active']));

            $this->getJson('/api/v1/students')->assertOk()->assertJsonCount(2, 'data');
            $this->getJson('/api/v1/enrollments')->assertOk()->assertJsonCount(2, 'data');
            $this->getJson('/api/v1/course-offerings')->assertOk()->assertJsonCount(2, 'data');
            $this->getJson('/api/v1/students/'.$otherEnrollment->student_id.'/academic-record')->assertOk();
            $this->getJson('/api/v1/enrollments/'.$enrollment->id)->assertOk();
        }
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
