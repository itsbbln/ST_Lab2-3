<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grades', function (Blueprint $table): void {
            $table->timestamp('midterm_submitted_at')->nullable()->after('midterm_grade');
            $table->timestamp('final_submitted_at')->nullable()->after('final_grade');
        });
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table): void {
            $table->dropColumn(['midterm_submitted_at', 'final_submitted_at']);
        });
    }
};
