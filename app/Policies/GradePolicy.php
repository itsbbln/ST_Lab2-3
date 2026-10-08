<?php

namespace App\Policies;

use App\Models\Grade;
use App\Models\User;

class GradePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Grade $grade): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        $enrollment = $grade->enrollment;

        if ($user->isInstructor()) {
            return $enrollment->courseOffering->instructor_id === $user->id;
        }

        if ($user->isStudent()) {
            return $user->student_id !== null && $user->student_id === $enrollment->student_id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isManagement() || $user->isInstructor();
    }

    public function update(User $user, Grade $grade): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        return $user->isInstructor()
            && $grade->enrollment->courseOffering->instructor_id === $user->id;
    }

    public function delete(User $user, Grade $grade): bool
    {
        return $user->isManagement();
    }
}
