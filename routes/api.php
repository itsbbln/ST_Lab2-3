<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AcademicController;
use App\Http\Controllers\Api\V1\ProgramController;
use App\Http\Controllers\Api\V1\StudentController;

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
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::apiResource('programs', ProgramController::class)->middlewareFor(['store', 'update', 'destroy'], 'role:administrator,registrar,staff');
        Route::apiResource('students', StudentController::class)->middlewareFor(['store', 'update', 'destroy'], 'role:administrator,registrar,staff');
        Route::get('/students/{student}/academic-record', [AcademicController::class, 'studentAcademicRecord']);

        Route::get('/courses', [AcademicController::class, 'courses']);
        Route::post('/courses', [AcademicController::class, 'storeCourse'])->middleware('role:administrator,registrar,staff');
        Route::get('/courses/{course}', [AcademicController::class, 'showCourse']);
        Route::match(['put', 'patch'], '/courses/{course}', [AcademicController::class, 'updateCourse'])->middleware('role:administrator,registrar,staff');
        Route::delete('/courses/{course}', [AcademicController::class, 'deleteCourse'])->middleware('role:administrator,registrar,staff');

        Route::get('/academic-terms', [AcademicController::class, 'terms']);
        Route::post('/academic-terms', [AcademicController::class, 'storeTerm'])->middleware('role:administrator,registrar,staff');
        Route::get('/academic-terms/{academicTerm}', [AcademicController::class, 'showTerm']);
        Route::match(['put', 'patch'], '/academic-terms/{academicTerm}', [AcademicController::class, 'updateTerm'])->middleware('role:administrator,registrar,staff');
        Route::delete('/academic-terms/{academicTerm}', [AcademicController::class, 'deleteTerm'])->middleware('role:administrator,registrar,staff');

        Route::get('/course-offerings', [AcademicController::class, 'offerings']);
        Route::post('/course-offerings', [AcademicController::class, 'storeOffering'])->middleware('role:administrator,registrar,staff');
        Route::get('/course-offerings/{courseOffering}', [AcademicController::class, 'showOffering']);
        Route::match(['put', 'patch'], '/course-offerings/{courseOffering}', [AcademicController::class, 'updateOffering'])->middleware('role:administrator,registrar,staff');
        Route::delete('/course-offerings/{courseOffering}', [AcademicController::class, 'deleteOffering'])->middleware('role:administrator,registrar,staff');
        Route::get('/course-offerings/{courseOffering}/students', [AcademicController::class, 'offeringStudents']);

        Route::get('/enrollments', [AcademicController::class, 'enrollments']);
        Route::post('/enrollments', [AcademicController::class, 'storeEnrollment'])->middleware('role:administrator,registrar,staff');
        Route::get('/enrollments/{enrollment}', [AcademicController::class, 'showEnrollment']);
        Route::patch('/enrollments/{enrollment}', [AcademicController::class, 'updateEnrollment'])->middleware('role:administrator,registrar,staff');
        Route::delete('/enrollments/{enrollment}', [AcademicController::class, 'deleteEnrollment'])->middleware('role:administrator,registrar,staff');
        Route::get('/students/{student}/enrollments', [AcademicController::class, 'studentEnrollments']);

        Route::get('/grades', [AcademicController::class, 'grades']);
        Route::post('/grades', [AcademicController::class, 'storeGrade'])->middleware('role:administrator,registrar,staff,instructor');
        Route::get('/grades/{grade}', [AcademicController::class, 'showGrade']);
        Route::match(['put', 'patch'], '/grades/{grade}', [AcademicController::class, 'updateGrade'])->middleware('role:administrator,registrar,staff,instructor');
        Route::get('/students/{student}/grades', [AcademicController::class, 'studentGrades']);
    });
});
