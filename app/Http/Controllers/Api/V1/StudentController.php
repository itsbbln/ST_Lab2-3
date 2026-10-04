<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::with('program');

        if ($request->user()->role === 'student') {
            $query->whereKey($request->user()->student_id);
        } else {
            abort_unless(in_array($request->user()->role, ['administrator', 'registrar', 'staff'], true), 403, 'You are not authorized to list student records.');
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $pattern = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(student_number) LIKE ?', [$pattern])
                ->orWhereRaw('LOWER(first_name) LIKE ?', [$pattern])
                ->orWhereRaw('LOWER(last_name) LIKE ?', [$pattern])
                ->orWhereRaw('LOWER(email) LIKE ?', [$pattern]));
        }

        $query->when($request->filled('program_id'), fn ($builder) => $builder->where('program_id', $request->integer('program_id')));
        $query->when($request->filled('year_level'), fn ($builder) => $builder->where('year_level', $request->integer('year_level')));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')->toString()));

        $sort = $request->string('sort', 'last_name')->toString();
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sort = ltrim($sort, '-');
        abort_unless(in_array($sort, ['student_number', 'first_name', 'last_name', 'year_level', 'created_at'], true), 422, 'Invalid sort field.');

        $students = $query->orderBy($sort, $direction)->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'message' => 'Students retrieved successfully.',
            'data' => $students->items(),
            'meta' => ['current_page' => $students->currentPage(), 'per_page' => $students->perPage(), 'total' => $students->total(), 'last_page' => $students->lastPage()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $student = Student::create($request->validate($this->rules()));

        return response()->json(['success' => true, 'message' => 'Student created successfully.', 'data' => $student->load('program')], 201);
    }

    public function show(Student $student): JsonResponse
    {
        $this->authorizeStudent($student);

        return response()->json(['success' => true, 'message' => 'Student retrieved successfully.', 'data' => $student->load('program')]);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $this->authorizeStudent($student);
        $student->update($request->validate($this->rules($student, true)));

        return response()->json(['success' => true, 'message' => 'Student updated successfully.', 'data' => $student->fresh()->load('program')]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->authorizeStudent($student);
        $student->update(['status' => 'inactive']);

        return response()->json(['success' => true, 'message' => 'Student deactivated successfully.', 'data' => null]);
    }

    private function rules(?Student $student = null, bool $partial = false): array
    {
        return [
            'student_number' => [$partial ? 'sometimes' : 'required', 'string', 'max:30', Rule::unique('students', 'student_number')->ignore($student)],
            'first_name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'email' => ['nullable', 'email', Rule::unique('students', 'email')->ignore($student)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'program_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:programs,id'],
            'year_level' => [$partial ? 'sometimes' : 'required', 'integer', 'between:1,8'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'graduated'])],
        ];
    }

    private function authorizeStudent(Student $student): void
    {
        $user = request()->user();
        abort_unless(in_array($user->role, ['administrator', 'registrar', 'staff'], true) || ($user->role === 'student' && $user->student_id === $student->id), 403, 'You are not authorized to access this student.');
    }
}
