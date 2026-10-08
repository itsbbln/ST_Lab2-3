<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserAdministrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_manage_accounts_without_exposing_passwords(): void
    {
        Sanctum::actingAs(User::factory()->create([
            'role' => 'administrator',
            'status' => 'active',
        ]));

        $created = $this->postJson('/api/v1/users', [
            'name' => 'New Instructor',
            'email' => 'instructor@example.test',
            'password' => 'teaching-password',
            'role' => 'instructor',
        ])->assertCreated()
            ->assertJsonPath('data.role', 'instructor')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');

        $userId = $created->json('data.id');
        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'email' => 'instructor@example.test',
            'role' => 'instructor',
            'status' => 'active',
        ]);
        $this->assertNotSame('teaching-password', User::findOrFail($userId)->password);

        $this->getJson('/api/v1/users?role=instructor&per_page=5')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('data.0.id', $userId)
            ->assertJsonMissingPath('data.0.password');

        $this->patchJson('/api/v1/users/'.$userId, [
            'name' => 'Updated Instructor',
            'password' => 'new-teaching-password',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Instructor')
            ->assertJsonMissingPath('data.password');

        $token = User::findOrFail($userId)->createToken('test-token')->plainTextToken;
        $this->deleteJson('/api/v1/users/'.$userId)->assertOk()->assertJsonPath('data', null);
        $this->assertDatabaseHas('users', ['id' => $userId, 'status' => 'inactive']);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertForbidden();
    }

    public function test_only_administrators_can_manage_users_and_invalid_roles_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create([
            'role' => 'registrar',
            'status' => 'active',
        ]));

        $this->getJson('/api/v1/users')->assertForbidden();
        $this->postJson('/api/v1/users', [
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@example.test',
            'password' => 'teaching-password',
            'role' => 'instructor',
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->create([
            'role' => 'administrator',
            'status' => 'active',
        ]));

        $this->postJson('/api/v1/users', [
            'name' => 'Invalid Role',
            'email' => 'invalid-role@example.test',
            'password' => 'teaching-password',
            'role' => 'superuser',
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['role']]);
    }

    public function test_student_accounts_require_a_unique_linked_student_and_last_admin_is_protected(): void
    {
        $program = Program::create(['code' => 'BSIT', 'name' => 'Information Technology']);
        $student = Student::create([
            'student_number' => '2026-00100',
            'first_name' => 'Demo',
            'last_name' => 'Student',
            'program_id' => $program->id,
            'year_level' => 1,
        ]);
        $admin = User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/users', [
            'name' => 'Linked Student',
            'email' => 'linked-student@example.test',
            'password' => 'student-password',
            'role' => 'student',
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['student_id']]);

        $studentAccount = $this->postJson('/api/v1/users', [
            'name' => 'Linked Student',
            'email' => 'linked-student@example.test',
            'password' => 'student-password',
            'role' => 'student',
            'student_id' => $student->id,
        ])->assertCreated();

        $this->postJson('/api/v1/users', [
            'name' => 'Duplicate Linked Student',
            'email' => 'duplicate-student@example.test',
            'password' => 'student-password',
            'role' => 'student',
            'student_id' => $student->id,
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['student_id']]);

        $this->deleteJson('/api/v1/users/'.$admin->id)
            ->assertConflict()
            ->assertJsonPath('success', false);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'administrator', 'status' => 'active']);

        User::factory()->create(['role' => 'administrator', 'status' => 'active']);
        $this->patchJson('/api/v1/users/'.$admin->id, ['role' => 'registrar'])
            ->assertOk()
            ->assertJsonPath('data.role', 'registrar');
        $this->assertDatabaseHas('users', ['id' => $studentAccount->json('data.id'), 'student_id' => $student->id]);
    }
}
