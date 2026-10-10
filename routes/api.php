<?php

use App\Http\Controllers\Api\V1\AcademicController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProgramController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Middleware\EnsureUserIsActive;
use App\Support\Roles;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function () {
        return response()->json([
            'success' => true,
            'message' => 'Student Information Management API is running.',
            'data' => [
                'service' => 'student-information-management-api',
                'version' => 'v1',
            ],
        ]);
    });

    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware(EnsureUserIsActive::class)->group(function (): void {
            Route::get('/auth/me', [AuthController::class, 'me']);
            Route::apiResource('users', UserController::class)
                ->only(['index', 'store', 'show', 'update', 'destroy'])
                ->middleware('role:'.Roles::ADMINISTRATOR);
            Route::apiResource('programs', ProgramController::class)->middlewareFor(['store', 'update', 'destroy'], 'role:'.Roles::management());
            Route::apiResource('students', StudentController::class)->middlewareFor(['store', 'update', 'destroy'], 'role:'.Roles::management());
            Route::get('/students/{student}/academic-record', [AcademicController::class, 'studentAcademicRecord']);

            Route::get('/courses', [AcademicController::class, 'courses']);
            Route::post('/courses', [AcademicController::class, 'storeCourse'])->middleware('role:'.Roles::management());
            Route::get('/courses/{course}', [AcademicController::class, 'showCourse']);
            Route::match(['put', 'patch'], '/courses/{course}', [AcademicController::class, 'updateCourse'])->middleware('role:'.Roles::management());
            Route::delete('/courses/{course}', [AcademicController::class, 'deleteCourse'])->middleware('role:'.Roles::management());

            Route::get('/academic-terms', [AcademicController::class, 'terms']);
            Route::post('/academic-terms', [AcademicController::class, 'storeTerm'])->middleware('role:'.Roles::management());
            Route::get('/academic-terms/{academicTerm}', [AcademicController::class, 'showTerm']);
            Route::match(['put', 'patch'], '/academic-terms/{academicTerm}', [AcademicController::class, 'updateTerm'])->middleware('role:'.Roles::management());
            Route::delete('/academic-terms/{academicTerm}', [AcademicController::class, 'deleteTerm'])->middleware('role:'.Roles::management());

            Route::get('/course-offerings', [AcademicController::class, 'offerings']);
            Route::post('/course-offerings', [AcademicController::class, 'storeOffering'])->middleware('role:'.Roles::management());
            Route::get('/course-offerings/{courseOffering}', [AcademicController::class, 'showOffering']);
            Route::match(['put', 'patch'], '/course-offerings/{courseOffering}', [AcademicController::class, 'updateOffering'])->middleware('role:'.Roles::management());
            Route::delete('/course-offerings/{courseOffering}', [AcademicController::class, 'deleteOffering'])->middleware('role:'.Roles::management());
            Route::get('/course-offerings/{courseOffering}/students', [AcademicController::class, 'offeringStudents']);

            Route::get('/enrollments', [AcademicController::class, 'enrollments']);
            Route::post('/enrollments', [AcademicController::class, 'storeEnrollment'])->middleware('role:'.Roles::management());
            Route::get('/enrollments/{enrollment}', [AcademicController::class, 'showEnrollment']);
            Route::patch('/enrollments/{enrollment}', [AcademicController::class, 'updateEnrollment'])->middleware('role:'.Roles::management());
            Route::delete('/enrollments/{enrollment}', [AcademicController::class, 'deleteEnrollment'])->middleware('role:'.Roles::management());
            Route::get('/students/{student}/enrollments', [AcademicController::class, 'studentEnrollments']);

            Route::get('/grades', [AcademicController::class, 'grades']);
            Route::post('/grades', [AcademicController::class, 'storeGrade'])->middleware('role:'.Roles::gradeWriters());
            Route::get('/grades/{grade}', [AcademicController::class, 'showGrade']);
            Route::match(['put', 'patch'], '/grades/{grade}', [AcademicController::class, 'updateGrade'])->middleware('role:'.Roles::gradeWriters());
            Route::delete('/grades/{grade}', [AcademicController::class, 'deleteGrade'])->middleware('role:'.Roles::management());
            Route::get('/students/{student}/grades', [AcademicController::class, 'studentGrades']);
        });
    });
});
