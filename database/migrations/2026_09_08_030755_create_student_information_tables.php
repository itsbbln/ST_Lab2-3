<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role')->default('student')->index();
            $table->string('status')->default('active')->index();
        });

        Schema::create('programs', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table): void {
            $table->id();
            $table->string('student_number', 30)->unique();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('email')->nullable()->unique();
            $table->string('contact_number', 30)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('program_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('year_level');
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->index(['last_name', 'first_name']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('student_id')->nullable()->after('status')->constrained('students')->nullOnDelete();
        });

        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->string('course_code', 30)->unique();
            $table->string('course_title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('units');
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::create('academic_terms', function (Blueprint $table): void {
            $table->id();
            $table->string('academic_year', 20);
            $table->string('semester', 30);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->unique(['academic_year', 'semester']);
        });

        Schema::create('course_offerings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->foreignId('academic_term_id')->constrained()->restrictOnDelete();
            $table->foreignId('instructor_id')->constrained('users')->restrictOnDelete();
            $table->string('section', 30);
            $table->string('schedule')->nullable();
            $table->string('room', 100)->nullable();
            $table->unsignedSmallInteger('capacity');
            $table->string('status')->default('open')->index();
            $table->timestamps();
            $table->unique(['course_id', 'academic_term_id', 'section']);
        });

        Schema::create('enrollments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('course_offering_id')->constrained()->restrictOnDelete();
            $table->date('enrollment_date');
            $table->string('status')->default('enrolled')->index();
            $table->timestamps();
            $table->unique(['student_id', 'course_offering_id']);
        });

        Schema::create('grades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('enrollment_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('midterm_grade', 5, 2)->nullable();
            $table->decimal('final_grade', 5, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grades');
        Schema::dropIfExists('enrollments');
        Schema::dropIfExists('course_offerings');
        Schema::dropIfExists('academic_terms');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('students');
        Schema::dropIfExists('programs');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['student_id']);
            $table->dropColumn(['student_id', 'role', 'status']);
        });
    }
};
