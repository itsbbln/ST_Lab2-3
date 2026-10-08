<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Program::class);
        $query = Program::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $pattern = '%'.mb_strtolower($search).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(code) LIKE ?', [$pattern])->orWhereRaw('LOWER(name) LIKE ?', [$pattern]));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $sort = $request->string('sort', 'name')->toString();
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sort = ltrim($sort, '-');
        abort_unless(in_array($sort, ['code', 'name', 'status', 'created_at'], true), 422, 'Invalid sort field.');

        $programs = $query->orderBy($sort, $direction)->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'message' => 'Programs retrieved successfully.',
            'data' => $programs->items(),
            'meta' => ['current_page' => $programs->currentPage(), 'per_page' => $programs->perPage(), 'total' => $programs->total(), 'last_page' => $programs->lastPage()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Program::class);
        $program = Program::create($request->validate([
            'code' => ['required', 'string', 'max:30', 'unique:programs,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]));

        return response()->json(['success' => true, 'message' => 'Program created successfully.', 'data' => $program], 201);
    }

    public function show(Program $program): JsonResponse
    {
        $this->authorize('view', $program);

        return response()->json(['success' => true, 'message' => 'Program retrieved successfully.', 'data' => $program]);
    }

    public function update(Request $request, Program $program): JsonResponse
    {
        $this->authorize('update', $program);
        $program->update($request->validate([
            'code' => ['sometimes', 'string', 'max:30', Rule::unique('programs', 'code')->ignore($program)],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]));

        return response()->json(['success' => true, 'message' => 'Program updated successfully.', 'data' => $program->fresh()]);
    }

    public function destroy(Program $program): JsonResponse
    {
        $this->authorize('delete', $program);
        $program->update(['status' => 'inactive']);

        return response()->json(['success' => true, 'message' => 'Program deactivated successfully.', 'data' => null]);
    }
}
