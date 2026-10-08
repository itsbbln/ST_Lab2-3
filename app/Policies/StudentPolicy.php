<?php

namespace App\Policies;

use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManagement() || $user->isStudent();
    }

    public function view(User $user, Student $student): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        if ($user->isStudent()) {
            return $user->student_id !== null && $user->student_id === $student->id;
        }

        if ($user->isInstructor()) {
            return $this->instructorTeaches($user, $student);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isManagement();
    }

    public function update(User $user, Student $student): bool
    {
        return $user->isManagement();
    }

    public function delete(User $user, Student $student): bool
    {
        return $user->isManagement();
    }

    private function instructorTeaches(User $user, Student $student): bool
    {
        return Enrollment::where('student_id', $student->id)
            ->whereHas('courseOffering', fn ($query) => $query->where('instructor_id', $user->id))
            ->exists();
    }
}
