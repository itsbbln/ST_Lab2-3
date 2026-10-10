<?php

use Illuminate\Support\Facades\Route;

Route::get('/assets/{asset}', function (string $asset) {
    $file = base_path("frontend/dist/assets/{$asset}");

    if (file_exists($file)) {
        $contentType = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'css' => 'text/css; charset=utf-8',
            'woff2' => 'font/woff2',
            default => null,
        };

        return response()->file($file, $contentType ? ['Content-Type' => $contentType] : []);
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
