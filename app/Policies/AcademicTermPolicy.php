<?php

namespace App\Policies;

use App\Models\AcademicTerm;
use App\Models\User;

class AcademicTermPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AcademicTerm $academicTerm): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isManagement();
    }

    public function update(User $user, AcademicTerm $academicTerm): bool
    {
        return $user->isManagement();
    }

    public function delete(User $user, AcademicTerm $academicTerm): bool
    {
        return $user->isManagement();
    }
}
