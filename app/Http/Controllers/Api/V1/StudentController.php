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
        $this->authorize('viewAny', Student::class);

        $query = Student::with('program');
        $user = $request->user();

        if ($user->isStudent()) {
            abort_unless($user->student_id !== null, 403, 'No student profile is linked to this account.');
            $query->whereKey($user->student_id);
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

        $sort = $request->string('sort', '-updated_at')->toString();
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sort = ltrim($sort, '-');
        abort_unless(in_array($sort, ['student_number', 'first_name', 'last_name', 'year_level', 'created_at', 'updated_at'], true), 422, 'Invalid sort field.');

        $students = $query->orderBy($sort, $direction)
            ->when($sort === 'updated_at' && $direction === 'desc', fn ($builder) => $builder->orderByDesc('id'))
            ->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'message' => 'Students retrieved successfully.',
            'data' => $students->items(),
            'meta' => ['current_page' => $students->currentPage(), 'per_page' => $students->perPage(), 'total' => $students->total(), 'last_page' => $students->lastPage()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Student::class);
        $student = Student::create($request->validate($this->rules()));

        return response()->json(['success' => true, 'message' => 'Student created successfully.', 'data' => $student->load('program')], 201);
    }

    public function show(Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(['success' => true, 'message' => 'Student retrieved successfully.', 'data' => $student->load('program')]);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $this->authorize('update', $student);
        $student->update($request->validate($this->rules($student, true)));

        return response()->json(['success' => true, 'message' => 'Student updated successfully.', 'data' => $student->fresh()->load('program')]);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->authorize('delete', $student);
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
            'year_level' => [$partial ? 'sometimes' : 'required', 'integer', 'between:1,6'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'graduated'])],
        ];
    }
}
