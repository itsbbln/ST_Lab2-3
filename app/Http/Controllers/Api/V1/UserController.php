<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', Rule::in(Roles::ALL)],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'sort' => ['sometimes', 'regex:/^-?(name|email|role|status|created_at|updated_at)$/'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $query = User::query()->select([
            'id',
            'name',
            'email',
            'role',
            'status',
            'student_id',
            'created_at',
            'updated_at',
        ]);

        if ($request->filled('search')) {
            $pattern = '%'.mb_strtolower($request->string('search')->toString()).'%';
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(name) LIKE ?', [$pattern])
                ->orWhereRaw('LOWER(email) LIKE ?', [$pattern]));
        }

        $query->when($request->filled('role'), fn ($builder) => $builder->where('role', $request->string('role')->toString()));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')->toString()));

        $sort = $request->string('sort', '-updated_at')->toString();
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $sort = ltrim($sort, '-');
        $users = $query->orderBy($sort, $direction)
            ->when($sort === 'updated_at' && $direction === 'desc', fn ($builder) => $builder->orderByDesc('id'))
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Users retrieved successfully.',
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = User::create($request->validate($this->rules($request)));

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => $user,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'User retrieved successfully.',
            'data' => $user,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $attributes = $request->validate($this->rules($request, $user));
        $this->ensureAnActiveAdministratorRemains($user, $attributes);
        $user->update($attributes);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => $user->fresh(),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->ensureAnActiveAdministratorRemains($user, ['status' => 'inactive']);
        $user->update(['status' => 'inactive']);

        return response()->json([
            'success' => true,
            'message' => 'User deactivated successfully.',
            'data' => null,
        ]);
    }

    private function rules(Request $request, ?User $user = null): array
    {
        $role = $request->input('role', $user?->role);
        $studentIdRules = $role === Roles::STUDENT
            ? [
                ...($user === null || $request->exists('role') ? ['required'] : ['sometimes', 'required']),
                'integer',
                Rule::exists('students', 'id'),
                Rule::unique('users', 'student_id')->ignore($user?->id),
            ]
            : ['prohibited'];

        return [
            'name' => [$user === null ? 'required' : 'sometimes', 'string', 'max:255'],
            'email' => [
                $user === null ? 'required' : 'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user),
            ],
            'password' => [$user === null ? 'required' : 'sometimes', 'string', 'min:8'],
            'role' => [$user === null ? 'required' : 'sometimes', Rule::in(Roles::ALL)],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'student_id' => $studentIdRules,
        ];
    }

    private function ensureAnActiveAdministratorRemains(User $user, array $attributes): void
    {
        if ($user->role !== Roles::ADMINISTRATOR || $user->status !== 'active') {
            return;
        }

        $nextRole = $attributes['role'] ?? $user->role;
        $nextStatus = $attributes['status'] ?? $user->status;

        if ($nextRole === Roles::ADMINISTRATOR && $nextStatus === 'active') {
            return;
        }

        abort_if(
            User::query()->where('role', Roles::ADMINISTRATOR)->where('status', 'active')->count() <= 1,
            409,
            'The last active administrator cannot be demoted or deactivated.'
        );
    }
}
