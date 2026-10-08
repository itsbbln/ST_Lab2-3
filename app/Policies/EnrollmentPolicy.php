<?php

namespace App\Policies;

use App\Models\Enrollment;
use App\Models\User;

class EnrollmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Enrollment $enrollment): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        if ($user->isInstructor()) {
            return $enrollment->courseOffering()->where('instructor_id', $user->id)->exists();
        }

        if ($user->isStudent()) {
            return $user->student_id !== null && $user->student_id === $enrollment->student_id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->isManagement();
    }

    public function update(User $user, Enrollment $enrollment): bool
    {
        return $user->isManagement();
    }

    public function delete(User $user, Enrollment $enrollment): bool
    {
        return $user->isManagement();
    }

    /** Ability used before a grade row exists: may this user record a grade for this enrollment? */
    public function grade(User $user, Enrollment $enrollment): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        return $user->isInstructor()
            && $enrollment->courseOffering()->where('instructor_id', $user->id)->exists();
    }
}
