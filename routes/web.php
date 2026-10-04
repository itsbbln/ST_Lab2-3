<?php

use Illuminate\Support\Facades\Route;

Route::get('/assets/{asset}', function (string $asset) {
    $file = base_path("frontend/dist/assets/{$asset}");

    if (file_exists($file)) {
        return response()->file($file);
    }

    abort(404);
})->where('asset', '.*');

Route::get('/', function () {
    $index = base_path('frontend/dist/index.html');

    if (file_exists($index)) {
        return response()->file($index);
    }

    return view('welcome');
});

Route::fallback(function () {
    $index = base_path('frontend/dist/index.html');

    if (file_exists($index)) {
        return response()->file($index);
    }

    return view('welcome');
});
