<?php

namespace App\Support;

final class Roles
{
    public const ADMINISTRATOR = 'administrator';
    public const REGISTRAR = 'registrar';
    public const STAFF = 'staff';
    public const INSTRUCTOR = 'instructor';
    public const STUDENT = 'student';

    public const ALL = [
        self::ADMINISTRATOR,
        self::REGISTRAR,
        self::STAFF,
        self::INSTRUCTOR,
        self::STUDENT,
    ];

    /** Roles allowed to create, update, and deactivate academic records. */
    public const MANAGEMENT = [
        self::ADMINISTRATOR,
        self::REGISTRAR,
        self::STAFF,
    ];

    /** Roles allowed to record and adjust grades (object-level checks still apply). */
    public const GRADE_WRITERS = [
        self::ADMINISTRATOR,
        self::REGISTRAR,
        self::STAFF,
        self::INSTRUCTOR,
    ];

    /** Comma-separated list for the `role:` route middleware. */
    public static function management(): string
    {
        return implode(',', self::MANAGEMENT);
    }

    /** Comma-separated list for the `role:` route middleware. */
    public static function gradeWriters(): string
    {
        return implode(',', self::GRADE_WRITERS);
    }

    public static function isManagement(string $role): bool
    {
        return in_array($role, self::MANAGEMENT, true);
    }
}
