<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\CourseOffering;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AcademicController extends Controller
{
    public function courses(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Course::class);

        return $this->collection(Course::query(), $request, ['course_code', 'course_title', 'units'], ['course_code', 'course_title'], ['status']);
    }

    public function storeCourse(Request $request): JsonResponse
    {
        $this->authorize('create', Course::class);
        $course = Course::create($request->validate([
            'course_code' => ['required', 'string', 'max:30', 'unique:courses,course_code'],
            'course_title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'units' => ['required', 'integer', 'between:1,12'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]));

        return $this->created('Course created successfully.', $course);
    }

    public function showCourse(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        return $this->ok('Course retrieved successfully.', $course);
    }

    public function updateCourse(Request $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);
        $course->update($request->validate([
            'course_code' => ['sometimes', 'string', 'max:30', Rule::unique('courses', 'course_code')->ignore($course)],
            'course_title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'units' => ['sometimes', 'integer', 'between:1,12'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]));

        return $this->ok('Course updated successfully.', $course->fresh());
    }

    public function deleteCourse(Course $course): JsonResponse
    {
        $this->authorize('delete', $course);
        $course->update(['status' => 'inactive']);
        return $this->ok('Course deactivated successfully.');
    }

    public function terms(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AcademicTerm::class);

        return $this->collection(AcademicTerm::query(), $request, ['academic_year', 'semester', 'status'], ['academic_year', 'semester'], ['academic_year', 'semester', 'status']);
    }

    public function storeTerm(Request $request): JsonResponse
    {
        $this->authorize('create', AcademicTerm::class);
        $term = AcademicTerm::create($request->validate([
            'academic_year' => ['required', 'string', 'max:20'],
            'semester' => ['required', 'string', 'max:30'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'closed'])],
        ]));

        return $this->created('Academic term created successfully.', $term);
    }

    public function showTerm(AcademicTerm $academicTerm): JsonResponse
    {
        $this->authorize('view', $academicTerm);

        return $this->ok('Academic term retrieved successfully.', $academicTerm);
    }

    public function updateTerm(Request $request, AcademicTerm $academicTerm): JsonResponse
    {
        $this->authorize('update', $academicTerm);
        $academicTerm->update($request->validate([
            'academic_year' => ['sometimes', 'string', 'max:20'],
            'semester' => ['sometimes', 'string', 'max:30'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'closed'])],
        ]));

        return $this->ok('Academic term updated successfully.', $academicTerm->fresh());
    }

    public function deleteTerm(AcademicTerm $academicTerm): JsonResponse
    {
        $this->authorize('delete', $academicTerm);
        $academicTerm->update(['status' => 'inactive']);
        return $this->ok('Academic term deactivated successfully.');
    }

    public function offerings(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CourseOffering::class);

        $query = CourseOffering::with(['course', 'academicTerm', 'instructor']);
        $user = $request->user();

        if ($user->isInstructor()) {
            $query->where('instructor_id', $user->id);
        } elseif ($user->isStudent()) {
            abort_unless($user->student_id !== null, 403, 'No student profile is linked to this account.');
            $query->whereHas('enrollments', fn ($builder) => $builder->where('student_id', $user->student_id));
        } else {
            abort_unless($user->isManagement(), 403, 'You are not authorized to list course offerings.');
        }

        return $this->collection($query, $request, ['section', 'status'], ['section'], ['course_id', 'academic_term_id', 'instructor_id', 'status']);
    }

    public function storeOffering(Request $request): JsonResponse
    {
        $this->authorize('create', CourseOffering::class);
        $offering = CourseOffering::create($request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'academic_term_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'instructor_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', 'instructor')],
            'section' => ['required', 'string', 'max:30'],
            'schedule' => ['nullable', 'string', 'max:255'],
            'room' => ['nullable', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'between:1,500'],
            'status' => ['sometimes', Rule::in(['open', 'closed', 'cancelled'])],
        ]));

        return $this->created('Course offering created successfully.', $offering->load(['course', 'academicTerm', 'instructor']));
    }

    public function showOffering(CourseOffering $courseOffering): JsonResponse
    {
        $this->authorize('view', $courseOffering);
        return $this->ok('Course offering retrieved successfully.', $courseOffering->load(['course', 'academicTerm', 'instructor']));
    }

    public function offeringStudents(Request $request, CourseOffering $courseOffering): JsonResponse
    {
        $this->authorize('viewRoster', $courseOffering);
        return $this->collection($courseOffering->enrollments()->with('student'), $request, ['id', 'enrollment_date', 'status'], [], ['status']);
    }

    public function updateOffering(Request $request, CourseOffering $courseOffering): JsonResponse
    {
        $this->authorize('update', $courseOffering);
        $courseOffering->update($request->validate([
            'course_id' => ['sometimes', 'integer', 'exists:courses,id'],
            'academic_term_id' => ['sometimes', 'integer', 'exists:academic_terms,id'],
            'instructor_id' => ['sometimes', 'integer', Rule::exists('users', 'id')->where('role', 'instructor')],
            'section' => ['sometimes', 'string', 'max:30'],
            'schedule' => ['nullable', 'string', 'max:255'],
            'room' => ['nullable', 'string', 'max:100'],
            'capacity' => ['sometimes', 'integer', 'between:1,500'],
            'status' => ['sometimes', Rule::in(['open', 'closed', 'cancelled'])],
        ]));

        return $this->ok('Course offering updated successfully.', $courseOffering->fresh()->load(['course', 'academicTerm', 'instructor']));
    }

    public function deleteOffering(CourseOffering $courseOffering): JsonResponse
    {
        $this->authorize('delete', $courseOffering);
        $courseOffering->update(['status' => 'cancelled']);
        return $this->ok('Course offering cancelled successfully.');
    }

    public function enrollments(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Enrollment::class);

        $query = Enrollment::with(['student', 'courseOffering.course', 'courseOffering.academicTerm', 'grade']);
        $user = $request->user();

        if ($user->isStudent()) {
            abort_unless($user->student_id !== null, 403, 'No student profile is linked to this account.');
            $query->where('student_id', $user->student_id);
        } elseif ($user->isInstructor()) {
            $query->whereHas('courseOffering', fn ($builder) => $builder->where('instructor_id', $user->id));
        } else {
            abort_unless($user->isManagement(), 403, 'You are not authorized to list enrollments.');
        }

        return $this->collection($query, $request, ['status', 'enrollment_date'], ['status'], ['student_id', 'course_offering_id', 'status']);
    }

    public function storeEnrollment(Request $request): JsonResponse
    {
        $this->authorize('create', Enrollment::class);
        $data = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'course_offering_id' => ['required', 'integer', 'exists:course_offerings,id'],
            'enrollment_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::in(['enrolled', 'dropped', 'completed'])],
        ]);

        $offering = CourseOffering::findOrFail($data['course_offering_id']);
        if ($offering->status !== 'open' || $offering->enrollments()->where('status', 'enrolled')->count() >= $offering->capacity) {
            return response()->json(['success' => false, 'message' => 'Course offering is not available for enrollment.', 'errors' => []], 409);
        }

        $duplicate = Enrollment::where('student_id', $data['student_id'])->where('course_offering_id', $data['course_offering_id'])->exists();
        if ($duplicate) {
            return response()->json(['success' => false, 'message' => 'Student is already enrolled in this course offering.', 'errors' => []], 409);
        }

        $data['enrollment_date'] ??= now()->toDateString();
        $enrollment = Enrollment::create($data);
        return $this->created('Enrollment created successfully.', $enrollment->load(['student', 'courseOffering']));
    }

    public function showEnrollment(Enrollment $enrollment): JsonResponse
    {
        $this->authorize('view', $enrollment);
        return $this->ok('Enrollment retrieved successfully.', $enrollment->load(['student', 'courseOffering.course', 'courseOffering.academicTerm', 'grade']));
    }

    public function studentEnrollments(Student $student): JsonResponse
    {
        $this->authorize('view', $student);
        return $this->collection($student->enrollments()->with(['courseOffering.course', 'courseOffering.academicTerm', 'grade']), request(), ['enrollment_date', 'status']);
    }

    public function updateEnrollment(Request $request, Enrollment $enrollment): JsonResponse
    {
        $this->authorize('update', $enrollment);
        $enrollment->update($request->validate(['status' => ['required', Rule::in(['enrolled', 'dropped', 'completed'])]]));
        return $this->ok('Enrollment updated successfully.', $enrollment->fresh());
    }

    public function deleteEnrollment(Enrollment $enrollment): JsonResponse
    {
        $this->authorize('delete', $enrollment);
        $enrollment->update(['status' => 'dropped']);
        return $this->ok('Enrollment dropped successfully.');
    }

    public function grades(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Grade::class);

        $query = Grade::with(['enrollment.student', 'enrollment.courseOffering.course', 'enrollment.courseOffering.academicTerm']);
        $user = $request->user();

        if ($user->isStudent()) {
            abort_unless($user->student_id !== null, 403, 'No student profile is linked to this account.');
            $query->whereHas('enrollment', fn ($builder) => $builder->where('student_id', $user->student_id));
        } elseif ($user->isInstructor()) {
            $query->whereHas('enrollment.courseOffering', fn ($builder) => $builder->where('instructor_id', $user->id));
        } else {
            abort_unless($user->isManagement(), 403, 'You are not authorized to list grades.');
        }

        return $this->collection($query, $request, ['created_at'], ['remarks'], ['enrollment_id']);
    }

    public function storeGrade(Request $request): JsonResponse
    {
        $this->authorize('create', Grade::class);

        $data = $request->validate([
            'enrollment_id' => ['required', 'integer', 'exists:enrollments,id', 'unique:grades,enrollment_id'],
            'midterm_grade' => ['nullable', 'numeric', 'between:0,100'],
            'final_grade' => ['nullable', 'numeric', 'between:0,100'],
            'remarks' => ['nullable', 'string'],
        ]);

        $this->authorize('grade', Enrollment::findOrFail($data['enrollment_id']));
        return $this->created('Grade recorded successfully.', Grade::create($data));
    }

    public function updateGrade(Request $request, Grade $grade): JsonResponse
    {
        $this->authorize('update', $grade);
        $grade->update($request->validate([
            'midterm_grade' => ['nullable', 'numeric', 'between:0,100'],
            'final_grade' => ['nullable', 'numeric', 'between:0,100'],
            'remarks' => ['nullable', 'string'],
        ]));
        return $this->ok('Grade updated successfully.', $grade->fresh());
    }

    public function showGrade(Grade $grade): JsonResponse
    {
        $this->authorize('view', $grade);
        return $this->ok('Grade retrieved successfully.', $grade->load(['enrollment.student', 'enrollment.courseOffering.course', 'enrollment.courseOffering.academicTerm']));
    }

    public function studentGrades(Student $student): JsonResponse
    {
        $this->authorize('view', $student);
        return $this->collection($student->enrollments()->whereHas('grade')->with(['grade', 'courseOffering.course', 'courseOffering.academicTerm']), request(), ['created_at']);
    }

    public function studentAcademicRecord(Student $student): JsonResponse
    {
        $this->authorize('view', $student);
        $enrollments = $student->enrollments()->with(['courseOffering.course', 'courseOffering.academicTerm', 'grade'])->get();
        $record = $enrollments->groupBy(fn (Enrollment $enrollment) => $enrollment->courseOffering->academicTerm->id)
            ->map(fn ($termEnrollments) => [
                'term' => $termEnrollments->first()->courseOffering->academicTerm,
                'enrollments' => $termEnrollments->values(),
            ])->values();

        return $this->ok('Academic record retrieved successfully.', ['student' => $student, 'terms' => $record]);
    }

    private function collection($query, Request $request, array $sortable, array $searchable = [], array $filterable = []): JsonResponse
    {
        if ($searchable !== [] && $request->filled('search')) {
            $pattern = '%'.mb_strtolower($request->string('search')->toString()).'%';
            $query->where(function ($builder) use ($searchable, $pattern): void {
                foreach ($searchable as $index => $column) {
                    $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';
                    $builder->{$method}("LOWER({$column}) LIKE ?", [$pattern]);
                }
            });
        }

        foreach ($filterable as $filter) {
            $value = $request->input($filter);
            if ($value !== null && $value !== '') {
                abort_unless(is_scalar($value), 422, "Invalid filter value for {$filter}.");
                $query->where($filter, $value);
            }
        }

        $sort = $request->string('sort', $sortable[0])->toString();
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sort = ltrim($sort, '-');
        abort_unless(in_array($sort, $sortable, true), 422, 'Invalid sort field.');

        $items = $query->orderBy($sort, $direction)->paginate(min(max($request->integer('per_page', 20), 1), 100));
        return response()->json([
            'success' => true,
            'message' => 'Records retrieved successfully.',
            'data' => $items->items(),
            'meta' => ['current_page' => $items->currentPage(), 'per_page' => $items->perPage(), 'total' => $items->total(), 'last_page' => $items->lastPage()],
        ]);
    }

    private function ok(string $message, mixed $data = null): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data]);
    }

    private function created(string $message, mixed $data): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data], 201);
    }
}
