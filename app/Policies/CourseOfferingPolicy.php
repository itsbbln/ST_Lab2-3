<?php

namespace App\Policies;

use App\Models\CourseOffering;
use App\Models\User;

class CourseOfferingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, CourseOffering $courseOffering): bool
    {
        if ($user->isManagement()) {
            return true;
        }

        if ($user->isInstructor()) {
            return $courseOffering->instructor_id === $user->id;
        }

        if ($user->isStudent()) {
            return $user->student_id !== null
                && $courseOffering->enrollments()->where('student_id', $user->student_id)->exists();
        }

        return false;
    }

    public function viewRoster(User $user, CourseOffering $courseOffering): bool
    {
        return $user->isManagement()
            || ($user->isInstructor() && $courseOffering->instructor_id === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isManagement();
    }

    public function update(User $user, CourseOffering $courseOffering): bool
    {
        return $user->isManagement();
    }

    public function delete(User $user, CourseOffering $courseOffering): bool
    {
        return $user->isManagement();
    }
}
