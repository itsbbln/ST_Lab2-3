<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || $user->status !== 'active' || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided credentials are invalid.',
                'errors' => [],
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Authenticated successfully.',
            'data' => [
                'token' => $user->createToken('api-token')->plainTextToken,
                'user' => $user,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['success' => true, 'message' => 'Logged out successfully.', 'data' => null]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Authenticated user retrieved successfully.', 'data' => $request->user()]);
    }
}
